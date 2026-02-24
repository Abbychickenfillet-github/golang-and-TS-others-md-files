# Event I18n 架構大重構計畫

## 核心改動

**從「中文是預設，翻譯是附加」改為「所有語系平等，統一存 event_i18n」**

### 現況架構
```
Step 1: 填活動資訊（中文）→ 存入 event.name / event.description / event.short_description
Step 2: 其他活動設定
Step 3: 新增翻譯 → 存入 event_i18n（只有非中文語系）

查詢邏輯：
  無 locale   → 讀 event 表原文（假設中文）
  locale=zh-TW → 讀 event 表原文
  locale=en    → 查 event_i18n → 沒有就 fallback event 表
```

### 問題
1. **假設所有主辦方都是中文母語** — 英文母語的品牌商也被迫先填中文
2. **原文散落兩處** — 中文在 event 表，其他語系在 event_i18n，查詢邏輯不一致
3. **Step 3 才處理翻譯太晚** — 語系選擇應該在填寫內容時就決定

### 新架構
```
Step 1: 先選語系（下拉選單）→ 填活動資訊 → 存入 event_i18n（含 zh-tw）
Step 2: 其他活動設定
（翻譯管理可在活動建立後隨時新增其他語系）

查詢邏輯：
  無 locale   → 讀 event 表欄位（default fallback）
  有 locale   → 查 event_i18n(exact match) → 沒有就 fallback event 表
```

---

## 支援的語系

| locale 代碼 | 語言 | 備註 |
|-------------|------|------|
| `zh-tw` | 繁體中文 | 不再是「預設」，和其他語系平等 |
| `zh` | 中文（通用） | fallback 用 |
| `en-us` | 美式英文 | |
| `en-gb` | 英式英文 | |
| `en` | 英文（通用） | |
| `ja` | 日文 | 未來擴充 |

> 所有 locale 存入資料庫時一律小寫（遵循 CLAUDE.md 規範）

---

## Fallback 邏輯

```
請求帶 locale 參數：
  查 event_i18n WHERE event_id = ? AND locale = ?（精確匹配）
  → 找到 → 回傳翻譯內容
  → 找不到 → fallback 到 event 表的 name/description/short_description

請求無 locale 參數：
  → 直接讀 event 表（向下相容）
```

**不做語系族群 fallback**（`en-us` 找不到不會自動查 `en`），保持邏輯簡單。
如果未來需要，可以在 service 層加一層 `normalizeLocale()` 做族群 fallback。

---

## 後端改動

### 1. Event Model — 保留欄位作為 default fallback
**檔案**: `internal/models/event.go`
```go
// event.Name / event.Description / event.ShortDescription 保留
// 角色從「原文」變為「default fallback」
// 不刪欄位，確保向下相容
```

### 2. Event Model — 新增 default_locale 欄位（可選）
**檔案**: `internal/models/event.go`
```go
DefaultLocale string `gorm:"type:varchar(10);not null;default:'zh-tw';comment:活動預設語系" json:"default_locale"`
```
- 記錄這個活動最初是用什麼語言建立的
- 消費者端可以用來決定預設顯示語系

### 3. Handler — locale fallback 邏輯改動
**檔案**: `internal/handler/event_handler.go`

現在（第 333-346 行）：
```go
// 舊：zh-TW 跳過查 i18n
if locale != "" && locale != "zh-TW" && locale != "zh-tw" && h.i18nService != nil {
```

改成：
```go
// 新：所有 locale 都查 event_i18n（含 zh-tw）
if locale != "" && h.i18nService != nil {
    translation, err := h.i18nService.GetTranslationByEventAndLocale(ctx, eventID, locale)
    if err != nil {
        logger.Warn("查詢活動翻譯失敗，使用 default fallback", "error", err, "event_id", eventID, "locale", locale)
    }
    if translation != nil {
        eventPublic.Name = translation.Name
        eventPublic.Description = translation.Description
        eventPublic.ShortDescription = translation.ShortDescription
        eventPublic.Locale = &locale
    }
    // translation == nil → 保持 event 表原文（default fallback）
}
```

### 4. Service — 建立活動時同步建立 i18n 記錄
**檔案**: `internal/service/event_service.go`

CreateEvent 流程加入：
```go
func (s *eventService) CreateEvent(req *dto.EventCreate) (*models.Event, error) {
    // 1. 建立 event（name/desc/short_desc 仍寫入 event 表當 fallback）
    event := &models.Event{...}
    if err := s.eventRepo.Create(event); err != nil {
        return nil, err
    }

    // 2. 同步建立 event_i18n 記錄
    locale := req.Locale  // 前端傳來的語系選擇
    if locale == "" {
        locale = "zh-tw"  // default
    }
    i18n := &models.EventI18n{
        EventID:          event.ID,
        Locale:           strings.ToLower(locale),
        Name:             event.Name,
        Description:      event.Description,
        ShortDescription: event.ShortDescription,
    }
    if err := s.i18nRepo.Create(ctx, i18n); err != nil {
        logger.Warn("建立預設語系翻譯失敗", "error", err)
    }

    return event, nil
}
```

### 5. DTO — CreateEvent 加入 locale 欄位
**檔案**: `internal/dto/event.go`
```go
type EventCreate struct {
    // ... 現有欄位
    Locale string `json:"locale" binding:"omitempty"` // 活動建立時的語系（預設 zh-tw）
}
```

### 6. 資料遷移 — 現有活動補建 zh-tw 記錄
```sql
-- 為所有還沒有 zh-tw 翻譯的活動建立 i18n 記錄
INSERT INTO event_i18n (id, event_id, locale, name, description, short_description, created_at, updated_at)
SELECT
    UUID(), e.id, 'zh-tw', e.name, e.description, e.short_description, NOW(), NOW()
FROM event e
WHERE NOT EXISTS (
    SELECT 1 FROM event_i18n ei
    WHERE ei.event_id = e.id AND ei.locale = 'zh-tw'
);
```

---

## 前端改動

### Official Website（前台）

#### 1. EventsCreateBasicPage — Step 1 加入語系選擇
**檔案**: `src/pages/EventsCreateBasicPage.tsx`

Step 1 最上方加入語系下拉選單：
```tsx
<FormControl isRequired>
  <FormLabel>活動資訊語系</FormLabel>
  <Select {...register('locale')} defaultValue="zh-tw">
    <option value="zh-tw">繁體中文</option>
    <option value="en-us">English (US)</option>
    <option value="en-gb">English (UK)</option>
    <option value="ja">日本語</option>
  </Select>
  <FormHelperText>選擇此活動的主要語言，建立後可新增其他語系翻譯</FormHelperText>
</FormControl>
```

#### 2. Step 3 翻譯管理 — 移除或改為「新增其他語系」
原本 Step 3 是翻譯區塊，現在 Step 1 已經選了語系：
- Step 3 改為「新增其他語系翻譯」（可選）
- 或將翻譯管理移到活動建立後的編輯頁面

#### 3. EventDetailPage — 消費者端帶 locale 查詢
**檔案**: `src/pages/EventDetailPage.tsx`

```tsx
// 根據 i18next 當前語系帶 locale 參數
const { i18n } = useTranslation()
const locale = i18n.language // 'zh-TW' | 'en'
const { data: event } = useQuery({
    queryKey: ['event', eventId, locale],
    queryFn: () => eventsApi.getEvent(eventId, locale.toLowerCase()),
})
```

### Dashboard（後台）

#### EventTranslations 元件
- 顯示所有語系翻譯列表（含 zh-tw）
- 可新增/編輯/刪除任何語系

---

## 修改檔案清單

### 後端
| 檔案 | 修改 |
|------|------|
| `internal/models/event.go` | 新增 `DefaultLocale` 欄位 |
| `internal/models/event_i18n.go` | 移除 `DeletedAt`（搭配 hard delete 計畫） |
| `internal/dto/event.go` | `EventCreate` 加入 `Locale` 欄位 |
| `internal/handler/event_handler.go` | 移除 `locale != "zh-TW"` 判斷，所有 locale 都查 i18n |
| `internal/service/event_service.go` | `CreateEvent` 同步建立 event_i18n 記錄 |
| `internal/repository/event_i18n_repository.go` | Delete 改 hard delete（搭配 hard delete 計畫） |

### 前端 — Official Website
| 檔案 | 修改 |
|------|------|
| `src/pages/EventsCreateBasicPage.tsx` | Step 1 加語系下拉選單，提交時帶 locale |
| `src/pages/EventDetailPage.tsx` | 消費者端帶 locale query param |
| `src/lib/api/events.ts` | getEvent API 加 locale 參數 |

### 前端 — Dashboard
| 檔案 | 修改 |
|------|------|
| `src/routes/_layout/events.tsx` | EventTranslations 顯示含 zh-tw 的所有語系 |

### 資料庫
| 動作 | SQL |
|------|-----|
| 為現有活動補建 zh-tw 翻譯 | `INSERT INTO event_i18n SELECT ... FROM event WHERE NOT EXISTS ...` |
| 新增 default_locale 欄位 | `ALTER TABLE event ADD COLUMN default_locale VARCHAR(10) NOT NULL DEFAULT 'zh-tw'` |
| 清理軟刪除記錄 | `DELETE FROM event_i18n WHERE deleted_at IS NOT NULL` |
| 移除 deleted_at 欄位 | `ALTER TABLE event_i18n DROP COLUMN deleted_at` |

---

## 向下相容考量

1. **event 表的 name/description/short_description 不刪除** — 作為 default fallback
2. **無 locale 參數的 API 請求** — 行為不變，直接讀 event 表
3. **現有的 event_i18n 記錄** — 不受影響，繼續正常運作
4. **資料遷移可分階段** — 先改 handler 邏輯 → 再補建 zh-tw 記錄 → 最後改前端 Step 1

---

## 是否需要強制填寫 zh-TW？

### 結論：不強制，但建議引導

採用 **Drupal / Payload CMS 的彈性模式**：系統有 default locale（`zh-tw`），但允許用任何語系建立活動。`event` 表的 `name/description/short_description` 作為 ultimate fallback。

### 業界做法比較

| 平台 | 需要 default locale | 必須先建 default 語系內容 | 可改 default |
|------|-------------------|-------------------------|-------------|
| **WPML (WordPress)** | 是 | 是（匯入必須先匯 default） | 是（有風險） |
| **Contentstack** | 是（master language） | 是（其他語系繼承 master） | **不可（永久）** |
| **Strapi** | 是 | 否（API 可直接建任何 locale） | 是 |
| **Contentful** | 是 | 技術上是（但欄位可設為空） | 否 |
| **Drupal** | 是（site default） | **否（可用任何語言建立）** | 是（有風險） |
| **Payload CMS** | 是 | **否** | 是 |

### 三種策略分析

#### 策略 A：強制必填 zh-TW（WPML / Contentstack 模式）

```
建立活動 → 必須先填 zh-TW → 之後才能新增 en-US、en-GB 等翻譯
```

**優點**：
- 每個活動保證有中文版，消費者端 fallback 永遠有內容
- 翻譯人員有明確的參考基準（canonical version）
- 資料模型簡單，不需要處理「完全沒有任何語系內容」的情況

**缺點**：
- 英文母語品牌商被迫先寫中文 → 內容品質低（可能是機翻或 placeholder）
- 區域團隊不能獨立作業，要等中文版完成
- 不符合「所有語系平等」的設計理念

#### 策略 B：不強制，任何語系都可先建（Drupal / Payload 模式）✅ 建議

```
建立活動 → 選擇語系（預設 zh-tw）→ 填寫內容 → 存入 event_i18n
                                              → 同步寫入 event 表當 fallback
```

**優點**：
- 品牌商可以用母語直接建立活動
- 區域團隊獨立作業，不需要等其他語系
- event 表仍有 fallback 內容（用建立時的語系內容填入）

**缺點**：
- 非 zh-tw 活動的 fallback 內容是英文（或其他語系），消費者端可能看到混合語言
- 需要在 UI 上明確標示「此活動尚無中文版」

#### 策略 C：混合 — 不強制但建議（Contentful 模式）

```
建立活動 → 選擇語系 → 填寫內容
                    → 如果不是 zh-tw，顯示提示：「建議也新增繁體中文版本」
                    → 但不阻擋提交
```

**優點**：兼顧彈性和引導
**缺點**：多一步 UI 提示設計

### 我們的選擇：策略 B + 提示

1. **不強制** — 允許任何語系建立活動
2. **event 表永遠有 fallback** — 建立時的內容同步寫入 event.name/description/short_description
3. **UI 引導** — 活動管理頁面如果缺少 zh-tw 翻譯，顯示提示標籤
4. **default_locale 欄位** — 記錄活動最初建立時使用的語系

### 文獻依據

**W3C Internationalization**
> W3C 標準關注的是語言宣告（`lang` attribute），不規定內容建立順序。不同語言的內容應在最高結構層級分離。
> — [W3C Internationalization Techniques](https://www.w3.org/International/techniques/authoring-html)

**Unicode CLDR — Locale 繼承模型**
> CLDR 定義了基於截斷的 fallback chain：Language + Script + Country → Language + Script → Language → Default locale。模型假設存在一個 root/default locale，但這是資料查找機制，不是內容建立的限制。
> — [Unicode Technical Report #35](https://unicode-org.github.io/cldr/ldml/tr35.html)

**Microsoft Globalization**
> "No system for implementing fallback is perfect. If you speak Arabic but an application is not available in Arabic, the system might offer English or French instead — but you might not know either."
> — [Microsoft Learn: Locale Fallback](https://learn.microsoft.com/en-us/globalization/locale/fallback)

**Drupal Content Translation**
> Drupal 允許以任何語言建立內容，"original language" 是內容最初建立時使用的語言，不必是系統預設語言。新增翻譯時可以從任何現有翻譯作為來源。
> — [Drupal Content Translation Overview](https://www.drupal.org/docs/8/core/modules/content-translation/overview)

**Payload CMS**
> "If a translation is missing for a specific field, Payload automatically falls back to the default language." 但不要求先建立 default locale 的內容。
> — [Payload CMS Localization](https://payloadcms.com/docs/configuration/localization)

**Contentful**
> Contentful 的 default locale 技術上必須先 publish，但欄位可以設為「Allow empty fields for this locale」。支援自訂 fallback chain（如 `de-CH` → `de-DE` → `en`）。
> — [Contentful Localization](https://www.contentful.com/developers/docs/tutorials/general/setting-locales/)

**Contentstack**
> "You cannot change the master language of a stack once it has been set." 其他語系繼承 master language 的資料直到被本地化。這是最嚴格的模式。
> — [Contentstack Master Language](https://www.contentstack.com/docs/developers/multilingual-content/set-the-master-language)

---

## 相關文件

| 文件 | 路徑 | 關聯 |
|------|------|------|
| I18n 翻譯表設計 | `plan/i18n-translation-table-design.md` | event_i18n 資料表原始設計 |
| Event I18n 刪除策略 | `plan/event-i18n-hard-delete.md` | hard delete vs soft delete 分析，本重構的前置決策 |
| 本文件 | `plan/event-i18n-architecture-refactor.md` | 架構大重構計畫，包含是否強制 zh-TW 的分析 |
