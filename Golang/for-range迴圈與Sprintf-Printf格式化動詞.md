---
title: Go for-range 迴圈與 Sprintf/Printf 格式化動詞
type: topic-note
source: Gemini
tags: [gemini, golang, for-range, printf, sprintf]
sources:
  - https://gemini.google.com/app/fcfd16232e8f2777
  - https://gemini.google.com/app/d192e35488ab6a19
updated: 2026-07-27
---

# Go for-range 迴圈與 Sprintf/Printf 格式化動詞

本篇重點 a–j，共 10 個

## 重點整理

a. `for i, num := range nums` 中，`range` 對切片（Slice）會回傳兩個值：第一個是 <mark style="background: #ADCCFFA6;">索引（Index，從 0 開始）</mark>，第二個是 <mark style="background: #ADCCFFA6;">元素值（Element）</mark>。

b. 只需要值、不需要索引時，用底線 `_` 忽略索引：`for _, num := range nums`。只需要索引時可以直接省略第二個變數：`for i := range nums`。

```go
nums := []int{2, 3, 4}
for i, num := range nums {
    fmt.Printf("索引: %d, 值: %d\n", i, num)
}
// 索引: 0, 值: 2
// 索引: 1, 值: 3
// 索引: 2, 值: 4
```

c. <mark style="background: #FF5582A6;">複製陷阱（Copy Behavior）</mark>：`range` 回傳的 `num` 是原始資料的一份拷貝。在迴圈內修改 `num` 不會改變原陣列 `nums` 裡的值；要修改原陣列必須透過 `nums[i]` 操作。

d. Go 編譯器非常嚴格：宣告了變數卻沒使用會直接編譯失敗，這也是為什麼常看到用 `_` 佔位。

e. `%d`、`%s`、`%v` 都是 <mark style="background: #ADCCFFA6;">格式化預留位置（Format Specifier）</mark>，源自 C 語言家族（Go、Java、早期 Python、C++ 皆傳承此語法），依照「出現順序」對應後面的參數，跟變數名稱無關。

| 符號 | 代表意義 | 範例輸入 | 輸出結果 |
|---|---|---|---|
| %d | 整數 Integer | 100 | 100 |
| %f | 浮點數 Float | 3.14 | 3.140000 |
| %t | 布林值 Boolean | true | true |
| %T | 印出變數的型別 | nums | []int |
| %s | 字串 String | "Gemini" | Gemini |
| %v | 預設格式，自動判斷型別 | 任何東西 | 自動輸出 |

f. <mark style="background: #FF5582A6;">Decimal（`%d`）不能餵字串</mark>：型別必須與格式碼精準對應。字串塞給 `%d` 不會讓程式 panic，但會印出錯誤標記文字：

```go
name := "Gemini"
fmt.Printf("我的名字是: %d", name)
// 輸出: 我的名字是: %!d(string=Gemini)
```

原因：`%d` 的底層邏輯是直接讀取記憶體中的二進位整數並轉十進位；字串在記憶體中的儲存方式完全不同，強行讀取會解析錯誤。

g. <mark style="background: #BBFABBA6;">不確定型別時的萬用解法</mark>：用 `%v`，Go 會自動依變數型別選擇最適合的格式輸出，例如 `fmt.Printf("年紀: %v, 姓名: %v", age, name)`。

h. JavaScript 對照：JS 是弱型別語言，樣板字串 `${}` 塞什麼都會自動轉字串；Go 是強型別語言，`%d`/`%s`/`%v` 必須誠實對應資料型別。

i. `fmt.Sprintf` 不會直接印出結果，而是「回傳」一份格式化後的字串，常用於組合 URL 或訊息文字：

```go
var stockcode = "000987"
url := "Code=%s&endDate=2020-12-31"
target_url := fmt.Sprintf(url, stockcode)
// target_url = "Code=000987&endDate=2020-12-31"
```

j. 股票代碼用「字串」而非「數字」儲存的原因：數字型態會自動省略開頭的 `0`（例如 `000987` 會變成 `987`），但股票代碼、訂單編號等「代碼類」欄位通常必須保留補零，因此宣告為 `string`。

## 自我測驗

1. （填空題）`for i, num := range nums` 中，第一個回傳值是 ______，第二個回傳值是 ______。
   答案：||索引（Index）；元素值（Element）||
2. （是非題）在 for-range 迴圈中修改 `num` 會改變原陣列 `nums` 裡的值。
   答案：||✗。`num` 是原始資料的拷貝，修改它不影響原陣列，要修改需透過 `nums[i]`。||
3. （是非題）`fmt.Printf("%d", "hello")` 會讓程式編譯失敗或直接 panic。
   答案：||✗。不會編譯失敗也不會 panic，而是印出型別不符的錯誤標記文字，如 `%!d(string=hello)`。||
4. （申論題）為什麼股票代碼、訂單編號這類「代碼」欄位常常宣告成字串型別而不是數字型別？
   答案：||因為數字型態會自動省略開頭的 0（例如 000987 會變成 987），但代碼類欄位通常需要保留補零位數，用字串儲存才能維持原始格式不被自動裁切。||

## 與既有筆記的關聯

- 與 [[Golang/fmt-verbs-percent-s-w|fmt-verbs-percent-s-w]] 相關：那篇專講 `fmt.Errorf` 裡 `%w`（錯誤包裝、可用 `errors.Is`/`errors.As` 追溯）vs `%s`（純文字、丟失物件參考）的差異；本篇則是更基礎的 `%d`/%s`/`%v` 型別對應與 `Sprintf` 字串組合，兩篇合起來涵蓋 Go 格式化動詞的「基礎用法」與「錯誤處理進階用法」。
- 與資料庫索引筆記 [[backend/database/index/資料庫索引與B+tree-最左字首原則|資料庫索引與B+tree-最左字首原則]] 的「不要在 WHERE 對欄位做函數運算」原則呼應：兩者都在講「保留原始格式（字串補零 / 不做函數運算）以確保資料在資料庫或程式中被正確、可預期地處理」。

## 各對話來源（原文）

### Go 語言 for-range 迴圈解析（2026-07）— https://gemini.google.com/app/fcfd16232e8f2777

使用者：`nums := []int{2, 3, 4}` `for i, num := range nums { fmt.Printf("索引: %d, 值: %d\n", i, num) }` 這啥

Gemini：這段程式碼是 Go 語言中經典的 for-range 迴圈結構，用來遍歷切片並同時取得索引與數值。`range` 回傳兩個值：第一個是索引（從 0 開始），第二個是元素值。若只需要值可用 `_` 忽略索引；若只需要索引可省略第二個變數。`range` 回傳的元素值是原始資料的拷貝，修改它不影響原陣列，要修改需透過 `nums[i]`。

使用者：這些事在做什麼 是可以用子查詢改的嗎

Gemini：這是「陣列的迭代與處理」，屬於命令式（Imperative）過程。子查詢是 SQL 術語，程式語言中對應概念是「篩選」或「巢狀處理」；`for` 迴圈本身不叫子查詢，迴圈中再跑迴圈叫「巢狀迴圈」。

使用者：你怎麼知道 %d 是什麼

Gemini：`%d` 是格式化預留位置，源自 C 語言家族傳承的標準語法。`%d` 代表十進位整數，`%s` 代表字串，`%v` 代表萬用格式。`fmt.Printf` 依參數出現順序依序填入。

使用者：Decimal 不能用 string 一定要用 number?

Gemini：沒錯。若對字串使用 `%d`，Go 不會報錯中斷，但會印出 `%!d(string=Gemini)` 這種錯誤標記。因為 `%d` 的底層邏輯是讀取記憶體中的二進位整數並轉十進位，字串儲存方式完全不同。不確定型別時可用萬用格式碼 `%v`。

### Go 語言股票代碼字串解析（2026-07-20）— https://gemini.google.com/app/d192e35488ab6a19

使用者：最後的code 000987是啥

Gemini：`000987` 是字串型別的變數值，代表股票代碼。範例中 `var stockcode = "000987"` 宣告變數，`fmt.Sprintf` 將代碼放入 URL 字串中的 `%s` 佔位符。使用字串而非數字的原因是股票代碼開頭的 `0` 在數字型態中會被自動省略，但代碼類欄位必須保留補零。`fmt.Sprintf` 不會直接印出，而是回傳格式化後的字串。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Go for-range 迴圈語法 | https://gemini.google.com/app/fcfd16232e8f2777 | Gemini 對話，2026-07 |
| Go fmt.Sprintf/Printf 格式化動詞 | https://gemini.google.com/app/d192e35488ab6a19 | Gemini 對話，2026-07-20 |
| Go 官方 fmt 套件文件（格式化動詞定義） | https://pkg.go.dev/fmt | 查證於本筆記整理時，請以官方文件最新版為準 |

⚠️ 存疑/更正：無明顯錯誤，內容與 Go 官方 fmt 套件行為一致。
