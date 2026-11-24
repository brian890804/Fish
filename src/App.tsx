import { useEffect, useState } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { SWRConfig } from "swr";
import { theme } from "./theme";
import { getAppKey, setAppKey } from "./lib/api";
import LoginPage from "./components/LoginPage";
import MobileApp from "./mobile/MobileApp";
import DesktopApp from "./pc/DesktopApp";

export type AppTab = "home" | "calendar" | "analysis" | "settings";

export default function App() {
  const [authed, setAuthed] = useState(() => !!getAppKey());
  // 分頁狀態放在這裡，視窗寬度跨過手機／電腦切換時不會跳回首頁
  const [tab, setTab] = useState<AppTab>("home");
  // 900px 以上用電腦版
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });

  useEffect(() => {
    const onLogout = () => {
      setAppKey(null);
      setAuthed(false);
    };
    window.addEventListener("fish:logout", onLogout);
    return () => window.removeEventListener("fish:logout", onLogout);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!authed ? (
        <LoginPage onLogin={() => setAuthed(true)} />
      ) : (
        <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 5000 }}>
          {isDesktop ? <DesktopApp tab={tab} onTabChange={setTab} /> : <MobileApp tab={tab} onTabChange={setTab} />}
        </SWRConfig>
      )}
    </ThemeProvider>
  );
}
