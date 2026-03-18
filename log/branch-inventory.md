# 各 Repo 本地分支清單

> 記錄時間：2026-03-12

---

## 1. futuresign_monorepo (目前在 `stage`)

| # | 分支名稱 | 最後更新時間 | 主要功能 |
|---|---------|------------|---------|
| 1 | fix/map-area-save-cascade | 2026-03-11 13:42 | UpdateMap 修正 GORM Save() 級聯覆蓋 map_area + 核銷時間戳重構 |
| 2 | **stage** *(current)* | 2026-03-10 13:35 | Staging 整合分支 |
| 3 | feat/checkout-localstorage | 2026-03-10 11:30 | 結帳流程 localStorage 暫存 + OrderConsumerPublic 新增 booth_id |
| 4 | feat/coupon-tryb0thauth-programs | 2026-03-07 20:26 | 報到/核銷路由全部改用 TryBothAuth 認證 |
| 5 | feat/event-vendor-review-block | 2026-03-07 03:29 | 攤商審核機制 + 訂單列表改善 |
| 6 | backend-sequence-review-hardening | 2026-03-06 17:54 | 後端 CheckAccess 測試修正與 CI 穩定化 |
| 7 | feat/rbac-booth-map-permissions | 2026-03-03 00:43 | RBAC 攤位/地圖權限控制 |
| 8 | perf/booth-types-aggregated-api | 2026-03-03 00:44 | 攤位類型聚合 API 效能優化 |
| 9 | feat/digital-bookshelf | 2026-03-02 19:50 | 數位書架功能 + 後台 RBAC 權限控制（Booth/Map/EventBoothType/Pricing） |
| 10 | fix/event-deletion-review-bool | 2026-02-28 18:07 | 修復拒絕活動刪除請求時 400 錯誤 |
| 11 | pre_order | 2026-02-28 16:05 | 預購功能 + BatchCreateBooths 等批量操作 |
| 12 | feat/event-i18n | 2026-02-25 15:35 | 活動多語系（I18n）— 雙寫 + locale fallback + Locale API |
| 13 | feat/event-deletion-request | 2026-02-25 14:43 | 活動刪除申請流程 + Event I18n 階段 1 雙寫架構 |
| 14 | feat/short-description-2000 | 2026-02-24 11:29 | 短描述欄位限制提升至 2000 字元 |
| 15 | feat/set-superuser-api | 2026-02-20 18:59 | 設定超級管理員 API |
| 16 | refactor/registration-localStorage | 2026-02-20 17:42 | 註冊流程 localStorage 重構 + 電話遮蔽格式調整 |
| 17 | fix/booth-display-price | 2026-02-16 14:56 | GetBooth API 加入 display_price 三層定價計算 |
| 18 | Go_production | 2026-02-13 02:56 | Go 正式環境分支，折扣碼遷移與訂單表結構更新 |
| 19 | fix/order-item-delete-auth | 2026-02-12 19:21 | 訂單項目刪除權限 + DELETE electricity 路由 |
| 20 | updated-by_map_id-hotfix | 2026-02-12 16:12 | updatedBy + map_id 相關 hotfix |
| 21 | fix-booth-setting | 2026-02-12 14:19 | 攤位設定修正 + UpdateBooth 記錄操作者 |
| 22 | try-both-auth | 2026-02-09 21:20 | 嘗試雙重認證機制（member + user） |
| 23 | fix/product-validation-message | 2026-02-09 21:26 | 產品驗證錯誤訊息改善（ProductTypeID） |
| 24 | feature/pricing-soft-delete | 2026-02-09 21:20 | 定價方案軟刪除 + 產品驗證訊息改善 |
| 25 | hotfix/identity-conflict-check | 2026-02-09 18:20 | 攤商/主辦身份衝突檢查與同步 |
| 26 | hotfix/company-member-permission | 2026-02-09 18:12 | 公司會員權限 + 攤商/主辦身份衝突檢查 |
| 27 | fix/electricity-rules-product-json | 2026-02-02 17:32 | 電力規則產品 JSON 格式修正 |
| 28 | fix/electricity-rules-and-product-specifications | 2026-02-02 16:47 | 電力規則與產品規格修正 |
| 29 | feature/role-permission-improvements | 2026-01-31 13:01 | 角色權限系統改進 + nginx 代理更新 |
| 30 | seperate_repo | 2026-01-30 11:53 | 分離 repo 架構準備 |
| 31 | **main** | 2026-01-29 20:00 | 正式環境主分支 |

共 31 個分支

---

## 2. futuresign.dashboard (目前在 `feat/dashboard-v2-enhancements`)

| # | 分支名稱 | 最後更新時間 | 主要功能 |
|---|---------|------------|---------|
| 1 | **feat/dashboard-v2-enhancements** *(current)* | 2026-03-11 17:28 | Dashboard v2 整體強化與功能增強 |
| 2 | **main** | 2026-03-09 10:50 | 正式環境主分支 |
| 3 | **stage** | 2026-03-07 03:21 | Staging 整合分支 |
| 4 | dashboard-layout-sequence-feat-fix | 2026-03-06 17:17 | 活動頁面 RWD — 手機版查看詳情 Modal + EventTabs |
| 5 | feat/event-vendor-review-block | 2026-03-06 09:17 | 訂單列表付款欄位改善 — 重命名表頭、修正對齊 |
| 6 | feat/map-selector-atomic-wizard | 2026-03-03 00:17 | 攤位類型 map_id 篩選 + Wizard 批量儲存 + inline 編輯 |
| 7 | pre_order | 2026-02-28 18:01 | 地圖 + 攤位 Multi-Step Wizard Drawer |
| 8 | feat/event-deletion-request | 2026-02-25 17:13 | 活動刪除申請 — 已購票未退款禁止核准刪除 |
| 9 | feat/event-i18n | 2026-02-25 15:11 | 活動多語系 — EventTranslations 語系選項 15 種 |
| 10 | feature/ticket-settings-improvement | 2026-02-24 14:00 | 票券設定改善 — TWD/JPY 禁止小數、價格以 string 儲存 |
| 11 | feat/short-description-2000 | 2026-02-23 15:09 | 短描述 Textarea 加上 maxLength={2000} |
| 12 | feat/set-superuser-api | 2026-02-20 18:25 | 前端新增 set-superuser API 呼叫 |
| 13 | fix/frontend-null-safety | 2026-02-20 14:10 | 前端 null safety + members.view-phone 權限設定 |
| 14 | optimize-abby | 2026-01-29 12:20 | 權限管理與密碼重設功能同步 |

共 14 個分支

---

## 3. futuresign.official_website (目前在 `stage`)

| # | 分支名稱 | 最後更新時間 | 主要功能 |
|---|---------|------------|---------|
| 1 | fix/lint-errors-and-docs-update | 2026-03-11 16:52 | lint 錯誤修正 + 改回 localhost API base URL |
| 2 | feat/session-storage-create-event | 2026-03-11 16:20 | 建立活動 sessionStorage 暫存 + ESLint 修正 |
| 3 | **main** | 2026-03-10 00:19 | 正式環境主分支 |
| 4 | feat/checkout-localstorage | 2026-03-10 11:29 | 攤位待付款訂單偵測 + 攤位可用性檢查 |
| 5 | **stage** *(current)* | 2026-03-09 10:50 | Staging 整合分支 |
| 6 | feat/checkin-coupon-scanner | 2026-03-07 20:16 | 報到頁掃碼器支援禮品券 QR Code + 動態載入禮品券方案 |
| 7 | feat/event-vendor-review-block | 2026-03-06 00:25 | 訂單列表與詳情顯示報名序號 + My Events 卡片間距 |
| 8 | sequence-locale-layout-visibility | 2026-03-06 17:51 | 禮品券設定頁領取紀錄展開面板 + 核銷欄位翻譯 |
| 9 | feat/digital-bookshelf | 2026-03-02 13:36 | 數位書架 — 封面圖上傳、PDF footer、URL hash 修正 |
| 10 | feat/map-selector-atomic-wizard | 2026-03-02 23:58 | 地圖按鈕 + 攤位類型按 map_id 分離 |
| 11 | fix-all-lint-warnings | 2026-03-01 15:53 | 修復全部 lint 警告 + merge stage 衝突解決 |
| 12 | pre_order | 2026-02-28 16:11 | 修復全部 525 個 ESLint warnings |
| 13 | feat/event-i18n | 2026-02-25 15:35 | EventTranslations 15 語系 + Step 7 顯示已翻譯語系 |
| 14 | feat/event-deletion-request | 2026-02-24 15:17 | MyEventsPage 改用 useQuery/useMutation 管理狀態 |
| 15 | hotfix/ticket-settings-no-approval | 2026-02-23 18:13 | 移除票券設定頁的管理員審核限制 |
| 16 | feat/short-description-2000 | 2026-02-23 17:51 | Product price/deposit 統一用 string 格式送出 |
| 17 | fix/booth-page-build-error | 2026-02-20 17:33 | 攤位頁面 build 錯誤修正 + 個人資料必填紅色星號 |
| 18 | fix/booth-type-duplicate-badge | 2026-02-16 14:25 | 攤位列表重複 badge 移除 |
| 19 | refactor/registration-localStorage | 2026-02-16 01:35 | 註冊流程 localStorage 重構 + merge 衝突解決 |
| 20 | event-soft-delete | 2026-02-12 15:03 | 活動軟刪除 + handleSaveBooths map_id 修復 |
| 21 | updated-by_map_id-hotfix | 2026-02-12 15:03 | updatedBy + map_id hotfix |
| 22 | fix/booth-list-natural-sort | 2026-02-12 15:41 | 攤位列表按名稱自然排序 |
| 23 | feature/booth-register-optimization | 2026-02-12 19:21 | stepper 步驟可點擊跳回 + 電力暫不加購刪除記錄 |
| 24 | feature/pricing-soft-delete | 2026-02-12 14:14 | 定價軟刪除 + handleSaveBooths map_id 修復 |

共 24 個分支
