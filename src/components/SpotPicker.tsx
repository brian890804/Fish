import { useState } from "react";
import { ButtonBase, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import ExpandIcon from "@mui/icons-material/ExpandMoreRounded";
import type { Spot } from "../lib/types";
import { TEXT } from "../theme";

/**
 * 首頁標題的釣點選擇：點釣點名稱就能換成別的釣點看預報。
 * 共用天氣的釣點會註明用的是哪裡的天氣。
 */
export default function SpotPicker({
  spots, value, onChange, fontSize = 26,
}: { spots: Spot[]; value: Spot | null; onChange: (id: number) => void; fontSize?: number }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="選擇要看的釣點"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, borderRadius: 1.5, px: 0.5, ml: -0.5, maxWidth: "100%" }}
      >
        <Typography sx={{ fontSize, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 }} noWrap>{value?.name ?? "釣況"}</Typography>
        <ExpandIcon sx={{ fontSize: fontSize * 0.9, color: TEXT.secondary, flexShrink: 0 }} />
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {spots.map((s) => {
          const src = spots.find((x) => x.id === s.weather_spot_id);
          return (
            <MenuItem key={s.id} selected={s.id === value?.id} onClick={() => { onChange(s.id); setAnchor(null); }}>
              <ListItemText
                primary={s.name}
                secondary={src ? `天氣：${src.name}` : s.wg_spot_id ? "天氣：自己抓（溫古魯）" : "天氣：自己抓"}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
