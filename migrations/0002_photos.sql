-- 照片直接存在 D1（不使用 R2，免綁卡）。
-- 獨立一張表，查行事曆／分析時不會讀到照片內容。
CREATE TABLE photos (
  key           TEXT    PRIMARY KEY,   -- 對應 catches.photo_key
  content_type  TEXT    NOT NULL,
  size          INTEGER NOT NULL,
  data          BLOB    NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
