// 產生 public/icon.svg（PWA／主畫面 icon），軟絲的繪圖跟 App 內共用 src/components/squidArt.ts。
// 用法：npx tsx scripts/build-icon.ts；PNG（192／512／apple-touch-icon 180）再用瀏覽器把 SVG 轉出。
import { writeFileSync } from "node:fs";
import { squidMarkup } from "../src/components/squidArt.ts";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b2550"/>
      <stop offset="0.55" stop-color="#140f2e"/>
      <stop offset="1" stop-color="#0a0a18"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.25" r="0.6">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.2" cy="0.85" r="0.5">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <rect width="512" height="512" fill="url(#glow2)"/>
  <!-- 內容放在中間約 80% 的安全區，Android 裁成圓形也不會切到 -->
  <g transform="translate(38 38) scale(6.8)">${squidMarkup("pwa", { ink: false })}</g>
</svg>
`;
writeFileSync(new URL("../public/icon.svg", import.meta.url), svg);
console.log("public/icon.svg 已更新");
