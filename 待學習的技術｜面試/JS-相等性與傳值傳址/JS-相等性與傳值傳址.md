---
title: JS 相等性比較與傳值傳址
tags: [JavaScript, 面試, Object.is, SameValueZero, NaN, pass-by-value, call-by-sharing]
created: 2026-08-06
verified-with: Node v22.22.2
---

# JS 相等性比較與傳值傳址

> [!abstract] 這份筆記解決兩件事
> a. `Object.is` 到底跟 `===` 差在哪，`SameValueZero` 又是什麼
> b. 面試被問「JS 是傳值還是傳參考」時，怎麼回答才既正確又不會被追問到卡住

相關檔案（同資料夾）
- `object-is-demo.js`　可直接 `node object-is-demo.js` 執行
- `pass-by-value-demo.js`　可直接 `node pass-by-value-demo.js` 執行
- `JS-相等性與傳值傳址.html`　互動練習頁（填空、是非、申論、可切換答案）

---

## 一、核心圖表

![[學習JS_圖解_四種相等演算法比較表_2026-08-06.svg]]

![[學習JS_圖解_傳值傳址call-by-sharing判定實驗_2026-08-06.svg]]

![[學習JS_終端_ObjectIs與SameValueZero實際執行結果_2026-08-06.svg]]

---

## 二、Object.is 練習 todolist

> 建議節奏：Day 1 到 Day 5 各約 25 到 40 分鐘。每一項做完才勾，勾不下去就代表那一格還沒真的懂。

### Day 1　先把「四種演算法」的名字記住

- [ ] 1. 在 Node REPL 打出 `NaN === NaN`、`NaN == NaN`、`Object.is(NaN, NaN)`，三個結果各是什麼
- [ ] 2. 用自己的話寫出 ECMAScript 規範裡的四個名字：`IsLooselyEqual`、`IsStrictlyEqual`、`SameValue`、`SameValueZero`，並各配一個使用者（`==`、`===`、`Object.is`、`includes`／`Map`／`Set`）
- [ ] 3. 回答：為什麼 `NaN === NaN` 是 `false`（答案要提到 IEEE 754，而不是「因為 JS 很怪」）
- [ ] 4. 打開 F12 Console 把上面三行再跑一次，截圖存進 `obsidian-attachment`

### Day 2　把 SameValue 與 SameValueZero 的唯一差別釘死

- [ ] 5. 跑 `Object.is(0, -0)` 與 `[-0].includes(0)`，說明為什麼一個 `false` 一個 `true`
- [ ] 6. 用 `1/0` 與 `1/-0` 證明 `+0` 與 `-0` 在數學意義上真的不同
- [ ] 7. 背下這一句：**SameValue 與 SameValueZero 的差別「只有」正負零，對 NaN 的處理完全一樣**
- [ ] 8. 列出三個標準函式庫裡用 `SameValueZero` 的地方（`Array.prototype.includes`、`Map` 的 key 比對、`Set` 的成員比對）

### Day 3　手刻 polyfill

- [ ] 9. 不看答案，自己寫出 `myObjectIs(x, y)`
- [ ] 10. 不看答案，自己寫出 `sameValueZero(x, y)`
- [ ] 11. 解釋 `x !== 0 || 1 / x === 1 / y` 這一行在補救什麼（提示：`x === y` 為真但其實是 `+0` 與 `-0`）
- [ ] 12. 解釋 `x !== x && y !== y` 這一行在補救什麼（提示：只有 NaN 會不等於自己）
- [ ] 13. 對照 `object-is-demo.js` 的 D 區，確認自己的版本跟原生行為一致

### Day 4　實務上什麼時候真的會用到

- [ ] 14. 找出 React 的 `useState` 為什麼用 `Object.is` 做 bailout 判斷（同一個值就不重新 render）
- [ ] 15. 想一個「必須用 `Object.is` 而不能用 `===`」的情境（例如需要分辨 `-0` 的座標或金額正負號）
- [ ] 16. 想一個「必須用 `Number.isNaN` 而不是 `Object.is(x, NaN)`」的理由（可讀性與意圖表達）
- [ ] 17. 寫一段 `deepEqual` 的最外層，用 `Object.is` 當基礎比較（不用寫完，只寫判斷分支）

### Day 5　口說輸出（面試模式）

- [ ] 18. 對著螢幕口述 90 秒：「`==`、`===`、`Object.is` 三者差在哪」
- [ ] 19. 對著螢幕口述 90 秒：「JS 是傳值還是傳參考」（見第四節的標準答法）
- [ ] 20. 把第五節的三個追問題目各答一次，卡住的地方回頭補 Day 1 到 Day 4

---

## 三、SameValueZero 與 NaN 的核心內容

### 3-1　四種演算法一覽

| 情境 | `==` | `===` | `Object.is` | `SameValueZero` |
|---|---|---|---|---|
| `1` 與 `"1"` | `true` | `false` | `false` | `false` |
| `null` 與 `undefined` | `true` | `false` | `false` | `false` |
| **`NaN` 與 `NaN`** | `false` | `false` | **`true`** | **`true`** |
| **`+0` 與 `-0`** | `true` | `true` | **`false`** | **`true`** |
| `{}` 與 `{}` | `false` | `false` | `false` | `false` |

> [!important] 記法
> a. 由鬆到嚴：`==` → `===` → `SameValueZero` → `SameValue`（`Object.is`）
> b. `SameValue` 與 `SameValueZero` 的差別**只有正負零**，名字裡多的那個 `Zero` 就是在講「把兩個零併成一個」
> c. `NaN` 那一列 `Object.is` 與 `SameValueZero` 完全一致，不是差異點

### 3-2　為什麼 `NaN === NaN` 是 `false`

- a. `NaN` 的語意是 Not a Number，代表「一個無法表示的運算結果」，例如 `0/0`、`Math.sqrt(-1)`、`parseInt('abc')`
- b. IEEE 754（浮點數標準）明文規定：`NaN` 與任何值比較都回傳 unordered，包含跟自己比
- c. 這個規則的用意是「兩個都算失敗的結果，不代表它們是同一個失敗」，例如 `0/0` 與 `Infinity - Infinity` 都是 `NaN`，但語意不同
- d. `==` 與 `===` 忠實遵守 IEEE 754，所以判 `false`
- e. `SameValue` 與 `SameValueZero` 是 ECMAScript 自己定義的「同一性」概念，不是數學相等，所以刻意讓 `NaN` 等於自己，否則 `Set` 裡會塞進無限多個 `NaN`

### 3-3　誰在用 SameValueZero

- a. `Array.prototype.includes`　所以 `[NaN].includes(NaN)` 是 `true`
- b. `TypedArray.prototype.includes`
- c. `Map` 的 key 比對　所以 `new Map([[NaN, 1]]).get(NaN)` 拿得到值
- d. `Set` 的成員比對　所以 `new Set([NaN, NaN]).size` 是 `1`

> [!warning] 對照組
> `Array.prototype.indexOf` 用的是 `===`，所以 `[NaN].indexOf(NaN)` 是 `-1`。
> 同一個陣列，`includes` 找得到、`indexOf` 找不到，這就是兩種演算法的實際差異。

### 3-4　手刻 polyfill

```js
function myObjectIs(x, y) {
  if (x === y) {
    // x === y 為 true，唯一可能出錯的情況是 +0 與 -0
    // 1/+0 是 Infinity，1/-0 是 -Infinity，用倒數把兩者分開
    return x !== 0 || 1 / x === 1 / y;
  }
  // x === y 為 false，唯一該被救回來的是 NaN
  // 只有 NaN 會不等於自己
  return x !== x && y !== y;
}

function sameValueZero(x, y) {
  return x === y || (x !== x && y !== y);   // 只補 NaN，不管正負零
}
```

---

## 四、傳值還是傳參考

### 4-1　你的原始提問

> 「那 JavaScript 是傳值（pass by value）還是傳參考（pass by reference）？」
> GPT 的回答：其實都是 pass by value。只是當值是一個物件時，傳遞的是 reference 這個值本身，而不是把整個物件複製一份，所以看起來很像 pass by reference。

### 4-2　直接回答你的四個疑問

| 你的疑問 | 判定 |
|---|---|
| 我只要回答「傳值」就好嗎 | **可以，但不能只講兩個字**。要接著解釋「物件的值是位址」，否則面試官會以為你在背答案 |
| 他的第二段說得對嗎 | **完全正確**，而且是這題的標準答法 |
| 傳址也是存在的吧 | **在 JS 裡不存在**。C++ 的 `int&`、C# 的 `ref` 才是真的 pass by reference，JS 沒有對應語法 |
| 我原本想講 Heap 與 Stack | **沒有不對，而且是加分項**，但那是「為什麼」的解釋層，不是「是什麼」的判定層。順序要放在結論後面 |

### 4-3　為什麼「只講傳址」會被追問到卡住

判定 pass by reference 的標準只有一條：**在函式內對參數重新賦值，呼叫端的變數會不會跟著換**。

```js
function reassign(o) { o = { name: 'brandNew' }; }
const b = { name: 'origin' };
reassign(b);
console.log(b.name);   // 'origin'  ← 沒被換掉
```

- a. 如果是真正的 pass by reference，`b` 現在應該是 `brandNew`
- b. 實際上 `b` 完全沒動，代表函式拿到的是「位址的複本」，不是 `b` 這個變數本身
- c. 這就是「傳的是值，只是那個值剛好是位址」的直接證據
- d. 只回答「物件是傳址」的人，面對這段程式碼會解釋不出來

### 4-4　`let obj1 = obj2` 的兩種「改」一定要分開講

GPT 說「當改 obj2 的時候 obj1 也會被改到」──**這句話只在改屬性時成立**。

```js
let obj1 = { name: 'A' };
let obj2 = obj1;

obj2.name = 'B';        // 改「屬性」→ 動到同一個 Heap 物件
console.log(obj1.name); // 'B'   會連動

obj2 = { name: 'C' };   // 改「變數本身」→ 只換掉 obj2 這一格的值
console.log(obj1.name); // 'B'   不會連動
```

> [!tip] 一句話記法
> **改「裡面」會連動，改「本身」不會連動。**
> 因為連動的是 Heap 上那個物件，不是 Stack 上那兩格變數。

### 4-5　你的 Heap 與 Stack 說法對不對

你原本想講的是：Heap（RAM 裡動態配置的區塊）放物件本體，Stack 放基本型別的值與物件的位址。

- a. **方向正確**，這是最標準的教科書模型，也是解釋 4-3 與 4-4 最好用的圖
- b. 需要補的一個 caveat：這是**概念模型**，不是 V8 的實作保證。V8 有逃逸分析（escape analysis），確定不會外流的物件可能直接配在 Stack 上；小整數用 Smi（Small Integer）直接編碼在指標裡，根本不進 Heap
- c. 所以講法要調整成「在概念模型上」或「一般而言」，不要說成「JS 規範規定」──規範完全沒有規定記憶體要怎麼配
- d. 面試時的順序建議：**先給結論（pass by value），再給判定證據（重新賦值實驗），最後才用 Heap／Stack 解釋機制**。反過來講會顯得答非所問

### 4-6　正式名稱：call by sharing

- a. 由 Barbara Liskov 為 CLU 語言提出，中文譯作「共享傳遞」
- b. 用來描述 Python、Java、Ruby、JavaScript 這一類語言的傳遞方式：傳的是值，但那個值是物件的參照
- c. 面試時不講這個名詞完全沒問題，講了是加分，代表你知道這不是 JS 獨有的怪癖

### 4-7　JS 想「換掉呼叫端的物件」怎麼辦

```js
// 做法一　回傳新值再接回來（最常見）
function replaceByReturn(o) { return { ...o, name: 'brandNew' }; }
let c = { name: 'origin' };
c = replaceByReturn(c);

// 做法二　包一層容器
const box = { value: { name: 'origin' } };
function replaceViaBox(container) { container.value = { name: 'brandNew' }; }
replaceViaBox(box);
```

這兩個做法之所以存在，正是因為 JS 沒有 pass by reference。

---

## 五、面試標準答法與追問防守

### 5-1　60 秒標準答法

> JavaScript 一律是 pass by value。
> 差別在於：基本型別的「值」就是那個數字或字串本身；物件的「值」是一個指向 Heap 的參照。傳進函式時，被複製的是那個參照，不是整個物件，所以在函式內改屬性，呼叫端看得到，看起來很像傳參考。
> 但判定標準是重新賦值：在函式內把參數指向一個新物件，呼叫端完全不受影響。真正的 pass by reference（像 C++ 的 `int&`）會連呼叫端一起換掉，JS 沒有任何語法做得到。
> 這個模式的正式名稱是 call by sharing。

### 5-2　三個常見追問

- a. **「那為什麼 `obj2.name = 'B'` 會影響 `obj1`？」**
　　因為兩格變數放的是同一個位址，改的是 Heap 上那個共用物件，不是任何一格變數。
- b. **「淺拷貝跟這個有什麼關係？」**
　　`{ ...obj }` 只複製一層的「值」，巢狀物件那一層複製到的還是位址，所以內層仍然共用。這正是 call by sharing 在拷貝上的延伸。
- c. **「`const obj = {}` 為什麼還能改屬性？」**
　　`const` 鎖的是 Stack 上那一格「不能重新賦值」，鎖不到 Heap 上的物件內容。跟 4-4 是同一個道理的兩種表現。

---

## 六、關聯筆記與關聯理由

| 關聯筆記 | 為什麼關聯 |
|---|---|
| [[V8引擎完整管線-Parse到Deoptimization]] | 4-5 提到的逃逸分析與 Smi 就發生在這條管線的最佳化階段，是「Heap／Stack 只是概念模型」這個 caveat 的出處 |
| [[記憶體最小定址單位 (Byte Addressability)]] | 本篇一直在講「位址」這個值，那篇解釋位址為什麼以 byte 為單位編號，是這裡的前置知識 |
| [[框架-vs-函式庫-控制反轉IoC]] | 同一個資料夾的面試題，共同模式都是「先給判定標準，再給機制解釋」，可以一起練口說 |
| [[JS-native-function-check]] | `Object.is` 是原生函式，那篇的檢查手法可以驗證 `Object.is` 有沒有被 polyfill 蓋掉 |
| ![[學習JS_圖解_StackHeap記憶體示意圖_2026-07-28.svg]] | 舊圖已經畫過 Stack 與 Heap 的分工，本篇 4-5 直接沿用同一套視覺語彙，兩張圖要對照看 |
| ![[學習JS_圖解_Stack位址與SP-BP_2026-07-29.svg]] | SP（Stack Pointer，堆疊指標）與 BP（Base Pointer，基底指標）決定了函式參數放在 Stack 的哪一格，是「參數是複本」這件事的底層原因 |
| ![[學習_網頁_JS變數與機制存在位置分類_2026-07-02.png]] | 舊截圖已分類過哪些東西放在哪，本篇的兩格變數圖是它的區域放大版 |

---

## 七、資料來源與查證日期

- a. MDN Web Docs — [Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)　頁面最後更新 **2026-07-20**　（四種演算法命名、SameValue 與 SameValueZero 的差異、使用 SameValueZero 的內建方法清單）
- b. MDN Web Docs — [Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)　頁面最後更新 **2025-07-10**　（原文：The only difference between `Object.is()` and `===` is in their treatment of signed zeros and NaN values）
- c. IEEE 754 浮點數標準　NaN 比較行為的原始出處
- d. Barbara Liskov, CLU Reference Manual（1979）　call by sharing 一詞的出處
- e. 本篇所有 `true`／`false` 結論皆由 **Node v22.22.2 於 2026-08-06 實際執行驗證**，執行輸出見 `![[學習JS_終端_ObjectIs與SameValueZero實際執行結果_2026-08-06.svg]]`

> [!note] 正確性提醒
> a. 與 `Object.is` 相關的規範自 ES2015 起未變動，MDN 頁面更新日期與內容一致
> b. 4-5 的 V8 實作細節（逃逸分析、Smi）屬於引擎最佳化，會隨版本調整，引用時請標明「概念模型」
