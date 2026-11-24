import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import type { Analysis } from "../../lib/types";
import { egiOf } from "../../../shared/egi";
import { TEXT } from "../../theme";

/** 各木蝦顏色釣到幾隻、平均長度（只算有記顏色的釣獲） */
export default function EgiCard({ data }: { data: Analysis }) {
  const total = data.egiColors.reduce((a, c) => a + c.catches, 0);
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>木蝦顏色</Typography>
        <Typography sx={{ fontSize: 12, color: TEXT.secondary, mb: 1.5 }}>
          依釣到的數量排序。同一趟可能換好幾支，所以只看釣到幾隻，不算進每小時的條件分析。
        </Typography>
        {total === 0 ? (
          <Typography sx={{ fontSize: 13, color: TEXT.secondary }}>還沒有記錄木蝦顏色的釣獲。</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
            {data.egiColors.map((c) => {
              const egi = egiOf(c.color);
              if (!egi) return null;
              return (
                <Box key={c.color} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Box aria-label={egi.label} sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: egi.hex, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }} />
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate" value={(c.catches / data.egiColors[0].catches) * 100}
                      sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(148,163,184,0.1)", "& .MuiLinearProgress-bar": { bgcolor: egi.hex, borderRadius: 4 } }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: "right" }}>{c.catches} 隻</Typography>
                  <Typography sx={{ fontSize: 12, color: TEXT.secondary, minWidth: 64, textAlign: "right" }}>
                    {c.avgLengthCm != null ? `平均 ${c.avgLengthCm}cm` : ""}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
