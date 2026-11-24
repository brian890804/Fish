import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import LoginIcon from "@mui/icons-material/LoginRounded";
import { login } from "../lib/api";
import { SquidIcon } from "./icons";
import { TEXT } from "../theme";

/** 登入頁：登入一次，之後這台裝置會記住（約 400 天） */
export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
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
        <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>登入一次，這台裝置之後會記住</Typography>
      </Box>
      <TextField label="帳號" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus />
      <TextField label="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" startIcon={<LoginIcon />} disabled={busy || !username || !password}>
        {busy ? "登入中…" : "登入"}
      </Button>
    </Box>
  );
}
