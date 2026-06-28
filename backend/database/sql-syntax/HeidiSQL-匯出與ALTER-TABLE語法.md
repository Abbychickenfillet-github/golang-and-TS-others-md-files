---
title: HeidiSQL 匯出查詢結果 與 ALTER TABLE 語法
type: topic-note
source: Gemini
category: 技術
tags: [gemini, SQL, HeidiSQL, ALTER-TABLE, 資料庫]
sources:
  - https://gemini.google.com/app/02196625daafd10f
updated: 2026-06-26
---

# HeidiSQL 匯出查詢結果 與 ALTER TABLE 語法

> 此筆記只抽取對話中的「可重複使用技術知識」；對話另含 futuresign 專案的業務討論與 LINE 訊息潤飾，屬專案瑣事，未納入。

## 重點整理

### HeidiSQL：匯出「查詢結果」≠「SQL 匯出」
<mark style="background: #FF5582A6;">「SQL 匯出」功能不能用來匯出 SELECT 跑出來的結果網格</mark>——它是用來匯出<mark style="background: #ADCCFFA6;">資料庫結構與資料表內容（資料庫物件）</mark>的。

要匯出底部「結果」標籤頁看到的查詢結果，正確做法是<mark style="background: #BBFABBA6;">在結果網格上按右鍵 →「匯出網格行（Export grid rows）」</mark>：

1. 在「查詢」頁執行 `SELECT`，結果顯示在底部「結果」區。
2. 要部分匯出就拖曳選取幾行；要全部則不必選。
3. 在結果網格<mark style="background: #FFF3A3A6;">按右鍵 → 匯出網格行</mark>。
4. 設定格式：<mark style="background: #FFF3A3A6;">CSV</mark>（易用 Excel/程式讀）或 HTML/Excel；勾選<mark style="background: #BBFABBA6;">「包含列標題 Include column headers」</mark>（強烈建議，否則不知欄位是什麼）。

### ALTER TABLE：新增欄位 `ADD COLUMN`
語法：`ALTER TABLE [表名] ADD COLUMN [欄名] [型態] [約束] [位置];`

```sql
-- 新增 VARCHAR 欄位,放在 price_per_unit 之後
ALTER TABLE `future_sign`.`electricity_calculation_rule`
ADD COLUMN `spec_name` VARCHAR(50) NULL AFTER `price_per_unit`;
```

- <mark style="background: #ADCCFFA6;">`AFTER 欄名`</mark> 指定新欄位插在哪個欄位之後。
- 用 `VARCHAR(n)` 存放文字規格說明（例如 `0.5KW`、`110V15A`）。

### ALTER TABLE：欄位改名 `CHANGE COLUMN`
```sql
-- 把 amper 改名為更語意化的 spec_name
ALTER TABLE `future_sign`.`electricity_calculation_rule`
CHANGE COLUMN `amper` `spec_name` VARCHAR(50) NULL DEFAULT NULL;
```
<mark style="background: #FF5582A6;">`CHANGE COLUMN` 改名時必須重寫完整型態定義</mark>（`VARCHAR(50) NULL DEFAULT NULL`），不能只給新名字。

### INSERT INTO ... VALUES 的欄位順序陷阱
使用 <mark style="background: #FF5582A6;">`INSERT INTO 表 VALUES (...)` 省略欄位列表</mark>時，VALUES 內的值<mark style="background: #FFF3A3A6;">必須與資料表「當前的欄位順序」完全一致</mark>，不能缺漏或錯位。所以每次 `ALTER TABLE` 改了欄位（新增/改名/換位）後，舊的 INSERT 語句都要跟著重排。
（較安全的寫法是明寫欄位列表：`INSERT INTO 表 (col1, col2, ...) VALUES (...)`。）

### 補充：命名建議
描述「品項/規格」的欄位，避免含糊的 `electricity_name`，改用中性具體的 `item_name`／`rule_name`／`spec_name`，並讓「費用規則表」與「實際申請表」<mark style="background: #FFF3A3A6;">職責分離</mark>，用 `rule_id`/`item_id` 外鍵關聯。

## 各對話來源

### HeidiSQL 匯出資料庫 SQL 檔案（2026-06）— https://gemini.google.com/app/02196625daafd10f

**使用者：** 我們要怎麼在 HeidiSQL 匯出底下搜尋結果？

**Gemini：** 在 HeidiSQL 中不能用「SQL 匯出」功能來匯出查詢結果（SELECT 後底下的表格）——「SQL 匯出」是用來匯出資料庫結構和資料表內容（資料庫物件）。要匯出底部「結果」標籤頁的查詢結果，須用「匯出網格行（Export grid rows）」：①執行 SELECT，結果顯示在底部；②要部分匯出就拖曳選取，全部則不選；③在結果網格按右鍵 →「匯出網格行」；④設定格式（CSV 易於 Excel/程式讀，或 HTML/Excel），檔名，勾選「包含列標題」（強烈建議）。

**使用者：** 也可以幫我新增 amper 這個 column，用來輔助說明品項的名稱。

**Gemini：** 新增 VARCHAR 欄位最合適。`ALTER TABLE … ADD COLUMN \`amper\` VARCHAR(50) NULL AFTER \`price_per_unit\`;`。注意用 `INSERT INTO table VALUES (...)` 省略欄位列表時，VALUES 的值必須與資料表當前欄位順序完全一致。

**使用者：** 我的取名好奇怪，要叫 electricity_name 還是 add_on_…？

**Gemini：** 不建議 electricity_name（與 amper 功能重疊）。建議用 item_name／rule_name／spec_name 等中性具體詞；並把「費用規則表」與「實際申請表（如 power_add_on_application）」職責分離，用 rule_id/item_id 外鍵關聯。可先把 amper 改名：`ALTER TABLE … CHANGE COLUMN \`amper\` \`spec_name\` VARCHAR(50) NULL DEFAULT NULL;`。

**使用者：** field 是什麼？（資料表結構圖中）

**Gemini：** 在結構圖中 Field（欄位）是佔位符／列標題，表示「這裡還要一個欄位」或提示第一列是 Column Name、第二列是 Data Type，是需要被替換掉的暫時文字，不是標準 SQL 資料型態。中介庫存表建議補上 stock_count(INT)、unit_price(DECIMAL) 等實際欄位與 PK/FK 屬性。

（本對話另含綠界 ECPay 特店分潤金流、小米/紅米內建筆記因 SQLite＋Android 沙盒無法直接資料夾同步、需改用 Markor＋Syncthing/FolderSync 同步到 Obsidian 等延伸討論，以及多則給業主的 LINE 訊息潤飾——屬專案/工具瑣事，未納入本技術筆記。）
