// 照片存在 D1 的 photos 表。D1 單筆資料上限約 2MB，前端上傳前已縮到 1600px JPEG（通常 200–500KB），
// 另外存一張約 360px 的縮圖（約 20–30KB），清單和表單用縮圖，放大才載入原圖。

export const MAX_PHOTO_BYTES = 1_800_000;

export async function putPhoto(db: D1Database, key: string, contentType: string, data: ArrayBuffer) {
  await db
    .prepare("INSERT INTO photos (key, content_type, size, data) VALUES (?, ?, ?, ?)")
    .bind(key, contentType, data.byteLength, data)
    .run();
}

export const MAX_THUMB_BYTES = 200_000;

const toBytes = (v: ArrayBuffer | number[]) => (v instanceof ArrayBuffer ? new Uint8Array(v) : new Uint8Array(v));

/** 讀照片；thumb = true 時讀縮圖，舊照片沒有縮圖就退回原圖 */
export async function getPhoto(db: D1Database, key: string, thumb = false) {
  if (thumb) {
    const t = await db
      .prepare("SELECT thumb FROM photos WHERE key = ? AND thumb IS NOT NULL")
      .bind(key)
      .first<{ thumb: ArrayBuffer | number[] }>();
    if (t) return { contentType: "image/jpeg", bytes: toBytes(t.thumb), isThumb: true };
  }
  const row = await db
    .prepare("SELECT content_type, data FROM photos WHERE key = ?")
    .bind(key)
    .first<{ content_type: string; data: ArrayBuffer | number[] }>();
  if (!row) return null;
  // D1 的 BLOB 會以 number[] 回傳，轉回位元組
  return { contentType: row.content_type, bytes: toBytes(row.data), isThumb: false };
}

export async function putThumb(db: D1Database, key: string, data: ArrayBuffer) {
  const r = await db.prepare("UPDATE photos SET thumb = ? WHERE key = ?").bind(data, key).run();
  return r.meta.changes > 0;
}

export async function deletePhotos(db: D1Database, keys: string[]) {
  if (keys.length === 0) return;
  await db.prepare(`DELETE FROM photos WHERE key IN (${keys.map(() => "?").join(",")})`).bind(...keys).run();
}
