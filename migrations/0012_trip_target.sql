-- 每趟出釣的目標：軟絲或魚。分析時只把同一目標的出釣算進該物種（不然釣軟絲的時候，魚會被算成很多次空軍）。
-- 既有出釣：有軟絲釣獲或沒有任何釣獲的，當成軟絲；只有魚釣獲的，當成魚。
ALTER TABLE trips ADD COLUMN target TEXT NOT NULL DEFAULT 'squid' CHECK (target IN ('squid', 'fish'));
UPDATE trips SET target = 'fish'
 WHERE id IN (SELECT trip_id FROM catches WHERE species = 'fish')
   AND id NOT IN (SELECT trip_id FROM catches WHERE species = 'squid');
