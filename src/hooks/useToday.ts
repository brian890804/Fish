import { useState } from "react";
import dayjs from "dayjs";
import { post, useApi } from "../lib/api";
import type { DayDetail, ForecastHour, ForecastResponse } from "../lib/types";
import { ADVICE } from "../lib/advice";
import { kn } from "../lib/format";
import { useStoredState } from "../lib/prefs";
import { useSpots } from "./useSpots";

/** 全站共用的物種選擇（記在這台裝置上）：評分、現在卡、較好的時段都依它顯示 */
export type SpeciesPick = "squid" | "fish";

/** 風、陣風、浪任一項是「不推薦」 */
export function isUnsafe(h: ForecastHour): boolean {
  const s = (a: (typeof ADVICE)[string], v: number | null) => (a.status && v != null ? a.status(v) : "info");
  return s(ADVICE.wind, kn(h.wind_ms)) === "bad" || s(ADVICE.gust, kn(h.gust_ms)) === "bad" || s(ADVICE.wave, h.wave_m) === "bad";
}

const REFRESH_MS = 20 * 60 * 1000;

/** 今天頁／總覽共用：預報、今日釣獲、手動更新 */
export function useToday() {
  const today = dayjs().format("YYYY-MM-DD");
  // 首頁要看哪個釣點（記在這台裝置上）；沒選或釣點被刪掉就用預設釣點
  const spots = useSpots();
  const [pickedId, setSpotId] = useStoredState<number | null>("fish.spot", null);
  const list = spots.data ?? [];
  const spot = list.find((s) => s.id === pickedId) ?? list.find((s) => s.is_default) ?? list[0] ?? null;
  const fc = useApi<ForecastResponse>(spots.data ? `/forecast?days=7${spot ? `&spot=${spot.id}` : ""}` : null, { refreshInterval: REFRESH_MS });
  const [species, setSpecies] = useStoredState<SpeciesPick>("fish.species", "squid");
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

  // 依選中的物種換成那一種的評分（後端同時給軟絲 score、魚 fish_score）
  const hours = (fc.data?.hours ?? []).map((h) => ({ ...h, score: species === "fish" ? h.fish_score : h.score }));
  const nowT = dayjs().startOf("hour").unix();
  const now = hours.find((h) => h.time === nowT);
  const endOfDay = dayjs().endOf("day").unix();
  const todayHours = hours.filter((h) => h.time >= nowT && h.time <= endOfDay);
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
    species,
    setSpecies,
    spots: list,
    spot,
    setSpotId,
    hours,
    now,
    best,
    sourceLabel,
    tripCount: day.data?.trips.length ?? 0,
    squid: catches.filter((c) => c.species === "squid").length,
    fish: catches.filter((c) => c.species === "fish").length,
  };
}
