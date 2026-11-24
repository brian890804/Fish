import { useState } from "react";
import { Alert, Box, Button, ButtonBase, CircularProgress, Snackbar, Typography } from "@mui/material";
import { useSWRConfig } from "swr";
import dayjs from "dayjs";
import { post } from "../lib/api";
import { getPosition, nearestSpot } from "../lib/geo";
import { useSpots } from "../hooks/useSpots";
import { egiOf } from "../../shared/egi";
import { getLastEgiColor } from "./EgiColorPicker";
import { SquidIcon } from "./icons";

interface Result {
  spotName: string;
  time: number;
  egi: string | null;
  newTrip: boolean;
  located: boolean;
  date: string;
}

/**
 * 快速記一隻：一按就記「現在、軟絲、上次用的木蝦顏色」，
 * 釣點用定位找最近的，找不到就用預設釣點；胴長、照片之後再補。
 */
export default function QuickCatchButton({ onOpenDate, compact = false }: { onOpenDate: (d: string) => void; compact?: boolean }) {
  const spots = useSpots();
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const record = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const pos = await getPosition(5000);
      const near = pos && spots.data ? nearestSpot(spots.data, pos) : null;
      const egi = getLastEgiColor();
      const r = await post<{ spot: { name: string }; trip_created: boolean; catch: { caught_at: number }; date: string }>("/quick-catch", {
        spot_id: near?.spot.id,
        egi_color: egi,
      });
      if ("vibrate" in navigator) navigator.vibrate?.(60);
      setResult({ spotName: r.spot.name, time: r.catch.caught_at, egi, newTrip: r.trip_created, located: !!near, date: r.date });
      mutate((k) => typeof k === "string" && (k.startsWith("/day") || k.startsWith("/calendar") || k.startsWith("/analysis") || k.startsWith("/forecast")));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const egi = egiOf(result?.egi);

  return (
    <>
      <ButtonBase
        onClick={record}
        disabled={busy}
        aria-label="快速記一隻軟絲"
        sx={{
          width: "100%", borderRadius: 4, px: 2.5, py: compact ? 1.5 : 2.25, gap: 2, justifyContent: "flex-start",
          color: "#0a0f16", fontWeight: 800,
          background: "linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 55%, #6d28d9 100%)",
          boxShadow: "0 8px 24px -8px rgba(139,92,246,0.6)",
          transition: "transform .1s", "&:active": { transform: "scale(0.98)" },
        }}
      >
        <Box sx={{ width: compact ? 44 : 56, height: compact ? 44 : 56, borderRadius: "50%", bgcolor: "rgba(10,15,22,0.25)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          {busy ? <CircularProgress size={26} sx={{ color: "#fff" }} /> : <SquidIcon sx={{ fontSize: compact ? 36 : 46 }} />}
        </Box>
        <Box sx={{ textAlign: "left" }}>
          <Typography sx={{ fontSize: compact ? 18 : 21, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>快速記一隻</Typography>
          <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>現在・軟絲・上次的木蝦顏色</Typography>
        </Box>
      </ButtonBase>

      <Snackbar open={!!result} autoHideDuration={8000} onClose={() => setResult(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert
          severity="success" variant="filled" onClose={() => setResult(null)} sx={{ alignItems: "center", fontWeight: 700 }}
          action={
            <Button color="inherit" size="small" onClick={() => { if (result) onOpenDate(result.date); setResult(null); }} sx={{ fontWeight: 800 }}>
              補資料
            </Button>
          }
        >
          {result && (
            <>
              已記錄 {dayjs.unix(result.time).format("HH:mm")} 軟絲{egi ? `（${egi.label}色木蝦）` : ""} · {result.spotName}
              {result.newTrip ? "，開始新的一趟" : ""}
              {!result.located ? "（沒抓到定位，用預設釣點）" : ""}
            </>
          )}
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError("")}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
