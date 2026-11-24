-- 多帳號：users 表存其他人的帳號（密碼只存 PBKDF2 雜湊）。
-- id 1 保留給站主（APP_USERNAME／APP_PASSWORD），這一列只是佔位，不能用來登入（帳號名稱不合規則）。
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO users (id, username, password_hash, salt) VALUES (1, '(owner)', '', '');
