import { Box, Typography } from "@mui/material";
import CatchCount from "./CatchCount";
import { TurtleIcon } from "./icons";
import { TEXT } from "../theme";

interface Totals {
  trips: number;
  blank: number;
  squid: number;
  fish: number;
}

/**
 * 行事曆上方的本月統計：左邊是「出釣幾次、槓龜幾次」，右邊是總漁獲（軟絲、魚）。
 * 手機與電腦版共用，size 控制字的大小。
 */
export default function MonthSummary({ totals, size = "md" }: { totals: Totals; size?: "md" | "lg" }) {
  const big = size === "lg" ? 26 : 22;
  const icon = size === "lg" ? 38 : 32;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      {/* 左：出釣次數與槓龜次數放在一起 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">本月出釣</Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800, fontSize: big, lineHeight: 1.2 }}>{totals.trips} 次</Typography>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: TEXT.secondary }} aria-label={`槓龜 ${totals.blank} 次`}>
            <TurtleIcon sx={{ fontSize: big * 0.85 }} />
            <Typography sx={{ fontWeight: 700, fontSize: big * 0.65 }}>槓龜 {totals.blank} 次</Typography>
          </Box>
        </Box>
      </Box>
      {/* 右：總漁獲 */}
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="caption" color="text.secondary">總漁獲</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, justifyContent: "flex-end" }}>
          <CatchCount species="squid" count={totals.squid} size={icon} />
          <CatchCount species="fish" count={totals.fish} size={icon * 0.85} />
        </Box>
      </Box>
    </Box>
  );
}
