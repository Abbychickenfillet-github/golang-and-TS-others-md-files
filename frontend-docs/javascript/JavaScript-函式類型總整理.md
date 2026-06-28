---
title: JavaScript 函式類型總整理（宣告/表達式/具名匿名/Generator/Constructor）
type: topic-note
source: ChatGPT
tags: [gemini, chatgpt, javascript, function, hoisting, generator, obsidian]
sources:
  - https://chatgpt.com/share/6a36285c-66b4-83e8-bb53-a6a83e0d7162
updated: 2026-06-19
---

# JavaScript 函式類型總整理

> 來源為 ChatGPT 分享對話，Abby 指定的複習重點之一。

## 重點整理

### 一、最關鍵的兩條軸：宣告 vs 表達式

| 類型 | 語法 | 可否提升(hoisting) | 可否匿名 |
|---|---|---|---|
| 函式宣告 Declaration | `function foo() {}` | ✅ 會提升（連名帶身體） | ❌ 一定要有名字 |
| 函式表達式 Expression | `const foo = function () {}` | ❌ 不會提升 | ✅ 可匿名或具名 |

- <mark style="background: #FFF3A3A6;">函式宣告會 hoisting</mark>：宣告前就能呼叫（引擎在編譯階段把整個函式提到範疇頂端）。
- <mark style="background: #FF5582A6;">函式表達式不會 hoisting</mark>：賦值前呼叫會落在 TDZ／undefined 而報錯。

### 二、具名 vs 匿名（不具名）
「具名／匿名」是形容<mark style="background: #ADCCFFA6;">「有沒有函式名稱」</mark>：

- 具名函式：`function foo(){}`、`const a = function bar(){}`
- 匿名函式：`function(){}`（沒名字）
- <mark style="background: #BBFABBA6;">「不具名」=「匿名」</mark>，只是中文翻譯不同，是同義詞。

> [!warning] 為什麼沒有「匿名函式宣告」？
> 因為<mark style="background: #FF5582A6;">函式宣告語法的 `function` 一定要有名字</mark>，`function(){}` 直接 SyntaxError。匿名只能出現在「函式表達式」。所以：具名函式宣告 ✅、匿名函式宣告 ❌、匿名函式表達式 ✅、具名函式表達式 ✅。

### 三、其他常見函式型態
- <mark style="background: #ADCCFFA6;">具名函式表達式</mark>（Named Function Expression）：`const a = function foo(){}`——名字 `foo` 只在函式內部可見，利於遞迴與除錯堆疊。
- <mark style="background: #ADCCFFA6;">Generator 函式</mark>：`function* gen(){}`，`*` 代表這是產生器函式，可用 <mark style="background: #FFF3A3A6;">`yield`</mark> 暫停/分次回傳。
  - `yield`：產出一個值並「暫停」，下次 `.next()` 從這裡繼續。
  - `return`：直接結束產生器（`done:true`）。
- <mark style="background: #ADCCFFA6;">Constructor 函式（建構式）</mark>：用 `new` 呼叫、慣例首字大寫，用來產生物件實例。
- （延伸）箭頭函式 `()=>{}`：一定匿名、不綁自己的 `this`，常作回呼。

### 四、箭頭函式的 `this`（事件監聽器情境）

箭頭函式<mark style="background: #FF5582A6;">不綁自己的 `this`</mark>，而是<mark style="background: #FFF3A3A6;">從外層作用域繼承</mark>過來。所以在 `addEventListener` 裡寫箭頭函式時，`this` 是「綁定事件時所在的上下文」，<mark style="background: #FF5582A6;">不是被點的按鈕本身</mark>。

- 例：按鈕掛在 `document` 或某個 `div` 內，箭頭函式裡的 `this` 會指向那個外層物件（`document` / `div`），而不是 button。
- <mark style="background: #BBFABBA6;">想讓 `this` 真的指向按鈕（觸發事件的元素），就用「普通函式」</mark>：

```javascript
// 普通函式：this 就是按鈕本身
button.addEventListener('click', function () {
  console.log(this); // 這裡 this = 被點的 button
});

// 箭頭函式：this 繼承外層，不是 button
button.addEventListener('click', () => {
  console.log(this); // 指向外層上下文（如 document / 模組），不是 button
});
```

> [!tip] 小結
> 要拿「觸發事件的元素」：用普通函式的 `this`，或不論哪種寫法都可改用 <mark style="background: #BBFABBA6;">`e.currentTarget`</mark>（綁監聽器的元素）／`e.target`（實際被點的元素），就不受 `this` 綁定影響。

## Obsidian callout / CSS Snippet 筆記（同對話的次要重點）

- <mark style="background: #FF5582A6;">toggle 一遇程式碼就中斷</mark>：在 Obsidian 的折疊（callout/toggle）裡嵌程式碼區塊容易把區塊切斷，需注意縮排與是否在 callout 內正確續行。
- <mark style="background: #FFB8EBA6;">callout 內 h3 比外面 h3 還大</mark>：是 snippet 把 `.callout h6`（或標題層級）樣式覆寫到了 callout 內標題；把 `.callout h6` 註解掉反而出問題，代表你的標題實際吃到的是 h6 規則。調整 callout 內標題字級要對「.callout 內對應層級」設定，而非全域 h3/h6。
- <mark style="background: #ADCCFFA6;">對比色</mark>：`background-color: var(--code-background); color: var(--code-color);` 就是讓底色與文字做對比的意思。
- <mark style="background: #FF5582A6;">`- [ ]` 沒出現 checkbox</mark>：①確認是 `.md` 檔（Canvas 的原生 text card 不解析）；②輸入要用<mark style="background: #BBFABBA6;">半形英文</mark>（中文全形符號不行）：`- [ ] 這是待辦`；③設定→編輯器→「調整 Checklist」要開；④檢查是否有 CSS snippet 蓋掉 checkbox 樣式。
- Canvas vs 一般編輯器：Canvas 是 Obsidian 1.1.0+ 的「畫布式筆記」（拖拉卡片、連結），與標準 Markdown 編輯器不同。

## 各對話來源

### JavaScript 函式類型總整理 & Obsidian-callout（ChatGPT 分享）— https://chatgpt.com/share/6a36285c-66b4-83e8-bb53-a6a83e0d7162

對話涵蓋兩大主題：
1. **Obsidian callout / CSS Snippet**：toggle 遇程式碼中斷、callout 內 h3 因 `.callout h6` 規則而變大、`var(--code-background)/--code-color)` 對比色、`- [ ]` checkbox 不顯示的排查（檔案需為 .md、半形輸入、開啟「調整 Checklist」、檢查 snippet）、Canvas 與標準編輯器差異。
2. **JavaScript 函式類型**：函式宣告 vs 函式表達式（hoisting 差異）、具名 vs 匿名（=不具名，同義詞）、為何沒有「匿名函式宣告」（宣告必須有名字否則 SyntaxError）、具名函式表達式、Generator `function*` 的 `*` 與 `yield` vs `return`、Constructor 建構式函式。

### 補充（Abby 提供的重點）— 箭頭函式的 this
箭頭函式的 `this` 從外層作用域繼承，事件監聽器裡用箭頭函式時 `this` 指向綁定當下的上下文（如 document/div）而非按鈕；想指向按鈕本身要用普通函式 `function(){ console.log(this) }`。
