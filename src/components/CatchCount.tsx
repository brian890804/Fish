import { Box, Typography } from "@mui/material";
import type { Species } from "../lib/types";
import { SpeciesIcon } from "./icons";

/** 大大的 icon + 數量，一眼看出釣到幾隻 */
export default function CatchCount({ species, count, size = 36 }: { species: Species; count: number; size?: number }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <SpeciesIcon species={species} sx={{ fontSize: size }} />
      <Typography sx={{ fontWeight: 800, fontSize: size * 0.8, lineHeight: 1 }}>×{count}</Typography>
    </Box>
  );
}
