---
title: Axios vs Fetch：回應物件、解構賦值與錯誤處理
type: topic-note
source: Gemini
tags: [gemini, axios, fetch, HTTP, 錯誤處理, API設計, PostgreSQL]
sources:
  - https://gemini.google.com/app/a6fe9c00516e0e84
updated: 2026-07-01
---

# Axios vs Fetch：回應物件、解構賦值與錯誤處理

## 重點整理

### 1. pg `pool.query()` 回傳的結果物件
用 `pg`（Node.js PostgreSQL library）執行查詢後，回傳的是一個<mark class="b">結果物件 (Result)</mark>，常用屬性：

- <mark class="y">`rows`：查詢結果的資料列陣列（最常用）</mark>
- `rowCount`：影響／回傳的資料列總數
- `command`：執行的 SQL 指令（`'SELECT'`、`'INSERT'`…）
- `oid`：物件識別碼

```javascript
const result = await pool.query('SELECT id, name FROM users WHERE id < 3');
// result 長這樣：
// { rows:[{id:1,name:'張小華'},{id:2,name:'林小君'}], rowCount:2, command:'SELECT', oid:0 }

// 解構賦值：直接從物件取出需要的屬性
const { rows, rowCount, command } = result;
```

<mark class="p">`oid: 0` 是什麼？</mark> OID 是 PostgreSQL 早期用來識別資料庫物件的 4-byte 內部編號。像 `SELECT` 這種只讀查詢不會產生新物件，所以 `oid` 預設為 0。<mark class="v">現代開發幾乎用不到它，看到 0 不用理會，專注在 `rows` 就好。</mark>

### 2. API 回傳結構：扁平 vs 巢狀
`res.json({ data: users[0] })`（扁平）vs `res.json({ data: { user: users[0] } })`（巢狀）：

| 寫法 | 優點 | 缺點 |
|---|---|---|
| `data: users[0]`（扁平） | 前端 `response.data` 直接拿，最簡潔 | <mark class="r">語義不明確、未來難擴充（無法再塞 permissions／role）</mark> |
| `data: { user: ... }`（巢狀） | <mark class="g">語義清楚、命名一致（單數 user／複數 users）、易擴充</mark> | 前端多一層 `.user` |

<mark class="y">取捨核心：一致性／可擴充 ↔ 簡潔。功能單純就扁平避免過度設計；要留擴充彈性就巢狀。</mark>

### 3. Fetch vs Axios 核心差異
<mark class="b">fetch</mark>：瀏覽器原生、低階。回傳的 `response` 是**串流 (stream)**，資料還沒解析 → <mark class="r">必須手動 `await response.json()`</mark>；而且<mark class="r">只有網路層錯誤（斷網）才會 reject，收到 404／500 仍算成功，要自己檢查 `response.ok`。</mark>

<mark class="b">axios</mark>：高階函式庫，把 fetch 的麻煩都包好了：
- <mark class="g">自動解析 JSON，直接用 `response.data` 拿到物件</mark>
- <mark class="g">4xx／5xx 會自動 throw，可以直接在 `try...catch` 統一處理</mark>
- 攔截器 (interceptors)：全域自動加 Token、遇 401 自動導向登入
- 內建取消請求（fetch 要搭 `AbortController`）

```javascript
// fetch：手動解析
const res = await fetch(url);
if(!res.ok) throw new Error(res.status);   // 要自己判斷
const data = await res.json();

// axios：自動解析、自動丟錯
const res = await axios.get(url);
const data = res.data;
```

<mark class="r">陷阱：`data = response.data ?? response.json()` 不能通用！</mark> 因為 fetch 的 response 沒有 `.data`、axios 的 response 沒有 `.json()`。兩者都回 Promise，但 <mark class="y">resolve 後的物件結構不同：fetch 資料在物件「內部」要呼叫方法取；axios 資料已解析好放在 `.data`。</mark>`Promise.resolve()` 只是包一層外層 Promise 狀態，不會改變內層物件結構。

### 4. 不寫 `catch(error)` 會怎樣？
- <mark class="r">語法層面：`try` 一定要配 `catch` 或 `finally`，否則直接 SyntaxError 無法執行。</mark>
- <mark class="r">後端完全沒 try-catch：DB 斷線 → UnhandledPromiseRejection → 整台 Node 伺服器 crash。</mark>
- 後端有 catch 但忘了 `res.json()` 回應：<mark class="p">前端請求一直卡在 Pending，直到瀏覽器逾時，Loading 圈圈轉不停。</mark>
- 前端不 catch：axios 遇 500 自動 throw，程式中斷 → `setUsers()` 不會執行 → Loading 卡死、Console 一堆 `Uncaught (in promise)`。

<mark class="g">正確後端防禦寫法：</mark>
```javascript
try {
  const { rows } = await pool.query(sql);
  res.json({ data: rows });
} catch (error) {
  console.error(error);                              // 給工程師看的 log
  res.status(500).json({ status:'error', message:'伺服器內部錯誤' }); // 給前端的交代
}
```

<mark class="v">一句話：寫 catch 不是為了阻止錯誤發生，而是讓錯誤發生時能優雅收拾（後端回 500、前端跳提示），不至於整個系統瞬間崩潰。</mark>

## 各對話來源

### Axios 前後端使用指南（2026-06）— https://gemini.google.com/app/a6fe9c00516e0e84

**使用者：**

把 `pool.query()` 回傳的 rows／rowCount／command／oid 用程式碼寫給我看，並轉成可直接貼進 Obsidian 的 markdown。

**Gemini：**

`pool.query()` 回傳一個包含 `rows`、`rowCount`、`command`、`oid` 的結果物件，可用解構賦值取出需要的屬性：

```javascript
const result = await pool.query('SELECT id, name FROM users WHERE id < 3');
console.log(result);
// { rows:[{id:1,name:'張小華'},{id:2,name:'林小君'}], rowCount:2, command:'SELECT', oid:0 }
const { rows, rowCount, command } = result;
```

**使用者：**

oid: 0 是什麼？

**Gemini：**

OID 是 PostgreSQL 早期用來唯一識別資料庫物件的 4-byte 編號。SELECT 這種只讀查詢不會產生新物件，所以 oid 預設為 0；現代開發幾乎用不到，可忽略。

**使用者：**

為什麼要把 `data: { user: users[0] }` 改成 `data: users[0]`？（紅色是刪除、綠色是保留）

**Gemini：**

這是「扁平 vs 巢狀」的取捨。扁平（`data: users[0]`）讓前端 `response.data` 直接拿、最簡潔，但語義較不明確且未來難擴充；巢狀（`data: { user }`）語義清楚、命名一致、易擴充，但多一層 `.user`。功能單純傾向扁平（避免過度設計），要保留擴充彈性就用巢狀。

**使用者：**

那 axios 也是 response.json 嗎？可以寫 `data = response.data ?? response.json()` 嗎？

**Gemini：**

不行。fetch 是低階 API，response 是串流，要手動 `await response.json()`；axios 是高階函式庫，會自動解析 JSON 放在 `response.data`。兩者都回 Promise，但 resolve 後的物件結構不同：fetch 的 response 沒有 `.data`，axios 的 response 沒有 `.json()`，所以那個 `??` 寫法對任一個都會壞掉，專案要擇一貫徹。

axios 的額外便利：自動解析 JSON、4xx／5xx 自動 throw（fetch 要自己檢查 `response.ok`）、攔截器自動加 Token、內建取消請求。

**使用者：**

catch(error) 不寫會怎樣？

**Gemini：**

1) 語法：try 一定要配 catch 或 finally，否則 SyntaxError。
2) 後端沒 try-catch：DB 斷線觸發 UnhandledPromiseRejection，整台 Node crash。
3) 後端有 catch 但沒 `res.json()`：前端一直 Pending 到逾時，Loading 卡住。
4) 前端不 catch：axios 遇 500 自動 throw，後續 setState 不執行，畫面卡死、Console 滿是 Uncaught。

正確後端寫法是 catch 裡 `console.error(error)` + `res.status(500).json({...})`。寫 catch 是為了錯誤發生時能優雅收拾，而不是阻止錯誤。
