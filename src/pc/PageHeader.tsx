import { Box, Typography } from "@mui/material";

export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, mb: 3 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.01em" }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions}
    </Box>
  );
}
