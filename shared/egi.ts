// 木蝦（餌木）顏色：畫面只顯示色點，名稱用在無障礙標籤與說明
export const EGI_COLORS = [
  { key: "red", label: "紅", hex: "#ef4444" },
  { key: "blue", label: "藍", hex: "#3b82f6" },
  { key: "green", label: "綠", hex: "#22c55e" },
  { key: "purple", label: "紫", hex: "#a855f7" },
  { key: "gray", label: "灰", hex: "#9ca3af" },
  { key: "yellow", label: "黃", hex: "#facc15" },
  { key: "brown", label: "褐", hex: "#a16207" },
] as const;

export type EgiColor = (typeof EGI_COLORS)[number]["key"];

export const isEgiColor = (v: unknown): v is EgiColor => EGI_COLORS.some((c) => c.key === v);
export const egiOf = (key: string | null | undefined) => EGI_COLORS.find((c) => c.key === key) ?? null;
