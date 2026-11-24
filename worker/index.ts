import { hourFloor, twDate, twDayStart } from "../shared/conditions";
import { analyze, forecast, type Species } from "./analysis";
import { ensureWeather, refreshSpot, type Spot } from "./weather";
import { loadTideEvents, refreshTide } from "./tide";
import { isEgiColor } from "../shared/egi";
import { MAX_PHOTO_BYTES, deletePhotos, getPhoto, putPhoto } from "./photos";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** 中央氣象署開放資料金鑰（wrangler secret put CWA_API_KEY），沒設定時潮汐用模型 */
  CWA_API_KEY?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "JSON 格式錯誤");
  }
}

async function getSpot(env: Env, id?: number | null): Promise<Spot> {
  const spot = id
    ? await env.DB.prepare("SELECT * FROM spots WHERE id = ?").bind(id).first<Spot>()
    : await env.DB.prepare("SELECT * FROM spots ORDER BY is_default DESC, sort_order, id LIMIT 1").first<Spot>();
  if (!spot) throw new HttpError(404, "找不到釣點");
  return spot;
}

/** 這個釣點實際使用的天氣來源（附近釣點共用水湳洞漁港的天氣） */
async function weatherSpotOf(env: Env, spot: Spot): Promise<Spot> {
  return spot.weather_spot_id ? getSpot(env, spot.weather_spot_id) : spot;
}

interface TripInput {
  spot_id?: number;
  start_at: number;
  end_at: number;
  note?: string | null;
}

interface CatchInput {
  trip_id: number;
  caught_at: number;
  species: "squid" | "fish";
  fish_name?: string | null;
  length_cm?: number | null;
  weight_g?: number | null;
  note?: string | null;
  photo_key?: string | null;
  egi_color?: string | null;
}

function validateTrip(t: TripInput) {
  if (!Number.isFinite(t.start_at) || !Number.isFinite(t.end_at)) throw new HttpError(400, "缺少開始或結束時間");
  if (t.end_at <= t.start_at) throw new HttpError(400, "結束時間要晚於開始時間");
  if (t.end_at - t.start_at > 24 * 3600) throw new HttpError(400, "一次出釣不能超過 24 小時");
}

function validateCatch(c: CatchInput) {
  if (!Number.isFinite(c.trip_id)) throw new HttpError(400, "缺少出釣紀錄");
  if (!Number.isFinite(c.caught_at)) throw new HttpError(400, "缺少釣到的時間");
  if (c.species !== "squid" && c.species !== "fish") throw new HttpError(400, "種類只能是軟絲或魚");
  if (c.egi_color != null && !isEgiColor(c.egi_color)) throw new HttpError(400, "木蝦顏色不正確");
}

/** 釣獲時間落在出釣時段外時，把出釣時段撐開，分析才算得到 */
async function stretchTrip(env: Env, tripId: number, t: number) {
  await env.DB.prepare(
    "UPDATE trips SET start_at = MIN(start_at, ?), end_at = MAX(end_at, ?) WHERE id = ?",
  ).bind(t, t + 60, tripId).run();
}

/** 一天的出釣、釣獲、以及每筆釣獲當下的天氣 */
async function dayDetail(env: Env, date: string) {
  const { results: trips } = await env.DB.prepare(
    `SELECT t.*, s.name AS spot_name, COALESCE(s.weather_spot_id, s.id) AS weather_spot_id
       FROM trips t JOIN spots s ON s.id = t.spot_id WHERE date = ? ORDER BY start_at`,
  ).bind(date).all<any>();
  if (trips.length === 0) return { date, trips: [] };
  const ids = trips.map((t) => t.id);
  const { results: catches } = await env.DB.prepare(
    `SELECT * FROM catches WHERE trip_id IN (${ids.map(() => "?").join(",")}) ORDER BY caught_at`,
  ).bind(...ids).all<any>();
  const minT = Math.min(...trips.map((t) => t.start_at)) - 3600;
  const maxT = Math.max(...trips.map((t) => t.end_at)) + 3600;
  const { results: weather } = await env.DB.prepare(
    "SELECT * FROM weather_hourly WHERE time BETWEEN ? AND ? ORDER BY time",
  ).bind(hourFloor(minT), maxT).all<any>();
  const tideMap = await loadTideEvents(env.DB, [...new Set(trips.map((t) => t.weather_spot_id as number))], minT, maxT);
  return {
    date,
    trips: trips.map((t) => ({
      ...t,
      catches: catches.filter((c) => c.trip_id === t.id),
      weather: weather.filter((w) => w.spot_id === t.weather_spot_id && w.time >= hourFloor(t.start_at) - 3600 && w.time <= t.end_at + 3600),
      // 氣象署的滿／乾潮時間；前端用它判斷每筆釣獲當下的漲退潮
      tide_events: tideMap.get(t.weather_spot_id) ?? [],
    })),
  };
}

async function handleApi(req: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, "");
  const method = req.method;
  const seg = path.split("/").filter(Boolean);

  // 照片用不可猜的 key 當檔名
  if (method === "GET" && seg[0] === "photos" && seg[1]) {
    const photo = await getPhoto(env.DB, seg[1]);
    if (!photo) return new Response("not found", { status: 404 });
    return new Response(photo.bytes, {
      headers: {
        "content-type": photo.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  // ---- 釣點 ----
  if (path === "/spots" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM spots ORDER BY sort_order, id").all();
    return json(results);
  }
  if (path === "/spots" && method === "POST") {
    const s = await body<Partial<Spot>>(req);
    if (!s.name?.trim()) throw new HttpError(400, "請填釣點名稱");
    let { lat, lon } = s;
    if (s.weather_spot_id) {
      // 共用天氣的釣點，沒填座標就沿用天氣來源的座標
      const w = await getSpot(env, s.weather_spot_id);
      if (w.weather_spot_id) throw new HttpError(400, "天氣來源要選自己抓天氣的釣點");
      lat = Number.isFinite(lat) ? lat : w.lat;
      lon = Number.isFinite(lon) ? lon : w.lon;
    } else if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new HttpError(400, "自己抓天氣的釣點要填經緯度");
    }
    const r = await env.DB.prepare(
      `INSERT INTO spots (name, lat, lon, wg_spot_id, weather_spot_id, sort_order)
       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM spots)) RETURNING *`,
    ).bind(s.name.trim(), lat, lon, s.weather_spot_id ? null : s.wg_spot_id ?? null, s.weather_spot_id ?? null).first();
    return json(r, 201);
  }
  if (seg[0] === "spots" && seg[1] && method === "PUT") {
    const s = await body<Partial<Spot> & { is_default?: number }>(req);
    const id = Number(seg[1]);
    if (s.weather_spot_id === id) throw new HttpError(400, "天氣來源不能選自己");
    if (s.weather_spot_id) {
      const w = await getSpot(env, s.weather_spot_id);
      if (w.weather_spot_id) throw new HttpError(400, "天氣來源要選自己抓天氣的釣點");
      const users = await env.DB.prepare("SELECT COUNT(*) AS n FROM spots WHERE weather_spot_id = ?").bind(id).first<{ n: number }>();
      if (users?.n) throw new HttpError(400, "其他釣點正在使用這裡的天氣，不能改成共用");
    }
    // 只更新有傳進來的欄位
    const cols = ["name", "lat", "lon", "wg_spot_id", "weather_spot_id", "sort_order", "is_default"] as const;
    const sets = cols.filter((c) => c in s);
    if (sets.length === 0) throw new HttpError(400, "沒有要更新的欄位");
    if (s.is_default) await env.DB.prepare("UPDATE spots SET is_default = 0").run();
    const r = await env.DB.prepare(`UPDATE spots SET ${sets.map((c) => `${c} = ?`).join(", ")} WHERE id = ? RETURNING *`)
      .bind(...sets.map((c) => (s as Record<string, unknown>)[c] ?? null), id).first();
    if (!r) throw new HttpError(404, "找不到釣點");
    return json(r);
  }

  // ---- 行事曆 ----
  if (path === "/calendar" && method === "GET") {
    const month = url.searchParams.get("month") ?? twDate(Date.now() / 1000).slice(0, 7);
    const { results } = await env.DB.prepare(
      `SELECT t.date,
              COUNT(DISTINCT t.id) AS trips,
              SUM(CASE WHEN c.species = 'squid' THEN 1 ELSE 0 END) AS squid,
              SUM(CASE WHEN c.species = 'fish' THEN 1 ELSE 0 END) AS fish
         FROM trips t LEFT JOIN catches c ON c.trip_id = t.id
        WHERE t.date LIKE ? GROUP BY t.date`,
    ).bind(`${month}-%`).all();
    return json(results);
  }

  if (path === "/day" && method === "GET") {
    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "日期格式錯誤");
    return json(await dayDetail(env, date));
  }

  // ---- 出釣 ----
  if (path === "/trips" && method === "POST") {
    const t = await body<TripInput>(req);
    validateTrip(t);
    const spot = await getSpot(env, t.spot_id);
    const r = await env.DB.prepare(
      "INSERT INTO trips (spot_id, date, start_at, end_at, note) VALUES (?, ?, ?, ?, ?) RETURNING *",
    ).bind(spot.id, twDate(t.start_at), t.start_at, t.end_at, t.note ?? null).first();
    await ensureWeather(env.DB, await weatherSpotOf(env, spot), t.start_at, t.end_at).catch((e) => console.error("補抓天氣失敗", e));
    return json(r, 201);
  }
  if (seg[0] === "trips" && seg[1] && method === "PUT") {
    const t = await body<TripInput>(req);
    validateTrip(t);
    const spot = await getSpot(env, t.spot_id);
    const r = await env.DB.prepare(
      "UPDATE trips SET spot_id = ?, date = ?, start_at = ?, end_at = ?, note = ? WHERE id = ? RETURNING *",
    ).bind(spot.id, twDate(t.start_at), t.start_at, t.end_at, t.note ?? null, Number(seg[1])).first();
    if (!r) throw new HttpError(404, "找不到出釣紀錄");
    await ensureWeather(env.DB, await weatherSpotOf(env, spot), t.start_at, t.end_at).catch((e) => console.error("補抓天氣失敗", e));
    return json(r);
  }
  if (seg[0] === "trips" && seg[1] && method === "DELETE") {
    const id = Number(seg[1]);
    const { results } = await env.DB.prepare("SELECT photo_key FROM catches WHERE trip_id = ? AND photo_key IS NOT NULL")
      .bind(id).all<{ photo_key: string }>();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM catches WHERE trip_id = ?").bind(id),
      env.DB.prepare("DELETE FROM trips WHERE id = ?").bind(id),
    ]);
    if (results.length) ctx.waitUntil(deletePhotos(env.DB, results.map((r) => r.photo_key)));
    return json({ ok: true });
  }

  // ---- 釣獲 ----
  if (path === "/catches" && method === "POST") {
    const c = await body<CatchInput>(req);
    validateCatch(c);
    const r = await env.DB.prepare(
      `INSERT INTO catches (trip_id, caught_at, species, fish_name, length_cm, weight_g, note, photo_key, egi_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    ).bind(c.trip_id, c.caught_at, c.species, c.fish_name ?? null, c.length_cm ?? null, c.weight_g ?? null,
      c.note ?? null, c.photo_key ?? null, c.egi_color ?? null).first();
    await stretchTrip(env, c.trip_id, c.caught_at);
    return json(r, 201);
  }
  if (seg[0] === "catches" && seg[1] && method === "PUT") {
    const c = await body<CatchInput>(req);
    validateCatch(c);
    const id = Number(seg[1]);
    const old = await env.DB.prepare("SELECT photo_key FROM catches WHERE id = ?").bind(id).first<{ photo_key: string | null }>();
    if (!old) throw new HttpError(404, "找不到釣獲");
    const r = await env.DB.prepare(
      `UPDATE catches SET caught_at = ?, species = ?, fish_name = ?, length_cm = ?, weight_g = ?, note = ?, photo_key = ?, egi_color = ?
       WHERE id = ? RETURNING *`,
    ).bind(c.caught_at, c.species, c.fish_name ?? null, c.length_cm ?? null, c.weight_g ?? null, c.note ?? null,
      c.photo_key ?? null, c.egi_color ?? null, id).first();
    if (old.photo_key && old.photo_key !== c.photo_key) ctx.waitUntil(deletePhotos(env.DB, [old.photo_key]));
    await stretchTrip(env, c.trip_id, c.caught_at);
    return json(r);
  }
  if (seg[0] === "catches" && seg[1] && method === "DELETE") {
    const r = await env.DB.prepare("DELETE FROM catches WHERE id = ? RETURNING photo_key").bind(Number(seg[1]))
      .first<{ photo_key: string | null }>();
    if (r?.photo_key) ctx.waitUntil(deletePhotos(env.DB, [r.photo_key]));
    return json({ ok: true });
  }

  // ---- 照片上傳 ----
  if (path === "/photos" && method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new HttpError(400, "只能上傳圖片");
    if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) throw new HttpError(413, "圖片太大（上限約 1.8MB）");
    const data = await req.arrayBuffer();
    if (data.byteLength === 0) throw new HttpError(400, "圖片是空的");
    if (data.byteLength > MAX_PHOTO_BYTES) throw new HttpError(413, "圖片太大（上限約 1.8MB）");
    const ext = type.split("/")[1]?.replace("jpeg", "jpg").replace(/\+.*$/, "") ?? "jpg";
    const key = `${crypto.randomUUID()}.${ext}`;
    await putPhoto(env.DB, key, type, data);
    return json({ key }, 201);
  }

  // ---- 預報與分析 ----
  if (path === "/forecast" && method === "GET") {
    const spot = await weatherSpotOf(env, await getSpot(env, Number(url.searchParams.get("spot")) || null));
    const days = Math.min(Number(url.searchParams.get("days") ?? 7), 10);
    const species = (url.searchParams.get("species") ?? "squid") as Species;
    const today = twDate(Date.now() / 1000);
    // 評分用所有共用這個天氣來源的釣點的紀錄
    const history = await analyze(env.DB, { from: "2000-01-01", to: "2999-12-31", spotId: null, weatherSpotId: spot.id, species });
    const from = twDayStart(today);
    const hours = await forecast(env.DB, spot.id, from, from + days * 86400 - 3600, history);
    const last = await env.DB.prepare(
      "SELECT updated_at AS t, source FROM weather_hourly WHERE spot_id = ? ORDER BY updated_at DESC, time DESC LIMIT 1",
    ).bind(spot.id).first<{ t: number; source: string }>();
    return json({ spot, hours, updatedAt: last?.t ?? null, source: last?.source ?? null, historyHours: history.hours });
  }
  if (path === "/analysis" && method === "GET") {
    const from = url.searchParams.get("from") ?? "2000-01-01";
    const to = url.searchParams.get("to") ?? "2999-12-31";
    const spotId = Number(url.searchParams.get("spot")) || null;
    const species = (url.searchParams.get("species") ?? "squid") as Species;
    return json(await analyze(env.DB, { from, to, spotId, species }));
  }

  if (path === "/refresh" && method === "POST") {
    return json(await refreshAll(env));
  }

  throw new HttpError(404, "找不到這個 API");
}

async function refreshAll(env: Env) {
  // 只有自己抓天氣的釣點需要更新，共用天氣的釣點直接讀它們的資料
  const { results } = await env.DB.prepare("SELECT * FROM spots WHERE weather_spot_id IS NULL").all<Spot>();
  const out = [];
  for (const spot of results) {
    try {
      const weather = await refreshSpot(env.DB, spot);
      const tide = await refreshTide(env.DB, env.CWA_API_KEY, spot).catch((e) => ({ tide: `失敗：${e}` }));
      out.push({ ...weather, ...tide });
    } catch (e) {
      out.push({ spot: spot.name, rows: 0, windguru: false, error: String(e) });
    }
  }
  console.log("天氣更新", JSON.stringify(out));
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await handleApi(req, env, url, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "伺服器錯誤：" + String(e) }, 500);
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshAll(env));
  },
} satisfies ExportedHandler<Env>;
