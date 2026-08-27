---
title: "Object 靜態方法 vs 原型方法｜Symbol 弱封裝與 Symbol.species"
type: topic-note
source: Gemini
tags: [gemini, javascript, object, symbol, prototype, static-method, species, 面試]
sources:
  - https://gemini.google.com/app/6bb0c9d66af3d8b5
  - https://gemini.google.com/app/1c3e2e899072c469
  - https://gemini.google.com/app/7b6a8c3812ce011f
  - https://gemini.google.com/app/06dbe8066324c728
updated: 2026-08-25
---

# Object 靜態方法 vs 原型方法｜Symbol 弱封裝與 Symbol.species

> [!info] 本篇重點 a–t 共 20 個
> 這篇把四場 Gemini 對話併成一條主線：<mark style="background: #ADCCFFA6;">key 只能是 string 或 symbol</mark> → Symbol 為什麼「藏得住又藏不死」→ 藏不死的後門 API 是誰 → 為什麼這些後門 API 全都掛在 `Object` 這個「工具箱」上而不是掛在每個物件身上 → 最後延伸到 `Symbol.species` 這個 TC39 自己都後悔的設計。

> [!info] 與其他筆記的關聯（附理由）
> a. 承接 [[Symbol-符號型別與物件key]]：那篇講「key 的型別只有 string 與 symbol」，本篇接著回答「既然 Symbol 藏得住，那要怎麼把它挖出來，以及為什麼挖它的工具是 `Object.xxx()` 而不是 `myObj.xxx()`」。
> b. 呼應 [[存取器屬性三種定義方式-getter-setter與資料驗證]]：`Symbol.species` 本身就是一個「掛在類別上的存取器屬性（getter）」，是那篇 getter 概念在語言規格層級的真實案例。
> c. 呼應 [[函式的兩條線-prototype屬性與Prototype原型]]：本篇 p 節「靜態方法 vs 原型方法」就是那篇「兩條線」的實務版本，一條線走 `Object` 函式本身，另一條線走 `Object.prototype`。
> d. 呼應 [[原型與引擎最佳化-Shape-InlineCache-ValidityCell]]：`Symbol.species` 之所以被 TC39 後悔，理由正是「引擎難以最佳化」，跟那篇講的 Shape 與 Inline Cache 是同一個成本來源。
> e. 呼應 [[Object建構子-plain-object的建立與存取]]：本篇 q 節提到 `Object.create(null)` 造出的無原型物件，正是那篇的延伸情境。

---

## 重點整理

### 一、Symbol 本身是什麼（a–g）

**a.** 在 JavaScript 的物件裡，屬性的 key <mark style="background: #FFF3A3A6;">只允許兩種型別：String 與 Symbol</mark>。其他型別（數字、布林、物件）拿來當 key 都會被自動轉成字串。這也是為什麼 `Reflect.ownKeys(obj)` 會把字串跟 Symbol 混在同一個陣列裡回傳。

**b.** <mark style="background: #ADCCFFA6;">Symbol 是「基本型態（Primitive Type）」</mark>，不是建構子。JavaScript 一共 8 種資料型態：String、Number、Boolean、Null、Undefined、BigInt、Symbol、Object，Symbol 是其中之一。因為它是基本型態，所以 <mark style="background: #FF5582A6;">寫 `new Symbol()` 會直接丟 TypeError</mark>。

**c.** 每呼叫一次 `Symbol()` 都會生出一個全世界獨一無二的值。就算傳入一模一樣的描述字串也一樣不相等：

```js
Symbol("foo") === Symbol("foo");   // false ← 描述字串只是給人看的標籤，不參與比較
```

**d.** 因為 Symbol 值「印不出來也重建不了」，你<mark style="background: #BBFABBA6;">必須用一個變數把它記下來</mark>，否則之後再也存取不到用它當 key 的那個屬性。所以 `const sym1 = Symbol()` 這行的重點不是「示範怎麼存變數」，而是「這把鑰匙只有一把，弄丟就沒了」。

![Abby 截圖：F12 與編輯器對照 Symbol 資料型別與物件方法](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/JS_F12與編輯器_Symbol資料型別與物件方法_2026-06-15.png>)
*Abby 自己的截圖（2026-06-15）：左邊 F12 Console 印出 Symbol 的 `typeof`，右邊編輯器對照寫法，正好對應 b、c 兩節。*

**e.** 把 Symbol 設成 key 的語法是在 key 外面加中括號，這在 MDN 屬於 <mark style="background: #ADCCFFA6;">Computed property names（計算屬性名稱）</mark>。不加中括號的話 `{ a: 1 }` 裡的 `a` 會被當成字串 `"a"`，而不是變數 `a` 的值。

```js
const obj = {};
obj[Symbol("a")] = "a";              // 方式一：中括號賦值
const b = Symbol.for("b");
const object1 = { [b]: "b" };        // 方式二：物件字面值裡直接用中括號
```

**f.** `Symbol.for("key")` 是<mark style="background: #FFB8EBA6;">向「全域 Symbol 註冊表（Global Registry）」索取或建立</mark>一個 Symbol。跟 `Symbol()` 的差別是：`Symbol.for` 拿得回同一個值，可以跨檔案共用；`Symbol()` 每次都是新的。

**g.** 大寫的 `Symbol` 與小寫的 `sym` 是兩件事。<mark style="background: #FFF3A3A6;">大寫 `Symbol` 是「工具箱與製造機」，小寫 `sym` 才是真正拿來當 key 的基本型態零件</mark>。大寫的 `Symbol` 扮演三個角色：（一）創建 Symbol 值的唯一進入點；（二）全域註冊表（`Symbol.for` 與 `Symbol.keyFor`）；（三）掛載 Well-known Symbols（例如 `Symbol.iterator`，`for...of` 底層就是去找物件上的這個 key）。

---

### 二、弱封裝：藏得住，但藏不死（h–l）

![Abby 截圖：MDN Symbol 弱封裝原文與 AI 閃卡](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/學習JS_網頁_MDN-Symbol弱封裝WeakEncapsulation與AI閃卡_2026-08-21.png>)
*Abby 自己的截圖（2026-08-21）：這就是本節在討論的 MDN 原文段落，也是這場 Gemini 對話的起點。*

![Abby 截圖：MDN Symbol 頁面目錄與 Glasp 劃線側欄](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/學習JS_網頁_MDN-Symbol頁面目錄與Glasp劃線筆記側欄_2026-08-21.png>)
*Abby 自己的截圖（2026-08-21）：右側 Glasp／Web Highlights 劃線側欄。對話中問到「能不能把 AI 的補充寫回劃線上」，答案是不行——側欄是擴充功能獨立渲染的介面，只能手動在該劃線下方的 Note 欄位貼上。*

**h.** MDN 原文說 Symbol 帶來 *a form of weak encapsulation, or a weak form of information hiding*。所謂「藏起來」，是指<mark style="background: #BBFABBA6;">下面這些「日常機制」通通看不到 Symbol key</mark>：

| 日常存取機制 | 看得到 String key | 看得到 Symbol key |
|---|---|---|
| `for...in` 迴圈 | 是 | 否 |
| `Object.keys(obj)` | 是 | 否 |
| `JSON.stringify(obj)` | 是 | 否 |
| `Object.getOwnPropertyNames(obj)` | 是 | 否 |
| `Object.getOwnPropertySymbols(obj)` | 否 | 是 |
| `Reflect.ownKeys(obj)` | 是 | 是 |

```js
const secretKey = Symbol("id");
const user = { name: "Alice", [secretKey]: 9527 };

for (let key in user) console.log(key);   // 只印出 "name"
console.log(Object.keys(user));           // ["name"]
console.log(JSON.stringify(user));        // '{"name":"Alice"}'

// 但專用 API 還是挖得到 → 所以叫「弱」封裝
const symbols = Object.getOwnPropertySymbols(user);
console.log(user[symbols[0]]);            // 9527
```

**i.** 之所以叫「弱」，是因為 JS 留了後門：<mark style="background: #FF5582A6;">`Object.getOwnPropertySymbols(obj)` 與 `Reflect.ownKeys(obj)` 只要有人想硬挖就挖得到</mark>。它不像 `#privateField` 那樣是語法層級的真私有。一句話記法：Symbol 是<mark style="background: #FFF3A3A6;">防君子不防小人</mark>。

**j.** `Reflect.ownKeys` 的底層就是把兩種 key 合起來：

```
Reflect.ownKeys(obj) === Object.getOwnPropertyNames(obj) + Object.getOwnPropertySymbols(obj)
```

**k.** `Object.getOwnPropertySymbols()` 的三個實務情境：

1. **讀取私有或內部屬性**：在 ES2022 的 `#` 私有欄位出現之前，大家用 Symbol 藏內部狀態。做單元測試、除錯或狀態備份時要靠這支 API 撈出來。
2. **實作深拷貝與物件合併**：只用 `Object.keys()` 會漏掉 Symbol 屬性。Lodash 的 `cloneDeep` 就是靠這支 API 把 Symbol 屬性一併複製。
3. **檢查框架掛的元資料（Metadata / Hooks）**：Redux、React、RxJS 這類函式庫會用 Well-known Symbol（`Symbol.iterator`、`Symbol.dispose`）或自訂 Symbol 掛元資料，避免跟使用者的字串 key 撞名。寫 DevTools 或外掛時會用這支 API 檢查物件上掛了什麼。

**l.** 要「真的」不給存取，有兩條路，強度不同：

```js
// 路線一：Symbol（弱私有）——鑰匙不 export 就進不來，但 getOwnPropertySymbols 挖得到
const _status = Symbol("status");
export class Task {
  constructor(title) { this.title = title; this[_status] = "In Progress"; }
  getStatus() { return this[_status]; }
}
const t1 = new Task("Fix Bug");
console.log(t1.status);        // undefined
console.log(t1["_status"]);    // undefined ← 因為 key 是 Symbol，不是字串 "_status"

// 路線二：ES2022 原生私有欄位（語法層真私有）
class Task2 {
  #status = "In Progress";
  getStatus() { return this.#status; }
}
const t2 = new Task2();
// console.log(t2.#status);    // SyntaxError（這是早期錯誤，連跑都跑不起來）
```

> [!warning] 陷阱
> 只在變數名前面加底線的 `_status` <mark style="background: #FF5582A6;">完全不是私有</mark>，那只是「拜託你不要碰」的命名慣例，技術上一點防護都沒有。

---

### 三、順手釐清的 JSON 三題（m–o）

**m.** `JSON.stringify()` 是把 JS 值序列化（Serialization）成 JSON 字串，三個最常見用途：（一）Fetch/AJAX 送 request body（HTTP body 只吃字串）；（二）寫進 `localStorage` 或 `sessionStorage`（只支援字串）；（三）除錯排版，第三個參數傳縮排數，例如 `JSON.stringify(data, null, 2)`。

**n.** `JSON.stringify()` 的三個坑：

- 屬性值是 `undefined`、`Function` 或 <mark style="background: #FFB8EBA6;">`Symbol` 時會被直接丟棄</mark>。
- 物件有循環引用（Circular Reference）時直接丟 TypeError。
- 所以 `JSON.parse(JSON.stringify(obj))` 這種偷懶深拷貝<mark style="background: #FF5582A6;">會默默吃掉 Date、Map、Set、Function、Symbol</mark>，不是萬用解。

**o.** `JSON.parse(JSON.stringify(obj))` 裡誰在複製？<mark style="background: #BBFABBA6;">兩個一起才完成複製，但真正「建立新物件」的是 `JSON.parse`</mark>。`stringify` 負責把物件壓成純文字，順手斬斷跟原本記憶體位址的引用關係（鋪路）；`parse` 才在記憶體裡重新蓋出一份全新的物件（執行）。

---

### 四、靜態方法 vs 原型方法（p–r）

**p.** 兩者的差別在「掛在哪裡」：

| 類型 | 定義位置 | 呼叫方式 | 例子 |
|---|---|---|---|
| 靜態方法 Static | 直接掛在 `Object` 這個**函式本身** | `Object.方法(myObj)` | `Object.assign()`、`Object.keys()`、`Object.freeze()`、`Object.create()`、`Object.hasOwn()` |
| 原型方法 Instance/Prototype | 掛在 `Object.prototype` **原型物件**上 | `myObj.方法()` | `hasOwnProperty()`、`toString()`、`valueOf()` |

<mark style="background: #FFF3A3A6;">靜態方法無法被實例繼承</mark>，所以只能寫 `Object.keys(myFirstObject)`，不能寫 `myFirstObject.keys()`（會噴 `TypeError: myFirstObject.keys is not a function`）。

![Abby 截圖：DevTools 展開 Object 的原型方法列表](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/JS_DevTools_Object原型方法列表_2026-06-10.png>)
*Abby 自己的截圖（2026-06-10）：DevTools 裡展開 `Object.prototype`，看到的是 `hasOwnProperty`、`toString`、`valueOf` 這條「實例走的路」。*

![Abby 截圖：DevTools Console 印出 Object 靜態方法總覽](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/JS_DevTools_Object靜態方法總覽Console輸出-create與constructor_2026-06-12.png>)
*Abby 自己的截圖（2026-06-12）：同一張 Console 裡對照 `Object.create` 與 `constructor`，剛好是「工具箱」與「椅子」兩條線的實測畫面。*

![Abby 截圖：__proto__ 是存取器屬性而非靜態方法的驗證](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/學習JS_編輯器_Object-prototype的proto是存取器屬性非靜態方法驗證_2026-08-20.png>)
*Abby 自己的截圖（2026-08-20）：親手驗證 `Object.prototype.__proto__` 是**存取器屬性**而不是靜態方法。這張圖同時串起本篇 p 節與 s 節——`Symbol.species` 也是同一種「掛在類別上的 getter」。*

> [!tip] Gemini 給的比喻很好記
> 把 `Object` 想成一個**工具箱**，`myFirstObject` 是你「用工具箱做出來的一把椅子」。椅子自己有屬性（顏色、材質）跟行為（`toString()`）；但工具箱上的量測工具（`Object.keys()`）與複製工具（`Object.assign()`），<mark style="background: #ADCCFFA6;">你不能叫椅子自己去執行，你得拿著工具箱對著這把椅子用</mark>。

**q.** 為什麼要特地分開？兩個理由：

1. **命名污染與衝突**：如果所有工具都掛在 `Object.prototype` 上，使用者自訂物件只要剛好也有一個叫 `assign` 的屬性，`myObj.assign()` 就會被覆蓋，程式默默壞掉。
2. **無原型物件的問題**：<mark style="background: #D2B3FFA6;">`Object.create(null)` 造出來的物件沒有原型</mark>，方法若都在 `Object.prototype` 上，這種物件就一個功能都用不到。而這種空原型物件在實務上常被拿來當 `Map` 的替代品，正因為它不會繼承 `Object.prototype` 的雜訊。

![Abby 截圖：Map 與 Object 比較，空物件原型屬性](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/JS_網頁_YouTube影片Map與Object比較-空物件原型屬性_2026-06-11.png>)
*Abby 自己的截圖（2026-06-11）：這張影片截圖講的正是「為什麼要用 `Object.create(null)` 或 `Map` 取代一般物件當字典」，是本節第 2 點的視覺版。*

![Abby 截圖：Object.freeze 與 seal 的錯誤輸出](<../../../../obsidian-attachment/學習-JavaScript (2026-06)/JS_DevTools_Object靜態方法freeze與seal錯誤輸出_2026-06-12.png>)
*Abby 自己的截圖（2026-06-12）：實測 `Object.freeze()` 與 `Object.seal()` 在嚴格模式下的報錯訊息，對應下一節 r 的凍結範例。*

**r.** 常用靜態方法速查（都要寫 `Object.` 開頭）：

```js
const myFirstObject = { name: "Abby", age: 25, role: "developer" };

Object.keys(myFirstObject);      // ["name", "age", "role"]
Object.values(myFirstObject);    // ["Abby", 25, "developer"]
Object.entries(myFirstObject);   // [["name","Abby"], ["age",25], ["role","developer"]]

const user = { name: "Yun-Xi" };
Object.freeze(user);             // 凍結：不能改、不能加、不能刪
user.name = "Change Name";
console.log(user.name);          // 仍是 "Yun-Xi"（嚴格模式下會直接報錯）
Object.isFrozen(user);           // true

Object.hasOwn(user, "name");     // true ← ES2022 推薦，比 user.hasOwnProperty() 安全

const animal = { makeSound() { console.log("Some sound"); } };
const dog = Object.create(animal);   // 指定原型建立新物件
dog.makeSound();                     // "Some sound"（走原型鏈繼承）
```

---

### 五、`Symbol.species` 這個語言設計上的後悔（s–t）

**s.** `Symbol.species` 是 ES6（ES2015）引進的 Well-known Symbol。它的原始用意是：<mark style="background: #ADCCFFA6;">當子類別（Subclass）的方法要回傳「新實例」時，用它來決定要用哪個建構子</mark>。例如 `Array.prototype.map()` 回傳新陣列時，規格上會先去讀 `[Symbol.species]`。ECMA-262 為了規格一致性，替所有內建集合類別（Array、Set、Map、Promise、RegExp、TypedArray）統一加上這個靜態存取器（Getter）。

**t.** 但 `Map[Symbol.species]` 目前是<mark style="background: #FFB8EBA6;">一個沒人呼叫的「死屬性」</mark>：Map 的內建方法（`set()`、`get()`、`forEach()`）通通不會建立並回傳新的 Map 實例，所以完全沒有東西會去讀它。它保留在規格裡純粹是為了向下相容。

實測範例（這就是「species 沒被讀到」最直白的證據）：

```js
let setCalled = 0;
class MySet extends Set {
  static get [Symbol.species]() { setCalled++; return Set }
}
new MySet([1,2,3]).union(new Set([4])) instanceof MySet;   // false
console.log(setCalled);                                     // 0
```

<mark style="background: #FFF3A3A6;">整段翻成中文</mark>：我做一個叫 `MySet` 的類別，它 `extends`（繼承）`Set`，所以自動擁有 `Set` 的所有能力。在這個**類別本身**（不是它產出的實例）上，我用 `static get` 掛一個名字叫 `Symbol.species` 的存取器屬性——只要有人讀它，計數器就加一，然後回傳 `Set`。接著我用 `[1,2,3]` 建一個 `MySet`，對它呼叫 `union` 並傳入一個普通 `Set`。最後檢查 `union` 吐回來的東西是不是 `MySet` 的實例——答案是 `false`，而且計數器停在 `0`，代表 <mark style="background: #FF5582A6;">`union` 從頭到尾根本沒讀過 species</mark>。

逐字拆解每個關鍵字：

| 關鍵字 | 全名／意思 | 在這行做什麼 |
|---|---|---|
| `class` | 類別宣告 | ES6 語法糖，底層仍是建構函式加原型鏈，不是真正的 class-based OOP |
| `extends` | 繼承 | 把 `MySet.prototype.[[Prototype]]` 指向 `Set.prototype`，同時把 `MySet.[[Prototype]]` 指向 `Set`（所以靜態方法也會繼承） |
| `static` | 靜態成員 | 掛在**建構函式本身**上，不掛在 prototype 上，呼應本篇 p 節 |
| `get` | 存取器 getter | 讀取這個屬性時才執行函式，這就是「存取器屬性」，呼應 [[存取器屬性三種定義方式-getter-setter與資料驗證]] |
| `[Symbol.species]` | 計算屬性名稱 + Well-known Symbol | 中括號代表「用變數的值當 key」，呼應本篇 e 節 |
| `instanceof` | 原型鏈檢查 | 沿著左邊物件的原型鏈找，看有沒有等於右邊建構函式的 `.prototype` |

> [!warning] 存疑與更正（對照 TC39 一手資料）
> Gemini 說「TC39 傾向未來可能逐漸廢棄（Deprecate）」——這個方向<mark style="background: #BBFABBA6;">大致正確，但講法要更精確</mark>。實際狀況是：
> 1. `Symbol.species` <mark style="background: #FF5582A6;">並沒有被正式標記為 deprecated</mark>，舊有的 Array、RegExp、Promise、TypedArray 仍然照舊會讀它。
> 2. TC39 的官方文件用詞是「committee has largely come to regret `Symbol.species`」（委員會大致上已經後悔了）。ES2025 新加的 Set 方法（`union`、`intersection`、`difference` 等）<mark style="background: #BBFABBA6;">刻意不使用 species，永遠直接建立基底 `Set` 型別的實例</mark>——這正是上面那段程式碼跑出 `false` 與 `0` 的規格依據。
> 3. 委員會給的理由是：內建方法透過 `@@species` 建立子類別實例，被許多實作者視為「TC39 對這個語言犯下最大的錯誤之一」，因為它讓引擎最佳化變得極度複雜，並且<mark style="background: #FF5582A6;">直接導致過許多資安漏洞</mark>。
> 4. 另有一份提案 `proposal-rm-builtin-subclassing`（移除內建型別的 subclassing）正在推動更徹底的清理。

---

## 相關練習題（LeetCode JavaScript 專區）

因為這篇談的是「物件模型與 Symbol」，以下三題是最貼近本篇概念的實作練習：

| 題號與題目 | 練到本篇哪一節 | 連結 |
|---|---|---|
| 2695. Array Wrapper | s、t 節：用 `Symbol.toPrimitive` 這個 Well-known Symbol 客製化型別轉換，跟 `Symbol.species` 同屬「用 Symbol 當語言的掛鉤」 | <https://leetcode.com/problems/array-wrapper/> |
| 2705. Compact Object | h、m、n 節：遞迴走訪物件並過濾 falsy 值，會直接踩到 `Object.keys` 看不到 Symbol 的行為 | <https://leetcode.com/problems/compact-object/> |
| 2727. Is Object Empty | p、r 節：判斷空物件，最佳解正是用 `Object.keys(obj).length` 這個靜態方法 | <https://leetcode.com/problems/is-object-empty/> |
| 2822. Inversion of Object | q 節：翻轉 key 與 value 時會撞到「非字串 key 被自動轉字串」的坑 | <https://leetcode.com/problems/inversion-of-object/> |

---

## 自我測驗

<div class="quiz" markdown="0">
<div class="q">填空題 1：物件的屬性 key 只允許兩種型別，分別是 <span class="blank">String</span> 與 <span class="blank">Symbol</span>。</div>
<div class="q">填空題 2：能同時列出字串 key 與 Symbol key 的 API 是 <span class="blank">Reflect.ownKeys()</span>。</div>
<div class="q">填空題 3：ES2022 提供語法層級真私有的寫法，是在欄位名稱前面加上 <span class="blank">#</span>。</div>
</div>

<div class="quiz" markdown="0">
<div class="q">是非題 1：<code>new Symbol("foo")</code> 可以正常建立一個 Symbol。</div>
<div class="opts"><button onclick="pick(this,false)">是</button><button onclick="pick(this,true)">非</button></div>
<div class="ans">非。Symbol 是基本型態不是建構子，寫 <code>new Symbol()</code> 會丟 TypeError。要用 <code>Symbol("foo")</code>。（本篇 b 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">是非題 2：<code>JSON.stringify()</code> 會把物件上的 Symbol 屬性一併轉成字串。</div>
<div class="opts"><button onclick="pick(this,false)">是</button><button onclick="pick(this,true)">非</button></div>
<div class="ans">非。<code>JSON.stringify()</code> 會直接丟棄值為 undefined、Function、Symbol 的屬性，Symbol 當 key 的屬性也整個看不到。（本篇 h、n 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">是非題 3：<code>Object.assign()</code> 可以寫成 <code>myObj.assign(target, source)</code>。</div>
<div class="opts"><button onclick="pick(this,false)">是</button><button onclick="pick(this,true)">非</button></div>
<div class="ans">非。<code>assign</code> 是掛在 <code>Object</code> 建構函式上的靜態方法，不在 <code>Object.prototype</code> 上，所以實例繼承不到，只能寫 <code>Object.assign(target, source)</code>。（本篇 p 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">申論題 1：為什麼 JavaScript 要把 <code>keys</code>、<code>assign</code>、<code>freeze</code> 設計成 <code>Object</code> 的靜態方法，而不是放進 <code>Object.prototype</code> 讓每個物件直接呼叫？請至少講兩個理由。</div>
<button class="tb" onclick="showAns(this)">顯示答案</button>
<div class="ans">參考答案：<br>一、避免命名污染與覆蓋。若掛在 <code>Object.prototype</code>，使用者自訂物件只要剛好有同名屬性，就會遮蔽掉原型上的方法，導致行為不如預期。<br>二、支援無原型物件。<code>Object.create(null)</code> 造出的物件沒有原型鏈，若方法都掛在 <code>Object.prototype</code>，這類物件（常被拿來當乾淨的字典使用）就完全無法使用這些功能。<br>三、語意上這些是「對物件動手的工具函式」而非「物件自身的行為」，放在工具箱比較符合職責分離。（本篇 q 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">申論題 2：說明為什麼用 Symbol 做的封裝叫「弱封裝」，並舉出至少兩個可以突破它的 API。若要真正的私有應該怎麼寫？</div>
<button class="tb" onclick="showAns(this)">顯示答案</button>
<div class="ans">參考答案：<br>Symbol key 對日常存取機制（<code>for...in</code>、<code>Object.keys</code>、<code>JSON.stringify</code>、<code>Object.getOwnPropertyNames</code>）是隱形的，所以有「藏起來」的效果；但語言留了後門，<code>Object.getOwnPropertySymbols(obj)</code> 與 <code>Reflect.ownKeys(obj)</code> 都能把 Symbol key 撈出來，因此只能算「防君子不防小人」的弱封裝。要真正私有，應使用 ES2022 的 <code>#privateField</code>，從語法層級禁止外部存取（外部存取是 SyntaxError 早期錯誤）。（本篇 h、i、l 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">申論題 3：解釋 <code>class MySet extends Set { static get [Symbol.species]() { return Set } }</code> 這段程式碼中，<code>class</code>、<code>extends</code>、<code>static</code>、<code>get</code>、中括號各自的作用，並說明為什麼對 <code>MySet</code> 呼叫 <code>union()</code> 之後的結果不是 <code>MySet</code> 的實例。</div>
<button class="tb" onclick="showAns(this)">顯示答案</button>
<div class="ans">參考答案：<code>class</code> 宣告類別（底層仍是建構函式加原型鏈）；<code>extends</code> 讓 <code>MySet.prototype</code> 繼承 <code>Set.prototype</code>，同時讓 <code>MySet</code> 本身繼承 <code>Set</code> 的靜態成員；<code>static</code> 表示這個成員掛在建構函式本身而非 prototype 上；<code>get</code> 定義存取器屬性，被讀取時才執行；中括號是計算屬性名稱，讓 <code>Symbol.species</code> 這個 Symbol 值當作 key。<br>結果不是 <code>MySet</code> 的實例，是因為 ES2025 的 Set 方法（union、intersection、difference 等）在規格上刻意不讀 <code>Symbol.species</code>，一律直接建立基底 <code>Set</code> 型別的實例，所以計數器會停在 0。（本篇 t 節）</div>
</div>

---

## 各對話來源（原文精華）

> 註：為了節省本機磁碟空間（詳見文末說明），此區保留原始問答的關鍵段落而非完整逐字稿，語意未經改寫。

### 1. Symbol 的弱封裝與資訊隱藏（2026-08）— <https://gemini.google.com/app/6bb0c9d66af3d8b5>

**使用者：** 我看不懂 other code will typically use to access the object. That enables a form of weak encapsulation, or a weak form of information hiding 是什麼意思？

**Gemini：** Symbol 常被用來替物件新增「獨一無二的屬性鍵」，這些鍵不會與其他程式碼加入的鍵發生衝突，而且對於其他程式碼「通常用來存取物件的機制」來說，這些鍵是隱藏起來的。這實現了一種弱封裝或弱資訊隱藏……雖然用一般常見的機制抓不到，但 JavaScript 還是提供了「專用」的 API 來強制讀取：`Object.getOwnPropertySymbols(obj)`、`Reflect.ownKeys(obj)`。

**使用者：** Symbol 是被它的 Symbol.for 加入過的物件就會被稱作 symbol，還是說那個 key name 本人才是 symbol？

**Gemini：** Key Name 本人才是 Symbol。物件本身只是一個普通的 JavaScript 物件，它並不會因為加入了 Symbol key 就被稱為 Symbol……這也就是為什麼 `Reflect.ownKeys(obj)` 會把 String 與 Symbol 放在一起比較的原因。

**使用者：** ubiquitous 是什麼意思？全域物件主導創建了 Symbol 值本身跟工具箱還有進入點嗎？

**Gemini：** Ubiquitous 意思是「無所不在的」……全域物件 `Symbol`（大寫）扮演三個關鍵角色：創建 Symbol 值的進入點、全域 Symbol 註冊表、系統內建的標準通訊協定（Well-known Symbols）。一句話總結：`Symbol`（大寫）是 JS 系統提供給你的實體工具箱與製造機；你呼叫它之後拿到的 `sym`（小寫）才是真正拿來當作物件 Key 的基本型態零件。

### 2. Object.getOwnPropertySymbols 的應用情境（2026-08）— <https://gemini.google.com/app/1c3e2e899072c469>

**使用者：** 使用 Object.getOwnPropertySymbols 會用在什麼使用情境？

**Gemini：** 常出現的 3 個實際應用情境：一、存取物件的私有或隱藏屬性；二、實現深拷貝與物件合併（Lodash 的 `cloneDeep` 會利用此 API 確保連同 Symbol 屬性一併複製）；三、檢查與擴充套件或框架的元資料（Redux、React、RxJS 會用 Well-known Symbols 或自訂 Symbol 掛載元資料）。

**使用者：** 「JSON.parse(JSON.stringify(obj))」在這個語法中，JSON parse 跟 stringify 哪個部分是複製的動作？

**Gemini：** 兩個部分合在一起才完成了完整的「複製」動作，但發揮關鍵作用的是 `JSON.parse`。`stringify` 徹底切斷了與原本物件在記憶體中的引用關係；`parse` 解析字串並在記憶體中重新建構出一組全新的物件，產生這個新物件的時刻才是真正完成「複製」的動作。

### 3. Map 的 Symbol.species 探討（2026-08）— <https://gemini.google.com/app/7b6a8c3812ce011f>

**使用者：** 為何 Map 的 static properties 有 `[Symbol.species]`？

**Gemini：** 在 ES6 中引進了衍生物件的概念。`Symbol.species` 的核心目的在於讓子類別的方法在複製或返回新實例時，能指定要回傳「子類別的實例」還是「父類別（原生）的實例」……ECMA-262 為了保持所有內建集合與類別在 ES6 屬性設計上的一致性，統一為它們加上了 `[Symbol.species]` 靜態讀取器……在目前的 JavaScript 標準中，Map 的所有內建方法都不會建立並回傳新的 Map 實例，因此 `Map[Symbol.species]` 實際上是完全沒有被任何內建方法呼叫到的。

### 4. JavaScript 原型鏈與多型解釋（2026-08）— <https://gemini.google.com/app/06dbe8066324c728>

**使用者：** Object 建構函式上的靜態方法，跟 Object.prototype 不同？

**Gemini：** 是的，這兩者有非常關鍵的差異……為什麼會有這個區分？防止屬性名稱衝突與安全性考量。如果把所有方法都掛在 `Object.prototype` 上，可能會產生兩個問題：命名污染與衝突、無原型物件的問題（透過 `Object.create(null)` 建立的物件是沒有原型的）。

**使用者：** 所以是只能寫 `Object.`？不能寫 `myFirstObject`？

**Gemini：** 完全正確！只能寫 `Object.方法名()`……你可以把 `Object` 想成一個「工具箱」，而 `myFirstObject` 是你「用工具箱做出來的一把椅子」。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| Gemini 對話：Symbol 的弱封裝與資訊隱藏 | <https://gemini.google.com/app/6bb0c9d66af3d8b5> | 對話時間 2026-08，擷取於 2026-08-25 |
| Gemini 對話：Object.getOwnPropertySymbols 的應用情境 | <https://gemini.google.com/app/1c3e2e899072c469> | 對話時間 2026-08，擷取於 2026-08-25 |
| Gemini 對話：Map 的 Symbol.species 探討 | <https://gemini.google.com/app/7b6a8c3812ce011f> | 對話時間 2026-08，擷取於 2026-08-25 |
| Gemini 對話：JavaScript 原型鏈與多型解釋 | <https://gemini.google.com/app/06dbe8066324c728> | 對話時間 2026-08，擷取於 2026-08-25 |
| MDN：Symbol（弱封裝原文出處） | <https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Symbol> | 查證於 2026-08-25 |
| MDN：Symbol.species | <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species> | 查證於 2026-08-25 |
| MDN：Set.prototype.union（ES2025 新方法） | <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/union> | 查證於 2026-08-25 |
| TC39 proposal-set-methods／details.md（「不使用 species」的一手依據） | <https://github.com/tc39/proposal-set-methods/blob/main/details.md> | 查證於 2026-08-25 |
| TC39 proposal-rm-builtin-subclassing（移除內建 subclassing 提案） | <https://github.com/tc39/proposal-rm-builtin-subclassing> | 查證於 2026-08-25 |
| ECMAScript 2025 Language Specification | <https://tc39.es/ecma262/2025/> | 2025 版，查證於 2026-08-25 |
| ECMAScript 2025 定案報導（Set Methods 收錄） | <https://socket.dev/blog/ecmascript-2025-finalized> | 查證於 2026-08-25 |
