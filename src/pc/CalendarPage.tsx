import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Typography } from "@mui/material";
import PrevIcon from "@mui/icons-material/ChevronLeftRounded";
import NextIcon from "@mui/icons-material/ChevronRightRounded";
import dayjs from "dayjs";
import { useCalendar } from "../hooks/useCalendar";
import MonthGrid from "../components/MonthGrid";
import CatchCount from "../components/CatchCount";
import BlankCount from "../components/BlankCount";
import DayDetail from "../components/DayDetail";
import PageHeader from "./PageHeader";

export default function CalendarPage() {
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const [selected, setSelected] = useState(() => dayjs().format("YYYY-MM-DD"));
  const cal = useCalendar(month);

  return (
    <>
      <PageHeader
        title="行事曆"
        subtitle="點選日期查看或新增出釣紀錄"
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={() => setMonth(month.subtract(1, "month"))}><PrevIcon /></IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: 20, minWidth: 140, textAlign: "center" }}>{month.format("YYYY 年 M 月")}</Typography>
            <IconButton onClick={() => setMonth(month.add(1, "month"))}><NextIcon /></IconButton>
            <Button
              variant="outlined" sx={{ ml: 1 }}
              onClick={() => { setMonth(dayjs().startOf("month")); setSelected(dayjs().format("YYYY-MM-DD")); }}
            >
              今天
            </Button>
          </Box>
        }
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr", lg: "minmax(0, 1fr) 420px" }, gap: 2.5, alignItems: "start" }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 2.5, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">本月出釣</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 24 }}>{cal.totals.trips} 次</Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <CatchCount species="squid" count={cal.totals.squid} size={40} />
              {cal.totals.fish > 0 && <CatchCount species="fish" count={cal.totals.fish} size={34} />}
              <BlankCount count={cal.totals.blank} size={34} />
            </Box>
            <MonthGrid cells={cal.cells} byDate={cal.byDate} selected={selected} onSelect={setSelected} size="lg" />
          </CardContent>
        </Card>

        <Card sx={{ position: { lg: "sticky" }, top: 32, maxHeight: { lg: "calc(100vh - 64px)" }, overflow: "auto" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 2 }}>{dayjs(selected).format("M 月 D 日 dddd")}</Typography>
            <DayDetail date={selected} />
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
