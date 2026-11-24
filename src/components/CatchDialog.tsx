import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  InputAdornment, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import PhotoIcon from "@mui/icons-material/AddAPhotoRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import dayjs from "dayjs";
import { del, photoUrl, post, put, uploadPhoto } from "../lib/api";
import type { Catch, Species, Trip } from "../lib/types";
import { SpeciesIcon } from "./icons";
import { useConfirm } from "./useConfirm";

interface Props {
  open: boolean;
  trip: Trip | null;
  item?: Catch | null;
  onClose: () => void;
  onSaved: () => void;
}

const numOrNull = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export default function CatchDialog({ open, trip, item, onClose, onSaved }: Props) {
  const [species, setSpecies] = useState<Species>("squid");
  const [time, setTime] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [fishName, setFishName] = useState("");
  const [note, setNote] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDialog, confirm] = useConfirm();

  useEffect(() => {
    if (!open || !trip) return;
    setError("");
    if (item) {
      setSpecies(item.species);
      setTime(dayjs.unix(item.caught_at).format("HH:mm"));
      setLength(item.length_cm?.toString() ?? "");
      setWeight(item.weight_g?.toString() ?? "");
      setFishName(item.fish_name ?? "");
      setNote(item.note ?? "");
      setPhotoKey(item.photo_key);
    } else {
      // 正在出釣中就預設現在時間，否則預設出釣開始時間
      const now = dayjs().unix();
      const t = now >= trip.start_at - 3600 && now <= trip.end_at + 3 * 3600 ? now : trip.start_at;
      setSpecies("squid");
      setTime(dayjs.unix(t).format("HH:mm"));
      setLength("");
      setWeight("");
      setFishName("");
      setNote("");
      setPhotoKey(null);
    }
  }, [open, item, trip]);

  if (!trip) return null;

  const caughtAt = () => {
    let t = dayjs(`${trip.date}T${time}`);
    // 出釣跨過午夜，時間比開始時間早就是隔天
    if (t.unix() < trip.start_at - 3600 && dayjs.unix(trip.end_at).format("YYYY-MM-DD") !== trip.date) t = t.add(1, "day");
    return t.unix();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setPhotoKey(await uploadPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!time) return setError("請填時間");
    const payload = {
      trip_id: trip.id,
      caught_at: caughtAt(),
      species,
      fish_name: species === "fish" ? fishName || null : null,
      length_cm: numOrNull(length),
      weight_g: numOrNull(weight),
      note: note || null,
      photo_key: photoKey,
    };
    setBusy(true);
    setError("");
    try {
      if (item) await put(`/catches/${item.id}`, payload);
      else await post("/catches", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!item || !(await confirm({ title: "刪除這筆釣獲？", message: "刪除後無法復原，照片也會一起刪除。" }))) return;
    setBusy(true);
    setError("");
    try {
      await del(`/catches/${item.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>{item ? "編輯釣獲" : "記錄釣獲"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth value={species} onChange={(_, v) => v && setSpecies(v)}>
            <ToggleButton value="squid" sx={{ gap: 1, py: 1.5 }}>
              <SpeciesIcon species="squid" sx={{ fontSize: 32 }} />
              <Typography sx={{ fontWeight: 700 }}>軟絲</Typography>
            </ToggleButton>
            <ToggleButton value="fish" sx={{ gap: 1, py: 1.5 }}>
              <SpeciesIcon species="fish" sx={{ fontSize: 32 }} />
              <Typography sx={{ fontWeight: 700 }}>魚</Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          {species === "fish" && <TextField label="魚名" value={fishName} onChange={(e) => setFishName(e.target.value)} placeholder="例如：黑鯛" />}

          <TextField type="time" label="釣到時間" value={time} onChange={(e) => setTime(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={species === "squid" ? "胴長" : "全長"} value={length} onChange={(e) => setLength(e.target.value)} fullWidth
              slotProps={{ htmlInput: { inputMode: "decimal" }, input: { endAdornment: <InputAdornment position="end">cm</InputAdornment> } }}
              helperText={species === "squid" ? "不含觸手，身體前緣到尾端" : " "}
            />
            <TextField
              label="重量" value={weight} onChange={(e) => setWeight(e.target.value)} fullWidth
              slotProps={{ htmlInput: { inputMode: "decimal" }, input: { endAdornment: <InputAdornment position="end">g</InputAdornment> } }}
              helperText="選填"
            />
          </Box>
          <TextField label="備註" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} placeholder="餌木、釣法、水深…" />

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          {photoKey ? (
            <Box sx={{ position: "relative" }}>
              <Box component="img" src={photoUrl(photoKey)} sx={{ width: "100%", borderRadius: 2, maxHeight: 280, objectFit: "cover" }} />
              <IconButton size="small" onClick={() => setPhotoKey(null)} sx={{ position: "absolute", top: 8, right: 8, bgcolor: "rgba(0,0,0,0.6)" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Button variant="outlined" startIcon={uploading ? <CircularProgress size={18} /> : <PhotoIcon />} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "上傳中…" : "加照片"}
            </Button>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        {item && <Button color="error" onClick={remove} disabled={busy} sx={{ mr: "auto" }}>刪除</Button>}
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={save} disabled={busy || uploading}>儲存</Button>
      </DialogActions>
    </Dialog>
    {confirmDialog}
    </>
  );
}
