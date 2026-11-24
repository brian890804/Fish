-- 照片縮圖（約 360px）：清單、表單、排行榜用小圖，點開放大才載入原圖。舊照片沒有縮圖時會退回原圖
ALTER TABLE photos ADD COLUMN thumb BLOB;
