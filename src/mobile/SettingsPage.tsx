import { Box, Typography } from "@mui/material";
import SettingsContent from "../components/SettingsContent";

export default function SettingsPage() {
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5">設定</Typography>
      <SettingsContent />
    </Box>
  );
}
