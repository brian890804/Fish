import { useState } from "react";
import { Box, Popover } from "@mui/material";
import { SURFACE } from "../theme";

/**
 * 點一下打開說明，點其他地方才關（不會自己消失）；打開時其他地方蓋一層淡淡的遮罩。
 * 取代 Tooltip：手機上 Tooltip 幾秒後會自動關掉，看不完。
 */
export default function InfoPopover({ children, content, label }: { children: React.ReactNode; content: React.ReactNode; label: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = (e: React.SyntheticEvent<HTMLElement>) => setAnchor(e.currentTarget);

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={open}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(e))}
        sx={{
          cursor: "pointer", borderRadius: 1.5,
          "&:hover, &:focus-visible": { bgcolor: "rgba(148,163,184,0.10)", outline: "none" },
          "&:hover .info, &:focus-visible .info": { color: "primary.main" },
        }}
      >
        {children}
      </Box>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          // 遮罩：點遮罩（其他地方）就關閉
          backdrop: { invisible: false, sx: { bgcolor: "rgba(4,7,12,0.55)", backdropFilter: "blur(1.5px)" } },
          paper: {
            sx: {
              mt: 1, p: 1.5, maxWidth: 300, borderRadius: 3, bgcolor: SURFACE.raised,
              border: `1px solid ${SURFACE.hairlineStrong}`, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            },
          },
        }}
      >
        {content}
      </Popover>
    </>
  );
}
