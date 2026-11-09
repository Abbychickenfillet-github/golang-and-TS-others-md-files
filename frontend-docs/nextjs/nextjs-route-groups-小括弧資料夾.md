# Next.js Route Groups：`(folder)` 小括弧資料夾

## 規則

| 寫法 | 網址 |
|---|---|
| `app/(api)/api/users/route.js` | `/api/users` |
| `app/api/users/route.js` | `/api/users` |

- `(folderName)` 只用來整理檔案，**不會出現在網址**
- 兩種寫法網址相同

## 用途

- a. 依團隊、功能分類路由
- b. 多個 root layout
- c. 只讓部分路由共用 layout，其他不共用

## 限制

- 不同群組的路由不能解析成同一個網址，例：`(marketing)/about/page.js` 與 `(shop)/about/page.js` 都是 `/about`，會報錯
- 不同 root layout 之間跳轉會整頁重新載入
- 用多個 root layout 又沒有最上層 `layout.js` 時，首頁 `/` 要放在某個群組內

## `(api)` 要不要用

- Route Handler（`route.js`）沒有 layout，用不到 layout 相關功能
- 本專案 `(api)` 底下只有 `api/` 一個資料夾，純整理用，拿掉改成 `app/api/` 網址不變
- 不是必要的，可用可不用

## 本專案狀況

- `app/(api)/api/...`：auth、users、timelog、health 等
- `app/api/...`：admin、debug、favorites、lap-timer、`timelog/check-limit` 等
- 兩個資料夾都對應 `/api/...`，同一個網址不能同時存在於兩邊
- 目前 `timelog` 兩邊都有，但最終網址不同（`/api/timelog` 與 `/api/timelog/check-limit`），沒有衝突

## 資料夾命名對照

| 寫法 | 意義 |
|---|---|
| `[slug]` | 動態路由 |
| `(group)` | 路由群組，不進網址 |
| `_folder` | 私有資料夾，不參與路由 |

來源：[Next.js 官方文件 Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)

未查證：`_folder` 私有資料夾那列依記憶整理，未對官方文件。
