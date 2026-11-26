import { useStoredState } from "../lib/prefs";
import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography, Skeleton, Alert, ToggleButton, ToggleButtonGroup } from "@mui/material";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import OpenIcon from "@mui/icons-material/OpenInNewRounded";
import dayjs from "dayjs";
import { useToday } from "../hooks/useToday";
import ForecastTable from "../components/ForecastTable";
import { SpeciesIcon } from "../components/icons";
import SpotPicker from "../components/SpotPicker";
import CatchCount from "../components/CatchCount";
import ConditionsGrid from "../components/ConditionsGrid";
import SunMoonRow from "../components/SunMoonRow";
import TideCurve from "../components/TideCurve";
import { spinSx } from "../lib/sx";
import { TEXT } from "../theme";

export default function TodayPage({ onOpenDate }: { onOpenDate: (d: string) => void }) {
  const t = useToday();
  const [step, setStep] = useStoredState<number>("fish.forecastStep", 2);

  return (
    <Box sx={{ px: 2, pt: 2.5, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 標題列 */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: TEXT.secondary, fontWeight: 600 }}>{dayjs().format("M月D日 dddd")}</Typography>
          <SpotPicker spots={t.spots} value={t.spot} onChange={t.setSpotId} />
          <Typography sx={{ fontSize: 12, color: TEXT.muted }}>
            {t.fc.data?.updatedAt ? `預報 ${dayjs.unix(t.fc.data.updatedAt).format("HH:mm")} 更新` : ""}
            {t.spot && t.fc.data && t.fc.data.spot.id !== t.spot.id && ` · 天氣：${t.fc.data.spot.name}`}
            {t.sourceLabel && ` · ${t.sourceLabel}`}
          </Typography>
        </Box>
        <IconButton onClick={t.refresh} disabled={t.refreshing} sx={{ bgcolor: "rgba(148,163,184,0.08)" }}>
          <RefreshIcon sx={spinSx(t.refreshing)} />
        </IconButton>
      </Box>

      {/* 看哪一種的評分：軟絲或魚（整個今天頁都跟著這個切換） */}
      <ToggleButtonGroup size="small" exclusive fullWidth value={t.species} onChange={(_, v) => v && t.setSpecies(v)}>
        <ToggleButton value="squid"><SpeciesIcon species="squid" sx={{ fontSize: 18, mr: 0.75 }} />軟絲</ToggleButton>
        <ToggleButton value="fish"><SpeciesIcon species="fish" sx={{ fontSize: 18, mr: 0.75 }} />魚</ToggleButton>
      </ToggleButtonGroup>

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

      {/* 日出日落、未來 36 小時潮汐 */}
      {t.fc.data && (
        <Card>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <SunMoonRow lat={t.fc.data.spot.lat} lon={t.fc.data.spot.lon} date={t.today} />
            <TideCurve
              events={t.fc.data.tideEvents ?? []}
              from={dayjs().startOf("hour").unix()}
              to={dayjs().startOf("hour").unix() + 36 * 3600}
              label="未來 36 小時潮汐"
            />
          </CardContent>
        </Card>
      )}

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
          {t.fc.data ? <ForecastTable hours={t.hours} tideEvents={t.fc.data.tideEvents} step={step} /> : <Skeleton variant="rounded" height={360} sx={{ mx: 2 }} />}
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
