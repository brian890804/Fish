-- 出釣與推播訂閱改成「個人的」（目前只有一個帳號，既有資料全部歸到帳號 1）。
-- 天氣、潮汐、釣點仍然是共用的，不加 user_id。釣獲透過出釣間接歸屬，照片透過釣獲間接歸屬。
ALTER TABLE trips ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX idx_trips_user_date ON trips (user_id, date);
ALTER TABLE push_subscriptions ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
