import { Box, ButtonBase, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import { EGI_COLORS, egiOf } from "../../shared/egi";
import { TEXT } from "../theme";

const LAST_KEY = "fish.lastEgiColor";

/** 上一次用的木蝦顏色（記錄新釣獲時當預設） */
export function getLastEgiColor(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function setLastEgiColor(v: string | null) {
  try {
    if (v) localStorage.setItem(LAST_KEY, v);
  } catch {
    /* 私密瀏覽等情況存不進去就算了 */
  }
}

/** 一排色點，點一下選、再點一次取消；不顯示文字 */
export default function EgiColorPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: TEXT.secondary, fontWeight: 600, mb: 1 }}>木蝦顏色</Typography>
      <Box role="radiogroup" aria-label="木蝦顏色" sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
        {EGI_COLORS.map((c) => {
          const selected = value === c.key;
          return (
            <ButtonBase
              key={c.key}
              role="radio"
              aria-checked={selected}
              aria-label={c.label}
              onClick={() => onChange(selected ? null : c.key)}
              sx={{
                width: 34, height: 34, borderRadius: "50%", bgcolor: c.hex,
                boxShadow: selected ? `0 0 0 3px #0a0f16, 0 0 0 5px ${c.hex}` : "inset 0 0 0 1px rgba(0,0,0,0.25)",
                transform: selected ? "scale(1.05)" : "none", transition: "transform .12s, box-shadow .12s",
              }}
            >
              {selected && <CheckIcon sx={{ fontSize: 18, color: c.key === "yellow" || c.key === "gray" ? "#111" : "#fff" }} />}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

/** 釣獲清單裡的小色點 */
export function EgiDot({ color, size = 10 }: { color: string | null | undefined; size?: number }) {
  const c = egiOf(color);
  if (!c) return null;
  return (
    <Box
      component="span"
      title={`木蝦：${c.label}`}
      aria-label={`木蝦${c.label}色`}
      sx={{ display: "inline-block", width: size, height: size, borderRadius: "50%", bgcolor: c.hex, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.25)", flexShrink: 0 }}
    />
  );
}
