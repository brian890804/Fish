import { Box } from "@mui/material";
import SettingsContent from "../components/SettingsContent";
import PageHeader from "./PageHeader";

export default function SettingsPage() {
  return (
    <Box sx={{ maxWidth: 760 }}>
      <PageHeader title="設定" subtitle="釣點與天氣資料" />
      <SettingsContent />
    </Box>
  );
}
