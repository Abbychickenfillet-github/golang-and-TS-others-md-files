---
title: Hoisting：函式宣告 vs 函式表達式（TDZ）與 toFixed 比較陷阱
type: topic-note
source: Gemini
tags: [gemini, javascript, hoisting, tdz, function, toFixed]
aliases: [Hoisting-函式宣告vs函式表達式-TDZ]
sources:
  - https://gemini.google.com/app/a8283484f401c280
updated: 2026-08-04
---

# Hoisting：函式宣告 vs 函式表達式（TDZ）與 toFixed 比較陷阱

> [!info]- 📍 承接08，銜接10
> <mark style="background: #ADCCFFA6;">承接</mark>：[[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]提到Creation Phase會先做Hoisting——先把`var`／`function`宣告在環境記錄裡佔好位置，這篇專門講這件事跟TDZ的關係。
> <mark style="background: #BBFABBA6;">下一步</mark>：Creation Phase除了Hoisting，接著會用傳入的引數初始化參數位置，下一篇[[10-傳值vs傳址-賦值與記憶體空間]]講這一步真正發生的事。

> 此對話標題被自動命名為「閉包」，但實際內容是 Hoisting／TDZ 與折扣計算，故依實質內容歸檔。

### 函式宣告為什麼免疫於 TDZ？
JS 引擎在執行前有「編譯階段」。看到 <mark style="background: #ADCCFFA6;">函式宣告</mark> `function foo(){}` 時，會把<mark style="background: #FFF3A3A6;">「名稱＋整個函式內容」一起提升到範疇頂端</mark>，所以在實際第一行之前就能呼叫，沒有死區。

```javascript
processProducts();              // ✅ 可以，提早呼叫沒問題
function processProducts(){ console.log("成功執行！"); }
```

### 什麼時候才會遇到 TDZ？
把函式放進 `let` / `const`（<mark style="background: #ADCCFFA6;">函式表達式</mark>）時，編譯階段<mark style="background: #FF5582A6;">只提升變數名稱、不初始化</mark>。從提升到執行到賦值那行之間就是 <mark style="background: #FF5582A6;">TDZ（暫時性死區）</mark>，在死區內呼叫直接報錯。

```javascript
processProducts();   // ❌ ReferenceError: Cannot access ... before initialization
const processProducts = function(){ console.log("我想執行..."); };
```

> [!note] 記憶法
> `function foo(){}`（宣告）：連名帶身體一起提升，<mark style="background: #BBFABBA6;">沒有 TDZ，隨處可用</mark>。
> `const foo = function(){}`（表達式）：變數雖提升但賦值前都在 TDZ，提早呼叫直接死。

> [!tip] 跟參數初始化的對比
> 這裡的「只提升名稱、不初始化」可以直接拿來對照 [[13-閉包-Closure-私有變數與傳址陷阱]]（以及 [[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] (c)）講的函式參數綁定：兩者都發生在 Creation Phase，差別只在「初始化」這一步有沒有被延後——`let`/`const` 是**先佔位、故意不給值**（TDZ 就是這段空窗期）；函式參數是**佔位的同一時間就被呼叫時傳入的引數值初始化**，沒有空窗期，所以參數名稱從來不會有 TDZ 問題。

### 補充：折扣計算與 `toFixed` 比較陷阱
- 兩種折扣寫法數學等價：`price - price*discount/100` 與 `price*(1 - discount/100)`（discount=30、price=100 都得 70）。
- <mark style="background: #FF5582A6;">陷阱</mark>：`.toFixed(2)` 會把數字轉成<mark style="background: #FFB8EBA6;">字串</mark>，之後若直接拿去和數字（如 `> 80`）比較，會因字串 vs 數字而產生意外結果。比較前要先 `Number(...)` 轉回數字。

### 補充：匯出 / 搬移 AI 對話（對話原文含此實用資訊）
- <mark style="background: #BBFABBA6;">ChatGPT</mark>：設定 → 資料控制 → 匯出資料，幾分鐘後寄到信箱（連結 24 小時有效），解壓有 `chat.html` 與 `conversations.json`。
- <mark style="background: #BBFABBA6;">Gemini</mark>：單一對話用「分享與匯出」可存到 Google 文件／Gmail 草稿；完整歷史要用 <mark style="background: #ADCCFFA6;">Google Takeout</mark> →「取消全選」→ 找「我的活動 My Activity」勾「Gemini Apps」→ 建立匯出。
- 搬家建議：與其丟整坨 JSON（雜訊多），不如請 AI 把「記憶／偏好」整理成 Markdown 清單，貼到新 AI 的自訂指令，理解效率最高。

## 各對話來源

### JavaScript 閉包的重要性（實為 Hoisting/TDZ 與折扣計算 + AI 匯出）（2026-06）— https://gemini.google.com/app/a8283484f401c280

使用者：（看程式碼）finalPrice 先乘折扣再 toFixed，filter 又拿字串和 80 比？

Gemini：`processProducts` 算 finalPrice 時先乘 `(1 - totalDiscount/100)`，第 54 行 `.toFixed(2)` 轉成字串，第 58 行 `.filter` 拿字串與數字 80 比可能有意外結果，比較前應轉回數字。

使用者：黑底與白底畫面的算法差在哪？

Gemini：黑底 `price - price*discount/100`、白底 `price*(1 + ...)`，數學上等價（discount=30、price=100 皆得 70），只是不同表達方式。

使用者：直接 `function processProducts` 不會有 TDZ／暫時性死區嗎？

Gemini：不會。函式宣告在編譯階段「連名帶身體」提升到範疇頂端，提早呼叫也沒問題；只有 `const/let` 的函式表達式才有 TDZ（只提升變數名、不初始化，賦值前呼叫報錯）。記憶法如上。

使用者：要怎麼把 ChatGPT 的記憶/對話全部匯出到其他 AI？

Gemini：沒有一鍵同步。ChatGPT：設定→資料控制→匯出資料（寄信、含 chat.html 與 conversations.json）。搬家建議提煉「記憶/偏好」成 Markdown 貼到新 AI 自訂指令，比丟整坨 JSON 好。

使用者：Gemini 有匯出對話功能嗎？（並請協助記錄今天 1 點後做的事）

Gemini：單一對話可「分享與匯出」到 Docs/Gmail 草稿；完整歷史用 Google Takeout →取消全選→「我的活動」勾「Gemini Apps」→建立匯出。並提供把系統變更紀錄整理成文字、以及 Google 行事曆「一鍵加入」連結／手動欄位（活動 13:00–14:00）。

---

> [!info]- ➡️ 下一篇
> [[10-傳值vs傳址-賦值與記憶體空間]]——Creation Phase參數初始化這一步，傳值/傳址真正發生的時間點。
