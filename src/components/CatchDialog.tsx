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
import EgiColorPicker from "./EgiColorPicker";
import PhotoViewer from "./PhotoViewer";
import { useConfirm } from "./useConfirm";

interface Props {
  open: boolean;
  trip: Trip | null;
  item?: Catch | null;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_PHOTOS = 6;
const PHOTO_TYPES = "image/jpeg,image/png,image/heic,image/heif,image/webp";

const numOrNull = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

export default function CatchDialog({ open, trip, item, onClose, onSaved }: Props) {
  const [species, setSpecies] = useState<Species>("squid");
  const [time, setTime] = useState("");
  const [length, setLength] = useState("");
  const [weight, setWeight] = useState("");
  const [fishName, setFishName] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [viewer, setViewer] = useState<{ keys: string[]; start: number } | null>(null);
  const [egiColor, setEgiColor] = useState<string | null>(null);
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
      setPhotos(item.photo_keys?.length ? item.photo_keys : item.photo_key ? [item.photo_key] : []);
      setEgiColor(item.egi_color ?? null);
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
      setPhotos([]);
      // 木蝦顏色預設不選（常常會忘記用了哪支，不要自動帶）
      setEgiColor(null);
    }
  }, [open, item, trip]);

  if (!trip) return null;

  const caughtAt = () => {
    let t = dayjs(`${trip.date}T${time}`);
    // 出釣跨過午夜，時間比開始時間早就是隔天
    if (t.unix() < trip.start_at - 3600 && dayjs.unix(trip.end_at).format("YYYY-MM-DD") !== trip.date) t = t.add(1, "day");
    return t.unix();
  };

  // 一次可以選多張，一張一張壓縮上傳，最多 6 張
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setError(`一筆最多 ${MAX_PHOTOS} 張，只會上傳前 ${room} 張`);
    else setError("");
    const todo = files.slice(0, Math.max(0, room));
    setUploading(true);
    setUploadingCount(todo.length);
    try {
      for (const file of todo) {
        const key = await uploadPhoto(file);
        setPhotos((p) => [...p, key]);
        setUploadingCount((n) => n - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      setUploadingCount(0);
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
      photo_keys: photos,
      egi_color: egiColor,
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
          <EgiColorPicker value={egiColor} onChange={setEgiColor} />
          <TextField label="備註" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} placeholder="餌木、釣法、水深…" />

          {/* 限定照片格式（不用 image/*），Android 會直接開相簿；iPhone 的選單由 Safari 決定，第一個是「照片圖庫」 */}
          <input ref={fileRef} type="file" accept={PHOTO_TYPES} multiple hidden onChange={onFile} />
          {photos.length > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {photos.map((k, i) => (
                <Box key={k} sx={{ position: "relative", aspectRatio: "1", borderRadius: 2, overflow: "hidden", bgcolor: "rgba(148,163,184,0.1)" }}>
                  <Box
                    component="img" src={photoUrl(k, "thumb")} alt={`第 ${i + 1} 張照片`} role="button"
                    onClick={() => setViewer({ keys: photos, start: i })}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "zoom-in" }}
                  />
                  {i === 0 && (
                    <Box sx={{ position: "absolute", left: 6, bottom: 6, fontSize: 10.5, fontWeight: 800, px: 0.75, py: 0.1, borderRadius: 1, bgcolor: "rgba(0,0,0,0.6)", color: "#fff" }}>封面</Box>
                  )}
                  <IconButton
                    size="small" aria-label="刪除這張照片" onClick={() => setPhotos((p) => p.filter((x) => x !== k))}
                    sx={{ position: "absolute", top: 4, right: 4, width: 26, height: 26, bgcolor: "rgba(0,0,0,0.6)", "&:hover": { bgcolor: "rgba(0,0,0,0.8)" } }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
              {Array.from({ length: uploadingCount }, (_, i) => (
                <Box key={`up-${i}`} sx={{ aspectRatio: "1", borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "rgba(148,163,184,0.1)" }}>
                  <CircularProgress size={22} />
                </Box>
              ))}
            </Box>
          )}
          {photos.length < MAX_PHOTOS && (
            <Button variant="outlined" startIcon={uploading ? <CircularProgress size={18} /> : <PhotoIcon />} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "上傳中…" : photos.length ? `再加照片（${photos.length}/${MAX_PHOTOS}）` : "加照片（可一次選多張）"}
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
    <PhotoViewer keys={viewer?.keys ?? null} start={viewer?.start ?? 0} onClose={() => setViewer(null)} />
    </>
  );
}
