import { useState } from "react";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";
import { post, setAppKey } from "../lib/api";
import { SquidIcon } from "./icons";

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ ok: boolean }>("/login", { password });
      if (!r.ok) throw new Error("密碼錯誤");
      setAppKey(password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", px: 3, gap: 2, maxWidth: 400, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 2 }}>
        <SquidIcon sx={{ fontSize: 72, color: "primary.main" }} />
        <Typography variant="h5">釣況紀錄</Typography>
      </Box>
      <TextField type="password" label="密碼" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus fullWidth />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={busy || !password}>
        進入
      </Button>
    </Box>
  );
}
