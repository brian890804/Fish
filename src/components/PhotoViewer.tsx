import { useEffect, useRef, useState } from "react";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { photoUrl } from "../lib/api";
import LazyImage from "./LazyImage";

/** 全螢幕看照片：左右滑動切換，下方顯示第幾張 */
export default function PhotoViewer({ keys, start = 0, onClose }: { keys: string[] | null; start?: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);

  // 打開時捲到指定的那張
  useEffect(() => {
    if (!keys) return;
    setIndex(start);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) el.scrollTo({ left: el.clientWidth * start });
    });
  }, [keys, start]);

  const onScroll = () => {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <Dialog fullScreen open={!!keys} onClose={onClose} slotProps={{ paper: { sx: { bgcolor: "#000", border: "none", borderRadius: 0 } } }}>
      <IconButton
        aria-label="關閉" onClick={onClose}
        sx={{ position: "absolute", top: "calc(12px + env(safe-area-inset-top))", right: 12, zIndex: 2, bgcolor: "rgba(255,255,255,0.12)" }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        ref={ref}
        onScroll={onScroll}
        sx={{ display: "flex", height: "100%", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
      >
        {(keys ?? []).map((k) => (
          <Box key={k} sx={{ flex: "0 0 100%", height: "100%", display: "grid", placeItems: "center", scrollSnapAlign: "center" }}>
            <LazyImage src={photoUrl(k)} alt="" fit="contain" sx={{ width: "100%", height: "100%", bgcolor: "transparent" }} />
          </Box>
        ))}
      </Box>
      {keys && keys.length > 1 && (
        <Box sx={{ position: "absolute", bottom: "calc(20px + env(safe-area-inset-bottom))", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 0.75 }}>
          {keys.map((k, i) => (
            <Box key={k} sx={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, bgcolor: i === index ? "#fff" : "rgba(255,255,255,0.4)", transition: "width .2s" }} />
          ))}
          <Typography sx={{ position: "absolute", right: 16, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{index + 1} / {keys.length}</Typography>
        </Box>
      )}
    </Dialog>
  );
}
