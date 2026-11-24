-- 資料版本號：出釣、釣獲、釣點有變動就 +1；分析快取比對版本號，版本相同就不重算
CREATE TABLE data_version (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
INSERT INTO data_version (k, v) VALUES ('data', 1);
CREATE TABLE analysis_cache (key TEXT PRIMARY KEY, version INTEGER NOT NULL, body TEXT NOT NULL);
-- 水色：clear 清 / light 微濁 / murky 濁 / muddy 很濁，沒填是 NULL
ALTER TABLE catches ADD COLUMN water_color TEXT;
