# 釣況紀錄

記錄每次出釣（包含槓龜）的釣獲與當下海況，依照條件分析哪種天氣比較好釣。手機優先，可加到主畫面（PWA）。

正式網址：**https://fishing.weather-push-worker.workers.dev**

> 不需要登入：知道網址的人都能看到並修改資料，網址不要公開分享。

## 架構

| 部分 | 技術 |
|---|---|
| 前端 | React 19 + MUI 9 + SWR，Vite 打包 |
| API／排程 | Cloudflare Worker（`worker/`），同一個 Worker 也負責提供前端靜態檔 |
| 資料庫 | Cloudflare D1（SQLite），schema 在 `migrations/` |
| 照片 | 存在 D1 的 `photos` 表（不用 R2，免綁卡），上傳前在手機端縮到 1600px，單張上限約 1.5MB |
| 共用邏輯 | `shared/conditions.ts`：月相、潮汐判斷、分析分組、評分 |

### 天氣資料

- 每 20 分鐘排程（`*/20 * * * *`）抓未來 8 天的逐小時資料：
  1. **溫古魯**頂部表格的模型：GFS 13km（風、陣風、風向、氣溫、雲量、降雨、氣壓）+ GFS-Wave 16km（浪高、週期、浪向、湧浪）
  2. **Open-Meteo**：海溫、含潮汐的海面高度；溫古魯失敗或缺資料的小時也用它補（指定同一套 NOAA GFS／GFS-Wave 模型）
- `weather_hourly` 以 `(spot_id, time)` 為主鍵 upsert：**已經過去的小時不再被覆蓋**，所以留下的是最接近當下的那次預報；一個釣點一年約 8,760 筆。
- 新增或修改出釣時，如果那段時間沒有天氣資料，會用 Open-Meteo 補抓過去的資料。
- 月亮亮度用 `suncalc` 計算；潮汐狀態（漲／退／滿／乾）用前後一小時的海面高度判斷。

### 分析與評分

- 出釣時間切成每小時，每小時依條件分組（浪高、潮汐、月亮、風向、風速、雲量、時段、氣溫、海溫、降雨）。
- 每組算「每小時釣獲數」，分數 50 = 跟平均一樣；釣的時數少的分組會被拉回平均值（`SMOOTHING_HOURS`）。
- 預報的評分 = 各條件分數比值的幾何平均，累積 5 小時以上的出釣紀錄才會開始評分。

## 本地開發

```bash
pnpm install
pnpm db:migrate:local
pnpm dev:api   # Worker 跑在 :8787
pnpm dev       # 前端，/api 代理到 :8787
```

本地手動觸發排程：`curl "http://127.0.0.1:8787/__scheduled?cron=*/20+*+*+*+*"`，或在 App 的「設定 → 立即更新」。

## 部署到 Cloudflare

1. 建立資源（已建立過就跳過）：

   ```bash
   npx wrangler d1 create fish-db        # 把輸出的 database_id 填進 wrangler.toml
   pnpm db:migrate:remote
   ```

2. 手動部署：`pnpm deploy`。

### 自動部署（GitHub Actions）

push 到 `main` 會自動跑 `.github/workflows/deploy.yml`：安裝 → 建置 → 套用 D1 migration → `wrangler deploy`。
需要在 GitHub repo 的 Settings → Secrets and variables → Actions 加兩個 secret：

| Secret | 取得方式 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token，用「Edit Cloudflare Workers」範本，再加上 **D1 Edit** 權限 |
| `CLOUDFLARE_ACCOUNT_ID` | `npx wrangler whoami` 或 Cloudflare 後台右側的 Account ID |

## 目錄結構

```
src/
  App.tsx          登入判斷，900px 以上用電腦版，以下用手機版
  mobile/          手機版：底部導覽、今天／行事曆／分析／設定
  pc/              電腦版：側邊欄、總覽、行事曆（右側直接顯示當天）、分析
  components/      兩邊共用的元件（預報表、月曆、單日紀錄、對話框…）
  hooks/           兩邊共用的資料邏輯（useToday、useCalendar、useAnalysis）
  lib/             API、格式化、型別
worker/            Cloudflare Worker：API、排程抓天氣、分析
shared/            前後端共用：月相、潮汐、分析分組
migrations/        D1 schema
```
