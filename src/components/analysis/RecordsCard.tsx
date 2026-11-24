import { Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import dayjs from "dayjs";
import { photoUrl, useApi } from "../../lib/api";
import { TEXT, SURFACE } from "../../theme";
import { EgiDot } from "../EgiColorPicker";
import { SquidIcon } from "../icons";

interface Records {
  top: { id: number; caught_at: number; length_cm: number; weight_g: number | null; egi_color: string | null; photo_key: string | null; date: string; spot_name: string }[];
  months: { month: string; catches: number; measured: number; avg_cm: number | null; max_cm: number | null; trips: number }[];
}

const MEDAL = ["#fbbf24", "#cbd5e1", "#d97706"];

/** 個人紀錄：最大隻排行＋每月平均胴長與數量（看季節性） */
export default function RecordsCard() {
  const { data } = useApi<Records>("/records?species=squid");

  if (!data) return <Skeleton variant="rounded" height={260} sx={{ borderRadius: 4 }} />;
  const months = data.months.slice(-12);
  const maxCm = Math.max(...months.map((m) => m.max_cm ?? 0), 1);
  const maxCount = Math.max(...months.map((m) => m.catches), 1);

  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6">軟絲紀錄</Typography>

        {/* 最大隻排行 */}
        {data.top.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>還沒有量過胴長的軟絲。記錄時填上胴長，這裡就會出現你的最大隻排行。</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {data.top.map((c, i) => (
              <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, borderRadius: 2.5, bgcolor: i === 0 ? "rgba(251,191,36,0.08)" : SURFACE.raised }}>
                <Box sx={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {i < 3 ? <EmojiEventsIcon sx={{ color: MEDAL[i], fontSize: 24 }} /> : <Typography sx={{ fontWeight: 800, color: TEXT.secondary }}>{i + 1}</Typography>}
                </Box>
                {c.photo_key ? (
                  <Box component="img" src={photoUrl(c.photo_key, "thumb")} loading="lazy" alt="" sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <Box sx={{ width: 44, height: 44, display: "grid", placeItems: "center", flexShrink: 0 }}><SquidIcon sx={{ fontSize: 36 }} /></Box>
                )}
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
              </Box>
            ))}
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
    </Card>
  );
}
