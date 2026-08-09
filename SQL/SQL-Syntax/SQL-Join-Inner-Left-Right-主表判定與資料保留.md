---
title: SQL Join 全解—Inner／Left／Right 的主表判定與資料保留規則
type: topic-note
source: Gemini
tags: [gemini, sql, join, inner-join, left-join, right-join, database]
sources:
  - https://gemini.google.com/app/529ed8bfb811e1c6
updated: 2026-08-08
---

# SQL Join 全解—Inner／Left／Right 的主表判定與資料保留規則

> 🔖 本篇重點索引：a–n，共 14 個。

## 重點整理

**(a)** <mark style="background: #ADCCFFA6;">Join 的本質</mark>：把兩張（或以上）資料表，依照某個共通欄位（Key，鍵）做<mark style="background: #FFF3A3A6;">橫向合併</mark>。想像拼圖——Join 就是找到拼塊邊緣並接合的過程。注意是「加寬欄位」而不是「加長列數」的合併，這點跟 `UNION`（縱向疊加）完全不同。

**(b)** <mark style="background: #FFF3A3A6;">Inner Join 與 Left Join 的唯一差別</mark>：<mark style="background: #ADCCFFA6;">對待「不匹配資料」的方式</mark>。

- Inner Join（內聯結）＝交集：只保留兩張表都有出現的資料，A 表某列在 B 表找不到對應就整列消失。
- Left Join（左外部聯結）＝以左表為主：保留左表<mark style="background: #BBFABBA6;">全部</mark>資料，右表沒對應時，右表的欄位補 `NULL`。

**(c)** <mark style="background: #FF5582A6;">Inner Join 沒有「主表」的概念</mark>：因為結果是交集，把 `Students` 放左邊或把 `Grades` 放左邊，最終列數完全一樣，兩表地位對等。

**(d)** <mark style="background: #ADCCFFA6;">語法位置上的稱呼（跟主從無關）</mark>：寫在 `FROM` 後面的叫<mark style="background: #FFF3A3A6;">左表（Left Table）</mark>，寫在 `JOIN` 後面的叫<mark style="background: #FFF3A3A6;">右表（Right Table）</mark>。這只是「位置」的稱呼，只有在 Outer Join 才會升格成「主表」。

**(e)** <mark style="background: #BBFABBA6;">主表判定口訣（考自己用）</mark>：

| Join 類型 | 誰是主表 | 主表的保證 |
|---|---|---|
| `INNER JOIN` | 沒有主表，兩表對等 | 只有交集才出現 |
| `LEFT JOIN` | `FROM` 後面那張（左表） | 左表每一筆都保證出現 |
| `RIGHT JOIN` | `JOIN` 後面那張（右表） | 右表每一筆都保證出現 |

**(f)** <mark style="background: #FFB8EBA6;">實戰範例—學生與成績</mark>：

```sql
-- 只會列出「有成績」的學生，沒考試的人整列消失
SELECT * FROM Students
INNER JOIN Grades ON Students.id = Grades.student_id;

-- 會列出「所有」學生，沒成績的人 Grades 相關欄位是 NULL
SELECT * FROM Students
LEFT JOIN Grades ON Students.id = Grades.student_id;
```

**(g)** <mark style="background: #ADCCFFA6;">Inner Join 的顯示邏輯，就是一道過濾器</mark>：不管是「學生沒參加考試（Grades 表裡根本沒有那個 `student_id`）」還是「成績級距沒填」，只要 `ON Students.id = Grades.student_id` 這個條件不成立，該名學生就<mark style="background: #FF5582A6;">完全不會出現</mark>在結果中。

**(h)** <mark style="background: #BBFABBA6;">Left Join 的顯示規則</mark>：學生有成績就正常顯示 A／B／C；學生沒成績時，<mark style="background: #FFF3A3A6;">主表（學生）依然出現在清單上</mark>，只有從表（成績）的欄位自動補 `NULL`。

**(i)** <mark style="background: #FFF3A3A6;">Left 與 Right 的關係—只是方向不同</mark>：邏輯完全一樣，差別只在「誰當主角」。用文氏圖（Venn Diagram）記——`A LEFT JOIN B` 是圓圈 A 完整、B 只取重疊；`A RIGHT JOIN B` 是圓圈 B 完整、A 只取重疊。

```sql
-- 情境 A：想列出「所有學生」，看他們參加什麼社團 → 學生是主角
SELECT Students.name, Clubs.club_name
FROM Students
LEFT JOIN Clubs ON Students.club_id = Clubs.id;

-- 情境 B：想列出「所有社團」，看裡面有哪些學生 → 社團是主角
SELECT Students.name, Clubs.club_name
FROM Students
RIGHT JOIN Clubs ON Students.club_id = Clubs.id;
```

**(j)** <mark style="background: #D2B3FFA6;">為什麼工程師幾乎不用 Right Join</mark>：因為 `A RIGHT JOIN B` 的結果<mark style="background: #BBFABBA6;">完全等於 `B LEFT JOIN A`</mark>，而人類閱讀習慣是從左到右。實務上會把「最重要的主表」寫在 `FROM` 後面，然後一路 `LEFT JOIN` 下去，程式碼比較好讀。

**(k)** <mark style="background: #FF5582A6;">陷阱一—資料膨脹（Row Multiplication）</mark>：如果 Join 的 Key 不是唯一的（一對多），結果的列數會<mark style="background: #FF5582A6;">比原來的表更多</mark>。例如一個學生有五科成績，Join 之後這名學生就會出現五列。做 `SUM`／`COUNT` 前一定要先確認這件事，否則金額會莫名其妙被灌大。

**(l)** <mark style="background: #FF5582A6;">陷阱二—`WHERE` 會把 Left Join 偷偷變成 Inner Join</mark>：在 Left Join 中，如果把「右表的過濾條件」放在 `WHERE` 而不是 `ON`，因為沒對應的列右表欄位是 `NULL`，而 `NULL` 會被 `WHERE` 過濾掉，結果就退化成 Inner Join。

```sql
-- ❌ 這其實變成 Inner Join：沒成績的學生被 WHERE 濾掉了
SELECT * FROM Students
LEFT JOIN Grades ON Students.id = Grades.student_id
WHERE Grades.score > 60;

-- ✅ 想保留所有學生，過濾條件要放進 ON
SELECT * FROM Students
LEFT JOIN Grades ON Students.id = Grades.student_id AND Grades.score > 60;
```

**(m)** <mark style="background: #BBFABBA6;">實務選擇建議</mark>：

- 想算<mark style="background: #FFF3A3A6;">全班平均分數</mark> → 用 `INNER JOIN`，因為沒考的人不該算進平均。
- 想確認<mark style="background: #FFF3A3A6;">誰還沒交作業</mark> → 用 `LEFT JOIN`，列出全班之後看誰的成績欄位是 `NULL`（可再加 `WHERE Grades.student_id IS NULL` 精準抓出來）。

**(n)** <mark style="background: #D2B3FFA6;">誰放前面的效能考量</mark>：Inner Join 兩者對等時，傳統觀念會建議把「資料量較小的表」當驅動表（Driving Table，驅動資料表）以提升讀取效率。不過現代資料庫的查詢優化器（Query Optimizer）通常會自行重排執行計畫，<mark style="background: #FFB8EBA6;">實際效能還是要看 `EXPLAIN` 的執行計畫而不是寫法順序</mark>。

## 各對話來源

### SQL Join 語法筆記：Inner vs. Left（2026-08）— https://gemini.google.com/app/529ed8bfb811e1c6

<mark style="background: #FFF3A3A6;">使用者：Join 語法跟 left join 語法的關係是什麼</mark>

Gemini：說明 Join 的本質是依共通欄位橫向合併（重點 a）；用「對待不匹配資料的方式」切開 Inner Join 與 Left Join（重點 b）；附語法對照表與 Students／Grades 實戰範例（重點 f）；最後提出兩個陷阱——資料膨脹與 `WHERE` 條件位置（重點 k、l）。

<mark style="background: #FFF3A3A6;">使用者：`SELECT * FROM Students INNER JOIN Grades ON ...` 這樣主表是算 grades 還是 students</mark>

Gemini：指出 `INNER JOIN` 其實沒有嚴格意義上的主表與從表之分，因為交集邏輯讓兩表地位對等，換邊列數一樣（重點 c）；區分語法位置上的「左表／右表」稱呼（重點 d）；說明只有 Outer Join 才有主表概念（重點 e）；補充實務上決定誰放前面的兩個依據——語意邏輯與資料量級（重點 n）。

<mark style="background: #FFF3A3A6;">使用者：所以如果 Grades 這張表有級距搭配 ABCD，那 student 就是可能有值，一旦有值才會出現；如果學生也都是空的或者沒成績，那 inner join 就不會有東西列出來對吧？那 left join 就有主表從表之分嗎</mark>

Gemini：確認理解正確——Inner Join 就像一道過濾器，只要 `ON` 條件不成立該名學生完全不會出現（重點 g）；確認 Left Join 有明確的主從之分，主表一筆都不能少、從表沒對應就補 `NULL`（重點 h）；給出「門當戶對才見面 vs 就算沒對象主角也要出場」的口訣與實務場景建議（重點 m）。

<mark style="background: #FFF3A3A6;">使用者：Left Join 跟 right join 我還是不太懂</mark>

Gemini：用文氏圖說明兩者邏輯相同、只是主角方向不同（重點 i）；用 Students／Clubs 兩個情境對照 Left 與 Right 的寫法；解釋為什麼 90% 的工程師只用 `LEFT JOIN`——`A RIGHT JOIN B` 完全等於 `B LEFT JOIN A`，而人類閱讀習慣是從左到右（重點 j）。

## ⚠️ 存疑／補充

- Gemini 原始回答提到「成績級距還沒填入（Grades 欄位是空的／NULL）」時 Inner Join 也不會顯示——這個說法<mark style="background: #FF5582A6;">要看是哪個欄位是 NULL</mark>。若是 `Grades.score` 是 NULL 但 `student_id` 有對應，Inner Join <mark style="background: #BBFABBA6;">仍然會列出該列</mark>，只是 score 顯示 NULL；只有當「連結用的 Key（`student_id`）」對不上時，該列才會整個消失。本篇重點 (g) 已依此修正。
- Gemini 未提到「把過濾條件放進 `ON` 才能保留 Left Join 語意」的正確寫法，只提到陷阱本身。本篇重點 (l) 已補上正確範例。

## 資料來源（含查證時間）

> 查證日期：2026-08-08（本篇為 Gemini 依 SQL 標準行為生成的教學說明，可對照下列官方文件核實）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話原文 | [SQL Join 語法筆記：Inner vs. Left](https://gemini.google.com/app/529ed8bfb811e1c6) | 2026-08 |
| MySQL `JOIN` 語法（INNER／LEFT／RIGHT 定義） | [MySQL 8.4 Reference Manual — JOIN Clause](https://dev.mysql.com/doc/refman/8.4/en/join.html) | MySQL 8.4，官方持續更新 |
| PostgreSQL 表格聯結與 `ON` vs `WHERE` 的差異 | [PostgreSQL Documentation — Joined Tables](https://www.postgresql.org/docs/current/queries-table-expressions.html) | current 版，官方持續更新 |
| MySQL 查詢優化器與 `EXPLAIN` 執行計畫 | [MySQL — Optimizing Queries with EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/using-explain.html) | MySQL 8.4，官方持續更新 |

## 相關筆記

- [[資料庫索引與B+tree-最左字首原則]]——關聯原因：Join 的 `ON` 條件走不走索引，直接決定這次 Join 是走 Index Nested Loop 還是全表掃描；本篇 (n) 講的「誰當驅動表」在有索引時結論會完全不同，兩篇要一起看。
- [[MySQL外鍵與字元集問題筆記]]——關聯原因：Join 用的 Key 通常就是外鍵（Foreign Key）；若兩張表的字元集或定序（Collation）不同，`ON` 比對可能無法走索引甚至直接對不上，是本篇 (g) 「條件不成立整列消失」的隱藏成因之一。
- [[SQLMODEL_SA_COLUMN_EXPLANATION]]——關聯原因：用 ORM（物件關聯對映）寫查詢時，`selectinload`／`joinedload` 底層對應的就是本篇的 Inner／Left Join；理解本篇才知道 ORM 為什麼有時會少撈資料。
