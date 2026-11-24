import { useState } from "react";
import dayjs from "dayjs";
import { useApi } from "../lib/api";
import type { Analysis } from "../lib/types";

export type Preset = "30" | "90" | "year" | "all" | "custom";
export type SpeciesFilter = "squid" | "fish" | "all";

export const PRESETS: [Preset, string][] = [
  ["30", "近 30 天"], ["90", "近 90 天"], ["year", "今年"], ["all", "全部"], ["custom", "自訂"],
];

function rangeOf(p: Preset, custom: { from: string; to: string }) {
  const today = dayjs().format("YYYY-MM-DD");
  switch (p) {
    case "30": return { from: dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: today };
    case "90": return { from: dayjs().subtract(90, "day").format("YYYY-MM-DD"), to: today };
    case "year": return { from: dayjs().startOf("year").format("YYYY-MM-DD"), to: today };
    case "all": return { from: "2000-01-01", to: "2999-12-31" };
    case "custom": return custom;
  }
}

export function useAnalysis() {
  const [preset, setPreset] = useState<Preset>("90");
  const [custom, setCustom] = useState({ from: dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: dayjs().format("YYYY-MM-DD") });
  const [species, setSpecies] = useState<SpeciesFilter>("squid");
  const r = rangeOf(preset, custom);
  const query = useApi<Analysis>(`/analysis?from=${r.from}&to=${r.to}&species=${species}`);

  // 每個條件裡表現最好、且至少釣過 2 小時的分組
  const highlights = (query.data?.factors ?? [])
    .map((f) => ({ f, best: [...f.buckets].filter((b) => b.hours >= 2 && b.score != null).sort((a, b) => b.score! - a.score!)[0] }))
    .filter((x) => x.best && x.best.score! >= 55);

  return { preset, setPreset, custom, setCustom, species, setSpecies, ...query, highlights };
}
