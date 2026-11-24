import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography, Skeleton, Alert, ToggleButton, ToggleButtonGroup } from "@mui/material";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import OpenIcon from "@mui/icons-material/OpenInNewRounded";
import dayjs from "dayjs";
import { useToday } from "../hooks/useToday";
import ForecastTable from "../components/ForecastTable";
import CatchCount from "../components/CatchCount";
import ConditionsGrid from "../components/ConditionsGrid";
import QuickCatchButton from "../components/QuickCatchButton";
import { spinSx } from "../lib/sx";
import { TEXT } from "../theme";

export default function TodayPage({ onOpenDate }: { onOpenDate: (d: string) => void }) {
  const t = useToday();
  const [step, setStep] = useState(2);

  return (
    <Box sx={{ px: 2, pt: 2.5, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 標題列 */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: TEXT.secondary, fontWeight: 600 }}>{dayjs().format("M月D日 dddd")}</Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{t.fc.data?.spot.name ?? "釣況"}</Typography>
          <Typography sx={{ fontSize: 12, color: TEXT.muted }}>
            {t.fc.data?.updatedAt ? `預報 ${dayjs.unix(t.fc.data.updatedAt).format("HH:mm")} 更新` : ""}
            {t.sourceLabel && ` · ${t.sourceLabel}`}
          </Typography>
        </Box>
        <IconButton onClick={t.refresh} disabled={t.refreshing} sx={{ bgcolor: "rgba(148,163,184,0.08)" }}>
          <RefreshIcon sx={spinSx(t.refreshing)} />
        </IconButton>
      </Box>

      {/* 快速記一隻：岸邊手濕、天黑時一按就記 */}
      <QuickCatchButton onOpenDate={onOpenDate} />

      {/* 今日釣獲 */}
      <Card>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, color: TEXT.secondary, fontWeight: 700, mb: 0.5 }}>今日釣獲</Typography>
            {t.day.isLoading ? (
              <Skeleton width={120} height={40} />
            ) : t.tripCount === 0 ? (
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: TEXT.secondary }}>今天還沒出釣</Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <CatchCount species="squid" count={t.squid} size={40} />
                {t.fish > 0 && <CatchCount species="fish" count={t.fish} size={36} />}
              </Box>
            )}
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => onOpenDate(t.today)} sx={{ px: 2, py: 1 }}>
            {t.tripCount === 0 ? "開始出釣" : "記錄"}
          </Button>
        </CardContent>
      </Card>

      {/* 現在條件 */}
      {t.fc.error && <Alert severity="error">{String(t.fc.error.message)}</Alert>}
      <Card>
        <CardContent>
          <ConditionsGrid now={t.now} best={t.best} historyHours={t.fc.data?.historyHours ?? 0} />
        </CardContent>
      </Card>

      {/* 一週預報 */}
      <Card>
        <CardContent sx={{ px: 0, pb: "8px !important" }}>
          <Box sx={{ display: "flex", alignItems: "center", px: 2, mb: 1.5, gap: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, flex: 1 }}>一週預報</Typography>
            <ToggleButtonGroup size="small" exclusive value={step} onChange={(_, v) => v && setStep(v)}>
              <ToggleButton value={1}>1h</ToggleButton>
              <ToggleButton value={2}>2h</ToggleButton>
              <ToggleButton value={3}>3h</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          {t.fc.data ? <ForecastTable hours={t.fc.data.hours} tideEvents={t.fc.data.tideEvents} step={step} /> : <Skeleton variant="rounded" height={360} sx={{ mx: 2 }} />}
          {t.fc.data?.spot.wg_spot_id && (
            <Button size="small" endIcon={<OpenIcon sx={{ fontSize: "16px !important" }} />} href={`https://www.windguru.cz/${t.fc.data.spot.wg_spot_id}`} target="_blank" rel="noreferrer" sx={{ mx: 1.5, mt: 1 }}>
              在溫古魯開啟
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
