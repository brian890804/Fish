import { Box, Button, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/SpaceDashboardRounded";
import CalendarIcon from "@mui/icons-material/CalendarMonthRounded";
import InsightsIcon from "@mui/icons-material/InsightsRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import PlaceIcon from "@mui/icons-material/PlaceRounded";
import dayjs from "dayjs";
import { useToday } from "../hooks/useToday";
import { SquidIcon } from "../components/icons";
import { spinSx } from "../lib/sx";
import type { AppTab } from "../App";


const NAV: { key: AppTab; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "總覽", icon: <DashboardIcon /> },
  { key: "calendar", label: "行事曆", icon: <CalendarIcon /> },
  { key: "analysis", label: "分析", icon: <InsightsIcon /> },
  { key: "settings", label: "設定", icon: <SettingsIcon /> },
];

export const SIDEBAR_W = 248;

export default function Sidebar({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  const t = useToday();
  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_W, flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column",
        borderRight: 1, borderColor: "divider", bgcolor: "rgba(10,24,38,0.7)", backdropFilter: "blur(12px)", p: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 1.5, mb: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #0288d1, #4fc3f7)" }}>
          <SquidIcon sx={{ color: "#07121f", fontSize: 28 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>釣況紀錄</Typography>
          <Typography variant="caption" color="text.secondary">Squid Log</Typography>
        </Box>
      </Box>

      <List sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {NAV.map((n) => {
          const active = tab === n.key;
          return (
            <ListItemButton
              key={n.key}
              selected={active}
              onClick={() => onChange(n.key)}
              sx={{
                borderRadius: 2.5, py: 1.1,
                "&.Mui-selected": { bgcolor: "rgba(79,195,247,0.14)", color: "primary.main", "& .MuiListItemIcon-root": { color: "primary.main" } },
                "&.Mui-selected:hover": { bgcolor: "rgba(79,195,247,0.2)" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} slotProps={{ primary: { sx: { fontWeight: active ? 800 : 600 } } }} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ borderRadius: 3, p: 1.5, bgcolor: "rgba(255,255,255,0.04)", border: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PlaceIcon fontSize="small" color="primary" />
          <Typography sx={{ fontWeight: 700, flex: 1 }} noWrap>{t.fc.data?.spot.name ?? "…"}</Typography>
          <Tooltip title="立即更新天氣">
            <span>
              <IconButton size="small" onClick={t.refresh} disabled={t.refreshing}><RefreshIcon fontSize="small" sx={spinSx(t.refreshing)} /></IconButton>
            </span>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary" component="div">
          {t.fc.data?.updatedAt ? `預報更新 ${dayjs.unix(t.fc.data.updatedAt).format("M/D HH:mm")}` : "尚未更新"}
        </Typography>
        {t.sourceLabel && <Typography variant="caption" color="text.secondary">資料來源：{t.sourceLabel}</Typography>}
      </Box>
    </Box>
  );
}
