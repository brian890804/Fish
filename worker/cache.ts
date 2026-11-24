// 分析結果快取：出釣、釣獲、釣點有任何變動就把資料版本號 +1，快取的版本號對不上才重算。
// 這樣每次開 App 不用把所有歷史重算一遍；紀錄不變時直接讀快取。

export async function dataVersion(db: D1Database): Promise<number> {
  const r = await db.prepare("SELECT v FROM data_version WHERE k = 'data'").first<{ v: number }>();
  return r?.v ?? 0;
}

export async function bumpVersion(db: D1Database): Promise<void> {
  await db.prepare("UPDATE data_version SET v = v + 1 WHERE k = 'data'").run();
}

export async function cached<T>(db: D1Database, key: string, compute: () => Promise<T>): Promise<T> {
  const v = await dataVersion(db);
  const hit = await db.prepare("SELECT version, body FROM analysis_cache WHERE key = ?").bind(key).first<{ version: number; body: string }>();
  if (hit && hit.version === v) return JSON.parse(hit.body) as T;
  // 先記下版本號再計算：計算途中有人改資料的話，下次會重算
  const out = await compute();
  await db
    .prepare(
      "INSERT INTO analysis_cache (key, version, body) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET version = excluded.version, body = excluded.body",
    )
    .bind(key, v, JSON.stringify(out))
    .run();
  return out;
}
