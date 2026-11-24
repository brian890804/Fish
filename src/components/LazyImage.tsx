import { useState } from "react";
import { Box, Skeleton } from "@mui/material";
import BrokenIcon from "@mui/icons-material/ImageNotSupportedRounded";
import { SURFACE, TEXT } from "../theme";

/**
 * 圖片：載入前先顯示灰色佔位（骨架），載入完成淡入；失敗顯示圖示。
 * 用在照片縮圖、大圖，避免畫面一片空白、一張一張跳出來。
 */
export default function LazyImage({
  src, alt = "", sx, onClick, ariaLabel, fit = "cover",
}: { src: string; alt?: string; sx?: object; onClick?: () => void; ariaLabel?: string; fit?: "cover" | "contain" }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <Box
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{ position: "relative", overflow: "hidden", bgcolor: SURFACE.raised, ...sx }}
    >
      {state === "loading" && (
        <Skeleton variant="rectangular" animation="wave" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", bgcolor: "rgba(148,163,184,0.12)" }} />
      )}
      {state === "error" ? (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: TEXT.muted }}>
          <BrokenIcon />
        </Box>
      ) : (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          sx={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block",
            opacity: state === "ok" ? 1 : 0, transition: "opacity .25s ease",
          }}
        />
      )}
    </Box>
  );
}
