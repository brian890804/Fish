import { Box, Typography } from "@mui/material";
import { scoreColor } from "../lib/format";

export default function ScoreRing({ score, size = 72 }: { score: number | null | undefined; size?: number }) {
  const s = score ?? null;
  const stroke = Math.max(4, size / 16);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(s)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (s ?? 0) / 100)} style={{ transition: "stroke-dashoffset .6s" }}
        />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ fontWeight: 800, fontSize: size * 0.33, lineHeight: 1 }}>{s ?? "-"}</Typography>
        <Typography sx={{ fontSize: Math.max(10, size * 0.13) }} color="text.secondary">分</Typography>
      </Box>
    </Box>
  );
}
