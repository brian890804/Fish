import useSWR, { type SWRConfiguration } from "swr";

const KEY_STORAGE = "fish.appKey";

export function getAppKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setAppKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* 私密瀏覽模式等情況寫不進去就算了 */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-app-key", getAppKey());
  if (init.body && typeof init.body === "string") headers.set("content-type", "application/json");
  const res = await fetch(`/api${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event("fish:logout"));
    throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const post = <T = any>(path: string, data: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(data) });
export const put = <T = any>(path: string, data: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(data) });
export const del = (path: string) => api(path, { method: "DELETE" });

export function useApi<T>(path: string | null, config?: SWRConfiguration) {
  return useSWR<T>(path, (p: string) => api<T>(p), config);
}

/** 上傳前先在手機上縮圖，省流量也省空間 */
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file, 1600, 0.82);
  const res = await fetch("/api/photos", {
    method: "POST",
    headers: { "x-app-key": getAppKey(), "content-type": blob.type },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "上傳失敗");
  return data.key;
}

async function resizeImage(file: File, maxSide: number, quality: number): Promise<Blob> {
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
    return file; // 瀏覽器不支援就直接傳原圖
  }
}

export const photoUrl = (key: string) => `/api/photos/${key}`;
