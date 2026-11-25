// 前端與 Worker 共用：時間換算、月相、潮汐判斷、分析用的條件分組
import SunCalc from "suncalc";

export const TW_OFFSET = 8 * 3600;

/** unix 秒 → 台灣日期 YYYY-MM-DD */
export function twDate(t: number): string {
  return new Date((t + TW_OFFSET) * 1000).toISOString().slice(0, 10);
}

/** unix 秒 → 台灣時間的小時 0-23 */
export function twHour(t: number): number {
  return new Date((t + TW_OFFSET) * 1000).getUTCHours();
}

/** 台灣日期 YYYY-MM-DD 00:00 → unix 秒 */
export function twDayStart(date: string): number {
  return Date.parse(`${date}T00:00:00+08:00`) / 1000;
}

export function hourFloor(t: number): number {
  return Math.floor(t / 3600) * 3600;
}

export interface MoonInfo {
  /** 月面被照亮的比例 0-1 */
  illumination: number;
  /** 月相 0=新月 0.25=上弦 0.5=滿月 0.75=下弦 */
  phase: number;
  name: string;
  emoji: string;
}

export function moonAt(t: number): MoonInfo {
  const m = SunCalc.getMoonIllumination(new Date(t * 1000));
  const p = m.phase;
  const idx = Math.round(p * 8) % 8;
  const names = ["新月", "眉月", "上弦月", "盈凸月", "滿月", "虧凸月", "下弦月", "殘月"];
  const emojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  return { illumination: m.fraction, phase: p, name: names[idx], emoji: emojis[idx] };
}

export type TideState = "rising" | "falling" | "high" | "low";

export const TIDE_LABEL: Record<TideState, string> = {
  rising: "漲潮",
  falling: "退潮",
  high: "滿潮",
  low: "乾潮",
};

/**
 * 用前後一小時的海面高度判斷潮汐狀態。
 * 變化很小時視為平潮，再依前後趨勢判斷是滿潮還是乾潮。
 */
export function tideState(
  prev: number | null | undefined,
  cur: number | null | undefined,
  next: number | null | undefined,
): TideState | null {
  if (cur == null) return null;
  const before = prev ?? cur;
  const after = next ?? cur;
  const diff = after - before;
  if (Math.abs(diff) < 0.06) {
    // 轉折點附近：比前後都高是滿潮，比前後都低是乾潮
    if (cur >= before && cur >= after) return "high";
    if (cur <= before && cur <= after) return "low";
  }
  return diff >= 0 ? "rising" : "falling";
}

/**
 * 大潮／中潮／小潮：依月相判斷。新月、滿月前後約 2.5 天是大潮，上弦、下弦前後約 2 天是小潮，其他是中潮。
 * （實際潮差另外用氣象署的滿／乾潮高度算）
 */
export function tideRangeClass(t: number): "大潮" | "中潮" | "小潮" {
  const p = moonAt(t).phase;
  const toSyzygy = Math.min(p, Math.abs(p - 0.5), 1 - p) * 29.53;
  const toQuarter = Math.min(Math.abs(p - 0.25), Math.abs(p - 0.75)) * 29.53;
  if (toSyzygy <= 2.5) return "大潮";
  if (toQuarter <= 2) return "小潮";
  return "中潮";
}

export interface TideEvent {
  time: number;
  type: "high" | "low";
  height_cm?: number | null;
}

/** 滿潮／乾潮前後幾分鐘內算「平潮」 */
export const SLACK_MINUTES = 40;

/**
 * 用氣象署的滿潮／乾潮時間判斷某個時間點的潮汐狀態。
 * events 要依時間排序；前後找不到事件（或間隔不合理）時回傳 null，呼叫端改用模型備援。
 */
export function tideFromEvents(t: number, events: TideEvent[]): TideState | null {
  let prev: TideEvent | undefined;
  let next: TideEvent | undefined;
  for (const e of events) {
    if (e.time <= t) prev = e;
    else {
      next = e;
      break;
    }
  }
  if (!prev || !next || next.time - prev.time > 9 * 3600) return null;
  const slack = SLACK_MINUTES * 60;
  if (t - prev.time <= slack) return prev.type;
  if (next.time - t <= slack) return next.type;
  return prev.type === "low" ? "rising" : "falling";
}

const DIRS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
const DIRS16 = ["北", "北北東", "東北", "東北東", "東", "東南東", "東南", "南南東", "南", "南南西", "西南", "西南西", "西", "西北西", "西北", "北北西"];

/** 16 方位（畫面顯示用，每個方位 22.5°）。分析分組仍用 8 方位，避免每組樣本太少 */
export function dirName16(deg: number | null | undefined): string {
  if (deg == null) return "-";
  return DIRS16[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** 角度的平均（風向不能直接算數平均，350° 和 10° 平均要是 0° 不是 180°） */
export function meanDirection(degs: (number | null | undefined)[]): number | null {
  const v = degs.filter((d): d is number => d != null);
  if (v.length === 0) return null;
  const x = v.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
  const y = v.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

/** 8 方位（分析分組用） */
export function dirName(deg: number | null | undefined): string {
  if (deg == null) return "-";
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** 分析時每個小時的條件 */
export interface HourConditions {
  time: number;
  temp_c: number | null;
  wind_ms: number | null;
  wind_dir: number | null;
  cloud_pct: number | null;
  precip_mm: number | null;
  wave_m: number | null;
  swell_m: number | null;
  sea_temp_c: number | null;
  tide: TideState | null;
  moon: number; // 照亮比例 0-1
}

export interface Factor {
  key: string;
  label: string;
  buckets: string[];
  bucketOf: (c: HourConditions) => string | null;
}

function range(v: number | null, edges: number[], labels: string[]): string | null {
  if (v == null) return null;
  for (let i = 0; i < edges.length; i++) if (v < edges[i]) return labels[i];
  return labels[labels.length - 1];
}

export const FACTORS: Factor[] = [
  {
    key: "wave",
    label: "浪高",
    buckets: ["< 0.5m", "0.5-1m", "1-1.5m", "1.5-2m", "> 2m"],
    bucketOf: (c) => range(c.wave_m, [0.5, 1, 1.5, 2], ["< 0.5m", "0.5-1m", "1-1.5m", "1.5-2m", "> 2m"]),
  },
  {
    key: "tide",
    label: "潮汐",
    buckets: ["漲潮", "滿潮", "退潮", "乾潮"],
    bucketOf: (c) => (c.tide ? TIDE_LABEL[c.tide] : null),
  },
  {
    key: "moon",
    label: "月亮亮度",
    buckets: ["暗 0-15%", "15-50%", "50-85%", "亮 85%+"],
    bucketOf: (c) => range(c.moon * 100, [15, 50, 85], ["暗 0-15%", "15-50%", "50-85%", "亮 85%+"]),
  },
  {
    key: "windDir",
    label: "風向",
    buckets: DIRS,
    bucketOf: (c) => (c.wind_dir == null ? null : dirName(c.wind_dir)),
  },
  {
    key: "wind",
    label: "風速",
    buckets: ["< 6 kn", "6-12 kn", "12-18 kn", "> 18 kn"],
    bucketOf: (c) =>
      range(c.wind_ms == null ? null : c.wind_ms * 1.943844, [6, 12, 18], ["< 6 kn", "6-12 kn", "12-18 kn", "> 18 kn"]),
  },
  {
    key: "cloud",
    label: "雲量",
    buckets: ["晴 <25%", "25-60%", "60-90%", "陰 90%+"],
    bucketOf: (c) => range(c.cloud_pct, [25, 60, 90], ["晴 <25%", "25-60%", "60-90%", "陰 90%+"]),
  },
  {
    key: "timeOfDay",
    label: "時段",
    buckets: ["清晨 3-7", "白天 7-17", "傍晚 17-19", "前夜 19-23", "深夜 23-3"],
    bucketOf: (c) => {
      const h = twHour(c.time);
      if (h >= 3 && h < 7) return "清晨 3-7";
      if (h >= 7 && h < 17) return "白天 7-17";
      if (h >= 17 && h < 19) return "傍晚 17-19";
      if (h >= 19 && h < 23) return "前夜 19-23";
      return "深夜 23-3";
    },
  },
  {
    key: "temp",
    label: "氣溫",
    buckets: ["< 18°C", "18-22°C", "22-26°C", "> 26°C"],
    bucketOf: (c) => range(c.temp_c, [18, 22, 26], ["< 18°C", "18-22°C", "22-26°C", "> 26°C"]),
  },
  {
    key: "seaTemp",
    label: "海溫",
    buckets: ["< 20°C", "20-23°C", "23-26°C", "> 26°C"],
    bucketOf: (c) => range(c.sea_temp_c, [20, 23, 26], ["< 20°C", "20-23°C", "23-26°C", "> 26°C"]),
  },
  {
    key: "rain",
    label: "降雨",
    buckets: ["無雨", "有雨"],
    bucketOf: (c) => (c.precip_mm == null ? null : c.precip_mm >= 0.2 ? "有雨" : "無雨"),
  },
];

export interface BucketStat {
  label: string;
  hours: number;
  catches: number;
  /** 每小時釣獲數 */
  rate: number;
  /** 0-100，50 = 跟平均一樣 */
  score: number | null;
}

export interface FactorStat {
  key: string;
  label: string;
  buckets: BucketStat[];
}

/** 樣本少時往平均值拉（單位：小時），避免只去過一次就變 100 分 */
export const SMOOTHING_HOURS = 3;

export function ratioToScore(ratio: number): number {
  return Math.round((100 * ratio) / (1 + ratio));
}

/** 用各條件的歷史表現替某個小時打分，回傳 0-100；資料不足回傳 null */
export function scoreHour(c: HourConditions, factors: FactorStat[], overallRate: number): number | null {
  if (overallRate <= 0) return null;
  let logSum = 0;
  let n = 0;
  for (const f of FACTORS) {
    const stat = factors.find((s) => s.key === f.key);
    const b = f.bucketOf(c);
    if (!stat || !b) continue;
    const bs = stat.buckets.find((x) => x.label === b);
    const hours = bs?.hours ?? 0;
    const catches = bs?.catches ?? 0;
    const smoothed = (catches + SMOOTHING_HOURS * overallRate) / (hours + SMOOTHING_HOURS);
    logSum += Math.log(Math.max(smoothed, 1e-3) / overallRate);
    n++;
  }
  if (n === 0) return null;
  return ratioToScore(Math.exp(logSum / n));
}

// ---------------- 一般經驗（先驗）評分 ----------------
// 還沒有足夠的個人紀錄時，用一般經驗打分；軟絲與魚各一套（時段、浪的偏好不同）。
// 個人紀錄越多，越以個人紀錄為主（見 blendedScore）。

/** 個人紀錄要累積多少小時，權重才跟一般經驗各半 */
export const PRIOR_HOURS = 10;

export type PriorSpecies = "squid" | "fish";

/** 每個條件的倍率：>1 比平常好、<1 比平常差 */
function priorRatios(c: HourConditions, species: PriorSpecies = "squid"): number[] {
  if (species === "fish") return fishPriorRatios(c);
  // 岸邊餌木釣軟絲
  const r: number[] = [];
  const windKn = c.wind_ms == null ? null : c.wind_ms * 1.943844;
  if (windKn != null) r.push(windKn <= 8 ? 1.3 : windKn <= 12 ? 1.1 : windKn <= 15 ? 0.8 : windKn <= 20 ? 0.45 : 0.25);
  if (c.wave_m != null) r.push(c.wave_m < 0.3 ? 0.9 : c.wave_m <= 1.0 ? 1.25 : c.wave_m <= 1.5 ? 0.95 : c.wave_m <= 2 ? 0.55 : 0.3);
  const h = twHour(c.time);
  // 傍晚到前半夜最好，清晨次之，白天最差
  r.push(h >= 17 && h <= 22 ? 1.5 : h >= 3 && h <= 6 ? 1.2 : h >= 23 || h <= 2 ? 1.15 : h === 16 ? 1.0 : 0.6);
  if (c.tide) r.push({ rising: 1.25, high: 1.15, falling: 0.95, low: 0.8 }[c.tide]);
  if (c.precip_mm != null) r.push(c.precip_mm >= 2 ? 0.7 : c.precip_mm >= 0.5 ? 0.9 : 1);
  if (c.sea_temp_c != null) r.push(c.sea_temp_c < 18 ? 0.6 : c.sea_temp_c < 20 ? 0.85 : 1.05);
  return r;
}

/**
 * 岸邊／磯釣釣魚的一般經驗（還沒有魚的紀錄時用）：
 * - 時段：清晨到上午最好，傍晚次之，半夜與正中午較差（跟軟絲相反，軟絲是傍晚到前半夜）。
 * - 浪：有一點白浪（0.5–1.5 m）魚比較敢靠岸覓食；太平靜略差，超過 2 m 危險也難釣。
 * - 風、雨、海溫、潮汐的方向跟軟絲差不多，但影響稍小。
 * 這些是一般經驗值，累積自己的魚紀錄後會逐漸以紀錄為主。
 */
function fishPriorRatios(c: HourConditions): number[] {
  const r: number[] = [];
  const windKn = c.wind_ms == null ? null : c.wind_ms * 1.943844;
  if (windKn != null) r.push(windKn <= 10 ? 1.15 : windKn <= 15 ? 0.9 : windKn <= 20 ? 0.5 : 0.25);
  if (c.wave_m != null) r.push(c.wave_m < 0.3 ? 0.85 : c.wave_m < 0.5 ? 1.0 : c.wave_m <= 1.5 ? 1.25 : c.wave_m <= 2 ? 0.7 : 0.3);
  const h = twHour(c.time);
  r.push(h >= 5 && h <= 8 ? 1.5 : h >= 9 && h <= 10 ? 1.2 : h >= 15 && h <= 18 ? 1.2 : h >= 11 && h <= 14 ? 0.75 : h >= 19 && h <= 22 ? 0.85 : 0.65);
  if (c.tide) r.push({ rising: 1.2, high: 1.15, falling: 1.0, low: 0.85 }[c.tide]);
  if (c.precip_mm != null) r.push(c.precip_mm >= 2 ? 0.75 : 1);
  if (c.sea_temp_c != null) r.push(c.sea_temp_c < 17 ? 0.7 : c.sea_temp_c < 19 ? 0.9 : 1.05);
  return r;
}

/** 只用一般經驗的分數（0–100，50 = 普通） */
export function priorScore(c: HourConditions, species: PriorSpecies = "squid"): number {
  const product = priorRatios(c, species).reduce((a, b) => a * b, 1);
  return ratioToScore(Math.pow(product, 0.6));
}

/** 個人紀錄占的權重（0–1） */
export const personalWeight = (historyHours: number) => historyHours / (historyHours + PRIOR_HOURS);

/** 一般經驗與個人紀錄混合後的分數 */
export function blendedScore(c: HourConditions, factors: FactorStat[], overallRate: number, historyHours: number, species: PriorSpecies = "squid"): number {
  const prior = priorScore(c, species);
  const personal = historyHours > 0 ? scoreHour(c, factors, overallRate) : null;
  if (personal == null) return prior;
  const w = personalWeight(historyHours);
  return Math.round((1 - w) * prior + w * personal);
}
