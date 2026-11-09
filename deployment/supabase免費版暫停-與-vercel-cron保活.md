# Supabase 免費版自動暫停 與 Vercel Cron 保活

## 現象

- Vercel 註冊／登入失敗，log：`PrismaClientInitializationError: Can't reach database server at ...pooler.supabase.com:5432`
- Supabase 後台專案狀態 INACTIVE（暫停）
- 免費版專案閒置一段時間會被自動暫停，恢復（Restore）後可連線，資料還在

## 診斷方式

| 看什麼 | 結論 |
|---|---|
| 假帳號登入回「會員不存在」 | 資料庫連得到，帳號不存在 |
| 假帳號登入回「登入失敗」 | catch 被觸發，查詢本身丟出例外（連線問題） |
| Vercel Runtime Log | 錯誤細節，Hobby 只保留 1 小時 |
| `DATABASE_URL` 編輯畫面空白 | Sensitive 變數不顯示值，不代表沒設定 |

## 保活做法

1. 新增 `app/(api)/api/health/route.js`，內容 `SELECT 1`，加 `export const dynamic = 'force-dynamic'` 避免建置時被預先渲染
2. 根目錄新增 `vercel.json`：

```json
{
  "crons": [
    { "path": "/api/health", "schedule": "0 3 * * *" }
  ]
}
```

3. push 到 `main`，Cron 只在 production 部署執行
4. 測試：Vercel 後台 → Settings → Cron Jobs → Run

## Cron 表達式

```
0  3  *  *  *
│  │  │  │  └ 星期（0-7）
│  │  │  └──── 月（1-12）
│  │  └─────── 日（1-31）
│  └────────── 時（0-23）
└───────────── 分（0-59）
```

- `*` 代表「任何值」，不是 UTC
- `0 3 * * *` = 每天 03:00
- Vercel 官方範例註明用 **UTC**，台灣 = UTC+8，所以 `0 3 * * *` = 台灣 11:00
- 台灣凌晨 3:00 要寫 `0 19 * * *`（前一天 UTC 19:00）

## 為什麼 vercel.json 可以寫 Cron

- `vercel.json` 是 Vercel 平台的設定檔，不是 Next.js 的
- `crons` 欄位是 Vercel 的功能：部署到 production 時，Vercel 讀取並登錄排程
- 時間到了，Vercel 對該部署的 `path` 發出 HTTP 請求
- 表達式用標準 cron 格式（5 個欄位），Vercel 有支援
- 本機 `npm run dev` 不會執行排程
- 路由要匯出 `GET`：官方範例的排程處理函式都是 GET；Vercel 實際發的是 GET 為記憶，未逐字核對文件
- 路由設了 `CRON_SECRET` 環境變數時，Vercel 會帶 `Authorization: Bearer <值>`，可用來擋外人亂呼叫

## Hobby 方案 Cron 限制

- 我的記憶：一天最多執行一次
- Vercel 文件搜尋沒找到這條，**未查證**，以 Vercel 後台設定時的提示為準

## 相關名詞

| 名詞 | 說明 |
|---|---|
| `@supabase/supabase-js` | 呼叫 Supabase API（auth、資料表、storage、realtime）的 JS 套件，需要專案網址與 anon key |
| anon key | 給前端用的公開金鑰，身分是 `anon`，安全靠 RLS 擋 |
| service_role key | 後端管理金鑰，略過 RLS，不能公開 |
| RLS（Row Level Security） | 資料庫功能，規定哪些角色能讀寫哪幾列。開啟但沒寫 policy = 受約束角色全部擋掉 |

- 本專案用 Prisma 直連，連線角色 `postgres` 的 `rolbypassrls = true`，開 RLS 不影響
- 本專案沒有使用 `supabase-js`
- 開 RLS：Supabase 後台 → SQL Editor → `ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;`，復原改成 `DISABLE`
- Prisma 之後新增的資料表不會自動開 RLS，要再執行

未查證：Supabase 免費版閒置幾天暫停的確切天數，以 Supabase 後台為準。
