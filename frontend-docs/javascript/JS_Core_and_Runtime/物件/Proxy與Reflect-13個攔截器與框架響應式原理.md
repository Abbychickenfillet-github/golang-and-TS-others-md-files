---
title: Proxy 與 Reflect — 13 個攔截器（trap）與框架響應式原理
type: topic-note
source: Gemini
tags: [gemini, javascript, proxy, reflect, es6, 代理模式, 響應式, vue, meta-programming]
sources:
  - https://gemini.google.com/app/e22cb4d641bd2431
  - https://gemini.google.com/app/6da30f0b0d9b148f
updated: 2026-09-05
---

# Proxy 與 Reflect — 13 個攔截器（trap）與框架響應式原理

> 本篇重點 a–v，共 22 個。

## 重點整理

### 一、Proxy 是誰的東西

(a) <mark style="background: #FFF3A3A6;">`Proxy` 是原生 JavaScript（ES6／ES2015）的標準語法</mark>，不是任何框架的專利。所以 React、Vue、Angular 的專案裡都可以直接使用，不用裝任何套件。

(b) <mark style="background: #ADCCFFA6;">Vue 3 的響應式系統（Reactivity System）底層就是用 `Proxy` 實作的</mark>。Vue 2 用的是 `Object.defineProperty`，那條路無法偵測新增屬性與陣列索引賦值，換成 Proxy 才一次解決。

(c) React 沒有內建響應式系統，它走的是「重跑函式 + 比對」的路線，所以 React 本身不用 Proxy；但 <mark style="background: #FFB8EBA6;">MobX、Valtio 這類 React 狀態管理庫就是用 Proxy 做的</mark>，可見這是語言層能力而非框架能力。

### 二、handler 的 13 個攔截行為

(d) `new Proxy(target, handler)` 的 `handler` 是一個物件，裡面可以定義<mark style="background: #FFF3A3A6;">最多 13 種攔截行為（trap，攔截器）</mark>。完整清單：

| trap | 攔截什麼 |
| --- | --- |
| `get` | 讀屬性 `obj.x` |
| `set` | 寫屬性 `obj.x = 1` |
| `has` | `in` 運算子 |
| `deleteProperty` | `delete obj.x` |
| `ownKeys` | `Object.keys` / `for...in` / `Object.getOwnPropertyNames` |
| `getOwnPropertyDescriptor` | `Object.getOwnPropertyDescriptor` |
| `defineProperty` | `Object.defineProperty` |
| `preventExtensions` | `Object.preventExtensions` |
| `isExtensible` | `Object.isExtensible` |
| `getPrototypeOf` | `Object.getPrototypeOf` |
| `setPrototypeOf` | `Object.setPrototypeOf` |
| `apply` | 呼叫函式 `fn()` |
| `construct` | `new fn()` |

<mark style="background: #BBFABBA6;">日常最常用的就是前三個：`get`、`set`、`has`。</mark>

### 三、get 與 set 的參數逐一拆解

(e) <mark style="background: #ADCCFFA6;">`get(target, key, receiver)`</mark> — 讀取屬性時觸發：

- `target`：被代理的**原始物件**（範例中的 `raw`）。
- `key`：被讀取的屬性名稱，例如 `'count'`。<mark style="background: #FFB8EBA6;">型別可能是 string 或 symbol。</mark>
- `receiver`：實際發起這次讀取的那個物件，通常就是代理物件本身（`state`），若有繼承關係則是繼承鏈上的那一個。

(f) <mark style="background: #ADCCFFA6;">`set(target, key, value, receiver)`</mark> — 寫入屬性時觸發：

- `target`、`key`、`receiver` 同上。
- `value`：準備要寫進去的新數值。
- <mark style="background: #FF5582A6;">`set` 必須回傳布林值</mark>。回傳 `false` 在嚴格模式（strict mode）下會丟 `TypeError`。這就是為什麼要寫 `return Reflect.set(...)` 而不是只呼叫不回傳。

(g) 逐行範例：

```js
const raw = { count: 0 }

const state = new Proxy(raw, {
  get(target, key, receiver) {
    console.log(`讀取 ${String(key)}`)
    return Reflect.get(target, key, receiver)   // 把讀取轉交給原始物件，回傳該屬性的值
  },
  set(target, key, value, receiver) {
    console.log(`寫入 ${String(key)} = ${value}`)
    return Reflect.set(target, key, value, receiver)  // 執行實際賦值，回傳 true 表示成功
  },
})

state.count        // 印出「讀取 count」，得到 0
state.count = 1    // 印出「寫入 count = 1」
```

### 四、Reflect 是什麼

(h) <mark style="background: #FFF3A3A6;">`Reflect` 是一個內建物件（built-in object），不是函式，也不是建構子。</mark>不能 `new Reflect()`，也不能當函式呼叫。它只提供一堆<mark style="background: #ADCCFFA6;">靜態方法（static method）</mark>，就像 `Math` 一樣。

(i) <mark style="background: #BBFABBA6;">`Reflect` 的方法名稱與 `Proxy` 的 13 個 trap 一一對應</mark>（`Reflect.get`、`Reflect.set`、`Reflect.has`、`Reflect.ownKeys`…）。這個設計是刻意的：你在 trap 裡想「照原本該做的做一遍」，就呼叫同名的 `Reflect` 方法，不用自己手刻。

(j) <mark style="background: #FF5582A6;">為什麼不直接寫 `target[key] = value` 而要用 `Reflect.set`？</mark>兩個理由：

1. `Reflect.set` 會回傳布林值告訴你成不成功，`target[key] = value` 失敗時在非嚴格模式下會靜默失敗。
2. `Reflect.set` 可以傳 `receiver`，讓 getter／setter 裡的 `this` 正確指向代理物件。<mark style="background: #FFB8EBA6;">少了這個，繼承場景與 getter 內部的依賴追蹤就會漏掉。</mark>

### 五、new Proxy 的身分釐清

(k) <mark style="background: #FF5582A6;">`Proxy` 是標準建構子（Constructor），不是「靜態方法」。</mark>`new Proxy(target, handler)` 是在呼叫建構子實例化出一個新的代理物件。這跟 `Object.keys()` 那種「掛在 Object 上的靜態方法」是兩回事。

(l) 判準口訣：<mark style="background: #BBFABBA6;">要 `new` 的是建構子，直接 `X.method()` 呼叫的是靜態方法。</mark>`Proxy` 要 new，`Reflect` 不能 new。

### 六、這個範例到底在表達什麼

(m) 核心觀念是<mark style="background: #ADCCFFA6;">代理模式（Proxy Pattern）</mark>：用 `new Proxy` 把原始物件 `raw` 包成 `state`，之後所有對 `state` 的讀寫都會先經過 handler 攔截器。

(n) <mark style="background: #FFF3A3A6;">價值在於「不改動原始物件」就能插入自訂邏輯</mark>——範例裡是 `console.log` 側錄，換成框架就是「記下誰依賴了這個屬性」與「這個屬性變了就通知誰重繪」。

(o) 把 (n) 展開就是 Vue 3 響應式的兩個動作：`get` 時做 <mark style="background: #ADCCFFA6;">track（依賴收集）</mark>，`set` 時做 <mark style="background: #ADCCFFA6;">trigger（觸發更新）</mark>。這就是「資料驅動畫面」的底層真相。

(p) <mark style="background: #FF5582A6;">Proxy 的兩個限制要記住</mark>：一是 `Proxy` 無法被 polyfill（ES5 做不出來），所以只能在支援 ES6 的環境跑，這也是 Vue 3 放棄 IE11 的原因；二是<mark style="background: #FF5582A6;">代理物件與原始物件是兩個不同的參考</mark>，`state !== raw`，混用容易出現「改了 raw 但畫面沒更新」的 bug。

(q) <mark style="background: #D2B3FFA6;">次要備註</mark>：`receiver` 這個參數名容易讓人以為是「接收者」很抽象，其實把它讀成「這次操作真正發起的那個物件」就好。多數簡單場景下 `receiver === proxy`。

## 順帶記下的 Bash 小知識（同一段對話）

- <mark style="background: #ADCCFFA6;">命令替換（Command Substitution）</mark>：`RESULT=$(gh run list)` 的 `$( )` 會先執行裡面的指令，再把它的標準輸出當成字串塞進變數。
- `STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*"')` 逐段讀法：`echo "$RESULT"` 把變數內容吐到標準輸出 → `|` 管線交給 `grep` → <mark style="background: #FFF3A3A6;">`grep -o` 的 `-o` 是 only-matching，只印出「符合的那一小段」而不是整行</mark> → 結果再存進 `STATUS`。
- `[^"]*` 是「連續零個以上、不是雙引號的字元」，用來抓到下一個引號為止。
- <mark style="background: #FF5582A6;">這是 Bash 語法不是 Python</mark>，`sleep 20` 才是暫停 20 秒的寫法。

## ⚠️ 存疑／更正

- Gemini 對本題四個問題的回答經逐項核對後<mark style="background: #BBFABBA6;">全部正確</mark>（13 個 trap、Reflect 是內建物件不可 new、Proxy 是建構子、代理模式的用途）。
- 唯一不足：<mark style="background: #FF5582A6;">Gemini 沒有提到 `set` 必須回傳布林值否則嚴格模式會丟 TypeError</mark>，也沒說明 `receiver` 對 getter 中 `this` 的意義，本篇 (f)(j) 已補上。

## 相關題目練習

| 題目 | 連結 | 為什麼相關 |
| --- | --- | --- |
| LeetCode 2690. Infinite Method Object | https://leetcode.com/problems/infinite-method-object/ | 這題的標準解法就是 `new Proxy` + `get` trap，練完 (e)(g) 直接上手 |
| LeetCode 2695. Array Wrapper | https://leetcode.com/problems/array-wrapper/ | 練 `valueOf` / `toString` 這類「攔截語言內建行為」的思維，是 Proxy 的近親 |
| LeetCode 2705. Compact Object | https://leetcode.com/problems/compact-object/ | 遞迴走訪物件與陣列的 key，複習 `Object.keys` 與型別判斷 |
| LeetCode 2624. Snail Traversal | https://leetcode.com/problems/snail-traversal/ | 需要改動 `Array.prototype`，體會「擴充內建行為」的另一種做法與風險 |

## 關聯筆記

- [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]] — Vue 的 `ref.value` 之所以要 `.value`，正是因為原始型別無法被 Proxy 包裹，只好包成物件；跟 (b)(p) 是同一個限制的兩面。
- [[存取器屬性三種定義方式-getter-setter與資料驗證]] — `Object.defineProperty` 的 getter／setter 是 Vue 2 的做法，跟 Proxy 對照著看最能感受到 (b) 的升級在哪。
- [[Object靜態方法vs原型方法-Symbol弱封裝與species]] — 補充 (k)(l)：什麼叫靜態方法、什麼叫建構子，那篇有完整判準。
- [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] — `Reflect.ownKeys` 在那篇是列舉工具，在本篇是 trap 的對應方法，同一個 API 的兩種用途。
- [[Object靜態方法速查]] — `Reflect` 與 `Object` 有大量同名方法，差別在回傳布林值還是丟錯，可對照。
- [[高階函式與函數式範式-取代OOP三大設計模式]] — 代理模式（Proxy Pattern）是 GoF 設計模式之一，那篇談 JS 如何用語言特性取代傳統 OOP 模式，本篇是「語言直接內建了這個模式」的極端例子。
- [[grep-options]]（CLI 資料夾）— 對應本篇 Bash 小知識段，`-o` 選項的完整說明在那裡。
- [[重定向與管道差異]]（CLI 資料夾）— `|` 管線與 `$( )` 命令替換的差異補完。

## 各對話來源（原文）

### Automated Script Error Explanation（2026-08-28）— https://gemini.google.com/app/e22cb4d641bd2431

> 前半段是語音輸入，辨識品質不佳，內容為詢問一段 GitHub Actions 檢查用的 Bash 腳本；後半段轉為文字輸入，是本篇主體。

**使用者：** （語音）python 語法做先暫停 20 秒，`RESULT` `gh run list` 他為什麼指令可以這樣子包？

**Gemini：** That's a Bash loop, not Python. It runs five times, pausing for 20 seconds between each check.

**使用者：** echo

**Gemini：** It uses command substitution to store the output of `gh run list` in the variable `$RESULT`, which is then echoed and piped into grep to parse the status.

**使用者：** status status echo result grep all 幫我翻一下，翻成中文。

**Gemini：** 這行 `STATUS=$(echo "$RESULT" | grep -o '"status":"[^"]*"')` 的意思是，將 `$RESULT` 變數的內容傳給 `grep` 指令來搜尋符合 `"status":"[^"]*"` 的字串，並只提取出這部分，最後把結果指定給 `STATUS` 變數。

**使用者：** grep 是什麼意思

**Gemini：** 在 Bash 指令碼中，`grep` 是一個強大的搜尋工具，用來尋找符合特定條件的字串。在這行指令中，它是用來從 `RESULT` 變數中提取出 `"status":"..."` 這段資訊。

**使用者：**（附上截圖）Handler 裡面可以定義最多 13 種攔截行為，最常用的是 get（讀屬性）、set（寫屬性）、has（in 運算子）。這是原生 JavaScript 裡面的，所以 Vue 裡面有代理模式。但我截圖這個地方是 React、Vue 跟 Angular 都可以有的寫法嗎？然後 `get(target, key, receiver)`、`set(target, key, value, receiver) { console.log(...); return Reflect.set(...) }`。請幫我解答以下四個問題：1. 請把 get 跟 set 這兩個內建函式、它們的每個參數值，以及陳述式地方的意思都寫給我。2. Reflect 是不是物件？3. new Proxy 是不是一個靜態的物件建構子方法？4. 請把這一串範例所要表達的東西跟我說。

**Gemini：** 截圖中的 `Proxy` 是原生 JavaScript（ES6）的標準語法，因此 React、Vue 與 Angular 專案中都可以直接使用。Vue 3 的響應式系統底層就是使用 Proxy 實現的。

1. `get(target, key, receiver)` 是讀取屬性時觸發的攔截函式——`target` 是被代理的原始物件（範例中的 `raw`）、`key` 是被讀取的屬性名稱（例如 `"count"`）、`receiver` 指向調用此屬性的代理物件本身（即 `state`）或繼承該代理的物件。陳述式部分：`console.log(...)` 印出讀取記錄，`return Reflect.get(target, key, receiver)` 透過 Reflect 將讀取操作轉交給原始物件並回傳該屬性的值。
   `set(target, key, value, receiver)` 是寫入屬性時觸發的攔截函式——`value` 是準備要寫入的新數值，`receiver` 指向收到指派特性的物件（通常為代理物件 `state`）。陳述式部分：`console.log(...)` 印出寫入記錄，`return Reflect.set(target, key, value, receiver)` 透過 Reflect 執行實際的屬性賦值操作，並回傳一個布林值（true 表示成功）告知 JavaScript 寫入是否成功。
2. 是的，`Reflect` 是一個內建的 JavaScript 物件。它不是函式，不能用 `new` 實例化，主要提供各種操作 JavaScript 物件的靜態方法，且其方法名稱與 Proxy 的 handler traps 一一對應。
3. `Proxy` 是一個標準建構子（Constructor Function），但不是「靜態方法」。使用 `new Proxy(target, handler)` 是在調用 Proxy 的建構子來實例化並建立一個新的代理物件。
4. 這個範例展示了代理模式（Proxy Pattern）與資料監聽。透過 `new Proxy` 將原始物件 `raw` 包裹成 `state`，未來只要對 `state` 進行讀取或寫入操作，都會先經過 handler 攔截器。這樣就能在不改變原始物件的情況下，額外加入自訂邏輯，最後再用 Reflect 完成原本的讀寫行為。這正是現代前端框架（如 Vue 3）實現資料驅動畫面更新的核心原理。

### 追加 2026-09-05：為什麼 `dog = new Proxy(dog, {...})` 還叫 dog

(r) <mark style="background: #ADCCFFA6;">`let` 允許變數被重新賦值，所以 `dog = new Proxy(dog, {...})` 是把識別字 `dog` 改指向新建立的 Proxy 實體</mark>，原本那個 `{ name: '來福', age: 6 }` 物件變成 Proxy 的 target，被包在裡面。

```js
let dog = { name: '來福', age: 6 };

dog = new Proxy(dog, {
  get(target, prop, receiver) { /* ... */ },
  set(target, prop, value, receiver) { /* ... */ },
});
```

(s) <mark style="background: #FFF3A3A6;">這是很常見的寫法</mark>：當你想攔截「之後所有對 `dog` 的存取」時，直接覆寫同一個識別字，就不必再多一個 `proxyDog` 變數名稱，也避免有人不小心繞過代理直接動原始物件。

(t) <mark style="background: #FF5582A6;">但要注意：原始物件並沒有消失</mark>。如果別的地方還持有原本那個物件的引用（例如先 `const raw = dog` 再覆寫），透過 `raw` 的存取仍然完全繞過 Proxy。所以「覆寫同名變數」只是遮住這一個入口，不是真正的封裝。

(u) <mark style="background: #ADCCFFA6;">handler 裡看到 `get` 和 `set` 兩個函式，並不代表 handler 只能有兩個</mark>。這是這段範例只定義了兩個 trap 而已，完整可用的 trap 有 13 個（見上面第二節）。

(v) <mark style="background: #BBFABBA6;">沒有定義的 trap 會直接「穿透」到 target 上，行為完全不變</mark>。例如只寫了 `get` 沒寫 `set`，那麼 `dog.age = 7` 就會原封不動地作用在原始物件上，不會報錯也不會被攔截——這是 Proxy 設計上「預設無害」的性質。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇對話（Automated Script Error Explanation） | https://gemini.google.com/app/e22cb4d641bd2431 | Gemini Flash，2026-08-28 |
| MDN — Proxy（含 13 個 handler trap 完整清單） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy | MDN 現行版本，2026-08-29 查證 |
| MDN — handler.set()（回傳布林值與嚴格模式 TypeError） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/set | MDN 現行版本，2026-08-29 查證 |
| MDN — Reflect（內建物件、非建構子、不可 new） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect | MDN 現行版本，2026-08-29 查證 |
| ECMA-262 — Proxy Object Internal Methods and Internal Slots | https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-internal-slots | ECMAScript 現行草案，2026-08-29 查證 |
| Vue 3 官方 — 深入響應式系統（Proxy 與 track／trigger） | https://vuejs.org/guide/extras/reactivity-in-depth.html | Vue 3 現行文件，2026-08-29 查證 |
| GNU grep 手冊（`-o` / `--only-matching`） | https://www.gnu.org/software/grep/manual/grep.html | GNU grep 現行手冊，2026-08-29 查證 |
| Proxy 識別字覆寫與 handler trap 數量（Gemini 對話） | https://gemini.google.com/app/6da30f0b0d9b148f | Gemini Flash，2026-09-05 |

---

由 Gemini 對話自動整理 · 更新於 2026-08-29
