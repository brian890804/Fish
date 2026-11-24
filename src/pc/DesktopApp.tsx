import { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import type { AppTab } from "../App";
import DashboardPage from "./DashboardPage";
import CalendarPage from "./CalendarPage";
import AnalysisPage from "./AnalysisPage";
import SettingsPage from "./SettingsPage";
import DayDialog from "./DayDialog";

export default function DesktopApp({ tab, onTabChange }: { tab: AppTab; onTabChange: (t: AppTab) => void }) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <Box
      sx={{
        display: "flex", minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 85% -10%, rgba(79,195,247,0.10), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(255,183,77,0.06), transparent 60%)",
      }}
    >
      <Sidebar tab={tab} onChange={onTabChange} />
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { md: 3, lg: 5 }, py: 4 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          {tab === "home" && <DashboardPage onOpenDate={setOpenDate} onGoCalendar={() => onTabChange("calendar")} />}
          {tab === "calendar" && <CalendarPage />}
          {tab === "analysis" && <AnalysisPage />}
          {tab === "settings" && <SettingsPage />}
        </Box>
      </Box>
      <DayDialog date={openDate} onClose={() => setOpenDate(null)} />
    </Box>
  );
}
