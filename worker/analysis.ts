// 分析：把出釣時間切成每小時，對每個條件分組算「每小時釣獲數」
import {
  FACTORS,
  SMOOTHING_HOURS,
  hourFloor,
  moonAt,
  ratioToScore,
  scoreHour,
  tideState,
  tideFromEvents,
  type TideEvent,
  type FactorStat,
  type HourConditions,
} from "../shared/conditions";
import { loadTideEvents } from "./tide";

export type Species = "squid" | "fish" | "all";

interface WRow {
  time: number;
  temp_c: number | null;
  wind_ms: number | null;
  wind_dir: number | null;
  cloud_pct: number | null;
  precip_mm: number | null;
  wave_m: number | null;
  swell_m: number | null;
  sea_temp_c: number | null;
  sea_level_m: number | null;
}

/**
 * 某個小時的條件。潮汐優先用氣象署的滿／乾潮時間（以該小時的中點判斷），
 * 沒有氣象署資料時才用模型的海面高度。
 */
export function conditionsFor(time: number, byTime: Map<number, WRow>, tides: TideEvent[] = []): HourConditions | null {
  const w = byTime.get(time);
  if (!w) return null;
  return {
    time,
    temp_c: w.temp_c,
    wind_ms: w.wind_ms,
    wind_dir: w.wind_dir,
    cloud_pct: w.cloud_pct,
    precip_mm: w.precip_mm,
    wave_m: w.wave_m,
    swell_m: w.swell_m,
    sea_temp_c: w.sea_temp_c,
    tide:
      tideFromEvents(time + 1800, tides) ??
      tideState(byTime.get(time - 3600)?.sea_level_m, w.sea_level_m, byTime.get(time + 3600)?.sea_level_m),
    moon: moonAt(time + 1800).illumination,
  };
}

async function weatherMap(db: D1Database, spotId: number | null, from: number, to: number) {
  const q = spotId
    ? db.prepare("SELECT * FROM weather_hourly WHERE spot_id = ? AND time BETWEEN ? AND ?").bind(spotId, from, to)
    : db.prepare("SELECT * FROM weather_hourly WHERE time BETWEEN ? AND ?").bind(from, to);
  const { results } = await q.all<WRow & { spot_id: number }>();
  const bySpot = new Map<number, Map<number, WRow>>();
  for (const r of results) {
    let m = bySpot.get(r.spot_id);
    if (!m) bySpot.set(r.spot_id, (m = new Map()));
    m.set(r.time, r);
  }
  return bySpot;
}

export interface AnalysisResult {
  from: string;
  to: string;
  species: Species;
  trips: number;
  hours: number;
  catches: number;
  squid: number;
  fish: number;
  rate: number;
  avgLengthCm: number | null;
  maxLengthCm: number | null;
  /** 各木蝦顏色釣到的數量（只算有記顏色的），依數量排序 */
  egiColors: { color: string; catches: number; avgLengthCm: number | null }[];
  blankTrips: number;
  /** 有幾個小時找不到天氣資料（不會算進條件分組） */
  missingWeatherHours: number;
  factors: FactorStat[];
}

export async function analyze(
  db: D1Database,
  // spotId：只看某個釣點；weatherSpotId：看共用同一個天氣來源的所有釣點（評分用）
  opts: { from: string; to: string; spotId: number | null; species: Species; weatherSpotId?: number | null },
): Promise<AnalysisResult> {
  // 每趟出釣都帶上它實際使用的天氣來源（附近釣點共用水湳洞漁港的天氣）
  const base = `SELECT t.*, COALESCE(s.weather_spot_id, s.id) AS wsid FROM trips t JOIN spots s ON s.id = t.spot_id
                 WHERE t.date BETWEEN ? AND ?`;
  const tripsQ = opts.spotId
    ? db.prepare(`${base} AND t.spot_id = ?`).bind(opts.from, opts.to, opts.spotId)
    : opts.weatherSpotId
      ? db.prepare(`${base} AND COALESCE(s.weather_spot_id, s.id) = ?`).bind(opts.from, opts.to, opts.weatherSpotId)
      : db.prepare(base).bind(opts.from, opts.to);
  const { results: trips } = await tripsQ.all<{ id: number; spot_id: number; wsid: number; start_at: number; end_at: number }>();

  const empty: AnalysisResult = {
    ...opts, trips: 0, hours: 0, catches: 0, squid: 0, fish: 0, rate: 0,
    avgLengthCm: null, maxLengthCm: null, egiColors: [], blankTrips: 0, missingWeatherHours: 0,
    factors: FACTORS.map((f) => ({ key: f.key, label: f.label, buckets: [] })),
  };
  if (trips.length === 0) return empty;

  const ids = trips.map((t) => t.id);
  const { results: catches } = await db
    .prepare(`SELECT * FROM catches WHERE trip_id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids)
    .all<{ trip_id: number; caught_at: number; species: "squid" | "fish"; length_cm: number | null; egi_color: string | null }>();

  const counted = catches.filter((c) => opts.species === "all" || c.species === opts.species);
  const minT = Math.min(...trips.map((t) => t.start_at)) - 7200;
  const maxT = Math.max(...trips.map((t) => t.end_at)) + 7200;
  const wsids = [...new Set(trips.map((t) => t.wsid))];
  const weather = await weatherMap(db, wsids.length === 1 ? wsids[0] : null, minT, maxT);
  const tideMap = await loadTideEvents(db, wsids, minT, maxT);

  // 每個條件分組累計：釣了幾小時、釣到幾隻
  const acc = new Map<string, Map<string, { hours: number; catches: number }>>();
  for (const f of FACTORS) acc.set(f.key, new Map(f.buckets.map((b) => [b, { hours: 0, catches: 0 }])));

  let totalHours = 0;
  let missing = 0;
  let blankTrips = 0;
  for (const trip of trips) {
    const tripCatches = counted.filter((c) => c.trip_id === trip.id);
    if (tripCatches.length === 0) blankTrips++;
    const byTime = weather.get(trip.wsid) ?? new Map();
    for (let h = hourFloor(trip.start_at); h < trip.end_at; h += 3600) {
      // 這個小時實際有釣的比例（例如 18:30 開始，18 點那格只算 0.5 小時）
      const fished = (Math.min(trip.end_at, h + 3600) - Math.max(trip.start_at, h)) / 3600;
      if (fished <= 0) continue;
      const n = tripCatches.filter((c) => hourFloor(c.caught_at) === h).length;
      totalHours += fished;
      const cond = conditionsFor(h, byTime, tideMap.get(trip.wsid));
      if (!cond) {
        missing += fished;
        continue;
      }
      for (const f of FACTORS) {
        const b = f.bucketOf(cond);
        if (!b) continue;
        const s = acc.get(f.key)!.get(b);
        if (s) {
          s.hours += fished;
          s.catches += n;
        }
      }
    }
  }

  const total = counted.length;
  const rate = totalHours > 0 ? total / totalHours : 0;
  const factors: FactorStat[] = FACTORS.map((f) => ({
    key: f.key,
    label: f.label,
    buckets: f.buckets
      .map((label) => {
        const s = acc.get(f.key)!.get(label)!;
        const smoothed = (s.catches + SMOOTHING_HOURS * rate) / (s.hours + SMOOTHING_HOURS);
        return {
          label,
          hours: +s.hours.toFixed(2),
          catches: s.catches,
          rate: s.hours > 0 ? +(s.catches / s.hours).toFixed(3) : 0,
          score: s.hours > 0 && rate > 0 ? ratioToScore(smoothed / rate) : null,
        };
      })
      .filter((b) => b.hours > 0),
  }));

  const lengths = counted.map((c) => c.length_cm).filter((v): v is number => v != null);
  // 木蝦顏色：這個是「每隻釣獲」的屬性（同一趟可能換好幾支），所以只統計數量與平均長度，不算進每小時的條件分析
  const byColor = new Map<string, number[]>();
  for (const c of counted) {
    if (!c.egi_color) continue;
    if (!byColor.has(c.egi_color)) byColor.set(c.egi_color, []);
    if (c.length_cm != null) byColor.get(c.egi_color)!.push(c.length_cm);
  }
  const egiColors = [...byColor.keys()]
    .map((color) => {
      const ls = byColor.get(color)!;
      return {
        color,
        catches: counted.filter((c) => c.egi_color === color).length,
        avgLengthCm: ls.length ? +(ls.reduce((a, b) => a + b, 0) / ls.length).toFixed(1) : null,
      };
    })
    .sort((a, b) => b.catches - a.catches);
  return {
    ...opts,
    trips: trips.length,
    hours: +totalHours.toFixed(1),
    catches: total,
    squid: catches.filter((c) => c.species === "squid").length,
    fish: catches.filter((c) => c.species === "fish").length,
    rate: +rate.toFixed(3),
    avgLengthCm: lengths.length ? +(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : null,
    maxLengthCm: lengths.length ? Math.max(...lengths) : null,
    egiColors,
    blankTrips,
    missingWeatherHours: +missing.toFixed(1),
    factors,
  };
}

/** 未來 N 天逐小時預報，附上月相、潮汐與依歷史資料算出的分數 */
export async function forecast(db: D1Database, spotId: number, fromT: number, toT: number, history: AnalysisResult) {
  const weather = (await weatherMap(db, spotId, fromT - 3600, toT + 3600)).get(spotId) ?? new Map();
  const tides = (await loadTideEvents(db, [spotId], fromT, toT)).get(spotId) ?? [];
  const hours = [];
  for (let t = fromT; t <= toT; t += 3600) {
    const w = weather.get(t) as (WRow & Record<string, unknown>) | undefined;
    if (!w) continue;
    const cond = conditionsFor(t, weather, tides)!;
    const moon = moonAt(t + 1800);
    hours.push({
      ...w,
      tide: cond.tide,
      moon_pct: Math.round(moon.illumination * 100),
      moon_emoji: moon.emoji,
      score: history.hours >= 5 ? scoreHour(cond, history.factors, history.rate) : null,
    });
  }
  return hours;
}
