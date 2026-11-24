import { Box, Skeleton } from "@mui/material";
import type { Analysis, ForecastHour } from "../lib/types";
import { kn } from "../lib/format";
import { useApi } from "../lib/api";
import { ADVICE } from "../lib/advice";
import { TIDE_LABEL, dirName } from "../../shared/conditions";
import Gauge from "./Gauge";
import Arrow from "./Arrow";

// 圓環用的亮色（超出建議區間時 Gauge 會改成黃色或紅色）
const C = {
  wind: "#4dd0e1",
  gust: "#26c6da",
  wave: "#7c8cff",
  tide: "#40c4ff",
  temp: "#ffb74d",
  sea: "#4fc3f7",
  cloud: "#b0bec5",
  moon: "#ffe082",
  pressure: "#ce93d8",
};

const one = (v: number | null | undefined) => (v == null ? "-" : +v.toFixed(1));

/** 從使用者的所有軟絲紀錄，找出每個條件表現最好的區間 */
function useBestBuckets() {
  const { data } = useApi<Analysis>("/analysis?species=squid");
  const best = new Map<string, string>();
  for (const f of data?.factors ?? []) {
    const b = [...f.buckets].filter((x) => x.hours >= 2 && x.score != null).sort((a, z) => z.score! - a.score!)[0];
    if (b) best.set(f.key, `最好的是「${b.label}」：${b.catches} 隻 / ${b.hours} 小時，${b.score} 分（50 分 = 平常水準）`);
  }
  return best;
}

/** 現在這個小時的海況，每一格是一個圓環：數值越大填得越滿；滑鼠移上去或點一下看說明 */
export default function ConditionsGrid({ now, columns = 3, size }: { now?: ForecastHour; columns?: number; size?: number }) {
  const best = useBestBuckets();
  if (!now) return <Skeleton variant="rounded" height={size ? size * 3 + 120 : 360} />;
  const windKn = kn(now.wind_ms);
  const gustKn = kn(now.gust_ms);
  const b = (a: { factorKey?: string }) => (a.factorKey ? best.get(a.factorKey) ?? null : null);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 1 }}>
      <Gauge
        size={size} color={C.wind} value={windKn} min={0} max={35} unit="kn" advice={ADVICE.wind} best={b(ADVICE.wind)}
        label={<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>風 {dirName(now.wind_dir)}<Arrow deg={now.wind_dir} size={13} /></Box>}
      />
      <Gauge size={size} color={C.gust} value={gustKn} min={0} max={40} unit="kn" label="陣風" advice={ADVICE.gust} />
      <Gauge
        size={size} color={C.wave} value={now.wave_m} min={0} max={4} display={one(now.wave_m)} unit="m" label="浪高 / 週期"
        sub={now.wave_period_s ? `${Math.round(now.wave_period_s)}s` : undefined} advice={ADVICE.wave} best={b(ADVICE.wave)}
      />
      <Gauge
        size={size} color={C.tide} label="潮汐" advice={ADVICE.tide} best={b(ADVICE.tide)}
        // 海面高度約在 -1m ~ +1m 之間，越高填越滿
        value={now.sea_level_m} min={-1} max={1}
        display={now.tide ? TIDE_LABEL[now.tide] : "-"}
        unit={now.sea_level_m == null ? undefined : `${now.sea_level_m >= 0 ? "+" : ""}${now.sea_level_m.toFixed(2)}m`}
      />
      <Gauge size={size} color={C.temp} value={now.temp_c} min={0} max={40} display={one(now.temp_c)} unit="°C" label="氣溫" advice={ADVICE.temp} best={b(ADVICE.temp)} />
      <Gauge size={size} color={C.sea} value={now.sea_temp_c} min={10} max={32} display={one(now.sea_temp_c)} unit="°C" label="海溫" advice={ADVICE.seaTemp} best={b(ADVICE.seaTemp)} />
      <Gauge size={size} color={C.cloud} value={now.cloud_pct} min={0} max={100} display={now.cloud_pct == null ? "-" : Math.round(now.cloud_pct)} unit="%" label="雲量" advice={ADVICE.cloud} best={b(ADVICE.cloud)} />
      <Gauge size={size} color={C.moon} value={now.moon_pct} min={0} max={100} unit="%" label={`月亮 ${now.moon_emoji}`} advice={ADVICE.moon} best={b(ADVICE.moon)} />
      <Gauge size={size} color={C.pressure} value={now.pressure_hpa} min={990} max={1040} display={now.pressure_hpa == null ? "-" : Math.round(now.pressure_hpa)} unit="hPa" label="氣壓" advice={ADVICE.pressure} />
    </Box>
  );
}
