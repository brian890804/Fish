/** 重新整理圖示轉圈 */
export const spinSx = (on: boolean) => ({
  animation: on ? "spin 1s linear infinite" : undefined,
  "@keyframes spin": { to: { transform: "rotate(360deg)" } },
});

/** 電腦版卡片標題列 */
export const cardTitleSx = { fontWeight: 800, fontSize: 17, mb: 1.5 } as const;
