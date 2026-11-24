// 登入有兩種帳號：
// 1. 站主：APP_USERNAME／APP_PASSWORD 存在 Cloudflare secret，固定是使用者 id 1（既有的資料都屬於他）。
// 2. 其他人：用邀請碼（INVITE_CODE secret）在 App 內註冊，密碼用 PBKDF2 雜湊存在 D1 的 users 表。
// 登入成功後發一個 HttpOnly cookie，內容是「使用者 id.到期時間.HMAC 簽章」，有效 400 天，
// 所以只要登入一次，之後在同一台裝置上不用再打。簽章金鑰是 AUTH_SECRET；換掉它會讓所有裝置都要重新登入。

export interface AuthEnv {
  DB: D1Database;
  APP_USERNAME?: string;
  APP_PASSWORD?: string;
  AUTH_SECRET?: string;
  INVITE_CODE?: string;
}

/** 站主的使用者 id；既有的出釣、釣獲、照片、推播訂閱都屬於他 */
export const OWNER_ID = 1;

export const SESSION_COOKIE = "fish_session";
const SESSION_DAYS = 400;
const PBKDF2_ITERATIONS = 100_000; // Workers 的 PBKDF2 上限

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer) => {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

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

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return toHex(bits);
}

/** 站主帳號的名稱（App 內顯示用） */
export async function usernameOf(env: AuthEnv, uid: number): Promise<string> {
  if (uid === OWNER_ID) return env.APP_USERNAME ?? "";
  const row = await env.DB.prepare("SELECT username FROM users WHERE id = ?").bind(uid).first<{ username: string }>();
  return row?.username ?? "";
}

/** 帳號密碼正確就回傳使用者 id，否則 null */
export async function loginUser(env: AuthEnv, username: string, password: string): Promise<number | null> {
  if (env.APP_USERNAME && safeEqual(username, env.APP_USERNAME)) {
    // 站主帳號名稱保留給站主，密碼錯就不再去查其他帳號
    if (!env.APP_PASSWORD || !safeEqual(password, env.APP_PASSWORD)) return null;
    return OWNER_ID;
  }
  const row = await env.DB.prepare("SELECT id, password_hash, salt FROM users WHERE username = ? AND id <> ?")
    .bind(username, OWNER_ID)
    .first<{ id: number; password_hash: string; salt: string }>();
  if (!row) return null;
  return safeEqual(await pbkdf2(password, row.salt), row.password_hash) ? row.id : null;
}

/** 邀請碼是否正確；沒有設定 INVITE_CODE 就是沒有開放註冊 */
export function inviteOk(env: AuthEnv, invite: string): boolean {
  return !!env.INVITE_CODE && safeEqual(invite, env.INVITE_CODE);
}

/** 建立新帳號，名稱已經有人用就回傳 null */
export async function createUser(db: D1Database, username: string, password: string): Promise<number | null> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toHex(saltBytes.buffer);
  const hash = await pbkdf2(password, salt);
  try {
    const row = await db
      .prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?) RETURNING id")
      .bind(username, hash, salt)
      .first<{ id: number }>();
    return row?.id ?? null;
  } catch {
    // UNIQUE 衝突（帳號重複）
    return null;
  }
}

/** 產生登入 cookie 的值：使用者 id.到期時間.簽章 */
export async function makeSession(env: AuthEnv, uid: number): Promise<string> {
  if (!env.AUTH_SECRET) throw new Error("尚未設定 AUTH_SECRET（請執行 node scripts/setup-login.mjs）");
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  return `${uid}.${exp}.${await hmac(env.AUTH_SECRET, `${uid}:${exp}`)}`;
}

/** 從 cookie 取出使用者 id；不是有效登入就回傳 null */
export async function sessionUserId(env: AuthEnv, value: string | null | undefined): Promise<number | null> {
  if (!value || !env.AUTH_SECRET) return null;
  const [uidPart, expPart, sig] = value.split(".");
  if (!uidPart || !expPart || !sig) return null;
  const uid = Number(uidPart);
  const exp = Number(expPart);
  if (!Number.isInteger(uid) || uid < 1 || !Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = await hmac(env.AUTH_SECRET, `${uid}:${exp}`);
  return safeEqual(expected, sig) ? uid : null;
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
