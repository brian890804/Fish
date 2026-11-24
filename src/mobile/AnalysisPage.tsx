import { Box, Typography, Skeleton, Alert } from "@mui/material";
import { useAnalysis } from "../hooks/useAnalysis";
import AnalysisFilters from "../components/analysis/AnalysisFilters";
import SummaryTiles from "../components/analysis/SummaryTiles";
import Highlights from "../components/analysis/Highlights";
import FactorCard, { SCORE_HELP } from "../components/analysis/FactorCard";

export default function AnalysisPage() {
  const a = useAnalysis();
  const { data } = a;
  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h5">釣況分析</Typography>
      <AnalysisFilters a={a} />
      {a.error && <Alert severity="error">{a.error.message}</Alert>}
      {a.isLoading || !data ? (
        <Skeleton variant="rounded" height={300} />
      ) : data.trips === 0 ? (
        <Alert severity="info">這段期間沒有出釣紀錄</Alert>
      ) : (
        <>
          <SummaryTiles data={data} squidMode={a.species === "squid"} />
          {data.missingWeatherHours > 0 && <Alert severity="warning">有 {data.missingWeatherHours} 小時找不到天氣資料，沒算進條件分析。</Alert>}
          <Highlights items={a.highlights} />
          <Typography variant="caption" color="text.secondary">{SCORE_HELP}</Typography>
          {data.factors.filter((f) => f.buckets.length > 0).map((f) => <FactorCard key={f.key} f={f} />)}
        </>
      )}
    </Box>
  );
}
