import { Box, Chip, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PRESETS, type useAnalysis } from "../../hooks/useAnalysis";
import { SpeciesIcon } from "../icons";

type A = ReturnType<typeof useAnalysis>;

/** 分析頁最上面的軟絲／魚切換：整頁（紀錄、條件分析）都跟著換 */
export function SpeciesSwitch({ a, fullWidth = true }: { a: A; fullWidth?: boolean }) {
  return (
    <ToggleButtonGroup exclusive fullWidth={fullWidth} size="small" value={a.species} onChange={(_, v) => v && a.setSpecies(v)}>
      <ToggleButton value="squid" sx={{ gap: 0.5, px: 2 }}><SpeciesIcon species="squid" fontSize="small" />軟絲</ToggleButton>
      <ToggleButton value="fish" sx={{ gap: 0.5, px: 2 }}><SpeciesIcon species="fish" fontSize="small" />魚</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** 期間篩選（近 30 天、近 90 天…） */
export default function AnalysisFilters({ a, inline = false }: { a: A; inline?: boolean }) {
  const custom = a.preset === "custom" && (
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField type="date" size="small" label="從" value={a.custom.from} onChange={(e) => a.setCustom({ ...a.custom, from: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      <TextField type="date" size="small" label="到" value={a.custom.to} onChange={(e) => a.setCustom({ ...a.custom, to: e.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
    </Box>
  );
  const chips = (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {PRESETS.map(([k, label]) => (
        <Chip key={k} label={label} color={a.preset === k ? "primary" : "default"} onClick={() => a.setPreset(k)} />
      ))}
    </Box>
  );
  if (inline) {
    return (
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        {chips}
        {custom}
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {chips}
      {custom}
    </Box>
  );
}
