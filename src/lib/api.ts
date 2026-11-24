import useSWR, { type SWRConfiguration } from "swr";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const CACHE_PREFIX = "fish.cache:";
const AUTH_FLAG = "fish.authed";

/** 讀取上次存的資料（離線時用） */
function readCache(path: string): unknown {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeCache(path: string, data: unknown) {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    /* 空間不夠就不存，不影響使用 */
  }
}

/** 上次存在手機的資料（SWR 用來先顯示，再背景更新） */
export function cachedValue<T>(path: string): T | undefined {
  return readCache(path) as T | undefined;
}

export function clearCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
  } catch {
    /* 忽略 */
  }
}

export function setAuthFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(AUTH_FLAG, "1");
    else localStorage.removeItem(AUTH_FLAG);
  } catch {
    /* 忽略 */
  }
}
export const wasAuthed = () => {
  try {
    return localStorage.getItem(AUTH_FLAG) === "1";
  } catch {
    return false;
  }
};

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const isGet = !init.method || init.method === "GET";
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("content-type", "application/json");
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: "same-origin" });
  } catch {
    // 離線（或網路斷線）：讀取類的請求退回上次存的資料
    if (isGet) {
      const cached = readCache(path);
      if (cached !== undefined) return cached as T;
    }
    throw new ApiError(0, "目前離線，而且這份資料還沒有存過");
  }
  const data = await res.json().catch(() => ({}));
  // 登入過期：回到登入頁（登入本身失敗不算過期）
  if (res.status === 401 && path !== "/login") window.dispatchEvent(new Event("fish:logout"));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  }
  if (isGet) writeCache(path, data);
  return data as T;
}

/** 登入：成功後 cookie 會存 400 天，之後不用再輸入 */
export async function login(username: string, password: string) {
  await post("/login", { username, password });
  setAuthFlag(true);
}

/** 註冊新帳號（需要邀請碼）；成功後直接登入 */
export async function register(username: string, password: string, invite: string) {
  await post("/register", { username, password, invite });
  setAuthFlag(true);
}

export async function logout() {
  try {
    await post("/logout", {});
  } finally {
    setAuthFlag(false);
    clearCache();
    window.dispatchEvent(new Event("fish:logout"));
  }
}

export const post = <T = any>(path: string, data: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T = any>(path: string, data: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const del = (path: string) => api(path, { method: "DELETE" });

export function useApi<T>(path: string | null, config?: SWRConfiguration) {
  // 打開 App 時先用上次的資料顯示（不會先空白），拿到新資料再更新
  return useSWR<T>(path, (p: string) => api<T>(p), {
    fallbackData: path ? cachedValue<T>(path) : undefined,
    ...config,
  });
}

/** 上傳前先在手機上縮圖，省流量也省空間 */
const MAX_UPLOAD_BYTES = 1_500_000;

export async function uploadPhoto(file: File): Promise<string> {
  // 照片存在 D1（單筆上限約 2MB），太大就逐步縮小
  let blob = await resizeImage(file, 1600, 0.82);
  for (const [side, q] of [[1280, 0.75], [1024, 0.7], [800, 0.65]] as const) {
    if (blob.size <= MAX_UPLOAD_BYTES) break;
    blob = await resizeImage(file, side, q);
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "照片太大，換一張試試");
  const res = await fetch("/api/photos", {
    method: "POST",
    headers: { "content-type": blob.type },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "上傳失敗");
  // 另外送一張小縮圖（清單、表單用），失敗也沒關係，會退回原圖
  await uploadThumb(data.key, file).catch(() => undefined);
  return data.key;
}

async function resizeImage(file: Blob, maxSide: number, quality: number): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("壓縮失敗"))), "image/jpeg", quality),
    );
  } catch {
    // 瀏覽器無法處理這個檔案（例如特殊格式）：明確告訴使用者，不默默上傳原檔
    throw new Error("這張照片無法處理（可能是特殊格式），請換成 JPG 或 PNG 再試");
  }
}

/** size = "thumb" 用縮圖（清單、表單）；不填是原圖（放大看） */
export const photoUrl = (key: string, size?: "thumb") => `/api/photos/${key}${size === "thumb" ? "?s=thumb" : ""}`;

const THUMB_SIDE = 360;

async function uploadThumb(key: string, source: Blob) {
  const thumb = await resizeImage(source, THUMB_SIDE, 0.72);
  if (thumb === source) return; // 瀏覽器不支援縮圖就算了
  const res = await fetch(`/api/photos/${key}/thumb`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: thumb });
  if (!res.ok) throw new Error("縮圖上傳失敗");
}

/** 舊照片沒有縮圖：在背景下載原圖、縮小後補上（每次開 App 做一次，一次最多 30 張） */
export async function backfillThumbs() {
  try {
    const keys = await api<string[]>("/photos-missing-thumbs");
    for (const key of keys) {
      const res = await fetch(photoUrl(key));
      if (res.ok) await uploadThumb(key, await res.blob()).catch(() => undefined);
    }
  } catch {
    /* 背景工作，失敗就下次再試 */
  }
}
