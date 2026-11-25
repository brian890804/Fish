import { hourFloor, twDate, twDayStart } from "../shared/conditions";
import { analyze, forecast, type Species } from "./analysis";
import { ensureWeather, refreshSpot, type Spot } from "./weather";
import { loadTideEvents, refreshTide } from "./tide";
import { isEgiColor } from "../shared/egi";
import { PUSH_HOUR, describe, goodWindows, sendToAll } from "./push";
import { twHour } from "../shared/conditions";
import { MAX_PHOTO_BYTES, MAX_THUMB_BYTES, deletePhotos, getPhoto, putPhoto, putThumb } from "./photos";
import { bumpVersion, cached } from "./cache";
import { SESSION_COOKIE, createUser, inviteOk, loginUser, makeSession, readCookie, sessionCookie, sessionUserId, usernameOf } from "./auth";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** 中央氣象署開放資料金鑰（wrangler secret put CWA_API_KEY），沒設定時潮汐用模型 */
  CWA_API_KEY?: string;
  /** Web Push 金鑰（node scripts/setup-push.mjs 產生並存成 secret） */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  /** 登入帳號密碼與 cookie 簽章金鑰（node scripts/setup-login.mjs 設定） */
  APP_USERNAME?: string;
  APP_PASSWORD?: string;
  AUTH_SECRET?: string;
  /** 註冊用的邀請碼（wrangler secret put INVITE_CODE）；沒設定就不開放註冊 */
  INVITE_CODE?: string;
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
  /** 這趟主要釣什麼：軟絲或魚（分析時只算進同一種的出釣） */
  target?: Species;
}

type PushSpecies = "squid" | "fish" | "both";
const PUSH_SPECIES: PushSpecies[] = ["squid", "fish", "both"];

interface CatchInput {
  trip_id: number;
  caught_at: number;
  species: "squid" | "fish";
  fish_name?: string | null;
  length_cm?: number | null;
  weight_g?: number | null;
  note?: string | null;
  photo_key?: string | null;
  /** 多張照片，第一張當封面 */
  photo_keys?: string[] | null;
  egi_color?: string | null;
  water_color?: string | null;
}

function validateTrip(t: TripInput) {
  if (t.target !== undefined && t.target !== "squid" && t.target !== "fish") throw new HttpError(400, "目標只能是軟絲或魚");
  if (!Number.isFinite(t.start_at) || !Number.isFinite(t.end_at)) throw new HttpError(400, "缺少開始或結束時間");
  if (t.end_at <= t.start_at) throw new HttpError(400, "結束時間要晚於開始時間");
  if (t.end_at - t.start_at > 24 * 3600) throw new HttpError(400, "一次出釣不能超過 24 小時");
}

function validateCatch(c: CatchInput) {
  if (!Number.isFinite(c.trip_id)) throw new HttpError(400, "缺少出釣紀錄");
  if (!Number.isFinite(c.caught_at)) throw new HttpError(400, "缺少釣到的時間");
  if (c.species !== "squid" && c.species !== "fish") throw new HttpError(400, "種類只能是軟絲或魚");
  if (c.egi_color != null && !isEgiColor(c.egi_color)) throw new HttpError(400, "木蝦顏色不正確");
  if (c.water_color != null && !WATER_COLORS.includes(c.water_color as (typeof WATER_COLORS)[number])) throw new HttpError(400, "水色不正確");
}

const MAX_PHOTOS = 6;
const WATER_COLORS = ["clear", "light", "murky", "muddy"] as const;
const PHOTO_KEY_RE = /^[0-9a-f-]{36}\.[a-z0-9]+$/;

/** 從資料庫的一列取出所有照片 key（舊資料只有 photo_key） */
function photoKeysOf(row: { photo_key?: string | null; photo_keys?: string | null }): string[] {
  if (row.photo_keys) {
    try {
      const v = JSON.parse(row.photo_keys);
      if (Array.isArray(v)) return v.filter((k): k is string => typeof k === "string");
    } catch {
      /* 壞掉的 JSON 就退回 photo_key */
    }
  }
  return row.photo_key ? [row.photo_key] : [];
}

/** 前端送來的照片清單：去重、檢查格式、最多 6 張 */
function inputPhotoKeys(c: CatchInput): string[] {
  const keys = c.photo_keys ?? (c.photo_key ? [c.photo_key] : []);
  const clean = [...new Set(keys)].filter((k) => PHOTO_KEY_RE.test(k));
  if (clean.length > MAX_PHOTOS) throw new HttpError(400, `一筆釣獲最多 ${MAX_PHOTOS} 張照片`);
  return clean;
}

/** 回傳給前端時，photo_keys 轉成陣列 */
const toCatch = <T extends { photo_key?: string | null; photo_keys?: string | null }>(row: T | null) =>
  row ? { ...row, photo_keys: photoKeysOf(row) } : row;

/** 釣獲時間落在出釣時段外時，把出釣時段撐開，分析才算得到 */
async function stretchTrip(env: Env, tripId: number, t: number) {
  await env.DB.prepare(
    "UPDATE trips SET start_at = MIN(start_at, ?), end_at = MAX(end_at, ?) WHERE id = ?",
  ).bind(t, t + 60, tripId).run();
}

/** 出釣是不是這個帳號的 */
async function tripOwned(db: D1Database, uid: number, tripId: number): Promise<boolean> {
  return !!(await db.prepare("SELECT 1 AS ok FROM trips WHERE id = ? AND user_id = ?").bind(tripId, uid).first());
}

const hhmm = (t: number) => new Date((t + 8 * 3600) * 1000).toISOString().slice(11, 16);

/** 同一個帳號的另一趟出釣，跟這段時間重疊就回傳它（exceptId 是要忽略的這一趟） */
async function overlappingTrip(db: D1Database, uid: number, start: number, end: number, exceptId: number | null) {
  return db
    .prepare("SELECT id, start_at, end_at FROM trips WHERE user_id = ? AND start_at < ? AND end_at > ? AND id IS NOT ? LIMIT 1")
    .bind(uid, end, start, exceptId)
    .first<{ id: number; start_at: number; end_at: number }>();
}

const clashMessage = (c: { start_at: number; end_at: number }) =>
  `這段時間跟另一趟出釣重疊（${hhmm(c.start_at)} – ${hhmm(c.end_at)}）。同一段時間只能記一趟，請調整時間。`;

/** 釣獲時間在出釣外面時會把出釣撐開，撐開後也不能跟別趟重疊 */
async function assertCanStretch(db: D1Database, uid: number, tripId: number, caughtAt: number) {
  const trip = await db.prepare("SELECT start_at, end_at FROM trips WHERE id = ? AND user_id = ?")
    .bind(tripId, uid).first<{ start_at: number; end_at: number }>();
  if (!trip) throw new HttpError(404, "找不到出釣紀錄");
  const start = Math.min(trip.start_at, caughtAt);
  const end = Math.max(trip.end_at, caughtAt + 60);
  if (end - start > 24 * 3600) throw new HttpError(400, "一趟出釣最長 24 小時，這個釣獲時間會讓出釣超過 24 小時，請檢查時間。");
  const clash = await overlappingTrip(db, uid, start, end, tripId);
  if (clash) throw new HttpError(400, `這個釣獲時間會讓出釣跟另一趟重疊（${hhmm(clash.start_at)} – ${hhmm(clash.end_at)}）。`);
}

/** 一天的出釣、釣獲、以及每筆釣獲當下的天氣 */
async function dayDetail(env: Env, uid: number, date: string, overnight = false) {
  // overnight：也包含前一天開始、跨過這天午夜的出釣（首頁「今日釣獲」用，夜釣才看得到還在進行的那趟）
  const dayStart = twDayStart(date);
  const { results: trips } = await env.DB.prepare(
    `SELECT t.*, s.name AS spot_name, COALESCE(s.weather_spot_id, s.id) AS weather_spot_id,
            CASE WHEN t.date <> ? THEN 1 ELSE 0 END AS overnight
       FROM trips t JOIN spots s ON s.id = t.spot_id
      WHERE t.user_id = ? AND (t.date = ? OR (? = 1 AND t.start_at >= ? AND t.start_at < ? AND t.end_at > ?))
      ORDER BY start_at`,
  ).bind(date, uid, date, overnight ? 1 : 0, dayStart - 86400, dayStart, dayStart).all<any>();
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
      catches: catches.filter((c) => c.trip_id === t.id).map(toCatch),
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

  // ---- 登入（這三個不需要先登入） ----
  // 發出登入 cookie 並回傳成功
  const signedIn = async (id: number) => {
    const res = json({ ok: true, username: await usernameOf(env, id) });
    res.headers.append("set-cookie", sessionCookie(await makeSession(env, id), 400 * 86400));
    return res;
  };
  if (path === "/login" && method === "POST") {
    const { username = "", password = "" } = await body<{ username?: string; password?: string }>(req);
    const id = await loginUser(env, username.trim(), password);
    if (!id) throw new HttpError(401, "帳號或密碼不正確");
    return signedIn(id);
  }
  // 註冊：需要邀請碼（INVITE_CODE），註冊成功就直接登入
  if (path === "/register" && method === "POST") {
    if (!env.INVITE_CODE) throw new HttpError(403, "目前沒有開放註冊");
    const { username = "", password = "", invite = "" } = await body<{ username?: string; password?: string; invite?: string }>(req);
    if (!inviteOk(env, invite)) throw new HttpError(403, "邀請碼不正確");
    const name = username.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) throw new HttpError(400, "帳號請用 3–20 個英文字母、數字或底線");
    if (password.length < 8) throw new HttpError(400, "密碼至少要 8 個字");
    if (env.APP_USERNAME && name.toLowerCase() === env.APP_USERNAME.toLowerCase()) throw new HttpError(409, "這個帳號已經有人用了");
    const id = await createUser(env.DB, name, password);
    if (!id) throw new HttpError(409, "這個帳號已經有人用了");
    return signedIn(id);
  }
  if (path === "/logout" && method === "POST") {
    const res = json({ ok: true });
    res.headers.append("set-cookie", sessionCookie("", 0));
    return res;
  }
  if (path === "/me" && method === "GET") {
    const id = await sessionUserId(env, readCookie(req, SESSION_COOKIE));
    if (!id) throw new HttpError(401, "請先登入");
    return json({ ok: true, username: await usernameOf(env, id) });
  }

  // ---- 其餘 API（含照片）都要登入 ----
  // 目前登入的使用者 id：之後所有讀寫都只限這個帳號的資料
  const uid = await sessionUserId(env, readCookie(req, SESSION_COOKIE));
  if (!uid) throw new HttpError(401, "請先登入");

  // 照片用不可猜的 key 當檔名
  if (method === "GET" && seg[0] === "photos" && seg[1]) {
    const photo = await getPhoto(env.DB, seg[1], url.searchParams.get("s") === "thumb");
    if (!photo) return new Response("not found", { status: 404 });
    return new Response(photo.bytes, {
      headers: {
        "content-type": photo.contentType,
        // 舊照片還沒有縮圖時回原圖，只快取一天，之後補了縮圖就會換成小圖
        "cache-control": url.searchParams.get("s") === "thumb" && !photo.isThumb ? "public, max-age=86400" : "public, max-age=31536000, immutable",
      },
    });
  }
  // 還沒有縮圖的舊照片（前端會在背景補產生）
  if (method === "GET" && path === "/photos-missing-thumbs") {
    const { results } = await env.DB.prepare("SELECT key FROM photos WHERE thumb IS NULL LIMIT 30").all<{ key: string }>();
    return json(results.map((r) => r.key));
  }
  // 上傳縮圖：照片上傳後，前端另外送一張小圖
  if (method === "POST" && seg[0] === "photos" && seg[1] && seg[2] === "thumb") {
    const data = await req.arrayBuffer();
    if (data.byteLength === 0 || data.byteLength > MAX_THUMB_BYTES) throw new HttpError(400, "縮圖大小不正確");
    if (!(await putThumb(env.DB, seg[1], data))) throw new HttpError(404, "找不到照片");
    return json({ ok: true });
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
      // 先算每一趟的漁獲，再依日期加總；blank = 這天完全沒釣到的出釣趟數（槓龜）
      `SELECT date,
              COUNT(*) AS trips,
              SUM(squid) AS squid,
              SUM(fish) AS fish,
              SUM(CASE WHEN squid + fish = 0 THEN 1 ELSE 0 END) AS blank
         FROM (SELECT t.id, t.date,
                      SUM(CASE WHEN c.species = 'squid' THEN 1 ELSE 0 END) AS squid,
                      SUM(CASE WHEN c.species = 'fish' THEN 1 ELSE 0 END) AS fish
                 FROM trips t LEFT JOIN catches c ON c.trip_id = t.id
                WHERE t.user_id = ? AND t.date LIKE ? GROUP BY t.id)
        GROUP BY date`,
    ).bind(uid, `${month}-%`).all();
    return json(results);
  }

  if (path === "/day" && method === "GET") {
    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "日期格式錯誤");
    return json(await dayDetail(env, uid, date, url.searchParams.get("overnight") === "1"));
  }

  // ---- 出釣 ----
  if (path === "/trips" && method === "POST") {
    const t = await body<TripInput>(req);
    validateTrip(t);
    const spot = await getSpot(env, t.spot_id);
    const clash = await overlappingTrip(env.DB, uid, t.start_at, t.end_at, null);
    if (clash) throw new HttpError(400, clashMessage(clash));
    const r = await env.DB.prepare(
      "INSERT INTO trips (user_id, spot_id, date, start_at, end_at, note, target) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
    ).bind(uid, spot.id, twDate(t.start_at), t.start_at, t.end_at, t.note ?? null, t.target ?? "squid").first();
    await ensureWeather(env.DB, await weatherSpotOf(env, spot), t.start_at, t.end_at).catch((e) => console.error("補抓天氣失敗", e));
    return json(r, 201);
  }
  if (seg[0] === "trips" && seg[1] && method === "PUT") {
    const t = await body<TripInput>(req);
    validateTrip(t);
    const spot = await getSpot(env, t.spot_id);
    const clash = await overlappingTrip(env.DB, uid, t.start_at, t.end_at, Number(seg[1]));
    if (clash) throw new HttpError(400, clashMessage(clash));
    const r = await env.DB.prepare(
      "UPDATE trips SET spot_id = ?, date = ?, start_at = ?, end_at = ?, note = ?, target = COALESCE(?, target) WHERE id = ? AND user_id = ? RETURNING *",
    ).bind(spot.id, twDate(t.start_at), t.start_at, t.end_at, t.note ?? null, t.target ?? null, Number(seg[1]), uid).first();
    if (!r) throw new HttpError(404, "找不到出釣紀錄");
    await ensureWeather(env.DB, await weatherSpotOf(env, spot), t.start_at, t.end_at).catch((e) => console.error("補抓天氣失敗", e));
    return json(r);
  }
  if (seg[0] === "trips" && seg[1] && method === "DELETE") {
    const id = Number(seg[1]);
    if (!(await tripOwned(env.DB, uid, id))) throw new HttpError(404, "找不到出釣紀錄");
    const { results } = await env.DB.prepare("SELECT photo_key, photo_keys FROM catches WHERE trip_id = ?")
      .bind(id).all<{ photo_key: string | null; photo_keys: string | null }>();
    const keys = results.flatMap(photoKeysOf);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM catches WHERE trip_id = ?").bind(id),
      env.DB.prepare("DELETE FROM trips WHERE id = ?").bind(id),
    ]);
    if (keys.length) ctx.waitUntil(deletePhotos(env.DB, keys));
    return json({ ok: true });
  }

  // ---- 釣獲 ----
  if (path === "/catches" && method === "POST") {
    const c = await body<CatchInput>(req);
    validateCatch(c);
    const keys = inputPhotoKeys(c);
    await assertCanStretch(env.DB, uid, c.trip_id, c.caught_at);
    const r = await env.DB.prepare(
      `INSERT INTO catches (trip_id, caught_at, species, fish_name, length_cm, weight_g, note, photo_key, photo_keys, egi_color, water_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    ).bind(c.trip_id, c.caught_at, c.species, c.fish_name ?? null, c.length_cm ?? null, c.weight_g ?? null,
      c.note ?? null, keys[0] ?? null, keys.length ? JSON.stringify(keys) : null, c.egi_color ?? null, c.water_color ?? null).first<any>();
    await stretchTrip(env, c.trip_id, c.caught_at);
    return json(toCatch(r), 201);
  }
  if (seg[0] === "catches" && seg[1] && method === "PUT") {
    const c = await body<CatchInput>(req);
    validateCatch(c);
    const id = Number(seg[1]);
    const old = await env.DB.prepare(
      "SELECT c.photo_key, c.photo_keys FROM catches c JOIN trips t ON t.id = c.trip_id WHERE c.id = ? AND t.user_id = ?",
    ).bind(id, uid).first<{ photo_key: string | null; photo_keys: string | null }>();
    if (!old) throw new HttpError(404, "找不到釣獲");
    await assertCanStretch(env.DB, uid, c.trip_id, c.caught_at);
    const keys = inputPhotoKeys(c);
    const r = await env.DB.prepare(
      `UPDATE catches SET caught_at = ?, species = ?, fish_name = ?, length_cm = ?, weight_g = ?, note = ?, photo_key = ?, photo_keys = ?, egi_color = ?, water_color = ?
       WHERE id = ? RETURNING *`,
    ).bind(c.caught_at, c.species, c.fish_name ?? null, c.length_cm ?? null, c.weight_g ?? null, c.note ?? null,
      keys[0] ?? null, keys.length ? JSON.stringify(keys) : null, c.egi_color ?? null, c.water_color ?? null, id).first<any>();
    // 編輯時拿掉的照片，從資料庫刪掉
    const removed = photoKeysOf(old).filter((k) => !keys.includes(k));
    if (removed.length) ctx.waitUntil(deletePhotos(env.DB, removed));
    await stretchTrip(env, c.trip_id, c.caught_at);
    return json(toCatch(r));
  }
  if (seg[0] === "catches" && seg[1] && method === "DELETE") {
    const r = await env.DB.prepare(
      "DELETE FROM catches WHERE id = ? AND trip_id IN (SELECT id FROM trips WHERE user_id = ?) RETURNING photo_key, photo_keys",
    ).bind(Number(seg[1]), uid)
      .first<{ photo_key: string | null; photo_keys: string | null }>();
    const keys = r ? photoKeysOf(r) : [];
    if (keys.length) ctx.waitUntil(deletePhotos(env.DB, keys));
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
    const today = twDate(Date.now() / 1000);
    // 軟絲、魚各用自己的紀錄評分；評分用所有共用這個天氣來源的釣點的紀錄
    const historyOf = (species: Species) =>
      cached(env.DB, `u${uid}:history:${spot.id}:${species}`, () =>
        analyze(env.DB, { userId: uid, from: "2000-01-01", to: "2999-12-31", spotId: null, weatherSpotId: spot.id, species }),
      );
    const [history, fishHistory] = await Promise.all([historyOf("squid"), historyOf("fish")]);
    const from = twDayStart(today);
    const hours = await forecast(env.DB, spot.id, from, from + days * 86400 - 3600, history, fishHistory);
    const last = await env.DB.prepare(
      "SELECT updated_at AS t, source FROM weather_hourly WHERE spot_id = ? ORDER BY updated_at DESC, time DESC LIMIT 1",
    ).bind(spot.id).first<{ t: number; source: string }>();
    // 預報期間的滿潮／乾潮時間（表格標示用）
    const tideEvents = (await loadTideEvents(env.DB, [spot.id], from, from + days * 86400)).get(spot.id) ?? [];
    return json({ spot, hours, tideEvents, updatedAt: last?.t ?? null, source: last?.source ?? null, historyHours: history.hours });
  }
  if (path === "/analysis" && method === "GET") {
    const from = url.searchParams.get("from") ?? "2000-01-01";
    const to = url.searchParams.get("to") ?? "2999-12-31";
    const spotId = Number(url.searchParams.get("spot")) || null;
    const species = (url.searchParams.get("species") ?? "squid") as Species;
    return json(await cached(env.DB, `u${uid}:analysis:${from}:${to}:${spotId}:${species}`, () =>
      analyze(env.DB, { userId: uid, from, to, spotId, species }),
    ));
  }

  // ---- 個人紀錄：最大隻排行、每月胴長趨勢 ----
  if (path === "/records" && method === "GET") {
    const species = url.searchParams.get("species") === "fish" ? "fish" : "squid";
    const { results: top } = await env.DB.prepare(
      `SELECT c.id, c.caught_at, c.length_cm, c.weight_g, c.egi_color, c.photo_key, c.photo_keys, t.date, s.name AS spot_name
         FROM catches c JOIN trips t ON t.id = c.trip_id JOIN spots s ON s.id = t.spot_id
        WHERE t.user_id = ? AND c.species = ? AND c.length_cm IS NOT NULL
        ORDER BY c.length_cm DESC, c.caught_at LIMIT 5`,
    ).bind(uid, species).all();
    const { results: months } = await env.DB.prepare(
      `SELECT substr(t.date, 1, 7) AS month,
              COUNT(*) AS catches,
              COUNT(c.length_cm) AS measured,
              ROUND(AVG(c.length_cm), 1) AS avg_cm,
              MAX(c.length_cm) AS max_cm
         FROM catches c JOIN trips t ON t.id = c.trip_id
        WHERE t.user_id = ? AND c.species = ?
        GROUP BY month ORDER BY month`,
    ).bind(uid, species).all();
    // 每月出釣次數（含槓龜），用來看每次平均釣幾隻
    const { results: tripsByMonth } = await env.DB.prepare(
      "SELECT substr(date, 1, 7) AS month, COUNT(*) AS trips FROM trips WHERE user_id = ? GROUP BY month",
    ).bind(uid).all<{ month: string; trips: number }>();
    const tripMap = new Map(tripsByMonth.map((r) => [r.month, r.trips]));
    return json({
      species,
      // 每一筆附上全部照片（點縮圖可以直接左右滑著看）
      top: (top as { photo_key?: string | null; photo_keys?: string | null }[]).map((r) => ({ ...r, photo_keys: photoKeysOf(r) })),
      months: (months as { month: string }[]).map((m) => ({ ...m, trips: tripMap.get(m.month) ?? 0 })),
    });
  }

  // ---- 好時段推播 ----
  if (path === "/push/key" && method === "GET") {
    return json({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
  }
  if (path === "/push/subscribe" && method === "POST") {
    const { subscription, species = "squid" } = await body<{ subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; species?: PushSpecies }>(req);
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) throw new HttpError(400, "訂閱資料不完整");
    if (!/^https:\/\//.test(subscription.endpoint)) throw new HttpError(400, "訂閱網址不正確");
    if (!PUSH_SPECIES.includes(species)) throw new HttpError(400, "通知種類只能是軟絲、魚或兩者");
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, species) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id, species = excluded.species`,
    ).bind(subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, uid, species).run();
    return json({ ok: true });
  }
  // 這台裝置要收哪一種的通知（軟絲、魚、兩者）
  if (path === "/push/species" && method === "POST") {
    const { endpoint, species } = await body<{ endpoint: string; species: PushSpecies }>(req);
    if (!PUSH_SPECIES.includes(species)) throw new HttpError(400, "通知種類只能是軟絲、魚或兩者");
    await env.DB.prepare("UPDATE push_subscriptions SET species = ? WHERE endpoint = ? AND user_id = ?").bind(species, endpoint ?? "", uid).run();
    return json({ ok: true });
  }
  if (path === "/push/unsubscribe" && method === "POST") {
    const { endpoint } = await body<{ endpoint: string }>(req);
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").bind(endpoint ?? "", uid).run();
    return json({ ok: true });
  }
  // 預覽：現在檢查的話，會通知什麼（不會真的送出）
  if (path === "/push/preview" && method === "GET") {
    const sp = url.searchParams.get("species") === "fish" ? "fish" : "squid";
    return json(await planPush(env, uid, sp));
  }
  if (path === "/push/test" && method === "POST") {
    return json(await sendToAll(env, { title: "🦑 推播測試", body: "收得到這則通知，代表好時段推播設定成功了。" }, uid));
  }

  if (path === "/refresh" && method === "POST") {
    return json(await refreshAll(env));
  }

  throw new HttpError(404, "找不到這個 API");
}

/** 看接下來 24 小時有沒有好時段 */
async function planPush(env: Env, uid: number, species: "squid" | "fish") {
  const now = Math.floor(Date.now() / 1000);
  const spot = await weatherSpotOf(env, await getSpot(env, null));
  const historyOf = (sp: "squid" | "fish") =>
    cached(env.DB, `u${uid}:history:${spot.id}:${sp}`, () =>
      analyze(env.DB, { userId: uid, from: "2000-01-01", to: "2999-12-31", spotId: null, weatherSpotId: spot.id, species: sp }),
    );
  const [history, fishHistory] = await Promise.all([historyOf("squid"), historyOf("fish")]);
  const start = hourFloor(now) + 3600;
  // 好時段判斷用這一種物種的分數（forecast 同時給軟絲 score、魚 fish_score）
  const hours = (await forecast(env.DB, spot.id, start, start + 24 * 3600, history, fishHistory)).map((h) => ({
    ...h,
    score: species === "fish" ? h.fish_score : h.score,
  }));
  const windows = goodWindows(hours, start, start + 24 * 3600);
  return {
    windows: windows.map((w) => ({ from: w.from, to: w.to, bestScore: w.bestScore })),
    message: windows.length ? describe(windows, spot.name, now) : null,
  };
}

/** 排程：每天下午檢查一次，有好時段才通知 */
async function dailyPush(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  if (twHour(now) !== PUSH_HOUR) return;
  const day = twDate(now);
  // 先佔位，避免同一個小時內的排程重複通知
  const claim = await env.DB.prepare("INSERT INTO push_sent (day, sent_at) VALUES (?, ?) ON CONFLICT(day) DO NOTHING").bind(day, now).run();
  if (!claim.meta.changes) return;
  // 每位開啟過通知的使用者，各自用自己的歷史資料判斷、各自收到
  const { results: users } = await env.DB.prepare("SELECT DISTINCT user_id AS id FROM push_subscriptions").all<{ id: number }>();
  const lines: string[] = [];
  for (const { id } of users) {
    // 每一種物種各自判斷、只送給選了那種的裝置（選「兩者」的裝置兩種都會收到）
    for (const sp of ["squid", "fish"] as const) {
      const plan = await planPush(env, id, sp);
      if (!plan.message) continue;
      const r = await sendToAll(env, plan.message, id, sp);
      lines.push(`[${sp === "fish" ? "魚" : "軟絲"}] ${plan.message.title}｜${JSON.stringify(r)}`);
      console.log("好時段推播", JSON.stringify({ user: id, species: sp, ...plan.message, ...r }));
    }
  }
  if (lines.length) await env.DB.prepare("UPDATE push_sent SET message = ? WHERE day = ?").bind(lines.join("\n"), day).run();
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
      const res = await handleApi(req, env, url, ctx);
      // 出釣、釣獲、釣點有寫入成功，就讓分析快取失效
      if (req.method !== "GET" && res.ok && /^\/api\/(trips|catches|spots)/.test(url.pathname)) await bumpVersion(env.DB);
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "伺服器錯誤：" + String(e) }, 500);
    }
  },
  async scheduled(_event, env, ctx) {
    // 先更新天氣，再用最新的預報判斷要不要推播
    ctx.waitUntil(refreshAll(env).then(() => dailyPush(env)).catch((e) => console.error("排程失敗", e)));
  },
} satisfies ExportedHandler<Env>;
