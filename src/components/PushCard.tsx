import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Switch, Typography } from "@mui/material";
import dayjs from "dayjs";
import { post, useApi } from "../lib/api";
import { disablePush, enablePush, pushState, type PushState } from "../lib/push";
import { TEXT } from "../theme";

const HINT: Record<PushState, string> = {
  unsupported: "這個瀏覽器不支援推播。",
  "needs-install": "iPhone 要先在 Safari 選「分享 → 加入主畫面」，再從主畫面的 App 打開，才能開啟通知。",
  "no-key": "伺服器還沒設定推播金鑰（請執行 node scripts/setup-push.mjs）。",
  denied: "通知被封鎖了，請到手機或瀏覽器的設定裡允許這個網站的通知。",
  off: "",
  on: "",
};

interface Preview {
  windows: { from: number; to: number; bestScore: number }[];
  message: { title: string; body: string } | null;
}

/** 設定頁：好時段推播開關、測試、預覽 */
export default function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const preview = useApi<Preview>("/push/preview");

  useEffect(() => {
    pushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    setMsg("");
    try {
      setState(on ? await enablePush() : await disablePush());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const r = await post<{ sent: number; failed: number; skipped?: string }>("/push/test", {});
      setMsg(r.skipped ?? `已送出 ${r.sent} 則${r.failed ? `，失敗 ${r.failed} 則` : ""}，幾秒內會收到`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ flex: 1 }}>好時段通知</Typography>
          <Switch checked={state === "on"} disabled={busy || (state !== "on" && state !== "off")} onChange={(e) => toggle(e.target.checked)} />
        </Box>
        <Typography sx={{ fontSize: 13, color: TEXT.secondary, lineHeight: 1.6 }}>
          每天下午 3 點檢查接下來 24 小時，有<b>評分 55 以上</b>、而且<b>風、陣風、浪都在建議區間內</b>的時段才會通知，一天最多一則；條件不好的日子不會吵你。
        </Typography>
        {state && HINT[state] && <Alert severity={state === "denied" || state === "no-key" ? "warning" : "info"}>{HINT[state]}</Alert>}
        {state === "on" && (
          <Button variant="outlined" size="small" onClick={test} disabled={busy} sx={{ alignSelf: "flex-start" }}>
            送一則測試通知
          </Button>
        )}
        {msg && <Typography sx={{ fontSize: 13 }}>{msg}</Typography>}
        <Box sx={{ bgcolor: "rgba(148,163,184,0.06)", borderRadius: 2, p: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: TEXT.secondary, fontWeight: 700, mb: 0.5 }}>如果現在檢查，會通知：</Typography>
          {preview.data?.message ? (
            <>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{preview.data.message.title}</Typography>
              <Typography sx={{ fontSize: 12.5, color: TEXT.secondary, whiteSpace: "pre-line" }}>{preview.data.message.body}</Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>
              {preview.isLoading ? "計算中…" : `接下來 24 小時（到 ${dayjs().add(1, "day").format("M/D HH:mm")}）沒有適合的時段，不會通知。`}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
