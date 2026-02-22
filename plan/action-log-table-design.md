# 操作紀錄表設計

## 目的

本文件旨在釐清「操作紀錄該怎麼設計」這個架構問題，並在團隊動工之前取得共識，避免事後重工。

## 背景

目前系統中已有 `order_log` 表記錄訂單相關操作（取消、退款審核、編輯）。隨著活動刪除審核等新需求出現，其他實體也需要類似的紀錄功能。

**團隊有提到所有 CRUD 操作都要有紀錄**（誰在什麼時候對什麼資料做了什麼事）。這在業界叫做 **audit log（稽核紀錄）**，是合規和追查問題的基本需求。

業界常見的做法是 **shadow tables**（每張業務表配一張 log 表，例如 `events → events_audit`），但以目前 38 張資料表來算，最多可能膨脹到 76 張，維護成本過高。**團隊不希望太多資料表**，傾向「不要無限新增子表」、「所有 log 集中管理」的方向，因此傾向採用 **generic table（通用表）** 來統一記錄所有實體的操作紀錄，用 `entity_type` + `entity_id` 區分是哪張表的哪筆資料。

此外，後續還涉及資料表更名與欄位新增。若遷移流程是先建立新資料庫 `futuresign_reg`，再從 production 搬資料過去，那遷移期間仍有使用者持續寫入的風險——是否需要暫停服務？如何確保不漏資料？這部分在 [議題二](#議題二資料表改名與遷移-sop) 中詳細分析。

由於新增欄位或修改表結構容易在團隊內產生歧見，本文件先行整理方案比較與分析，**在動工前先確認方向，避免重工拖累進度**。

---

## 議題一：用原本的表擴充欄位（合併 vs 拆分）

把 `order_log` 擴展成通用表，用 `entity_type` + `entity_id` 取代 `order_id`，同時支援 CRUD 純紀錄和審核流程。以下評估三種方案。

### 方案一：合併成一張表（`action_log`）

把 `order_log` 擴展成通用表 `action_log`，用 `entity_type` + `entity_id` 取代 `order_id`。

> 表名已確定為 `action_log`。~~`action_request`~~、~~`approval_request`~~、~~`workflow_request`~~ 等候選已排除，見 [Q4](#q4表名討論到底要叫什麼)。

**結構：**
```sql
id, entity_type, entity_id, action, status, reason,
applier_id, applier_type, reviewer_id, reviewer_type,
notes, details(JSON), created_at
-- append-only：不需要 updated_at
```

**好處：**
- 只維護一張表、一套 repository/service
- 跨實體查詢容易（「列出所有待審核刪除請求」一句 SQL）
- 新增實體類型不用改 schema，加個 entity_type 值就好
- 後台可以做統一的「操作紀錄」頁面
- **一張表同時解決 CRUD 紀錄和審核流程兩個需求**

**壞處：**
- ~~`entity_id` 沒辦法加外鍵約束~~ → `entity_type` 已經標記指向哪張表，程式碼端靠 `switch entity_type` 解決。MySQL 語法上不支援「一個 FK 根據條件指向不同表」，但 log 表本來就不需要外鍵 — 原始資料被刪了 log 保留也合理（你還是想知道「以前刪過什麼」）
- ~~純紀錄型的資料會有一堆空的 status/reviewer 欄位~~ → 見 [Q2](#q2純紀錄的-null-欄位有差嗎)：MySQL InnoDB 的 NULL 每欄位只佔 1 bit，100 萬筆 < 1 MB，不是問題
- 單表資料量大，要注意 index → 見 [Q8](#q8效能分析合併-vs-拆分在大資料量下的表現)：100 萬筆以內毫秒級，千萬筆以下不是瓶頸
- 欄位設計要取公約數，特殊需求得塞 JSON
- **業務程式碼與 log 是緊耦合** — 業務邏輯裡直接呼叫 log service 寫入紀錄，兩者綁在一起。如果 log service 掛了可能影響業務操作。真正的鬆耦合需要 async/message queue、AOP/decorator、或 CDC（Debezium 監控 binlog）等機制，是否需要改為鬆耦合需要團隊另外評估。詳見 [Martin Fowler 翻譯 — 鬆耦合的真正含義](martin-fowler-audit-log-translation.md#鬆耦合的真正含義)

**相關參考：**
- Redgate — Generic tables: "Minimal schema footprint, flexible, can audit any table without adding new audit tables"
  https://www.red-gate.com/blog/database-design-for-audit-logging
- Microsoft Q&A — 社群建議用 centralized log table，透過欄位區分類型
  https://learn.microsoft.com/en-us/answers/questions/116029/sql-server-best-way-to-design-centralize-log-table
- luoyangpeng/action-log — Laravel 套件也用單一 `action_log` 表，驗證此命名為業界慣例
  https://github.com/luoyangpeng/action-log
- Patrick Karsh — Polymorphic Associations: `entity_type` + `entity_id` 模式的設計基礎
  https://patrickkarsh.medium.com/polymorphic-associations-database-design-basics-17faf2eb313

### 方案二：每個實體各自一張 log 表（Shadow Tables）

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
- **團隊不希望太多表** — 38 張業務表可能膨脹到 76 張

**相關參考：**
- Redgate — Shadow tables: "any change in the structure of the main table must be reflected in the corresponding shadow table, which makes it difficult to maintain"
  https://www.red-gate.com/blog/database-design-for-audit-logging
- DZone — SRP 原則：每張表代表一個概念，支持拆分的理論依據
  https://dzone.com/articles/building-solid-databases-0
- GeeksforGeeks — 強調職責分離："Workflow management stays isolated... Task execution is managed separately"
  https://www.geeksforgeeks.org/dbms/database-design-for-workflow-management-systems/

### 方案三：拆成兩張表（紀錄 vs 流程）

一張做純紀錄（`activity_log`），一張做審核流程（~~`action_request`~~）。

**`activity_log`** — 記錄已經發生的事（只 INSERT 不 UPDATE）
```sql
id, entity_type, entity_id, action, applier_id, reason, details(JSON), created_at
```

**~~`action_request`~~** — 管理正在進行的請求（每個狀態變更都是一筆新紀錄）
```sql
id, entity_type, entity_id, action, status, reason,
applier_id, applier_type, reviewer_id, reviewer_type, notes, details(JSON), created_at
```

**好處：**
- 語意最清楚：log 就是 log，request 就是 request
- 兩張表都是 append-only（只 INSERT 不 UPDATE），資料不可變

**壞處：**
- 兩張表要維護
- 查詢「目前狀態」需要找該實體最新的紀錄：`WHERE action=? ORDER BY created_at DESC LIMIT 1`
- 見 [Q5](#q5為什麼不拆兩張表方案三的問題) 的詳細分析

**已排除** — 在 append-only 設計下，一張表已經用 `status` 欄位自然區分了兩種情境，拆開只是多了維護成本。

**相關參考：**
- Martin Fowler — Audit Log 強調「寫完不動」的純紀錄特性，支持 activity_log 拆分的理論依據
  https://martinfowler.com/eaaDev/AuditLog.html
- Budibase — Workflow 系統中 Request 表是核心，有狀態流轉，支持 ~~action_request~~ 拆分的理論依據
  https://budibase.com/blog/data/workflow-management-database-design/
  中文翻譯：[budibase-workflow-database-design-translation.md](budibase-workflow-database-design-translation.md)
- Redgate — 區分 Traceability（追蹤資料變更）和 Auditability（追蹤使用者行為），兩者混在一起會造成重複紀錄
  https://www.red-gate.com/blog/database-design-how-to-keep-track-of-what-the-users-do/

### 建議：方案一（合併為 `action_log`）

方案一（合併）最實際。理由：
- 我們的 `order_log` 結構本來就很接近通用設計，只是名字綁死了 order
- 加上 `entity_type`、`entity_id`、`status`、`applier`/`reviewer` 就能同時處理紀錄和審核
- 團隊小，少一張表就少一份維護
- 空欄位（純紀錄不需要 status）在 MySQL 裡幾乎不佔空間
- 100 萬筆以內效能不是問題
- **團隊要求 CRUD 都要有紀錄，又不希望太多表** — 合併方案完美符合

如果覺得紀錄和審核混在一起不舒服，可以用方案三拆開。
方案二（每實體一張表）對我們的規模來說太重了。

### action_log 欄位設計（方案一展開）

#### 完整欄位與說明

```sql
CREATE TABLE action_log (
  id             VARCHAR(36) PRIMARY KEY,  -- UUID 主鍵
  entity_type    VARCHAR(50) NOT NULL,     -- 這筆紀錄屬於哪種資料表（見下方說明）
  entity_id      VARCHAR(36) NOT NULL,     -- 對應那筆資料的 ID
  action         VARCHAR(50) NOT NULL,     -- 行為動作（DELETE, CANCEL, CREATE, UPDATE, EDIT...）
  status         VARCHAR(30),              -- 這個動作的狀態（pending, approved, rejected），純紀錄可 NULL
  reason         TEXT,                     -- 為什麼做這個操作
  applier_id     VARCHAR(36),              -- 申請者/發起者（ID）
  applier_type   VARCHAR(20),              -- 申請者身分：'member' 或 'user'
  reviewer_id    VARCHAR(36),              -- 審核者（ID），純紀錄不需要
  reviewer_type  VARCHAR(20),              -- 審核者身分：'member' 或 'user'
  notes          TEXT,                     -- 備註（審核備註、取消原因等）
  details        JSON,                     -- 額外資訊（變更前後的值等等）
  created_at     DATETIME NOT NULL         -- 這個動作發生的時間（每筆都有自己的時間戳）
);
-- 不需要 updated_at，因為這張表是 append-only（只 INSERT 不 UPDATE）
```

#### action vs status 的區別

- **action** = 行為動作，回答「做了什麼事」：`DELETE`, `CANCEL`, `CREATE`, `UPDATE`, `EDIT`
- **status** = 這個動作的狀態/結果，回答「進度如何」：`pending`, `approved`, `rejected`

兩者是不同維度，不能混在一起。`APPROVE` 不是 action，而是 status。

#### 為什麼要分 applier 和 reviewer？

用 `operator_id` 一個欄位統稱，看不出這個人是「申請者」還是「審核者」。
拆成 `applier_id` + `reviewer_id` 後，每筆紀錄都能直接看出角色：

| action | status | applier（誰申請的） | reviewer（誰審核的） |
|---|---|---|---|
| `DELETE` | `pending` | 主辦方（發起刪除申請） | NULL（還沒審核） |
| `DELETE` | `approved` | 主辦方（帶入原申請者） | 管理員（核准的人） |
| `DELETE` | `rejected` | 主辦方（帶入原申請者） | 管理員（駁回的人） |
| `CANCEL` | NULL | 消費者（取消訂單的人） | NULL（不需審核） |
| `EDIT` | NULL | 管理員（編輯的人） | NULL（不需審核） |

- 需要審核的動作（DELETE）：用多筆紀錄追蹤狀態變更，每筆有自己的時間戳
- 不需審核的動作（CANCEL, EDIT）：一筆搞定，`status` 和 `reviewer` 為 NULL

#### 為什麼不用 UPDATE？用多筆 INSERT 追蹤狀態

**傳統做法（會 UPDATE）：**
```
一筆紀錄：id=1, action=DELETE, status=pending → (UPDATE) status=approved, reviewer_id=xxx
問題：pending 是什麼時候的？approved 又是什麼時候的？UPDATE 會覆蓋掉時間資訊
```

**我們的做法（只 INSERT）：**
```
第 1 筆：id=1, action=DELETE, status=pending,  applier=主辦方,              created_at=2025-02-21 10:00:00
第 2 筆：id=2, action=DELETE, status=approved, applier=主辦方, reviewer=管理員, created_at=2025-02-21 14:30:00
```

- 同一個 action（DELETE）的同一個 entity，用不同的 `status` 表達流程進展
- 每筆都有自己的 `created_at`，完整保留時間軸
- 查詢目前狀態：`WHERE entity_type='event' AND entity_id=? AND action='DELETE' ORDER BY created_at DESC LIMIT 1`

#### 每個欄位的白話解釋

| 欄位 | 用途 | 舉例 |
|---|---|---|
| `entity_type` | 這筆 log 是關於「哪張表」的資料 | `'event'`, `'order'`, `'ticket'`, `'booth'` |
| `entity_id` | 那張表裡面「哪一筆」 | `'46f5ad59-5ce0-42fa-8963-71054edebe0e'`（某個活動的 ID） |
| `action` | 做了什麼行為動作 | `'DELETE'`, `'CANCEL'`, `'CREATE'`, `'UPDATE'`, `'EDIT'` |
| `status` | 這個動作的進度/結果（不需審核的動作為 NULL） | `'pending'`, `'approved'`, `'rejected'`, 或 `NULL` |
| `reason` | 為什麼要做這件事 | `'活動無法如期舉辦'`, `'買家要求退款'` |
| `applier_id` | 申請者/發起者的 ID | 某個 member 或 user 的 UUID |
| `applier_type` | 申請者的身分。因為我們系統有兩種帳號體系（`member` = 前台會員，`user` = 後台管理員），需要這個欄位標記才知道去哪張表查人 | `'member'`（主辦方/攤販/消費者）, `'user'`（後台管理員） |
| `reviewer_id` | 審核者的 ID（只有 status=approved/rejected 才有值） | 某個 user 的 UUID |
| `reviewer_type` | 審核者的身分（同 applier_type 的道理） | `'user'`（通常是後台管理員） |
| `notes` | 備註（審核備註、取消原因等） | `'已確認無訂單，核准刪除'` |
| `details` | 放不進固定欄位的額外資訊，用 JSON 彈性存 | `{"old_amount": 1000, "new_amount": 800, "payment_status": "paid"}` |
| `created_at` | 這個動作發生的時間 | `2025-02-21 14:30:00` |

### 議題一 Q&A

#### Q1: applier_type / reviewer_type 有必要嗎？

**有必要。**

我們系統有兩種帳號體系：
- `member` 表 — 前台會員（主辦方、攤販、消費者）
- `user` 表 — 後台管理員

當 action_log 記錄「誰做了這件事」的時候，`applier_id` 和 `reviewer_id` 存的是 UUID。
但光看 UUID 不知道要去 member 表還是 user 表查這個人是誰。

**「我們有 TryBothAuth 了，還需要 type 嗎？」**

需要。TryBothAuth 跟 type 欄位解決的是**不同時間點**的問題：

| | TryBothAuth | applier_type / reviewer_type |
|---|---|---|
| 什麼時候用 | API 請求的當下（runtime） | 三個月後讀 log 的時候（query time） |
| 解決什麼 | 「現在打 API 的人是 member 還是 user？」 | 「這筆 log 的 applier_id 要去哪張表查？」 |
| 存活時間 | request 結束就沒了 | 永久寫在 DB 裡 |

寫入 log 的時候你確實知道身分（TryBothAuth 告訴你了），但如果你**不把這個資訊存下來**，讀的時候就要：

```go
// 沒有 type 欄位的悲慘情況：每次讀 log 都要查兩張表
member, _ := memberRepo.GetByID(log.ApplierID)
if member == nil {
    user, _ := userRepo.GetByID(log.ApplierID)  // 第二次查詢
}
```

有 type 欄位就直接知道去哪查，一次搞定：

```go
// 有 type 欄位：直接知道去哪張表
switch log.ApplierType {
case "member":
    member, _ := memberRepo.GetByID(log.ApplierID)
case "user":
    user, _ := userRepo.GetByID(log.ApplierID)
}
```

**UUID 碰撞：理論上不會，但 type 的目的不是防碰撞**

UUID v4 的碰撞機率是 1/2.71 × 10^18 — 每秒產生 10 億個 UUID，要跑 85 年才有 50% 機率碰撞一次。所以碰撞不是加 type 的主要理由。

**加 type 的真正理由是查詢效率和語意清晰**：

1. **查詢效率**：沒有 type 就要查兩張表（member + user），有 type 就查一張
2. **語意清晰**：光看一個 UUID 不知道這是會員還是管理員
3. **業界慣例**：GitLab 官方文件明確說 polymorphic association 必須兩個欄位一起用：`WHERE source_type = 'Project' AND source_id = 13083`
4. **防禦性設計**：雖然 UUID 碰撞機率趨近於零，但 type 欄位等於加了一層保險，確保即使 UUID 碰巧一樣也不會查錯表

**三種做法：**

**做法 1：加 `applier_type` / `reviewer_type` 欄位（推薦）**

```sql
applier_id     VARCHAR(36)  -- 申請者/發起者 UUID
applier_type   VARCHAR(20)  -- 'member' 或 'user'
reviewer_id    VARCHAR(36)  -- 審核者 UUID
reviewer_type  VARCHAR(20)  -- 'member' 或 'user'
```

| 優點 | 缺點 |
|---|---|
| 程式碼可以根據 type 去對的表查人的資訊 | 多兩個欄位 |
| 跟 entity_type + entity_id 是同樣的設計模式，一致性好 | 沒有外鍵約束 |
| 未來如果多一種身分（例如 vendor）只要加一個 type 值 | — |
| 明確區分「誰申請」和「誰審核」，語意清楚 | — |

這就是 polymorphic association 的模式，跟 entity_type + entity_id 同理。
Rails、Laravel、Django 都用這種方式處理「一個欄位可能指向不同表」的情況。

**做法 2：分兩個欄位 `member_id` + `user_id`**

```sql
member_id  VARCHAR(36) REFERENCES members(id)  -- 前台會員
user_id    VARCHAR(36) REFERENCES users(id)     -- 後台管理員
-- 每筆只填一個，另一個 NULL
```

| 優點 | 缺點 |
|---|---|
| 可以加外鍵約束 | 每多一種身分就要 ALTER TABLE 加欄位 |
| JOIN 查名字比較直覺 | 跟做法 B（獨立 FK）一樣的稀疏 NULL 問題 |
| — | 無法區分申請者和審核者的角色 |

**做法 3：統一 user 表（改架構）**

把 member 和 user 合併成同一張表，用 role 欄位區分身分。
這樣 applier_id / reviewer_id 就只會指向一張表，不需要 type。

| 優點 | 缺點 |
|---|---|
| 根本解決「不知道指向哪張表」的問題 | 改動太大，現有架構動不了 |
| 可以加外鍵約束 | member 和 user 的欄位差異很大，硬合不合理 |

**建議：用做法 1（applier_type / reviewer_type）**。理由：
- 跟 entity_type + entity_id 一致，整張表的設計風格統一
- 不需要改現有的 member / user 架構
- 明確區分「誰申請」和「誰審核」
- 查詢時 `WHERE applier_type = 'member'` 就知道去 member 表 JOIN

#### Q2: 純紀錄的 NULL 欄位有差嗎？

**幾乎沒差。**

如果合併成一張表，有些資料是純紀錄（訂單編輯），不需要 `reason`、`notes`、`details` 等欄位。
這些列會有部分欄位是 NULL。這樣會不會浪費空間或影響效能？

> **備註**：在改為 append-only 設計後，已移除 `reviewed_at`、`updated_at` 等欄位。`status` 和 `reviewer_id/reviewer_type` 仍保留（純紀錄時為 NULL，審核流程時有值）。此分析仍適用於這些 nullable 欄位。

**MySQL InnoDB 的 NULL 幾乎不佔空間：**

MySQL InnoDB 儲存 NULL 的方式：
- 每列有一個 **NULL bitmap**（位元圖），每個 nullable 欄位佔 1 bit
- 如果一列有 3 個 nullable 欄位全部是 NULL，額外成本 = 3 bits ≈ 不到 1 byte
- 相比之下，一個 VARCHAR(36) 存 UUID 要 37 bytes

| 情境 | 額外空間成本 |
|---|---|
| 多個 NULL 欄位（status, reason, reviewer_id, reviewer_type, notes, details） | < 1 byte/列 |
| 100 萬筆純紀錄 × 3 個 NULL 欄位 | < 1 MB |
| 同樣 100 萬筆如果都存空字串 `""` 代替 NULL | 約 3~6 MB |

**NULL 比空字串還省空間。**

**查詢效能的影響：**

**有影響的情況：**
- `NOT IN()` 子查詢碰到 nullable 欄位時，MySQL 要額外檢查 NULL，效能會差
- 解法：用 `NOT EXISTS` 或 `WHERE column IS NOT NULL` 取代 `NOT IN()`

**沒影響的情況（我們的場景）：**
- `WHERE action = 'DELETE' AND status = 'pending'` — 直接比對值，不涉及 NULL
- `WHERE entity_type = 'event' AND entity_id = ?` — 跟 NULL 欄位無關

**所以 NULL 欄位不是問題：**

| 擔心的點 | 實際影響 |
|---|---|
| 浪費儲存空間 | 幾乎不佔（< 1 byte/列） |
| 查詢變慢 | 我們的查詢模式不會踩到 NULL 效能陷阱 |
| 資料看起來稀疏 | 純粹視覺問題，不影響功能 |
| 語意不清 | 看 `action` + `status` 欄位就知道這筆紀錄的用途和進度，不需要額外判斷 |

#### Q3: entity_type + entity_id vs 獨立外鍵欄位

關於「怎麼知道這筆 log 屬於哪筆資料」，有兩種做法：

**做法 A：`entity_type` + `entity_id`（多態關聯）**

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

**做法 B：每個實體一個獨立的外鍵欄位（不推薦）**

```sql
order_id   VARCHAR(36) REFERENCES orders(id),    -- 訂單 FK
event_id   VARCHAR(36) REFERENCES events(id),    -- 活動 FK
ticket_id  VARCHAR(36) REFERENCES tickets(id),   -- 票券 FK
booth_id   VARCHAR(36) REFERENCES booths(id),    -- 攤位 FK
-- 每筆只填一個，其他都是 NULL
```

**「每筆只填一個」的意思：**

同一列裡四個 FK 欄位只有一個有值，其他三個是 NULL：

```
id    | order_id | event_id | ticket_id | booth_id | action  | status
------+----------+----------+-----------+----------+---------+---------
aaa   | ord-123  | NULL     | NULL      | NULL     | CANCEL  | NULL
bbb   | NULL     | evt-456  | NULL      | NULL     | DELETE  | pending
ccc   | NULL     | NULL     | NULL      | bth-789  | CANCEL  | NULL
```

- 第一筆跟訂單有關 → 只填 `order_id`，其他空著
- 第二筆跟活動有關 → 只填 `event_id`，其他空著
- 第三筆跟攤位有關 → 只填 `booth_id`，其他空著

| 優點 | 缺點 |
|---|---|
| 可以加外鍵約束，資料庫層保證一致性 | 每多一個實體就要 `ALTER TABLE ADD COLUMN`，改 schema |
| 查詢可以 JOIN：`JOIN events ON action_log.event_id = events.id` | 一堆 NULL 欄位，看起來很稀疏 |
| IDE/工具可以自動檢測關聯 | 查「這筆 log 屬於哪個實體」要寫 `COALESCE(order_id, event_id, ticket_id, booth_id)` |
| 刪除原始資料時 DB 可以自動 CASCADE 或阻擋 | 未來加 `refund_id`、`company_id` 會越長越多欄位 |

**對比做法 A 用 `entity_type` + `entity_id`，同樣的資料長這樣：**

```
id    | entity_type | entity_id | action  | status
------+-------------+-----------+---------+---------
aaa   | order       | ord-123   | CANCEL  | NULL
bbb   | event       | evt-456   | DELETE  | pending
ccc   | booth       | bth-789   | CANCEL  | NULL
```

兩個欄位就搞定，不管有幾種實體都不用改 schema。

**做法 C：`entity_type` + `entity_id` + CHECK 約束（折衷）**

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

**建議：做法 A（entity_type + entity_id）比較適合我們**，原因：
1. 我們的 UUID 是全域唯一的，不會有不同表之間 ID 撞的問題
2. 新增實體類型（未來可能有 `refund`、`company` 等）不用改資料庫
3. 外鍵約束在 log 表上其實不太必要 — log 本來就是紀錄性質，就算原始資料被刪了，log 保留也合理
4. 主流框架（Laravel、Rails、Django）都用這個模式，有足夠的實務驗證

#### Q4: 表名討論：到底要叫什麼？

**已確定用 `action_log`。**

幾個候選名字：

| 表名 | 語意 | 適合什麼場景 | 結論 |
|---|---|---|---|
| `action_log` | 操作紀錄 | 偏「記錄已發生的事」，語意上涵蓋範圍最廣 | ✅ 選這個 |
| ~~`action_request`~~ | 操作請求 | 偏「有人提出請求，等待處理」 | ❌ 純紀錄不像 request |
| ~~`approval_request`~~ | 審核請求 | 最直白地表達「需要審核」 | ❌ 不含純紀錄的 CRUD |
| ~~`workflow_request`~~ | 流程請求 | 偏通用 workflow 引擎的概念 | ❌ 對我們來說太大 |

**分析：**

**`action_log`**
- 優點：跟現有 `order_log` 風格一致，名字通用
- 優點：所有資料都是 append-only，「log」的語意完全正確
- 適合：如果這張表要同時處理純紀錄 + 審核流程

**~~`action_request`~~**
- 優點：「request」表達了「這是一個請求，還在等回應」
- 缺點：純紀錄（訂單編輯 log）不太像一個 request
- 適合：如果這張表主要用來做審核流程

**~~`approval_request`~~**
- 優點：最明確，看到表名就知道「這是需要審核的東西」
- 缺點：如果未來要放不需要審核的操作紀錄就不適合
- 適合：如果這張表專門用來做審核，不混純紀錄

**取決於一個決定：要不要合併 order_log？**

**如果合併**（order_log 的資料也搬進來）：
- 這張表同時有「純紀錄」和「審核請求」兩種資料
- 叫 `action_log` 比較合適（涵蓋範圍廣）
- 用 `status` 欄位區分：NULL = 純紀錄，pending/approved/rejected = 審核流程

**如果不合併**（order_log 保持原樣，新表只做審核流程）：
- 這張表專門處理需要人審核的請求
- 叫 ~~`approval_request`~~ 最精準
- 每筆資料都有 status，不會有空值的問題
- 語意乾淨：看到 ~~approval_request~~ 就知道是等審核的，看到 order_log 就知道是操作紀錄

**欄位比較：**

```
action_log（合併方案）— 所有資料都是 append-only
├── 純紀錄：action=EDIT/CANCEL, status=NULL（一筆搞定，不需要後續動作）
│   例：訂單編輯、訂單取消
│
└── 審核流程：同一個 action 搭配不同 status，多筆紀錄串連
    例：活動刪除
    第 1 筆：action=DELETE, status=pending,  applier=主辦方, created_at=申請時間
    第 2 筆：action=DELETE, status=approved, applier=主辦方, reviewer=管理員, created_at=審核時間

approval_request（不合併方案）— 同樣是 append-only
└── 每筆都是審核相關動作
    例：活動刪除請求、未來的退款審核、攤位取消審核
    （order_log 留在原地不動）
```

合併 order_log 後，這張表同時有「純紀錄」（status=NULL）和「審核流程」（status=pending/approved/rejected），叫 `action_log` 涵蓋範圍最廣。

#### Q5: 為什麼不拆兩張表？（方案三的問題）

方案三提出把純紀錄（`activity_log`）和審核流程（~~`action_request`~~）拆成兩張表，理由是「語意不同應該分開」。

但在 append-only 設計下，**一張表已經用 `status` 欄位自然區分了兩種情境**：

| 情境 | 怎麼存 | 幾筆 |
|---|---|---|
| 純紀錄（訂單編輯） | `action=EDIT, status=NULL` | 1 筆搞定 |
| 審核流程（活動刪除） | `action=DELETE, status=pending → approved` | 多筆串連 |
| 退款流程 | `action=REFUND, status=pending → approved → success` | 多筆串連 |

三種場景結構完全一樣，差別只在 `status` 有沒有值、有幾筆。拆成兩張表反而：

1. **多維護一套程式碼**：兩張表各自需要 repository / service / handler
2. **多一層判斷邏輯**：「這個操作該寫進哪張表？」 — 純紀錄還是審核流程？邊界不總是清楚的
3. **跨表查詢變複雜**：「列出某活動所有操作紀錄」要 UNION 兩張表
4. **沒有實質好處**：兩張表都是 append-only，結構幾乎一樣，拆開只是多了維護成本

所以我們選方案一（合併），方案三留在文件中作為對照分析，說明為什麼我們不這樣做。

#### Q6: append-only 多筆紀錄的查詢代價

一個退款流程會產生 3 筆紀錄：

```
第 1 筆：action=REFUND, status=pending,  applier=消費者,  created_at=10:00
第 2 筆：action=REFUND, status=approved, reviewer=管理員, created_at=14:00
第 3 筆：action=REFUND, status=success,  reviewer=系統,   created_at=14:05
```

跟 UPDATE 做法相比，查詢難度差異：

| 查詢場景 | UPDATE 做法 | append-only 做法 | 誰比較好 |
|---|---|---|---|
| 查某筆的目前狀態 | `WHERE id=?` | `ORDER BY created_at DESC LIMIT 1` | 差不多 |
| 查某筆的完整歷程 | 做不到（被覆寫了） | `ORDER BY created_at` 直接撈 | append-only 贏 |
| 列出所有 pending | `WHERE status='pending'` | 需要 `NOT EXISTS` 子查詢 | UPDATE 比較簡單 |
| pending 了多久 | 做不到（不知道何時變 pending） | `created_at` 直接看 | append-only 贏 |

**唯一變難的查詢**是「列出所有目前還在 pending 的」：

```sql
-- UPDATE 做法：一行搞定
SELECT * FROM action_log WHERE action='REFUND' AND status='pending';

-- append-only 做法：要確認 pending 是「最新狀態」（後面沒有 approved/rejected）
SELECT a.* FROM action_log a
WHERE a.action = 'REFUND' AND a.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM action_log b
    WHERE b.entity_type = a.entity_type
    AND b.entity_id = a.entity_id
    AND b.action = 'REFUND'
    AND b.created_at > a.created_at
);
```

**效能影響**：`NOT EXISTS` 子查詢只在同一個 entity 的同一個 action 裡面找（通常 2~3 筆），不是掃全表。有以下 index 就是毫秒級：

```sql
INDEX idx_entity_action (entity_type, entity_id, action, created_at)
```

**如果覺得子查詢煩**，可以建 View 封裝：

```sql
CREATE VIEW action_log_latest AS
SELECT a.* FROM action_log a
WHERE a.created_at = (
    SELECT MAX(b.created_at) FROM action_log b
    WHERE b.entity_type = a.entity_type
    AND b.entity_id = a.entity_id
    AND b.action = a.action
);

-- 之後查 pending 就跟 UPDATE 做法一樣直覺：
SELECT * FROM action_log_latest WHERE action='REFUND' AND status='pending';
```

**結論**：append-only 唯一的查詢代價是「找目前狀態」多一層子查詢。但換來的是完整的時間軸紀錄 — 什麼時候申請、什麼時候核准、什麼時候到帳，在退款這種敏感場景很重要。UPDATE 做法連「客戶等了多久才被核准」都查不出來。

#### Q7: Audit Log vs Approval Workflow

文獻裡常出現的 audit（稽核）跟我們活動刪除需要的 approval（審核）是不同的東西：

| | Audit Log（稽核紀錄） | Approval Workflow（審核流程） |
|---|---|---|
| 回答的問題 | 「誰在什麼時候改了什麼？」 | 「誰提了什麼申請？通過了沒？」 |
| 資料流向 | 只寫入，寫完不再修改 | 也是只寫入——每個狀態變更都 INSERT 一筆新紀錄 |
| 目的 | 事後追查、合規 | 事前管控、流程把關 |
| 例子 | 管理員把活動名稱從 A 改成 B | 主辦方申請刪除活動，等管理員核准 |
| 欄位差異 | status 和 reviewer 為 NULL | status 有值（pending/approved/rejected），reviewer 記錄審核者 |

**我們的活動刪除功能是 approval workflow**，不是 audit log。
但兩者可以共用同一張表，而且**都是 append-only（只 INSERT 不 UPDATE）**：
- 純紀錄（audit）：一筆紀錄，寫入後不再修改。例：`action=EDIT, status=NULL`
- 審核流程（approval）：用**多筆紀錄**表達流程，同一個 action 搭配不同 status，各有自己的時間戳：
  - 第一筆：`action=DELETE, status=pending`（主辦方申請刪除）
  - 第二筆：`action=DELETE, status=approved` 或 `status=rejected`（管理員審核，帶 reviewer 資訊）
  - 查詢目前狀態：`WHERE entity_type=? AND entity_id=? AND action='DELETE' ORDER BY created_at DESC LIMIT 1`

#### Q8: 效能分析：合併 vs 拆分在大資料量下的表現

**估算資料量：**

假設系統成長到 50 場大型活動：
- 每場活動產生的 action_log：活動審核、刪除申請、狀態變更... 約 5~10 筆
- 每場活動的訂單數：假設 2000 筆，每筆訂單可能有 1~3 筆 log（取消、退款、編輯）
- 50 場 × 2000 訂單 × 2 筆 log = 約 20 萬筆訂單 log
- 加上活動本身的 log、票券、攤位等 → 估計 25~30 萬筆
- 如果跑 3~5 年 → 有可能到 100 萬筆

**合併（單表 action_log）在 100 萬筆時：**

MySQL InnoDB 處理 100 萬筆是很輕鬆的，前提是 index 要對：

```sql
-- 必要的 index
INDEX idx_entity (entity_type, entity_id)   -- 查某個活動/訂單的所有 log
INDEX idx_action_status (action, status)    -- 查所有待審核的刪除請求（WHERE action='DELETE' AND status='pending'）
INDEX idx_created (created_at)              -- 按時間查
```

| 資料量 | 查詢速度（有 index） | 需要擔心嗎？ |
|---|---|---|
| 1 萬筆 | < 1ms | 不用 |
| 10 萬筆 | 1~5ms | 不用 |
| 100 萬筆 | 5~20ms | 不用，MySQL 的舒適區 |
| 1000 萬筆 | 要看查詢，可能需要 partition | 開始注意 |

**拆分（每實體各自 log 表）在 100 萬筆時：**

- order_log: 20 萬筆、event_log: 5000 筆、ticket_log: 1 萬筆...
- 每張表都很小，查詢肯定快
- 但如果要「列出所有待審核請求」就要 UNION 多張表

**結論：** 100 萬筆對 MySQL 來說不算大表。單表 + 正確的 index 跟拆分多表的查詢速度差異在毫秒等級，體感上沒有差別。**在千萬筆以下，選擇合併或拆分應該看維護成本，不是效能。**

如果真的到了千萬筆需要優化，可以事後做：
- 加 partition（按 entity_type 或按月份）
- 定期歸檔舊資料到 archive 表
- 這些都不需要改程式碼，只是 DBA 操作

#### Q9: 現有 order_log vs 活動刪除請求的差異

| | order_log（現有） | 活動刪除請求（新需求） |
|---|---|---|
| 用途 | 記錄已發生的操作 | 管理審核中的請求 |
| 狀態流轉 | 無 | 用多筆紀錄表達：action=DELETE + status=pending → status=approved / rejected |
| 寫入模式 | 只 INSERT | 也是只 INSERT（每個狀態變更一筆新紀錄，不覆寫舊的） |
| 操作者追蹤 | 只有 operator_id | 分 applier（申請者）和 reviewer（審核者），各自在不同筆紀錄上 |
| 實體範圍 | 只有 order | 通用（event/order/booth） |
| 額外資料 | details JSON | notes + details JSON |

#### Q10: Redgate 的 "generic" 是什麼意思？

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

### 議題一參考文獻

1. **Martin Fowler — Audit Log Pattern**
   - "Any time something significant happens you write some record indicating what happened and when it happened."
   - Audit Log 優點是簡單，缺點是資料量大後查詢困難。建議 audit log 和核心業務邏輯保持鬆耦合。
   - 原文：https://martinfowler.com/eaaDev/AuditLog.html
   - 中文翻譯：[martin-fowler-audit-log-translation.md](martin-fowler-audit-log-translation.md)

2. **Redgate — Database Design for Audit Logging**
   - 比較了 Shadow Tables（每實體獨立）vs Generic Tables（統一表）兩種方式。
   - Shadow tables: "any change in the structure of the main table must be reflected in the corresponding shadow table, which makes it difficult to maintain."
   - Generic tables: "Minimal schema footprint—no need for multiple shadow tables. Flexible: can audit any table without adding new audit tables."
   - https://www.red-gate.com/blog/database-design-for-audit-logging

3. **Budibase — Workflow Management Database Design**
   - 描述完整的 workflow engine 資料庫設計（7+ 張表：processes、requests、states、transitions、actions...）
   - 核心概念：request 有狀態、狀態之間有合法的流轉路徑（transition）、動作（action）觸發流轉
   - 我們不需要整套 workflow engine，但它的概念是我們設計的理論基礎
   - 原文：https://budibase.com/blog/data/workflow-management-database-design/
   - 中文全文翻譯：[budibase-workflow-database-design-translation.md](budibase-workflow-database-design-translation.md)

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
   - 缺點：沒有資料庫層級的外鍵約束 — 但 log 表不需要外鍵，原始資料被刪了 log 保留也合理。
   - https://patrickkarsh.medium.com/polymorphic-associations-database-design-basics-17faf2eb313

7. **Microsoft Q&A — Best way to design centralize log table**
   - 社群建議使用 centralized log table，透過額外欄位區分類型。MVP 建議用 identity column 作 PK，datetime2(3) 記時間。
   - https://learn.microsoft.com/en-us/answers/questions/116029/sql-server-best-way-to-design-centralize-log-table
   - 延伸：[Centralized Error/System Log 設計](centralized-error-log.md)（與業務 action log 不同的系統錯誤紀錄）

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

10. **NULL 相關參考**
    - [SQL Sunday](https://sqlsunday.com/2019/01/03/nullable-columns-and-performance/) — NULL 在 `NOT IN()` 子查詢中會導致嚴重效能問題，建議用 `NOT EXISTS` 取代
    - [MySQL IS NULL](https://dev.mysql.com/doc/refman/8.4/en/is-null-optimization.html) — MySQL 官方 `IS NULL` 最佳化文件
    - [DbVisualizer](https://www.dbvis.com/thetable/mysql-nullable-columns-everything-you-need-to-know/) — "MySQL columns are nullable by default unless explicitly marked NOT NULL"
    - [Leapcell](https://leapcell.io/blog/the-silent-killer-understanding-null-s-impact-on-database-performance) — NULL 影響最大的是 aggregate function 和 NOT IN，一般 WHERE 等值查詢不受影響

11. **Polymorphic 相關參考**
    - [GitLab — Polymorphic Associations](https://docs.gitlab.com/development/database/polymorphic_associations/) — "Enforcing consistency on the database level is absolutely crucial... you always need to filter using both columns."
    - [DoltHub](https://www.dolthub.com/blog/2024-06-25-polymorphic-associations/) — 比較了 5 種 polymorphic 實作方式的優缺點
    - [Hashrocket](https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database) — polymorphic association 的 type + id 模式 "was popularized by Ruby on Rails"
    - [MSSQLTips](https://www.mssqltips.com/sqlservertip/8149/polymorphic-associations-sql-server-foreign-keys/) — "Achieving this relationship with foreign keys is technically impossible... you can't define a foreign key reference to multiple tables"
    - [Wikipedia — UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) — UUID v4 碰撞機率為 1/2.71 × 10^18

---

## 議題二：資料表改名與遷移 SOP

### 問題

假設要擴展 `order_log`（改表名 + 加欄位），或遷移到新資料庫 `futuresign_reg`：
- 跑遷移腳本的這段時間，使用者還在用系統
- 萬一遷移進行中有新的訂單取消、新的資料寫入 `order_log`
- 這些新資料會不會漏掉？要暫停服務嗎？

### 改名需要 migration SOP 嗎？

| 操作 | 需要？ | 說明 |
|---|---|---|
| 單純 `RENAME TABLE` | 不需要 | 原子操作，瞬間完成 |
| 改名 + 加欄位（26 筆） | 不需要 | < 1 秒 |
| 改名 + 搬資料 + 切讀寫 | 需要 | 有遺漏風險 |
| 跨資料庫遷移 | 需要 | 停機或雙寫 |

**我們目前 order_log 才 26 筆，不需要 SOP，停機 5 分鐘搞定。**

### 方案 A：停機維護（建議，適合我們的規模）

```
1. 公告維護時間（例如凌晨 2:00 ~ 2:30）
2. 關閉服務（我們是用AWS，所以要關閉EC2?）
3. 跑遷移腳本（ALTER TABLE / 資料搬移）
4. 驗證資料（row count 比對）
5. 部署新版程式碼 → 重啟服務
```

| 優點 | 缺點 |
|---|---|
| 最簡單，100% 不會漏資料 | 服務會中斷 |
| 不需要額外工具或機制 | 使用者體驗差（但凌晨影響很小） |
| 驗證容易，關機狀態下資料不會變 | — |

**適合我們嗎？** 目前 order_log 才 26 筆，整個遷移 < 1 分鐘就能完成。凌晨停機 5 分鐘影響趨近於零。

### 方案 B：雙寫（Dual Write）— 不停機

```
階段 1：建新表，部署新版程式碼同時寫舊表和新表（雙寫）
階段 2：背景跑腳本把舊資料搬到新表（backfill）
階段 3：驗證新表資料完整（row count + 抽樣比對）
階段 4：切換程式碼只讀寫新表（cutover）
階段 5：觀察一段時間，確認沒問題後刪舊表
```

| 優點 | 缺點 |
|---|---|
| 零停機 | 程式碼要改兩次（先雙寫，再單寫） |
| 使用者完全感受不到 | 雙寫期間有 race condition 風險 |
| 業界大廠標準做法 | 對 26 筆資料來說嚴重 over-engineering |

### 方案 C：Shadow Table + 觸發器 — 不停機

```
階段 1：建新表（shadow table）
階段 2：在舊表上建 TRIGGER，任何寫入自動同步到新表
階段 3：背景搬舊資料到新表（backfill）
階段 4：驗證兩邊資料一致
階段 5：原子操作切換：RENAME TABLE order_log TO order_log_old, action_log TO order_log
階段 6：移除 TRIGGER，刪舊表
```

| 優點 | 缺點 |
|---|---|
| 零停機 | 需要寫 TRIGGER，增加複雜度 |
| TRIGGER 在資料庫事務內，不會漏資料 | TRIGGER 會略微影響寫入效能 |
| 切換是原子操作（RENAME TABLE） | 對 26 筆資料來說 over-engineering |

### 建議

**方案 A（停機）就好。** 26 筆資料，凌晨 5 分鐘搞定。

但如果選擇「不動 order_log，另建新表」，那連停機都不需要：
- 新表是全新的，不影響任何現有資料
- 部署新版程式碼就開始用，完全零風險

### 如果未來資料量大了（幾十萬筆以上）怎麼辦？

到那時候再考慮方案 B/C。關鍵步驟：

1. **Backfill 要分批跑** — `WHERE id > ? LIMIT 1000`，不要一次搬完鎖死表
2. **驗證要做** — `SELECT COUNT(*) FROM old_table` vs `SELECT COUNT(*) FROM new_table`
3. **保留回滾方案** — 切換後舊表先留著不刪，觀察幾天確認沒問題再刪
4. **監控 lag** — 如果用 TRIGGER 或 CDC，監控新舊表之間的延遲

### 議題二 Q&A

#### Q1: 如果選「不動 order_log，直接建新表」呢？

連停機都不需要：新表是全新的，部署新程式碼就開始用，零風險。

### 議題二參考文獻

1. **InfoQ — Shadow Table Strategy**
   - "Database triggers propagate every INSERT, UPDATE, or DELETE from the original to the shadow table, ensuring data integrity." 切換用 atomic table rename，不會漏資料
   - https://www.infoq.com/articles/shadow-table-strategy-data-migration/

2. **Coffee Bytes — Zero Downtime Migrations**
   - Shadow Table Strategy，詳細解說六個階段（建表 → backfill → 同步 → 驗證 → 切換 → 清理）
   - https://coffeebytes.dev/en/databases/zero-downtime-migrations-shadow-table-strategy-explained/

3. **GitLab — Avoiding Downtime in Migrations**
   - "Adding columns is inherently safe." Renaming tables 需要多版本漸進式處理，或用 database view 相容舊程式碼
   - https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/

4. **GitLab — Rename Table Without Downtime**
   - 用 database view 指向新表名，讓舊程式碼繼續用舊名查詢
   - https://docs.gitlab.com/ee/development/database/rename_database_tables.html

5. **LaunchDarkly — Zero-Downtime Database Migrations**
   - 建議用 feature flag 控制切換，確保可以隨時回滾
   - https://launchdarkly.com/blog/3-best-practices-for-zero-downtime-database-migrations/

---

## 延伸閱讀

- [Centralized Error/System Log 設計](centralized-error-log.md) — 跟業務 action log 不同的系統錯誤紀錄
