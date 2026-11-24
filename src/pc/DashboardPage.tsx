import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Skeleton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import OpenIcon from "@mui/icons-material/OpenInNewRounded";
import ChevronIcon from "@mui/icons-material/ChevronRightRounded";
import dayjs from "dayjs";
import { useToday } from "../hooks/useToday";
import { useCalendar } from "../hooks/useCalendar";
import { hm, scoreColor, scoreLabel } from "../lib/format";
import { cardTitleSx } from "../lib/sx";
import ScoreRing from "../components/ScoreRing";
import ConditionsGrid from "../components/ConditionsGrid";
import CatchCount from "../components/CatchCount";
import ForecastTable from "../components/ForecastTable";
import DailyOutlook from "../components/DailyOutlook";
import { SpeciesIcon } from "../components/icons";
import PageHeader from "./PageHeader";

function greeting() {
  const h = dayjs().hour();
  if (h < 5) return "夜釣辛苦了";
  if (h < 11) return "早安";
  if (h < 17) return "午安";
  return "晚安，準備出釣了嗎";
}

export default function DashboardPage({ onOpenDate, onGoCalendar }: { onOpenDate: (d: string) => void; onGoCalendar: () => void }) {
  const t = useToday();
  const cal = useCalendar(dayjs().startOf("month"));
  const [step, setStep] = useState(3);
  const recent = [...(cal.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <>
      <PageHeader
        title={greeting()}
        subtitle={`${dayjs().format("YYYY 年 M 月 D 日 dddd")} · ${t.fc.data?.spot.name ?? ""}`}
        actions={
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => onOpenDate(t.today)}>
            {t.tripCount === 0 ? "開始今天的出釣" : "記錄釣獲"}
          </Button>
        }
      />
      {t.fc.error && <Alert severity="error" sx={{ mb: 2 }}>{String(t.fc.error.message)}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 2.5 }}>
        {/* 現在條件 */}
        <Card sx={{ gridColumn: { md: "span 12", lg: "span 8" } }}>
          <CardContent sx={{ display: "flex", gap: 3, alignItems: "stretch", p: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, minWidth: 170 }}>
              <Typography variant="overline" color="text.secondary">現在條件</Typography>
              <ScoreRing score={t.now?.score} size={130} />
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: scoreColor(t.now?.score ?? null) }}>{scoreLabel(t.now?.score ?? null)}</Typography>
              {t.fc.data && t.fc.data.historyHours < 5 && (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", maxWidth: 170 }}>
                  累積 5 小時以上的出釣紀錄後才會開始評分
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <ConditionsGrid now={t.now} columns={3} />
              {t.best.length > 0 && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="body2" color="text.secondary">今天較好的時段</Typography>
                  {t.best.map((h) => (
                    <Chip key={h.time} label={`${dayjs.unix(h.time).format("HH:mm")} · ${h.score}`} sx={{ bgcolor: scoreColor(h.score), color: "#0b1520", fontWeight: 700 }} />
                  ))}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* 今日釣獲 */}
        <Card sx={{ gridColumn: { md: "span 6", lg: "span 4" }, background: "linear-gradient(160deg, rgba(79,195,247,0.16), rgba(15,33,51,1) 60%)" }}>
          <CardContent sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Typography variant="overline" color="text.secondary">今日釣獲</Typography>
            {t.day.isLoading ? (
              <Skeleton height={80} />
            ) : t.tripCount === 0 ? (
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700 }}>今天還沒出釣</Typography>
                <Typography color="text.secondary" variant="body2">到了釣點按右上角開始記錄，海況會自動附上。</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 3, alignItems: "center", my: 2 }}>
                  <CatchCount species="squid" count={t.squid} size={64} />
                  {t.fish > 0 && <CatchCount species="fish" count={t.fish} size={48} />}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {t.day.data!.trips.map((trip) => (
                    <Typography key={trip.id} variant="body2" color="text.secondary">
                      {hm(trip.start_at)} – {hm(trip.end_at)} · {trip.spot_name} · {trip.catches.length} 隻
                    </Typography>
                  ))}
                </Box>
              </>
            )}
            <Box sx={{ flex: 1 }} />
            <Button sx={{ alignSelf: "flex-start", mt: 2 }} endIcon={<ChevronIcon />} onClick={() => onOpenDate(t.today)}>查看今天</Button>
          </CardContent>
        </Card>

        {/* 本月 */}
        <Card sx={{ gridColumn: { md: "span 6", lg: "span 4" } }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={cardTitleSx}>{dayjs().format("M 月")}戰績</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2 }}>
              <CatchCount species="squid" count={cal.totals.squid} size={48} />
              {cal.totals.fish > 0 && <CatchCount species="fish" count={cal.totals.fish} size={36} />}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <Box sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">出釣</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{cal.totals.trips} 次</Typography>
              </Box>
              <Box sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">槓龜</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{cal.totals.blank} 天</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 最近出釣 */}
        <Card sx={{ gridColumn: { md: "span 12", lg: "span 8" } }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography sx={{ ...cardTitleSx, flex: 1 }}>本月出釣</Typography>
              <Button size="small" endIcon={<ChevronIcon />} onClick={onGoCalendar} sx={{ mb: 1.5 }}>行事曆</Button>
            </Box>
            {recent.length === 0 ? (
              <Typography color="text.secondary">這個月還沒有出釣紀錄</Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1.5 }}>
                {recent.map((d) => (
                  <Box
                    key={d.date}
                    onClick={() => onOpenDate(d.date)}
                    sx={{
                      p: 1.5, borderRadius: 2.5, cursor: "pointer", border: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,0.03)",
                      transition: "all .15s", "&:hover": { borderColor: "primary.main", bgcolor: "rgba(79,195,247,0.08)" },
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{dayjs(d.date).format("M/D dd")}</Typography>
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: 0.5, minHeight: 32 }}>
                      {d.squid + d.fish === 0 ? (
                        <Typography color="text.secondary">槓龜</Typography>
                      ) : (
                        <>
                          {d.squid > 0 && <Box sx={{ display: "flex", alignItems: "center" }}><SpeciesIcon species="squid" sx={{ fontSize: 28 }} /><Typography sx={{ fontWeight: 800, fontSize: 20 }}>{d.squid}</Typography></Box>}
                          {d.fish > 0 && <Box sx={{ display: "flex", alignItems: "center" }}><SpeciesIcon species="fish" sx={{ fontSize: 24 }} /><Typography sx={{ fontWeight: 800, fontSize: 18 }}>{d.fish}</Typography></Box>}
                        </>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 未來 7 天 */}
        <Card sx={{ gridColumn: "span 12" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={cardTitleSx}>未來 7 天</Typography>
            {t.fc.data ? <DailyOutlook hours={t.fc.data.hours} /> : <Skeleton variant="rounded" height={220} />}
          </CardContent>
        </Card>

        {/* 逐時預報 */}
        <Card sx={{ gridColumn: "span 12" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
              <Typography sx={{ ...cardTitleSx, mb: 0, flex: 1 }}>逐時預報</Typography>
              {t.fc.data?.spot.wg_spot_id && (
                <Button size="small" endIcon={<OpenIcon fontSize="small" />} href={`https://www.windguru.cz/${t.fc.data.spot.wg_spot_id}`} target="_blank" rel="noreferrer">
                  溫古魯
                </Button>
              )}
              <ToggleButtonGroup size="small" exclusive value={step} onChange={(_, v) => v && setStep(v)}>
                <ToggleButton value={1}>1 小時</ToggleButton>
                <ToggleButton value={3}>3 小時</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {t.fc.data ? <ForecastTable hours={t.fc.data.hours} step={step} cellWidth={42} rowHeight={28} /> : <Skeleton variant="rounded" height={360} />}
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
