import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { ForecastHour } from "../lib/types";
import { kn, windColor, waveColor, tempColor, scoreColor } from "../lib/format";
import { TIDE_LABEL } from "../../shared/conditions";
import Arrow from "./Arrow";

interface Row {
  label: string;
  render: (h: ForecastHour) => React.ReactNode;
  bg?: (h: ForecastHour) => string;
  dark?: boolean;
}

const ROWS: Row[] = [
  { label: "評分", render: (h) => h.score ?? "-", bg: (h) => (h.score == null ? "transparent" : scoreColor(h.score)), dark: true },
  { label: "風速 kn", render: (h) => kn(h.wind_ms) ?? "-", bg: (h) => windColor(kn(h.wind_ms)), dark: true },
  { label: "陣風 kn", render: (h) => kn(h.gust_ms) ?? "-", bg: (h) => windColor(kn(h.gust_ms)), dark: true },
  { label: "風向", render: (h) => <Arrow deg={h.wind_dir} /> },
  { label: "浪高 m", render: (h) => (h.wave_m == null ? "-" : h.wave_m.toFixed(1)), bg: (h) => waveColor(h.wave_m), dark: true },
  { label: "週期 s", render: (h) => (h.wave_period_s == null ? "-" : Math.round(h.wave_period_s)) },
  { label: "浪向", render: (h) => <Arrow deg={h.wave_dir} /> },
  { label: "氣溫 °C", render: (h) => (h.temp_c == null ? "-" : Math.round(h.temp_c)), bg: (h) => tempColor(h.temp_c), dark: true },
  { label: "雲量 %", render: (h) => (h.cloud_pct == null ? "-" : Math.round(h.cloud_pct)), bg: (h) => `rgba(160,170,185,${(h.cloud_pct ?? 0) / 110})` },
  { label: "雨 mm", render: (h) => (h.precip_mm ? h.precip_mm.toFixed(1) : ""), bg: (h) => (h.precip_mm ? `rgba(80,140,255,${Math.min(1, h.precip_mm / 3)})` : "transparent") },
  { label: "潮汐", render: (h) => (h.tide ? TIDE_LABEL[h.tide] : "-") },
  { label: "月亮", render: (h) => `${h.moon_pct}` },
];

const LABEL_W = 62;

export default function ForecastTable({ hours, step = 2, cellWidth = 34, rowHeight = 24 }: { hours: ForecastHour[]; step?: number; cellWidth?: number; rowHeight?: number }) {
  const CELL_W = cellWidth;
  const nowHour = dayjs().startOf("hour").unix();
  const cols = hours.filter((h) => h.time >= nowHour - 3600 * (step - 1) && dayjs.unix(h.time).hour() % step === 0);
  if (cols.length === 0) return <Typography color="text.secondary">還沒有預報資料</Typography>;

  const cell = {
    width: CELL_W, minWidth: CELL_W, height: rowHeight, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 600, borderRight: "1px solid rgba(0,0,0,0.25)",
  } as const;

  return (
    <Box sx={{ display: "flex", overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2, WebkitOverflowScrolling: "touch" }}>
      {/* 固定的左側標籤欄 */}
      <Box sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
        <Box sx={{ ...cell, width: LABEL_W, minWidth: LABEL_W, height: 40 }} />
        {ROWS.map((r) => (
          <Box key={r.label} sx={{ ...cell, width: LABEL_W, minWidth: LABEL_W, justifyContent: "flex-start", pl: 1, fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
            {r.label}
          </Box>
        ))}
      </Box>
      {cols.map((h, i) => {
        const d = dayjs.unix(h.time);
        const newDay = i === 0 || d.hour() < step;
        return (
          <Box key={h.time} sx={{ borderLeft: newDay && i > 0 ? "2px solid rgba(255,255,255,0.35)" : undefined }}>
            <Box sx={{ ...cell, height: 40, flexDirection: "column", lineHeight: 1.1, fontSize: 11, bgcolor: "rgba(255,255,255,0.04)" }}>
              {/* 每天第一格顯示日期，例如 11/24；底下一律顯示小時，例如 14h */}
              <span style={{ fontWeight: 800, fontSize: 10.5, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{newDay ? d.format("M/D") : " "}</span>
              <span>{d.format("HH")}h</span>
            </Box>
            {ROWS.map((r) => {
              const bg = r.bg?.(h) ?? "transparent";
              return (
                <Box key={r.label} sx={{ ...cell, bgcolor: bg, color: r.dark && bg !== "transparent" ? "#0b1520" : "text.primary" }}>
                  {r.render(h)}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
