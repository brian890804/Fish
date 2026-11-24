import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import type { FactorStat } from "../../../shared/conditions";
import { scoreColor } from "../../lib/format";

export const SCORE_HELP = "每小時釣獲數 = 該條件下釣到的數量 ÷ 在該條件下釣了幾小時。分數 50 = 跟平常一樣，越高越好；釣的時數少的分組會被拉回平均值。";

export default function FactorCard({ f }: { f: FactorStat }) {
  const maxRate = Math.max(...f.buckets.map((b) => b.rate), 0.0001);
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{f.label}</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
          {f.buckets.map((b) => (
            <Box key={b.label}>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, minWidth: 84, fontSize: 14 }}>{b.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                  {b.catches} 隻 / {b.hours} h · {b.rate.toFixed(2)}/h
                </Typography>
                <Typography sx={{ fontWeight: 800, color: scoreColor(b.score), fontSize: 14 }}>{b.score ?? "-"}</Typography>
              </Box>
              <LinearProgress
                variant="determinate" value={(b.rate / maxRate) * 100}
                sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: scoreColor(b.score), borderRadius: 4 } }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
