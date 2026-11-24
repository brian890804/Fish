import dayjs from "dayjs";

export const MS_TO_KN = 1.943844;
export const kn = (ms: number | null | undefined) => (ms == null ? null : Math.round(ms * MS_TO_KN));

export const hm = (t: number) => dayjs.unix(t).format("HH:mm");
export const fmt1 = (v: number | null | undefined, unit = "") => (v == null ? "-" : `${+v.toFixed(1)}${unit}`);

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
export const weekday = (t: number) => WEEK[dayjs.unix(t).day()];

/** 溫古魯風格的風速顏色（節） */
export function windColor(k: number | null): string {
  if (k == null) return "transparent";
  const stops: [number, string][] = [
    [0, "#ffffff"], [5, "#ffffff"], [8, "#b7f5b5"], [12, "#5fe35b"], [16, "#f2f227"],
    [20, "#f5a623"], [24, "#f04848"], [30, "#d9389a"], [36, "#8e3bd9"],
  ];
  for (let i = stops.length - 1; i >= 0; i--) if (k >= stops[i][0]) return stops[i][1];
  return stops[0][1];
}

/** 浪高顏色 */
export function waveColor(m: number | null): string {
  if (m == null) return "transparent";
  if (m < 0.5) return "#e6f0ff";
  if (m < 1) return "#c4d8ff";
  if (m < 1.5) return "#9fb7ff";
  if (m < 2) return "#8a8cf0";
  if (m < 2.5) return "#9a6ae0";
  return "#b14bd1";
}

export function tempColor(c: number | null): string {
  if (c == null) return "transparent";
  if (c < 14) return "#7fb3ff";
  if (c < 18) return "#a8e6a1";
  if (c < 22) return "#f6e27a";
  if (c < 26) return "#f8b55c";
  return "#f47c4c";
}

export function scoreColor(s: number | null): string {
  if (s == null) return "rgba(255,255,255,0.25)";
  if (s >= 65) return "#4caf50";
  if (s >= 55) return "#8bc34a";
  if (s >= 45) return "#ffc107";
  if (s >= 35) return "#ff9800";
  return "#f44336";
}

export function scoreLabel(s: number | null): string {
  if (s == null) return "資料不足";
  if (s >= 65) return "很好";
  if (s >= 55) return "不錯";
  if (s >= 45) return "普通";
  if (s >= 35) return "偏差";
  return "差";
}
