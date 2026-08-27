---
title: "PostgreSQL 資料庫大小怎麼看｜pgAdmin 4 的 Statistics 分頁與 pg_database_size 系列函式"
type: topic-note
source: Gemini
tags: [gemini, postgresql, pgadmin, pg_database_size, pg_size_pretty, disk-usage, dba, SQL]
sources:
  - https://gemini.google.com/app/fe6c10520e914f33
updated: 2026-08-27
---

# PostgreSQL 資料庫大小怎麼看

> [!info] 本篇重點 a–n 共 14 個
> 兩條路：<mark style="background: #FFF3A3A6;">點界面（pgAdmin 4 的 Statistics 分頁）</mark> 與 <mark style="background: #FFF3A3A6;">下 SQL（`pg_database_size` 家族）</mark>。後者才是能寫進監控腳本的那一種。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 呼應 [[SQL-Join-Inner-Left-Right-主表判定與資料保留]]：同一個 SQL 資料夾底下的姊妹篇，那篇談查詢語意，本篇談維運面的「這個庫到底多肥」。
> **b.** 呼應 [[PostgreSQL-Checkpoint與SIGTERM-Docker停止機制]]（在 Abby-notes 根目錄）：那篇講 PostgreSQL 什麼時候把資料真正寫到磁碟，本篇量的正是那些落地檔案的體積，兩篇是同一件事的因與果。
> **c.** 呼應 [[C槽空間清理SOP]] 與 [[Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉]]：<mark style="background: #FF5582A6;">C 槽爆掉時，跑在 Docker 裡的 PostgreSQL 常常是隱形兇手之一</mark>，本篇的查詢就是用來抓它的，可以接在那份 SOP 的排查清單後面。
> **d.** `pg_indexes_size` 會告訴你索引佔了多少，很多時候索引比資料本身還大，這條線可以接回同層的 [[SQL-Join-Inner-Left-Right-主表判定與資料保留]]——JOIN 效能好不好，跟索引有沒有建對、建了多少直接相關。

---

## 重點整理

### 一、用 pgAdmin 4 點出來（e–g）

**e.** <mark style="background: #BBFABBA6;">最快的路徑：左側 Object Explorer 點選你的資料庫 → 主面板切到「Statistics」分頁</mark>。裡面會有一列 Size。

**f.** <mark style="background: #FF5582A6;">「Properties」分頁看不到大小</mark>。Properties 是「這個物件的設定」（擁有者、編碼、Tablespace、權限），Statistics 才是「這個物件目前的統計數據」。這場對話裡 Gemini 兩邊講來講去，就是卡在這個分別。

| pgAdmin 分頁 | 顯示什麼 |
|---|---|
| Properties | 物件的定義與設定（Owner、Encoding、Collation、Tablespace） |
| **Statistics** | **物件的即時統計數據，資料庫層級包含 Size** |
| SQL | 這個物件對應的 DDL |
| Dependencies / Dependents | 相依關係 |

**g.** <mark style="background: #D2B3FFA6;">小提醒：Statistics 顯示的統計資料會依「你選的是哪種物件」而不同</mark>。選 Server 看到的是連線與交易統計，選 Database 才有 Size，選 Table 則會有 tuple 數、seq scan 次數這些。

---

### 二、下 SQL 才是正解（h–l）

界面只能點一個看一個，<mark style="background: #BBFABBA6;">要排序、要寫進監控、要一眼看出誰最肥，就得下 SQL</mark>。

**h.** 單一資料庫：

```sql
SELECT pg_size_pretty(pg_database_size('future_sign_prod'));
```

| 片段 | 意思 |
|---|---|
| `pg_database_size(name)` | 內建函式。吃資料庫的名稱或 OID，回傳它佔用的**總磁碟位元組數**（`bigint`）。需要對該資料庫有 CONNECT 權限，預設是有的 |
| `pg_size_pretty(bigint)` | 把一坨位元組數字格式化成人看得懂的 `kB` / `MB` / `GB` / `TB` 字串 |

**i.** <mark style="background: #FFF3A3A6;">所有資料庫排行榜（維運最常用的一句）</mark>：

```sql
SELECT datname AS 資料庫,
       pg_size_pretty(pg_database_size(datname)) AS 大小
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;
```

| 片段 | 意思 |
|---|---|
| `pg_database` | 系統目錄（system catalog）表，一列一個資料庫 |
| `datname` | 資料庫名稱欄位（`dat` 是 database 的縮寫慣例） |
| `datistemplate = false` | 濾掉 `template0` / `template1` 這兩個建庫用的範本 |
| `ORDER BY pg_database_size(datname) DESC` | <mark style="background: #FF5582A6;">排序要用**原始 bigint**，不能用 `pg_size_pretty` 的結果</mark>——那是字串，排出來會變成「9 MB 比 10 GB 大」的字典序笑話 |

**j.** 揪出最肥的表（含索引）：

```sql
SELECT schemaname || '.' || relname AS 資料表,
       pg_size_pretty(pg_total_relation_size(relid)) AS 總大小,
       pg_size_pretty(pg_relation_size(relid))       AS 資料,
       pg_size_pretty(pg_indexes_size(relid))        AS 索引
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

**k.** 各函式的分工（<mark style="background: #ADCCFFA6;">這張表是本篇最該記的</mark>）：

| 函式 | 量的是什麼 |
|---|---|
| `pg_database_size` | 整個資料庫佔用的總磁碟空間 |
| `pg_total_relation_size` | 一張表 + 它所有的索引 + TOAST。等於 `pg_table_size` + `pg_indexes_size` |
| `pg_table_size` | 只有表本身（含 TOAST、free space map、visibility map），不含索引 |
| `pg_relation_size` | 單一 fork 的大小，預設是主資料檔，不含 TOAST 也不含索引 |
| `pg_indexes_size` | 這張表所有索引的總和 |
| `pg_column_size` | 單一欄位值的儲存大小（含壓縮後） |
| `pg_size_pretty` | 純粹的格式化工具，把 bytes 轉成人話 |

**l.** <mark style="background: #FFB8EBA6;">為什麼「刪了資料大小卻沒變小」</mark>：PostgreSQL 用 MVCC（Multi-Version Concurrency Control，多版本並行控制），`DELETE` 只是把 tuple 標成死掉（dead tuple），空間仍留在檔案裡等 autovacuum 回收成可再用空間，<mark style="background: #FF5582A6;">但不會還給作業系統</mark>。要真正縮檔案得跑 `VACUUM FULL`（會鎖表、需要等量的額外磁碟空間）或用 `pg_repack`。

---

### 三、Docker 裡的 PostgreSQL 另外量（m–n）

**m.** 如果 PostgreSQL 跑在容器裡，除了問資料庫本身，也要問 Docker：

```bash
# 進容器下 SQL
docker exec -it <容器名> psql -U postgres -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# 看 volume 實際佔多少
docker system df -v
```

**n.** <mark style="background: #ADCCFFA6;">兩個數字通常對不起來，這是正常的</mark>：`pg_database_size` 只算資料庫的資料檔，不含 WAL（Write-Ahead Log，預寫式日誌）、不含其他資料庫、也不含容器的映像層。C 槽爆掉時，WAL 堆積往往才是主因。

---

## ⚠️ 存疑／更正

<mark style="background: #FF5582A6;">這場對話的品質很差，判讀時要小心。</mark>使用者是用語音輸入，辨識出來的句子（「這個是 PG 的迷思」「熱死掉，沒有頭大」）本身語意不明，Gemini 的四次回覆有三次在生成到一半就被截斷。

| Gemini 說法 | 查證後 | 說明 |
|---|---|---|
| 第一次：「點資料庫 → 選 Statistics 分頁」 | ✅ 正確 | 這是對的答案，但句子被截斷在「then, select the "Statistics" tab in the main panel—」 |
| 第二次：「你需要去 Object Explorer 找到你的 server⋯⋯」 | ⚠️ 方向被帶偏 | 資料庫大小要選**資料庫**節點，不是 server 節點。選 server 的 Statistics 看到的是連線與交易統計 |
| 第三次：「右鍵資料庫 → Properties 可以看資料庫屬性」 | ⚠️ 答非所問 | Properties 沒有 Size 欄位。這是被使用者那句辨識錯誤的「Set up properties」帶歪的 |
| 全程沒提到任何 SQL 函式 | 最大的缺漏 | `pg_database_size` 加 `pg_size_pretty` 才是真正該教的答案，本篇已補上 |

---

## 練習題（延伸）

資料庫容量查詢屬於 DBA 維運題，LeetCode 的 Database 分類考的是查詢邏輯而非系統目錄，沒有直接對應題。相近的手感練習：

| 題目 | 連結 | 為什麼相關 |
|---|---|---|
| 1173. Immediate Food Delivery I | https://leetcode.com/problems/immediate-food-delivery-i/ | 練「先算原始值再格式化」的順序感，跟本篇 i 節那個排序陷阱是同一種思路 |
| 1795. Rearrange Products Table | https://leetcode.com/problems/rearrange-products-table/ | 練從系統性的表結構抽資料 |
| LeetCode Database 題庫 | https://leetcode.com/problemset/database/ | 整體 SQL 手感 |

---

## 各對話來源（原文）

### 〈How to Check Database Size in pgAdmin 4〉（2026 年）— <https://gemini.google.com/app/fe6c10520e914f33>

**使用者：**（語音輸入，辨識結果不完整）的資料庫的。大小在哪裡看？⋯⋯資料庫的大小要在哪裡看？這個是 PG 的迷思。
**Gemini：** To check the database size in pgAdmin 4, first click on your database name in the Object Explorer on the left. Then, select the "Statistics" tab in the main panel—（截斷）

**使用者：** 我覺得一定夠誒。
**Gemini：** To see the database size, you'll need to go to your server in the Object Explorer, find—（截斷）

**使用者：** Set up properties.
**Gemini：** It looks like you're setting up properties in pgAdmin. You can check the database properties by right-clicking on your database in the Object Explorer and selecting "Properties."

**使用者：** 熱死掉，沒有頭大。
**Gemini：** The general Properties —（截斷）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/fe6c10520e914f33 | 2026-08-27 讀取 |
| PostgreSQL 官方文件 — Database Object Size Functions | https://www.postgresql.org/docs/9.4/functions-admin.html | 2026-08-27 查證（函式簽章自 8.1 起沿用至今） |
| PostgreSQL Wiki — Disk Usage（各種容量查詢的完整 SQL 範本） | https://wiki.postgresql.org/wiki/Disk_Usage | 2026-08-27 查證 |
| PostgreSQL Wiki — Schema Size | https://wiki.postgresql.org/wiki/Schema_Size | 2026-08-27 查證 |
| pgAdmin 4 官方文件 — Tabbed Browser（Statistics 分頁的定義） | https://www.pgadmin.org/docs/pgadmin4/latest/tabbed_browser.html | pgAdmin 4 9.17，2026-08-27 查證 |
