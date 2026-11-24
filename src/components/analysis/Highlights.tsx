import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import type { useAnalysis } from "../../hooks/useAnalysis";
import { scoreColor } from "../../lib/format";

export default function Highlights({ items }: { items: ReturnType<typeof useAnalysis>["highlights"] }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>目前看起來比較好的條件</Typography>
        {items.length === 0 ? (
          <Typography color="text.secondary" variant="body2">資料還不夠，多記錄幾次（包含槓龜）就會慢慢看出來。</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {items.map(({ f, best }) => (
              <Chip key={f.key} label={`${f.label}：${best!.label}`} sx={{ bgcolor: scoreColor(best!.score), color: "#0b1520", fontWeight: 700 }} />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
