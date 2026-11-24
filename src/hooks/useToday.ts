import { useState } from "react";
import dayjs from "dayjs";
import { post, useApi } from "../lib/api";
import type { DayDetail, ForecastHour, ForecastResponse } from "../lib/types";
import { ADVICE } from "../lib/advice";
import { kn } from "../lib/format";

/** 風、陣風、浪任一項是「不推薦」 */
export function isUnsafe(h: ForecastHour): boolean {
  const s = (a: (typeof ADVICE)[string], v: number | null) => (a.status && v != null ? a.status(v) : "info");
  return s(ADVICE.wind, kn(h.wind_ms)) === "bad" || s(ADVICE.gust, kn(h.gust_ms)) === "bad" || s(ADVICE.wave, h.wave_m) === "bad";
}

const REFRESH_MS = 20 * 60 * 1000;

/** 今天頁／總覽共用：預報、今日釣獲、手動更新 */
export function useToday() {
  const today = dayjs().format("YYYY-MM-DD");
  const fc = useApi<ForecastResponse>("/forecast?days=7", { refreshInterval: REFRESH_MS });
  // 夜釣跨過午夜：前一天開始、還在進行的那趟也算進「今日釣獲」
  const day = useApi<DayDetail>(`/day?date=${today}&overnight=1`);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await post("/refresh", {});
      await fc.mutate();
    } finally {
      setRefreshing(false);
    }
  };

  const nowT = dayjs().startOf("hour").unix();
  const now = fc.data?.hours.find((h) => h.time === nowT);
  const endOfDay = dayjs().endOf("day").unix();
  const todayHours = fc.data?.hours.filter((h) => h.time >= nowT && h.time <= endOfDay) ?? [];
  // 較好的時段：分數要比普通好（55 以上），而且風、陣風、浪都不能是「不推薦」；沒有就是空的
  const best = [...todayHours]
    .filter((h) => (h.score ?? 0) >= 55 && !isUnsafe(h))
    .sort((a, b) => b.score! - a.score!)
    .slice(0, 3)
    .sort((a, b) => a.time - b.time);

  const catches = day.data?.trips.flatMap((t) => t.catches) ?? [];
  const sourceLabel = !fc.data?.hours.length
    ? ""
    : fc.data.hours.some((h) => h.source.includes("windguru"))
      ? "溫古魯 GFS"
      : "Open-Meteo";

  return {
    today,
    fc,
    day,
    refresh,
    refreshing,
    now,
    best,
    sourceLabel,
    tripCount: day.data?.trips.length ?? 0,
    squid: catches.filter((c) => c.species === "squid").length,
    fish: catches.filter((c) => c.species === "fish").length,
  };
}
