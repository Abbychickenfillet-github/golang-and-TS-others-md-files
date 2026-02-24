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
