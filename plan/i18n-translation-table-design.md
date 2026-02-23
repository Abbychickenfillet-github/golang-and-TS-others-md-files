# 多語系資料庫設計：為什麼要用獨立翻譯表？

> 需求背景：Jessie 提出活動介紹需要提供雙語（中/英），需決定資料庫設計方式。

---

## 兩種做法比較

### 方案 A：直接在原表加欄位（Column-per-Language）

```
event
├── name           -- 活動名稱（中文）
├── name_en        -- 活動名稱（英文）
├── description
├── description_en
├── short_description
├── short_description_en
└── ...其他欄位
```

| 優點 | 缺點 |
|------|------|
| 實作最快，不需 JOIN | 每新增一種語言就要 ALTER TABLE 改 schema |
| 查詢簡單直接 | 欄位數量隨語言數 × 可翻譯欄位數膨脹 |
| | 需要修改所有相關的應用程式查詢 |
| | 違反資料庫正規化原則 |

### 方案 B：獨立翻譯表（Separate Translation Table）✅ 推薦

```
event（只存語言無關的資料）
├── id
├── start_at
├── end_at
├── max_attendees
├── is_free
└── ...

event_translation（存語言相關的文字）
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
| `event` | `event_translation` | name, description, short_description |
| `ticket`（票券） | `ticket_translation` | name, description（視欄位而定） |

---

## 結論

**加欄位**適合 prototype 或確定永遠只有兩種語言的情境。
**翻譯表**是業界公認的長期維護最佳實踐，所有主流技術文獻都推薦這個做法。

FutureSign 作為要長期經營的產品，採用翻譯表是正確的方向。
