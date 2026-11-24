-- 一筆釣獲可以有多張照片：photo_keys 存 JSON 陣列；photo_key 保留為第一張（封面），舊資料自動搬過去
ALTER TABLE catches ADD COLUMN photo_keys TEXT;
UPDATE catches SET photo_keys = json_array(photo_key) WHERE photo_key IS NOT NULL;
