import { useState } from "react";
import { Box, IconButton, Typography, Card, CardContent } from "@mui/material";
import PrevIcon from "@mui/icons-material/ChevronLeftRounded";
import NextIcon from "@mui/icons-material/ChevronRightRounded";
import dayjs from "dayjs";
import { useCalendar } from "../hooks/useCalendar";
import MonthGrid from "../components/MonthGrid";
import MonthSummary from "../components/MonthSummary";

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
        <CardContent sx={{ py: "12px !important" }}>
          <MonthSummary totals={cal.totals} />
        </CardContent>
      </Card>
      <MonthGrid cells={cal.cells} byDate={cal.byDate} onSelect={onOpenDate} />
    </Box>
  );
}
