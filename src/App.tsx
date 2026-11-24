import { useEffect, useState } from "react";
import { backfillThumbs, api, ApiError, wasAuthed, setAuthFlag } from "./lib/api";
import { Box, CircularProgress, CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { SWRConfig } from "swr";
import { theme } from "./theme";
import MobileApp from "./mobile/MobileApp";
import DesktopApp from "./pc/DesktopApp";
import LoginPage from "./components/LoginPage";

export type AppTab = "home" | "calendar" | "analysis" | "settings";

export default function App() {
  // null = 還在確認登入狀態
  const [authed, setAuthed] = useState<boolean | null>(null);
  // 分頁狀態放在這裡，視窗寬度跨過手機／電腦切換時不會跳回首頁
  const [tab, setTab] = useState<AppTab>("home");
  // 900px 以上用電腦版
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });

  // 啟動時確認有沒有登入；登入過期（任何 API 回 401）就回登入頁
  useEffect(() => {
    api("/me")
      .then(() => {
        setAuthFlag(true);
        setAuthed(true);
      })
      .catch((e) => {
        // 離線又沒有快取：沿用上次登入的狀態，讓上次存的資料還能看
        if (e instanceof ApiError && e.status === 0) setAuthed(wasAuthed());
        else setAuthed(false);
      });
    const onOut = () => setAuthed(false);
    window.addEventListener("fish:logout", onOut);
    return () => window.removeEventListener("fish:logout", onOut);
  }, []);

  // 啟動完成（登入狀態確認好）就淡出開場畫面
  useEffect(() => {
    if (authed === null) return;
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.style.opacity = "0";
    const t = setTimeout(() => splash.remove(), 260);
    return () => clearTimeout(t);
  }, [authed]);

  // 背景幫舊照片補縮圖（延遲幾秒，不搶首頁載入）
  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(backfillThumbs, 4000);
    return () => clearTimeout(t);
  }, [authed]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {authed === null ? (
        // 啟動中：轉圈圈，不要整頁空白
        <Box sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : !authed ? (
        <LoginPage onLogin={() => setAuthed(true)} />
      ) : (
        <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 5000 }}>
          {isDesktop ? <DesktopApp tab={tab} onTabChange={setTab} /> : <MobileApp tab={tab} onTabChange={setTab} />}
        </SWRConfig>
      )}
    </ThemeProvider>
  );
}
