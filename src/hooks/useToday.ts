import { useState } from "react";
import dayjs from "dayjs";
import { post, useApi } from "../lib/api";
import type { DayDetail, ForecastResponse } from "../lib/types";

const REFRESH_MS = 20 * 60 * 1000;

/** 今天頁／總覽共用：預報、今日釣獲、手動更新 */
export function useToday() {
  const today = dayjs().format("YYYY-MM-DD");
  const fc = useApi<ForecastResponse>("/forecast?days=7", { refreshInterval: REFRESH_MS });
  const day = useApi<DayDetail>(`/day?date=${today}`);
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
  const best = [...todayHours].filter((h) => h.score != null).sort((a, b) => b.score! - a.score!).slice(0, 3);

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
