import { Box, Typography } from "@mui/material";

interface Props {
  label: React.ReactNode;
  /** 用來算圓環填滿比例的數值 */
  value: number | null | undefined;
  min: number;
  max: number;
  /** 中間顯示的文字（預設是 value） */
  display?: React.ReactNode;
  unit?: string;
  color: string;
  /** 中間數字下方的小字，例如浪的週期 */
  sub?: React.ReactNode;
  size?: number;
}

/** 圓環儀表：越接近 max 填得越滿，中間顯示數字和單位 */
export default function Gauge({ label, value, min, max, display, unit, color, sub, size = 76 }: Props) {
  const stroke = Math.max(6, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const text = display ?? (value == null ? "-" : value);

  return (
    <Box sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 3, py: 1.25, px: 0.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 18 }}>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{label}</Typography>
      </Box>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
            style={{ transition: "stroke-dashoffset .6s ease", filter: `drop-shadow(0 0 4px ${color}66)` }}
          />
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: size * 0.24, lineHeight: 1.05 }}>{text}</Typography>
          {unit && <Typography sx={{ fontSize: Math.max(10, size * 0.14), color: "text.secondary", lineHeight: 1.1 }}>{unit}</Typography>}
          {sub && <Typography sx={{ fontSize: Math.max(9, size * 0.12), color: "text.secondary", lineHeight: 1.1 }}>{sub}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}
