-- 釣點可以共用其他釣點的天氣：附近的釣點不用各自抓，直接用水湳洞漁港的預報。
-- weather_spot_id 為 NULL 表示自己抓天氣；否則使用該釣點的 weather_hourly。
ALTER TABLE spots ADD COLUMN weather_spot_id INTEGER REFERENCES spots(id);
ALTER TABLE spots ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- 原本的水湳洞漁港保留為天氣來源，名稱改成釣點名稱「水湳洞」
UPDATE spots SET name = '水湳洞', sort_order = 2 WHERE id = 1;

-- 附近的釣點，依使用者指定的順序；座標先沿用水湳洞（天氣共用，座標只是參考）
INSERT INTO spots (name, lat, lon, weather_spot_id, sort_order)
SELECT '金石園', lat, lon, id, 1 FROM spots WHERE id = 1;
INSERT INTO spots (name, lat, lon, weather_spot_id, sort_order)
SELECT '鶯歌石', lat, lon, id, 3 FROM spots WHERE id = 1;
INSERT INTO spots (name, lat, lon, weather_spot_id, sort_order)
SELECT '紅牆', lat, lon, id, 4 FROM spots WHERE id = 1;
INSERT INTO spots (name, lat, lon, weather_spot_id, sort_order)
SELECT '明隧道', lat, lon, id, 5 FROM spots WHERE id = 1;
