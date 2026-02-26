# 多語系資料庫設計：為什麼要用獨立翻譯表？

> 需求背景：Jessie 提出活動介紹需要提供雙語（中/英），需決定資料庫設計方式。

---

## 採用方案：獨立翻譯表（Separate Translation Table）

```
event（只存語言無關的資料）
├── id
├── start_at
├── end_at
├── max_attendees
├── is_free
└── ...

event_i18n（存語言相關的文字）
├── id
├── event_id (FK → event.id)
├── locale (varchar, e.g. "zh-TW", "en")
├── name
├── description
├── short_description
└── created_at / updated_at
```

| 優點 | 缺點 |
|------|------|
| 新增語言只需 INSERT，不需改 schema | 查詢需要 JOIN |
| 符合資料庫正規化 | 初期實作較複雜 |
| 容易批次匯出/匯入翻譯內容 | 每個需要翻譯的實體都要建一張翻譯表 |
| 應用程式碼不需隨語言數量變動 | |

---

## 為什麼長期維護推薦翻譯表？文獻出處

### 1. Phrase（業界知名 i18n 平台）

> "If we added Hebrew to the above table, we would have to add new Hebrew versions for every localizable column."
>
> "With translation tables, we can have as many locales as we want, and it wouldn't change the basic structure of our models."

- 新增語言不需改 schema，只需插入資料
- 不會造成大量空欄位浪費儲存空間

**來源**: [The Best Database Structure to Keep Multilingual Data | Phrase](https://phrase.com/blog/posts/best-database-structure-for-keeping-multilingual-data/)

### 2. Redgate（資料庫工具領導廠商）

> "Functionality to an application should have its own subschema and logic encapsulated in reusable components."

建議使用「Translation Subschema」，包含：
1. **Languages 主表** — 記錄支援的語言
2. **Original Text 表** — 存放原始可翻譯內容
3. **Translated Text 表** — 存放各語言翻譯版本

核心好處：主 schema 的物件引用 translation ID，而不是直接存文字，新增語言只需要資料庫操作，不需要改應用程式碼。

**來源**: [Best Practices for Multi-Language Database Design | Redgate](https://www.red-gate.com/blog/multi-language-database-design/)

### 3. The Honest Coder（技術部落格）

> Column-per-language: "Adding additional language requires modifying tables and updating all relevant database queries."
>
> Entity translation tables: offer the best balance for sustained maintenance.

文章比較三種做法後，明確推薦 **Entity Translation Table**（每個實體一張翻譯表），因為：
- 避免「JOIN 地獄」（相比把所有翻譯塞在一張共用表）
- 避免「schema 膨脹」（相比在原表加欄位）
- 長期維護成本最低

**來源**: [Building Multilingual Relational Databases | The Honest Coder](https://thehonestcoder.com/building-multilingual-relational-databases/)

### 4. Medium — Database I18N Design Patterns

> "Separate translation table per entity: allows adding translations without adjusting the original table."
>
> "No data model changes are needed when you add a new language; just insert records."

**來源**: [Database I18N/L10N Design Patterns | Medium (walkin)](https://medium.com/walkin/database-internationalization-i18n-localization-l10n-design-patterns-94ff372375c6)

### 5. KoçSistem — Multi-Language Database Design

> Column-per-language: "Hard to maintain — works easily for 2-3 languages, but becomes really hard when you have a lot of columns or languages."
>
> Translation table: "This option allows incorporating new languages without altering the table structure. It does not require generating redundant information or breaking the model normalization."

**來源**: [What is the best database design for multi-language data? | Medium (KoçSistem)](https://medium.com/kocsistem/what-is-the-best-database-design-for-multi-language-data-b21982dd7265)

---

## FutureSign 實際影響範圍

需要建立翻譯表的實體（至少）：

| 主表 | 翻譯表 | 可翻譯欄位 |
|------|--------|-----------|
| `event` | `event_i18n` | name, description, short_description |
| `ticket`（票券） | `ticket_translation` | name, description（視欄位而定） |

---

## 自動翻譯：翻譯內容怎麼產生？

上面討論的是「翻譯資料怎麼存」，但翻譯內容本身有兩種產生方式：

### 人工翻譯（傳統 i18n 做法）

主辦方自己輸入中英文版本，或交給翻譯人員處理。
- 參考文章：[Day 23: 使用 API 管理 i18n，多語言支援的後端實作](https://ithelp.ithome.com.tw/articles/10356758)
- 該文章用 Node.js + Express 建 API 回傳**事先寫好的**翻譯 JSON，不具備自動翻譯能力

### 自動翻譯（串接翻譯 API）

系統自動將中文翻成英文，使用者不需自己輸入英文。

#### 可用服務比較

| 服務 | 特點 | 費用 |
|------|------|------|
| **Google Cloud Translation API** | 最成熟，支援 100+ 語言 | 每月 50 萬字元免費，超過 $20/百萬字元 |
| **DeepL API** | 翻譯品質公認最好（歐亞語系） | Free 版 50 萬字元/月 |
| **Claude / GPT** | 可處理上下文、語氣、專業術語 | 依 token 計費 |

> Google Cloud Translation API 定價來源：[Pricing | Cloud Translation | Google Cloud](https://cloud.google.com/translate/pricing)

#### FutureSign 用量估算（Google Cloud Translation）

| 項目 | 估算 |
|------|------|
| 每個活動可翻譯字元 | name (~50) + short_description (~2000) + description (~2,000+) ≈ **2,250 字元** |
| 免費額度（每月） | 500,000 字元 |
| 免費可翻譯活動數 | ≈ **222 個活動/月** |
| 超過免費額度 | $20 / 百萬字元（約 444 個活動才 $1 美元） |

初期免費額度應該綽綽有餘。

### 推薦做法：翻譯表 + 自動翻譯 API 搭配使用

```
主辦方建立活動（輸入中文）
    ↓
後端呼叫翻譯 API（如 Google Cloud Translation）自動產生英文版
    ↓
存入 event_i18n 表（locale="en"）
    ↓
主辦方可在後台手動修正翻譯（保留人工校正彈性）
    ↓
前端依使用者語系從 API 取得對應翻譯
```

這樣使用者建活動時不需要自己打英文，系統自動翻好，同時保留人工修正的彈性。

---

## 結論

**加欄位**適合 prototype 或確定永遠只有兩種語言的情境。
**翻譯表**是業界公認的長期維護最佳實踐，所有主流技術文獻都推薦這個做法。

FutureSign 作為要長期經營的產品，採用翻譯表是正確的方向。

---

## Event I18n 全端實作計畫

### 需求決策

- 前端 UI：在現有活動編輯頁面加「翻譯」Tab
- 消費者端：API 加 `?locale=` 參數，自動回傳對應語系，fallback 母表中文
- 語系：不限制，前端提供下拉選單讓使用者自由新增

---

### 第一部分：後端（backend-go）

#### 1. DTO — `internal/dto/event_i18n.go`（新建）

```go
// EventI18nCreate 建立翻譯請求
type EventI18nCreate struct {
    EventID          string `json:"event_id" binding:"required"`
    Locale           string `json:"locale" binding:"required"`
    Name             string `json:"name" binding:"required"`
    Description      string `json:"description" binding:"required"`
    ShortDescription string `json:"short_description"`
}

// EventI18nUpdate 更新翻譯請求
type EventI18nUpdate struct {
    Name             *string `json:"name,omitempty"`
    Description      *string `json:"description,omitempty"`
    ShortDescription *string `json:"short_description,omitempty"`
}

// EventI18nResponse 翻譯回應
type EventI18nResponse struct {
    ID               string `json:"id"`
    EventID          string `json:"event_id"`
    Locale           string `json:"locale"`
    Name             string `json:"name"`
    Description      string `json:"description"`
    ShortDescription string `json:"short_description"`
    CreatedAt        string `json:"created_at"`
    UpdatedAt        string `json:"updated_at"`
}

// EventI18nListResponse 翻譯列表回應
type EventI18nListResponse struct {
    Data  []EventI18nResponse `json:"data"`
    Count int                 `json:"count"`
}
```

#### 2. Repository — `internal/repository/event_i18n_repository.go`（新建）

**Interface:**
```go
type EventI18nRepository interface {
    Create(ctx context.Context, i18n *models.EventI18n) error
    GetByID(ctx context.Context, id string) (*models.EventI18n, error)
    GetByEventAndLocale(ctx context.Context, eventID, locale string) (*models.EventI18n, error)
    GetByEventID(ctx context.Context, eventID string) ([]*models.EventI18n, error)
    Update(ctx context.Context, i18n *models.EventI18n) error
    Delete(ctx context.Context, id string) error
}
```

關鍵方法：`GetByEventAndLocale` 用於消費者端 locale fallback 查詢。

#### 3. Service — `internal/service/event_i18n_service.go`（新建）

**Interface:**
```go
type EventI18nService interface {
    CreateTranslation(ctx context.Context, req *dto.EventI18nCreate) (*dto.EventI18nResponse, error)
    GetTranslation(ctx context.Context, id string) (*dto.EventI18nResponse, error)
    GetTranslationsByEvent(ctx context.Context, eventID string) (*dto.EventI18nListResponse, error)
    UpdateTranslation(ctx context.Context, id string, req *dto.EventI18nUpdate) (*dto.EventI18nResponse, error)
    DeleteTranslation(ctx context.Context, id string) error
}
```

依賴：`EventI18nRepository` + `EventRepository`（驗證活動存在）

#### 4. Handler — `internal/handler/event_i18n_handler.go`（新建）

**Routes（在 main.go 註冊）：**
```
POST   /api/v1/events/:event_id/i18n          建立翻譯
GET    /api/v1/events/:event_id/i18n          列出該活動所有翻譯
GET    /api/v1/events/:event_id/i18n/:id      取得單筆翻譯
PATCH  /api/v1/events/:event_id/i18n/:id      更新翻譯
DELETE /api/v1/events/:event_id/i18n/:id      刪除翻譯
```

後台路由需 `middleware.AuthRequired()`。
主辦方路由需 `middleware.MemberAuthRequired(cfg)` + 驗證活動所有權。

#### 5. 消費者端 locale 支援

修改現有 **EventHandler**（`internal/handler/event_handler.go`）：
- 在 `GetEvent` handler 加入 `locale` query 參數
- 如果有 `locale` 且不是 `zh-TW`，查詢 `event_i18n` 表取得翻譯
- 有翻譯 → 覆蓋 response 的 name/description/short_description
- 沒翻譯 → fallback 保持母表中文

修改 **EventConsumerPublic** DTO：
- 新增 `Locale *string` 欄位標示回傳的語系

#### 6. main.go 註冊

在 `setupAuthRoutes()` 中：
- 初始化 `eventI18nRepo`
- 初始化 `eventI18nService`
- 初始化 `eventI18nHandler`
- 呼叫 `setupEventI18nRoutes(v1, eventI18nHandler)`

---

### 第二部分：Dashboard 前端（futuresign.dashboard）

Dashboard 使用 **TanStack Router + Chakra UI v2 + TanStack Query**。

1. **API 層** — `src/client/services/eventI18n.ts`（新建）
2. **Types** — `src/client/models/EventI18n.ts`（新建）
3. **翻譯管理元件** — `src/components/Events/EventTranslations.tsx`（新建）
   - 左右對照模式 (Side-by-Side Editor)
   - 上方：語系下拉選單，已有翻譯的語系帶標記
   - 左欄（唯讀）：母表中文原文
   - 右欄（可編輯）：該語系的翻譯內容
   - 底部：儲存 / 刪除按鈕
4. 在 `src/routes/_layout/events/$eventId.tsx` 的 Tabs 中新增「翻譯」分頁

---

### 第三部分：Official Website 前端（futuresign.official_website）

Official Website 使用 **React Router v6 + Tailwind + Shadcn/ui + TanStack Query**。

1. **API 層** — `src/lib/api/eventI18n.ts`（新建）
2. **Types** — 在 `src/lib/api/types.ts` 新增 EventI18n 相關型別
3. **翻譯管理元件** — `src/components/EventTranslations.tsx`（新建）
4. **活動建立步驟** — 翻譯語系插入為 Step 3（見下方說明）
5. **消費者端**：`EventDetailPage.tsx` 從 `useLanguage()` 取得當前語系，API 帶上 `?locale=` 參數

#### EventTranslations 元件 — 雙模式設計

元件支援兩種運作模式：

| 模式 | 觸發條件 | 翻譯資料來源 | 儲存方式 |
|------|----------|-------------|---------|
| **API 模式** | 傳入 `eventId` | `useQuery` 從後端取得 | `useMutation` 直接打 API |
| **本地模式** | 不傳 `eventId` | `pendingTranslations` prop | `onPendingTranslationsChange` callback 傳回父元件 |

```typescript
// API 模式（編輯已建立的活動）
<EventTranslations eventId="abc-123" ... />

// 本地模式（新建活動，尚無 eventId）
<EventTranslations
  pendingTranslations={pendingTranslations}
  onPendingTranslationsChange={setPendingTranslations}
  ...
/>
```

本地模式的翻譯資料暫存在父元件的 `pendingTranslations` state，等 Step 7 建立活動時一併送出 API。

#### 活動建立步驟流程（7 步）

原本 6 步 → 翻譯語系插入為 Step 3 → 變成 7 步：

```
Step 1: 基本資訊（名稱、簡介、Banner）
Step 2: 詳細說明（描述、時間、地點）
Step 3: 翻譯語系 ← NEW（左右對照編輯器，新建/編輯模式都可用）
Step 4: 報名設定（報名時間、人數上限、收費）← 原 Step 3
Step 5: 電力規則 ← 原 Step 4
Step 6: 商品設定 ← 原 Step 5
Step 7: 資訊確認（送出建立/更新）← 原 Step 6
```

Step 3 **不區分新建/編輯模式**，都可以直接新增翻譯：
- 新建模式：翻譯暫存在本地 state，Step 7 送出時一起 POST
- 編輯模式：翻譯直接打 API（即時存檔）

---

### 修改檔案清單

#### 新建檔案
| 檔案 | 用途 |
|------|------|
| `backend-go/internal/dto/event_i18n.go` | DTO |
| `backend-go/internal/repository/event_i18n_repository.go` | Repository |
| `backend-go/internal/service/event_i18n_service.go` | Service |
| `backend-go/internal/handler/event_i18n_handler.go` | Handler |
| `futuresign.dashboard/src/client/services/eventI18n.ts` | Dashboard API |
| `futuresign.dashboard/src/client/models/EventI18n.ts` | Dashboard Types |
| `futuresign.dashboard/src/components/Events/EventTranslations.tsx` | Dashboard 翻譯元件 |
| `futuresign.official_website/src/lib/api/eventI18n.ts` | Official API |
| `futuresign.official_website/src/components/EventTranslations.tsx` | Official 翻譯元件（雙模式） |

#### 修改檔案
| 檔案 | 修改 |
|------|------|
| `backend-go/cmd/server/main.go` | 註冊 repo/service/handler/routes |
| `backend-go/internal/handler/event_handler.go` | GetEvent 加 locale 查詢 + SetI18nService |
| `backend-go/internal/dto/event.go` | EventPublic/EventConsumerPublic 加 Locale 欄位 |
| `futuresign.dashboard/src/routes/_layout/events/$eventId.tsx` | 加「翻譯」Tab |
| `futuresign.official_website/src/lib/api/types.ts` | 加 EventI18n 型別 |
| `futuresign.official_website/src/lib/api/events.ts` | getEventById 加 locale 參數 |
| `futuresign.official_website/src/lib/hooks/useEvents.ts` | useEvent 加 locale 參數 |
| `futuresign.official_website/src/pages/EventsCreateBasicPage.tsx` | 翻譯語系插入 Step 3（7 步流程）+ pendingTranslations 暫存 |
| `futuresign.official_website/src/pages/EventDetailPage.tsx` | 消費者端帶 locale 參數 |
| `futuresign.official_website/src/lib/i18n/translations/zh-TW.json` | 新增 translationSettings key + 步驟提示文字更新 |
| `futuresign.official_website/src/lib/i18n/translations/en.json` | 同上英文版 |

---

### 第四部分：消費者端多語系顯示（待討論）

> **目前實作**：消費者端 `EventDetailPage.tsx` 根據使用者語系自動帶 `?locale=` 參數，後端回傳翻譯版或 fallback 中文版。
>
> **待討論**：
> - 活動列表頁（卡片）是否也要顯示翻譯版的名稱/簡介？
> - 活動細節頁要用什麼 UI 呈現？自動切換？Tab？語系切換按鈕？
> - 品牌商 vs 一般消費者的瀏覽體驗是否有差異？
