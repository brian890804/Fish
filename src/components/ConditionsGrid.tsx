import { Box, Skeleton, Typography } from "@mui/material";
import type { ForecastHour } from "../lib/types";
import { kn, fmt1 } from "../lib/format";
import { TIDE_LABEL, dirName } from "../../shared/conditions";
import StatTile from "./StatTile";
import Arrow from "./Arrow";

/** 現在這個小時的海況 */
export default function ConditionsGrid({ now, columns = 3, big = false }: { now?: ForecastHour; columns?: number; big?: boolean }) {
  if (!now) return <Skeleton variant="rounded" height={big ? 180 : 120} />;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 1 }}>
      <StatTile big={big} label={`風 ${dirName(now.wind_dir)}`} value={`${kn(now.wind_ms)} kn`} extra={<Arrow deg={now.wind_dir} size={16} />} />
      <StatTile big={big} label="陣風" value={`${kn(now.gust_ms)} kn`} />
      <StatTile big={big} label="浪高 / 週期" value={`${fmt1(now.wave_m)}m`} extra={<Typography variant="caption">{fmt1(now.wave_period_s)}s</Typography>} />
      <StatTile big={big} label="潮汐" value={now.tide ? TIDE_LABEL[now.tide] : "-"} />
      <StatTile big={big} label="氣溫" value={fmt1(now.temp_c, "°")} />
      <StatTile big={big} label="海溫" value={fmt1(now.sea_temp_c, "°")} />
      <StatTile big={big} label="雲量" value={now.cloud_pct == null ? "-" : `${Math.round(now.cloud_pct)}%`} />
      <StatTile big={big} label="月亮" value={`${now.moon_emoji} ${now.moon_pct}%`} />
      <StatTile big={big} label="氣壓" value={now.pressure_hpa == null ? "-" : Math.round(now.pressure_hpa)} />
    </Box>
  );
}
