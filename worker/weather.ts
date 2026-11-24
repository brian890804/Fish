// 天氣／海況抓取：溫古魯（GFS 13km + GFS-Wave，就是溫古魯頁面最上面那張表）為主，
// Open-Meteo 補上海溫與含潮汐的海面高度，溫古魯失敗或補抓過去資料時也用 Open-Meteo。
import { hourFloor } from "../shared/conditions";

export interface Spot {
  id: number;
  name: string;
  lat: number;
  lon: number;
  wg_spot_id: number | null;
  /** 共用哪個釣點的天氣；NULL 表示自己抓 */
  weather_spot_id: number | null;
  sort_order: number;
}

export interface WeatherRow {
  time: number;
  source: string;
  temp_c: number | null;
  wind_ms: number | null;
  gust_ms: number | null;
  wind_dir: number | null;
  cloud_pct: number | null;
  precip_mm: number | null;
  pressure_hpa: number | null;
  wave_m: number | null;
  wave_period_s: number | null;
  wave_dir: number | null;
  swell_m: number | null;
  sea_temp_c: number | null;
  sea_level_m: number | null;
}

const FIELDS = [
  "temp_c", "wind_ms", "gust_ms", "wind_dir", "cloud_pct", "precip_mm", "pressure_hpa",
  "wave_m", "wave_period_s", "wave_dir", "swell_m", "sea_temp_c", "sea_level_m",
] as const;

function emptyRow(time: number, source: string): WeatherRow {
  const r = { time, source } as WeatherRow;
  for (const f of FIELDS) (r as any)[f] = null;
  return r;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ---------------- 溫古魯 ----------------

const WG_BASE = "https://www.windguru.net/int/iapi.php";
const KNOT_TO_MS = 0.514444;
const WG_WIND_MODEL = 3; // GFS 13 km
const WG_WAVE_MODEL = 84; // GFS-Wave 16 km

async function wgGet(spotId: number, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${WG_BASE}?${qs}`, {
    headers: {
      Referer: `https://www.windguru.net/${spotId}`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
    },
  });
  if (!res.ok) throw new Error(`windguru ${params.q} HTTP ${res.status}`);
  return res.json();
}

interface WgModelRef {
  id_model: number;
  rundef: string;
  cachefix: string;
}

async function wgModelRefs(spotId: number): Promise<Map<number, WgModelRef>> {
  const data = await wgGet(spotId, { q: "forecast_spot", id_spot: String(spotId) });
  const refs = new Map<number, WgModelRef>();
  for (const tab of [...(data.tabs ?? []), ...(data.tabs_hidden ?? [])]) {
    for (const m of tab.id_model_arr ?? []) {
      if (!refs.has(m.id_model)) refs.set(m.id_model, m);
    }
  }
  return refs;
}

async function wgForecast(spotId: number, ref: WgModelRef): Promise<any> {
  const data = await wgGet(spotId, {
    q: "forecast",
    id_model: String(ref.id_model),
    rundef: ref.rundef,
    id_spot: String(spotId),
    WGCACHEABLE: "21600",
    cachefix: ref.cachefix,
  });
  if (!data.fcst?.hours) throw new Error(`windguru model ${ref.id_model} 沒有預報資料`);
  return data.fcst;
}

/** 回傳 time → 部分欄位 */
export async function fetchWindguru(spotId: number): Promise<Map<number, Partial<WeatherRow>>> {
  const refs = await wgModelRefs(spotId);
  const windRef = refs.get(WG_WIND_MODEL);
  const waveRef = refs.get(WG_WAVE_MODEL);
  if (!windRef) throw new Error("溫古魯這個 spot 沒有 GFS 13km 模型");

  const [wind, wave] = await Promise.all([
    wgForecast(spotId, windRef),
    waveRef ? wgForecast(spotId, waveRef).catch(() => null) : Promise.resolve(null),
  ]);

  const out = new Map<number, Partial<WeatherRow>>();
  const at = (t: number) => {
    let r = out.get(t);
    if (!r) out.set(t, (r = {}));
    return r;
  };

  wind.hours.forEach((h: number, i: number) => {
    const r = at(wind.initstamp + h * 3600);
    const spd = num(wind.WINDSPD?.[i]);
    const gust = num(wind.GUST?.[i]);
    r.wind_ms = spd == null ? null : +(spd * KNOT_TO_MS).toFixed(2);
    r.gust_ms = gust == null ? null : +(gust * KNOT_TO_MS).toFixed(2);
    r.wind_dir = num(wind.WINDDIR?.[i]);
    r.temp_c = num(wind.TMPE?.[i]) ?? num(wind.TMP?.[i]);
    r.cloud_pct = num(wind.TCDC?.[i]);
    r.precip_mm = num(wind.APCP1?.[i]);
    r.pressure_hpa = num(wind.SLP?.[i]);
  });

  if (wave) {
    wave.hours.forEach((h: number, i: number) => {
      const r = at(wave.initstamp + h * 3600);
      r.wave_m = num(wave.HTSGW?.[i]);
      r.wave_period_s = num(wave.PERPW?.[i]);
      r.wave_dir = num(wave.DIRPW?.[i]);
      r.swell_m = num(wave.SWELL1?.[i]);
    });
  }
  return out;
}

// ---------------- Open-Meteo ----------------

const OM_WEATHER_VARS =
  "temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,precipitation,pressure_msl";
// 浪用 GFS-Wave 16km，跟溫古魯頂部表格同一個模型；海溫與潮汐 GFS-Wave 沒有，用 Open-Meteo 預設模型
const OM_WAVE_VARS = "wave_height,wave_period,wave_direction,swell_wave_height";
const OM_SEA_VARS = "sea_surface_temperature,sea_level_height_msl";

type OmRange = { pastDays: number; forecastDays: number } | { start: string; end: string };

function omQuery(spot: Spot, vars: string, range: OmRange): string {
  const p = new URLSearchParams({
    latitude: String(spot.lat),
    longitude: String(spot.lon),
    hourly: vars,
    timeformat: "unixtime",
    timezone: "GMT",
    wind_speed_unit: "ms",
  });
  if ("start" in range) {
    p.set("start_date", range.start);
    p.set("end_date", range.end);
  } else {
    p.set("past_days", String(range.pastDays));
    p.set("forecast_days", String(range.forecastDays));
  }
  return p.toString();
}

async function omJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchOpenMeteo(spot: Spot, range: OmRange): Promise<Map<number, WeatherRow>> {
  // 超過約 3 個月前的資料要改打 historical-forecast-api
  const old = "start" in range && Date.parse(range.start) < Date.now() - 85 * 86400_000;
  const weatherHost = old ? "https://historical-forecast-api.open-meteo.com" : "https://api.open-meteo.com";
  const marine = "https://marine-api.open-meteo.com/v1/marine";
  const [w, wave, sea] = await Promise.all([
    // 風、氣溫、雲量用 GFS，跟溫古魯頂部表格同一個模型
    omJson(`${weatherHost}/v1/forecast?${omQuery(spot, OM_WEATHER_VARS, range)}&models=gfs_seamless`),
    omJson(`${marine}?${omQuery(spot, OM_WAVE_VARS, range)}&cell_selection=sea&models=ncep_gfswave016`).then(
      // 太久以前 GFS-Wave 16km 可能沒有資料，改用預設模型
      (r) => r ?? omJson(`${marine}?${omQuery(spot, OM_WAVE_VARS, range)}&cell_selection=sea`),
    ),
    omJson(`${marine}?${omQuery(spot, OM_SEA_VARS, range)}&cell_selection=sea`),
  ]);

  const out = new Map<number, WeatherRow>();
  const at = (t: number) => {
    let r = out.get(t);
    if (!r) out.set(t, (r = emptyRow(t, "open-meteo")));
    return r;
  };
  const wh = w?.hourly;
  if (wh?.time) {
    wh.time.forEach((t: number, i: number) => {
      const r = at(t);
      r.temp_c = num(wh.temperature_2m?.[i]);
      r.wind_ms = num(wh.wind_speed_10m?.[i]);
      r.gust_ms = num(wh.wind_gusts_10m?.[i]);
      r.wind_dir = num(wh.wind_direction_10m?.[i]);
      r.cloud_pct = num(wh.cloud_cover?.[i]);
      r.precip_mm = num(wh.precipitation?.[i]);
      r.pressure_hpa = num(wh.pressure_msl?.[i]);
    });
  }
  const vh = wave?.hourly;
  if (vh?.time) {
    vh.time.forEach((t: number, i: number) => {
      const r = at(t);
      r.wave_m = num(vh.wave_height?.[i]);
      r.wave_period_s = num(vh.wave_period?.[i]);
      r.wave_dir = num(vh.wave_direction?.[i]);
      r.swell_m = num(vh.swell_wave_height?.[i]);
    });
  }
  const sh = sea?.hourly;
  if (sh?.time) {
    sh.time.forEach((t: number, i: number) => {
      const r = at(t);
      r.sea_temp_c = num(sh.sea_surface_temperature?.[i]);
      r.sea_level_m = num(sh.sea_level_height_msl?.[i]);
    });
  }
  return out;
}

// ---------------- 寫入 D1 ----------------

const COLS = ["spot_id", "time", "source", ...FIELDS, "updated_at"];

/**
 * mode = "refresh"：已經過去的小時不再更新，只覆蓋現在與未來的預報；沒有的小時就新增。
 * mode = "fill"：只補沒有的小時（補抓過去資料用）。
 */
async function writeRows(db: D1Database, spotId: number, rows: WeatherRow[], mode: "refresh" | "fill") {
  if (rows.length === 0) return 0;
  const now = Math.floor(Date.now() / 1000);
  const currentHour = hourFloor(now);
  const placeholders = COLS.map(() => "?").join(",");
  const conflict =
    mode === "fill"
      ? "DO NOTHING"
      : `DO UPDATE SET ${["source", ...FIELDS, "updated_at"].map((c) => `${c}=excluded.${c}`).join(",")}
         WHERE excluded.time >= ${currentHour}`;
  const sql = `INSERT INTO weather_hourly (${COLS.join(",")}) VALUES (${placeholders})
               ON CONFLICT(spot_id, time) ${conflict}`;
  const stmt = db.prepare(sql);
  const batch = rows.map((r) =>
    stmt.bind(spotId, r.time, r.source, ...FIELDS.map((f) => r[f]), now),
  );
  // D1 一次 batch 不要太大
  for (let i = 0; i < batch.length; i += 100) await db.batch(batch.slice(i, i + 100));
  return rows.length;
}

export interface RefreshResult {
  spot: string;
  rows: number;
  windguru: boolean;
  error?: string;
}

/** 排程每 20 分鐘呼叫：抓今天起 8 天的預報（含昨天，補排程中斷時漏掉的小時） */
export async function refreshSpot(db: D1Database, spot: Spot): Promise<RefreshResult> {
  const om = await fetchOpenMeteo(spot, { pastDays: 1, forecastDays: 8 });
  let wgOk = false;
  let error: string | undefined;
  if (spot.wg_spot_id) {
    try {
      const wg = await fetchWindguru(spot.wg_spot_id);
      for (const [t, part] of wg) {
        if (t % 3600 !== 0) continue;
        const base = om.get(t) ?? emptyRow(t, "windguru");
        for (const f of FIELDS) {
          const v = (part as any)[f];
          if (v != null) (base as any)[f] = v;
        }
        base.source = om.has(t) ? "windguru+open-meteo" : "windguru";
        om.set(t, base);
      }
      wgOk = wg.size > 0;
    } catch (e) {
      error = String(e);
    }
  }
  const rows = [...om.values()].sort((a, b) => a.time - b.time);
  const n = await writeRows(db, spot.id, rows, "refresh");
  return { spot: spot.name, rows: n, windguru: wgOk, error };
}

/** 新增／修改出釣時，若那段時間還沒有天氣資料就補抓（過去的資料只有 Open-Meteo 有） */
export async function ensureWeather(db: D1Database, spot: Spot, startAt: number, endAt: number) {
  const from = hourFloor(startAt) - 3600;
  const to = hourFloor(endAt) + 3600;
  const have = await db
    .prepare("SELECT COUNT(*) AS n FROM weather_hourly WHERE spot_id = ? AND time BETWEEN ? AND ?")
    .bind(spot.id, from, to)
    .first<{ n: number }>();
  const expected = (to - from) / 3600 + 1;
  if ((have?.n ?? 0) >= expected) return;

  const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10); // UTC 日期，配合 timezone=GMT
  const rows = await fetchOpenMeteo(spot, { start: day(from), end: day(to) });
  await writeRows(
    db,
    spot.id,
    [...rows.values()].filter((r) => r.time >= from && r.time <= to),
    "fill",
  );
}
