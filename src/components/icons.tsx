import { useId } from "react";
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import type { Species } from "../lib/types";

// 插畫風格的物種圖示：深色描邊 + 漸層立體感 + 陰影高光。
// 每個實例用 useId 產生自己的漸層 id，同一頁放很多個也不會互相干擾。

const OUTLINE = "#1a1f2b";

/** 軟絲（擬烏賊）：紫色調身體與半透明大鰭、斜向衝刺的動態、尾端噴出潑墨 */
export function SquidIcon(props: SvgIconProps) {
  const id = useId().replace(/:/g, "");
  const g = (n: string) => `${id}-${n}`;
  return (
    <SvgIcon viewBox="0 0 64 64" {...props}>
      <defs>
        <linearGradient id={g("mantle")} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#efe2ff" />
          <stop offset="0.4" stopColor="#b796e0" />
          <stop offset="1" stopColor="#6a45a3" />
        </linearGradient>
        <linearGradient id={g("fin")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9c7f5" stopOpacity="0.92" />
          <stop offset="0.5" stopColor="#a98bd6" stopOpacity="0.78" />
          <stop offset="1" stopColor="#7556ac" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={g("head")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c3a6ea" />
          <stop offset="1" stopColor="#5e3d93" />
        </linearGradient>
        <linearGradient id={g("arm")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b293dc" />
          <stop offset="1" stopColor="#7a58b0" />
        </linearGradient>
        <radialGradient id={g("ink")} cx="0.45" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#170c24" />
          <stop offset="0.65" stopColor="#2c1745" />
          <stop offset="1" stopColor="#4a2a72" />
        </radialGradient>
        <radialGradient id={g("eye")} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.55" stopColor="#f5c542" />
          <stop offset="1" stopColor="#c98a12" />
        </radialGradient>
      </defs>

      {/* 潑墨：左下角噴出的一團墨汁與飛濺墨點 */}
      <g>
        <path
          d="M15 43 C10 40 11 33 17.5 34.5 C18.5 29.5 26 29 27.5 34 C31.5 32 36 36.5 33 41 C38 43 36.5 50.5 30 49 C30.5 55 23 57 20.5 52 C15.5 56 8.5 52 11.5 47.5 C7.5 47.5 8.5 43.5 15 43 Z"
          fill={`url(#${g("ink")})`} stroke="#6b45a0" strokeWidth="0.8" opacity="0.95"
        />
        <g fill="#2c1745" stroke="#6b45a0" strokeWidth="0.5">
          <circle cx="6.5" cy="38.5" r="1.7" />
          <circle cx="4.5" cy="46" r="1.1" />
          <circle cx="8" cy="55.5" r="1.5" />
          <circle cx="14" cy="60" r="1" />
          <circle cx="25.5" cy="59.5" r="1.3" />
          <circle cx="35.5" cy="54.5" r="1" />
          <circle cx="39.5" cy="47.5" r="0.8" />
          <circle cx="11" cy="31" r="0.9" />
        </g>
        {/* 噴墨的拖尾 */}
        <path d="M3 52 C6 50.5 8 50.5 10 51.5" fill="none" stroke="#4a2a72" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <path d="M17 61.5 C19 59.5 21 58.8 23 59" fill="none" stroke="#4a2a72" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* 軟絲本體：往右上衝刺，腕往左下拖 */}
      <g transform="translate(36 27) rotate(38) scale(0.78) translate(-32 -30)">
        {/* 速度線 */}
        <g fill="none" stroke="#e9dcff" strokeLinecap="round" opacity="0.55">
          <path d="M4 14 C3 22 3 30 4.5 38" strokeWidth="1.4" />
          <path d="M0 22 C-0.5 27 -0.5 32 0.5 36" strokeWidth="1" />
          <path d="M60 14 C61 22 61 30 59.5 38" strokeWidth="1.4" />
          <path d="M64 22 C64.5 27 64.5 32 63.5 36" strokeWidth="1" />
        </g>

        {/* 兩條長觸腕：被水流拉長、尾端甩動 */}
        <g fill="none" strokeLinecap="round">
          <path d="M27.5 48 C24 55 29 60 24 67 C22 70 18 70 17 73" stroke={OUTLINE} strokeWidth="4" />
          <path d="M36.5 48 C40 55 35 60 40 67 C42 70 46 70 47 73" stroke={OUTLINE} strokeWidth="4" />
          <path d="M27.5 48 C24 55 29 60 24 67 C22 70 18 70 17 73" stroke={`url(#${g("arm")})`} strokeWidth="2.2" />
          <path d="M36.5 48 C40 55 35 60 40 67 C42 70 46 70 47 73" stroke={`url(#${g("arm")})`} strokeWidth="2.2" />
        </g>
        <ellipse cx="16.4" cy="73.6" rx="2.8" ry="1.9" fill="#8e6cc0" stroke={OUTLINE} strokeWidth="1.2" transform="rotate(-35 16.4 73.6)" />
        <ellipse cx="47.6" cy="73.6" rx="2.8" ry="1.9" fill="#8e6cc0" stroke={OUTLINE} strokeWidth="1.2" transform="rotate(35 47.6 73.6)" />

        {/* 八隻腕：波浪狀往後飄 */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[
            "M28.5 49 C25 53 27.5 57 24.5 61 C23 63 21 63.5 20.5 65.5",
            "M30 50 C28 54 30.5 58 28.5 62 C27.8 63.5 26.5 64.5 26.5 66",
            "M31.4 50.5 C30.5 55 32.5 59 31.5 64",
            "M32.6 50.5 C33.5 55 31.5 59 32.5 64",
            "M34 50 C36 54 33.5 58 35.5 62 C36.2 63.5 37.5 64.5 37.5 66",
            "M35.5 49 C39 53 36.5 57 39.5 61 C41 63 43 63.5 43.5 65.5",
          ].map((d) => (
            <g key={d}>
              <path d={d} stroke={OUTLINE} strokeWidth="3.8" />
              <path d={d} stroke={`url(#${g("arm")})`} strokeWidth="2.1" />
            </g>
          ))}
          <g stroke="#f3eaff" strokeWidth="0.9" strokeDasharray="0.1 2.2" opacity="0.75">
            <path d="M30 51.5 C28.5 55 30.5 58 29 61.5" />
            <path d="M34 51.5 C35.5 55 33.5 58 35 61.5" />
          </g>
        </g>

        {/* 大鰭：半透明、邊緣波動 */}
        <path
          d="M32 4 C22 8 11 16 10 27 C9.5 31 11 33 10.5 35 C11 38.5 15 40.5 22 41.5 L42 41.5 C49 40.5 53 38.5 53.5 35 C53 33 54.5 31 54 27 C53 16 42 8 32 4 Z"
          fill={`url(#${g("fin")})`} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round"
        />
        <g fill="none" stroke="#f6efff" strokeLinecap="round" opacity="0.5" strokeWidth="0.8">
          <path d="M23 12 C17 18 14 25 14.5 31" />
          <path d="M41 12 C47 18 50 25 49.5 31" opacity="0.4" />
        </g>
        <g fill="none" stroke="#4b2f78" strokeLinecap="round" opacity="0.35" strokeWidth="0.7">
          <path d="M24 19 L13 24" /><path d="M24 25 L11.5 30" /><path d="M24 31 L12.5 36" />
          <path d="M40 19 L51 24" /><path d="M40 25 L52.5 30" /><path d="M40 31 L51.5 36" />
        </g>

        {/* 胴體 */}
        <path
          d="M32 3 C37.5 7.5 40 16 40 26 L40 40 C40 43.5 36.5 45.5 32 45.5 C27.5 45.5 24 43.5 24 40 L24 26 C24 16 26.5 7.5 32 3 Z"
          fill={`url(#${g("mantle")})`} stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round"
        />
        {/* 斑紋（帶點虹彩感） */}
        <g opacity="0.6">
          <ellipse cx="34.5" cy="13" rx="1.6" ry="1.1" fill="#4b2f78" />
          <ellipse cx="29.5" cy="18" rx="1.2" ry="0.9" fill="#5b3a8e" />
          <ellipse cx="36" cy="21" rx="1.9" ry="1.2" fill="#4b2f78" />
          <ellipse cx="31.5" cy="26" rx="1.4" ry="1" fill="#5b3a8e" />
          <ellipse cx="37" cy="30" rx="1.5" ry="1.1" fill="#4b2f78" />
          <ellipse cx="28" cy="32" rx="1.1" ry="0.8" fill="#5b3a8e" />
          <ellipse cx="33.5" cy="36" rx="1.7" ry="1.1" fill="#4b2f78" />
          <ellipse cx="37.5" cy="39" rx="1.1" ry="0.8" fill="#5b3a8e" />
        </g>
        <g fill="#8ee6ff" opacity="0.35">
          <circle cx="30" cy="22" r="0.7" /><circle cx="35" cy="27" r="0.6" /><circle cx="29.5" cy="36" r="0.6" />
        </g>
        <path d="M36 8 C39 13 40 20 40 27 L40 40 C40 42.5 38 44.3 35 45 C37 41 37.5 33 37.5 26 C37.5 18 37 12 36 8 Z" fill="#2c1745" opacity="0.3" />
        <path d="M29.5 8 C27 13 26.3 20 26.3 27 L26.3 37" fill="none" stroke="#fffaff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />

        {/* 頭部 */}
        <path d="M24.5 41.5 C23.5 47 26.5 51 32 51 C37.5 51 40.5 47 39.5 41.5 Z" fill={`url(#${g("head")})`} stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />

        {/* 金色大眼 */}
        {[27.3, 36.7].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="45.6" r="3.4" fill={`url(#${g("eye")})`} stroke={OUTLINE} strokeWidth="1.2" />
            <ellipse cx={cx} cy="45.9" rx="1.1" ry="2" fill="#15110e" />
            <circle cx={cx - 1.1} cy="44.4" r="0.8" fill="#fff" />
          </g>
        ))}
        <path d="M24.6 42.6 L29.6 43.6" stroke={OUTLINE} strokeWidth="1.1" strokeLinecap="round" />
        <path d="M39.4 42.6 L34.4 43.6" stroke={OUTLINE} strokeWidth="1.1" strokeLinecap="round" />
      </g>
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
