import { useEffect, useState } from "react";
import { backfillThumbs } from "./lib/api";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { SWRConfig } from "swr";
import { theme } from "./theme";
import MobileApp from "./mobile/MobileApp";
import DesktopApp from "./pc/DesktopApp";

export type AppTab = "home" | "calendar" | "analysis" | "settings";

export default function App() {
  // 分頁狀態放在這裡，視窗寬度跨過手機／電腦切換時不會跳回首頁
  const [tab, setTab] = useState<AppTab>("home");
  // 900px 以上用電腦版
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });

  // 背景幫舊照片補縮圖（延遲幾秒，不搶首頁載入）
  useEffect(() => {
    const t = setTimeout(backfillThumbs, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 5000 }}>
        {isDesktop ? <DesktopApp tab={tab} onTabChange={setTab} /> : <MobileApp tab={tab} onTabChange={setTab} />}
      </SWRConfig>
    </ThemeProvider>
  );
}
