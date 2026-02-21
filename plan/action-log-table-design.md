# 操作紀錄表設計：合併 vs 拆分

## 背景

目前有 `order_log` 表記錄訂單操作（取消、退款審核、編輯）。
活動刪除請求也需要類似紀錄功能，問題是要怎麼設計。

---

## 方案一：合併成一張表

把 `order_log` 擴展成通用表（例如叫 `action_log`），用 `entity_type` + `entity_id` 取代 `order_id`。

**表名候選：**
- `action_log` — 操作紀錄，簡單直白
- `action_request` — 偏向「請求」語意，適合有審核流程的場景

**結構大概長這樣：**
```sql
id, entity_type, entity_id, action, status, reason,
operator_id, operator_type, reviewer_id, reviewer_type,
review_notes, reviewed_at, details(JSON), created_at, updated_at
```

**好處：**
- 只維護一張表、一套 repository/service
- 跨實體查詢容易（「列出所有待審核刪除請求」一句 SQL）
- 新增實體類型不用改 schema，加個 entity_type 值就好
- 後台可以做統一的「操作紀錄」頁面

**壞處：**
- `entity_id` 沒辦法加外鍵約束（指向不同表）
- 純紀錄型的資料會有一堆空的 status/reviewer 欄位
- 單表資料量大，要注意 index
- 欄位設計要取公約數，特殊需求得塞 JSON

---

## 方案二：每個實體各自一張 log 表

維持 `order_log`，另建 `event_log`、`booth_log`...

**好處：**
- 結構可以針對實體客製化
- 查詢不用加 `entity_type` 條件
- 可以加外鍵約束，資料庫層保證一致性
- 單表資料量分散

**壞處：**
- 每多一個實體就多一張表 + repository + service
- 跨實體查詢要 UNION
- 結構重複多，維護成本高

---

## 方案三：拆成兩張表（紀錄 vs 流程）

一張做純紀錄（`activity_log`），一張做審核流程（`action_request`）。

**`activity_log`** — 記錄已經發生的事（只 INSERT 不 UPDATE）
```sql
id, entity_type, entity_id, action, operator_id, reason, details(JSON), created_at
```

**`action_request`** — 管理正在進行的請求（有狀態流轉）
```sql
id, entity_type, entity_id, action_type, status, reason,
requested_by_id, requested_by_type, reviewed_by_id, reviewed_by_type,
review_notes, reviewed_at, created_at, updated_at
```

**好處：**
- 語意最清楚：log 就是 log，request 就是 request
- 各自有明確的讀寫模式（log 只寫不改，request 會更新狀態）

**壞處：**
- 兩張表要維護
- 有些操作可能兩邊都要寫（例如刪除核准後，request 更新狀態，同時 log 記一筆）

---

## 現有 `order_log` vs 活動刪除請求的差異

| | order_log（現有） | 活動刪除請求（新需求） |
|---|---|---|
| 用途 | 記錄已發生的操作 | 管理審核中的請求 |
| 狀態流轉 | 無 | pending → approved / rejected / cancelled |
| 是否 UPDATE | 不會 | 會（更新狀態） |
| 操作者追蹤 | 只有 operator_id | 分申請者和審核者 |
| 實體範圍 | 只有 order | 通用（event/order/booth） |
| 額外資料 | details JSON | review_notes |

---

## 個人傾向

方案一（合併）最實際。理由：
- 我們的 `order_log` 結構本來就很接近通用設計，只是名字綁死了 order
- 加上 `entity_type`、`entity_id`、`status`、`reviewer` 就能同時處理紀錄和審核
- 團隊小，少一張表就少一份維護
- 空欄位（純紀錄不需要 status）在 MySQL 裡幾乎不佔空間

如果覺得紀錄和審核混在一起不舒服，可以用方案三拆開。
方案二（每實體一張表）對我們的規模來說太重了。

---

## 參考文獻

1. **Martin Fowler — Audit Log Pattern**
   - "Any time something significant happens you write some record indicating what happened and when it happened."
   - Audit Log 優點是簡單，缺點是資料量大後查詢困難。建議 audit log 和核心業務邏輯保持鬆耦合。
   - https://martinfowler.com/eaaDev/AuditLog.html

2. **Redgate — Database Design for Audit Logging**
   - 比較了 Shadow Tables（每實體獨立）vs Generic Tables（統一表）兩種方式。
   - Shadow tables: "any change in the structure of the main table must be reflected in the corresponding shadow table, which makes it difficult to maintain."
   - Generic tables: "Minimal schema footprint—no need for multiple shadow tables. Flexible: can audit any table without adding new audit tables."
   - https://www.red-gate.com/blog/database-design-for-audit-logging

3. **Budibase — Workflow Management Database Design**
   - 建議 workflow 系統包含 Requests（請求）、States（狀態）、Transitions（流轉）、Actions（動作）。
   - Request 表作為 workflow 的核心，支援多對多的 stakeholder 關係。
   - https://budibase.com/blog/data/workflow-management-database-design/

4. **GeeksforGeeks — Database Design for Workflow Management Systems**
   - 強調職責分離："Workflow management stays isolated... Task execution is managed separately, enabling independent tracking."
   - https://www.geeksforgeeks.org/dbms/database-design-for-workflow-management-systems/

5. **Redgate — How to Keep Track of What the Users Do**
   - 區分 Traceability（追蹤資料變更）和 Auditability（追蹤使用者行為）。
   - 兩者同時做會造成重複紀錄，需要權衡。
   - https://www.red-gate.com/blog/database-design-how-to-keep-track-of-what-the-users-do/

6. **Patrick Karsh — Polymorphic Associations: Database Design Basics**
   - 關於 `entity_type` + `entity_id` 的多態關聯設計模式。
   - "Rather than creating multiple tables for each entity type, you consolidate them into a single table, keeping your schema clean."
   - 缺點：沒有資料庫層級的外鍵約束。
   - https://patrickkarsh.medium.com/polymorphic-associations-database-design-basics-17faf2eb313

7. **Microsoft Q&A — Best way to design centralize log table**
   - 社群建議使用 centralized log table，透過額外欄位區分類型。MVP 建議用 identity column 作 PK，datetime2(3) 記時間。
   - https://learn.microsoft.com/en-us/answers/questions/116029/sql-server-best-way-to-design-centralize-log-table

8. **DZone — Building SOLID Databases: Single Responsibility**
   - 資料庫設計也適用 SRP：每張表應該只代表一個概念。但 log 表的「概念」可以是「所有實體的操作紀錄」而非「某個實體的操作紀錄」。
   - https://dzone.com/articles/building-solid-databases-0
