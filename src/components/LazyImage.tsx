import { useLayoutEffect, useRef, useState } from "react";
import { Box, Skeleton } from "@mui/material";
import BrokenIcon from "@mui/icons-material/ImageNotSupportedRounded";
import { SURFACE, TEXT } from "../theme";

/**
 * 圖片：每次都用漸層淡入，不會突然跳出來。
 * - 還沒載入：先顯示灰色骨架
 * - 已經在快取裡：骨架直接不出現，圖片從透明慢慢變清楚
 * - 載入完成：骨架消失，圖片從透明慢慢變清楚
 */
export default function LazyImage({
  src, alt = "", sx, onClick, ariaLabel, fit = "cover",
}: { src: string; alt?: string; sx?: object; onClick?: () => void; ariaLabel?: string; fit?: "cover" | "contain" }) {
  const [skeleton, setSkeleton] = useState(true);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 已經在快取裡：不顯示骨架，等下一幀再把透明度拉到 1，這樣淡入動畫才會播
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setSkeleton(false);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
  }, [src]);

  return (
    <Box
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{ position: "relative", overflow: "hidden", bgcolor: SURFACE.raised, ...sx }}
    >
      {skeleton && !error && (
        <Skeleton variant="rectangular" animation="wave" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", bgcolor: "rgba(148,163,184,0.12)" }} />
      )}
      {error ? (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: TEXT.muted }}>
          <BrokenIcon />
        </Box>
      ) : (
        <Box
          component="img"
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setSkeleton(false);
            setShown(true);
          }}
          onError={() => setError(true)}
          sx={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block",
            opacity: shown ? 1 : 0, transition: "opacity .3s ease",
          }}
        />
      )}
    </Box>
  );
}
