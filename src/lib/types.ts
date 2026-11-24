import type { FactorStat, TideState } from "../../shared/conditions";

export type Species = "squid" | "fish";

export interface Spot {
  id: number;
  name: string;
  lat: number;
  lon: number;
  wg_spot_id: number | null;
  /** 共用哪個釣點的天氣；null 表示自己抓 */
  weather_spot_id: number | null;
  sort_order: number;
  is_default: number;
}

export interface WeatherHour {
  spot_id: number;
  time: number;
  source: string;
  temp_c: number | null;
  wind_ms: number | null;
  gust_ms: number | null;
  wind_dir: number | null;
  cloud_pct: number | null;
  precip_mm: number | null;
  pressure_hpa: number | null;
  wave_m: number | null;
  wave_period_s: number | null;
  wave_dir: number | null;
  swell_m: number | null;
  sea_temp_c: number | null;
  sea_level_m: number | null;
}

export interface ForecastHour extends WeatherHour {
  tide: TideState | null;
  moon_pct: number;
  moon_emoji: string;
  score: number | null;
}

export interface ForecastResponse {
  spot: Spot;
  hours: ForecastHour[];
  updatedAt: number | null;
  source: string | null;
  historyHours: number;
  tideEvents: { time: number; type: "high" | "low"; height_cm?: number | null }[];
}

export interface Catch {
  id: number;
  trip_id: number;
  caught_at: number;
  species: Species;
  fish_name: string | null;
  length_cm: number | null;
  weight_g: number | null;
  note: string | null;
  photo_key: string | null;
  /** 所有照片，第一張是封面 */
  photo_keys?: string[];
  /** 木蝦顏色：red / blue / green / purple / gray / yellow / brown */
  egi_color?: string | null;
}

export interface Trip {
  id: number;
  spot_id: number;
  spot_name: string;
  date: string;
  start_at: number;
  end_at: number;
  note: string | null;
  catches: Catch[];
  weather: WeatherHour[];
  /** 氣象署的滿／乾潮時間 */
  tide_events?: { time: number; type: "high" | "low"; height_cm?: number | null }[];
}

export interface DayDetail {
  date: string;
  trips: Trip[];
}

export interface CalendarDay {
  date: string;
  trips: number;
  squid: number;
  fish: number;
}

export interface Analysis {
  from: string;
  to: string;
  trips: number;
  hours: number;
  catches: number;
  squid: number;
  fish: number;
  rate: number;
  avgLengthCm: number | null;
  maxLengthCm: number | null;
  egiColors: { color: string; catches: number; avgLengthCm: number | null }[];
  blankTrips: number;
  missingWeatherHours: number;
  factors: FactorStat[];
}
