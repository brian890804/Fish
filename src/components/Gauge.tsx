import { Box, Divider, Tooltip, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import { STATUS_COLOR, STATUS_LABEL, type Advice, type Status } from "../lib/advice";

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
  /** 說明與建議區間；有 status 時超出建議區間會把圓環改成黃色或紅色 */
  advice?: Advice;
  /** 判斷狀態用的數值（預設用 value，例如風速要用節而不是 m/s） */
  statusValue?: number | null;
  /** 使用者自己紀錄中最好的區間 */
  best?: string | null;
}

function AdviceContent({ advice, status, best }: { advice: Advice; status: Status; best?: string | null }) {
  return (
    <Box sx={{ p: 0.5, maxWidth: 280, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{advice.title}</Typography>
        {status !== "info" && (
          <Box
            component="span"
            sx={{
              fontSize: 11, fontWeight: 800, px: 0.75, borderRadius: 1, color: "#0b1520",
              bgcolor: status === "good" ? "#69f0ae" : STATUS_COLOR[status],
            }}
          >
            {STATUS_LABEL[status]}
          </Box>
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{advice.what}</Typography>
      {advice.range && (
        <>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#90caf9" }}>建議區間</Typography>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{advice.range}</Typography>
        </>
      )}
      {advice.factorKey && (
        <>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#ffe082" }}>你的紀錄</Typography>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {best ?? "資料還不夠，同一個條件至少要釣過 2 小時才會顯示。"}
          </Typography>
        </>
      )}
    </Box>
  );
}

/** 圓環儀表：越接近 max 填得越滿，中間顯示數字和單位；標題旁的 i 滑鼠移上去（手機點一下）會顯示說明 */
export default function Gauge({ label, value, min, max, display, unit, color, sub, size = 76, advice, statusValue, best }: Props) {
  const stroke = Math.max(6, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const text = display ?? (value == null ? "-" : value);
  const sv = statusValue === undefined ? value : statusValue;
  const status: Status = advice?.status && sv != null ? advice.status(sv) : "info";
  const ringColor = status === "warn" || status === "bad" ? STATUS_COLOR[status] : color;

  const body = (
    <Box
      sx={{
        bgcolor: status === "bad" ? "rgba(255,82,82,0.08)" : "rgba(255,255,255,0.04)",
        border: 1, borderColor: status === "bad" ? "rgba(255,82,82,0.35)" : "transparent",
        borderRadius: 3, py: 1.25, px: 0.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75,
        height: "100%",
      }}
    >
      {advice ? (
        <Tooltip
          title={<AdviceContent advice={advice} status={status} best={best} />}
          arrow
          enterTouchDelay={0}
          leaveTouchDelay={6000}
          slotProps={{ tooltip: { sx: { bgcolor: "#0d1b2a", border: "1px solid rgba(255,255,255,0.12)", boxShadow: 6, p: 1.25 } }, arrow: { sx: { color: "#0d1b2a" } } }}
        >
          <Box
            role="button" tabIndex={0} aria-label={`${advice.title}說明`}
            sx={{
              display: "flex", alignItems: "center", gap: 0.4, minHeight: 18, cursor: "help", borderRadius: 1, px: 0.5,
              "&:hover .info, &:focus-visible .info": { color: "primary.main" }, "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{label}</Typography>
            <InfoIcon className="info" sx={{ fontSize: 15, color: "text.secondary", transition: "color .15s" }} />
          </Box>
        </Tooltip>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 18 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>{label}</Typography>
        </Box>
      )}
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
            style={{ transition: "stroke-dashoffset .6s ease, stroke .3s", filter: `drop-shadow(0 0 4px ${ringColor}66)` }}
          />
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: size * 0.24, lineHeight: 1.05, color: status === "bad" ? STATUS_COLOR.bad : undefined }}>{text}</Typography>
          {unit && <Typography sx={{ fontSize: Math.max(10, size * 0.14), color: "text.secondary", lineHeight: 1.1 }}>{unit}</Typography>}
          {sub && <Typography sx={{ fontSize: Math.max(9, size * 0.12), color: "text.secondary", lineHeight: 1.1 }}>{sub}</Typography>}
        </Box>
      </Box>
      {(status === "warn" || status === "bad") && (
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: STATUS_COLOR[status], lineHeight: 1 }}>{STATUS_LABEL[status]}</Typography>
      )}
    </Box>
  );

  return body;
}
