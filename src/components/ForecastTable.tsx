import { Box, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import dayjs from "dayjs";
import type { ForecastHour, ForecastResponse } from "../lib/types";
import { kn, windColor, waveColor, tempColor, scoreColor } from "../lib/format";
import { tideRangeClass, type TideState } from "../../shared/conditions";
import { SURFACE, TEXT } from "../theme";
import Arrow from "./Arrow";
import InfoPopover from "./InfoPopover";

type TideEvt = ForecastResponse["tideEvents"][number];

interface Ctx {
  /** 這一格涵蓋的時間 [from, to) */
  from: number;
  to: number;
  /** 是不是當天第一格 */
  newDay: boolean;
  tideEvents: TideEvt[];
}

interface Row {
  key: string;
  label: React.ReactNode;
  unit?: string;
  render: (h: ForecastHour, c: Ctx) => React.ReactNode;
  /** 底色：實色（#rrggbb）會依亮度自動選字色 */
  bg?: (h: ForecastHour, c: Ctx) => string | undefined;
  /** 兩行內容（徽章＋時間）的列，高一點 */
  tall?: boolean;
}

// 潮汐：漲潮、退潮用不同底色；滿潮、乾潮另外用徽章標出時間
const TIDE_STYLE: Record<TideState, { text: string; color: string; bg: string }> = {
  rising: { text: "漲↑", color: "#67e8f9", bg: "rgba(34,211,238,0.16)" },
  high: { text: "滿", color: "#06121c", bg: "#67e8f9" },
  falling: { text: "退↓", color: "#cbd5e1", bg: "rgba(148,163,184,0.14)" },
  low: { text: "乾", color: "#e2e8f0", bg: "#475569" },
};

/** 這一格裡有沒有滿潮或乾潮 */
const eventIn = (c: Ctx) => c.tideEvents.find((e) => e.time >= c.from && e.time < c.to);

/** 某一天的潮差（cm）：當天最高滿潮減最低乾潮 */
function dayRangeCm(dayStart: number, events: TideEvt[]): number | null {
  const evs = events.filter((e) => e.time >= dayStart && e.time < dayStart + 86400 && e.height_cm != null);
  const highs = evs.filter((e) => e.type === "high").map((e) => e.height_cm!);
  const lows = evs.filter((e) => e.type === "low").map((e) => e.height_cm!);
  if (!highs.length || !lows.length) return null;
  return Math.round(Math.max(...highs) - Math.min(...lows));
}

const SCORE_INFO = (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 0.5 }}>
    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>評分怎麼算</Typography>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
      0–100 分，<b>50 分是普通</b>。綠色越好、紅色越差。
    </Typography>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
      <b>一般經驗</b>：風浪在建議區間內、傍晚到前半夜、漲潮或滿潮前後、沒有大雨、海溫夠高會加分；風浪大、白天、乾潮會扣分。
    </Typography>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
      <b>你的紀錄</b>：比對你過去在什麼條件下釣得比較好。紀錄越多，越以你的紀錄為主（10 小時約各半、30 小時約 75% 看你的紀錄）。
    </Typography>
  </Box>
);

const TIDE_INFO = (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, p: 0.5 }}>
    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>潮汐與潮差</Typography>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
      資料來自<b>中央氣象署潮汐預報</b>（新北市瑞芳區）。「漲↑」「退↓」是當時的趨勢；<b>滿／乾</b>徽章下方是滿潮、乾潮的時間。
    </Typography>
    <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>
      <b>潮差</b>是當天最高滿潮減最低乾潮的高度差。新月、滿月前後是<b>大潮</b>（潮差大、水流強），上下弦前後是<b>小潮</b>（潮差小），其他是中潮。
    </Typography>
  </Box>
);

const InfoLabel = ({ text, info, label }: { text: string; info: React.ReactNode; label: string }) => (
  <InfoPopover label={label} content={info}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, px: 0.25 }}>
      <span>{text}</span>
      <InfoIcon className="info" sx={{ fontSize: 12, color: TEXT.muted }} />
    </Box>
  </InfoPopover>
);

const ROWS: Row[] = [
  {
    key: "score", label: <InfoLabel text="軟絲" info={SCORE_INFO} label="評分說明" />,
    render: (h) => h.score ?? "-", bg: (h) => (h.score == null ? undefined : scoreColor(h.score)),
  },
  // 魚的評分只用魚的紀錄算（魚多半早上釣，跟軟絲的時段不同）
  {
    key: "fish_score", label: "魚",
    render: (h) => h.fish_score ?? "-", bg: (h) => (h.fish_score == null ? undefined : scoreColor(h.fish_score)),
  },
  { key: "wind", label: "風速", unit: "kn", render: (h) => kn(h.wind_ms) ?? "-", bg: (h) => windColor(kn(h.wind_ms)) },
  { key: "gust", label: "陣風", unit: "kn", render: (h) => kn(h.gust_ms) ?? "-", bg: (h) => windColor(kn(h.gust_ms)) },
  { key: "wdir", label: "風向", render: (h) => <Arrow deg={h.wind_dir} size={19} color={TEXT.primary} /> },
  { key: "wave", label: "浪高", unit: "m", render: (h) => (h.wave_m == null ? "-" : h.wave_m.toFixed(1)), bg: (h) => waveColor(h.wave_m) },
  { key: "period", label: "週期", unit: "s", render: (h) => (h.wave_period_s == null ? "-" : Math.round(h.wave_period_s)) },
  { key: "vdir", label: "浪向", render: (h) => <Arrow deg={h.wave_dir} size={19} color={TEXT.primary} /> },
  { key: "temp", label: "氣溫", unit: "°C", render: (h) => (h.temp_c == null ? "-" : Math.round(h.temp_c)), bg: (h) => tempColor(h.temp_c) },
  {
    key: "cloud", label: "雲量", unit: "%", render: (h) => (h.cloud_pct == null ? "-" : Math.round(h.cloud_pct)),
    bg: (h) => `rgba(148,163,184,${((h.cloud_pct ?? 0) / 100) * 0.55})`,
  },
  {
    key: "rain", label: "降雨", unit: "mm", render: (h) => (h.precip_mm ? h.precip_mm.toFixed(1) : ""),
    bg: (h) => (h.precip_mm ? `rgba(96,165,250,${0.25 + Math.min(0.7, h.precip_mm / 3)})` : undefined),
  },
  {
    key: "tide", label: <InfoLabel text="潮汐" info={TIDE_INFO} label="潮汐說明" />, tall: true,
    // 只有滿潮、乾潮的那一格寫時間；漲潮、退潮用底色區分，不寫字
    render: (_h, c) => {
      const e = eventIn(c);
      if (!e) return null;
      const color = e.type === "high" ? "#67e8f9" : "#cbd5e1";
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", lineHeight: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color }}>{e.type === "high" ? "滿" : "乾"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: TEXT.primary }}>{dayjs.unix(e.time).format("HH:mm")}</span>
        </Box>
      );
    },
    bg: (h, c) => (eventIn(c) ? undefined : h.tide === "rising" ? "rgba(34,211,238,0.16)" : h.tide === "falling" ? "rgba(148,163,184,0.12)" : undefined),
  },
  {
    // 潮差：只在每天第一格顯示當天的數字（最高滿潮 − 最低乾潮），不另外標大小潮
    key: "range", label: <InfoLabel text="潮差" info={TIDE_INFO} label="潮差說明" />, tall: true,
    render: (h, c) => {
      if (!c.newDay) return null;
      const dayStart = dayjs.unix(h.time).startOf("day").unix();
      const cm = dayRangeCm(dayStart, c.tideEvents);
      return cm == null ? "-" : <span style={{ fontSize: 12, fontWeight: 800 }}>{cm}cm</span>;
    },
    bg: (_h, c) => (c.newDay ? "rgba(148,163,184,0.08)" : undefined),
  },
  {
    key: "moon", label: "月亮", unit: "%", render: (h) => h.moon_pct,
    bg: (h) => `rgba(253,230,138,${(h.moon_pct / 100) * 0.35})`,
  },
];

/** 依背景亮度選字色：淺底用深字、深底用白字，確保在手機上看得清楚 */
function textOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return TEXT.primary;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0b1520" : "#ffffff";
}

function ScoreLegend() {
  const items: [string, string, string][] = [
    ["65+", "#4caf50", "很好"],
    ["55+", "#8bc34a", "可以出門"],
    ["45+", "#ffc107", "普通"],
    ["35+", "#ff9800", "偏差"],
    ["<35", "#f44336", "不建議"],
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", fontSize: 12, color: TEXT.secondary, px: 2, pb: 1 }}>
      <span>評分（50 = 普通，滿分 100）：</span>
      {items.map(([k, c, l]) => (
        <Box key={k} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c }} />
          {k} {l}
        </Box>
      ))}
    </Box>
  );
}

const LABEL_W = 56;
const HEAD_H = 52;

function ForecastTableInner({
  hours, tideEvents = [], step = 2, cellWidth = 42, rowHeight = 32,
}: { hours: ForecastHour[]; tideEvents?: TideEvt[]; step?: number; cellWidth?: number; rowHeight?: number }) {
  const nowHour = dayjs().startOf("hour").unix();
  const cols = hours.filter((h) => h.time >= nowHour - 3600 * (step - 1) && dayjs.unix(h.time).hour() % step === 0);
  if (cols.length === 0) return <Typography color="text.secondary" sx={{ px: 2 }}>還沒有預報資料</Typography>;

  // 沒有評分（還沒有紀錄或天氣）的列不顯示
  const rows = ROWS.filter((r) => {
    if (r.key === "score") return cols.some((h) => h.score != null);
    if (r.key === "fish_score") return cols.some((h) => h.fish_score != null);
    return true;
  });

  const cell = {
    width: cellWidth, minWidth: cellWidth, height: rowHeight, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13.5, fontWeight: 700, boxShadow: `inset -1px 0 0 ${SURFACE.base}`,
  } as const;
  // 沒有底色的列交錯淡淡的條紋，比較好對齊
  const zebra = (i: number) => (i % 2 === 1 ? "rgba(148,163,184,0.05)" : "transparent");

  return (
    <Box sx={{ display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", borderTop: 1, borderBottom: 1, borderColor: "divider", scrollbarWidth: "thin" }}>
      {/* 固定的左側標籤欄：名稱與單位置中 */}
      <Box sx={{ position: "sticky", left: 0, zIndex: 2, bgcolor: SURFACE.raised, boxShadow: `1px 0 0 ${SURFACE.hairlineStrong}, 6px 0 12px -6px rgba(0,0,0,0.6)` }}>
        <Box sx={{ ...cell, width: LABEL_W, minWidth: LABEL_W, height: HEAD_H, boxShadow: "none" }} />
        {rows.map((r, i) => (
          <Box
            key={r.key}
            sx={{
              ...cell, width: LABEL_W, minWidth: LABEL_W, height: r.tall ? rowHeight + 8 : rowHeight, boxShadow: "none", flexDirection: "column", alignItems: "center", justifyContent: "center",
              lineHeight: 1.05, bgcolor: zebra(i), textAlign: "center", fontSize: 12.5, color: TEXT.primary,
            }}
          >
            {r.label}
            {r.unit && <span style={{ fontSize: 10, fontWeight: 600, color: TEXT.muted }}>{r.unit}</span>}
          </Box>
        ))}
      </Box>

      {cols.map((h, ci) => {
        const d = dayjs.unix(h.time);
        const newDay = ci === 0 || d.hour() < step;
        const isNow = h.time <= nowHour && nowHour < h.time + step * 3600;
        const ctx: Ctx = { from: h.time, to: h.time + step * 3600, newDay, tideEvents };
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
              {/* 日期與星期分兩行，星期用括號，例如 (二)，欄寬窄也不會被切掉 */}
              <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "-0.02em", whiteSpace: "nowrap", color: newDay ? "#5cc8ff" : "transparent" }}>
                {newDay ? d.format("M/D") : "·"}
              </span>
              <span style={{ fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", color: newDay ? "#5cc8ff" : "transparent" }}>
                {newDay ? `(${d.format("dd")})` : "·"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: isNow ? "#5cc8ff" : TEXT.primary }}>{d.format("HH")}h</span>
            </Box>
            {rows.map((r, ri) => {
              const bg = r.bg?.(h, ctx);
              const solid = !!bg && bg.startsWith("#");
              return (
                <Box key={r.key} sx={{ ...cell, height: r.tall ? rowHeight + 8 : rowHeight, bgcolor: bg && bg !== "transparent" ? bg : zebra(ri), color: solid ? textOn(bg!) : TEXT.primary }}>
                  {r.render(h, ctx)}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

export default function ForecastTable(props: {
  hours: ForecastHour[]; tideEvents?: TideEvt[]; step?: number; cellWidth?: number; rowHeight?: number;
}) {
  return (
    <Box>
      <ScoreLegend />
      <ForecastTableInner {...props} />
    </Box>
  );
}
