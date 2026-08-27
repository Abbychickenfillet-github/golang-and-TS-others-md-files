---
title: 原型與引擎最佳化｜Shape、Inline Cache 與 ValidityCell
tags: [javascript, v8, 引擎最佳化, hidden-class, shape, inline-cache, prototype, 面試]
created: 2026-08-19
source:
  - Benedikt Meurer & Mathias Bynens, "JavaScript engine fundamentals: Shapes and Inline Caches"（2018-06-14）
  - Mathias Bynens & Benedikt Meurer, "JavaScript engine fundamentals: optimizing prototypes"（2018-08-16）
  - MDN Object.prototype.__proto__（頁面最後更新 2026-05-22）
---

# 原型與引擎最佳化｜Shape、Inline Cache 與 ValidityCell

> [!info] 這一篇的由來
> **主要內容由 Abby 提供**（2026-08-19），她整理了「JS 為了逼近 C++ 的執行效率，怎麼把動態屬性查找轉成靜態記憶體存取」這條線。
> 我做的是三件事：a. 校正引擎術語 b. 補上原型專屬的 ValidityCell 機制 c. 補實測數字並誠實標註測不出來的部分。
>
> 承接 [[Object建構子-plain-object的建立與存取]] 的 k 節：那裡說 `__proto__` 因為效能與安全被 deprecated，這篇解釋**效能那一半的底層原因**。
> 往前接 [[00-V8引擎完整管線-Parse到Deoptimization]]：那篇講整條編譯管線，這篇是管線裡「屬性存取」這一格的放大版。

---

## a. 核心命題（Abby 的整理）

> 靜態與動態語言的核心差異在於 **「記憶體空間的結構是否能在編譯時就固定」**。

- JS 是動態語言，物件可以**隨時新增或刪除屬性**，所以編譯時不知道每個屬性會住在哪
- C++ 這類編譯型語言很快，是因為屬性在記憶體中的**相對位置 Offset 是固定死的**，讀取就是「基底位址 ＋ 偏移量」一步到位
- 所以 JS 引擎要做的事情是：**在背後偷偷把動態物件靜態化**

用來做這件事的兩個東西就是 **Shape** 與 **Inline Cache**。

---

## b. Shape 是什麼（Abby 的整理 ＋ 術語校正）

Shape 是引擎在幕後幫每個物件建立的 C++ 結構，用來記錄：

- 這個物件**有什麼屬性**
- 每個屬性**在記憶體開頭往後數第幾個位元組**（Offset 偏移量）
- 屬性的旗標（`writable`、`enumerable`、`configurable`）

**關鍵設計：如果建立兩個結構相同的物件，引擎會讓它們共享同一個 Shape。**

Shape 把「屬性的中繼資料」跟「屬性的值」分開存 —— 值存在物件裡，形狀存在共用的 Shape 裡。所以一百萬個 `{ x, y }` 物件不會各存一份 key 名稱，記憶體省很大。

### b-1. 術語校正：每個引擎叫它不同名字

這是很容易被面試問到的細節：

| 引擎 | 用的名字 |
| --- | --- |
| **V8**（Chrome、Node.js） | **Maps** |
| SpiderMonkey（Firefox） | **Shapes** |
| JavaScriptCore（Safari） | **Structures** |
| Chakra（舊 Edge） | **Types** |
| 學術論文 | **Hidden Classes** 隱藏類別 |

> [!warning] 兩個容易搞混的點
> a. **V8 自己內部叫它 Map**，不是 Shape。但 V8 團隊寫科普文章時會改用 Shape 當通稱，因為 Map 會跟 JS 的 `Map` 資料結構撞名。所以「Shape 是 V8 的結構」這句話方向對，但要知道 V8 原始碼裡它叫 Map。
> b. **Hidden Class 跟 JS 的 `class` 完全無關**，只是學術界的用詞。

### b-2. 為什麼要轉成記憶體偏移量

| 做法 | 成本 |
| --- | --- |
| 正常查找 | 查雜湊表 Hash Table，或沿著原型鏈一層層比對 → **多次指標跳躍＋字串比對**，非常昂貴 |
| 有 Shape 之後 | 就像陣列索引，**基底記憶體位址 ＋ Offset** 一步到位 |

---

## c. Transition Chain：屬性順序會改變 Shape

這是 Shape 機制一個很反直覺的延伸。物件是**逐步長大**的，每加一個屬性就轉換到下一個 Shape：

```js
const obj = {};   // Shape 0：空的
obj.x = 5;        // 轉換到 Shape 1：{ x }
obj.y = 6;        // 轉換到 Shape 2：{ x, y }
```

引擎把這些 Shape 串成一條**轉換鏈 transition chain**。不同物件從空物件開始長出不同屬性時，就變成**轉換樹 transition tree**。

> [!important] 實務推論
> **「加入屬性的順序會影響 Shape。」** 內容一樣但寫入順序不同的兩個物件，在引擎眼中是**兩個不同的 Shape**，沒辦法共用最佳化。

JS 層面看不到 Shape，但 **key 的順序就是它的外顯證據**：

```js
const a = {}; a.x = 1; a.y = 2;
const b = {}; b.y = 2; b.x = 1;

Object.keys(a);   // ["x", "y"]
Object.keys(b);   // ["y", "x"]   ← 內容一樣，形狀不同
```

所以實務建議是：**同一種資料，屬性的初始化順序要一致**，最好在建構子裡一次寫完，別東加一個西加一個。

---

## d. Inline Cache：把查找結果記在呼叫點上

Mathias Bynens 說 IC 是「讓 JavaScript 跑得快的關鍵材料」。運作方式：

1. 第一次執行 `p.getX()` 這行程式碼時，引擎老實地查一次，找到屬性在 Offset 幾號
2. 引擎把「**這個 Shape → 這個 Offset**」記在**那一行程式碼**上（所以叫 inline，記在程式碼裡）
3. 下次再跑到這一行，如果物件的 Shape 一樣，就**跳過整個查找流程**，直接照 Offset 拿值

這就是為什麼「同一個迴圈裡處理形狀一致的物件」會特別快 —— IC 命中率高。反之如果每一圈丟進來的物件形狀都不一樣，IC 就會從 monomorphic 退化成 polymorphic 再退化成 megamorphic，最後乾脆放棄快取。

---

## e. ValidityCell：原型專屬的那一層（本篇補充）

前面講的是**一般屬性**。但原型鏈上的屬性有額外的機制，這正是 `__proto__` 為什麼特別敏感的原因。

### e-1. 原型存在 Shape 上，不是存在實例上

引擎把「這個物件的原型是誰」記在 **Shape** 裡，而不是每個實例各存一份。好處是原型鏈查找的檢查次數從 **1+2N 降到 1+N**（N 是鏈的長度）。

### e-2. ValidityCell 是一張「還沒過期」的票

V8 幫每一個原型的 Shape 配一個 **ValidityCell 有效性單元**，用來標記「這個原型（以及它上面的所有原型）有沒有被動過」。

當引擎要快取一次「從原型上讀屬性」的結果時，它會一起記下四樣東西：

| 記什麼 | 用途 |
| --- | --- |
| 實例的 Shape | 確認物件形狀沒變 |
| 原型物件 | 確認原型還是同一個 |
| 屬性的 Offset | 直接拿值 |
| 原型的 **ValidityCell** | 確認整條原型鏈沒被動過 |

下次再讀時，只要 ValidityCell 還有效，引擎就可以**跳過中間所有階層**，直接一步到位。

### e-3. 動原型 = 撕票

> [!warning] 這是全篇最重要的一段
> 只要你修改一個原型物件，或改變一個物件的原型鏈，**那個 ValidityCell 就作廢**。
> 而且它會**往下擴散** —— 改動 `Object.prototype` 會讓**整條鏈底下所有的 ValidityCell 全部失效**，所有快取的最佳化一次歸零。

這就把兩件事串起來了：

- **`o.__proto__ = X` 為什麼貴** —— 它撕的是這張票
- **原型污染為什麼除了資安還傷效能** —— 攻擊者動的是 `Object.prototype`，那是最上層，一撕就是全滅

V8 團隊給的建議只有一句：**「Leave your prototypes alone!」（別動你的原型）**。真的非得改，也要在**其他程式碼跑起來之前**改完，別在執行中途改。

---

## f. 誠實的實測數字

我在 Node.js v22 上實測（各 20 萬次），這是**方向穩定、可重現**的部分：

| 做法 | 時間（會跳動） | 分類 |
| --- | --- | --- |
| `Object.create(Q)` | 約 3～5 ms | 建立時就定原型 |
| `{ __proto__: Q, a: i }` | 約 14～15 ms | 建立時就定原型 |
| `x.__proto__ = Q` | 約 16～28 ms | **建立後才突變** |
| `Object.setPrototypeOf(x, Q)` | 約 16～29 ms | **建立後才突變** |
| `{ ["__proto__"]: Q }` | 約 0.2 ms | 根本沒動到原型 |

> [!note] 三個誠實的結論
> a. **貴的是「突變」這個動作本身，不是 `__proto__` 這個語法。**
> `Object.setPrototypeOf` 跟 `o.__proto__ =` 成本幾乎一樣（比值 0.99），因為它們做的是同一件事。
> 換成正規 API 並不會變快，**要快就得在建立時就把原型定好**。穩定的比值大約是 **5 倍**。
> b. **`{ ["__proto__"]: Q }` 快得離譜**，因為它只是加一個普通屬性，完全沒碰原型。這也再一次證明它跟另外兩個不是同一件事。
> c. **ValidityCell 的效果測得到，但不穩定。** 我測到「剛動完 `Object.prototype` 的那一輪」比污染前慢約 **1.7 倍**，但 IC 重建之後就回到原速。
> 也就是說：這個代價是**一次性的重建成本**，在緊湊迴圈裡會被攤平；真正的傷害是在**反覆動原型**的程式裡不斷付這個代價。

---

## g. 所以三種寫法哪些會降低效率

回到最原始的問題：

| 寫法 | 動到原型嗎 | 什麼時候 | 效率 |
| --- | --- | --- | --- |
| `{ __proto__: X }` | 有 | **建立當下** | **快**，Shape 一次定好 |
| `Object.create(X)` | 有 | **建立當下** | **最快** |
| `o.__proto__ = X` | 有 | 建立**之後**突變 | 慢，撕 ValidityCell |
| `Object.setPrototypeOf(o, X)` | 有 | 建立**之後**突變 | 一樣慢 |
| `{ ["__proto__"]: X }` | **沒有** | — | 就是一般屬性，沒有原型成本 |

**所以答案是：不是三種都慢，只有「建立之後才突變」的那兩種慢。**
字面量 `{ __proto__: X }` 反而是被引擎最佳化的標準寫法。

---

## h. 這條線接到哪裡

| 往回 | [[00-V8引擎完整管線-Parse到Deoptimization]] —— Shape 與 IC 是那條管線裡「屬性存取」的放大版 |
| --- | --- |
| 往前 | [[Object建構子-plain-object的建立與存取]] k 節 —— `__proto__` deprecated 的效能理由，底層就是本篇 |
| 橫向 | [[存取器屬性三種定義方式-getter-setter與資料驗證]] —— `__proto__` 的 setter 之所以特別貴，是因為它改的是 Shape 裡的原型欄位，不是一個普通值 |

Abby 的線上版 V8 管線筆記：
<https://abbychickenfillet-github.github.io/golang-and-TS-others-md-files/frontend-docs/javascript/JS_Core_and_Runtime/00-V8%E5%BC%95%E6%93%8E%E5%AE%8C%E6%95%B4%E7%AE%A1%E7%B7%9A-Parse%E5%88%B0Deoptimization.html>

---

## 參考來源

| 來源 | 作者 | 日期 |
| --- | --- | --- |
| [JavaScript engine fundamentals: Shapes and Inline Caches](https://mathiasbynens.be/notes/shapes-ics) | Benedikt Meurer、Mathias Bynens（V8 團隊） | 2018-06-14 |
| [JavaScript engine fundamentals: optimizing prototypes](https://mathiasbynens.be/notes/prototypes) | Mathias Bynens、Benedikt Meurer | 2018-08-16 |
| MDN｜Object.prototype.\_\_proto\_\_ | — | 頁面最後更新 2026-05-22 |
| 核心命題與 Shape／Offset 的整理 | **Abby** | 2026-08-19 |

> [!note] 驗證方式
> f 節的數字在 Node.js v22 實跑過，腳本是同資料夾的 `原型突變成本-bench.js`。
> 微型測試本來就不穩，數字會跳動，重點看的是**分類的方向**不是絕對值。
