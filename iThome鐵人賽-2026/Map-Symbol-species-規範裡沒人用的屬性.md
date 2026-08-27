---
title: Map[Symbol.species] 規範裡那個沒人用的屬性
type: article-draft
tags: [ithome, 鐵人賽, javascript, symbol-species, ecmascript, tc39, map, 規範]
updated: 2026-08-20
---

# `Map[Symbol.species]`：規範裡那個沒有人用的屬性

> 純 Markdown，可直接貼到 iThome。

翻 MDN 的時候看到 `Map[Symbol.species]` 這個靜態存取器，第一個念頭是「這是什麼」，第二個念頭是「我好像從來沒用過」。

查下去才發現，**不是我沒用過，是它根本沒有被任何一個內建方法呼叫過**。

這篇要回答三件事：它為什麼存在、為什麼沒人用、以及為什麼 TC39 現在後悔了。

---

## 一、先確認它真的存在

```js
for (const [name, C] of Object.entries({ Array, Map, Set, RegExp, Promise, ArrayBuffer })) {
  const d = Object.getOwnPropertyDescriptor(C, Symbol.species)
  console.log(name.padEnd(12), d ? 'YES' : 'NO', d && (C[Symbol.species] === C))
}
```

實測輸出（Node v22.22.2）：

```
Array        YES true
Map          YES true
Set          YES true
RegExp       YES true
Promise      YES true
ArrayBuffer  YES true
```

六個內建類別全都有，而且預設的 getter 都是 `return this`——也就是回傳建構子自己。

---

## 二、`Symbol.species` 本來要解決什麼問題

ES6 引進 `class` 之後，你可以繼承內建類別：

```js
class MyArray extends Array {}

const ma = new MyArray(1, 2, 3)
const mapped = ma.map(x => x * 2)

mapped instanceof MyArray   // true
```

**注意最後一行**：`map()` 回傳的不是普通 `Array`，而是 `MyArray`。這是 ES6 刻意設計的行為——衍生類別的方法，回傳的應該還是衍生類別。

問題來了：**如果我不想要這個行為呢？**

假設 `MyArray` 的建構子需要特殊參數，或者你只是覺得 `map()` 回傳普通陣列比較單純。這時候 `Symbol.species` 就是那個開關：

```js
class PlainArray extends Array {
  static get [Symbol.species]() { return Array }   // ← 我要普通 Array
}

const pa = new PlainArray(1, 2, 3)
pa.map(x => x) instanceof PlainArray   // false，變成普通 Array 了
```

上面兩段我都實際跑過，行為與規範一致。

**所以 `Symbol.species` 的定位是：「當這個類別的方法要生一個新實例時，該用哪個建構子？」**

順帶一提，這在設計模式裡就是**工廠方法（Factory Method）**——把「要 new 哪一個類別」的決定權交出去，讓子類別覆寫。

---

## 三、那 Map 的呢？實測跑給你看

既然 `Map[Symbol.species]` 存在，照理說某些 Map 方法會用到它。來驗證：

```js
let called = 0

class MyMap extends Map {
  static get [Symbol.species]() {
    called++                 // 只要有人讀這個屬性，計數就加一
    return Map
  }
}

const mm = new MyMap([['a', 1]])

mm.set('b', 2)
mm.get('a')
mm.delete('b')
mm.forEach(() => {})
;[...mm.entries()]
;[...mm.keys()]
;[...mm.values()]

console.log('species getter 被呼叫幾次 ?', called)
```

實測輸出：

```
species getter 被呼叫幾次 ? 0
```

**零次。**

原因很單純：**Map 的內建方法沒有一個會建立並回傳新的 Map**。

| 方法 | 回傳什麼 |
|---|---|
| `set()` | 回傳 Map 自己（為了鏈式呼叫） |
| `get()` | 回傳值 |
| `has()` / `delete()` | 回傳布林 |
| `forEach()` | 回傳 `undefined` |
| `keys()` / `values()` / `entries()` | 回傳**迭代器**，不是 Map |

沒有任何一個方法需要「生一個新的 Map」，所以那個決定建構子的屬性自然沒有出場機會。

對照 Array 就很清楚——`map`、`filter`、`slice`、`concat` **全都回傳新陣列**，所以它們真的需要 species。

---

## 四、那為什麼還要放？

答案是**規範的一致性**。

ES6 在設計「內建類別可以被繼承」這件事時，是把它當成一整套機制在做的。既然 Array、RegExp、Promise 都需要 species 來決定衍生實例的建構子，規範就統一幫所有內建集合類別都加上這個靜態存取器，**保留未來擴充的可能**。

用比喻的話：**它像是蓋房子時預埋的插座**。現在牆邊那個插座沒有插任何東西，但當初佈線時一起做了，因為未來也許會用到，而且事後補很麻煩。

---

## 五、然後 TC39 後悔了

這是最有趣的部分。

TC39 有一個提案叫 **[Remove ES6 built-in subclassing](https://github.com/tc39/proposal-rm-builtin-subclassing)**（移除 ES6 內建子類別化），目標就是把 Array、RegExp、Promise、TypedArray 的 `@@species` 機制整個拿掉。

提案列出的三個理由：

- a. **實作複雜度**——增加了引擎的實作與維護成本。
- b. **安全漏洞**——提案文件明確指出，Firefox 與 Chrome 因為 `@@species` 產生過**十個以上有紀錄的安全漏洞**。原因不難想像：一個「使用者可以覆寫、而且會在引擎內部被呼叫」的 getter，等於在原生方法的執行路徑中間開了一個讓任意程式碼插進來的洞。
- c. **效能懸崖**——它會導致 JIT（Just-In-Time 即時編譯）去最佳化。引擎本來可以假設 `arr.map()` 回傳普通陣列並據此優化，但只要 species 可能被覆寫，這個假設就不成立，快速路徑就被迫放棄。

這個提案目前停在 **Stage 1**（最後呈報是 2020 年 6 月），意思是「委員會同意這個問題值得解決」，但還沒有具體的移除時程。**因為向下相容的緣故，`Map[Symbol.species]` 短期內不會消失。**

---

## 六、決定性的證據：新方法真的不用它了

提案卡在 Stage 1，那怎麼判斷 TC39 是不是真的改變態度了？

**看新加入的方法怎麼設計。**

ES2025 為 Set 加了一批新方法（`union`、`intersection`、`difference` 等）。這些方法**明確會回傳新的 Set**，正是 species 的典型使用場景。它們用了嗎？

```js
let setCalled = 0

class MySet extends Set {
  static get [Symbol.species]() {
    setCalled++
    return Set
  }
}

const s1 = new MySet([1, 2, 3])
const u = s1.union(new Set([4]))

console.log('union 回傳的是 MySet 嗎 ?', u instanceof MySet)
console.log('species 被呼叫幾次 ?', setCalled)
```

實測輸出：

```
union 回傳的是 MySet 嗎 ? false
species 被呼叫幾次 ? 0
```

**新方法完全繞過 species，直接回傳普通 Set。**

這比任何提案文件都有說服力——**規範裡的舊插座還在，但新的電器已經不再往那裡插了。**

---

## 七、所以我該知道什麼

**a. 面試如果被問到，講得出「存在但未使用」就夠了**

完整版答案：「`Map[Symbol.species]` 確實在規範裡，但因為 Map 沒有任何方法會回傳新的 Map 實例，它從來不會被呼叫。它是 ES6 為了所有內建類別的一致性統一加上的。而且 TC39 現在傾向不再用 species，ES2025 的 Set 新方法就完全沒用它。」

**b. 不要繼承內建類別**

這才是實務上真正該帶走的一課。繼承 `Array`、`Map`、`Promise` 看起來很優雅，但它踩在一個**TC39 自己都想移除的機制**上，而且引擎為了支援它已經產生過十幾個安全漏洞。

**用組合取代繼承**：

```js
// 不要這樣
class UserMap extends Map { /* ... */ }

// 這樣比較好
class UserStore {
  #map = new Map()
  add(user) { this.#map.set(user.id, user); return this }
  find(id) { return this.#map.get(id) }
}
```

組合的版本不依賴任何 species 行為，換引擎、換版本都不會出事，而且你完全掌控暴露出去的 API。

**c. 規範裡的東西不代表你該用**

`Symbol.species`、`with` 陳述式、`document.all` 的詭異行為——這些都還在規範裡，但存在的理由是**沒辦法拿掉**，不是**推薦你用**。

---

## 實測環境

本文所有程式碼實測於 **Node.js v22.22.2**，可直接複製到終端機執行驗證。

## 參考來源

- MDN, `Map[Symbol.species]`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/Symbol.species
- MDN, `Symbol.species`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species
- TC39, Remove ES6 built-in subclassing（Stage 1，最後呈報 2020-06）：https://github.com/tc39/proposal-rm-builtin-subclassing
- TC39, Set methods proposal（ES2025）：https://github.com/tc39/proposal-set-methods

（查閱日期：2026-08-20）
