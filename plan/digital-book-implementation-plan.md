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
- **資料表方案待定**：可考慮用 1 張表（pages 存 JSON）或 2 張表（原計畫），視需求而定
