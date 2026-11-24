import { STATUS } from "../theme";

// 現在條件每一格的說明與建議區間。
// 建議區間是岸邊路亞（餌木）釣軟絲的一般經驗值，不是從使用者資料算出來的；
// 「你的紀錄」那段則來自 /analysis 的實際統計。

export type Status = "good" | "warn" | "bad" | "info";

export interface Advice {
  /** 對應 shared/conditions.ts FACTORS 的 key，用來找使用者自己的最佳區間 */
  factorKey?: string;
  title: string;
  what: string;
  /** 建議區間文字，顯示在說明裡 */
  range?: string;
  /** 依數值判斷狀態 */
  status?: (v: number) => Status;
}

const by = (good: (v: number) => boolean, warn: (v: number) => boolean) => (v: number): Status =>
  good(v) ? "good" : warn(v) ? "warn" : "bad";

export const ADVICE: Record<string, Advice> = {
  wind: {
    factorKey: "wind",
    title: "風速",
    what: "10 公尺高的平均風速。風太大餌木線會被吹成大弧，抓不到底、也感覺不到軟絲抱餌。",
    range: "建議 10 kn 以下；10–15 kn 還能釣但要用重一點的餌木；超過 15 kn 不推薦。",
    status: by((v) => v <= 10, (v) => v <= 15),
  },
  gust: {
    title: "陣風",
    what: "短時間內最強的風。陣風比平均風速大很多時，風會忽大忽小，線很難控制，站在礁岩上也比較危險。",
    range: "建議 15 kn 以下；15–20 kn 注意；超過 20 kn 不推薦。",
    status: by((v) => v <= 15, (v) => v <= 20),
  },
  wave: {
    factorKey: "wave",
    title: "浪高 / 週期",
    what: "示性波高（大約是最高三分之一的浪的平均）。中間下方的小字是週期，週期越長，湧浪打上岸的力道越強。",
    range: "建議 1.2 m 以下；1.2–1.8 m 要注意安全、挑避風的釣點；超過 1.8 m 東北角礁岩容易被浪打，不推薦。",
    status: by((v) => v <= 1.2, (v) => v <= 1.8),
  },
  tide: {
    factorKey: "tide",
    title: "潮汐",
    what: "依模型估算的海面高度判斷漲退潮。中間的數字是相對平均海面的高度。",
    range: "一般認為漲潮到滿潮前後、潮水在流動的時段比較好；平潮（滿潮、乾潮）水不動時比較安靜。這裡只供參考，不標紅色。",
  },
  temp: {
    factorKey: "temp",
    title: "氣溫",
    what: "2 公尺高的氣溫，主要影響你自己的穿著，跟軟絲的關係不如海溫直接。",
    range: "只供參考，不標紅色。",
  },
  seaTemp: {
    factorKey: "seaTemp",
    title: "海溫",
    what: "海面水溫。軟絲是溫水性的，水溫會影響牠們靠岸和覓食的活性。",
    range: "建議 20 °C 以上；18–20 °C 活性偏低；低於 18 °C 不推薦。",
    status: by((v) => v >= 20, (v) => v >= 18),
  },
  cloud: {
    factorKey: "cloud",
    title: "雲量",
    what: "天空被雲遮住的比例。晚上雲多會讓海面更暗，跟月亮亮度一起影響夜釣時的光線。",
    range: "沒有絕對的好壞，看你自己的紀錄比較準。",
  },
  moon: {
    factorKey: "moon",
    title: "月亮亮度",
    what: "月面被照亮的比例，0% 是新月、100% 是滿月。夜釣時月光會影響水中亮度和軟絲靠岸的意願。",
    range: "很多釣友認為暗月（新月前後）比較好，但各地說法不一，看你自己的紀錄比較準。",
  },
  pressure: {
    title: "氣壓",
    what: "海平面氣壓。氣壓偏低通常代表有低壓或鋒面接近，天氣容易變差、風浪變大。",
    range: "1010 hPa 以上通常天氣穩定；1005–1010 hPa 注意天氣變化；低於 1005 hPa 不推薦。目前只顯示，沒有算進評分。",
    status: by((v) => v >= 1010, (v) => v >= 1005),
  },
};

export function statusColor(s: Status): string {
  return s === "warn" ? STATUS.warn : s === "bad" ? STATUS.bad : s === "good" ? STATUS.good : "transparent";
}

export const STATUS_LABEL: Record<Status, string> = {
  good: "適合",
  warn: "注意",
  bad: "不推薦",
  info: "",
};
