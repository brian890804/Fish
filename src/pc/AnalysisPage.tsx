import { Alert, Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import { useAnalysis } from "../hooks/useAnalysis";
import AnalysisFilters from "../components/analysis/AnalysisFilters";
import SummaryTiles from "../components/analysis/SummaryTiles";
import Highlights from "../components/analysis/Highlights";
import EgiCard from "../components/analysis/EgiCard";
import RecordsCard from "../components/analysis/RecordsCard";
import FactorCard, { SCORE_HELP } from "../components/analysis/FactorCard";
import PageHeader from "./PageHeader";

export default function AnalysisPage({ onOpenDate }: { onOpenDate?: (d: string) => void }) {
  const a = useAnalysis();
  const { data } = a;
  return (
    <>
      <PageHeader title="釣況分析" subtitle="依照區間彙總，找出什麼條件下比較好釣" />
      <Box sx={{ mb: 2.5 }}><RecordsCard onOpenDate={onOpenDate} species={a.species === "fish" ? "fish" : "squid"} /></Box>
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <AnalysisFilters a={a} inline />
        </CardContent>
      </Card>
      {a.error && <Alert severity="error">{a.error.message}</Alert>}
      {a.isLoading || !data ? (
        <Skeleton variant="rounded" height={400} />
      ) : data.trips === 0 ? (
        <Alert severity="info">這段期間沒有出釣紀錄</Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <SummaryTiles data={data} columns={6} squidMode={a.species === "squid"} />
          {data.missingWeatherHours > 0 && <Alert severity="warning">有 {data.missingWeatherHours} 小時找不到天氣資料，沒算進條件分析。</Alert>}
          <Highlights items={a.highlights} />
          <Typography variant="body2" color="text.secondary">{SCORE_HELP}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 2.5 }}>
            <EgiCard data={data} />
            {data.factors.filter((f) => f.buckets.length > 0).map((f) => <FactorCard key={f.key} f={f} />)}
          </Box>
        </Box>
      )}
    </>
  );
}
