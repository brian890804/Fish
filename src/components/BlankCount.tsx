import { Box, Typography } from "@mui/material";
import { TurtleIcon } from "./icons";

/** 槓龜：綠色烏龜 ×幾 */
export default function BlankCount({ count, size = 36, title = "槓龜" }: { count: number; size?: number; title?: string }) {
  return (
    <Box title={title} aria-label={`${title} ${count}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <TurtleIcon sx={{ fontSize: size }} />
      <Typography sx={{ fontWeight: 800, fontSize: size * 0.8, lineHeight: 1 }}>×{count}</Typography>
    </Box>
  );
}
