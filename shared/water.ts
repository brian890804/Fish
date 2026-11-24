// 水色：清 / 微濁 / 濁 / 很濁（畫面用文字，資料庫存代碼）
export const WATER_COLORS = [
  { key: "clear", label: "清" },
  { key: "light", label: "微濁" },
  { key: "murky", label: "濁" },
  { key: "muddy", label: "很濁" },
] as const;

export type WaterColor = (typeof WATER_COLORS)[number]["key"];

export const waterLabel = (k: string | null | undefined) => WATER_COLORS.find((w) => w.key === k)?.label ?? null;
