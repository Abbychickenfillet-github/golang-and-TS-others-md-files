# 活動合作單位功能規格

> **Issue 來源**：主辦方希望在活動頁面露出合作單位的 LOGO 及名稱
> **目前現況**：前台有「指導單位、主辦單位、協辦單位」的概念，但資料庫沒有對應欄位，也缺少「贊助商」
> **目標**：後台可管理活動的合作單位（指導/主辦/協辦/贊助），前台活動細節頁可分區塊顯示 LOGO 與名稱

## GitHub Issues

- 後端：yutuo-tech/futuresign_backend#417
- Dashboard：yutuo-tech/futuresign.dashboard#97
- 前台：yutuo-tech/future_sign.official-website#177

## 分支：`feat/event-sponsor`（三個 repo 皆同名）

---

## 一、資料表設計

### `event_sponsor` 活動合作單位表

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| `id` | varchar(36) | PK | UUID 主鍵 |
| `event_id` | varchar(36) | NOT NULL, FK → event.id, INDEX | 所屬活動 ID |
| `name` | varchar(255) | NOT NULL | 單位名稱 |
| `logo_url` | varchar(500) | NOT NULL | 單位 LOGO 圖片 URL |
| `website_url` | varchar(500) | NULL | 官網連結（點擊 LOGO 可跳轉） |
| `tier` | varchar(50) | NOT NULL, DEFAULT 'sponsor' | 單位類型 |
| `sort_order` | int | NOT NULL, DEFAULT 0 | 同類型內的排序（數字越小越前面） |
| `status` | varchar(20) | NOT NULL, DEFAULT 'active' | 狀態：`active` / `disabled` |
| `created_at` | datetime | auto | 建立時間 |
| `updated_at` | datetime | auto | 更新時間 |

**索引**：
- `idx_event_sponsor_event_id` on `event_id`
- `idx_event_sponsor_tier` on `tier`
- `idx_event_sponsor_status` on `status`

### Tier 類型定義

| 值 | 中文 | 說明 |
|----|------|------|
| `advisor` | 指導單位 | 政府機關或指導機構 |
| `organizer` | 主辦單位 | 主要舉辦方（可能有多個共同主辦） |
| `co_organizer` | 協辦單位 | 協助舉辦方 |
| `sponsor` | 贊助商 | 贊助品牌，露出 LOGO 及名稱 |

**設計考量**：
- 不強制關聯 `company` 表，因為合作單位（如政府指導單位、外部贊助品牌）不一定是系統內註冊公司
- `tier` 用於前端分區塊顯示，每種類型一個區塊
- `sort_order` 讓主辦方可自訂同類型內的排列順序
- `website_url` 選填，有填則 LOGO 可點擊跳轉
- 一個活動的 `organizer` tier 可有多筆（共同主辦）

---

## 二、後端 API

### CRUD 端點（Dashboard 後台用）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/v1/events/:eventId/sponsors` | 新增合作單位 | 主辦方 |
| GET | `/api/v1/events/:eventId/sponsors` | 取得活動所有合作單位 | 主辦方 |
| PUT | `/api/v1/events/:eventId/sponsors/:id` | 更新合作單位 | 主辦方 |
| DELETE | `/api/v1/events/:eventId/sponsors/:id` | 刪除合作單位 | 主辦方 |
| PUT | `/api/v1/events/:eventId/sponsors/sort` | 批次更新排序 | 主辦方 |

### 前台端點（Official Website 用）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/v1/consumer/events/:eventId/sponsors` | 取得活動合作單位（僅 active） | 公開 |

### Request / Response DTO

```go
// EventSponsorCreate 新增合作單位請求
type EventSponsorCreate struct {
    Name       string  `json:"name" binding:"required"`
    LogoURL    string  `json:"logo_url" binding:"required,url"`
    WebsiteURL *string `json:"website_url" binding:"omitempty,url"`
    Tier       string  `json:"tier" binding:"required,oneof=advisor organizer co_organizer sponsor"`
    SortOrder  int     `json:"sort_order"`
}

// EventSponsorUpdate 更新合作單位請求
type EventSponsorUpdate struct {
    Name       *string `json:"name"`
    LogoURL    *string `json:"logo_url" binding:"omitempty,url"`
    WebsiteURL *string `json:"website_url" binding:"omitempty,url"`
    Tier       *string `json:"tier" binding:"omitempty,oneof=advisor organizer co_organizer sponsor"`
    SortOrder  *int    `json:"sort_order"`
    Status     *string `json:"status" binding:"omitempty,oneof=active disabled"`
}

// EventSponsorPublic 合作單位回應
type EventSponsorPublic struct {
    ID         string  `json:"id"`
    EventID    string  `json:"event_id"`
    Name       string  `json:"name"`
    LogoURL    string  `json:"logo_url"`
    WebsiteURL *string `json:"website_url"`
    Tier       string  `json:"tier"`
    SortOrder  int     `json:"sort_order"`
    Status     string  `json:"status"`
    CreatedAt  string  `json:"created_at"`
    UpdatedAt  string  `json:"updated_at"`
}

// EventSponsorConsumerPublic 前台合作單位回應（精簡版）
type EventSponsorConsumerPublic struct {
    Name       string  `json:"name"`
    LogoURL    string  `json:"logo_url"`
    WebsiteURL *string `json:"website_url"`
    Tier       string  `json:"tier"`
}

// EventSponsorSortRequest 批次排序請求
type EventSponsorSortRequest struct {
    Items []SortItem `json:"items" binding:"required,dive"`
}

type SortItem struct {
    ID        string `json:"id" binding:"required"`
    SortOrder int    `json:"sort_order"`
}
```

---

## 三、前端實作（共 4 處）

### 3-1. Official Website — MyEventsPage 活動卡片新增按鈕

**檔案**：`src/pages/MyEventsPage.tsx`

在現有 9 個按鈕後新增第 10 個「合作單位」按鈕：
- 圖標：`Handshake`（lucide-react）
- 路徑：`/events/${event.id}/sponsors`
- 電腦版補滿第 5 排（子活動關聯 | 合作單位）

### 3-2. Official Website — 新增合作單位管理頁面

**新檔案**：`src/pages/EventSponsorsPage.tsx`

主辦方在此頁 CRUD 管理活動的合作單位，按 tier 分 4 區塊。

### 3-3. Official Website — 活動細節頁新增「合作單位」Tab

**檔案**：`src/pages/EventDetailPage.tsx`

消費者瀏覽時第 5 個 Tab，URL hash `#partners`。
- 按 tier 分區塊顯示 LOGO + 名稱
- 響應式：桌面 4-6 欄、平板 3 欄、手機 2 欄
- 有 `website_url` 的 LOGO 可點擊跳轉
- 全部 tier 無資料則不顯示此 Tab

### 3-4. Dashboard 後台 — 活動編輯頁新增 Tab

**檔案**：`src/routes/_layout/events/$eventId.tsx`

系統方第 8 個 Tab「合作單位」，功能同 3-2。

---

## 四、Go 後端需建立的檔案

```
backend-go/internal/
├── models/event_sponsor.go          # GORM 模型
├── dto/event_sponsor.go             # DTO 定義
├── repository/event_sponsor_repository.go  # 資料存取
├── service/event_sponsor_service.go        # 商業邏輯
└── handler/event_sponsor_handler.go        # HTTP handler
```

**migrate.go** 需新增 `&models.EventSponsor{}` 到 `getAllModels()`

---

## 五、實作順序

1. **Phase 1 - 後端**：Model → DTO → Repository → Service → Handler → Route 註冊
2. **Phase 2 - Official Website**：MyEventsPage 按鈕 + EventSponsorsPage 管理頁 + 活動細節頁 Tab
3. **Phase 3 - Dashboard**：活動編輯頁合作單位 Tab

---

## 六、i18n Key 規劃

```json
{
  "event.sponsors": "合作單位 / Partners",
  "event.sponsor.tier.advisor": "指導單位 / Advisor",
  "event.sponsor.tier.organizer": "主辦單位 / Organizer",
  "event.sponsor.tier.co_organizer": "協辦單位 / Co-organizer",
  "event.sponsor.tier.sponsor": "贊助商 / Sponsor"
}
```
