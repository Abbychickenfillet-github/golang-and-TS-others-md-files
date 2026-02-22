# 操作紀錄表設計

## 目的

本文件旨在釐清「操作紀錄該怎麼設計」這個架構問題，並在團隊動工之前取得共識，避免事後重工。

## 背景

目前系統中已有 `order_log` 表記錄訂單相關操作（取消、退款審核、編輯）。隨著活動刪除審核等新需求出現，其他實體也需要類似的紀錄功能。

**老闆有提到所有 CRUD 操作都要有紀錄**（誰在什麼時候對什麼資料做了什麼事）。這在業界叫做 **audit log（稽核紀錄）**，是合規和追查問題的基本需求。

業界常見的做法是 **shadow tables**（每張業務表配一張 log 表，例如 `events → events_audit`），但以目前 38 張資料表來算，最多可能膨脹到 76 張。**老闆不喜歡太多資料表**，所以 shadow tables 不太適合我們。我們傾向用一張 **generic table（通用表）** 來統一記錄所有實體的操作紀錄，用 `entity_type` + `entity_id` 區分是哪張表的哪筆資料。

由於新增欄位或修改表結構容易在團隊內產生歧見，本文件先行整理方案比較與分析，**在動工前先確認方向，避免重工拖累進度**。

---

## 議題一：用原本的表擴充欄位（合併 vs 拆分）

把 `order_log` 擴展成通用表，用 `entity_type` + `entity_id` 取代 `order_id`，同時支援 CRUD 純紀錄和審核流程。以下評估三種方案。

### 方案一：合併成一張表（`action_log`）

把 `order_log` 擴展成通用表 `action_log`，用 `entity_type` + `entity_id` 取代 `order_id`。

> 表名已確定為 `action_log`。~~`action_request`~~、~~`approval_request`~~、~~`workflow_request`~~ 等候選已排除，見 [Q4](#q4表名討論)。

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
- ~~`entity_id` 沒辦法加外鍵約束~~ → `entity_type` 已經標記指向哪張表。log 表不需要外鍵 — 原始資料被刪了 log 保留也合理
- ~~純紀錄型的資料會有一堆空的 status/reviewer 欄位~~ → 見 [Q2](#q2純紀錄的-null-欄位有差嗎)
- 單表資料量大，要注意 index → 見 [Q8](#q8效能分析)
- 欄位設計要取公約數，特殊需求得塞 JSON

### 方案二：每個實體各自一張 log 表（Shadow Tables）

維持 `order_log`，另建 `event_log`、`booth_log`...

**好處：**
- 結構可以針對實體客製化
- 可以加外鍵約束
- 單表資料量分散

**壞處：**
- 每多一個實體就多一張表 + repository + service
- 跨實體查詢要 UNION
- 結構重複多，維護成本高
- **老闆不喜歡太多表** — 38 張業務表可能膨脹到 76 張

### 方案三：拆成兩張表（紀錄 vs 流程）

一張做純紀錄（`activity_log`），一張做審核流程（~~`action_request`~~）。
**已排除** — 見 [Q5](#q5為什麼不拆兩張表)。

### 建議：方案一（合併為 `action_log`）

- `order_log` 結構本來就很接近通用設計，只是名字綁死了 order
- 團隊小，少一張表就少一份維護
- **老闆要求 CRUD 都要有紀錄，又不希望太多表** — 合併方案完美符合

### action_log 欄位設計（方案一展開）

#### 完整欄位與說明

```sql
CREATE TABLE action_log (
  id             VARCHAR(36) PRIMARY KEY,
  entity_type    VARCHAR(50) NOT NULL,     -- 哪張表
  entity_id      VARCHAR(36) NOT NULL,     -- 哪一筆
  action         VARCHAR(50) NOT NULL,     -- 行為（DELETE, CANCEL, CREATE, UPDATE, EDIT）
  status         VARCHAR(30),              -- 進度（pending, approved, rejected），純紀錄為 NULL
  reason         TEXT,                     -- 原因
  applier_id     VARCHAR(36),              -- 申請者 ID
  applier_type   VARCHAR(20),              -- 'member' 或 'user'
  reviewer_id    VARCHAR(36),              -- 審核者 ID
  reviewer_type  VARCHAR(20),              -- 'member' 或 'user'
  notes          TEXT,                     -- 備註
  details        JSON,                     -- 額外資訊（變更前後值）
  created_at     DATETIME NOT NULL         -- 動作發生時間
);
-- append-only：不需要 updated_at
```

#### action vs status 的區別

- **action** = 行為動作，回答「做了什麼事」：`DELETE`, `CANCEL`, `CREATE`, `UPDATE`, `EDIT`
- **status** = 進度/結果，回答「進度如何」：`pending`, `approved`, `rejected`

兩者是不同維度。`APPROVE` 不是 action，而是 status。

#### 為什麼要分 applier 和 reviewer？

| action | status | applier | reviewer |
|---|---|---|---|
| `DELETE` | `pending` | 主辦方 | NULL |
| `DELETE` | `approved` | 主辦方 | 管理員 |
| `CANCEL` | NULL | 消費者 | NULL |
| `EDIT` | NULL | 管理員 | NULL |

#### 為什麼不用 UPDATE？用多筆 INSERT 追蹤狀態

```
傳統（UPDATE）：status=pending → approved，覆蓋掉時間
我們（INSERT）：
  第 1 筆：status=pending,  created_at=10:00
  第 2 筆：status=approved, created_at=14:30  ← 每筆都有時間戳
```

#### 每個欄位的白話解釋

| 欄位 | 用途 | 舉例 |
|---|---|---|
| `entity_type` | 關於「哪張表」 | `'event'`, `'order'`, `'ticket'` |
| `entity_id` | 那張表的「哪一筆」 | UUID |
| `action` | 做了什麼 | `'DELETE'`, `'CANCEL'`, `'EDIT'` |
| `status` | 進度（不需審核為 NULL） | `'pending'`, `'approved'`, `NULL` |
| `reason` | 為什麼做 | `'活動無法如期舉辦'` |
| `applier_id/type` | 誰申請的 + 去哪張表查 | member UUID + `'member'` |
| `reviewer_id/type` | 誰審核的 + 去哪張表查 | user UUID + `'user'` |
| `notes` | 備註 | `'已確認無訂單，核准刪除'` |
| `details` | JSON 額外資訊 | `{"old_amount": 1000, "new_amount": 800}` |
| `created_at` | 發生時間 | `2025-02-21 14:30:00` |

### 議題一 Q&A

#### Q1: applier_type / reviewer_type 有必要嗎？

**有必要。** TryBothAuth 是 runtime（API 請求的當下），type 欄位是 query time（三個月後讀 log）。不存下來就要每次查兩張表。

```go
// 沒有 type → 查兩張表
member, _ := memberRepo.GetByID(log.ApplierID)
if member == nil { user, _ := userRepo.GetByID(log.ApplierID) }

// 有 type → 直接知道去哪查
switch log.ApplierType {
case "member": memberRepo.GetByID(log.ApplierID)
case "user":   userRepo.GetByID(log.ApplierID)
}
```

UUID v4 碰撞機率 1/2.71 × 10^18，type 的目的不是防碰撞，是查詢效率和語意清晰。

#### Q2: 純紀錄的 NULL 欄位有差嗎？

**幾乎沒差。** MySQL InnoDB 的 NULL 每欄位只佔 1 bit，100 萬筆 < 1 MB。NULL 比空字串還省空間。我們的查詢模式不會踩到 NULL 效能陷阱。

#### Q3: entity_type + entity_id vs 獨立外鍵欄位

**用 entity_type + entity_id。** 兩個欄位搞定，不管幾種實體都不用改 schema。獨立 FK 每多一個實體就要 ALTER TABLE，一堆 NULL 欄位。Laravel、Rails、Django 都用多態關聯。

#### Q4: 表名討論

**已確定用 `action_log`。**

| 表名 | 語意 | 適合 | 結論 |
|---|---|---|---|
| `action_log` | 操作紀錄 | 同時處理 CRUD 紀錄 + 審核 | ✅ 選這個 |
| ~~`action_request`~~ | 操作請求 | 偏審核，純紀錄不像 request | ❌ |
| ~~`approval_request`~~ | 審核請求 | 不含純紀錄的 CRUD | ❌ |
| ~~`workflow_request`~~ | 流程請求 | 太大 | ❌ |

合併 order_log 後，這張表同時有「純紀錄」（status=NULL）和「審核流程」（status=pending/approved/rejected），叫 `action_log` 涵蓋範圍最廣。

#### Q5: 為什麼不拆兩張表？（方案三的問題）

在 append-only 設計下，**一張表已經用 `status` 欄位自然區分了兩種情境**：

| 情境 | 怎麼存 |
|---|---|
| 純紀錄（訂單編輯） | `action=EDIT, status=NULL` |
| 審核流程（活動刪除） | `action=DELETE, status=pending → approved` |
| 退款流程 | `action=REFUND, status=pending → approved → success` |

拆兩張表只是多維護一套程式碼、多一層「該寫進哪張表」的判斷，沒有實質好處。

#### Q6: append-only 多筆紀錄的查詢代價

| 查詢場景 | UPDATE 做法 | append-only | 誰贏 |
|---|---|---|---|
| 查目前狀態 | `WHERE id=?` | `ORDER BY DESC LIMIT 1` | 差不多 |
| 查完整歷程 | 做不到 | `ORDER BY` 直接撈 | append-only |
| 列出所有 pending | `WHERE status='pending'` | `NOT EXISTS` 子查詢 | UPDATE |
| pending 了多久 | 做不到 | `created_at` 直接看 | append-only |

唯一變難的「列出所有 pending」可以用 View 封裝：

```sql
CREATE VIEW action_log_latest AS
SELECT a.* FROM action_log a
WHERE a.created_at = (
    SELECT MAX(b.created_at) FROM action_log b
    WHERE b.entity_type = a.entity_type
    AND b.entity_id = a.entity_id AND b.action = a.action
);
-- 之後 WHERE status='pending' 就好
```

#### Q7: Audit Log vs Approval Workflow

| | Audit Log | Approval Workflow |
|---|---|---|
| 回答 | 誰改了什麼？ | 誰提了什麼申請？通過了沒？ |
| 目的 | 事後追查 | 事前管控 |
| 欄位 | status=NULL | status=pending/approved/rejected |

**我們的活動刪除是 approval workflow**，但跟 audit log 共用同一張表（都是 append-only）。

#### Q8: 效能分析

100 萬筆 MySQL 毫秒級，千萬筆以下看維護成本不看效能：

| 資料量 | 速度（有 index） | 擔心？ |
|---|---|---|
| 10 萬筆 | 1~5ms | 不用 |
| 100 萬筆 | 5~20ms | 不用 |
| 1000 萬筆 | 看查詢 | 加 partition |

#### Q9: order_log vs 活動刪除請求差異

| | order_log | 活動刪除（新） |
|---|---|---|
| 狀態流轉 | 無 | pending → approved/rejected |
| 操作者 | operator_id | applier + reviewer |
| 實體範圍 | 只有 order | 通用 |

#### Q10: Redgate 的 "generic" 是什麼意思？

**Shadow Table** — 每張表配一張 log 表，修改時複製整列。
**Generic Table** — 所有 log 一張表，只記被改的欄位。
兩種都是正規做法。

### 議題一參考文獻

1. **Martin Fowler — Audit Log Pattern** — "write some record indicating what happened and when"
   https://martinfowler.com/eaaDev/AuditLog.html（[中文翻譯](martin-fowler-audit-log-translation.md)）
2. **Redgate — Database Design for Audit Logging** — Shadow Tables vs Generic Tables
   https://www.red-gate.com/blog/database-design-for-audit-logging
3. **Redgate — How to Keep Track of What the Users Do** — Traceability vs Auditability
   https://www.red-gate.com/blog/database-design-how-to-keep-track-of-what-the-users-do/
4. **Budibase — Workflow Management Database Design** — workflow engine 設計
   https://budibase.com/blog/data/workflow-management-database-design/（[中文翻譯](budibase-workflow-database-design-translation.md)）
5. **Patrick Karsh — Polymorphic Associations** — entity_type + entity_id 模式
   https://patrickkarsh.medium.com/polymorphic-associations-database-design-basics-17faf2eb313
6. **GitLab — Polymorphic Associations** — "you always need to filter using both columns"
   https://docs.gitlab.com/development/database/polymorphic_associations/
7. **luoyangpeng/action-log** — Laravel 套件，驗證 `action_log` 命名為業界慣例
   https://github.com/luoyangpeng/action-log
8. **DZone — Building SOLID Databases** — SRP 原則
   https://dzone.com/articles/building-solid-databases-0
9. **NULL 相關**：[SQL Sunday](https://sqlsunday.com/2019/01/03/nullable-columns-and-performance/) / [MySQL IS NULL](https://dev.mysql.com/doc/refman/8.4/en/is-null-optimization.html) / [DbVisualizer](https://www.dbvis.com/thetable/mysql-nullable-columns-everything-you-need-to-know/) / [Leapcell](https://leapcell.io/blog/the-silent-killer-understanding-null-s-impact-on-database-performance)
10. **Polymorphic 相關**：[DoltHub](https://www.dolthub.com/blog/2024-06-25-polymorphic-associations/) / [Hashrocket](https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database) / [MSSQLTips](https://www.mssqltips.com/sqlservertip/8149/polymorphic-associations-sql-server-foreign-keys/) / [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier)

---

## 議題二：資料表改名與遷移 SOP

### 問題

把 `order_log` 改名為 `action_log` + 加欄位，遷移期間使用者還在用系統，新資料會不會漏掉？

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
1. 公告維護時間（凌晨 2:00 ~ 2:30）
2. 關閉服務（我們是用AWS，所以要關閉EC2?）
3. 跑遷移腳本（ALTER TABLE / 資料搬移）
4. 驗證資料（row count 比對）
5. 部署新版程式碼 → 重啟服務
```

**26 筆資料 < 1 分鐘搞定。**

### 方案 B：雙寫（Dual Write）— 不停機

```
階段 1：建新表，程式碼同時寫舊表和新表
階段 2：背景 backfill 舊資料
階段 3：驗證 → 切換只讀寫新表 → 刪舊表
```

零停機但 over-engineering。

### 方案 C：Shadow Table + 觸發器 — 不停機

```
階段 1：建新表 + 在舊表建 TRIGGER
階段 2：backfill + 驗證
階段 3：RENAME TABLE 原子切換 → 移除 TRIGGER
```

零停機，TRIGGER 確保不漏資料，但同樣 over-engineering。

### 建議

**方案 A（停機）就好。** 26 筆資料，凌晨 5 分鐘搞定。

如果未來資料量大了（幾十萬筆以上），再考慮方案 B/C。關鍵：backfill 分批跑、驗證 row count、保留回滾方案。

### 議題二 Q&A

#### Q1: 如果選「不動 order_log，直接建新表」呢？

連停機都不需要：新表是全新的，部署新程式碼就開始用，零風險。

### 議題二參考文獻

1. **InfoQ — Shadow Table Strategy** — TRIGGER + atomic RENAME
   https://www.infoq.com/articles/shadow-table-strategy-data-migration/
2. **Coffee Bytes — Zero Downtime Migrations**
   https://coffeebytes.dev/en/databases/zero-downtime-migrations-shadow-table-strategy-explained/
3. **GitLab — Avoiding Downtime in Migrations** — "Adding columns is inherently safe"
   https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/
4. **GitLab — Rename Table Without Downtime** — 用 database view 相容舊程式碼
   https://docs.gitlab.com/ee/development/database/rename_database_tables.html
5. **LaunchDarkly — Zero-Downtime Database Migrations**
   https://launchdarkly.com/blog/3-best-practices-for-zero-downtime-database-migrations/

---

## 延伸閱讀

- [Centralized Error/System Log 設計](centralized-error-log.md) — 跟業務 action log 不同的系統錯誤紀錄
