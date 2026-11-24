import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { ForecastHour } from "../lib/types";
import { kn, windColor, waveColor, tempColor, scoreColor } from "../lib/format";
import { TIDE_LABEL, type TideState } from "../../shared/conditions";
import { SURFACE, TEXT } from "../theme";
import Arrow from "./Arrow";

interface Row {
  label: string;
  unit?: string;
  render: (h: ForecastHour) => React.ReactNode;
  /** 有色背景的列（風、浪、溫度）用深色字 */
  bg?: (h: ForecastHour) => string;
}

const TIDE_COLOR: Record<TideState, string> = {
  rising: "#22d3ee",
  high: "#67e8f9",
  falling: TEXT.secondary,
  low: TEXT.muted,
};

const BASE_ROWS: Row[] = [
  { label: "風速", unit: "kn", render: (h) => kn(h.wind_ms) ?? "-", bg: (h) => windColor(kn(h.wind_ms)) },
  { label: "陣風", unit: "kn", render: (h) => kn(h.gust_ms) ?? "-", bg: (h) => windColor(kn(h.gust_ms)) },
  { label: "風向", render: (h) => <Arrow deg={h.wind_dir} size={19} color={TEXT.primary} /> },
  { label: "浪高", unit: "m", render: (h) => (h.wave_m == null ? "-" : h.wave_m.toFixed(1)), bg: (h) => waveColor(h.wave_m) },
  { label: "週期", unit: "s", render: (h) => (h.wave_period_s == null ? "-" : Math.round(h.wave_period_s)) },
  { label: "浪向", render: (h) => <Arrow deg={h.wave_dir} size={19} color={TEXT.primary} /> },
  { label: "氣溫", unit: "°C", render: (h) => (h.temp_c == null ? "-" : Math.round(h.temp_c)), bg: (h) => tempColor(h.temp_c) },
  {
    label: "雲量", unit: "%", render: (h) => (h.cloud_pct == null ? "-" : Math.round(h.cloud_pct)),
    bg: (h) => `rgba(148,163,184,${((h.cloud_pct ?? 0) / 100) * 0.55})`,
  },
  {
    label: "降雨", unit: "mm", render: (h) => (h.precip_mm ? h.precip_mm.toFixed(1) : ""),
    bg: (h) => (h.precip_mm ? `rgba(96,165,250,${0.25 + Math.min(0.7, h.precip_mm / 3)})` : "transparent"),
  },
  {
    label: "潮汐",
    render: (h) => (h.tide ? <Box component="span" sx={{ color: TIDE_COLOR[h.tide] }}>{TIDE_LABEL[h.tide]}</Box> : "-"),
  },
  {
    label: "月亮", unit: "%", render: (h) => h.moon_pct,
    bg: (h) => `rgba(253,230,138,${(h.moon_pct / 100) * 0.35})`,
  },
];

const SCORE_ROW: Row = {
  label: "評分", render: (h) => h.score ?? "-", bg: (h) => (h.score == null ? "transparent" : scoreColor(h.score)),
};

/** 依背景亮度選字色：淺底用深字、深底用白字，確保在手機上看得清楚 */
function textOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return TEXT.primary;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0b1520" : "#ffffff";
}

const LABEL_W = 56;
const HEAD_H = 42;

export default function ForecastTable({ hours, step = 2, cellWidth = 42, rowHeight = 32 }: { hours: ForecastHour[]; step?: number; cellWidth?: number; rowHeight?: number }) {
  const nowHour = dayjs().startOf("hour").unix();
  const cols = hours.filter((h) => h.time >= nowHour - 3600 * (step - 1) && dayjs.unix(h.time).hour() % step === 0);
  if (cols.length === 0) return <Typography color="text.secondary" sx={{ px: 2 }}>還沒有預報資料</Typography>;

  // 還沒有評分資料時，整列都是「-」，乾脆不顯示
  const rows = cols.some((h) => h.score != null) ? [SCORE_ROW, ...BASE_ROWS] : BASE_ROWS;

  const cell = {
    width: cellWidth, minWidth: cellWidth, height: rowHeight, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13.5, fontWeight: 700, boxShadow: `inset -1px 0 0 ${SURFACE.base}`,
  } as const;
  // 沒有底色的列交錯淡淡的條紋，比較好對齊
  const zebra = (i: number) => (i % 2 === 1 ? "rgba(148,163,184,0.05)" : "transparent");

  return (
    <Box sx={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", borderTop: 1, borderBottom: 1, borderColor: "divider", scrollbarWidth: "thin" }}>
      {/* 固定的左側標籤欄 */}
      <Box sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: SURFACE.raised, boxShadow: `1px 0 0 ${SURFACE.hairlineStrong}, 6px 0 12px -6px rgba(0,0,0,0.6)` }}>
        <Box sx={{ ...cell, width: LABEL_W, minWidth: LABEL_W, height: HEAD_H, boxShadow: "none" }} />
        {rows.map((r, i) => (
          <Box
            key={r.label}
            sx={{
              ...cell, width: LABEL_W, minWidth: LABEL_W, boxShadow: "none", flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
              pl: 1.25, lineHeight: 1.05, bgcolor: zebra(i),
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT.primary }}>{r.label}</span>
            {r.unit && <span style={{ fontSize: 10, fontWeight: 600, color: TEXT.muted }}>{r.unit}</span>}
          </Box>
        ))}
      </Box>

      {cols.map((h, ci) => {
        const d = dayjs.unix(h.time);
        const newDay = ci === 0 || d.hour() < step;
        const isNow = h.time <= nowHour && nowHour < h.time + step * 3600;
        return (
          <Box
            key={h.time}
            sx={{
              position: "relative",
              borderLeft: newDay && ci > 0 ? `2px solid ${SURFACE.hairlineStrong}` : undefined,
              // 目前時段加外框
              "&::after": isNow ? { content: '""', position: "absolute", inset: 0, border: "2px solid", borderColor: "primary.main", borderRadius: 1, pointerEvents: "none" } : undefined,
            }}
          >
            <Box sx={{ ...cell, height: HEAD_H, flexDirection: "column", lineHeight: 1.15, bgcolor: SURFACE.raised, boxShadow: "none" }}>
              {/* 每天第一格顯示日期，例如 11/24；底下一律顯示小時，例如 14h */}
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "-0.02em", whiteSpace: "nowrap", color: newDay ? "#5cc8ff" : "transparent" }}>
                {newDay ? d.format("M/D") : "·"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: isNow ? "#5cc8ff" : TEXT.primary }}>{d.format("HH")}h</span>
            </Box>
            {rows.map((r, ri) => {
              const bg = r.bg?.(h);
              const solid = bg && bg !== "transparent" && !bg.startsWith("rgba");
              return (
                <Box key={r.label} sx={{ ...cell, bgcolor: bg && bg !== "transparent" ? bg : zebra(ri), color: solid ? textOn(bg!) : TEXT.primary }}>
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
