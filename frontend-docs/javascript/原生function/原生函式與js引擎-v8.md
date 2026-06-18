# 原生（內建）函式 vs JS 引擎 V8

> 路徑：frontend-docs / javascript / 原生function / 原生函式與js引擎-v8
> 相關：[[iife-是否算原生function]]
> MDN parseInt：<https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/parseInt>

## 起點問題：「引擎內建的原生函式，是指 V8 嗎？」

**不完全是。** 正確說法是：
**ECMAScript 規格「規定」要有 → 各家引擎「各自用 C++ 實作」。V8 只是其中一個引擎。**

---

## 三個層次要分清楚

| 層次 | 角色 | 例子 |
|---|---|---|
| **ECMAScript 規格** | 一份「規定書」，定義 `parseInt` 等函式該怎麼運作 | TC39 委員會制定 |
| **引擎（實作）** | 真正用 C++ 把規格寫成程式 | **V8**（Chrome / Node.js）、SpiderMonkey（Firefox）、JavaScriptCore（Safari） |
| **你的 JS 程式** | 呼叫這些內建函式 | `parseInt("42")` |

重點：
- `parseInt` **不是 V8 專屬**——Firefox、Safari 都有，因為大家照同一份規格。
- 但在 Chrome / Node 環境，跑你 `parseInt` 的底層程式，**確實是 V8 用 C++ 寫好的**。
- 「原生 native」的另一層意思＝**這函式不是用 JavaScript 寫的，是引擎底層用 C++ 實作**，所以快、也改不動。

> 一句話：`parseInt` 是「ECMAScript 規格規定、每個引擎（V8 是其一）用 C++ 內建實作」的原生函式。

---

## 用 parseInt 當例子

`parseInt(字串, 基數)`：從字串**左邊**讀數字，**遇到第一個非數字就停**。

```js
parseInt("42")        // 42
parseInt("42px")      // 42    ← 讀到 "px" 停，前面 42 拿走
parseInt("px42")      // NaN   ← 第一個字就不是數字 → 失敗
parseInt("3.14")      // 3     ← 只 parse「整數」，小數丟掉
parseInt("   10   ")  // 10    ← 前導空白略過
parseInt("")          // NaN

// 第二參數 radix（基數 / 幾進位）—— 建議都明寫
parseInt("11", 2)     // 3     ← 二進位 11 = 1×2 + 1
parseInt("100", 8)    // 64    ← 八進位 = 8²
parseInt("FF", 16)    // 255   ← 十六進位
parseInt("11", 10)    // 11    ← 十進位（最常用）
```

### 對照 `Number()`（另一個內建，行為不同）

```js
parseInt("42px")   // 42    ← 容忍後面雜質
Number("42px")     // NaN   ← 整個字串要合法才行
parseInt("3.14")   // 3     ← 只要整數
Number("3.14")     // 3.14  ← 保留小數
```

---

## 怎麼自己驗證一個函式是不是「原生內建」？

在 F12 Console 印出來，原生函式會顯示 `[native code]`：

```js
parseInt.toString();
// "function parseInt() { [native code] }"  ← native code = 引擎用 C++ 實作

function myFn() { return 1; }
myFn.toString();
// "function myFn() { return 1; }"          ← 自訂函式看得到原始碼
```

### 為什麼 `${fn}` 會印出 `function valueOf() { [native code] }`

把函式放進**樣板字串** `${}` 會強制「轉成字串」＝呼叫它的 `toString()`，所以看到的是原始碼文字：
```js
const o = {};                       // 繼承 Object.prototype 的 valueOf（原生函式）
console.log(o.valueOf)              // DevTools 顯示：ƒ valueOf()             ← 函式圖示
console.log(`${o.valueOf}`)         // "function valueOf() { [native code] }" ← 被轉成字串

const add = (a,b) => a+b;           // 自己寫的
console.log(`${add}`)               // "(a,b) => a+b"                          ← 看得到原始碼
```
- 直接 `console.log(fn)` → DevTools 給你 `ƒ`；放進 `${}` 或 `.toString()` → 變成原始碼文字。
- `o.valueOf` 是**繼承來的原生函式**（見 [[查看plain-object的prototype]]），所以顯示 `[native code]`。

---

## 小結
- 原生 / 內建函式：**規格定義、引擎（V8 等）用 C++ 實作**，不是 V8 獨有。
- `[native code]` 是它「非 JS 實作」的標記。
- IIFE 不是這種原生函式，而是一種寫法 → 見 [[iife-是否算原生function]]。
