import { useState } from "react";
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Chip, Divider } from "@mui/material";
import { post, put } from "../lib/api";
import { useSpots } from "../hooks/useSpots";
import type { Spot } from "../lib/types";

function SpotEditor({ spot, onSaved }: { spot?: Spot; onSaved: () => void }) {
  const [name, setName] = useState(spot?.name ?? "");
  const [lat, setLat] = useState(spot?.lat?.toString() ?? "");
  const [lon, setLon] = useState(spot?.lon?.toString() ?? "");
  const [wg, setWg] = useState(spot?.wg_spot_id?.toString() ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    const payload = { name, lat: Number(lat), lon: Number(lon), wg_spot_id: wg ? Number(wg) : null };
    try {
      if (spot) await put(`/spots/${spot.id}`, payload);
      else await post("/spots", payload);
      setMsg({ ok: true, text: "已儲存" });
      if (!spot) { setName(""); setLat(""); setLon(""); setWg(""); }
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TextField size="small" label="名稱" value={name} onChange={(e) => setName(e.target.value)} />
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField size="small" label="緯度" value={lat} onChange={(e) => setLat(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        <TextField size="small" label="經度" value={lon} onChange={(e) => setLon(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
      </Box>
      <TextField size="small" label="溫古魯 spot id" value={wg} onChange={(e) => setWg(e.target.value)} helperText="溫古魯網址最後的數字，例如 windguru.cz/733676" slotProps={{ htmlInput: { inputMode: "numeric" } }} />
      {msg && <Alert severity={msg.ok ? "success" : "error"}>{msg.text}</Alert>}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={save} disabled={!name || !lat || !lon}>{spot ? "儲存" : "新增釣點"}</Button>
        {spot && !spot.is_default && (
          <Button onClick={async () => { await put(`/spots/${spot.id}`, { ...spot, is_default: 1 }); onSaved(); }}>設為預設</Button>
        )}
      </Box>
    </Box>
  );
}

export default function SettingsContent() {
  const spots = useSpots();
  const [refreshMsg, setRefreshMsg] = useState("");

  const refresh = async () => {
    setRefreshMsg("更新中…");
    try {
      const r = await post<{ spot: string; rows: number; windguru: boolean; error?: string }[]>("/refresh", {});
      setRefreshMsg(r.map((x) => `${x.spot}：${x.rows} 筆，${x.windguru ? "溫古魯 OK" : "只有 Open-Meteo"}${x.error ? `（${x.error}）` : ""}`).join("\n"));
    } catch (e) {
      setRefreshMsg(String(e));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h6">釣點</Typography>
          {(spots.data ?? []).map((s) => (
            <Box key={s.id}>
              {s.is_default ? <Chip size="small" label="預設" color="primary" sx={{ mb: 1 }} /> : null}
              <SpotEditor spot={s} onSaved={() => spots.mutate()} />
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
          <Typography variant="subtitle2" color="text.secondary">新增釣點</Typography>
          <SpotEditor onSaved={() => spots.mutate()} />
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="h6">天氣資料</Typography>
          <Typography variant="body2" color="text.secondary">
            每 20 分鐘自動抓一次：先抓溫古魯（GFS 13km + GFS-Wave），抓不到的部分用 Open-Meteo 的同一套 NOAA 模型補上；海溫與潮汐來自 Open-Meteo。已經過去的小時不會再被覆蓋。
          </Typography>
          <Button variant="outlined" onClick={refresh}>立即更新</Button>
          {refreshMsg && <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>{refreshMsg}</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}
