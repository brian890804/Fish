// 中央氣象署潮汐預報（F-A0021-001，未來一個月的滿潮／乾潮時間）。
// 過去的事件抓過就留在資料庫，所以出釣當天的潮汐會一直是氣象署的資料。
import type { TideEvent } from "../shared/conditions";

const CWA_TIDE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-A0021-001";

export interface StoredTideEvent extends TideEvent {
  source: string;
}

export async function fetchCwaTide(apiKey: string, locationName: string): Promise<StoredTideEvent[]> {
  const url = `${CWA_TIDE_URL}?format=JSON&LocationName=${encodeURIComponent(locationName)}`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`氣象署潮汐預報 HTTP ${res.status}`);
  const data = (await res.json()) as any;
  const loc = (data?.records?.TideForecasts ?? []).find((x: any) => x?.Location?.LocationName === locationName);
  if (!loc) throw new Error(`氣象署潮汐預報找不到地點「${locationName}」`);
  const out: StoredTideEvent[] = [];
  for (const day of loc.Location.TimePeriods?.Daily ?? []) {
    for (const t of day.Time ?? []) {
      const type = t.Tide === "滿潮" ? "high" : t.Tide === "乾潮" ? "low" : null;
      const time = Date.parse(t.DateTime) / 1000;
      if (!type || !Number.isFinite(time)) continue;
      const h = Number(t.TideHeights?.AboveLocalMSL);
      out.push({ time, type, height_cm: Number.isFinite(h) ? h : null, source: "cwa-forecast" });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

export async function saveTideEvents(db: D1Database, spotId: number, events: StoredTideEvent[]) {
  if (events.length === 0) return 0;
  const stmt = db.prepare(
    `INSERT INTO tide_events (spot_id, time, type, height_cm, source) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(spot_id, time) DO UPDATE SET type = excluded.type, height_cm = excluded.height_cm, source = excluded.source`,
  );
  const batch = events.map((e) => stmt.bind(spotId, e.time, e.type, e.height_cm ?? null, e.source));
  for (let i = 0; i < batch.length; i += 100) await db.batch(batch.slice(i, i + 100));
  return events.length;
}

/** 讀出某段時間的潮汐事件（前後各多抓 12 小時，才能判斷區間頭尾的漲退） */
export async function loadTideEvents(db: D1Database, spotIds: number[], from: number, to: number) {
  const map = new Map<number, TideEvent[]>();
  if (spotIds.length === 0) return map;
  const { results } = await db
    .prepare(
      `SELECT spot_id, time, type, height_cm FROM tide_events
       WHERE spot_id IN (${spotIds.map(() => "?").join(",")}) AND time BETWEEN ? AND ? ORDER BY time`,
    )
    .bind(...spotIds, from - 12 * 3600, to + 12 * 3600)
    .all<TideEvent & { spot_id: number }>();
  for (const r of results) {
    if (!map.has(r.spot_id)) map.set(r.spot_id, []);
    map.get(r.spot_id)!.push({ time: r.time, type: r.type, height_cm: r.height_cm });
  }
  return map;
}

/** 排程呼叫：已經有 20 天以後的資料就不用再抓（一個月的預報每天抓一次就夠） */
export async function refreshTide(db: D1Database, apiKey: string | undefined, spot: { id: number; cwa_tide_location?: string | null }) {
  if (!apiKey || !spot.cwa_tide_location) return { tide: "skipped" as const };
  const last = await db.prepare("SELECT MAX(time) AS t FROM tide_events WHERE spot_id = ? AND source = 'cwa-forecast'")
    .bind(spot.id).first<{ t: number | null }>();
  if (last?.t && last.t > Date.now() / 1000 + 20 * 86400) return { tide: "fresh" as const };
  const events = await fetchCwaTide(apiKey, spot.cwa_tide_location);
  return { tide: await saveTideEvents(db, spot.id, events) };
}
