// 好時段推播：每天下午看接下來 24 小時，有「評分夠高、風浪都在建議區間內」的時段才通知，一天最多一次。
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { TIDE_LABEL, twDate, twHour } from "../shared/conditions";
import { isUnsafeHour, KNOT } from "../shared/safety";

export interface PushEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

/** 推播的門檻：跟「今天較好的時段」一樣，評分 55 以上 */
export const PUSH_MIN_SCORE = 55;
/** 每天幾點（台灣時間）檢查並通知 */
export const PUSH_HOUR = 15;

interface Hour {
  time: number;
  score: number | null;
  wind_ms: number | null;
  gust_ms: number | null;
  wave_m: number | null;
  tide: keyof typeof TIDE_LABEL | null;
}

export interface Window {
  from: number;
  to: number; // 最後一個小時的開始時間
  bestScore: number;
  hours: Hour[];
}

/** 把連續的好時段合併成區間 */
export function goodWindows(hours: Hour[], fromT: number, toT: number): Window[] {
  const good = hours.filter((h) => h.time >= fromT && h.time < toT && (h.score ?? 0) >= PUSH_MIN_SCORE && !isUnsafeHour(h));
  const out: Window[] = [];
  for (const h of good) {
    const last = out[out.length - 1];
    if (last && h.time - last.to === 3600) {
      last.to = h.time;
      last.bestScore = Math.max(last.bestScore, h.score!);
      last.hours.push(h);
    } else {
      out.push({ from: h.time, to: h.time, bestScore: h.score!, hours: [h] });
    }
  }
  return out;
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** 通知內容，例如「今晚 18–22 點適合出釣」 */
export function describe(windows: Window[], spotName: string, now: number) {
  const w = [...windows].sort((a, b) => b.bestScore - a.bestScore)[0];
  const today = twDate(now);
  const when = (t: number) => {
    const h = twHour(t);
    const isToday = twDate(t) === today;
    if (isToday) return h >= 17 ? "今晚" : "今天";
    return h < 9 ? "明天清晨" : "明天";
  };
  const endHour = (twHour(w.to) + 1) % 24;
  const wind = avg(w.hours.map((h) => h.wind_ms));
  const wave = avg(w.hours.map((h) => h.wave_m));
  const tides = [...new Set(w.hours.map((h) => h.tide).filter(Boolean))].map((t) => TIDE_LABEL[t!]).join("→");
  const title = `🦑 ${when(w.from)} ${twHour(w.from)}–${endHour} 點適合出釣`;
  const body = [
    `${spotName}｜評分 ${w.bestScore}`,
    `風 ${wind == null ? "-" : Math.round(wind * KNOT)}kn・浪 ${wave == null ? "-" : wave.toFixed(1)}m${tides ? `・${tides}` : ""}`,
    windows.length > 1 ? `另外還有 ${windows.length - 1} 個不錯的時段` : "",
  ].filter(Boolean).join("\n");
  return { title, body };
}

export async function sendToAll(env: PushEnv, payload: { title: string; body: string; url?: string }) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { sent: 0, failed: 0, skipped: "沒有設定 VAPID 金鑰" };
  const { results } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions").all<{ endpoint: string; p256dh: string; auth: string }>();
  let sent = 0;
  let failed = 0;
  for (const s of results) {
    try {
      const req = await buildPushPayload(
        { data: JSON.stringify({ ...payload, url: payload.url ?? "/" }), options: { ttl: 6 * 3600, urgency: "normal" } },
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth }, expirationTime: null },
        { subject: "mailto:fishing-log@example.com", publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
      );
      const res = await fetch(s.endpoint, { method: req.method, headers: req.headers, body: req.body });
      if (res.status === 404 || res.status === 410) {
        // 手機已經取消訂閱或換了瀏覽器，刪掉
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(s.endpoint).run();
        failed++;
      } else if (res.ok) {
        await env.DB.prepare("UPDATE push_subscriptions SET last_ok_at = unixepoch() WHERE endpoint = ?").bind(s.endpoint).run();
        sent++;
      } else {
        failed++;
        console.error("推播失敗", res.status, await res.text());
      }
    } catch (e) {
      failed++;
      console.error("推播失敗", e);
    }
  }
  return { sent, failed };
}
