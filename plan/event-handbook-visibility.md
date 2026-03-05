# 活動手冊可見性（Visibility）欄位新增計畫

> 建立日期：2026-03-05

---

## 背景

上次電話討論到手冊的可見性問題。原本手冊都是公開招商用途，但主辦方可能會有不同對象的手冊需求（例如消費者須知 vs 品牌商進場手冊），因此需要讓主辦方可以設定每本手冊的可檢視對象。

---

## 一、需求

活動手冊新增「對象」欄位，主辦方可選擇手冊要給誰看：
- **公開發布** — 所有人都看得到（含未登入）
- **僅供消費者** — 只有身份含 `consumer` 的會員看得到
- **僅供品牌商** — 只有身份含 `vendor` 的會員看得到

身份來源：`member_identity_item` 表的 `identity` 欄位

```go
// backend-go/internal/models/member.go
const (
    MemberIdentityOrganizer          MemberIdentity = "organizer"
    MemberIdentityVendor             MemberIdentity = "vendor"
    MemberIdentityConsumer           MemberIdentity = "consumer"
    MemberIdentityPT                 MemberIdentity = "pt"
    MemberIdentityGeneralContractor  MemberIdentity = "general_contractor"
    MemberIdentityElectricityCompany MemberIdentity = "electricity_company"
    MemberIdentityFurnitureCompany   MemberIdentity = "furniture_company"
)
```

---

## 二、欄位設計

```go
// 新增常數
type HandbookVisibility string

const (
    HandbookVisibilityPublic   HandbookVisibility = "public"   // 公開發布
    HandbookVisibilityConsumer HandbookVisibility = "consumer" // 僅供消費者
    HandbookVisibilityVendor   HandbookVisibility = "vendor"   // 僅供品牌商
)
```

DB 欄位：
```sql
visibility VARCHAR(20) NOT NULL DEFAULT 'public' COMMENT '手冊可見對象 (public/consumer/vendor)'
```

---

## 三、需修改的檔案

### 3.1 Backend（Go）

#### ① Model — `backend-go/internal/models/event_handbook.go`

新增 `Visibility` 欄位：
```go
type EventHandbook struct {
    Base
    EventID                string             `gorm:"type:varchar(36);not null;index"`
    Title                  string             `gorm:"type:varchar(255);not null"`
    Description            *string            `gorm:"type:text"`
    CoverImageURLs         string             `gorm:"type:text;not null;default:'[]'"`
    SortOrder              int                `gorm:"type:int;not null;default:0"`
    Status                 string             `gorm:"type:varchar(20);not null;default:'draft'"`
    Visibility             HandbookVisibility `gorm:"type:varchar(20);not null;default:'public';comment:手冊可見對象"`  // ← 新增
    AllowedFooterEventName bool               `gorm:"type:tinyint(1);not null;default:0"`
    Event                  *Event             `gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE"`
}
```

#### ② DTO — `backend-go/internal/dto/event_handbook.go`

```go
// CreateHandbookRequest 新增
Visibility *string `json:"visibility,omitempty"` // "public" | "consumer" | "vendor"，預設 "public"

// UpdateHandbookRequest 新增
Visibility *string `json:"visibility,omitempty"`

// HandbookResponse 新增
Visibility string `json:"visibility"`
```

#### ③ Service — `backend-go/internal/service/event_handbook_service.go`

- `CreateHandbook`：處理 `Visibility` 欄位，預設 `"public"`
- `UpdateHandbook`：處理 `Visibility` 更新
- `toHandbookResponse`：回傳 `Visibility`
- `GetPublishedHandbooksByEvent`：目前只過濾 `status = published`，需新增參數讓前端帶入 member identity 做過濾

#### ④ Handler — `backend-go/internal/handler/event_handbook_handler.go`

- 公開 API（`GetHandbookFull`、`ListHandbooks`）：
  - 未登入 → 只回傳 `visibility = "public"` 的手冊
  - 已登入 → 根據該 member 的 identity 過濾
    - member 有 `consumer` 身份 → 看得到 `public` + `consumer`
    - member 有 `vendor` 身份 → 看得到 `public` + `vendor`
    - member 同時有兩個身份 → 看得到全部
- 主辦方 / 後台管理 API → 不過濾，全部都看得到

#### ⑤ Repository — `backend-go/internal/repository/event_handbook_repository.go`

新增方法或修改現有方法：
```go
// 新增：依身份過濾已發布手冊
GetPublishedByEventIDWithVisibility(ctx, eventID string, visibilities []string) ([]*EventHandbook, error)
```

---

### 3.2 Frontend（official_website）

#### ⑥ Type — `src/lib/api/types.ts`

```typescript
// Handbook interface 新增
visibility: 'public' | 'consumer' | 'vendor'

// CreateHandbookRequest 新增
visibility?: 'public' | 'consumer' | 'vendor'

// UpdateHandbookRequest 新增
visibility?: 'public' | 'consumer' | 'vendor'
```

#### ⑦ 手冊編輯頁 — `src/pages/EventHandbookEditorPage.tsx`

- 建立手冊 dialog 新增 visibility 選擇（Radio 或 Select）
- 手冊卡片上顯示 visibility badge（公開 / 消費者 / 品牌商）

#### ⑧ 手冊頁面編輯器 — `src/pages/EventHandbookPageEditorPage.tsx`

- 右側設定面板新增 visibility 選擇

#### ⑨ i18n — `src/lib/i18n/translations/zh-TW.json` & `en.json`

```json
// zh-TW
"handbookVisibility": "可見對象",
"handbookVisibilityPublic": "公開發布",
"handbookVisibilityConsumer": "僅供消費者",
"handbookVisibilityVendor": "僅供品牌商"

// en
"handbookVisibility": "Visibility",
"handbookVisibilityPublic": "Public",
"handbookVisibilityConsumer": "Consumers Only",
"handbookVisibilityVendor": "Vendors Only"
```

---

### 3.3 Dashboard（futuresign.dashboard）

> **目前 dashboard 完全沒有手冊管理頁面**，需要新增。

#### ⑩ 新增路由 — `src/routes/_layout/event-handbooks.tsx`

新增手冊管理頁面，功能包含：
- 選擇活動 → 列出該活動的所有手冊
- 手冊列表：顯示標題、狀態（draft/published）、visibility badge、頁數
- 新增手冊（標題、visibility 選擇）
- 編輯手冊（標題、描述、狀態、visibility）
- 刪除手冊

UI 參考：可參考 `event-coupons.tsx` 的活動選擇 + 列表收合模式

#### ⑪ 新增側邊欄入口 — `src/components/Common/Sidebar.tsx`（或類似）

在側邊欄加入「手冊管理」連結：
```tsx
{ icon: FiFileText, label: "手冊管理", path: "/event-handbooks" }
```

#### ⑫ API Client — `src/client/services/` 或直接用 `__request`

Dashboard 沒有 official_website 的 `eventHandbookApi`，需要新增或直接用 `__request`：
```typescript
// 取得活動手冊列表
GET /api/v1/events/{eventId}/handbooks

// 建立手冊
POST /api/v1/events/{eventId}/handbooks

// 更新手冊（含 visibility）
PATCH /api/v1/events/{eventId}/handbooks/{handbookId}

// 刪除手冊
DELETE /api/v1/events/{eventId}/handbooks/{handbookId}
```

#### ⑬ 手冊 Visibility 選擇 UI

在新增/編輯手冊的表單加入：
```tsx
<FormControl>
  <FormLabel>可見對象</FormLabel>
  <Select value={visibility} onChange={...}>
    <option value="public">公開發布</option>
    <option value="consumer">僅供消費者</option>
    <option value="vendor">僅供品牌商</option>
  </Select>
</FormControl>
```

手冊列表的 badge 顯示：
```tsx
<Badge colorScheme={visibility === 'public' ? 'green' : visibility === 'consumer' ? 'blue' : 'purple'}>
  {visibility === 'public' ? '公開' : visibility === 'consumer' ? '消費者' : '品牌商'}
</Badge>
```

---

## 四、實作順序

1. **Backend Model** — 加欄位 + AutoMigrate
2. **Backend DTO** — Create/Update/Response 加欄位
3. **Backend Service** — 處理欄位轉換
4. **Backend Repository** — 新增 visibility 過濾查詢
5. **Backend Handler** — 公開 API 加身份過濾邏輯
6. **Official Website Type** — 加 type
7. **Official Website 編輯頁** — 加選擇 UI
8. **Official Website i18n** — 加翻譯
9. **Dashboard 手冊管理頁面** — 新增 `event-handbooks.tsx`
10. **Dashboard 側邊欄** — 加入「手冊管理」連結
11. **Dashboard Visibility UI** — 新增/編輯表單加 visibility 選擇

---

## 五、公開 API 過濾邏輯

```
GET /api/v1/events/{id}/handbooks（消費者端）

未登入
  → WHERE status = 'published' AND visibility = 'public'

已登入，查 member_identity_item
  → 有 consumer 身份 → WHERE status = 'published' AND visibility IN ('public', 'consumer')
  → 有 vendor 身份   → WHERE status = 'published' AND visibility IN ('public', 'vendor')
  → 兩者都有         → WHERE status = 'published' AND visibility IN ('public', 'consumer', 'vendor')

主辦方 / 後台
  → 不過濾 visibility（全部顯示）
```
