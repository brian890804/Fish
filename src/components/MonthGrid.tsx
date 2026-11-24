import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import type { CalendarDay } from "../lib/types";
import { SpeciesIcon } from "./icons";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

interface Props {
  cells: (dayjs.Dayjs | null)[];
  byDate: Map<string, CalendarDay>;
  selected?: string | null;
  onSelect: (date: string) => void;
  size?: "sm" | "lg";
}

export default function MonthGrid({ cells, byDate, selected, onSelect, size = "sm" }: Props) {
  const today = dayjs().format("YYYY-MM-DD");
  const lg = size === "lg";
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: lg ? 1 : 0.5 }}>
      {WEEK.map((w, i) => (
        <Typography key={w} variant="caption" sx={{ textAlign: "center", pb: 0.5, color: i === 0 || i === 6 ? "secondary.main" : "text.secondary" }}>{w}</Typography>
      ))}
      {cells.map((d, i) => {
        if (!d) return <Box key={i} />;
        const key = d.format("YYYY-MM-DD");
        const info = byDate.get(key);
        const isToday = key === today;
        const isSel = key === selected;
        const total = (info?.squid ?? 0) + (info?.fish ?? 0);
        return (
          <Box
            key={key}
            onClick={() => onSelect(key)}
            sx={{
              aspectRatio: lg ? "1 / 0.9" : "1 / 1.25", borderRadius: lg ? "14px" : "10px", p: lg ? 1 : 0.5, cursor: "pointer",
              display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
              bgcolor: isSel ? "rgba(79,195,247,0.22)" : info ? (total > 0 ? "rgba(79,195,247,0.12)" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.02)",
              border: isToday || isSel ? "2px solid" : "1px solid",
              borderColor: isSel ? "primary.light" : isToday ? "primary.main" : "divider",
              transition: "transform .1s, background-color .15s",
              "&:hover": lg ? { bgcolor: "rgba(79,195,247,0.16)" } : undefined,
              "&:active": { transform: "scale(0.97)" },
            }}
          >
            <Typography sx={{ fontSize: lg ? 14 : 12, fontWeight: isToday ? 800 : 500, lineHeight: 1, color: isToday ? "primary.main" : undefined }}>{d.date()}</Typography>
            {info && (
              <Box sx={{ flex: 1, display: "flex", flexDirection: lg ? "row" : "column", gap: lg ? 0.75 : 0, alignItems: "center", justifyContent: "center" }}>
                {total === 0 ? (
                  <Typography sx={{ fontSize: lg ? 13 : 11, color: "text.secondary" }}>槓龜</Typography>
                ) : (
                  <>
                    {info.squid > 0 && (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <SpeciesIcon species="squid" sx={{ fontSize: lg ? (info.fish > 0 ? 22 : 34) : 20 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: lg ? (info.fish > 0 ? 16 : 22) : 15 }}>{info.squid}</Typography>
                      </Box>
                    )}
                    {info.fish > 0 && (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <SpeciesIcon species="fish" sx={{ fontSize: lg ? (info.squid > 0 ? 20 : 30) : 16 }} />
                        <Typography sx={{ fontWeight: 700, fontSize: lg ? (info.squid > 0 ? 16 : 20) : 12 }}>{info.fish}</Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
