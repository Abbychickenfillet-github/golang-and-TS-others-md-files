# 活動品牌商審核 + 封鎖功能 — 全端實作計畫（單表設計）

## Context

品牌商 (vendor) 目前可直接購買攤位，缺少活動層級的審核流程。需要：
1. **活動品牌商審核** — 主辦可啟用 `require_vendor_review`，品牌商須經審核才能購買攤位
2. **活動封鎖（公司/會員）** — 主辦可封鎖特定品牌商公司或會員個人

**核心設計**：使用單一 `event_review` 表，以 `target_type` 區分公司/會員，以 `status` 區分審核/封鎖狀態。

SQL 建表由使用者手動在 stage/prod 執行，不用 AutoMigrate。

---

## 單表設計：`event_review`

```
event_review
├── id (PK, UUID)
├── event_id (varchar 36, not null)
├── target_type (varchar 20, not null) — 'company' | 'member'
├── target_id (varchar 36, not null)   — company_id 或 member_id
├── status (varchar 20, not null)      — 'pending' | 'approved' | 'rejected' | 'blocked'
├── review_comment (varchar 500)       — 審核意見或封鎖原因
├── reviewed_by (varchar 36)           — 操作者 member ID
├── reviewed_at (datetime)             — 操作時間
├── created_at / updated_at / deleted_at (GORM Base)
└── UK: (event_id, target_type, target_id) — 同一活動+對象類型+對象ID 只能有一筆
```

### 狀態機

**公司 (target_type = 'company')**：
```
(無記錄) → pending → approved
                   → rejected
                   → blocked → approved (解封)
(無記錄) → blocked (直接封鎖)
```

**會員 (target_type = 'member')**：
```
(無記錄) → blocked → approved (解封)
```
會員不需要申請審核流程，只有封鎖/解封。

### SQL CREATE TABLE

```sql
CREATE TABLE `event_review` (
  `id` varchar(36) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `event_id` varchar(36) NOT NULL COMMENT '活動 ID',
  `target_type` varchar(20) NOT NULL COMMENT '對象類型 (company/member)',
  `target_id` varchar(36) NOT NULL COMMENT '對象 ID (company_id 或 member_id)',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '狀態 (pending/approved/rejected/blocked)',
  `review_comment` varchar(500) DEFAULT NULL COMMENT '審核意見或封鎖原因',
  `reviewed_by` varchar(36) DEFAULT NULL COMMENT '操作者 member ID',
  `reviewed_at` datetime DEFAULT NULL COMMENT '操作時間',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_review` (`event_id`, `target_type`, `target_id`),
  KEY `idx_er_event` (`event_id`),
  KEY `idx_er_type` (`target_type`),
  KEY `idx_er_target` (`target_id`),
  KEY `idx_er_status` (`status`),
  KEY `idx_event_review_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活動審核/封鎖記錄（統一表）';
```

### event 表新增欄位

```sql
ALTER TABLE `event`
  ADD COLUMN `require_vendor_review` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否需要品牌商審核'
  AFTER `is_featured`;
```

> 以上 SQL 已於 2026-03-03 在 `future_sign_stage` + `future_sign_prod` 執行完成。

---

## Backend 架構（單表統一設計）

### 新建檔案（7 個）

| # | 檔案 | 用途 |
|---|------|------|
| 1 | `backend-go/internal/models/event_review.go` | 統一 Model |
| 2 | `backend-go/internal/dto/event_review.go` | 統一 DTO |
| 3 | `backend-go/internal/repository/event_review_repository.go` | 統一 Repo |
| 4 | `backend-go/internal/repository/event_review_repository_test.go` | Repo 測試 |
| 5 | `backend-go/internal/service/event_review_service.go` | 統一 Service |
| 6 | `backend-go/internal/service/event_review_service_test.go` | Service 測試 |
| 7 | `backend-go/internal/handler/event_review_handler.go` | 統一 Handler |

### 修改檔案

| # | 檔案 | 變更 |
|---|------|------|
| 1 | `internal/models/event.go` | +RequireVendorReview 欄位 |
| 2 | `internal/dto/event.go` | +RequireVendorReview (EventPublic, EventConsumerPublic, EventCreate, EventUpdate) |
| 3 | `internal/handler/booth_handler.go` | +CheckVendorCanParticipate 攔截 + SetEventReviewService setter |
| 4 | `internal/service/event_service.go` | +RequireVendorReview 處理 |
| 5 | `internal/migrate/migrate.go` | +EventReview model |
| 6 | `cmd/server/main.go` | +DI 接線 + 路由註冊 + setter |

### Model

```go
type EventReview struct {
    Base
    EventID       string     `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_review,priority:1"`
    TargetType    string     `gorm:"type:varchar(20);not null;uniqueIndex:uk_event_review,priority:2"` // company | member
    TargetID      string     `gorm:"type:varchar(36);not null;uniqueIndex:uk_event_review,priority:3"`
    Status        string     `gorm:"type:varchar(20);not null;default:'pending'"` // pending | approved | rejected | blocked
    ReviewComment *string    `gorm:"type:varchar(500)"`
    ReviewedBy    *string    `gorm:"type:varchar(36)"`
    ReviewedAt    *time.Time `gorm:"type:datetime"`
    // 多態關聯（Preload 用，constraint:- 不建外鍵）
    Event   *Event   `gorm:"foreignKey:EventID;constraint:-"`
    Company *Company `gorm:"foreignKey:TargetID;constraint:-"` // target_type=company 時有值
    Member  *Member  `gorm:"foreignKey:TargetID;constraint:-"` // target_type=member 時有值
}
```

### API 路由表（9 個端點）

| Method | Path | 功能 | Auth |
|--------|------|------|------|
| POST | `/event-reviews` | 品牌商申請加入活動 | MemberAuth |
| GET | `/event-reviews/:id` | 取得單筆審核/封鎖記錄 | TryBothAuth |
| GET | `/event-reviews/event/:event_id` | 列出活動下的記錄（可篩 target_type/status） | TryBothAuth |
| GET | `/event-reviews/event/:event_id/company/:company_id` | 查詢品牌商審核狀態 | MemberAuth |
| GET | `/event-reviews/company/:company_id` | 列出某公司在所有活動的記錄 | MemberAuth |
| PATCH | `/event-reviews/:id/review` | 主辦審核（approved/rejected） | MemberAuth |
| POST | `/event-reviews/block` | 封鎖公司或會員 | MemberAuth |
| PATCH | `/event-reviews/:id/unblock` | 解封（status → approved） | MemberAuth |
| DELETE | `/event-reviews/:id` | 刪除記錄（軟刪除） | TryBothAuth |

### Service 主要方法

```go
type EventReviewService interface {
    ApplyToEvent(ctx, req)                       // 品牌商申請
    ReviewApplication(ctx, id, req, reviewerID)  // 主辦審核
    BlockTarget(ctx, req, blockedBy)             // 封鎖公司或會員
    UnblockTarget(ctx, id, reviewerID)           // 解封 → status=approved
    GetByID(ctx, id)                             // 查詢單筆
    GetByEventAndTarget(ctx, eventID, targetType, targetID) // 查詢特定對象
    ListByEvent(ctx, eventID, targetType, status, skip, limit) // 活動下的記錄
    ListByTarget(ctx, targetType, targetID, skip, limit)       // 對象在所有活動的記錄
    CheckVendorCanParticipate(ctx, eventID, companyID, memberID, requireVendorReview) // Booth 攔截
    DeleteReview(ctx, id)                        // 軟刪除
}
```

### 錯誤定義

```go
var (
    ErrEventReviewNotFound  = errors.New("審核記錄不存在")
    ErrEventReviewExists    = errors.New("該公司已申請過此活動")
    ErrEventCompanyBlocked  = errors.New("該公司已被此活動封鎖")
    ErrEventMemberBlocked   = errors.New("該會員已被此活動封鎖")
    ErrVendorNotApproved    = errors.New("品牌商尚未通過此活動審核")
    ErrInvalidReviewStatus  = errors.New("無效的審核狀態")
    ErrTargetAlreadyBlocked = errors.New("該對象已被封鎖")
)
```

### CheckVendorCanParticipate 攔截邏輯

被 `booth_handler.go` 的 `SelectBooth` 呼叫：

```
1. 查 member 是否被封鎖 (target_type=member, status=blocked) → ErrEventMemberBlocked
2. 查 company 是否被封鎖 (target_type=company, status=blocked) → ErrEventCompanyBlocked
3. 如果 requireVendorReview=true：
   - 查 company 審核記錄
   - 如果無記錄 或 status != approved → ErrVendorNotApproved
4. 全部通過 → return nil（放行）
```

### For Loop 修正

> 老闆要求：「不要用 for 迴圈，能用 ORM 處理完就不要用 for」

**修正 1: booth_handler.go** — 用 GORM `Pluck` 取代 `slices.IndexFunc`
- 新增 `GetApprovedCompanyIDsByMemberID()` 用 GORM `Pluck("company_id", &companyIDs)`

**修正 2: event_review_service.go** — 用 GORM `Preload` 取代 N+1 查詢
- Repository 所有查詢加 `Preload("Event").Preload("Company").Preload("Member")`
- Service `buildResponse` 直接取用 preloaded data
- 建構子簡化為 `NewEventReviewService(reviewRepo, eventRepo)`（不需 companyRepo/memberRepo）

---

## Official Website 前端（B2C 前台）

### 新建檔案

| # | 檔案 | 用途 |
|---|------|------|
| 1 | `official_website/src/lib/api/event-review.ts` | 前台 API 模組（10 個方法） |
| 2 | `official_website/src/pages/EventApplyVendorPage.tsx` | 品牌商申請頁面 |

### 修改檔案

| # | 檔案 | 變更 |
|---|------|------|
| 1 | `src/App.tsx` | +EventApplyVendorPage route (`/event/:id/apply`) |
| 2 | `src/lib/api/types.ts` | Event interface +require_vendor_review?: boolean |
| 3 | `src/pages/EventRegisterBoothPage.tsx` | +access check 攔截 |
| 4 | `src/pages/EventDetailPage.tsx` | +封鎖檢查 + 申請按鈕 |
| 5 | `src/pages/EventVendorsPage.tsx` | +Tabs（申請審核 + 封鎖管理） |

### event-review.ts API 模組

使用 `apiClient` 模式（與 `member.ts`、`company.ts` 等一致），匯出：

**型別**：
- `ApplyToEventRequest { event_id, company_id }`
- `ReviewApplicationRequest { status, review_comment? }`
- `BlockTargetRequest { event_id, target_type, target_id, review_comment? }`
- `EventReviewResponse` — 完整審核記錄（含 company_name, brand_name, member_name, member_email）
- `EventReviewListResponse { data[], count }`
- `EventAccessCheckResponse { can_access, reason?, review_status?, is_blocked, require_vendor_review }`

**方法**（10 個）：
```
eventReviewApi.applyToEvent(req)              // POST /event-reviews
eventReviewApi.getReview(id)                  // GET /event-reviews/:id
eventReviewApi.listByEvent(eventId, params?)  // GET /event-reviews/event/:event_id
eventReviewApi.getByEventAndCompany(eventId, companyId) // GET /event-reviews/event/:eid/company/:cid
eventReviewApi.listByCompany(companyId)       // GET /event-reviews/company/:company_id
eventReviewApi.reviewApplication(id, req)     // PATCH /event-reviews/:id/review
eventReviewApi.blockTarget(req)               // POST /event-reviews/block
eventReviewApi.unblockTarget(id)              // PATCH /event-reviews/:id/unblock
eventReviewApi.deleteReview(id)               // DELETE /event-reviews/:id
eventReviewApi.checkAccess(eventId)           // GET /events/:id/access-check
```

---

### UI/UX 設計：EventApplyVendorPage（品牌商申請頁面）

**路由**: `/event/:id/apply`（ProtectedRoute，需登入）
**佈局**: `SiteHeader` + 居中卡片 `max-w-lg mx-auto` + `SiteFooter`
**RWD**: 手機 w-full 按鈕、桌面居中卡片

#### 頁面狀態機（6 種狀態）

```
             ┌─ not-vendor ──→ [前往申請品牌商] 按鈕 → /become-vendor
             │
loading ─────┼─ blocked ─────→ Ban icon + "無法參加此活動"
             │
             ├─ no-review ───→ CheckCircle icon + "無需審核" → [前往選擇攤位]
             │
             ├─ status ──────→ 依 existingReview.status 顯示：
             │                  ├─ pending:  Clock icon + "等待審核中" + 公司名稱 + 申請時間
             │                  ├─ approved: CheckCircle icon + "審核通過" → [前往選擇攤位]
             │                  └─ rejected: XCircle icon + "審核未通過" + 主辦備註
             │
             └─ form ────────→ 申請表單
```

#### 申請表單 UI

```
┌─────────────────────────────────────┐
│  申請加入活動                        │
│  {活動名稱}                          │
│  此活動需要品牌商審核，請選擇公司後    │
│  送出申請。                          │
│                                     │
│  選擇公司                            │
│  ┌─────────────────────────────┐    │
│  │ 單一公司: Building2 icon     │    │
│  │   公司名稱                   │    │
│  │   品牌名稱                   │    │
│  │                             │    │
│  │ 多間公司: <select> dropdown  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │         送出申請              │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

#### 資料流

```
useAuth() → user.identities?.includes('vendor')
  ↓ 否 → not-vendor
  ↓ 是
memberApi.getMemberCompanies(user.id) → 篩選 approved + vendor/organizer role
  ↓ 0 間 → not-vendor
  ↓ ≥1 間 → 預設選第一間
eventReviewApi.checkAccess(eventId)
  ↓ is_blocked → blocked
  ↓ !require_vendor_review → no-review
  ↓ review_status 存在 → getByEventAndCompany → status
  ↓ 無記錄 → form
```

---

### UI/UX 設計：EventDetailPage（活動詳情頁整合）

**新增區塊**：在原本的「報名按鈕」區域前加入條件判斷

```
已登入 + isVendor:
  ┌─ is_blocked ────→ 紅色 Alert: "您已被此活動封鎖，無法參加"
  │
  ├─ require_vendor_review + review_status == 'pending'
  │   → 黃色 Alert: "您的申請正在審核中" + Clock icon
  │
  ├─ require_vendor_review + review_status == 'rejected'
  │   → 紅色 Alert: "您的申請未通過" + [重新申請] 按鈕
  │
  ├─ require_vendor_review + review_status == null
  │   → [申請加入此活動] 按鈕 → /event/:id/apply
  │
  └─ approved 或 不需審核
      → 原本的 [立即報名] 按鈕 → /event/:id/register/booth
```

使用 `useQuery(['eventAccessCheck', eventId])` 僅在登入時查詢。

---

### UI/UX 設計：EventRegisterBoothPage（攤位攔截）

在 `fetchData` 函式最前面加入 access-check gate：

```
fetchData() {
  try {
    const access = await eventReviewApi.checkAccess(eventId)
    if (access.is_blocked) → toast.error("您已被此活動封鎖") → redirect /event/:id
    if (access.require_vendor_review && review_status !== 'approved')
      → toast.error("請先完成品牌商審核申請") → redirect /event/:id/apply
  } catch { /* API 尚未實作時忽略 */ }

  // ... 原本的 fetchData 邏輯
}
```

---

### UI/UX 設計：EventVendorsPage（主辦管理 — 審核+封鎖）

在原有的品牌商列表頁面加入 Tabs 元件，分為 3 個 Tab：

```
┌──────────────────┬──────────────┬──────────────┐
│  已確認品牌商     │  申請審核     │  封鎖管理     │
├──────────────────┴──────────────┴──────────────┤
│                                                │
│  (Tab 1) 原有品牌商列表 — 不動                   │
│                                                │
│  (Tab 2) 申請審核                               │
│  ┌─ 篩選: [全部▼] [待審核] [已核准] [已拒絕]     │
│  │                                             │
│  │  ┌───────┬──────┬──────┬──────┬──────┐      │
│  │  │公司名稱│品牌   │狀態   │申請時間│操作  │      │
│  │  ├───────┼──────┼──────┼──────┼──────┤      │
│  │  │ABC Co │品牌A  │待審核 │03/03 │[審核]│      │
│  │  │DEF Co │品牌B  │已核准 │03/02 │[封鎖]│      │
│  │  └───────┴──────┴──────┴──────┴──────┘      │
│  │                                             │
│  │  審核 Modal:                                 │
│  │  ┌─────────────────────────┐                │
│  │  │ 審核品牌商申請            │                │
│  │  │ 公司: ABC Co (品牌A)     │                │
│  │  │ 審核意見: [________]     │                │
│  │  │         [拒絕]  [核准]   │                │
│  │  └─────────────────────────┘                │
│  │                                             │
│  (Tab 3) 封鎖管理                               │
│  ┌─ 篩選: [全部▼] [公司] [會員]                  │
│  │                                             │
│  │  ┌──────┬──────┬──────┬──────┬──────┐       │
│  │  │類型   │名稱   │原因   │時間   │操作  │       │
│  │  ├──────┼──────┼──────┼──────┼──────┤       │
│  │  │公司   │ABC Co│違規   │03/03 │[解封]│       │
│  │  │會員   │王小明│騷擾   │03/02 │[解封]│       │
│  │  └──────┴──────┴──────┴──────┴──────┘       │
│                                                │
└────────────────────────────────────────────────┘
```

**新增 state**：
- `activeMainTab` — 目前 Tab index
- `reviews` / `reviewsLoading` / `reviewFilter` — 審核列表
- `blocks` / `blocksLoading` — 封鎖列表
- `reviewActionLoading` — 操作中 loading

**新增 function**：
- `fetchReviews(eventId, filter?)` — 查審核列表 (target_type=company)
- `fetchBlocks(eventId, typeFilter?)` — 查封鎖列表 (status=blocked)
- `handleReview(id, status, comment?)` — 核准/拒絕
- `handleBlock(eventId, targetType, targetId)` — 封鎖
- `handleUnblock(id)` — 解封

---

## Dashboard 後台

### 新建檔案

| # | 檔案 | 用途 |
|---|------|------|
| 1 | `src/client/models/eventReview.ts` | 型別定義 + 狀態常數 |
| 2 | `src/client/services/eventReview.ts` | API Service（靜態方法） |
| 3 | `src/components/Events/EventReviewsPanel.tsx` | 品牌商審核 Tab Panel |
| 4 | `src/components/Events/EventBlocksPanel.tsx` | 封鎖管理 Tab Panel |

### 修改檔案

| # | 檔案 | 變更 |
|---|------|------|
| 1 | `src/client/models/index.ts` | +export eventReview |
| 2 | `src/client/services/index.ts` | +export eventReview |
| 3 | `src/constants/permissionModules.ts` | +2 權限模組 (event-reviews, event-blocks) + 6 個翻譯 |
| 4 | `src/routes/_layout/events.tsx` | +2 Tab (品牌商審核, 封鎖管理) + import panels + icons |

### 權限模組

```
event-reviews.view   — 查看品牌商審核
event-reviews.edit   — 審核品牌商申請（核准/拒絕）
event-reviews.delete — 刪除審核記錄
event-blocks.view    — 查看封鎖名單
event-blocks.create  — 封鎖公司/會員
event-blocks.delete  — 解除封鎖
```

### events.tsx Tabs（共 8 個）

1. 活動詳情 | 2. 攤位管理 | 3. 訂單 | 4. 電力需求 | 5. 商品項目 | 6. 翻譯 | **7. 品牌商審核** | **8. 封鎖管理**

### UI/UX 設計：EventReviewsPanel（品牌商審核 Tab）

Chakra UI v2 Table + Modal，使用 `useQuery` + `useMutation`。

```
┌─ 品牌商審核 — {活動名稱} ──────── [全部狀態 ▼] ─┐
│                                                │
│  ┌─────────┬──────┬──────┬────────┬─────┬────┐ │
│  │公司名稱  │品牌   │狀態   │申請時間  │意見  │操作│ │
│  ├─────────┼──────┼──────┼────────┼─────┼────┤ │
│  │ABC 公司  │品牌A  │⬡待審核│03/03   │-    │[審核][封鎖]│
│  │DEF 公司  │品牌B  │✓已核准│03/02   │通過  │    [封鎖]│
│  └─────────┴──────┴──────┴────────┴─────┴────┘ │
│  共 2 筆                                        │
│                                                │
│  審核 Modal (Chakra Modal):                      │
│  ┌─────────────────────────────┐               │
│  │ 審核品牌商申請                │               │
│  │ 公司: ABC 公司 (品牌A)       │               │
│  │ 審核意見（選填）:             │               │
│  │ ┌───────────────────────┐   │               │
│  │ │                       │   │               │
│  │ └───────────────────────┘   │               │
│  │              [拒絕]  [核准]  │               │
│  └─────────────────────────────┘               │
└────────────────────────────────────────────────┘
```

**權限控制**：
- 「審核」按鈕：需 `event-reviews.edit` + status=pending 才顯示
- 「封鎖」按鈕：需 `event-blocks.create` + status≠blocked 才顯示
- 封鎖後自動 invalidate reviews + blocks 的 query cache

### UI/UX 設計：EventBlocksPanel（封鎖管理 Tab）

```
┌─ 🛡 封鎖管理 — {活動名稱} ─────── [全部類型 ▼] ─┐
│                                                │
│  ┌──────┬──────────┬──────┬────────┬──────┐    │
│  │類型   │名稱       │原因   │封鎖時間  │操作  │    │
│  ├──────┼──────────┼──────┼────────┼──────┤    │
│  │🟣公司 │ABC 公司   │違規   │03/03   │[解封]│    │
│  │       │品牌A     │      │        │      │    │
│  ├──────┼──────────┼──────┼────────┼──────┤    │
│  │🔵會員 │王小明     │騷擾   │03/02   │[解封]│    │
│  │       │wang@...  │      │        │      │    │
│  └──────┴──────────┴──────┴────────┴──────┘    │
│  共 2 筆封鎖記錄                                 │
└────────────────────────────────────────────────┘
```

**權限控制**：
- 「解封」按鈕：需 `event-blocks.delete` 才顯示
- 解封後自動 invalidate blocks + reviews 的 query cache
- 類型篩選：全部 / 公司 / 會員（對應 target_type query param）

---

## ✅ 實作進度追蹤

### Backend Phase 1（全部完成）

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 1 | Model 層 (`event_review.go` + event.go 修改) | ✅ 完成 | 統一單表設計 |
| Step 2 | DTO 層 (`event_review.go` + event.go 修改) | ✅ 完成 | |
| Step 3 | Repository 層 (`event_review_repository.go` + test) | ✅ 完成 | 含 Preload Company/Member |
| Step 4 | Service 層 (`event_review_service.go` + test) | ✅ 完成 | 不需 companyRepo/memberRepo |
| Step 5 | Handler 層 (`event_review_handler.go`) | ✅ 完成 | 9 個 API 端點 |
| Step 6 | Booth 整合 (`booth_handler.go`) | ✅ 完成 | SetEventReviewService setter |
| Step 7 | Migration + DI + 路由 (`main.go`, `migrate.go`) | ✅ 完成 | |
| Step 8 | Event Service 修改 | ✅ 完成 | RequireVendorReview 處理 |

### Frontend Phase 3（全部完成）

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 14 | API 模組 (`event-review.ts` + `types.ts`) | ✅ 完成 | |
| Step 15 | EventApplyVendorPage（品牌商申請頁面） | ✅ 完成 | 含 6 種頁面狀態 |
| Step 16 | EventRegisterBoothPage（攤位攔截） | ✅ 完成 | access-check 攔截 |
| Step 17 | EventDetailPage（申請按鈕 + 封鎖檢查） | ✅ 完成 | useQuery accessCheck |
| Step 18 | EventVendorsPage（審核+封鎖 Tabs） | ✅ 完成 | 3 個 Tab |

### Dashboard Phase 4（全部完成）

| Step | 內容 | 狀態 | 備註 |
|------|------|------|------|
| Step 9-10 | Dashboard API Client + 頁面 | ✅ 完成 | 4 新建 + 4 修改，含 RBAC 權限 |

### Dashboard require_vendor_review 開關（已完成）

| 檔案 | 變更 | 原因 |
|------|------|------|
| `futuresign.dashboard/src/routes/_layout/events.tsx` | +`Switch` import, +`FormHelperText` import, +`isITOrBoss` destructure, +`require_vendor_review` 欄位到 `EventPublic`/`EditEventFormValues`/defaultValues/reset/payload, +`toggleVendorReviewMutation`, +品牌商審核 Tab 頂部 Switch, +EditEventModal 內 Switch | IT/BOSS 可直接在 Tab 或 Modal 切換 `require_vendor_review` |
| `futuresign.dashboard/src/client/services/events.ts` | `EventCreate` 加 `require_vendor_review`, `EventPublic` 加 `require_vendor_review` + `is_featured` | Dashboard API 型別對齊後端 |

### Official Website require_vendor_review 開關 + 品牌商申請表（已完成）

| 檔案 | 變更 | 原因 |
|------|------|------|
| `futuresign.official_website/src/components/ui/switch.tsx` | **新建** — Radix Switch 元件 | 提供 shadcn/ui Switch UI 元件 |
| `futuresign.official_website/src/pages/EventsCreateBasicPage.tsx` | +`Switch` import, formData +`require_vendor_review`, loadEventData 加欄位, 送出 payload 加欄位, Step 4 報名設定加 Switch, Step 7 確認頁加顯示, Step 7 加票券必填+活動手冊提醒 | 主辦建立/編輯活動時可設定品牌商審核 |
| `futuresign.official_website/src/pages/EventRegisterBoothPage.tsx` | +`sweetalert2` + `useCallback` import, +`vendorAccessResult`/`isApplyingVendor` state, 改 access-check 邏輯（存結果不 redirect）, +`handleVendorApply` 函式（SweetAlert 確認）, +`needsVendorReview` 判斷, +品牌商申請攔截 UI（選公司+送出+狀態顯示） | 品牌商直接在 register 頁面申請，不跳轉 |
| `futuresign.official_website/src/lib/i18n/translations/zh-TW.json` | +`requireVendorReview`, `requireVendorReviewDesc`, `enabled`, `disabled`, `ticketSettingsRequired`, `ticketSettingsHint`, `eventManualHint` | i18n 繁中翻譯 |
| `futuresign.official_website/src/lib/i18n/translations/en.json` | 同上英文版 | i18n 英文翻譯 |

### Golang 筆記

| 檔案 | 內容 |
|------|------|
| `Abby-notes/Golang/setter.md` | **新建** — Setter 模式避免破壞現有建構函式的說明文件 |

### 未完成項目

| Step | 內容 | 狀態 |
|------|------|------|
| Step 11 | Email 模板 | ❌ 待做 |
| Step 12 | NotificationService 擴充 | ❌ 待做 |
| Step 13 | access-check API + 活動列表過濾 | ❌ 待做 |

---

## 測試計畫

### Backend 單元測試

#### Repository 測試 (`event_review_repository_test.go`)
使用 SQLite in-memory：
- `TestCreate_Success` — 建立審核記錄
- `TestGetByID_Found` / `TestGetByID_NotFound`
- `TestGetByEventAndTarget_Found` / `_NotFound`
- `TestGetByEventID_WithStatusFilter` — pending/approved/rejected/blocked 篩選
- `TestGetByEventID_WithTargetTypeFilter` — company/member 篩選
- `TestGetByTargetID_Pagination` — 分頁
- `TestUpdate_StatusChange` — 更新狀態
- `TestSoftDelete_Success` — 軟刪除後 GetByID 找不到

#### Service 測試 (`event_review_service_test.go`)
使用 SQLite in-memory + helper：
- `TestApplyToEvent_Success`
- `TestApplyToEvent_AlreadyExists` → ErrEventReviewExists
- `TestApplyToEvent_Blocked` → ErrEventCompanyBlocked
- `TestReviewApplication_Approve` → status=approved, reviewed_at 非空
- `TestReviewApplication_Reject` → status=rejected + review_comment
- `TestBlockTarget_Company_Success`
- `TestBlockTarget_Member_Success`
- `TestBlockTarget_AlreadyBlocked` → ErrTargetAlreadyBlocked
- `TestUnblockTarget_Success` → status 從 blocked 變 approved
- `TestCheckVendorCanParticipate_NoReviewRequired` → nil（直接放行）
- `TestCheckVendorCanParticipate_Approved` → nil
- `TestCheckVendorCanParticipate_NotApproved` → ErrVendorNotApproved
- `TestCheckVendorCanParticipate_MemberBlocked` → ErrEventMemberBlocked
- `TestCheckVendorCanParticipate_CompanyBlocked` → ErrEventCompanyBlocked

### Backend API 端對端測試（api-lab-mcp）

#### 核心 CRUD 測試（9 個端點）

**品牌商審核 API：**
1. `POST /event-reviews` — 品牌商申請 → assert 201, body 有 id + status=pending
2. `POST /event-reviews` — 重複申請 → assert 409
3. `GET /event-reviews/event/:eid` — 列表 → assert 200, data is array
4. `GET /event-reviews/event/:eid?target_type=company` — 篩選 → assert 200
5. `GET /event-reviews/event/:eid/company/:cid` — 單筆查詢 → assert 200
6. `PATCH /event-reviews/:id/review` body={status:"approved"} → assert 200
7. `PATCH /event-reviews/:id/review` body={status:"rejected"} → assert 200

**封鎖/解封 API：**
8. `POST /event-reviews/block` — 封鎖公司 → assert 201, status=blocked
9. `POST /event-reviews/block` — 封鎖會員 → assert 201
10. `PATCH /event-reviews/:id/unblock` → assert 200, status=approved
11. `DELETE /event-reviews/:id` → assert 200

**權限測試：**
12. `POST /event-reviews` 無 auth → assert 401
13. `POST /event-reviews/block` 無 auth → assert 401/403
14. `PATCH /event-reviews/:id/review` 無 auth → assert 401/403

#### 業務邏輯整合測試（sequential）

```
1. 主辦設定 require_vendor_review=true
2. 品牌商申請 → assert status=pending
3. access-check → assert require_vendor_review=true, review_status=pending
4. 主辦核准 → assert status=approved
5. access-check → assert can_access=true
6. 主辦封鎖公司 → assert 201, status=blocked
7. access-check → assert is_blocked=true
8. 主辦解封 → assert status=approved
9. access-check → assert can_access=true
```

### Frontend 建置測試

| 專案 | 指令 | 驗證項目 |
|------|------|---------|
| Official Website | `npx tsc --noEmit` | TypeScript 編譯零錯誤 |
| Official Website | `npm run build` | Vite 建置成功 |
| Dashboard | `npx tsc --noEmit` | TypeScript 編譯零錯誤 |
| Dashboard | `npm run lint` | Biome lint 無錯誤 |

### 前端手動測試流程

#### 品牌商申請流程
1. 以品牌商帳號登入 Official Website
2. 進入活動詳情頁 → 看到「申請加入此活動」按鈕
3. 點擊進入 `/event/:id/apply`
4. 選擇公司 → 送出申請
5. 頁面顯示「等待審核中」+ 公司名稱 + 申請時間
6. 再次進入同頁面 → 顯示「等待審核中」（不會重複申請）

#### 主辦審核流程
7. 以主辦帳號登入 Official Website → EventVendorsPage
8. 切到「申請審核」Tab → 看到品牌商申請（待審核）
9. 點「審核」→ Modal 輸入意見 → 核准
10. 品牌商重新進入活動 → 看到「審核通過」→ 可選攤位

#### 封鎖流程
11. 主辦在「申請審核」Tab 點「封鎖」某品牌商
12. 切到「封鎖管理」Tab → 看到被封鎖記錄
13. 品牌商進入活動詳情頁 → 看到封鎖通知
14. 品牌商進入攤位頁 → redirect 回活動頁 + toast
15. 主辦解封 → 品牌商可再次參加

#### Dashboard 管理
16. 後台 events.tsx → 展開活動 Accordion
17. 切到「品牌商審核」Tab → 看到申請列表 + 篩選
18. 切到「封鎖管理」Tab → 看到封鎖列表 + 類型篩選
19. 權限不足的角色 → Tab 內操作按鈕隱藏

#### RWD 測試
20. 375px 手機版 — EventApplyVendorPage 卡片 w-full
21. 375px 手機版 — EventVendorsPage Tabs 正常 wrap
22. 1440px 桌面版 — 所有頁面正常顯示

---

## DB 變更執行記錄

| 日期 | 操作 | future_sign_stage | future_sign_prod |
|------|------|:-:|:-:|
| 2026-03-03 | `CREATE TABLE event_review` | ✅ | ✅ |
| 2026-03-03 | `ALTER TABLE event ADD require_vendor_review` | ✅ | ✅ |
