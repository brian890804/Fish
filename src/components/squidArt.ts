// 寫實風軟絲（擬烏賊）：俯視、沿著胴體的半透明鰭、頭部兩側的大眼、
// 漸細的腕、色素斑點與虹彩亮點，周圍一團柔和的墨汁。
// App 內的 SquidIcon 與 public/icon.svg（PWA icon）都用這支程式畫，外觀保持一致。
//
// 座標系：64 × 64。身體沿著一條微微 S 形的脊線（尾在上、頭在下），
// 看起來像正在擺動；最後整體旋轉成往右上衝刺。

type Pt = [number, number];

const f = (n: number) => +n.toFixed(2);
const pathFrom = (pts: Pt[], close = true) =>
  `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}${close ? " Z" : ""}`;

/** 固定種子的亂數，讓斑點位置每次都一樣 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 三次貝茲曲線上的點 */
function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** 沿著貝茲曲線、從 w0 漸細到 w1 的腕 */
function taperedArm(p0: Pt, p1: Pt, p2: Pt, p3: Pt, w0: number, w1: number): string {
  const n = 20;
  const pts = Array.from({ length: n + 1 }, (_, i) => bez(p0, p1, p2, p3, i / n));
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    // 漸細：前段收得慢、末端收得快，比較像真的腕
    const t = i / n;
    const w = (w0 + (w1 - w0) * Math.pow(t, 1.4)) / 2;
    left.push([p[0] - (dy / len) * w, p[1] + (dx / len) * w]);
    right.push([p[0] + (dy / len) * w, p[1] - (dx / len) * w]);
  });
  return pathFrom([...left, ...right.reverse()]);
}

// ---- 身體外形 ----
/** 脊線：尾 → 頭，微微 S 形 */
const SPINE: [Pt, Pt, Pt, Pt] = [[29.5, 5], [23.5, 17], [38.5, 30], [32, 43]];
const CX = 32;
const HEAD_Y = 43;

function spine(s: number): { p: Pt; n: Pt; angle: number } {
  const p = bez(...SPINE, s);
  const a = bez(...SPINE, Math.max(0, s - 0.01));
  const b = bez(...SPINE, Math.min(1, s + 0.01));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return { p, n: [dy / len, -dx / len], angle: (Math.atan2(dy, dx) * 180) / Math.PI - 90 };
}

/** 脊線座標 → 平面座標：s 是沿身體的位置（0 尾、1 頭），o 是往側邊的偏移 */
function at(s: number, o: number): Pt {
  const { p, n } = spine(s);
  return [p[0] + n[0] * o, p[1] + n[1] * o];
}

/** 胴體半寬：尾端圓鈍，往頭部稍微變粗 */
const mantleHalf = (s: number) => 8.2 * Math.pow(Math.sin((Math.PI / 2) * Math.min(1, s / 0.3)), 0.85) * (0.9 + 0.1 * s);

/** 鰭半寬：只比胴體寬一些，中段最寬，邊緣像在划水一樣起伏 */
const finHalf = (s: number) =>
  mantleHalf(s) + 6.2 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.03)), 1.1) * (1 + 0.16 * Math.sin(s * 19 + 0.6));

function outline(half: (s: number) => number): Pt[] {
  const n = 70;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    left.push(at(s, -half(s)));
    right.push(at(s, half(s)));
  }
  return [...left, ...right.reverse()];
}

/** 沿脊線的一條線（高光、陰影用） */
const along = (from: number, to: number, o: (s: number) => number) =>
  Array.from({ length: 30 }, (_, i) => {
    const s = from + ((to - from) * i) / 29;
    return at(s, o(s));
  });

/** 產生軟絲的 SVG 內容（不含外層 <svg>）。id 用來避免同一頁多個圖示的漸層互相干擾 */
export function squidMarkup(id: string, opts: { ink?: boolean } = {}): string {
  const g = (n: string) => `${id}-${n}`;
  const ink = opts.ink ?? true;
  // 有墨汁時軟絲放右上、留空間給墨；沒有墨汁（App 內的小圖示）就放大置中
  const placement = ink ? "translate(37 25) rotate(34) scale(0.82) translate(-32 -35)" : "translate(33.5 30.5) rotate(34) scale(0.9) translate(-32 -37.5)";
  const rand = rng(7);

  // 色素斑點（胴體上）
  const spots: string[] = [];
  for (let i = 0; i < 48; i++) {
    const s = 0.08 + rand() * 0.88;
    const [x, y] = at(s, (rand() * 2 - 1) * mantleHalf(s) * 0.9);
    spots.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.25 + rand() * 0.75)}"/>`);
  }
  // 鰭上的淡斑
  const finSpots: string[] = [];
  for (let i = 0; i < 22; i++) {
    const s = 0.15 + rand() * 0.75;
    const side = rand() < 0.5 ? -1 : 1;
    const inner = mantleHalf(s) + 0.8;
    const outer = finHalf(s) - 0.9;
    const [x, y] = at(s, side * (inner + rand() * Math.max(0, outer - inner)));
    finSpots.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.25 + rand() * 0.45)}"/>`);
  }
  // 虹彩亮點（軟絲背上會閃藍綠色的小點）
  const iri: string[] = [];
  for (let i = 0; i < 14; i++) {
    const s = 0.15 + rand() * 0.78;
    const side = rand() < 0.5 ? -1 : 1;
    const [x, y] = at(s, side * mantleHalf(s) * (0.35 + rand() * 0.5));
    iri.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(0.35 + rand() * 0.4)}" ry="${f(0.6 + rand() * 0.6)}"/>`);
  }
  // 鰭條紋（從胴體往外、略往尾端斜）
  const rays: string[] = [];
  for (let i = 1; i < 18; i++) {
    const s = i / 18;
    for (const side of [-1, 1]) {
      const w0 = mantleHalf(s) + 0.5;
      const w1 = finHalf(s) - 0.6;
      if (w1 - w0 < 1.2) continue;
      const [x0, y0] = at(s, side * w0);
      const [x1, y1] = at(Math.max(0, s - 0.02), side * w1);
      rays.push(`M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`);
    }
  }

  // 八隻腕：往同一側甩、末端捲起，跟身體的 S 形連成一氣
  const baseY = 49.5;
  const arms: { b: Pt; c1: Pt; c2: Pt; t: Pt; w: number }[] = [
    { b: [29, baseY], c1: [25.5, 53.5], c2: [28.5, 58], t: [25.2, 61.8], w: 2.4 },
    { b: [30.3, baseY], c1: [28, 55], c2: [31.5, 59], t: [28.8, 63.6], w: 2.5 },
    { b: [31.4, baseY + 0.3], c1: [30.4, 55.5], c2: [33.5, 59.5], t: [31.6, 64.6], w: 2.5 },
    { b: [32.6, baseY + 0.3], c1: [33, 55.5], c2: [35.6, 59], t: [34.4, 64.2], w: 2.5 },
    { b: [33.7, baseY], c1: [35.6, 54.5], c2: [37.6, 58], t: [37.2, 62.8], w: 2.4 },
    { b: [35, baseY], c1: [38, 53.5], c2: [40, 56.5], t: [40.3, 60.8], w: 2.3 },
  ];
  const armPaths = arms.map((a) => taperedArm(a.b, a.c1, a.c2, a.t, a.w, 0.25));
  // 兩條長觸腕，末端是觸腕穗
  const tentacles = [
    taperedArm([30.5, baseY], [26, 57], [30, 63], [24, 69.5], 1.3, 0.7),
    taperedArm([33.5, baseY], [38, 56], [42, 61], [45.5, 66.5], 1.3, 0.7),
  ];

  const fin = pathFrom(outline(finHalf));
  const mantle = pathFrom(outline(mantleHalf));
  const highlight = pathFrom(along(0.1, 0.97, (s) => -mantleHalf(s) * 0.42), false);
  const shade = pathFrom([...along(0, 1, (s) => mantleHalf(s) * 0.45), ...along(1, 0, (s) => mantleHalf(s) + 2)]);

  // 頭和腕接在脊線末端，順著末端的方向轉
  const end = spine(1);
  const headTf = `translate(${f(end.p[0] - CX)} ${f(end.p[1] - HEAD_Y)}) rotate(${f(end.angle)} ${CX} ${HEAD_Y})`;

  return `
<defs>
  <linearGradient id="${g("mantle")}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#e9def5"/>
    <stop offset="0.35" stop-color="#bba5d6"/>
    <stop offset="0.75" stop-color="#8a6fae"/>
    <stop offset="1" stop-color="#5a4378"/>
  </linearGradient>
  <linearGradient id="${g("fin")}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#d9cdea" stop-opacity="0.8"/>
    <stop offset="0.5" stop-color="#a893c6" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#7a64a0" stop-opacity="0.8"/>
  </linearGradient>
  <linearGradient id="${g("head")}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#c9b6e2"/>
    <stop offset="1" stop-color="#6b5390"/>
  </linearGradient>
  <linearGradient id="${g("arm")}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b9a4d6"/>
    <stop offset="1" stop-color="#8d74b4"/>
  </linearGradient>
  <radialGradient id="${g("eye")}" cx="0.45" cy="0.4" r="0.6">
    <stop offset="0" stop-color="#b8f5d8"/>
    <stop offset="0.45" stop-color="#3fb3a1"/>
    <stop offset="0.8" stop-color="#1f5f6b"/>
    <stop offset="1" stop-color="#14283a"/>
  </radialGradient>
  <radialGradient id="${g("ink")}" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#120a1d" stop-opacity="0.95"/>
    <stop offset="0.6" stop-color="#2a1640" stop-opacity="0.75"/>
    <stop offset="1" stop-color="#3b2160" stop-opacity="0"/>
  </radialGradient>
  <filter id="${g("soft")}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>
  <clipPath id="${g("mclip")}"><path d="${mantle}"/></clipPath>
</defs>
${
  ink
    ? `<g>
  <circle cx="17" cy="45" r="13" fill="url(#${g("ink")})"/>
  <circle cx="10" cy="53" r="8" fill="url(#${g("ink")})"/>
  <circle cx="25" cy="54" r="9" fill="url(#${g("ink")})"/>
  <g fill="#24133a" filter="url(#${g("soft")})" opacity="0.85">
    <circle cx="16" cy="44" r="5"/><circle cx="12" cy="50" r="3.5"/><circle cx="21" cy="50" r="4"/>
  </g>
  <g fill="#2a1744">
    <circle cx="5" cy="40" r="1.3"/><circle cx="3.5" cy="47" r="0.9"/><circle cx="6.5" cy="58" r="1.2"/>
    <circle cx="15" cy="61.5" r="0.8"/><circle cx="30" cy="61" r="1"/><circle cx="34" cy="55" r="0.7"/>
  </g>
</g>`
    : ""
}
<g transform="${placement}">
  <g transform="${headTf}">
    <!-- 觸腕與腕 -->
    <g fill="url(#${g("arm")})" stroke="#2b2140" stroke-width="0.45" stroke-linejoin="round">
      ${tentacles.map((d) => `<path d="${d}"/>`).join("")}
      <ellipse cx="23.6" cy="70.2" rx="1.9" ry="1.15" transform="rotate(-55 23.6 70.2)"/>
      <ellipse cx="46" cy="67.2" rx="1.9" ry="1.15" transform="rotate(48 46 67.2)"/>
      ${armPaths.map((d) => `<path d="${d}"/>`).join("")}
    </g>
    <!-- 腕內側的吸盤點 -->
    <g fill="#efe6fb" opacity="0.55">
      <circle cx="28.2" cy="53.4" r="0.32"/><circle cx="28.4" cy="56" r="0.28"/><circle cx="31" cy="54.4" r="0.3"/>
      <circle cx="31.8" cy="57.4" r="0.26"/><circle cx="33.4" cy="54.4" r="0.3"/><circle cx="34.4" cy="57.2" r="0.26"/>
      <circle cx="35.9" cy="53.4" r="0.32"/><circle cx="37" cy="55.6" r="0.28"/>
    </g>
  </g>

  <!-- 鰭（半透明） -->
  <path d="${fin}" fill="url(#${g("fin")})" stroke="#f3ecff" stroke-opacity="0.55" stroke-width="0.55" stroke-linejoin="round"/>
  <path d="${rays.join(" ")}" stroke="#4e3a6a" stroke-opacity="0.25" stroke-width="0.35" fill="none"/>
  <g fill="#5e4778" opacity="0.35">${finSpots.join("")}</g>

  <!-- 胴體 -->
  <path d="${mantle}" fill="url(#${g("mantle")})" stroke="#2b2140" stroke-width="0.6"/>
  <g clip-path="url(#${g("mclip")})">
    <g fill="#4a3260" opacity="0.6">${spots.join("")}</g>
    <g fill="#bdf3ff" opacity="0.75">${iri.join("")}</g>
    <!-- 背上的高光與另一側的陰影，做出圓柱的立體感 -->
    <path d="${highlight}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1.6" fill="none" stroke-linecap="round" filter="url(#${g("soft")})"/>
    <path d="${shade}" fill="#241634" opacity="0.3" filter="url(#${g("soft")})"/>
  </g>

  <!-- 頭部與眼睛（眼睛長在頭的兩側） -->
  <g transform="${headTf}">
    <path d="M25.6 42.6 C24.6 46 25.4 49.8 28.4 50.6 L35.6 50.6 C38.6 49.8 39.4 46 38.4 42.6 Z" fill="url(#${g("head")})" stroke="#2b2140" stroke-width="0.55"/>
    ${[24.9, 39.1]
      .map(
        (x) => `<ellipse cx="${x}" cy="46.4" rx="3" ry="3.6" fill="url(#${g("eye")})" stroke="#1c1428" stroke-width="0.6"/>
    <ellipse cx="${x}" cy="46.6" rx="1.15" ry="1.9" fill="#05060a"/>
    <ellipse cx="${f(x - 0.9)}" cy="45.2" rx="0.75" ry="0.55" fill="#ffffff" opacity="0.9"/>`,
      )
      .join("")}
  </g>
</g>`;
}
