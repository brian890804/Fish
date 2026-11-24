import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography, Chip, Skeleton, Alert, ToggleButton, ToggleButtonGroup } from "@mui/material";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import dayjs from "dayjs";
import { useToday } from "../hooks/useToday";
import { scoreColor, scoreLabel } from "../lib/format";
import ForecastTable from "../components/ForecastTable";
import CatchCount from "../components/CatchCount";
import ScoreRing from "../components/ScoreRing";
import ConditionsGrid from "../components/ConditionsGrid";
import { spinSx } from "../lib/sx";

export default function TodayPage({ onOpenDate }: { onOpenDate: (d: string) => void }) {
  const t = useToday();
  const [step, setStep] = useState(2);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{t.fc.data?.spot.name ?? "釣況"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {dayjs().format("M/D dddd")}
            {t.fc.data?.updatedAt ? ` · 預報更新 ${dayjs.unix(t.fc.data.updatedAt).format("HH:mm")}` : ""}
            {t.sourceLabel && ` · ${t.sourceLabel}`}
          </Typography>
        </Box>
        <IconButton onClick={t.refresh} disabled={t.refreshing}><RefreshIcon sx={spinSx(t.refreshing)} /></IconButton>
      </Box>

      <Card>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">今日釣獲</Typography>
            {t.day.isLoading ? (
              <Skeleton width={120} height={44} />
            ) : t.tripCount === 0 ? (
              <Typography color="text.secondary">今天還沒出釣</Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <CatchCount species="squid" count={t.squid} size={40} />
                {t.fish > 0 && <CatchCount species="fish" count={t.fish} size={40} />}
              </Box>
            )}
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => onOpenDate(t.today)}>
            {t.tripCount === 0 ? "開始出釣" : "記錄"}
          </Button>
        </CardContent>
      </Card>

      {t.fc.error && <Alert severity="error">{String(t.fc.error.message)}</Alert>}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
            <ScoreRing score={t.now?.score} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" color="text.secondary">現在條件</Typography>
              <Typography sx={{ fontWeight: 700, color: scoreColor(t.now?.score ?? null) }}>{scoreLabel(t.now?.score ?? null)}</Typography>
              {t.fc.data && t.fc.data.historyHours < 5 && (
                <Typography variant="caption" color="text.secondary">累積 5 小時以上的出釣紀錄後才會開始評分</Typography>
              )}
            </Box>
          </Box>
          <ConditionsGrid now={t.now} />
          {t.best.length > 0 && (
            <Box sx={{ mt: 1.5, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary">今天較好的時段</Typography>
              {t.best.map((h) => (
                <Chip key={h.time} size="small" label={`${dayjs.unix(h.time).format("HH:mm")} · ${h.score}`} sx={{ bgcolor: scoreColor(h.score), color: "#0b1520", fontWeight: 700 }} />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>一週預報</Typography>
          <ToggleButtonGroup size="small" exclusive value={step} onChange={(_, v) => v && setStep(v)}>
            <ToggleButton value={1}>1h</ToggleButton>
            <ToggleButton value={2}>2h</ToggleButton>
            <ToggleButton value={3}>3h</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {t.fc.data ? <ForecastTable hours={t.fc.data.hours} step={step} /> : <Skeleton variant="rounded" height={320} />}
        {t.fc.data?.spot.wg_spot_id && (
          <Button size="small" href={`https://www.windguru.cz/${t.fc.data.spot.wg_spot_id}`} target="_blank" rel="noreferrer" sx={{ mt: 1 }}>
            在溫古魯開啟 ↗
          </Button>
        )}
      </Box>
    </Box>
  );
}
