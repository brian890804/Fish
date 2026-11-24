import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import dayjs from "dayjs";
import "dayjs/locale/zh-tw";
import App from "./App";

dayjs.locale("zh-tw");

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
