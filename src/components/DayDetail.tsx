import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography, Chip, Divider, Skeleton, Alert } from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import { useSWRConfig } from "swr";
import { del, photoUrl, useApi } from "../lib/api";
import type { Catch, DayDetail, Trip, WeatherHour } from "../lib/types";
import { hm, kn, fmt1 } from "../lib/format";
import { TIDE_LABEL, dirName16, meanDirection, hourFloor, moonAt, tideFromEvents, tideState, type TideEvent } from "../../shared/conditions";
import { SpeciesIcon, SPECIES_LABEL } from "./icons";
import CatchCount from "./CatchCount";
import TripDialog from "./TripDialog";
import CatchDialog from "./CatchDialog";
import Arrow from "./Arrow";
import { useConfirm } from "./useConfirm";
import { EgiDot } from "./EgiColorPicker";

/** 潮汐：有氣象署的滿／乾潮時間就用它判斷（精確到分鐘），沒有才用模型的海面高度 */
function tideAt(t: number, weather: WeatherHour[], events: TideEvent[]) {
  const fromCwa = tideFromEvents(t, events);
  if (fromCwa) return fromCwa;
  const h = hourFloor(t);
  const byTime = new Map(weather.map((w) => [w.time, w]));
  return tideState(byTime.get(h - 3600)?.sea_level_m, byTime.get(h)?.sea_level_m, byTime.get(h + 3600)?.sea_level_m);
}

function conditionsAt(t: number, weather: WeatherHour[], events: TideEvent[]) {
  const w = weather.find((x) => x.time === hourFloor(t));
  if (!w) return null;
  return { ...w, tide: tideAt(t, weather, events) };
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** 出釣期間的海況摘要 */
function TripConditions({ trip }: { trip: Trip }) {
  const inTrip = trip.weather.filter((w) => w.time >= hourFloor(trip.start_at) && w.time < trip.end_at);
  if (inTrip.length === 0) return <Typography variant="caption" color="text.secondary">還沒有這段時間的天氣資料</Typography>;
  const mid = trip.weather.find((w) => w.time === hourFloor((trip.start_at + trip.end_at) / 2)) ?? inTrip[0];
  // 出釣期間每 15 分鐘看一次潮汐，依序列出變化，例如「漲潮→滿潮→退潮」
  const tideSeq: string[] = [];
  for (let t = trip.start_at; t <= trip.end_at; t += 900) {
    const s = tideAt(t, trip.weather, trip.tide_events ?? []);
    if (s && tideSeq[tideSeq.length - 1] !== TIDE_LABEL[s]) tideSeq.push(TIDE_LABEL[s]);
  }
  const tides = tideSeq;
  const moon = moonAt((trip.start_at + trip.end_at) / 2);
  const windDir = meanDirection(inTrip.map((w) => w.wind_dir));
  const items = [
    // 風向取出釣期間的平均方向（用向量平均），附上角度
    { label: "風", value: `${dirName16(windDir)} ${windDir ?? "-"}° · ${kn(avg(inTrip.map((w) => w.wind_ms)))}kn`, extra: <Arrow deg={windDir} size={14} /> },
    { label: "浪", value: `${fmt1(avg(inTrip.map((w) => w.wave_m)))}m · ${fmt1(mid.wave_period_s)}s` },
    { label: "潮", value: tides.join("→") || "-" },
    { label: "月", value: `${moon.emoji} ${Math.round(moon.illumination * 100)}%` },
    { label: "氣溫", value: fmt1(avg(inTrip.map((w) => w.temp_c)), "°") },
    { label: "海溫", value: fmt1(avg(inTrip.map((w) => w.sea_temp_c)), "°") },
    { label: "雲", value: `${Math.round(avg(inTrip.map((w) => w.cloud_pct)) ?? 0)}%` },
    { label: "雨", value: `${fmt1(inTrip.reduce((a, w) => a + (w.precip_mm ?? 0), 0))}mm` },
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.75 }}>
      {items.map((it) => (
        <Box key={it.label} sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 1.5, px: 0.75, py: 0.5 }}>
          <Typography sx={{ fontSize: 10 }} color="text.secondary">{it.label}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{it.value}</Typography>
            {it.extra}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function CatchRow({ c, trip, onClick }: { c: Catch; trip: Trip; onClick: () => void }) {
  const w = conditionsAt(c.caught_at, trip.weather, trip.tide_events ?? []);
  return (
    <Box onClick={onClick} sx={{ display: "flex", gap: 1.5, alignItems: "center", py: 1, cursor: "pointer" }}>
      <SpeciesIcon species={c.species} sx={{ fontSize: 36 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {hm(c.caught_at)} · {c.species === "fish" ? c.fish_name || "魚" : SPECIES_LABEL[c.species]}
            {c.length_cm != null && ` · ${c.length_cm}cm`}
            {c.weight_g != null && ` · ${c.weight_g}g`}
          </Typography>
          <EgiDot color={c.egi_color} size={11} />
        </Box>
        {w && (
          <Typography variant="caption" color="text.secondary">
            浪 {fmt1(w.wave_m)}m · 風 {dirName16(w.wind_dir)} {w.wind_dir == null ? "" : `${Math.round(w.wind_dir)}° `}{kn(w.wind_ms)}kn{w.tide ? ` · ${TIDE_LABEL[w.tide]}` : ""}
          </Typography>
        )}
        {c.note && <Typography variant="body2" color="text.secondary" noWrap>{c.note}</Typography>}
      </Box>
      {c.photo_key && <Box component="img" src={photoUrl(c.photo_key)} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: "cover" }} />}
    </Box>
  );
}

/** 某一天的出釣與釣獲（手機版放在全螢幕 Dialog，電腦版放在右側面板） */
export default function DayDetail({ date }: { date: string | null }) {
  const { mutate: globalMutate } = useSWRConfig();
  const day = useApi<DayDetail>(date ? `/day?date=${date}` : null);
  const [tripDialog, setTripDialog] = useState<{ open: boolean; trip?: Trip | null }>({ open: false });
  const [catchDialog, setCatchDialog] = useState<{ open: boolean; trip: Trip | null; item?: Catch | null }>({ open: false, trip: null });
  const [confirmDialog, confirm] = useConfirm();

  const refresh = () => {
    day.mutate();
    globalMutate((k) => typeof k === "string" && (k.startsWith("/calendar") || k.startsWith("/day") || k.startsWith("/analysis") || k.startsWith("/forecast")));
  };

  const removeTrip = async (t: Trip) => {
    const ok = await confirm({
      title: `刪除 ${hm(t.start_at)} 這次出釣？`,
      message: t.catches.length ? `裡面的 ${t.catches.length} 筆釣獲和照片也會一起刪除，無法復原。` : "刪除後無法復原。",
    });
    if (!ok) return;
    try {
      await del(`/trips/${t.id}`);
    } catch (err) {
      alertError(err);
    }
    refresh();
  };

  const [error, setError] = useState("");
  const alertError = (err: unknown) => setError(err instanceof Error ? err.message : String(err));

  const trips = day.data?.date === date ? day.data.trips : undefined;

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        {!trips ? (
          <Skeleton variant="rounded" height={200} />
        ) : trips.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>這天沒有出釣紀錄</Typography>
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => setTripDialog({ open: true })}>新增出釣</Button>
          </Box>
        ) : (
          <>
            {trips.map((t) => {
              const squid = t.catches.filter((c) => c.species === "squid").length;
              const fish = t.catches.filter((c) => c.species === "fish").length;
              return (
                <Card key={t.id}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{hm(t.start_at)} – {hm(t.end_at)}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.spot_name} · {((t.end_at - t.start_at) / 3600).toFixed(1)} 小時</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setTripDialog({ open: true, trip: t })}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => removeTrip(t)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1.5 }}>
                      {squid + fish === 0 ? (
                        <Chip label="槓龜" variant="outlined" />
                      ) : (
                        <>
                          {squid > 0 && <CatchCount species="squid" count={squid} size={40} />}
                          {fish > 0 && <CatchCount species="fish" count={fish} size={40} />}
                        </>
                      )}
                    </Box>
                    <TripConditions trip={t} />
                    {t.note && <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">{t.note}</Typography>}
                    {t.catches.length > 0 && <Divider sx={{ my: 1 }} />}
                    {t.catches.map((c) => (
                      <CatchRow key={c.id} c={c} trip={t} onClick={() => setCatchDialog({ open: true, trip: t, item: c })} />
                    ))}
                    <Button fullWidth variant="contained" startIcon={<AddIcon />} sx={{ mt: 1.5 }} onClick={() => setCatchDialog({ open: true, trip: t })}>
                      記錄釣獲
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setTripDialog({ open: true })}>再加一段出釣</Button>
          </>
        )}
      </Box>
      <TripDialog open={tripDialog.open} date={date ?? ""} trip={tripDialog.trip} onClose={() => setTripDialog({ open: false })} onSaved={refresh} />
      <CatchDialog open={catchDialog.open} trip={catchDialog.trip} item={catchDialog.item} onClose={() => setCatchDialog({ open: false, trip: null })} onSaved={refresh} />
      {confirmDialog}
    </>
  );
}
