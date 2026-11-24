import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#4fc3f7" },
    secondary: { main: "#ffb74d" },
    background: { default: "#07121f", paper: "#0f2133" },
    divider: "rgba(255,255,255,0.08)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", "Noto Sans TC", system-ui, sans-serif',
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700 } } },
    MuiCard: { styleOverrides: { root: { border: "1px solid rgba(255,255,255,0.06)" } } },
  },
});

/** 物種顏色 */
export const SPECIES_COLOR = { squid: "#4fc3f7", fish: "#ffb74d" } as const;
