# 本地分支清理 TODO

> 建立時間：2026-03-12
> 狀態：待 Abby 確認後執行刪除

## 原則

- **已合併到 stage 的 branch → 可以安全刪除**（隨時能從 stage 重新拉）
- **未合併的 branch → 需確認是否還要用**（如果要繼續開發，也建議刪掉後從最新 stage 重拉）
- 保留 `main`、`stage`、`Go_production` 等主要分支

---

## 1. futuresign_monorepo

### 已合併（可安全刪除）— 15 個

| # | 分支 | 最後更新 | 建議 |
|---|------|---------|------|
| 1 | backend-sequence-review-hardening | 03-06 | 刪 |
| 2 | feat/event-i18n | 02-25 | 刪 |
| 3 | feat/event-vendor-review-block | 03-07 | 刪 |
| 4 | feat/digital-bookshelf | 03-02 | 刪 |
| 5 | feat/set-superuser-api | 02-20 | 刪 |
| 6 | feature/pricing-soft-delete | 02-09 | 刪 |
| 7 | fix-booth-setting | 02-12 | 刪 |
| 8 | fix/booth-display-price | 02-16 | 刪 |
| 9 | fix/electricity-rules-product-json | 02-02 | 刪 |
| 10 | fix/event-deletion-review-bool | 02-28 | 刪 |
| 11 | fix/order-item-delete-auth | 02-12 | 刪 |
| 12 | fix/product-validation-message | 02-09 | 刪 |
| 13 | hotfix/company-member-permission | 02-09 | 刪 |
| 14 | hotfix/identity-conflict-check | 02-09 | 刪 |
| 15 | try-both-auth | 02-09 | 刪 |
| 16 | pre_order | 02-28 | 刪 |
| 17 | refactor/registration-localStorage | 02-20 | 刪 |

### 未合併（需確認）— 10 個

| # | 分支 | 最後更新 | 說明 | 決定 |
|---|------|---------|------|------|
| 1 | feat/checkout-localstorage | 03-10 | 結帳 localStorage，較新 | ☐ 刪 / ☐ 留 |
| 2 | feat/coupon-tryb0thauth-programs | 03-07 | 報到核銷 TryBothAuth | ☐ 刪 / ☐ 留 |
| 3 | feat/event-deletion-request | 02-25 | 活動刪除申請 | ☐ 刪 / ☐ 留 |
| 4 | feat/rbac-booth-map-permissions | 03-03 | RBAC 攤位地圖權限 | ☐ 刪 / ☐ 留 |
| 5 | feat/short-description-2000 | 02-24 | 短描述 2000 字 | ☐ 刪 / ☐ 留 |
| 6 | feature/role-permission-improvements | 01-31 | 角色權限改進（最舊） | ☐ 刪 / ☐ 留 |
| 7 | fix/electricity-rules-and-product-specifications | 02-02 | 電力規則產品規格 | ☐ 刪 / ☐ 留 |
| 8 | fix/map-area-save-cascade | 03-11 | Map 級聯儲存修正（最新） | ☐ 刪 / ☐ 留 |
| 9 | perf/booth-types-aggregated-api | 03-03 | 攤位類型聚合 API | ☐ 刪 / ☐ 留 |
| 10 | seperate_repo | 01-30 | 分離 repo 準備（最舊） | ☐ 刪 / ☐ 留 |
| 11 | updated-by_map_id-hotfix | 02-12 | updatedBy map_id 修正 | ☐ 刪 / ☐ 留 |

---

## 2. futuresign.dashboard

### 已合併（可安全刪除）— 3 個

| # | 分支 | 最後更新 | 建議 |
|---|------|---------|------|
| 1 | feat/event-i18n | 02-25 | 刪 |
| 2 | feat/map-selector-atomic-wizard | 03-03 | 刪 |
| 3 | feat/set-superuser-api | 02-20 | 刪 |

### 未合併（需確認）— 8 個

| # | 分支 | 最後更新 | 說明 | 決定 |
|---|------|---------|------|------|
| 1 | dashboard-layout-sequence-feat-fix | 03-06 | 活動頁 RWD | ☐ 刪 / ☐ 留 |
| 2 | feat/event-deletion-request | 02-25 | 活動刪除申請 | ☐ 刪 / ☐ 留 |
| 3 | feat/event-vendor-review-block | 03-06 | 訂單列表改善 | ☐ 刪 / ☐ 留 |
| 4 | feat/short-description-2000 | 02-23 | 短描述 2000 字 | ☐ 刪 / ☐ 留 |
| 5 | feature/ticket-settings-improvement | 02-24 | 票券設定改善 | ☐ 刪 / ☐ 留 |
| 6 | fix/frontend-null-safety | 02-20 | 前端 null safety | ☐ 刪 / ☐ 留 |
| 7 | optimize-abby | 01-29 | 權限管理密碼重設（最舊） | ☐ 刪 / ☐ 留 |
| 8 | pre_order | 02-28 | 地圖攤位 Wizard | ☐ 刪 / ☐ 留 |

---

## 3. futuresign.official_website

### 已合併（可安全刪除）— 10 個

| # | 分支 | 最後更新 | 建議 |
|---|------|---------|------|
| 1 | event-soft-delete | 02-12 | 刪 |
| 2 | feat/digital-bookshelf | 03-02 | 刪 |
| 3 | feat/event-deletion-request | 02-24 | 刪 |
| 4 | feat/event-i18n | 02-25 | 刪 |
| 5 | feat/short-description-2000 | 02-23 | 刪 |
| 6 | feature/pricing-soft-delete | 02-12 | 刪 |
| 7 | fix-all-lint-warnings | 03-01 | 刪 |
| 8 | fix/booth-type-duplicate-badge | 02-16 | 刪 |
| 9 | pre_order | 02-28 | 刪 |
| 10 | refactor/registration-localStorage | 02-16 | 刪 |
| 11 | updated-by_map_id-hotfix | 02-12 | 刪 |

### 未合併（需確認）— 11 個

| # | 分支 | 最後更新 | 說明 | 決定 |
|---|------|---------|------|------|
| 1 | feat/checkin-coupon-scanner | 03-07 | 報到掃碼器禮品券 | ☐ 刪 / ☐ 留 |
| 2 | feat/checkout-localstorage | 03-10 | 攤位待付款偵測 | ☐ 刪 / ☐ 留 |
| 3 | feat/event-vendor-review-block | 03-06 | 訂單報名序號 | ☐ 刪 / ☐ 留 |
| 4 | feat/map-selector-atomic-wizard | 03-02 | 地圖攤位類型分離 | ☐ 刪 / ☐ 留 |
| 5 | feat/session-storage-create-event | 03-11 | 建立活動 sessionStorage | ☐ 刪 / ☐ 留 |
| 6 | feature/booth-register-optimization | 02-12 | stepper 跳步 + 電力 | ☐ 刪 / ☐ 留 |
| 7 | fix/booth-list-natural-sort | 02-12 | 攤位自然排序 | ☐ 刪 / ☐ 留 |
| 8 | fix/booth-page-build-error | 02-20 | 攤位頁 build 錯誤 | ☐ 刪 / ☐ 留 |
| 9 | fix/lint-errors-and-docs-update | 03-11 | lint 修正 | ☐ 刪 / ☐ 留 |
| 10 | hotfix/ticket-settings-no-approval | 02-23 | 票券設定移除審核 | ☐ 刪 / ☐ 留 |
| 11 | sequence-locale-layout-visibility | 03-06 | 禮品券領取紀錄面板 | ☐ 刪 / ☐ 留 |

---

## 清理指令（確認後執行）

確認完畢後，可以一次刪除所有「已合併」的分支：

```bash
# monorepo
cd futuresign_monorepo
git branch -D backend-sequence-review-hardening feat/event-i18n feat/event-vendor-review-block feat/digital-bookshelf feat/set-superuser-api feature/pricing-soft-delete fix-booth-setting fix/booth-display-price fix/electricity-rules-product-json fix/event-deletion-review-bool fix/order-item-delete-auth fix/product-validation-message hotfix/company-member-permission hotfix/identity-conflict-check try-both-auth pre_order refactor/registration-localStorage

# dashboard
cd futuresign.dashboard
git branch -D feat/event-i18n feat/map-selector-atomic-wizard feat/set-superuser-api

# official_website
cd futuresign.official_website
git branch -D event-soft-delete feat/digital-bookshelf feat/event-deletion-request feat/event-i18n feat/short-description-2000 feature/pricing-soft-delete fix-all-lint-warnings fix/booth-type-duplicate-badge pre_order refactor/registration-localStorage updated-by_map_id-hotfix
```
