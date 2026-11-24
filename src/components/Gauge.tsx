import { Box, Divider, Typography } from "@mui/material";
import InfoPopover from "./InfoPopover";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import { STATUS_LABEL, statusColor, type Advice, type Status } from "../lib/advice";
import { TEXT } from "../theme";

interface Props {
  label: React.ReactNode;
  /** 用來算圓環填滿比例的數值 */
  value: number | null | undefined;
  min: number;
  max: number;
  /** 中間顯示的文字（預設是 value） */
  display?: React.ReactNode;
  unit?: string;
  /** 在建議區間內時的圓環顏色 */
  color: string;
  /** 中間數字下方的小字，例如浪的週期 */
  sub?: React.ReactNode;
  size?: number;
  advice?: Advice;
  /** 判斷狀態用的數值（預設用 value） */
  statusValue?: number | null;
  /** 使用者自己紀錄中最好的區間 */
  best?: string | null;
}

export function gaugeStatus(advice: Advice | undefined, v: number | null | undefined): Status {
  return advice?.status && v != null ? advice.status(v) : "info";
}

function AdviceContent({ advice, status, best }: { advice: Advice; status: Status; best?: string | null }) {
  return (
    <Box sx={{ p: 0.5, maxWidth: 280, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{advice.title}</Typography>
        {status !== "info" && (
          <Box component="span" sx={{ fontSize: 11, fontWeight: 800, px: 0.75, py: 0.1, borderRadius: 1, color: "#06121c", bgcolor: statusColor(status) }}>
            {STATUS_LABEL[status]}
          </Box>
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.55 }}>{advice.what}</Typography>
      {advice.range && (
        <>
          <Divider />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: "primary.main" }}>建議區間</Typography>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.55 }}>{advice.range}</Typography>
        </>
      )}
      {advice.factorKey && (
        <>
          <Divider />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: "#ffd54f" }}>你的紀錄</Typography>
          <Typography sx={{ fontSize: 12.5, lineHeight: 1.55 }}>{best ?? "資料還不夠，同一個條件至少要釣過 2 小時才會顯示。"}</Typography>
        </>
      )}
    </Box>
  );
}

/** 標題（含 i 說明）＋圓環；圓環越接近 max 填得越滿，超出建議區間改成黃色或紅色 */
export default function Gauge({ label, value, min, max, display, unit, color, sub, size = 76, advice, statusValue, best }: Props) {
  const stroke = Math.max(5, Math.round(size / 12));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const text = display ?? (value == null ? "-" : value);
  const status = gaugeStatus(advice, statusValue === undefined ? value : statusValue);
  const ringColor = status === "warn" || status === "bad" ? statusColor(status) : color;
  const big = size >= 72;

  const title = (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.4, minHeight: 20, px: 0.75, borderRadius: 1.5 }}>
      <Typography sx={{ fontSize: big ? 13 : 12, fontWeight: 600, color: TEXT.secondary, lineHeight: 1, whiteSpace: "nowrap" }}>{label}</Typography>
      {advice && <InfoIcon className="info" sx={{ fontSize: 14, color: TEXT.muted, transition: "color .15s" }} />}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75, minWidth: 0 }}>
      {advice ? (
        <InfoPopover label={`${advice.title}說明`} content={<AdviceContent advice={advice} status={status} best={best} />}>
          {title}
        </InfoPopover>
      ) : (
        title
      )}
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - ratio)}
            style={{ transition: "stroke-dashoffset .6s ease, stroke .3s" }}
          />
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontWeight: 800, fontSize: Math.round(size * (big ? 0.27 : 0.25)), lineHeight: 1, letterSpacing: "-0.02em" }}>{text}</Typography>
          {unit && <Typography sx={{ fontSize: big ? 11.5 : 10, fontWeight: 600, color: TEXT.secondary, lineHeight: 1.3 }}>{unit}</Typography>}
          {sub && <Typography sx={{ fontSize: big ? 10.5 : 9.5, color: TEXT.muted, lineHeight: 1.1 }}>{sub}</Typography>}
        </Box>
      </Box>
      {/* 狀態文字：只有注意／不推薦才顯示，避免畫面太吵 */}
      <Typography sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1, minHeight: 11, color: statusColor(status) }}>
        {status === "warn" || status === "bad" ? STATUS_LABEL[status] : ""}
      </Typography>
    </Box>
  );
}
