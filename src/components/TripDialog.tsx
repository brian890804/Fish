import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Alert, Box } from "@mui/material";
import dayjs from "dayjs";
import { post, put } from "../lib/api";
import type { Trip } from "../lib/types";
import { useSpots } from "../hooks/useSpots";

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
      // 今天的話預設從現在開始，否則預設傍晚
      const isToday = date === dayjs().format("YYYY-MM-DD");
      const s = isToday ? dayjs().minute(dayjs().minute() < 30 ? 0 : 30) : dayjs(`${date}T18:00`);
      setStart(s.format("HH:mm"));
      setEnd(s.add(3, "hour").format("HH:mm"));
      setNote("");
    }
  }, [open, trip, date]);

  const defaultSpot = spots.data?.[0]?.id ?? "";
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
          <TextField select label="地點" value={effectiveSpot} onChange={(e) => setSpotId(Number(e.target.value))}>
            {(spots.data ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField type="date" label="日期" value={day} onChange={(e) => setDay(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField type="time" label="開始" value={start} onChange={(e) => setStart(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="time" label="結束" value={end} onChange={(e) => setEnd(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} helperText={end <= start ? "隔天" : " "} />
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
