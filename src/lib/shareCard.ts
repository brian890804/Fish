// 分享圖卡：用 canvas 畫一張 1080×1080 的圖。版型「拱形」：
// 上方是資訊，下面最多三張照片，最大隻在中間（金色皇冠），兩側較矮，每張照片下方有胴長小標籤。
import dayjs from "dayjs";

export interface CardPhoto {
  url: string;
  /** 胴長（cm），沒量就是 null（不顯示標籤） */
  cm: number | null;
}

export interface CardInput {
  date: string;
  spotName: string;
  startAt: number;
  endAt: number;
  squid: number;
  fish: number;
  maxSquidCm: number | null;
  tideLine: string; // 例如 "滿 19:20 · 乾 01:57"
  /** 已排好的照片：[0] 放中間（最大隻），[1] 左邊，[2] 右邊；最多三張 */
  photos: CardPhoto[];
}

const S = 1080;
const FONT = '"Noto Sans TC", "Inter", system-ui, sans-serif';
const GOLD = "#fbbf24";

/** 圓角矩形路徑 */
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = url;
  });
}

/** 等比放大裁切，填滿指定格子（像 object-fit: cover） */
function drawCover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** 白框照片；gold 為最大隻，外面多一圈金框 */
function drawFrame(g: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, gold: boolean, cm: number | null) {
  const B = 10; // 白框寬度
  if (gold) {
    g.save();
    g.shadowColor = "rgba(251,191,36,0.45)";
    g.shadowBlur = 36;
    g.strokeStyle = GOLD;
    g.lineWidth = 8;
    rr(g, x - 4, y - 4, w + 8, h + 8, 12);
    g.stroke();
    g.restore();
  }
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 28;
  g.shadowOffsetY = 12;
  g.fillStyle = "#ffffff";
  rr(g, x, y, w, h, 8);
  g.fill();
  g.restore();
  if (img) {
    g.save();
    rr(g, x + B, y + B, w - B * 2, h - B * 2, 3);
    g.clip();
    drawCover(g, img, x + B, y + B, w - B * 2, h - B * 2);
    g.restore();
  }
  if (cm != null) drawTag(g, x + w / 2, y + h + 12, `${cm} cm`, gold);
}

/** 照片下方的胴長小標籤 */
function drawTag(g: CanvasRenderingContext2D, cx: number, top: number, text: string, gold: boolean) {
  g.font = `800 30px ${FONT}`;
  const w = g.measureText(text).width + 32;
  const h = 46;
  rr(g, cx - w / 2, top, w, h, h / 2);
  g.fillStyle = "rgba(15,23,42,0.92)";
  g.fill();
  g.fillStyle = gold ? "#fde68a" : "#f8fafc";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, cx, top + h / 2 + 1);
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
}

/** 中間最大隻上方的金色皇冠，底邊在 baseY */
function drawCrown(g: CanvasRenderingContext2D, cx: number, baseY: number) {
  const k = 1.1; // 原始路徑寬 100，放大成約 110px
  const x0 = cx - 55;
  const y0 = baseY - 52 * k;
  const p = (x: number, y: number): [number, number] => [x0 + x * k, y0 + y * k];
  const grad = g.createLinearGradient(0, y0 + 6 * k, 0, baseY);
  grad.addColorStop(0, "#fde68a");
  grad.addColorStop(1, "#d97706");
  g.beginPath();
  g.moveTo(...p(4, 52));
  g.lineTo(...p(10, 14));
  g.lineTo(...p(32, 34));
  g.lineTo(...p(50, 6));
  g.lineTo(...p(68, 34));
  g.lineTo(...p(90, 14));
  g.lineTo(...p(96, 52));
  g.closePath();
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = "#92400e";
  g.lineWidth = 2;
  g.stroke();
}

/** 標籤式的小方塊（頂部的軟絲／魚／最大） */
function drawChip(g: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, bg: string): number {
  g.font = `800 36px ${FONT}`;
  const w = g.measureText(text).width + 36;
  const h = 62;
  rr(g, x, y, w, h, 16);
  g.fillStyle = bg;
  g.fill();
  g.fillStyle = color;
  g.fillText(text, x + 18, y + 44);
  return x + w + 16;
}

export async function drawShareCard(c: CardInput): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext("2d")!;

  // 背景與頂部色塊（扁平）
  g.fillStyle = "#0f172a";
  g.fillRect(0, 0, S, S);
  g.fillStyle = "#22d3ee";
  g.fillRect(0, 0, S, 18);

  // 資訊區（上方）
  g.fillStyle = "#94a3b8";
  g.font = `600 40px ${FONT}`;
  g.fillText(dayjs(c.date).format("YYYY.M.D dddd"), 64, 100);
  g.fillStyle = "#f8fafc";
  g.font = `800 88px ${FONT}`;
  g.fillText(c.spotName, 64, 200);
  g.fillStyle = "#cbd5e1";
  g.font = `600 40px ${FONT}`;
  g.fillText(`${dayjs.unix(c.startAt).format("HH:mm")} – ${dayjs.unix(c.endAt).format("HH:mm")}`, 64, 260);

  let cx = 64;
  if (c.squid > 0) cx = drawChip(g, cx, 292, `軟絲 ×${c.squid}`, "#c4b5fd", "rgba(167,139,250,0.2)");
  if (c.fish > 0) cx = drawChip(g, cx, 292, `魚 ×${c.fish}`, "#fdba74", "rgba(251,146,60,0.2)");
  if (c.maxSquidCm != null) drawChip(g, cx, 292, `最大 ${c.maxSquidCm} cm`, "#fde68a", "rgba(251,191,36,0.18)");

  // 照片區（拱形）：中間最大隻最高，兩側較矮、底邊抬高
  const [centerImg, leftImg, rightImg] = await Promise.all(c.photos.slice(0, 3).map((p) => loadImage(p.url)));
  const BASE = 950; // 中間照片的底邊
  const CW = 372, CH = 470; // 中間外框
  const SW = 276, SH = 300; // 兩側外框
  const GAP = 24;
  const sideBottom = BASE - 120;
  const midX = (S - CW) / 2;
  if (c.photos[1]) {
    const lx = midX - GAP - SW;
    drawFrame(g, leftImg, lx, sideBottom - SH, SW, SH, false, c.photos[1].cm);
  }
  if (c.photos[2]) {
    const rx = midX + CW + GAP;
    drawFrame(g, rightImg, rx, sideBottom - SH, SW, SH, false, c.photos[2].cm);
  }
  if (c.photos[0]) {
    drawCrown(g, S / 2, BASE - CH - 10);
    drawFrame(g, centerImg, midX, BASE - CH, CW, CH, true, c.photos[0].cm);
  }

  // 底部：潮汐與標題（字太長就縮小）
  const footRight = "釣況紀錄";
  g.font = `600 30px ${FONT}`;
  const footW = g.measureText(footRight).width;
  g.fillStyle = "#475569";
  g.fillText(footRight, S - 64 - footW, 1040);

  const tide = c.tideLine || "潮汐資料待補";
  let size = 34;
  g.font = `600 ${size}px ${FONT}`;
  while (size > 22 && g.measureText(tide).width > S - 128 - footW - 40) {
    size -= 2;
    g.font = `600 ${size}px ${FONT}`;
  }
  g.fillStyle = "#94a3b8";
  g.fillText(tide, 64, 1040);
  return canvas;
}

/** 畫出圖卡的 PNG（先給使用者預覽，再決定分享或下載） */
export async function renderCard(c: CardInput): Promise<Blob> {
  const canvas = await drawShareCard(c);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("產生圖卡失敗"))), "image/png"));
}

const fileName = (date: string) => `釣況-${date}.png`;

/** 手機支援直接分享檔案時為 true（桌機通常是 false，只能下載） */
export function canShareImage(blob: Blob, date: string): boolean {
  const file = new File([blob], fileName(date), { type: "image/png" });
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

/** 叫出系統分享選單（只在支援分享檔案時使用） */
export async function shareImage(blob: Blob, date: string) {
  const file = new File([blob], fileName(date), { type: "image/png" });
  await navigator.share({ files: [file], title: `釣況 ${date}` });
}

/** 下載 PNG */
export function downloadImage(blob: Blob, date: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(date);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
