import { useState } from "react";
import { Box, IconButton, Typography, Card, CardContent } from "@mui/material";
import PrevIcon from "@mui/icons-material/ChevronLeftRounded";
import NextIcon from "@mui/icons-material/ChevronRightRounded";
import dayjs from "dayjs";
import { useCalendar } from "../hooks/useCalendar";
import CatchCount from "../components/CatchCount";
import MonthGrid from "../components/MonthGrid";
import BlankCount from "../components/BlankCount";

export default function CalendarPage({ onOpenDate }: { onOpenDate: (d: string) => void }) {
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const cal = useCalendar(month);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <IconButton onClick={() => setMonth(month.subtract(1, "month"))}><PrevIcon /></IconButton>
        <Typography variant="h6" sx={{ flex: 1, textAlign: "center" }}>{month.format("YYYY 年 M 月")}</Typography>
        <IconButton onClick={() => setMonth(month.add(1, "month"))}><NextIcon /></IconButton>
      </Box>
      <Card>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: "12px !important" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">本月出釣</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{cal.totals.trips} 次</Typography>
          </Box>
          <CatchCount species="squid" count={cal.totals.squid} size={34} />
          {cal.totals.fish > 0 && <CatchCount species="fish" count={cal.totals.fish} size={34} />}
          <BlankCount count={cal.totals.blank} size={30} />
        </CardContent>
      </Card>
      <MonthGrid cells={cal.cells} byDate={cal.byDate} onSelect={onOpenDate} />
    </Box>
  );
}
