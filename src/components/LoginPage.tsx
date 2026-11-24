import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import LoginIcon from "@mui/icons-material/LoginRounded";
import { login, register } from "../lib/api";
import { SquidIcon } from "./icons";
import { TEXT } from "../theme";

/** 登入頁：登入一次，之後這台裝置會記住（約 400 天）；沒有帳號的人可以用邀請碼註冊 */
export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const registering = mode === "register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (registering) await register(username.trim(), password, invite.trim());
      else await login(username.trim(), password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(registering ? "login" : "register");
    setError("");
  };

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, px: 3, maxWidth: 380, mx: "auto" }}
    >
      <Box sx={{ textAlign: "center", mb: 1 }}>
        <SquidIcon sx={{ fontSize: 72 }} />
        <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 1 }}>釣況紀錄</Typography>
        <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>
          {registering ? "用邀請碼建立帳號，資料只有自己看得到" : "登入一次，這台裝置之後會記住"}
        </Typography>
      </Box>
      <TextField
        label="帳號"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        helperText={registering ? "3–20 個字，英文字母、數字或底線" : undefined}
        required
        autoFocus
      />
      <TextField
        label="密碼"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={registering ? "new-password" : "current-password"}
        helperText={registering ? "至少 8 個字" : undefined}
        required
      />
      {registering && (
        <TextField label="邀請碼" value={invite} onChange={(e) => setInvite(e.target.value)} autoCapitalize="none" autoComplete="off" required />
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" startIcon={<LoginIcon />} disabled={busy || !username || !password || (registering && !invite)}>
        {busy ? (registering ? "註冊中…" : "登入中…") : registering ? "註冊並登入" : "登入"}
      </Button>
      <Button variant="text" onClick={switchMode} disabled={busy} sx={{ alignSelf: "center" }}>
        {registering ? "已經有帳號？登入" : "還沒有帳號？用邀請碼註冊"}
      </Button>
    </Box>
  );
}
