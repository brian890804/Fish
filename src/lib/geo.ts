import type { Spot } from "./types";

export interface Pos {
  lat: number;
  lon: number;
  accuracy: number;
}

/** 取得目前位置；使用者拒絕、沒有 GPS 或逾時就回傳 null，不影響其他功能 */
export function getPosition(timeoutMs = 6000): Promise<Pos | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    const timer = setTimeout(() => resolve(null), timeoutMs + 500);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * 釣點有沒有自己的座標：共用天氣的釣點建立時會沿用天氣來源的座標，
 * 跟天氣來源一模一樣就代表還沒設定過，不拿來判斷最近的釣點（不然大家距離都一樣）。
 */
export function hasOwnLocation(s: Spot, spots: Spot[]): boolean {
  if (!s.weather_spot_id) return true;
  const src = spots.find((x) => x.id === s.weather_spot_id);
  return !src || Math.abs(src.lat - s.lat) > 1e-5 || Math.abs(src.lon - s.lon) > 1e-5;
}

/** 找最近的釣點（在 maxKm 內才算，太遠代表不在任何釣點） */
export function nearestSpot(spots: Spot[], pos: { lat: number; lon: number }, maxKm = 2): { spot: Spot; km: number } | null {
  let best: { spot: Spot; km: number } | null = null;
  for (const s of spots) {
    if (!hasOwnLocation(s, spots)) continue;
    const km = distanceKm(pos, s);
    if (km <= maxKm && (!best || km < best.km)) best = { spot: s, km };
  }
  return best;
}
