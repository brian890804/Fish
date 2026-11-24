import { useId, useMemo } from "react";
import { squidMarkup } from "./squidArt";
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import type { Species } from "../lib/types";

// 插畫風格的物種圖示：深色描邊 + 漸層立體感 + 陰影高光。
// 每個實例用 useId 產生自己的漸層 id，同一頁放很多個也不會互相干擾。

const OUTLINE = "#1a1f2b";

/** 軟絲（擬烏賊）：寫實風，繪圖程式在 squidArt.ts，跟 App 主畫面 icon 共用 */
export function SquidIcon(props: SvgIconProps) {
  const id = useId().replace(/:/g, "");
  const markup = useMemo(() => squidMarkup(id, { ink: false }), [id]);
  return (
    <SvgIcon viewBox="0 0 64 64" {...props}>
      <g dangerouslySetInnerHTML={{ __html: markup }} />
    </SvgIcon>
  );
}

/** 魚：橘紅色背部漸層到奶油色腹部，有鱗片、鰭條、鰓蓋與高光 */
export function FishIcon(props: SvgIconProps) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${id}-${n}`;
  return (
    <SvgIcon viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={g("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9532c" />
          <stop offset="0.45" stopColor="#f08c4a" />
          <stop offset="0.8" stopColor="#f9c98b" />
          <stop offset="1" stopColor="#fbe3bd" />
        </linearGradient>
        <linearGradient id={g("fin")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f39a5b" />
          <stop offset="1" stopColor="#b8401f" />
        </linearGradient>
        <linearGradient id={g("tail")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0683a" />
          <stop offset="1" stopColor="#a83a1c" />
        </linearGradient>
        <radialGradient id={g("eye")} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff8d6" />
          <stop offset="0.6" stopColor="#f3d27a" />
          <stop offset="1" stopColor="#c49a2e" />
        </radialGradient>
        <radialGradient id={g("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <pattern id={g("scales")} width="5" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 4 A2.5 2.5 0 0 1 5 4" fill="none" stroke="#8f2f14" strokeWidth="0.6" opacity="0.45" />
        </pattern>
        <clipPath id={g("clip")}>
          <path d="M5 33 C9 21 21 15.5 33 15.5 C44 15.5 51 23 51.5 32.5 C51 42 44 48.5 33 48.5 C21 48.5 9 44 5 33 Z" />
        </clipPath>
      </defs>

      <ellipse cx="30" cy="60" rx="22" ry="2.6" fill={`url(#${g("shadow")})`} />

      {/* 尾鰭 */}
      <path d="M49 32.5 C53 27 57 21 61.5 18.5 C59.5 25 59.5 40 61.5 46.5 C57 44 53 38 49 32.5 Z" fill={`url(#${g("tail")})`} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      <g stroke="#7a2510" strokeWidth="0.7" opacity="0.5" strokeLinecap="round">
        <path d="M51 32 L59.5 22" /><path d="M51.5 32.5 L59 32.5" /><path d="M51 33 L59.5 43" />
      </g>

      {/* 背鰭（帶硬棘） */}
      <path d="M19 19 C22 11 31 7.5 41 10 C44 11 46 14 46.5 18.5 L42 21 L21 20.5 Z" fill={`url(#${g("fin")})`} stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      <g stroke="#7a2510" strokeWidth="0.8" opacity="0.6" strokeLinecap="round">
        <path d="M23 20 L23.5 13.5" /><path d="M27 20 L28 10.5" /><path d="M31 20 L32.5 9" /><path d="M35 20 L36.5 9.2" /><path d="M39 20 L40.5 10.5" /><path d="M43 20 L44.2 13" />
      </g>

      {/* 腹鰭、臀鰭 */}
      <path d="M26 46 C27 52 31 55 34 54 C33.5 51 32.5 48.5 31 46.5 Z" fill={`url(#${g("fin")})`} stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M38 46.5 C40 51 44 52.5 46 51 C45 48.5 43.5 46.5 42 45 Z" fill={`url(#${g("fin")})`} stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />

      {/* 身體 */}
      <path d="M5 33 C9 21 21 15.5 33 15.5 C44 15.5 51 23 51.5 32.5 C51 42 44 48.5 33 48.5 C21 48.5 9 44 5 33 Z" fill={`url(#${g("body")})`} />
      <g clipPath={`url(#${g("clip")})`}>
        {/* 鱗片 */}
        <rect x="18" y="14" width="34" height="36" fill={`url(#${g("scales")})`} />
        {/* 腹部陰影與背部高光 */}
        <path d="M8 38 C16 47 30 50 46 44 L52 52 L4 52 Z" fill="#7a2a12" opacity="0.18" />
        <path d="M12 24 C20 18.5 32 17 43 19.5" fill="none" stroke="#fff4e6" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        {/* 側線 */}
        <path d="M19 30 C28 27.5 38 27.5 50 31" fill="none" stroke="#8f2f14" strokeWidth="0.8" opacity="0.5" />
      </g>
      <path d="M5 33 C9 21 21 15.5 33 15.5 C44 15.5 51 23 51.5 32.5 C51 42 44 48.5 33 48.5 C21 48.5 9 44 5 33 Z" fill="none" stroke={OUTLINE} strokeWidth="1.7" strokeLinejoin="round" />

      {/* 鰓蓋 */}
      <path d="M18.5 21.5 C22 26 22.5 36 18.5 43" fill="none" stroke="#8f2f14" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
      <path d="M17.2 22.5 C20.2 27 20.6 35.5 17.2 42" fill="none" stroke="#fff1de" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />

      {/* 胸鰭 */}
      <path d="M23 33 C28 30 33 31.5 34 35 C31 37.5 26 37.5 23 33 Z" fill={`url(#${g("fin")})`} stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round" />
      <g stroke="#7a2510" strokeWidth="0.6" opacity="0.55"><path d="M25 33.3 L32.5 32.8" /><path d="M25 34 L32.5 35" /></g>

      {/* 眼睛 */}
      <circle cx="13.5" cy="29" r="3.9" fill={`url(#${g("eye")})`} stroke={OUTLINE} strokeWidth="1.3" />
      <circle cx="13.9" cy="29.2" r="1.9" fill="#15110e" />
      <circle cx="12.7" cy="27.8" r="0.9" fill="#fff" />

      {/* 嘴 */}
      <path d="M5.2 33.5 C6.8 34 8.2 33.8 9.4 33" fill="none" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function SpeciesIcon({ species, ...props }: SvgIconProps & { species: Species }) {
  const Icon = species === "squid" ? SquidIcon : FishIcon;
  return <Icon {...props} />;
}

export const SPECIES_LABEL: Record<Species, string> = { squid: "軟絲", fish: "魚" };
