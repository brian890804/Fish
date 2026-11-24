import NorthIcon from "@mui/icons-material/SouthRounded";

/** 跟溫古魯一樣：箭頭指向風（浪）吹去的方向 */
export default function Arrow({ deg, size = 18, color = "inherit" }: { deg: number | null; size?: number; color?: string }) {
  if (deg == null) return <span>-</span>;
  return <NorthIcon sx={{ fontSize: size, color, transform: `rotate(${deg}deg)`, display: "block", mx: "auto" }} />;
}
