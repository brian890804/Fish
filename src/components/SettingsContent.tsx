import { useState } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, TextField, Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import MyLocationIcon from "@mui/icons-material/MyLocationRounded";
import { getPosition, hasOwnLocation } from "../lib/geo";
import { post, put, logout } from "../lib/api";
import { useSpots } from "../hooks/useSpots";
import type { Spot } from "../lib/types";
import PushCard from "./PushCard";

const OWN = "own";

function SpotEditor({ spot, spots, onSaved }: { spot?: Spot; spots: Spot[]; onSaved: () => void }) {
  // 可以當天氣來源的：自己抓天氣、且不是自己
  const sources = spots.filter((s) => !s.weather_spot_id && s.id !== spot?.id);
  const defaultSource = spot ? (spot.weather_spot_id ? String(spot.weather_spot_id) : OWN) : sources[0] ? String(sources[0].id) : OWN;
  const [name, setName] = useState(spot?.name ?? "");
  const [source, setSource] = useState(defaultSource);
  const [lat, setLat] = useState(spot?.lat?.toString() ?? "");
  const [lon, setLon] = useState(spot?.lon?.toString() ?? "");
  const [wg, setWg] = useState(spot?.wg_spot_id?.toString() ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const own = source === OWN;
  const usedByOthers = !!spot && spots.some((s) => s.weather_spot_id === spot.id);
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const useHere = async () => {
    setLocating(true);
    setLocMsg("");
    const pos = await getPosition(8000);
    setLocating(false);
    if (!pos) return setLocMsg("抓不到定位，請確認有允許瀏覽器使用位置");
    setLat(pos.lat.toFixed(5));
    setLon(pos.lon.toFixed(5));
    setLocMsg(`已填入目前位置（誤差約 ${Math.round(pos.accuracy)} 公尺），記得按儲存`);
  };

  const save = async () => {
    const payload = own
      ? { name, weather_spot_id: null, lat: Number(lat), lon: Number(lon), wg_spot_id: wg ? Number(wg) : null }
      : { name, weather_spot_id: Number(source), ...(lat && lon ? { lat: Number(lat), lon: Number(lon) } : {}) };
    try {
      if (spot) await put(`/spots/${spot.id}`, payload);
      else await post("/spots", payload);
      setMsg({ ok: true, text: "已儲存" });
      if (!spot) { setName(""); setLat(""); setLon(""); setWg(""); setSource(defaultSource); }
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TextField size="small" label="名稱" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField
        select size="small" label="天氣資料" value={source} onChange={(e) => setSource(e.target.value)}
        disabled={usedByOthers}
        helperText={usedByOthers ? "其他釣點正在共用這裡的天氣，所以這裡要自己抓" : own ? "自己抓天氣，需要填座標" : "在附近就直接共用，不用另外抓"}
      >
        {sources.map((s) => (
          <MenuItem key={s.id} value={String(s.id)}>使用「{s.name}」的天氣</MenuItem>
        ))}
        <MenuItem value={OWN}>自己抓天氣</MenuItem>
      </TextField>
      {/* 位置：自己抓天氣時是天氣座標；共用天氣時只用來「自動判斷釣點」 */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField size="small" label="緯度" value={lat} onChange={(e) => setLat(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
        <TextField size="small" label="經度" value={lon} onChange={(e) => setLon(e.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: -0.5 }}>
        <Button size="small" variant="outlined" startIcon={locating ? <CircularProgress size={14} /> : <MyLocationIcon />} disabled={locating} onClick={useHere} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          用目前位置
        </Button>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          {locMsg || (spot && !hasOwnLocation(spot, spots) ? "還沒設定位置，到這個釣點時按一下" : "到了釣點按一下，之後會自動選這個釣點")}
        </Typography>
      </Box>
      {own && (
        <>
          <TextField size="small" label="溫古魯 spot id" value={wg} onChange={(e) => setWg(e.target.value)} helperText="溫古魯網址最後的數字，例如 windguru.cz/733676" slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        </>
      )}
      {msg && <Alert severity={msg.ok ? "success" : "error"}>{msg.text}</Alert>}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={save} disabled={!name.trim() || (own && (!lat || !lon))}>{spot ? "儲存" : "新增釣點"}</Button>
        {spot && !spot.is_default && (
          <Button onClick={async () => { await put(`/spots/${spot.id}`, { is_default: 1 }); onSaved(); }}>設為預設</Button>
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
          <Box>
            {(spots.data ?? []).map((s) => {
              const src = spots.data!.find((x) => x.id === s.weather_spot_id);
              return (
                <Accordion key={s.id} disableGutters elevation={0} sx={{ bgcolor: "transparent", "&:before": { display: "none" }, borderBottom: 1, borderColor: "divider" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                      {s.is_default ? <Chip size="small" label="預設" color="primary" /> : null}
                      <Typography variant="caption" color="text.secondary">
                        {src ? `天氣：${src.name}` : s.wg_spot_id ? "天氣：自己抓（溫古魯）" : "天氣：自己抓"}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <SpotEditor spot={s} spots={spots.data!} onSaved={() => spots.mutate()} />
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
          <Typography variant="subtitle2" color="text.secondary">新增釣點</Typography>
          {spots.data && <SpotEditor spots={spots.data} onSaved={() => spots.mutate()} />}
        </CardContent>
      </Card>
      <PushCard />
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
      <Button color="error" variant="outlined" onClick={() => logout()} sx={{ alignSelf: "flex-start" }}>登出</Button>
    </Box>
  );
}
