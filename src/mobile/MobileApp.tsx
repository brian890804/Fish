import { useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import TodayIcon from "@mui/icons-material/WavesRounded";
import CalendarIcon from "@mui/icons-material/CalendarMonthRounded";
import InsightsIcon from "@mui/icons-material/InsightsRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import TodayPage from "./TodayPage";
import CalendarPage from "./CalendarPage";
import AnalysisPage from "./AnalysisPage";
import SettingsPage from "./SettingsPage";
import DaySheet from "./DaySheet";
import type { AppTab } from "../App";

export default function MobileApp({ tab, onTabChange }: { tab: AppTab; onTabChange: (t: AppTab) => void }) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  return (
    <>
      <Box
        sx={{
          maxWidth: 640, mx: "auto", pt: "env(safe-area-inset-top)", pb: "72px",
          "@media (display-mode: standalone)": { pb: "calc(72px + env(safe-area-inset-bottom))" },
        }}
      >
        {tab === "home" && <TodayPage onOpenDate={setOpenDate} />}
        {tab === "calendar" && <CalendarPage onOpenDate={setOpenDate} />}
        {tab === "analysis" && <AnalysisPage />}
        {tab === "settings" && <SettingsPage />}
      </Box>
      <Paper
        elevation={0}
        sx={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10, borderRadius: 0,
          // 只有從主畫面打開（全螢幕）才留 iPhone 底部橫條的空間；
          // 在 Safari 裡頁面短、工具列沒收起來時，再留空間會變成一塊黑色把按鈕往上推
          pb: 0,
          "@media (display-mode: standalone)": { pb: "env(safe-area-inset-bottom)" },
          bgcolor: "rgba(10,15,22,0.82)", backdropFilter: "saturate(160%) blur(16px)", borderTop: "1px solid", borderColor: "divider",
        }}
      >
        <BottomNavigation showLabels value={tab} onChange={(_, v) => onTabChange(v)} sx={{ maxWidth: 640, mx: "auto", bgcolor: "transparent" }}>
          <BottomNavigationAction value="home" label="今天" icon={<TodayIcon />} />
          <BottomNavigationAction value="calendar" label="行事曆" icon={<CalendarIcon />} />
          <BottomNavigationAction value="analysis" label="分析" icon={<InsightsIcon />} />
          <BottomNavigationAction value="settings" label="設定" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
      <DaySheet date={openDate} onClose={() => setOpenDate(null)} />
    </>
  );
}
