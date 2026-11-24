import { alpha, createTheme } from "@mui/material/styles";

/**
 * 深色主題的層次：背景 → 卡片 → 卡片內的區塊，三層明暗不同，
 * 加上很淡的細線框，取代厚重的陰影和一層層的色塊。
 */
export const SURFACE = {
  base: "#0a0f16", // 頁面背景
  card: "#111923", // 卡片
  raised: "#182230", // 卡片內需要被點的區塊、表格表頭
  hairline: "rgba(148,163,184,0.12)", // 細線框、分隔線
  hairlineStrong: "rgba(148,163,184,0.22)",
};

export const TEXT = {
  primary: "#e9eef5",
  secondary: "#8b9bb0",
  muted: "#5d6b7e",
};

/** 狀態色：適合／注意／不推薦，全站共用 */
export const STATUS = {
  good: "#34d399",
  warn: "#fbbf24",
  bad: "#f87171",
};

const ACCENT = "#5cc8ff";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ACCENT, contrastText: "#06121c" },
    secondary: { main: "#ffb74d" },
    success: { main: STATUS.good },
    warning: { main: STATUS.warn },
    error: { main: STATUS.bad },
    background: { default: SURFACE.base, paper: SURFACE.card },
    text: { primary: TEXT.primary, secondary: TEXT.secondary, disabled: TEXT.muted },
    divider: SURFACE.hairline,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Noto Sans TC", system-ui, sans-serif',
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700, letterSpacing: "-0.005em" },
    overline: { fontWeight: 700, letterSpacing: "0.08em", lineHeight: 1.6 },
    caption: { color: TEXT.secondary },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: SURFACE.base,
          // 數字等寬，數值變動時不會左右跳
          fontVariantNumeric: "tabular-nums",
          WebkitFontSmoothing: "antialiased",
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${SURFACE.hairline}`, borderRadius: 20, backgroundColor: SURFACE.card },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 18, "&:last-child": { paddingBottom: 18 } } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 700, borderRadius: 12 } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { backgroundColor: SURFACE.raised, borderRadius: 12, padding: 3, gap: 2 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: "none !important",
          borderRadius: "9px !important",
          textTransform: "none",
          fontWeight: 700,
          color: TEXT.secondary,
          padding: "4px 12px",
          "&.Mui-selected": { backgroundColor: alpha(ACCENT, 0.16), color: ACCENT },
          "&.Mui-selected:hover": { backgroundColor: alpha(ACCENT, 0.22) },
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: { root: { color: TEXT.muted, "&.Mui-selected": { color: ACCENT } } },
    },
    MuiDialog: {
      styleOverrides: { paper: { backgroundColor: SURFACE.card, border: `1px solid ${SURFACE.hairline}`, borderRadius: 20 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 12, "& fieldset": { borderColor: SURFACE.hairlineStrong } } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: SURFACE.raised, border: `1px solid ${SURFACE.hairlineStrong}`, color: TEXT.primary, borderRadius: 12 },
        arrow: { color: SURFACE.raised },
      },
    },
  },
});

/** 物種顏色 */
export const SPECIES_COLOR = { squid: "#a78bfa", fish: "#ffb74d" } as const;
