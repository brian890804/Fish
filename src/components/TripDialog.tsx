import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Alert, Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import dayjs from "dayjs";
import { post, put } from "../lib/api";
import type { Trip } from "../lib/types";
import { useSpots } from "../hooks/useSpots";
import { getPosition, nearestSpot } from "../lib/geo";
import type { Species } from "../lib/types";
import { SpeciesIcon } from "./icons";

/** 新增出釣的預設時間：軟絲傍晚到前半夜、魚清晨到上午 */
const DEFAULT_HOURS: Record<Species, { start: string; end: string }> = {
  squid: { start: "17:30", end: "21:30" },
  fish: { start: "04:30", end: "10:30" },
};

interface Props {
  open: boolean;
  date: string;
  trip?: Trip | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripDialog({ open, date, trip, onClose, onSaved }: Props) {
  const spots = useSpots();
  const [spotId, setSpotId] = useState<number | "">("");
  const [day, setDay] = useState(date);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("22:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Species>("squid");
  // 自己改過時間後，切換軟絲／魚就不覆蓋
  const [timesTouched, setTimesTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (trip) {
      setSpotId(trip.spot_id);
      setDay(trip.date);
      setStart(dayjs.unix(trip.start_at).format("HH:mm"));
      setEnd(dayjs.unix(trip.end_at).format("HH:mm"));
      setNote(trip.note ?? "");
    } else {
      setSpotId("");
      setDay(date);
      // 預設釣軟絲：17:30–21:30
      setTarget("squid");
      setStart(DEFAULT_HOURS.squid.start);
      setEnd(DEFAULT_HOURS.squid.end);
      setTimesTouched(false);
      setNote("");
      setNearHint("");
    }
  }, [open, trip, date]);

  // 新增今天的出釣時，用定位自動選最近的釣點（使用者自己選過就不覆蓋）
  const [nearHint, setNearHint] = useState("");
  useEffect(() => {
    if (!open || trip || date !== dayjs().format("YYYY-MM-DD") || !spots.data) return;
    let cancelled = false;
    getPosition(5000).then((pos) => {
      if (cancelled || !pos || !spots.data) return;
      const near = nearestSpot(spots.data, pos);
      if (!near) return;
      setSpotId((cur) => (cur === "" ? near.spot.id : cur));
      setNearHint(`依定位選擇（距離約 ${near.km < 1 ? `${Math.round(near.km * 1000)} 公尺` : `${near.km.toFixed(1)} 公里`}）`);
    });
    return () => {
      cancelled = true;
    };
  }, [open, trip, date, spots.data]);

  const defaultSpot = (spots.data?.find((s) => s.is_default) ?? spots.data?.[0])?.id ?? "";
  const effectiveSpot = spotId === "" ? defaultSpot : spotId;

  const save = async () => {
    const s = dayjs(`${day}T${start}`);
    let e = dayjs(`${day}T${end}`);
    if (!e.isAfter(s)) e = e.add(1, "day"); // 跨過午夜
    const payload = { spot_id: effectiveSpot || undefined, start_at: s.unix(), end_at: e.unix(), note: note || null };
    setBusy(true);
    setError("");
    try {
      if (trip) await put(`/trips/${trip.id}`, payload);
      else await post("/trips", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{trip ? "編輯出釣" : "新增出釣"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!trip && (
            <Box>
              <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600, mb: 0.75 }}>這趟主要釣（決定預設時間）</Typography>
              <ToggleButtonGroup
                exclusive fullWidth value={target}
                onChange={(_, v: Species | null) => {
                  if (!v) return;
                  setTarget(v);
                  if (!timesTouched) {
                    setStart(DEFAULT_HOURS[v].start);
                    setEnd(DEFAULT_HOURS[v].end);
                  }
                }}
              >
                <ToggleButton value="squid" sx={{ gap: 1, py: 1 }}>
                  <SpeciesIcon species="squid" sx={{ fontSize: 28 }} />
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    <span>軟絲</span>
                    <Typography component="span" sx={{ fontSize: 11, opacity: 0.7 }}>17:30–21:30</Typography>
                  </Box>
                </ToggleButton>
                <ToggleButton value="fish" sx={{ gap: 1, py: 1 }}>
                  <SpeciesIcon species="fish" sx={{ fontSize: 28 }} />
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    <span>魚</span>
                    <Typography component="span" sx={{ fontSize: 11, opacity: 0.7 }}>04:30–10:30</Typography>
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
          <TextField select label="地點" value={effectiveSpot} onChange={(e) => { setSpotId(Number(e.target.value)); setNearHint(""); }} helperText={nearHint || " "}>
            {(spots.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField type="date" label="日期" value={day} onChange={(e) => setDay(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField type="time" label="開始" value={start} onChange={(e) => { setStart(e.target.value); setTimesTouched(true); }} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" label="結束" value={end} onChange={(e) => { setEnd(e.target.value); setTimesTouched(true); }} fullWidth slotProps={{ inputLabel: { shrink: true } }} helperText={end <= start ? "隔天" : " "} />
          </Box>
          <TextField label="備註" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} placeholder="水色、餌木顏色、釣法…" />
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={save} disabled={busy}>儲存</Button>
      </DialogActions>
    </Dialog>
  );
}
