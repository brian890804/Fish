import { Box, Typography } from "@mui/material";
import SunIcon from "@mui/icons-material/WbSunnyRounded";
import MoonIcon from "@mui/icons-material/NightsStayRounded";
import dayjs from "dayjs";
import { getTimes, getMoonTimes } from "suncalc";
import { TEXT, SURFACE } from "../theme";

/** 日出、日落、月升、月落（依釣點座標與日期計算，不用 API） */
export default function SunMoonRow({ lat, lon, date }: { lat: number; lon: number; date: string }) {
  const d = new Date(`${date}T12:00:00+08:00`);
  const sun = getTimes(d, lat, lon);
  const moon = getMoonTimes(d, lat, lon, false);
  const f = (x?: Date) => (x && !Number.isNaN(x.getTime()) ? dayjs(x).format("HH:mm") : "—");
  const items = [
    { icon: <SunIcon sx={{ fontSize: 16, color: "#fbbf24" }} />, label: "日出", value: f(sun.sunrise) },
    { icon: <SunIcon sx={{ fontSize: 16, color: "#fb923c" }} />, label: "日落", value: f(sun.sunset) },
    { icon: <MoonIcon sx={{ fontSize: 16, color: "#e2e8f0" }} />, label: "月升", value: f(moon.rise) },
    { icon: <MoonIcon sx={{ fontSize: 16, color: "#94a3b8" }} />, label: "月落", value: f(moon.set) },
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.75 }}>
      {items.map((it) => (
        <Box key={it.label} sx={{ bgcolor: SURFACE.raised, borderRadius: 2, px: 1, py: 0.75, textAlign: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            {it.icon}
            <Typography sx={{ fontSize: 11, color: TEXT.secondary, fontWeight: 700 }}>{it.label}</Typography>
          </Box>
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{it.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}
