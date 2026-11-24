import { Box, Chip, Divider, Skeleton, Tooltip, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { Analysis, ForecastHour } from "../lib/types";
import { kn, scoreColor } from "../lib/format";
import { useApi } from "../lib/api";
import { ADVICE, statusColor, type Status } from "../lib/advice";
import { TIDE_LABEL, dirName16 } from "../../shared/conditions";
import { STATUS, SURFACE, TEXT } from "../theme";
import Gauge, { gaugeStatus } from "./Gauge";
import Arrow from "./Arrow";

// 圓環在建議區間內時的顏色
const C = {
  wind: "#5cc8ff",
  gust: "#38bdf8",
  wave: "#818cf8",
  tide: "#22d3ee",
  temp: "#fb923c",
  sea: "#2dd4bf",
  cloud: "#94a3b8",
  moon: "#fde68a",
  pressure: "#c084fc",
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

const VERDICT: Record<Exclude<Status, "info">, { title: string; color: string }> = {
  good: { title: "條件不錯，適合出釣", color: STATUS.good },
  warn: { title: "可以釣，但要注意", color: STATUS.warn },
  bad: { title: "現在不太適合出釣", color: STATUS.bad },
};

interface Props {
  now?: ForecastHour;
  /** 今天較好的時段 */
  best?: ForecastHour[];
  /** 累積的出釣時數（少於 5 小時還不會評分） */
  historyHours?: number;
  /** 次要指標一排幾個：手機 3、電腦 6 */
  secondaryColumns?: number;
  primarySize?: number;
  secondarySize?: number;
}

/** 現在條件：一句話結論 → 決定能不能出門的風、陣風、浪 → 其他參考指標 */
export default function ConditionsGrid({ now, best = [], historyHours = 0, secondaryColumns = 3, primarySize = 92, secondarySize = 62 }: Props) {
  const bestBuckets = useBestBuckets();
  if (!now) return <Skeleton variant="rounded" height={420} sx={{ borderRadius: 4 }} />;

  const windKn = kn(now.wind_ms);
  const gustKn = kn(now.gust_ms);
  const b = (a: { factorKey?: string }) => (a.factorKey ? bestBuckets.get(a.factorKey) ?? null : null);

  // 綜合判斷：取最差的那一項
  const checks: { label: string; status: Status }[] = [
    { label: `風 ${windKn} kn`, status: gaugeStatus(ADVICE.wind, windKn) },
    { label: `陣風 ${gustKn} kn`, status: gaugeStatus(ADVICE.gust, gustKn) },
    { label: `浪 ${one(now.wave_m)} m`, status: gaugeStatus(ADVICE.wave, now.wave_m) },
    { label: `海溫 ${one(now.sea_temp_c)}°C`, status: gaugeStatus(ADVICE.seaTemp, now.sea_temp_c) },
    { label: `氣壓 ${Math.round(now.pressure_hpa ?? 0)} hPa`, status: gaugeStatus(ADVICE.pressure, now.pressure_hpa) },
  ];
  const overall: Exclude<Status, "info"> = checks.some((c) => c.status === "bad") ? "bad" : checks.some((c) => c.status === "warn") ? "warn" : "good";
  const reasons = checks.filter((c) => c.status === overall && overall !== "good").map((c) => c.label);
  const v = VERDICT[overall];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 一句話結論 */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: v.color, mt: 0.9, flexShrink: 0, boxShadow: `0 0 0 4px ${v.color}22` }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: TEXT.secondary, fontWeight: 600 }}>現在 {dayjs.unix(now.time).format("HH:mm")}</Typography>
          <Typography sx={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", color: v.color, lineHeight: 1.35 }}>{v.title}</Typography>
          {reasons.length > 0 && (
            <Typography sx={{ fontSize: 13, color: TEXT.secondary, mt: 0.25 }}>{reasons.join("、")} 超出建議</Typography>
          )}
        </Box>
        <Tooltip
          arrow enterTouchDelay={0} leaveTouchDelay={6000}
          title={
            historyHours < 5
              ? "評分是用你自己的出釣紀錄學出來的：累積 5 小時以上的紀錄（包含槓龜）後，會比對你過去釣得好的條件，給每個小時 0–100 分，50 分是你的平常水準。"
              : "依你過去的出釣紀錄比對現在的條件：50 分是你的平常水準，越高越像你以前釣得好的時候。"
          }
        >
          <Box sx={{ textAlign: "center", px: 1.25, py: 0.75, borderRadius: 2.5, bgcolor: SURFACE.raised, cursor: "help", flexShrink: 0 }}>
            <Typography sx={{ fontSize: 10.5, color: TEXT.secondary, fontWeight: 700, lineHeight: 1.2 }}>評分</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: now.score == null ? TEXT.muted : scoreColor(now.score) }}>
              {now.score ?? "—"}
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* 主要：決定能不能出門 */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1 }}>
        <Gauge
          size={primarySize} color={C.wind} value={windKn} min={0} max={35} unit="kn" advice={ADVICE.wind} best={b(ADVICE.wind)}
          label={<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>風 {dirName16(now.wind_dir)}<Arrow deg={now.wind_dir} size={13} /></Box>}
        />
        <Gauge size={primarySize} color={C.gust} value={gustKn} min={0} max={40} unit="kn" label="陣風" advice={ADVICE.gust} />
        <Gauge
          size={primarySize} color={C.wave} value={now.wave_m} min={0} max={4} display={one(now.wave_m)} unit="m" label="浪高"
          sub={now.wave_period_s ? `週期 ${Math.round(now.wave_period_s)}s` : undefined} advice={ADVICE.wave} best={b(ADVICE.wave)}
        />
      </Box>

      <Divider />

      {/* 次要：參考指標 */}
      <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${secondaryColumns}, minmax(0, 1fr))`, rowGap: 1.5, columnGap: 1 }}>
        <Gauge
          size={secondarySize} color={C.tide} label="潮汐" advice={ADVICE.tide} best={b(ADVICE.tide)}
          value={now.sea_level_m} min={-1} max={1}
          display={now.tide ? TIDE_LABEL[now.tide] : "-"}
          unit={now.sea_level_m == null ? undefined : `${now.sea_level_m >= 0 ? "+" : ""}${now.sea_level_m.toFixed(2)}m`}
        />
        <Gauge size={secondarySize} color={C.temp} value={now.temp_c} min={0} max={40} display={one(now.temp_c)} unit="°C" label="氣溫" advice={ADVICE.temp} best={b(ADVICE.temp)} />
        <Gauge size={secondarySize} color={C.sea} value={now.sea_temp_c} min={10} max={32} display={one(now.sea_temp_c)} unit="°C" label="海溫" advice={ADVICE.seaTemp} best={b(ADVICE.seaTemp)} />
        <Gauge size={secondarySize} color={C.cloud} value={now.cloud_pct} min={0} max={100} display={now.cloud_pct == null ? "-" : Math.round(now.cloud_pct)} unit="%" label="雲量" advice={ADVICE.cloud} best={b(ADVICE.cloud)} />
        <Gauge size={secondarySize} color={C.moon} value={now.moon_pct} min={0} max={100} unit="%" label={`月亮 ${now.moon_emoji}`} advice={ADVICE.moon} best={b(ADVICE.moon)} />
        <Gauge size={secondarySize} color={C.pressure} value={now.pressure_hpa} min={990} max={1040} display={now.pressure_hpa == null ? "-" : Math.round(now.pressure_hpa)} unit="hPa" label="氣壓" advice={ADVICE.pressure} />
      </Box>

      {best.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 12.5, color: TEXT.secondary, fontWeight: 600 }}>今天較好的時段</Typography>
          {best.map((h) => (
            <Chip
              key={h.time} size="small" label={`${dayjs.unix(h.time).format("HH:mm")} · ${h.score}`}
              sx={{ bgcolor: `${scoreColor(h.score)}22`, color: scoreColor(h.score), border: `1px solid ${scoreColor(h.score)}55`, fontWeight: 800 }}
            />
          ))}
        </Box>
      )}
      {historyHours < 5 && (
        <Typography sx={{ fontSize: 12, color: TEXT.muted }}>評分會在累積 5 小時以上的出釣紀錄（包含槓龜）後開始計算。</Typography>
      )}
    </Box>
  );
}

export { statusColor };
