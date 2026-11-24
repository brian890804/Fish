// 分享圖卡：用 canvas 畫一張 1080×1080 的扁平風圖片。版面與配色先放一版，之後你設計好再換。
import dayjs from "dayjs";

export interface CardInput {
  date: string;
  spotName: string;
  startAt: number;
  endAt: number;
  squid: number;
  fish: number;
  maxSquidCm: number | null;
  tideLine: string; // 例如 "滿 19:20 · 乾 01:57"
  note?: string;
}

export function drawShareCard(c: CardInput): HTMLCanvasElement {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const g = canvas.getContext("2d")!;
  const font = '"Noto Sans TC", "Inter", system-ui, sans-serif';

  // 背景與頂部色塊（扁平）
  g.fillStyle = "#0f172a";
  g.fillRect(0, 0, S, S);
  g.fillStyle = "#22d3ee";
  g.fillRect(0, 0, S, 18);

  g.fillStyle = "#94a3b8";
  g.font = `600 42px ${font}`;
  g.fillText(dayjs(c.date).format("YYYY.M.D dddd"), 80, 120);
  g.fillStyle = "#f8fafc";
  g.font = `800 96px ${font}`;
  g.fillText(c.spotName, 80, 230);
  g.fillStyle = "#94a3b8";
  g.font = `600 44px ${font}`;
  g.fillText(`${dayjs.unix(c.startAt).format("HH:mm")} – ${dayjs.unix(c.endAt).format("HH:mm")}`, 80, 300);

  // 數字區塊
  const block = (x: number, y: number, w: number, h: number, color: string, big: string, small: string) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
    g.fillStyle = "#0f172a";
    g.font = `800 150px ${font}`;
    g.fillText(big, x + 40, y + 180);
    g.font = `700 40px ${font}`;
    g.fillText(small, x + 40, y + 240);
  };
  block(80, 360, 460, 300, "#a78bfa", `${c.squid}`, "軟絲（隻）");
  block(560, 360, 440, 300, "#fb923c", `${c.fish}`, "魚（隻）");

  // 最大隻
  g.fillStyle = "#1e293b";
  g.fillRect(80, 700, 920, 160);
  g.fillStyle = "#94a3b8";
  g.font = `600 38px ${font}`;
  g.fillText("最大胴長", 120, 760);
  g.fillStyle = "#f8fafc";
  g.font = `800 80px ${font}`;
  g.fillText(c.maxSquidCm != null ? `${c.maxSquidCm} cm` : "—", 120, 835);

  // 潮汐
  g.fillStyle = "#94a3b8";
  g.font = `600 38px ${font}`;
  g.fillText(c.tideLine || "潮汐資料待補", 80, 940);

  if (c.note) {
    g.font = `500 34px ${font}`;
    g.fillText(c.note.slice(0, 40), 80, 1000);
  }
  g.fillStyle = "#475569";
  g.font = `600 30px ${font}`;
  g.fillText("釣況紀錄", 80, 1040);
  return canvas;
}

/** 分享：支援的手機直接叫出分享選單，否則下載圖片 */
export async function shareCard(c: CardInput) {
  const canvas = drawShareCard(c);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("產生圖卡失敗"))), "image/png"));
  const file = new File([blob], `釣況-${c.date}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `釣況 ${c.date}` });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
