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

## action_log 欄位設計（方案一展開）

### 完整欄位與說明

```sql
CREATE TABLE action_log (
  id           VARCHAR(36) PRIMARY KEY,  -- UUID 主鍵
  entity_type  VARCHAR(50) NOT NULL,     -- 這筆紀錄屬於哪種資料表（見下方說明）
  entity_id    VARCHAR(36) NOT NULL,     -- 對應那筆資料的 ID
  action       VARCHAR(50) NOT NULL,     -- 做了什麼操作
  status       VARCHAR(30) DEFAULT NULL, -- 狀態（純紀錄可以是 NULL，審核流程才需要）
  reason       TEXT,                     -- 為什麼做這個操作
  operator_id  VARCHAR(36),              -- 誰發起的（ID）
  operator_type VARCHAR(20),             -- 發起者是哪種身分（見下方說明）
  reviewer_id  VARCHAR(36),              -- 誰審核的（ID），純紀錄不需要
  reviewer_type VARCHAR(20),             -- 審核者是哪種身分
  review_notes TEXT,                     -- 審核備註
  reviewed_at  DATETIME,                 -- 審核時間
  details      JSON,                     -- 額外資訊（變更前後的值等等）
  created_at   DATETIME NOT NULL,
  updated_at   DATETIME
);
```

### 每個欄位的白話解釋

| 欄位 | 用途 | 舉例 |
|---|---|---|
| `entity_type` | 這筆 log 是關於「哪張表」的資料 | `'event'`, `'order'`, `'ticket'`, `'booth'` |
| `entity_id` | 那張表裡面「哪一筆」 | `'46f5ad59-5ce0-42fa-8963-71054edebe0e'`（某個活動的 ID） |
| `action` | 做了什麼事 | `'CANCEL'`, `'REFUND_REVIEW'`, `'EDIT'`, `'DELETE_REQUEST'`, `'APPROVE'` |
| `status` | 這件事的進度（有審核流程才需要） | `'pending'`（等審核）, `'approved'`, `'rejected'`, `'cancelled'`, 或 `NULL`（純紀錄不需要狀態） |
| `reason` | 為什麼要做這件事 | `'活動無法如期舉辦'`, `'買家要求退款'` |
| `operator_id` | 發起這個操作的人的 ID | 某個 member 或 user 的 UUID |
| `operator_type` | 發起者的身分是什麼。因為我們系統有兩種帳號體系（`member` = 前台會員，`user` = 後台管理員），同一個 `operator_id` 沒辦法知道要去 member 表還是 user 表查，所以需要這個欄位標記 | `'member'`（主辦方/攤販/消費者）, `'user'`（後台管理員） |
| `reviewer_id` | 審核者的 ID（例如管理員核准刪除請求） | 某個 user 的 UUID |
| `reviewer_type` | 審核者的身分（同 operator_type 的道理） | `'user'`（通常是管理員審核） |
| `review_notes` | 審核時留的備註 | `'已確認無訂單，核准刪除'` |
| `reviewed_at` | 什麼時候審核的 | `2025-02-21 14:30:00` |
| `details` | 放不進固定欄位的額外資訊，用 JSON 彈性存 | `{"old_amount": 1000, "new_amount": 800, "payment_status": "paid"}` |

---

## entity_type + entity_id vs 獨立外鍵欄位

關於「怎麼知道這筆 log 屬於哪筆資料」，有兩種做法：

### 做法 A：`entity_type` + `entity_id`（多態關聯）

```sql
entity_type  VARCHAR(50)  -- 'event', 'order', 'ticket'
entity_id    VARCHAR(36)  -- 那筆資料的 UUID
```

| 優點 | 缺點 |
|---|---|
| 新增實體類型不用改 schema | 無法加外鍵約束（DB 不知道 entity_id 指向哪張表） |
| 只要兩個欄位，結構乾淨 | 如果 event 被刪了，這邊的 entity_id 會變成孤兒資料 |
| 查詢：`WHERE entity_type = 'event' AND entity_id = ?` | 需要在程式碼裡自己維護資料一致性 |

用這種方式的知名案例：
- Laravel 的 Polymorphic Relations（`commentable_type` + `commentable_id`）
- Rails 的 Polymorphic Associations
- Django 的 ContentType framework

### 做法 B：每個實體一個獨立的外鍵欄位

```sql
order_id   VARCHAR(36) REFERENCES orders(id),    -- 訂單 FK
event_id   VARCHAR(36) REFERENCES events(id),    -- 活動 FK
ticket_id  VARCHAR(36) REFERENCES tickets(id),   -- 票券 FK
booth_id   VARCHAR(36) REFERENCES booths(id),    -- 攤位 FK
-- 每筆只填一個，其他都是 NULL
```

| 優點 | 缺點 |
|---|---|
| 可以加外鍵約束，資料庫層保證一致性 | 每多一個實體就要 ALTER TABLE 加欄位 |
| 查詢可以 JOIN：`JOIN events ON action_log.event_id = events.id` | 一堆 NULL 欄位，看起來很稀疏 |
| IDE/工具可以自動檢測關聯 | 查「這筆 log 屬於哪個實體」要檢查所有 FK 欄位哪個不是 NULL |

### 做法 C：`entity_type` + `entity_id` + CHECK 約束（折衷）

```sql
entity_type  VARCHAR(50) NOT NULL,
entity_id    VARCHAR(36) NOT NULL,
-- 用 index 加速查詢，用程式碼保證 entity_id 指向正確的表
INDEX idx_entity (entity_type, entity_id)
```

加上程式碼端的驗證：
```go
// 寫入前先確認 entity_id 存在
switch entityType {
case "event":
    event, _ := eventRepo.GetByID(entityID)
    if event == nil { return error }
case "order":
    order, _ := orderRepo.GetByID(entityID)
    if order == nil { return error }
}
```

### 建議

**做法 A（entity_type + entity_id）比較適合我們**，原因：
1. 我們的 UUID 是全域唯一的，不會有不同表之間 ID 撞的問題
2. 新增實體類型（未來可能有 `refund`、`company` 等）不用改資料庫
3. 外鍵約束在 log 表上其實不太必要 — log 本來就是紀錄性質，就算原始資料被刪了，log 保留也合理
4. 主流框架（Laravel、Rails、Django）都用這個模式，有足夠的實務驗證

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

## 名詞釐清：Audit Log vs Approval Workflow

文獻裡常出現的 audit（稽核）跟我們活動刪除需要的 approval（審核）是不同的東西：

| | Audit Log（稽核紀錄） | Approval Workflow（審核流程） |
|---|---|---|
| 回答的問題 | 「誰在什麼時候改了什麼？」 | 「誰提了什麼申請？通過了沒？」 |
| 資料流向 | 只寫入，寫完不再修改 | 有狀態流轉（pending → approved / rejected） |
| 目的 | 事後追查、合規 | 事前管控、流程把關 |
| 例子 | 管理員把活動名稱從 A 改成 B | 主辦方申請刪除活動，等管理員核准 |
| 需要 status 欄位嗎 | 不需要 | 需要 |

**我們的活動刪除功能是 approval workflow**，不是 audit log。
但兩者可以共用同一張表，差別在於：
- 純紀錄（audit）：`status` 為 NULL，寫入後不再修改
- 審核流程（approval）：`status` 從 `pending` 開始，後續會 UPDATE 為 `approved` / `rejected`

### Redgate 文章說的 "generic" 是什麼意思？

文章比較了兩種 audit 表設計：

**Shadow Table（影子表）** — 每張業務表各自配一張 log 表
- events → events_audit（欄位結構一樣，多加誰改的、什麼時候改的）
- orders → orders_audit
- 每次修改就把「整列」複製一份到對應的 audit 表
- 缺點：改了 30 個欄位的表裡的 1 個欄位，audit 表也要存完整的 30 個欄位

**Generic Table（通用表）** — 所有表的 log 都放同一組表
- 只用兩張表：header（哪張表、什麼操作、誰、什麼時候）+ detail（哪個欄位、舊值、新值）
- 只記「被改的欄位」，不用複製整列

所以 "no need to replicate a whole row" 是在說 generic 做法的優勢 —
不像 shadow table 要複製整列，只需要記有變化的欄位。
兩種都是正規做法，各有適用場景，不是說哪個比較好或不好。

---

## 效能分析：合併 vs 拆分在大資料量下的表現

### 估算資料量

假設系統成長到 50 場大型活動：
- 每場活動產生的 action_log：活動審核、刪除申請、狀態變更... 約 5~10 筆
- 每場活動的訂單數：假設 2000 筆，每筆訂單可能有 1~3 筆 log（取消、退款、編輯）
- 50 場 × 2000 訂單 × 2 筆 log = 約 20 萬筆訂單 log
- 加上活動本身的 log、票券、攤位等 → 估計 25~30 萬筆
- 如果跑 3~5 年 → 有可能到 100 萬筆

### 合併（單表 action_log）在 100 萬筆時

MySQL InnoDB 處理 100 萬筆是很輕鬆的，前提是 index 要對：

```sql
-- 必要的 index
INDEX idx_entity (entity_type, entity_id)   -- 查某個活動/訂單的 log
INDEX idx_action_status (action, status)    -- 查所有待審核的刪除請求
INDEX idx_created (created_at)              -- 按時間查
```

| 資料量 | 查詢速度（有 index） | 需要擔心嗎？ |
|---|---|---|
| 1 萬筆 | < 1ms | 不用 |
| 10 萬筆 | 1~5ms | 不用 |
| 100 萬筆 | 5~20ms | 不用，MySQL 的舒適區 |
| 1000 萬筆 | 要看查詢，可能需要 partition | 開始注意 |

### 拆分（每實體各自 log 表）在 100 萬筆時

- order_log: 20 萬筆、event_log: 5000 筆、ticket_log: 1 萬筆...
- 每張表都很小，查詢肯定快
- 但如果要「列出所有待審核請求」就要 UNION 多張表

### 結論

100 萬筆對 MySQL 來說不算大表。單表 + 正確的 index 跟拆分多表的查詢速度差異在毫秒等級，體感上沒有差別。**在千萬筆以下，選擇合併或拆分應該看維護成本，不是效能。**

如果真的到了千萬筆需要優化，可以事後做：
- 加 partition（按 entity_type 或按月份）
- 定期歸檔舊資料到 archive 表
- 這些都不需要改程式碼，只是 DBA 操作

---

## 個人傾向

方案一（合併）最實際。理由：
- 我們的 `order_log` 結構本來就很接近通用設計，只是名字綁死了 order
- 加上 `entity_type`、`entity_id`、`status`、`reviewer` 就能同時處理紀錄和審核
- 團隊小，少一張表就少一份維護
- 空欄位（純紀錄不需要 status）在 MySQL 裡幾乎不佔空間
- 100 萬筆以內效能不是問題

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

9. **luoyangpeng/action-log — Laravel 操作日誌套件**（57 stars）
   - 一個 Laravel 5 的套件，自動記錄 Eloquent Model 的 CRUD 操作到統一的 `action_log` 表。
   - 表名就叫 `action_log`，驗證了這個命名是業界常見的。
   - **它的表結構：**
     ```sql
     action_log (
       id         INT AUTO_INCREMENT PRIMARY KEY,
       uid        VARCHAR  -- 用戶 ID
       username   VARCHAR  -- 用戶名稱
       type       VARCHAR(50)  -- 操作類型（自訂字串，如 "新增會員"、"修改訂單"）
       ip         VARCHAR(50)  -- 操作者 IP
       browser    VARCHAR(150) -- 瀏覽器
       system     VARCHAR(50)  -- 作業系統
       url        VARCHAR(150) -- 操作的 URL
       content    VARCHAR      -- 操作描述（自由文字）
       created_at, updated_at
     )
     ```
   - **自動記錄**：在 config 中設定要監控哪些 Model，套件會自動攔截 create/update/delete 並寫 log。
   - **手動記錄**：`ActionLog::createActionLog($type, $content)` — 兩個參數：
     - `$type`：操作類型，自訂字串（例如 `"匯出報表"`、`"批次刪除"`）
     - `$content`：操作內容描述（例如 `"管理員匯出了 2025-02 的銷售報表"`）
   - **跟我們設計的差異：**
     - 它沒有 `entity_type` + `entity_id`（不知道操作了「哪一筆」資料）
     - 它沒有 `status`（純紀錄，沒有審核流程）
     - 它多了瀏覽器/IP/OS 等 client 資訊（偏 access log）
   - **對我們的參考價值**：表名 `action_log` 是通用的命名慣例，但它的結構比較陽春，我們需要的 entity 關聯和審核流程它都沒有。
   - https://github.com/luoyangpeng/action-log
