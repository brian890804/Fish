-- 每個通知裝置可以選要收哪一種的好時段：軟絲、魚，或兩者。舊的裝置預設只收軟絲（跟原本一樣）。
ALTER TABLE push_subscriptions ADD COLUMN species TEXT NOT NULL DEFAULT 'squid' CHECK (species IN ('squid', 'fish', 'both'));
