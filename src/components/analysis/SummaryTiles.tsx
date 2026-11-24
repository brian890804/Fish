import { Box } from "@mui/material";
import type { Analysis } from "../../lib/types";
import StatTile from "../StatTile";

export default function SummaryTiles({ data, columns = 3, squidMode }: { data: Analysis; columns?: number; squidMode: boolean }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 1 }}>
      <StatTile align="left" big={columns > 3} label="出釣" value={`${data.trips} 次`} />
      <StatTile align="left" big={columns > 3} label="總時數" value={`${data.hours} h`} />
      <StatTile align="left" big={columns > 3} label="釣獲" value={`${data.catches} 隻`} />
      <StatTile align="left" big={columns > 3} label="每小時" value={data.rate.toFixed(2)} />
      <StatTile align="left" big={columns > 3} label="槓龜" value={`${data.blankTrips} 次`} />
      <StatTile align="left" big={columns > 3} label={squidMode ? "平均胴長" : "平均長度"} value={data.avgLengthCm ? `${data.avgLengthCm}cm` : "-"} />
    </Box>
  );
}
