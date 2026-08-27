---
title: JSON.parse 的參數會被 ToString 強制轉換
tags: [javascript, json, 型別轉換, ToString, 面試]
created: 2026-08-21
source:
  - MDN JSON.parse()
  - 實測環境 Node.js v22（V8）
---

# JSON.parse 的參數會被 ToString 強制轉換

> [!info] 這篇的由來
> 發現 `JSON.parse(123)` 竟然不會爆 —— 數字會先被轉成字串 `"123"` 再解析。
> 承接 [[15-ToPrimitive-ToNumber-型別轉換抽象操作]]：那篇講抽象操作本身，這篇是它在 `JSON.parse` 上的一個具體案例。

---

## a. 規格怎麼說

`JSON.parse(text, reviver)` 的**第一步就是「把 `text` 做 ToString」**。

所以你傳什麼進去都可以，引擎會先幫你轉成字串再拿去解析。

> [!important] 判準不是「型別對不對」，而是「轉成字串之後是不是合法 JSON」
> 想預測會不會過，就自己先手動 `String()` 一次看看。

---

## b. 原始型別：能不能過看轉完長什麼樣

| 寫法 | `String()` 之後 | 結果 |
| --- | --- | --- |
| `JSON.parse(123)` | `"123"` | `123` ✔ |
| `JSON.parse(1.5)` | `"1.5"` | `1.5` ✔ |
| `JSON.parse(1e21)` | `"1e+21"` | `1e21` ✔ 這是合法的 JSON 數字寫法 |
| `JSON.parse(true)` | `"true"` | `true` ✔ |
| `JSON.parse(null)` | `"null"` | `null` ✔ |
| `JSON.parse(undefined)` | `"undefined"` | ✘ `SyntaxError` |
| `JSON.parse(NaN)` | `"NaN"` | ✘ `SyntaxError` |
| `JSON.parse(Infinity)` | `"Infinity"` | ✘ `SyntaxError` |

後面三個過不了，是因為 **JSON 規格裡根本沒有 `undefined`、`NaN`、`Infinity` 這三個字面量**。

---

## c. 物件：走 ToPrimitive，結果多半不合法

| 寫法 | `String()` 之後 | 結果 |
| --- | --- | --- |
| `JSON.parse([1])` | `"1"` | `1` ✔ **意外通過** |
| `JSON.parse([1, 2])` | `"1,2"` | ✘ 逗號不能單獨出現 |
| `JSON.parse([])` | `""` | ✘ `Unexpected end of JSON input` |
| `JSON.parse({})` | `"[object Object]"` | ✘ |
| `JSON.parse(Object(1))` | `"1"` | `1` ✔ 包裹物件會被 `valueOf` 轉回來 |
| `JSON.parse(new Date())` | `"Fri Aug 21 …"` | ✘ |
| `JSON.parse(Object.create(null))` | — | ✘ **`TypeError`** |

> [!warning] 只有 null-prototype 物件丟的是 TypeError 不是 SyntaxError
> 因為它沒有繼承 `toString`，**ToPrimitive 根本做不下去**，連轉字串那一步都到不了。
> 這條接回 [[Object建構子-plain-object的建立與存取]] 的 f 節與 m 節。

---

## d. 決定性證據：自訂 `toString` 就能被吃進去

```js
const 假裝是JSON = {
  toString() { return '{"a":1,"b":[2,3]}'; }
};

JSON.parse(假裝是JSON);   // { a: 1, b: [2, 3] }
```

**這證明 `JSON.parse` 完全不檢查型別**，它只在乎「ToString 之後長什麼樣」。

---

## e. 反過來：`JSON.stringify` 的對應陷阱

| 寫法 | 結果 | 說明 |
| --- | --- | --- |
| `JSON.stringify(NaN)` | `"null"` | 變成 null |
| `JSON.stringify(Infinity)` | `"null"` | 同上 |
| `JSON.stringify(undefined)` | **`undefined`** | **回傳的不是字串！** |
| `JSON.stringify({ a: undefined })` | `"{}"` | 整個 key 消失 |
| `JSON.stringify([undefined])` | `"[null]"` | 陣列裡變 null |
| `JSON.stringify({ [Symbol('s')]: 1 })` | `"{}"` | Symbol key 被忽略 |
| `JSON.stringify(new Map([['a',1]]))` | `"{}"` | Map 序列化不出來 |

最容易咬人的：

```js
typeof JSON.stringify(undefined)          // "undefined"，不是 "string"
JSON.parse(JSON.stringify(undefined))     // SyntaxError
```

**這就是「JSON 深拷貝」會掉東西的原因之一。**

```js
const src = { a: 1, d: new Date(0), m: new Map([['k','v']]), u: undefined };

JSON.parse(JSON.stringify(src));
// { a: 1, d: "1970-01-01T00:00:00.000Z", m: {} }
//        ↑ Date 變字串    ↑ Map 變空物件    ↑ undefined 整個消失

structuredClone({ a: 1, d: new Date(0), m: new Map([['k','v']]) });
// Date 還是 Date、Map 還是 Map
```

---

## f. 實務建議

| 建議 | 原因 |
| --- | --- |
| **不要依賴這個隱式轉換** | 能跑不代表該這樣寫，讀的人會困惑 |
| 不確定是不是字串就先檢查 | `if (typeof text !== 'string') throw new TypeError('需要 JSON 字串')` |
| 解析外部資料一律包 `try/catch` | `JSON.parse` 失敗是**丟例外**不是回 `null` |
| 深拷貝改用 `structuredClone` | 保得住 Date、Map、Set、循環參考 |

```js
function safeJsonParse(text, fallback = null) {
  try { return JSON.parse(text); } catch { return fallback; }
}

safeJsonParse('{"a":1}')   // { a: 1 }
safeJsonParse('壞掉的')     // null
safeJsonParse(123)         // 123 ← 隱式轉換讓它意外通過，所以型別檢查還是要自己做
```

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| MDN｜JSON.parse() | 第一個參數的 ToString 行為 |
| MDN｜structuredClone() | 深拷貝的正解 |
| 實測環境 Node.js v22（V8） | 2026-08-21 |

> [!note] 驗證方式
> 本篇所有結果都在 Node.js v22 實跑過，腳本是 `C:\coding\JavaScript-practicing\json-parse-ToString強制轉換.js`。

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[15-ToPrimitive-ToNumber-型別轉換抽象操作]] | 本篇是那個抽象操作的具體應用案例 |
| [[Object建構子-plain-object的建立與存取]] | `Object(1)` 包裹物件與 null-prototype 的 TypeError 都出自那篇 |
| [[存取器屬性三種定義方式-getter-setter與資料驗證]] | 自訂 `toString` 能騙過 `JSON.parse`，跟那篇的計算屬性是同一招 |
| [[Symbol-符號型別與物件key]] | Symbol key 不會被 `JSON.stringify` 序列化 |
| [[Map.prototype完整清單-實例方法與存取器]] | Map 序列化不出來，要先 `[...m]` 轉陣列 |
