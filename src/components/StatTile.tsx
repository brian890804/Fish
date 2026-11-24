import { Box, Typography } from "@mui/material";

export default function StatTile({ label, value, extra, align = "center", big = false }: {
  label: string; value: React.ReactNode; extra?: React.ReactNode; align?: "center" | "left"; big?: boolean;
}) {
  return (
    <Box sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2, p: big ? 1.75 : 1.2, textAlign: align }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start", gap: 0.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: big ? 24 : 18 }}>{value}</Typography>
        {extra}
      </Box>
    </Box>
  );
}
