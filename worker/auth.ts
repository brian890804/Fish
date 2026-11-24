// 登入：帳號密碼存在 Cloudflare secret（APP_USERNAME、APP_PASSWORD），不在程式與 repo 裡。
// 登入成功後發一個 HttpOnly cookie，內容是「到期時間 + HMAC 簽章」，有效 400 天（瀏覽器上限），
// 所以只要登入一次，之後在同一台裝置上不用再打。簽章金鑰是 AUTH_SECRET；換掉它會讓所有裝置都要重新登入。

export interface AuthEnv {
  APP_USERNAME?: string;
  APP_PASSWORD?: string;
  AUTH_SECRET?: string;
}

/** 出釣、釣獲、推播訂閱都屬於這個帳號；目前只有一個帳號，之後要加帳號時再改成登入後取得的 id */
export const OWNER_ID = 1;

export const SESSION_COOKIE = "fish_session";
const SESSION_DAYS = 400;

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer) => {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** 固定時間比較，避免從回應時間猜出密碼 */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** 帳號密碼是否正確 */
export function checkCredentials(env: AuthEnv, username: string, password: string): boolean {
  if (!env.APP_USERNAME || !env.APP_PASSWORD) throw new Error("尚未設定登入帳號密碼（請執行 node scripts/setup-login.mjs）");
  const okUser = safeEqual(username, env.APP_USERNAME);
  const okPass = safeEqual(password, env.APP_PASSWORD);
  return okUser && okPass;
}

/** 產生登入 cookie 的值：到期時間.簽章；簽章內含帳號，換帳號或換金鑰都會失效 */
export async function makeSession(env: AuthEnv): Promise<string> {
  if (!env.AUTH_SECRET || !env.APP_USERNAME) throw new Error("尚未設定 AUTH_SECRET（請執行 node scripts/setup-login.mjs）");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  return `${exp}.${await hmac(env.AUTH_SECRET, `${env.APP_USERNAME}:${exp}`)}`;
}

export async function verifySession(env: AuthEnv, value: string | null | undefined): Promise<boolean> {
  if (!value || !env.AUTH_SECRET || !env.APP_USERNAME) return false;
  const dot = value.indexOf(".");
  if (dot < 0) return false;
  const exp = Number(value.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmac(env.AUTH_SECRET, `${env.APP_USERNAME}:${exp}`);
  return safeEqual(expected, value.slice(dot + 1));
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}
