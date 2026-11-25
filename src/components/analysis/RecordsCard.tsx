import { Box, ButtonBase, Card, CardContent, Skeleton, Typography } from "@mui/material";
import ChevronIcon from "@mui/icons-material/ChevronRightRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import dayjs from "dayjs";
import { photoUrl, useApi } from "../../lib/api";
import { TEXT, SURFACE } from "../../theme";
import { EgiDot } from "../EgiColorPicker";
import LazyImage from "../LazyImage";
import { SpeciesIcon } from "../icons";
import PhotoViewer from "../PhotoViewer";
import { useState } from "react";

interface Records {
  top: { id: number; caught_at: number; length_cm: number; weight_g: number | null; egi_color: string | null; photo_key: string | null; photo_keys?: string[]; date: string; spot_name: string }[];
  months: { month: string; catches: number; measured: number; avg_cm: number | null; max_cm: number | null; trips: number }[];
}

const MEDAL = ["#fbbf24", "#cbd5e1", "#d97706"];

/**
 * 個人紀錄：最大隻排行＋每月平均胴長與數量（看季節性）。
 * species：看軟絲或魚的紀錄（跟分析頁上方的篩選一致）。
 * 點縮圖直接看照片；點其他地方打開那天的出釣紀錄（onOpenDate）。
 */
export default function RecordsCard({ onOpenDate, species = "squid" }: { onOpenDate?: (date: string) => void; species?: "squid" | "fish" }) {
  const { data } = useApi<Records>(`/records?species=${species}`);
  const [viewing, setViewing] = useState<string[] | null>(null);
  const label = species === "fish" ? "魚" : "軟絲";

  if (!data) return <Skeleton variant="rounded" height={260} sx={{ borderRadius: 4 }} />;
  const months = data.months.slice(-12);
  const maxCm = Math.max(...months.map((m) => m.max_cm ?? 0), 1);
  const maxCount = Math.max(...months.map((m) => m.catches), 1);

  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">{label}紀錄</Typography>

        {/* 最大隻排行 */}
        {data.top.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>還沒有量過長度的{label}。記錄時填上長度，這裡就會出現你的最大隻排行。</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {data.top.map((c, i) => {
              const photos = c.photo_keys?.length ? c.photo_keys : c.photo_key ? [c.photo_key] : [];
              return (
              <Box
                key={c.id}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, p: 1, borderRadius: 2.5, width: "100%",
                  bgcolor: i === 0 ? "rgba(251,191,36,0.08)" : SURFACE.raised,
                  transition: "background-color .15s",
                  "&:hover": { bgcolor: i === 0 ? "rgba(251,191,36,0.14)" : "rgba(148,163,184,0.14)" },
                }}
              >
                <Box sx={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {i < 3 ? <EmojiEventsIcon sx={{ color: MEDAL[i], fontSize: 24 }} /> : <Typography sx={{ fontWeight: 800, color: TEXT.secondary }}>{i + 1}</Typography>}
                </Box>
                {photos.length > 0 ? (
                  // 點縮圖：直接全螢幕看照片（不會跳去那天）
                  <ButtonBase
                    onClick={() => setViewing(photos)}
                    aria-label={`看 ${photos.length} 張照片`}
                    sx={{ position: "relative", width: 44, height: 44, borderRadius: 1.5, overflow: "hidden", flexShrink: 0 }}
                  >
                    <LazyImage src={photoUrl(photos[0], "thumb")} sx={{ width: 44, height: 44, objectFit: "cover", display: "block" }} />
                    {photos.length > 1 && (
                      <Box sx={{ position: "absolute", right: 2, bottom: 2, fontSize: 10, fontWeight: 800, px: 0.5, borderRadius: 1, bgcolor: "rgba(0,0,0,0.65)", color: "#fff", lineHeight: 1.5 }}>
                        +{photos.length - 1}
                      </Box>
                    )}
                  </ButtonBase>
                ) : (
                  <Box sx={{ width: 44, height: 44, display: "grid", placeItems: "center", flexShrink: 0 }}><SpeciesIcon species={species} sx={{ fontSize: 36 }} /></Box>
                )}
                {/* 點其他地方：打開那天的出釣紀錄 */}
                <ButtonBase
                  onClick={() => onOpenDate?.(c.date)}
                  disabled={!onOpenDate}
                  aria-label={`打開 ${dayjs(c.date).format("M/D")} 的出釣紀錄`}
                  sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, textAlign: "left", justifyContent: "flex-start", borderRadius: 1.5, "&:active": { transform: "scale(0.99)" } }}
                >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: i === 0 ? 22 : 18, lineHeight: 1.1 }}>{c.length_cm} cm</Typography>
                    {c.weight_g != null && <Typography sx={{ fontSize: 12.5, color: TEXT.secondary }}>{c.weight_g} g</Typography>}
                    <EgiDot color={c.egi_color} size={10} />
                  </Box>
                  <Typography sx={{ fontSize: 12, color: TEXT.secondary }} noWrap>
                    {dayjs(c.date).format("YYYY/M/D")} {dayjs.unix(c.caught_at).format("HH:mm")} · {c.spot_name}
                  </Typography>
                </Box>
                {onOpenDate && <ChevronIcon sx={{ color: TEXT.muted, flexShrink: 0 }} />}
                </ButtonBase>
              </Box>
              );
            })}
          </Box>
        )}

        {/* 每月趨勢 */}
        {months.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.5 }}>每月趨勢</Typography>
            <Typography sx={{ fontSize: 12, color: TEXT.secondary, mb: 1.5 }}>
              紫色是平均胴長、淺色是最大隻、下方是釣到幾隻／出釣幾次，可以看出幾月開始出大隻。
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", overflowX: "auto", pb: 0.5 }}>
              {months.map((m) => (
                <Box key={m.month} sx={{ minWidth: 40, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800 }}>{m.avg_cm ?? "-"}</Typography>
                  <Box sx={{ position: "relative", width: 22, height: 110, display: "flex", alignItems: "flex-end" }}>
                    {/* 最大隻 */}
                    <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${((m.max_cm ?? 0) / maxCm) * 100}%`, bgcolor: "rgba(167,139,250,0.25)", borderRadius: 1 }} />
                    {/* 平均 */}
                    <Box sx={{ position: "relative", width: "100%", height: `${((m.avg_cm ?? 0) / maxCm) * 100}%`, bgcolor: "#a78bfa", borderRadius: 1 }} />
                  </Box>
                  <Box sx={{ width: 22, height: 4, borderRadius: 1, bgcolor: `rgba(92,200,255,${0.2 + (m.catches / maxCount) * 0.8})` }} />
                  <Typography sx={{ fontSize: 10.5, color: TEXT.secondary, whiteSpace: "nowrap" }}>{m.catches}／{m.trips}</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: TEXT.secondary }}>{Number(m.month.slice(5))}月</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
      <PhotoViewer keys={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
