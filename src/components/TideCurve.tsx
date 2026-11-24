import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { TEXT } from "../theme";

type Evt = { time: number; type: "high" | "low"; height_cm?: number | null };

/** 潮汐曲線：相鄰的滿潮、乾潮之間用餘弦曲線連起來；標出滿潮、乾潮的時間 */
export default function TideCurve({ events, from, to, height = 84, label }: { events: Evt[]; from: number; to: number; height?: number; label?: string }) {
  const evs = events.filter((e) => e.height_cm != null).sort((a, b) => a.time - b.time);
  const inRange = evs.filter((e) => e.time >= from - 12 * 3600 && e.time <= to + 12 * 3600);
  if (inRange.length < 2 || to <= from) return null;

  const W = 600;
  const H = height;
  const pad = 14;
  const hs = inRange.map((e) => e.height_cm!);
  const lo = Math.min(...hs);
  const hi = Math.max(...hs);
  const x = (t: number) => ((t - from) / (to - from)) * W;
  const y = (cm: number) => pad + (1 - (cm - lo) / Math.max(1, hi - lo)) * (H - pad * 2);

  // 取樣：在區間前後各多取一段，確保曲線邊界完整
  const pts: string[] = [];
  const start = from - 3600;
  const end = to + 3600;
  for (let t = start; t <= end; t += 600) {
    let a = inRange[0];
    let b = inRange[1];
    for (let i = 0; i < inRange.length - 1; i++) {
      if (t >= inRange[i].time && t <= inRange[i + 1].time) {
        a = inRange[i];
        b = inRange[i + 1];
        break;
      }
      if (t > inRange[i + 1].time) {
        a = inRange[i + 1];
        b = inRange[Math.min(i + 2, inRange.length - 1)];
      }
    }
    const span = Math.max(1, b.time - a.time);
    const k = Math.min(1, Math.max(0, (t - a.time) / span));
    const cm = (a.height_cm! + b.height_cm!) / 2 + ((a.height_cm! - b.height_cm!) / 2) * Math.cos(Math.PI * k);
    pts.push(`${x(t).toFixed(1)},${y(cm).toFixed(1)}`);
  }

  const marks = inRange.filter((e) => e.time >= from && e.time <= to);
  return (
    <Box>
      {label && <Typography sx={{ fontSize: 12, color: TEXT.secondary, fontWeight: 700, mb: 0.5 }}>{label}</Typography>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        <polyline points={pts.join(" ")} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {marks.map((e) => (
          <circle key={e.time} cx={x(e.time)} cy={y(e.height_cm!)} r="4" fill={e.type === "high" ? "#67e8f9" : "#94a3b8"} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
        {marks.map((e) => (
          <Typography key={e.time} sx={{ fontSize: 11.5, fontWeight: 700, color: e.type === "high" ? "#67e8f9" : TEXT.secondary }}>
            {e.type === "high" ? "滿" : "乾"} {dayjs.unix(e.time).format("HH:mm")}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
