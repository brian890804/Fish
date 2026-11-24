// 分析：把出釣時間切成每小時，對每個條件分組算「每小時釣獲數」
import {
  FACTORS,
  SMOOTHING_HOURS,
  hourFloor,
  moonAt,
  ratioToScore,
  scoreHour,
  tideState,
  type FactorStat,
  type HourConditions,
} from "../shared/conditions";

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

export function conditionsFor(time: number, byTime: Map<number, WRow>): HourConditions | null {
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
    tide: tideState(byTime.get(time - 3600)?.sea_level_m, w.sea_level_m, byTime.get(time + 3600)?.sea_level_m),
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
  blankTrips: number;
  /** 有幾個小時找不到天氣資料（不會算進條件分組） */
  missingWeatherHours: number;
  factors: FactorStat[];
}

export async function analyze(
  db: D1Database,
  opts: { from: string; to: string; spotId: number | null; species: Species },
): Promise<AnalysisResult> {
  const tripsQ = opts.spotId
    ? db.prepare("SELECT * FROM trips WHERE date BETWEEN ? AND ? AND spot_id = ?").bind(opts.from, opts.to, opts.spotId)
    : db.prepare("SELECT * FROM trips WHERE date BETWEEN ? AND ?").bind(opts.from, opts.to);
  const { results: trips } = await tripsQ.all<{ id: number; spot_id: number; start_at: number; end_at: number }>();

  const empty: AnalysisResult = {
    ...opts, trips: 0, hours: 0, catches: 0, squid: 0, fish: 0, rate: 0,
    avgLengthCm: null, maxLengthCm: null, blankTrips: 0, missingWeatherHours: 0,
    factors: FACTORS.map((f) => ({ key: f.key, label: f.label, buckets: [] })),
  };
  if (trips.length === 0) return empty;

  const ids = trips.map((t) => t.id);
  const { results: catches } = await db
    .prepare(`SELECT * FROM catches WHERE trip_id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids)
    .all<{ trip_id: number; caught_at: number; species: "squid" | "fish"; length_cm: number | null }>();

  const counted = catches.filter((c) => opts.species === "all" || c.species === opts.species);
  const minT = Math.min(...trips.map((t) => t.start_at)) - 7200;
  const maxT = Math.max(...trips.map((t) => t.end_at)) + 7200;
  const weather = await weatherMap(db, opts.spotId, minT, maxT);

  // 每個條件分組累計：釣了幾小時、釣到幾隻
  const acc = new Map<string, Map<string, { hours: number; catches: number }>>();
  for (const f of FACTORS) acc.set(f.key, new Map(f.buckets.map((b) => [b, { hours: 0, catches: 0 }])));

  let totalHours = 0;
  let missing = 0;
  let blankTrips = 0;
  for (const trip of trips) {
    const tripCatches = counted.filter((c) => c.trip_id === trip.id);
    if (tripCatches.length === 0) blankTrips++;
    const byTime = weather.get(trip.spot_id) ?? new Map();
    for (let h = hourFloor(trip.start_at); h < trip.end_at; h += 3600) {
      // 這個小時實際有釣的比例（例如 18:30 開始，18 點那格只算 0.5 小時）
      const fished = (Math.min(trip.end_at, h + 3600) - Math.max(trip.start_at, h)) / 3600;
      if (fished <= 0) continue;
      const n = tripCatches.filter((c) => hourFloor(c.caught_at) === h).length;
      totalHours += fished;
      const cond = conditionsFor(h, byTime);
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
    blankTrips,
    missingWeatherHours: +missing.toFixed(1),
    factors,
  };
}

/** 未來 N 天逐小時預報，附上月相、潮汐與依歷史資料算出的分數 */
export async function forecast(db: D1Database, spotId: number, fromT: number, toT: number, history: AnalysisResult) {
  const weather = (await weatherMap(db, spotId, fromT - 3600, toT + 3600)).get(spotId) ?? new Map();
  const hours = [];
  for (let t = fromT; t <= toT; t += 3600) {
    const w = weather.get(t) as (WRow & Record<string, unknown>) | undefined;
    if (!w) continue;
    const cond = conditionsFor(t, weather)!;
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
