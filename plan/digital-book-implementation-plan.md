# 電子書/活動手冊系統 (Digital Handbook/Bookshelf)

## Context

主辦方需要一個類似 PDF 的數位手冊系統，用 HTML+CSS+圖片 取代傳統 PDF。一個活動可建多本手冊（如：攤位手冊、場地規範、注意事項），每本手冊可包含多個頁面，用 TipTap 富文本編輯器編輯，閱讀端有 A4 排版和翻頁效果。

---

## 架構決策

- **編輯入口**：`official_website` 新增獨立頁面 `/events/:id/handbooks`，從活動建立流程/我的活動連結過去
- **閱讀入口**：`EventDetailPage` 新增第三個 tab「活動手冊」（在攤位地圖旁邊）
- **後端**：Go 全新 CRUD，遵循 `event_i18n` 模式
- **富文本**：TipTap v3.18.0（已安裝）+ 現有 `rich-text-editor.tsx` 元件
- **圖片上傳**：現有 S3 上傳（`/images/upload-image/`）

---

## 資料庫設計

### `event_handbook`（活動手冊）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| event_id | varchar(36) FK | 關聯活動 |
| title | varchar(255) | 手冊標題 |
| cover_image_url | varchar(500) | 封面圖片 |
| description | text | 手冊說明 |
| sort_order | int | 排序 |
| status | varchar(20) | draft / published |
| created_at / updated_at / deleted_at | datetime | 時間戳（軟刪除） |

### `event_handbook_page`（手冊頁面）

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | varchar(36) PK | UUID |
| handbook_id | varchar(36) FK | 關聯手冊 |
| title | varchar(255) | 頁面標題 |
| content | mediumtext | TipTap HTML 內容 |
| sort_order | int | 頁碼順序 |
| created_at / updated_at | datetime | 時間戳（硬刪除） |

---

## API 端點

所有 route 在 `/api/v1/events/:id/handbooks` 下：

| Method | Path | Auth | 說明 |
|--------|------|------|------|
| GET | `/:id/handbooks` | Optional | 列出手冊（公開只看 published） |
| POST | `/:id/handbooks` | TryBothAuth | 建立手冊 |
| GET | `/:id/handbooks/:hid` | Optional | 取得手冊 |
| PATCH | `/:id/handbooks/:hid` | TryBothAuth | 更新手冊 |
| DELETE | `/:id/handbooks/:hid` | TryBothAuth | 刪除手冊 |
| GET | `/:id/handbooks/:hid/pages` | Optional | 列出頁面 |
| POST | `/:id/handbooks/:hid/pages` | TryBothAuth | 新增頁面 |
| PATCH | `/:id/handbooks/:hid/pages/:pid` | TryBothAuth | 更新頁面（儲存內容） |
| DELETE | `/:id/handbooks/:hid/pages/:pid` | TryBothAuth | 刪除頁面 |
| PUT | `/:id/handbooks/:hid/pages/reorder` | TryBothAuth | 重排頁面順序 |
| GET | `/:id/handbooks/:hid/full` | Optional | 手冊+所有頁面（閱讀器用） |

---

## 後端檔案清單（Go）

| # | 檔案 | 動作 |
|---|------|------|
| 1 | `internal/models/event_handbook.go` | 新增 |
| 2 | `internal/models/event_handbook_page.go` | 新增 |
| 3 | `internal/dto/event_handbook.go` | 新增 |
| 4 | `internal/repository/event_handbook_repository.go` | 新增 |
| 5 | `internal/repository/event_handbook_page_repository.go` | 新增 |
| 6 | `internal/service/event_handbook_service.go` | 新增 |
| 7 | `internal/handler/event_handbook_handler.go` | 新增 |
| 8 | `cmd/server/main.go` | 修改：加 setupEventHandbookRoutes + 依賴注入 |
| 9 | `internal/migrate/migrate.go` | 修改：加入兩個 model 到 AutoMigrate |

### 關鍵介面

```go
// Repository
type EventHandbookRepository interface {
    Create / GetByID / GetByEventID / GetPublishedByEventID / Update / Delete(軟刪除)
}
type EventHandbookPageRepository interface {
    Create / GetByID / GetByHandbookID / Update / Delete(硬刪除) / BatchUpdateSortOrder
}

// Service
type EventHandbookService interface {
    CreateHandbook / GetHandbook / GetHandbooksByEvent / UpdateHandbook / DeleteHandbook
    CreatePage / GetPage / GetPagesByHandbook / UpdatePage / DeletePage / ReorderPages
    GetHandbookWithPages  // 閱讀器用，一次取手冊+所有頁面
}
```

權限：遵循 `event_i18n_handler.go` 的 `checkEventPermission` 模式

---

## 前端檔案清單（official_website）

| # | 檔案 | 動作 |
|---|------|------|
| 1 | `src/lib/api/types.ts` | 修改：加 handbook 型別 |
| 2 | `src/lib/api/eventHandbook.ts` | 新增：API client |
| 3 | `src/lib/hooks/useHandbooks.ts` | 新增：React Query hooks |
| 4 | `src/components/handbook/HandbookCard.tsx` | 新增：手冊卡片 |
| 5 | `src/components/handbook/HandbookBookshelf.tsx` | 新增：書架 grid |
| 6 | `src/components/handbook/HandbookReader.tsx` | 新增：A4 閱讀器 + 翻頁 |
| 7 | `src/components/handbook/HandbookPageSidebar.tsx` | 新增：編輯端頁面側欄 |
| 8 | `src/pages/EventHandbookEditorPage.tsx` | 新增：手冊管理頁 |
| 9 | `src/pages/EventHandbookPageEditorPage.tsx` | 新增：頁面編輯器 |
| 10 | `src/pages/EventHandbookReaderPage.tsx` | 新增：獨立閱讀頁 |
| 11 | `src/App.tsx` | 修改：加 3 條 route |
| 12 | `src/pages/EventDetailPage.tsx` | 修改：加第三個 tab |
| 13 | `src/lib/i18n/translations/zh-TW.json` | 修改：加翻譯 |
| 14 | `src/lib/i18n/translations/en.json` | 修改：加翻譯 |

---

## 核心 UI 設計

### 頁面編輯器

```
+------------------------------------------------------+
| ← 返回  |  手冊標題  |  ✓ 已自動儲存               |
+------------------------------------------------------+
| 側欄 (250px)    |  主編輯區                          |
| +-------------+ | +--------------------------------+ |
| | ☰ 第一頁    | | | TipTap 工具列                  | |
| | ☰ 第二頁 ✓  | | +--------------------------------+ |
| | ☰ 第三頁    | | |                                | |
| |             | | | TipTap EditorContent            | |
| |             | | | (A4 比例白底容器)               | |
| | [+ 新增頁面]| | |                                | |
| +-------------+ | +--------------------------------+ |
+------------------------------------------------------+
```

- 複用現有 `rich-text-editor.tsx`
- 自動儲存：content 變更後 2 秒 debounce → PATCH
- 切換頁面時取消未完成的自動儲存

### A4 閱讀器

```
+------------------------------------------+
|   [←]   頁面標題    第 2 / 10 頁   [→]   |
+------------------------------------------+
|     +----------------------------+       |
|     |   A4 容器 (白底+陰影)      |       |
|     |   serif, justified, 1.8 行高|       |
|     |   padding: 48px            |       |
|     +----------------------------+       |
+------------------------------------------+
```

- `aspect-[210/297]`, `max-w-3xl`, `font-family: 'Noto Serif TC', serif`
- 鍵盤 ← → 翻頁，手機單頁捲動
- DOMPurify 清洗 HTML

### 書架 Grid

- 卡片封面 `aspect-[3/4]`，標題，頁數 badge
- hover: `translateY(-5px)` + 陰影

---

## 實作順序

### Phase 1：後端
1. Models → 2. AutoMigrate → 3. DTOs → 4-5. Repositories → 6. Service → 7. Handler → 8. Routes
9. `make lint && make test && make build`

### Phase 2：前端 API 層
10. Types → 11. API client → 12. Hooks → 13. i18n

### Phase 3：編輯端 UI
14. HandbookCard → 15. EditorPage → 16. PageSidebar → 17. PageEditorPage → 18. Routes

### Phase 4：閱讀端 UI
19. Bookshelf → 20. Reader → 21. ReaderPage → 22. EventDetailPage tab

### Phase 5：驗證
23. `npm run build && npm run lint` + `make lint && make test && make build`

---

## 參考檔案

| 檔案 | 用途 |
|------|------|
| `backend-go/internal/handler/event_i18n_handler.go` | Handler + 權限模式 |
| `backend-go/internal/service/event_i18n_service.go` | Service 層模式 |
| `backend-go/internal/repository/event_i18n_repository.go` | Repository 模式 |
| `backend-go/cmd/server/main.go` | Route 註冊 |
| `official_website/src/components/ui/rich-text-editor.tsx` | TipTap 編輯器 |
| `official_website/src/components/image-upload.tsx` | 圖片上傳 |
| `official_website/src/pages/EventDetailPage.tsx` | Radix Tabs |
| `official_website/src/lib/api/eventI18n.ts` | API client 模式 |

---

## 備註

- **不會修改 event_i18n**：event_i18n 只是作為參考模式，所有 handbook 檔案都是全新建立
- **資料表已確定**：使用 2 張表（`event_handbook` + `event_handbook_page`），JSON 陣列封面，MEDIUMTEXT 頁面內容
- **資料表已建立**：手動在 `future_sign_stage` 和 `future_sign_prod` 建立，未使用 AutoMigrate

---

## 追加功能（Phase 6）

### 6.1 Tab 深連結（URL Hash）

**需求**：EventDetailPage 的每個 tab 要有超連結，分享出去可直接跳到對應 tab

**實作**：
- Radix Tabs 從 `defaultValue` 改為 controlled mode（`value` + `onValueChange`）
- 切 tab 時用 `window.history.replaceState` 更新 URL hash（如 `#handbook`）
- 頁面載入時讀取 `window.location.hash` 設定初始 tab
- 分享按鈕自動帶上當前 tab hash

**影響檔案**：
- `src/pages/EventDetailPage.tsx` — 修改

**分享範例**：
- `https://futuresign.com/event/xxx#info` → 活動資訊 tab
- `https://futuresign.com/event/xxx#booth` → 攤位商品 tab
- `https://futuresign.com/event/xxx#handbook` → 活動手冊 tab

---

### 6.2 手冊編輯頁顯示活動名稱

**需求**：主辦方管理多個活動時，需要在手冊編輯頁看到目前編輯的是哪個活動

**實作**：
- 在 `EventHandbookEditorPage` 和 `EventHandbookPageEditorPage` 加入 `useEvent(eventId)` hook
- 頂部標題下方顯示活動名稱（灰色小字）

**影響檔案**：
- `src/pages/EventHandbookEditorPage.tsx` — 修改
- `src/pages/EventHandbookPageEditorPage.tsx` — 修改

---

### 6.3 手冊封面預設漸層色

**需求**：主辦方沒上傳封面圖時，卡片空白不好看

**實作**：
- 定義 8 組漸層色陣列（米色/琥珀/橘黃系柔和色調）
- 無封面圖時根據手冊 index 取模選色，顯示漸層背景 + 手冊標題
- 同時更新管理頁和消費者端的卡片渲染
- 封面比例使用 1:1 正方形（`aspect-square`）

**漸層色**（最終版 — 米色系）：
```
from-amber-100 to-amber-200
from-orange-100 to-amber-200
from-yellow-100 to-amber-200
from-amber-100 to-yellow-200
from-orange-100 to-yellow-200
from-yellow-100 to-orange-200
from-amber-200 to-orange-100
from-yellow-200 to-amber-100
```

**影響檔案**：
- `src/pages/EventHandbookEditorPage.tsx` — 修改
- `src/pages/EventDetailPage.tsx` — 修改

---

---

## 追加功能（Phase 7）— 刪除日誌 + UI 細節 + 安全機制

### 7.1 刪除操作日誌（Logger）

**需求**：硬刪除和軟刪除的操作要有 logger 記錄，方便後台追蹤

**實作**：
- **Service 層**：在 `DeleteHandbook` 和 `DeletePage` 執行前用 `logger.Warn` 記錄目標物件資訊
  - 手冊刪除記錄：handbook_id, title, event_id, status, pages_deleted
  - 頁面刪除記錄：page_id, title, handbook_id, sort_order
- **Handler 層**：在刪除成功後用 `logger.Warn` 記錄操作者資訊
  - 操作者用 `auth.GetMemberID()` 或 `auth.GetUserID()` 取得
  - 用 `auth.HasUser()` 判斷操作者類型（member/user）

**影響檔案**：
- `internal/handler/event_handbook_handler.go` — 修改
- `internal/service/event_handbook_service.go` — 修改

---

### 7.2 手冊刪除連帶軟刪除內頁

**需求**：軟刪除手冊時，其下所有頁面也應標記為軟刪除，避免孤兒頁面

**實作**：
- `EventHandbookPageRepository` 新增 `SoftDeleteByHandbookID(ctx, handbookID)` 方法
  - 條件：`handbook_id = ? AND deleted_at IS NULL`
  - 返回 `(int64, error)` — 受影響行數
- `DeleteHandbook` service 在刪除手冊前先呼叫 `SoftDeleteByHandbookID`
- Logger 記錄連帶刪除的頁面數量（`pages_deleted`）

**影響檔案**：
- `internal/repository/event_handbook_page_repository.go` — 修改（新增介面方法 + 實作）
- `internal/service/event_handbook_service.go` — 修改（DeleteHandbook 增加連帶刪除）

---

### 7.3 手冊卡片 UI 調整

**需求**：
1. 封面比例改為 1:1（正方形）而非 3:4 縱向
2. 卡片顏色改為米色系（不要灰階也不要花花綠綠）
3. 卡片右下角顯示最後更新日期

**實作**：

封面比例：
- `aspect-[3/4]` → `aspect-square`（管理頁和消費者頁都改）

米色漸層色（取代 Phase 6.3 的藍綠橘紫）：
```
from-amber-100 to-amber-200
from-orange-100 to-amber-200
from-yellow-100 to-amber-200
from-amber-100 to-yellow-200
from-orange-100 to-yellow-200
from-yellow-100 to-orange-200
from-amber-200 to-orange-100
from-yellow-200 to-amber-100
```
- 文字色：`text-amber-700/50`（圖示）、`text-amber-800/70`（標題）

最後更新日期：
- 使用 `format(new Date(handbook.updated_at), 'yyyy/MM/dd')` (date-fns)
- 顯示在卡片底部右側，頁數左側

**影響檔案**：
- `src/pages/EventHandbookEditorPage.tsx` — 修改
- `src/pages/EventDetailPage.tsx` — 修改

---

### 7.4 圖片上傳後防丟失機制

**需求**：圖片上傳到 S3 後 toast 顯示成功，但實際 HTML 內容要等 2 秒 debounce 才會 PATCH 到後端。如果使用者在 2 秒內離開頁面，圖片可能沒存到。

**完整上傳流程**：
1. 使用者選擇圖片 → `POST /api/v1/images/upload-image/` 上傳到 S3
2. S3 回傳 URL → TipTap `setImage({ src: url })` 插入 `<img>` 到編輯器
3. `toast.success('圖片上傳成功')` ← 此時只代表 S3 上傳成功
4. TipTap `onUpdate` → `handleContentChange` 觸發 2 秒 debounce
5. 2 秒後 → `PATCH /events/:id/handbooks/:hid/pages/:pid` 儲存含 `<img>` 的 HTML

**風險**：步驟 3～5 之間（約 2 秒）如果離開頁面，PATCH 還沒發出，圖片 S3 上有但 DB 中沒有。

**解決方案**：
1. **Toast 提醒**：圖片/檔案上傳成功後，toast 改為「圖片上傳成功 — 請稍待 2 秒讓系統自動儲存，再離開或切換頁面」，duration 延長至 5 秒
2. **beforeunload 事件**：編輯頁加 `window.addEventListener('beforeunload')` 監聽，當 `debounceRef.current` 存在（有待儲存的 timeout）時，觸發瀏覽器原生「是否離開」確認對話框

**影響檔案**：
- `src/components/ui/rich-text-editor.tsx` — 修改（toast 訊息 + duration）
- `src/pages/EventHandbookPageEditorPage.tsx` — 修改（beforeunload 事件）

---

---

## 追加功能（Phase 8）— PDF 下載 + 頁面更新日誌

### 前因後果

**情境**：手冊系統用 HTML 呈現活動資訊（如入場時間、場地規範等），但主辦方隨時可以更改內容。假設手冊原寫「2026/02/14 入場」，主辦後來改成「2026/02/15」，消費者或品牌商若沒有留底，雙方認知不同時無法舉證。

**設計決策**：
- **PDF 下載功能**：讓任何人（消費者、品牌商、主辦方）都能下載手冊的 PDF 版本作為留底
- **Footer 浮水印**：PDF 每頁底部印上活動名稱 + 活動連結（類似正式文件的 footer），由主辦方決定是否啟用
- **更新日誌（Audit Trail）**：後端 logger 記錄每次頁面更新的前後內容對比，供系統方稽查

**立場考量**：
我們同時是系統方與主辦方（裁判兼場地），天生偏向主辦方立場。但若站在消費者或品牌商角度，提供 PDF 下載是合理的權利保障。一般市面上的活動系統也只做到 PDF 功能，主辦方可以隨時更新手冊內容（如同替換 PDF），消費者若沒有自行下載留底，則屬自身權利義務疏失，不構成對主辦或系統的抗議基礎。

**結論**：做到 PDF 下載 + 更新日誌即為足夠的權責設計。

---

### 8.1 資料庫欄位：`allowed_footer_event_name`

新增 `event_handbook.allowed_footer_event_name` (TINYINT, default 0)

主辦方可在手冊設定面板中開關此選項。開啟時，使用者下載 PDF 會帶有活動名稱 footer。

```sql
ALTER TABLE event_handbook ADD COLUMN allowed_footer_event_name TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
```

---

### 8.2 PDF 下載功能

**技術方案**：前端使用 `html2pdf.js`（封裝 html2canvas + jsPDF）

**下載流程**：
1. 使用者在活動頁卡片右上角點擊下載 icon
2. 前端呼叫 `GET /events/:id/handbooks/:hid/full` 取得所有頁面 HTML
3. 建立隱藏 DOM 容器，渲染所有頁面 + footer
4. `html2pdf.js` 轉換為 PDF 並觸發下載
5. 清理 DOM

**PDF Footer 格式**（每頁底部，居中灰色小字）：
```
─────────────────────────
活動名稱 | https://futuresign.com/event/xxx
```

**下載按鈕位置**：EventDetailPage 手冊卡片右上角，`<Download>` icon，白色圓形背景

---

### 8.3 頁面更新日誌（Update Logger）

**需求**：後端 Service 層的 `UpdatePage` 方法需記錄更新前後的 title 和 content

**日誌格式**：
```
logger.Info("更新手冊頁面",
    "page_id", id,
    "handbook_id", page.HandbookID,
    "previous_title", prevTitle,
    "current_title", page.Title,
    "previous_content_length", prevContentLen,
    "current_content_length", len(page.Content),
    "previous_content_preview", prevContent[:200],
    "current_content_preview", page.Content[:200],
)
```

注意：content 可能很長（HTML），logger 只記錄前 200 字元的 preview + 完整長度數字，避免 log 過大。

---

### 8.4 卡片 UI 修正

**EventDetailPage 手冊卡片**：
- 右上角：PDF 下載 icon（點擊下載，下載中顯示 spinner）
- 右下角：「更新時間：yyyy/MM/dd」（加上 "更新時間：" label 前綴）

---

### 8.5 影響檔案

**後端 Go**：
| 檔案 | 變更 |
|------|------|
| `internal/models/event_handbook.go` | 加 `AllowedFooterEventName` 欄位 |
| `internal/dto/event_handbook.go` | 加 Create/Update Request + Response 欄位 |
| `internal/service/event_handbook_service.go` | 處理新欄位 + UpdatePage logger |

**前端 TypeScript**：
| 檔案 | 變更 |
|------|------|
| `src/lib/api/types.ts` | Handbook + UpdateHandbookRequest 加欄位 |
| `src/types/html2pdf.d.ts` | 新增型別宣告 |
| `src/lib/utils/generateHandbookPdf.ts` | 新增 PDF 產生工具 |
| `src/pages/EventDetailPage.tsx` | 卡片下載 icon + 更新時間 label |
| `src/pages/EventHandbookPageEditorPage.tsx` | 設定面板 footer toggle |

---

## 完成狀態

| Phase | 說明 | 狀態 |
|-------|------|------|
| Phase 1 | 後端 Go API（9 個檔案） | ✅ 完成 |
| Phase 2 | 前端 API 層（3 個檔案） | ✅ 完成 |
| Phase 3 | 前端頁面改接 API（4 個檔案） | ✅ 完成 |
| Phase 4 | 模板系統 + 設定面板 | ✅ 完成 |
| Phase 5 | API 測試（11 個端點全部通過） | ✅ 完成 |
| Phase 6.1 | Tab 深連結 | ✅ 完成 |
| Phase 6.2 | 編輯頁顯示活動名稱 | ✅ 完成 |
| Phase 6.3 | 封面預設漸層色 | ✅ 完成（後續 7.3 改為米色） |
| Phase 7.1 | 刪除操作日誌 | ✅ 完成 |
| Phase 7.2 | 手冊刪除連帶軟刪除內頁 | ✅ 完成 |
| Phase 7.3 | 卡片 UI 調整（比例+色系+日期） | ✅ 完成 |
| Phase 7.4 | 圖片上傳防丟失提醒 + beforeunload | ✅ 完成 |
| Phase 8.1 | `allowed_footer_event_name` 欄位（Model + DTO + Service） | ✅ 完成 |
| Phase 8.2 | PDF 下載功能（html2pdf.js + generateHandbookPdf.ts） | ✅ 完成 |
| Phase 8.3 | 頁面更新日誌（UpdatePage audit trail — previous vs current） | ✅ 完成 |
| Phase 8.4 | 卡片 UI 修正（Download icon + 「更新時間：」label） | ✅ 完成 |
| Phase 8.5 | 設定面板 footer toggle（EventHandbookPageEditorPage） | ✅ 完成 |
| Phase 9 | 攤位平面圖格式支援（待規劃） | ⬜ 待實作 |

### PR
- Backend: https://github.com/yutuo-tech/futuresign_backend/pull/333 (已 merge → stage)
- Frontend (main): https://github.com/yutuo-tech/future_sign.official-website/pull/83 (已 merge)
- Frontend (main → stage): https://github.com/yutuo-tech/future_sign.official-website/pull/85

---

## Phase 8 實作紀錄（2026-03-02 完成）

### 實際修改檔案

**後端 Go（3 個檔案）**：
| 檔案 | 變更 |
|------|------|
| `internal/models/event_handbook.go` | +1 欄位：`AllowedFooterEventName bool` |
| `internal/dto/event_handbook.go` | CreateRequest、UpdateRequest（`*bool`）、HandbookResponse、HandbookFullResponse（`bool`）各加 1 欄位 |
| `internal/service/event_handbook_service.go` | CreateHandbook/UpdateHandbook 處理新欄位、buildHandbookResponse/GetHandbookWithPages 加入回應、UpdatePage 加 audit logger（prev vs current title + content preview 200 chars） |

**前端 TypeScript（5 個檔案 + 1 新安裝）**：
| 檔案 | 變更 |
|------|------|
| `src/lib/api/types.ts` | `Handbook` + `UpdateHandbookRequest` 加 `allowed_footer_event_name` |
| `package.json` | `npm install html2pdf.js`（984KB chunk） |
| `src/lib/utils/generateHandbookPdf.ts` | **新增**：建隱藏 DOM → 渲染頁面 + 可選 footer → html2pdf.js 轉 PDF → 清理 DOM |
| `src/pages/EventDetailPage.tsx` | 卡片加 Download icon（右上角白色圓形）、下載中 Loader2 spinner、「更新時間：」label |
| `src/pages/EventHandbookPageEditorPage.tsx` | 設定面板加 toggle switch（「PDF 活動名稱 Footer」），位於「發布狀態」和「危險操作」之間 |

**Build 驗證**：
- `go build ./cmd/server/` ✅
- `npm run build` ✅

**待手動執行**：
```sql
ALTER TABLE event_handbook ADD COLUMN allowed_footer_event_name TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
-- staging + prod 各執行一次
```

---

---

## 追加規劃（Phase 9）— 攤位平面圖格式支援

### 需求

設計師製作的攤位平面圖（booth floor plan）需要嵌入手冊頁面中。需確認：
1. 設計師常用的出圖格式
2. 哪些格式能與 TipTap 編輯器良好融合
3. S3 上傳注意事項

### 設計師常用格式

| 格式 | 工具來源 | 說明 |
|------|---------|------|
| **DWG / DXF** | AutoCAD, Vectorworks | 業界標準 CAD 圖，場地和施工廠商常要求 |
| **AI** | Adobe Illustrator | 設計師做品牌化 2D 平面圖時常用 |
| **SKP** | SketchUp | 亞洲市場流行的快速建模工具 |
| **MAX / 3DS** | 3ds Max | 3D 效果圖渲染用，不適合直接給網頁 |
| **PDF** | 通用交付 | 最常見的交付格式，保留向量品質 |
| **SVG** | Web 向量 | 可縮放、輕量、瀏覽器原生支援 |
| **PNG** | 點陣圖 | 最常見的圖片交付格式 |

### TipTap 相容性

TipTap 的 Image extension 渲染為標準 `<img>` tag，支援**瀏覽器能渲染的所有圖片格式**：

| 格式 | TipTap 可用？ | 說明 |
|------|:---:|------|
| **PNG** | ✅ | 最安全的選擇，所有瀏覽器支援 |
| **JPG** | ✅ | 支援，但有損壓縮不適合線條圖（會有鋸齒） |
| **SVG** | ✅ | **最推薦**，縮放不失真，檔案小（50KB-500KB） |
| **WebP** | ✅ | 現代瀏覽器支援，壓縮率好 |
| **PDF** | ❌ | 無法嵌入 `<img>`，需先轉為 PNG/SVG |
| **DWG / DXF** | ❌ | 瀏覽器無法渲染，需先轉檔 |
| **AI** | ❌ | 瀏覽器無法渲染，需先轉檔 |
| **MAX / 3DS** | ❌ | 瀏覽器無法渲染，需先轉檔 |

### 結論：要求設計師的出圖格式

> **請設計師匯出 SVG（首選）或高解析度 PNG（至少 2000px 寬）。**
> 如果設計師用 AutoCAD / Illustrator / 3ds Max 工作，請他們「匯出」而非直接給原始檔。

### S3 上傳注意事項

| 項目 | 說明 |
|------|------|
| **SVG 的 Content-Type** | 必須明確設定 `image/svg+xml`，否則 S3 預設 `application/octet-stream` 會導致瀏覽器下載而非顯示 |
| **SVG 安全性（XSS）** | SVG 可包含 `<script>` 和 `onload` 等 JS，**上傳時需清洗**（移除腳本和事件處理器），或用 DOMPurify 處理 |
| **PNG 檔案大小** | 高解析平面圖約 500KB-5MB，S3 單次上傳即可 |
| **檔名** | 用 UUID 取代使用者檔名（現有 S3 上傳已這樣做） |
| **快取** | 平面圖上傳後不常變動，可設 `Cache-Control: public, max-age=86400` |

### 9.1 Checklist

- [ ] 確認現有圖片上傳 API（`/images/upload-image/`）支援 SVG 的 Content-Type
- [ ] 確認 SVG 上傳時有做安全清洗（DOMPurify 或後端過濾）
- [ ] TipTap Image extension 的 `accept` 屬性加入 `image/svg+xml`
- [ ] 準備設計師交付指南文件（要求 SVG 或 PNG ≥ 2000px）
- [ ] 測試 SVG 在 TipTap 中的顯示（縮放、對齊）
- [ ] 測試 SVG 在 PDF 下載中的呈現（html2pdf.js + html2canvas 對 SVG 的支援）

---

### 不支援直接上傳的格式

以下格式**無法直接用於網頁**，必須由設計師先行轉檔：

| 格式 | 原因 | 建議 |
|------|------|------|
| `.dwg` / `.dxf` | CAD 專用格式，瀏覽器無法渲染 | 請設計師用 AutoCAD 匯出 SVG 或 PNG |
| `.ai` | Illustrator 原始檔，瀏覽器無法渲染 | 請設計師用 Illustrator 匯出 SVG |
| `.max` / `.3ds` | 3ds Max 專案檔，瀏覽器無法渲染 | 請設計師渲染後匯出 PNG |
| `.skp` | SketchUp 專案檔 | 請設計師匯出 PNG |
