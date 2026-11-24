-- 好時段推播：訂閱（每支手機／瀏覽器一筆）與每天是否已經通知過
CREATE TABLE push_subscriptions (
  endpoint    TEXT PRIMARY KEY,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  last_ok_at  INTEGER
);

CREATE TABLE push_sent (
  day      TEXT PRIMARY KEY,   -- 台灣日期 YYYY-MM-DD，一天最多通知一次
  sent_at  INTEGER NOT NULL,
  message  TEXT
);
