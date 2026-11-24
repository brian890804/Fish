import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { ForecastHour } from "../lib/types";
import { kn, scoreColor, windColor, waveColor, weekday } from "../lib/format";
import { dirName16 } from "../../shared/conditions";
import Arrow from "./Arrow";

/** 未來 7 天每天一張小卡：最佳評分、風、浪、月亮 */
export default function DailyOutlook({ hours }: { hours: ForecastHour[] }) {
  const days = new Map<string, ForecastHour[]>();
  for (const h of hours) {
    const k = dayjs.unix(h.time).format("YYYY-MM-DD");
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(h);
  }
  const today = dayjs().format("YYYY-MM-DD");

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1.5 }}>
      {[...days.entries()].slice(0, 7).map(([date, hs]) => {
        const scored = hs.filter((h) => h.score != null);
        const best = scored.sort((a, b) => b.score! - a.score!)[0];
        const winds = hs.map((h) => kn(h.wind_ms) ?? 0);
        const waves = hs.map((h) => h.wave_m).filter((v): v is number => v != null);
        const maxWind = Math.max(...winds);
        const minWave = waves.length ? Math.min(...waves) : null;
        const maxWave = waves.length ? Math.max(...waves) : null;
        const mid = hs.find((h) => dayjs.unix(h.time).hour() === 20) ?? hs[Math.floor(hs.length / 2)];
        const isToday = date === today;
        return (
          <Box
            key={date}
            sx={{
              borderRadius: 3, p: 1.5, display: "flex", flexDirection: "column", gap: 1, alignItems: "center",
              bgcolor: isToday ? "rgba(79,195,247,0.10)" : "rgba(255,255,255,0.03)",
              border: 1, borderColor: isToday ? "primary.main" : "divider",
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>{isToday ? "今天" : `週${weekday(hs[0].time)}`}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>{dayjs(date).format("M/D")}</Typography>
            <Box sx={{ width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: 3, borderColor: scoreColor(best?.score ?? null) }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{best?.score ?? "-"}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">{best ? `最佳 ${dayjs.unix(best.time).format("HH:mm")}` : "尚無評分"}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, borderRadius: 1, bgcolor: windColor(maxWind), color: "#0b1520" }}>
              <Arrow deg={mid?.wind_dir ?? null} size={14} />
              <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{dirName16(mid?.wind_dir)} ≤{maxWind}kn</Typography>
            </Box>
            <Box sx={{ px: 1, borderRadius: 1, bgcolor: waveColor(maxWave), color: "#0b1520" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                浪 {minWave == null ? "-" : `${minWave.toFixed(1)}–${maxWave!.toFixed(1)}m`}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13 }}>{mid?.moon_emoji} {mid?.moon_pct}%</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
