-- 釣點
CREATE TABLE spots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  lat         REAL    NOT NULL,
  lon         REAL    NOT NULL,
  wg_spot_id  INTEGER,             -- 溫古魯 spot id（選填，用來嵌入預報）
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO spots (name, lat, lon, wg_spot_id, is_default) VALUES ('水湳洞漁港', 25.1257, 121.8616, 733676, 1);

-- 出釣紀錄（沒釣到也要記）
CREATE TABLE trips (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id     INTEGER NOT NULL REFERENCES spots(id),
  date        TEXT    NOT NULL,     -- 台灣日期 YYYY-MM-DD
  start_at    INTEGER NOT NULL,     -- unix 秒
  end_at      INTEGER NOT NULL,     -- unix 秒
  note        TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_trips_date ON trips(date);

-- 釣獲
CREATE TABLE catches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id     INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  caught_at   INTEGER NOT NULL,     -- unix 秒
  species     TEXT    NOT NULL CHECK (species IN ('squid', 'fish')),
  fish_name   TEXT,                 -- species = fish 時的魚名
  length_cm   REAL,                 -- 軟絲：胴長；魚：全長
  weight_g    REAL,
  note        TEXT,
  photo_key   TEXT,                 -- R2 物件 key
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_catches_trip ON catches(trip_id);

-- 逐小時天氣／海況（每個釣點、每個小時只有一筆，用 upsert 更新）
CREATE TABLE weather_hourly (
  spot_id        INTEGER NOT NULL REFERENCES spots(id),
  time           INTEGER NOT NULL,  -- 該小時起點 unix 秒
  source         TEXT    NOT NULL,  -- 'open-meteo' / 'windguru'
  temp_c         REAL,
  wind_ms        REAL,
  gust_ms        REAL,
  wind_dir       REAL,              -- 風從哪裡吹來（度）
  cloud_pct      REAL,
  precip_mm      REAL,
  pressure_hpa   REAL,
  wave_m         REAL,
  wave_period_s  REAL,
  wave_dir       REAL,
  swell_m        REAL,
  sea_temp_c     REAL,
  sea_level_m    REAL,              -- 含潮汐的海面高度，用來判斷漲退潮
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (spot_id, time)
);
