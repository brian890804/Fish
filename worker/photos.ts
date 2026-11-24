// 照片存在 D1 的 photos 表。D1 單筆資料上限約 2MB，前端上傳前已縮到 1600px JPEG（通常 200–400KB）。

export const MAX_PHOTO_BYTES = 1_800_000;

export async function putPhoto(db: D1Database, key: string, contentType: string, data: ArrayBuffer) {
  await db
    .prepare("INSERT INTO photos (key, content_type, size, data) VALUES (?, ?, ?, ?)")
    .bind(key, contentType, data.byteLength, data)
    .run();
}

export async function getPhoto(db: D1Database, key: string) {
  const row = await db
    .prepare("SELECT content_type, data FROM photos WHERE key = ?")
    .bind(key)
    .first<{ content_type: string; data: ArrayBuffer | number[] }>();
  if (!row) return null;
  // D1 的 BLOB 會以 number[] 回傳，轉回位元組
  const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data);
  return { contentType: row.content_type, bytes };
}

export async function deletePhotos(db: D1Database, keys: string[]) {
  if (keys.length === 0) return;
  await db.prepare(`DELETE FROM photos WHERE key IN (${keys.map(() => "?").join(",")})`).bind(...keys).run();
}
