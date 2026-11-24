import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography, Chip, Divider, Skeleton, Alert } from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import { useSWRConfig } from "swr";
import { useSpots } from "../hooks/useSpots";
import dayjs from "dayjs";
import { del, photoUrl, useApi } from "../lib/api";
import type { Catch, DayDetail, Trip, WeatherHour } from "../lib/types";
import { hm, kn, fmt1 } from "../lib/format";
import { TIDE_LABEL, dirName16, meanDirection, hourFloor, moonAt, tideFromEvents, tideState, type TideEvent } from "../../shared/conditions";
import { SpeciesIcon, SPECIES_LABEL } from "./icons";
import { TurtleIcon } from "./icons";
import CatchCount from "./CatchCount";
import TripDialog from "./TripDialog";
import CatchDialog from "./CatchDialog";
import Arrow from "./Arrow";
import { useConfirm } from "./useConfirm";
import { EgiDot } from "./EgiColorPicker";
import TideCurve from "./TideCurve";
import LazyImage from "./LazyImage";
import SunMoonRow from "./SunMoonRow";
import { shareCard } from "../lib/shareCard";
import { waterLabel } from "../../shared/water";
import { TEXT } from "../theme";
import PlaceIcon from "@mui/icons-material/PlaceRounded";
import ShareIcon from "@mui/icons-material/IosShareRounded";
import PhotoViewer from "./PhotoViewer";

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
/** 小圓環：中間數字，下方標籤，圓環填的比例代表大小 */
function MiniRing({ value, unit, label, ratio, color }: { value: React.ReactNode; unit?: string; label: React.ReactNode; ratio: number; color: string }) {
  const size = 58;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = Math.min(1, Math.max(0, ratio));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, minWidth: 0 }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} />
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{value}</Typography>
          {unit && <Typography sx={{ fontSize: 9.5, color: TEXT.secondary, mt: 0.25 }}>{unit}</Typography>}
        </Box>
      </Box>
      <Typography sx={{ fontSize: 11, color: TEXT.secondary, fontWeight: 600, lineHeight: 1, display: "flex", alignItems: "center", gap: 0.25 }}>{label}</Typography>
    </Box>
  );
}

/** 這趟的天氣與海況：一排小圓環，不寫長句 */
function TripConditions({ trip }: { trip: Trip }) {
  const inTrip = trip.weather.filter((w) => w.time >= hourFloor(trip.start_at) && w.time < trip.end_at);
  if (inTrip.length === 0) return <Typography variant="caption" color="text.secondary">還沒有這段時間的天氣資料</Typography>;
  const mid = trip.weather.find((w) => w.time === hourFloor((trip.start_at + trip.end_at) / 2)) ?? inTrip[0];
  const tideSeq: string[] = [];
  for (let t = trip.start_at; t <= trip.end_at; t += 900) {
    const st = tideAt(t, trip.weather, trip.tide_events ?? []);
    if (st && tideSeq[tideSeq.length - 1] !== TIDE_LABEL[st]) tideSeq.push(TIDE_LABEL[st]);
  }
  const moon = moonAt((trip.start_at + trip.end_at) / 2);
  const windDir = meanDirection(inTrip.map((w) => w.wind_dir));
  const windKn = kn(avg(inTrip.map((w) => w.wind_ms)));
  const wave = avg(inTrip.map((w) => w.wave_m));
  const temp = avg(inTrip.map((w) => w.temp_c));
  const sea = avg(inTrip.map((w) => w.sea_temp_c));
  const cloud = avg(inTrip.map((w) => w.cloud_pct));
  const rain = inTrip.reduce((a, w) => a + (w.precip_mm ?? 0), 0);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", rowGap: 1.25, columnGap: 0.5 }}>
      <MiniRing value={windKn ?? "-"} unit="kn" ratio={(windKn ?? 0) / 30} color="#5cc8ff"
        label={<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>風 {dirName16(windDir)}<Arrow deg={windDir} size={11} /></Box>} />
      <MiniRing value={fmt1(wave)} unit="m" ratio={(wave ?? 0) / 3} color="#818cf8" label={`浪 ${fmt1(mid.wave_period_s)}s`} />
      <MiniRing value={fmt1(temp)} unit="°C" ratio={(temp ?? 0) / 35} color="#fb923c" label="氣溫" />
      <MiniRing value={fmt1(sea)} unit="°C" ratio={((sea ?? 0) - 10) / 22} color="#2dd4bf" label="海溫" />
      <MiniRing value={Math.round(cloud ?? 0)} unit="%" ratio={(cloud ?? 0) / 100} color="#94a3b8" label="雲" />
      <MiniRing value={`${Math.round(moon.illumination * 100)}`} unit={moon.emoji} ratio={moon.illumination} color="#fde68a" label="月" />
      <MiniRing value={tideSeq.length ? tideSeq.map((x) => x[0]).join("") : "-"} unit="潮" ratio={1} color="#22d3ee" label="潮" />
      <MiniRing value={fmt1(rain)} unit="mm" ratio={rain / 10} color="#60a5fa" label="雨" />
    </Box>
  );
}

function CatchRow({ c, trip, onClick, onPhotos }: { c: Catch; trip: Trip; onClick: () => void; onPhotos: (keys: string[]) => void }) {
  const w = conditionsAt(c.caught_at, trip.weather, trip.tide_events ?? []);
  const photos = c.photo_keys?.length ? c.photo_keys : c.photo_key ? [c.photo_key] : [];
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
          {waterLabel(c.water_color) && <Typography variant="caption" color="text.secondary">水色 {waterLabel(c.water_color)}</Typography>}
        </Box>
        {w && (
          <Typography variant="caption" color="text.secondary">
            浪 {fmt1(w.wave_m)}m · 風 {dirName16(w.wind_dir)} {w.wind_dir == null ? "" : `${Math.round(w.wind_dir)}° `}{kn(w.wind_ms)}kn{w.tide ? ` · ${TIDE_LABEL[w.tide]}` : ""}
          </Typography>
        )}
        {c.note && <Typography variant="body2" color="text.secondary" noWrap>{c.note}</Typography>}
      </Box>
      {photos.length > 0 && (
        // 點縮圖看大圖（不會打開編輯）
        <Box
          role="button" aria-label={`看 ${photos.length} 張照片`}
          onClick={(e) => { e.stopPropagation(); onPhotos(photos); }}
          sx={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}
        >
          <LazyImage src={photoUrl(photos[0], "thumb")} sx={{ width: 56, height: 56, borderRadius: 1.5, objectFit: "cover", display: "block" }} />
          {photos.length > 1 && (
            <Box sx={{ position: "absolute", right: 3, bottom: 3, fontSize: 11, fontWeight: 800, px: 0.6, borderRadius: 1, bgcolor: "rgba(0,0,0,0.65)", color: "#fff", lineHeight: 1.5 }}>
              +{photos.length - 1}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/** 某一天的出釣與釣獲（手機版放在全螢幕 Dialog，電腦版放在右側面板） */
export default function DayDetail({ date }: { date: string | null }) {
  const { mutate: globalMutate } = useSWRConfig();
  // 也列出前一天開始、跨過這天午夜的出釣（標示「從前一天延續」）
  const day = useApi<DayDetail>(date ? `/day?date=${date}&overnight=1` : null);
  const [tripDialog, setTripDialog] = useState<{ open: boolean; trip?: Trip | null }>({ open: false });
  const [catchDialog, setCatchDialog] = useState<{ open: boolean; trip: Trip | null; item?: Catch | null }>({ open: false, trip: null });
  const [confirmDialog, confirm] = useConfirm();
  const [viewing, setViewing] = useState<string[] | null>(null);
  const spots = useSpots();

  // 分享圖卡：把這一天所有出釣合成一張
  const shareDay = () => {
    const all = trips ?? [];
    if (!all.length || !date) return;
    const cs = all.flatMap((t) => t.catches);
    const lens = cs.filter((c) => c.species === "squid" && c.length_cm != null).map((c) => c.length_cm!);
    const startAt = Math.min(...all.map((t) => t.start_at));
    const endAt = Math.max(...all.map((t) => t.end_at));
    const evs = all
      .flatMap((t) => t.tide_events ?? [])
      .filter((e) => e.time >= startAt - 3600 && e.time <= endAt + 3600)
      .sort((a, b) => a.time - b.time);
    const tideLine = evs.map((e) => `${e.type === "high" ? "滿" : "乾"} ${dayjs.unix(e.time).format("HH:mm")}`).join(" · ");
    shareCard({
      date,
      spotName: all[0].spot_name,
      startAt,
      endAt,
      squid: cs.filter((c) => c.species === "squid").length,
      fish: cs.filter((c) => c.species === "fish").length,
      maxSquidCm: lens.length ? Math.max(...lens) : null,
      tideLine,
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

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
            {trips.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {(() => {
                  const sp = spots.data?.find((x) => x.id === trips[0].spot_id);
                  return sp && date ? <SunMoonRow lat={sp.lat} lon={sp.lon} date={date} /> : null;
                })()}
                <Button variant="outlined" startIcon={<ShareIcon />} onClick={shareDay} sx={{ alignSelf: "flex-start" }}>分享圖卡</Button>
              </Box>
            )}
            {trips.map((t) => {
              const squid = t.catches.filter((c) => c.species === "squid").length;
              const fish = t.catches.filter((c) => c.species === "fish").length;
              return (
                <Card key={t.id}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        {t.overnight ? (
                          <Chip size="small" label={`從 ${dayjs(t.date).format("M/D")} 延續（跨夜）`} sx={{ mb: 0.5, height: 22, fontSize: 11.5, fontWeight: 700, bgcolor: "rgba(167,139,250,0.16)", color: "#c4b5fd" }} />
                        ) : null}
                        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                          {hm(t.start_at)} – {hm(t.end_at)}
                          {dayjs.unix(t.end_at).format("YYYY-MM-DD") !== dayjs.unix(t.start_at).format("YYYY-MM-DD") && (
                            <Box component="span" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", ml: 0.5 }}>（隔天）</Box>
                          )}
                        </Typography>

                      </Box>
                      <IconButton size="small" onClick={() => setTripDialog({ open: true, trip: t })}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => removeTrip(t)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap", mb: 1.5 }}>
                      <Chip size="small" icon={<PlaceIcon sx={{ fontSize: "16px !important" }} />} label={t.spot_name} sx={{ fontWeight: 700 }} />
                      <Chip size="small" label={`${((t.end_at - t.start_at) / 3600).toFixed(1)} 小時`} sx={{ fontWeight: 700 }} />
                      {squid > 0 && <Chip size="small" icon={<SpeciesIcon species="squid" sx={{ fontSize: 16 }} />} label={`×${squid}`} sx={{ fontWeight: 800 }} />}
                      {fish > 0 && <Chip size="small" icon={<SpeciesIcon species="fish" sx={{ fontSize: 16 }} />} label={`×${fish}`} sx={{ fontWeight: 800 }} />}
                      {squid + fish === 0 && <Chip size="small" icon={<TurtleIcon sx={{ fontSize: 18 }} />} label="槓龜" variant="outlined" />}
                    </Box>
                    <TripConditions trip={t} />
                    <Box sx={{ mt: 1.5 }}>
                      <TideCurve events={t.tide_events ?? []} from={t.start_at} to={t.end_at} label="這趟的潮汐" />
                    </Box>
                    {t.note && <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">{t.note}</Typography>}
                    {t.catches.length > 0 && <Divider sx={{ my: 1 }} />}
                    {t.catches.map((c) => (
                      <CatchRow key={c.id} c={c} trip={t} onClick={() => setCatchDialog({ open: true, trip: t, item: c })} onPhotos={setViewing} />
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
      <PhotoViewer keys={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
