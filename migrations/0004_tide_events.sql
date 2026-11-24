-- 潮汐改用中央氣象署的潮汐預報（滿潮／乾潮的時間點），比海洋模型準。
-- 模型的海面高度在傍晚那一波小潮會早 1.5–2 小時，所以只在沒有氣象署資料時當備援。
CREATE TABLE tide_events (
  spot_id    INTEGER NOT NULL REFERENCES spots(id),  -- 天氣來源釣點
  time       INTEGER NOT NULL,                        -- 滿潮或乾潮的時間（unix 秒）
  type       TEXT    NOT NULL CHECK (type IN ('high', 'low')),
  height_cm  REAL,                                    -- 相對當地平均海面
  source     TEXT    NOT NULL,                        -- 'cwa-forecast' / 'cwa-obs-<站號>'
  PRIMARY KEY (spot_id, time)
);

-- 氣象署潮汐預報的地點名稱（F-A0021-001 的 LocationName）
ALTER TABLE spots ADD COLUMN cwa_tide_location TEXT;
UPDATE spots SET cwa_tide_location = '新北市瑞芳區' WHERE id = 1;
