// 風、陣風、浪的「不推薦」門檻（跟 src/lib/advice.ts 的建議區間一致），前端與推播共用
export const KNOT = 1.943844;
export const LIMITS = { windKn: 15, gustKn: 20, waveM: 1.8 } as const;

/** 風、陣風、浪任一項超過「不推薦」門檻 */
export function isUnsafeHour(h: { wind_ms: number | null; gust_ms: number | null; wave_m: number | null }): boolean {
  return (
    (h.wind_ms != null && h.wind_ms * KNOT > LIMITS.windKn) ||
    (h.gust_ms != null && h.gust_ms * KNOT > LIMITS.gustKn) ||
    (h.wave_m != null && h.wave_m > LIMITS.waveM)
  );
}
