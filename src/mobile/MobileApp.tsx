import { useEffect, useRef, useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction } from "@mui/material";
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

// 導覽列底色與頁面背景相同：PWA 底部如果有沒填滿的地方，看起來也會是導覽列的一部分
const NAV_BG = "#0a0f16";

/**
 * 手機版面：整個 App 剛好一個螢幕高，上面是可以捲動的內容、下面接著導覽列。
 * 導覽列不用 position: fixed —— iPhone 在頁面比較短（例如行事曆）時，
 * fixed 的元素位置常常算錯，會被往上推、下面多一塊黑色。
 */
export default function MobileApp({ tab, onTabChange }: { tab: AppTab; onTabChange: (t: AppTab) => void }) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // 切換分頁時回到最上面
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <Box
      sx={{
        // 用 position: fixed 撐滿螢幕：iPhone 的 PWA（加到桌面）用 100vh／100dvh 量高度常常會偏大，導覽列就被推到上面
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <Box
        ref={scroller}
        component="main"
        sx={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", pt: "env(safe-area-inset-top)" }}
      >
        <Box sx={{ maxWidth: 640, mx: "auto", pb: 2 }}>
          {tab === "home" && <TodayPage onOpenDate={setOpenDate} />}
          {tab === "calendar" && <CalendarPage onOpenDate={setOpenDate} />}
          {tab === "analysis" && <AnalysisPage onOpenDate={setOpenDate} />}
          {tab === "settings" && <SettingsPage />}
        </Box>
      </Box>

      {/* 導覽列：接在內容下面；iPhone 底部橫條的空間用同一個顏色填滿，不會出現黑塊 */}
      <Box component="nav" sx={{ flexShrink: 0, bgcolor: NAV_BG, borderTop: "1px solid", borderColor: "divider", pb: "env(safe-area-inset-bottom)" }}>
        {/* 只顯示圖示，文字留給螢幕閱讀器（aria-label） */}
        <BottomNavigation
          value={tab}
          onChange={(_, v) => onTabChange(v)}
          sx={{ maxWidth: 640, mx: "auto", bgcolor: "transparent", height: 60, "& .MuiSvgIcon-root": { fontSize: 28 } }}
        >
          <BottomNavigationAction value="home" aria-label="今天" icon={<TodayIcon />} />
          <BottomNavigationAction value="calendar" aria-label="行事曆" icon={<CalendarIcon />} />
          <BottomNavigationAction value="analysis" aria-label="分析" icon={<InsightsIcon />} />
          <BottomNavigationAction value="settings" aria-label="設定" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Box>
      <DaySheet date={openDate} onClose={() => setOpenDate(null)} />
    </Box>
  );
}
