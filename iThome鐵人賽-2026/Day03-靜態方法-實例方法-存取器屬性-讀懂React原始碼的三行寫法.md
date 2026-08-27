---
title: "Day 3｜靜態方法、實例方法、存取器屬性：讀懂 React 原始碼的三行寫法"
series: 從 JS 核心機制到 React 核心原理：30天打造穩固的前端基本功
day: 3
type: article-draft
tags: [ithome, 鐵人賽, javascript, prototype, static-method, accessor-property, react, react-source]
updated: 2026-08-19
---

# Day 3｜靜態方法、實例方法、存取器屬性：讀懂 React 原始碼的三行寫法

> 純 Markdown 格式，沒有用 Obsidian 的 callout 與 highlight 語法，可以直接貼到 iThome。

## 這篇接在哪、被哪一篇用到

Day 2 我們把原型鏈走了一遍，知道 `getPrototypeOf` 只往上跳一階，也知道 `Object.prototype` 是所有一般物件的共用終點站。

今天要處理的是**下一個問題**：既然東西可以掛在 `Object` 上、也可以掛在 `Object.prototype` 上，**這兩種掛法差在哪？為什麼 JS 要分兩種？**

這件事看起來像語法細節，但它會在後面的篇章連續出現三次：

- 講 **class component 與 hooks 的差別**時，你會需要知道 `setState` 到底存在哪
- 講 **React 為什麼不用 getter 攔截 state**時，你會需要知道存取器屬性是什麼
- 講 **PureComponent 怎麼繼承 Component**時，你會需要看懂 React 原始碼裡那三行手動接原型鏈的寫法

所以今天先把地基打好。而且我會直接翻 React 19 的原始碼給你看，因為這三種掛法在裡面全部都有。

---

## 一、先看三行 React 原始碼

這三行都出自 `react` 套件的 `cjs/react.development.js`（版本 19.2.8，我實際抓下來看的）：

```js
// A
Component.prototype.setState = function (partialState, callback) { ... };

// B
var hasOwnProperty = Object.prototype.hasOwnProperty;
// 使用時
hasOwnProperty.call(config, propName)

// C（這個是 React 對外的 API，不是內部實作）
class MyComponent extends React.Component {
  static getDerivedStateFromProps(props, state) { ... }
}
```

三個問題：

1. A 為什麼要寫 `Component.prototype.setState`，不是寫在 constructor 裡面？
2. B 為什麼要把 `hasOwnProperty` 抓出來另存一份，然後用 `.call()` 借過來用，而不是直接 `config.hasOwnProperty(propName)`？
3. C 為什麼是 `static`？為什麼裡面不能用 `this`？

這三題的答案是同一件事：**JavaScript 有三種把東西掛上去的位置，它們的語意完全不同。**

---

## 二、三種掛法

先講結論，這張表是今天的主軸：

| 掛法 | 掛在哪 | 誰拿得到 | 怎麼用 | 例子 |
| --- | --- | --- | --- | --- |
| **靜態方法** static method | 建構函式本身 | 只有建構函式自己 | `Object.keys(obj)`，物件當**參數** | `Object.getPrototypeOf()` |
| **實例方法** instance method | `建構函式.prototype` | 所有實例，透過原型鏈共用 | `obj.method()`，物件是 `this` | `obj.hasOwnProperty()` |
| **存取器屬性** accessor property | 通常也在 `.prototype` | 所有實例 | **不呼叫**，讀寫時自動觸發 | `obj.__proto__` |

最容易搞混的是第三種，因為它長得像屬性、行為像函式。

### 2-1. 靜態方法：掛在建構函式身上

```js
Object.keys(person)          // 正確：person 當參數傳進去
person.keys()                // TypeError: person.keys is not a function
```

`Object.keys` 是掛在 `Object` 這個建構函式上的，跟 `Object.prototype` 一點關係都沒有。所以你的物件拿不到它，只能反過來當參數傳進去。

用 Day 2 學的方法可以直接驗證東西掛在哪：

```js
Object.hasOwn(Object, 'keys')             // true  ← 在建構函式上
Object.hasOwn(Object.prototype, 'keys')   // false ← 不在原型上
```

### 2-2. 實例方法：掛在 prototype 上，全體共用

```js
const a = {};
const b = {};

a.hasOwnProperty === b.hasOwnProperty                  // true
a.hasOwnProperty === Object.prototype.hasOwnProperty   // true
```

**兩個不同的物件，拿到的是同一份函式。** 這就是原型鏈存在的意義：方法只存一份在 `Object.prototype` 上，一百萬個物件共用它，不會每個物件各存一份浪費記憶體。

### 2-3. 存取器屬性：長得像屬性，其實是一組函式

一般的屬性存的是「值」，這叫**資料屬性 data property**。但 JS 還有另一種屬性存的是「一段程式」，這叫**存取器屬性 accessor property**：

```js
const person = {
  first: 'Abby',
  last: 'L',
  get full() {                    // 讀取時自動執行
    return this.first + ' ' + this.last;
  }
};

person.full        // 'Abby L'  ← 沒有括號，但 getter 執行了
person.full()      // TypeError: person.full is not a function
```

**JS 內建就有一個現成的存取器屬性，你天天看到它：`__proto__`。**

```js
Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
// { get: [Function], set: [Function], enumerable: false, configurable: true }
// 有 get 與 set、沒有 value → 存取器描述器
```

所以 `obj.__proto__` 不是方法（不能加括號），也不是靜態（不在 `Object` 上），它是**定義在 `Object.prototype` 上的存取器屬性**，讀的時候 getter 跑、寫的時候 setter 跑。

---

## 三、把 Object.prototype 整個攤開來看

理論講完，直接看真相。`Object.prototype` 上總共只有 **12 個**自有屬性：

```js
Object.getOwnPropertyNames(Object.prototype).length   // 12
Object.keys(Object.prototype)                          // []  ← 空陣列！
```

| 成員 | 種類 | 備註 |
| --- | --- | --- |
| `constructor` | method | 指回 `Object` 本身 |
| `hasOwnProperty` | method | 今天的主角之一 |
| `isPrototypeOf` | method | 判斷 A 在不在 B 的原型鏈上 |
| `propertyIsEnumerable` | method | 判斷屬性可不可被列舉 |
| `toString` | method | 型別偵測那招用的就是它 |
| `toLocaleString` | method | 本地化版本 |
| `valueOf` | method | 轉原始值時被呼叫 |
| **`__proto__`** | **accessor** | **12 個裡面唯一的存取器屬性** |
| `__defineGetter__` | method | 已廢棄 |
| `__defineSetter__` | method | 已廢棄 |
| `__lookupGetter__` | method | 已廢棄 |
| `__lookupSetter__` | method | 已廢棄 |

兩個值得注意的點：

**第一，`Object.keys(Object.prototype)` 是空陣列。** 因為這 12 個成員的 `enumerable` 全部是 `false`。如果不是這樣，你每次寫 `for (const k in obj)` 都會掃出一堆繼承來的方法名稱，那會是災難。

**第二，只有 `__proto__` 是存取器，其他 11 個都是方法。** 所以「`Object.prototype` 上掛的是方法還是存取器屬性」這個問題的答案是：**兩種都有，但 11 比 1**。

更精確的說法是這樣的分類：

```
屬性 property
├─ 資料屬性 data property      → { value, writable, enumerable, configurable }
│  └─ 值剛好是函式時，我們口語叫它「方法 method」
└─ 存取器屬性 accessor property → { get, set, enumerable, configurable }
```

「方法」不是跟「存取器屬性」平行的分類，它是**資料屬性的一種特例**：值剛好是個函式而已。

---

## 四、順便講版本：這些東西什麼時候才有的

面試被問到「這是 ES5 還是 ES6」很常見，整理一張表：

| 成員 | 版本 | 掛法 |
| --- | --- | --- |
| `toString`、`valueOf` | ES1（1997） | 實例方法 |
| `hasOwnProperty`、`isPrototypeOf`、`propertyIsEnumerable` | ES3（1999） | 實例方法 |
| `Object.getPrototypeOf`、`Object.keys`、`Object.create` | **ES5（2009）** | 靜態方法 |
| `Object.defineProperty`、`getOwnPropertyDescriptor` | ES5（2009） | 靜態方法 |
| `Object.freeze`、`seal`、`preventExtensions` | ES5（2009） | 靜態方法 |
| **`__proto__`** | **ES2015 的 Annex B** | **存取器屬性** |
| `Object.setPrototypeOf`、`assign`、`is`、`getOwnPropertySymbols` | ES2015 | 靜態方法 |
| `Object.values`、`entries`、`getOwnPropertyDescriptors` | ES2017 | 靜態方法 |
| `Object.fromEntries` | ES2019 | 靜態方法 |
| `Object.hasOwn` | ES2022 | 靜態方法 |
| `Object.groupBy` | ES2024 | 靜態方法 |

`__proto__` 這一列要特別講。它**不是 ES5 的東西**，而且它進規範的方式跟其他人不一樣。

它在瀏覽器裡存在很久了（早期由 SpiderMonkey 引入，其他引擎跟進），但一直是**各家自己實作的非標準功能**。到了 ES2015，因為太多網站已經在用、拿掉會壞掉，才被寫進規範的 **Annex B**——那是專門收「為了網頁相容性不得不承認的遺留特性」的附錄。

所以 MDN 上它被標 **deprecated**，理由有三個：

1. **效能**：MDN 原文說改動 `__proto__` 在每一個瀏覽器與 JS 引擎上都是「非常慢的操作」
2. **安全**：原型污染 prototype pollution 攻擊的主要入口
3. **定位**：它是遺留特性，不是正統設計

要讀原型用 `Object.getPrototypeOf()`，要寫用 `Object.setPrototypeOf()`。

---

## 五、回到 React 原始碼

現在三個問題可以回答了。以下程式碼行為都對照 React 19.2.8 的 `react/cjs/react.development.js`。

### 5-1. 為什麼 `Component.prototype.setState`

```js
Component.prototype.isReactComponent = {};
Component.prototype.setState = function (partialState, callback) { ... };
Component.prototype.forceUpdate = function (callback) { ... };
```

React 把 `setState` 掛在 `Component.prototype` 上，而不是寫在建構函式裡。理由就是 2-2 講的：**一份共用**。

你的 App 裡有 500 個 class component 實例，`setState` 這個函式在記憶體裡只有一份，掛在 `Component.prototype`。每個實例透過原型鏈拿到同一份。如果寫在 constructor 裡，就會變成 500 份一模一樣的函式。

順帶回答一個常見的面試題：**為什麼 `this.setState` 在 callback 裡會壞掉？**

```jsx
<button onClick={this.handleClick}>       // 壞掉
<button onClick={() => this.handleClick()}>  // 正常
```

因為 `setState` 內部第一行就是 `this.updater.enqueueSetState(this, ...)`——它**吃 `this`**。而 `this` 是呼叫時才決定的，把方法從物件身上拆下來單獨傳出去，`this` 就掉了。這正是「實例方法」跟「靜態方法」最根本的差別：**實例方法在意 `this` 是誰，靜態方法不在意**。

### 5-2. 為什麼要 `hasOwnProperty.call(config, propName)`

React 原始碼裡先把它抓出來存一份：

```js
var hasOwnProperty = Object.prototype.hasOwnProperty;
```

然後在建立 element、把 JSX 屬性抄進 props 的迴圈裡這樣用：

```js
for (propName in config)
  hasOwnProperty.call(config, propName) &&
    'key' !== propName &&
    '__self' !== propName &&
    '__source' !== propName &&
    (props[propName] = config[propName]);
```

為什麼不直接寫 `config.hasOwnProperty(propName)`？三個理由，全部都是今天講的知識點：

**理由一：`config` 可能沒有那個方法。**

`config` 是 JSX 傳進來的 props 物件，它可以是任何東西。如果有人傳了 `Object.create(null)` 做出來的物件，它的原型是 `null`，根本沒繼承 `Object.prototype`：

```js
const np = Object.create(null);
np.hasOwnProperty('x')   // TypeError: np.hasOwnProperty is not a function
```

**理由二：`config` 可能自己有一個叫 `hasOwnProperty` 的屬性把它蓋掉。**

```jsx
<MyComponent hasOwnProperty="我是一個字串" />
```

這是合法的 JSX。這時 `config.hasOwnProperty` 是字串不是函式，直接呼叫就爆了。原型鏈查找是由下往上找到第一個就停，自有屬性永遠贏過繼承來的。

**理由三：`for...in` 會掃到原型鏈上繼承來的可列舉屬性。**

如果有人污染了 `Object.prototype`，`for...in` 就會把污染物也掃進 props。`hasOwnProperty.call()` 這道過濾就是在擋這個。

而 `.call()` 的作用是**指定 `this` 是誰**。`hasOwnProperty` 是實例方法、它在意 `this`，React 把它從 `Object.prototype` 借出來，用 `.call(config, ...)` 硬指定「這次的 `this` 是 config」。

> 補充：ES2022 之後有更乾淨的寫法 `Object.hasOwn(config, propName)`，那是**靜態方法**，不在意 `this`，也不怕被覆寫。React 之所以還用舊寫法，是要支援比較舊的執行環境。

### 5-3. 為什麼 `getDerivedStateFromProps` 是 static

```jsx
class MyComponent extends React.Component {
  static getDerivedStateFromProps(props, state) {
    // 這裡面拿不到 this
  }
}
```

`static` 就是把方法掛在**類別本身**而不是 `prototype` 上，所以它拿不到實例，也就拿不到 `this`。

這不是 React 少寫了什麼，是**刻意的設計**。這個生命週期方法的職責是「只根據傳進來的 props 與現有 state，算出新的 state」——它應該是個**純函式**。如果給它 `this`，開發者就會忍不住去讀 `this.someInstanceVariable`，那就變成有副作用的計算，React 的並行渲染就沒辦法安全地重複呼叫它。

**把它宣告成 static，等於用語言機制強制它不能碰實例狀態。**

### 5-4. 加碼：React 手動接原型鏈的三行

`PureComponent` 怎麼繼承 `Component`？React 沒有用 `class extends`，而是這樣寫：

```js
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

var pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;
```

這是 ES5 時代的經典手法，用 Day 2 的原型鏈知識就能讀懂：

1. 造一個空殼函式 `ComponentDummy`，把它的 `prototype` 指向 `Component.prototype`
2. `new ComponentDummy()` 做出一個物件，這個物件的**第 1 階原型就是 `Component.prototype`**，但**沒有執行 `Component` 的建構邏輯**
3. 把它當成 `PureComponent.prototype`

為什麼要繞這一圈？因為如果直接寫 `PureComponent.prototype = new Component()`，就會真的跑一次 `Component` 的建構函式，產生不必要的副作用。空殼函式是為了**只借原型、不執行建構子**。

第 4 行 `constructor` 要手動修回來，也是因為換掉 `prototype` 之後 `constructor` 會指錯——這正是 `Object.prototype` 那 12 個成員裡 `constructor` 的作用。

---

## 六、面試可以怎麼答

**Q：`Object.keys()` 跟 `obj.hasOwnProperty()` 有什麼不同？**

前者是掛在 `Object` 建構函式上的靜態方法，物件當參數傳進去；後者是掛在 `Object.prototype` 上的實例方法，透過原型鏈共用，呼叫時物件是 `this`。實務上建議一律改用 ES2022 的 `Object.hasOwn()`，因為它是靜態方法，對 `Object.create(null)` 的物件也安全，也不怕被同名屬性蓋掉——React 原始碼裡那個 `hasOwnProperty.call(config, key)` 就是在處理這件事。

**Q：`__proto__` 跟 `Object.getPrototypeOf()` 差在哪？**

`__proto__` 是 `Object.prototype` 上的存取器屬性，不是方法，讀寫時 getter 與 setter 自動觸發。它是 ES2015 才被收進 Annex B 的遺留特性，MDN 標為 deprecated，因為改動它非常慢而且是原型污染的入口。`Object.getPrototypeOf()` 才是 ES5 就有的正規靜態方法。另外要注意物件字面量裡的 `{ __proto__: X }` 是**獨立的語法特性**，跟那個存取器不是同一個東西。

**Q：為什麼 `getDerivedStateFromProps` 要寫成 static？**

因為 static 掛在類別本身而不是 prototype，所以拿不到實例、拿不到 `this`。這是刻意用語言機制強制它保持純函式，讓 React 可以在並行渲染時安全地重複呼叫它。

**Q：class component 的方法為什麼要 bind？**

因為方法掛在 `prototype` 上、呼叫時才決定 `this`。把方法從物件身上拆下來當 callback 傳出去，`this` 就掉了。`setState` 內部第一行就要用 `this.updater`，`this` 一掉就爆。

---

## 七、今天的重點

1. JS 有三種掛法：**靜態方法**掛建構函式、**實例方法**掛 prototype、**存取器屬性**也掛 prototype 但不呼叫
2. 「方法」不是跟「存取器屬性」平行的分類，它是**資料屬性**的特例，只是值剛好是函式
3. `Object.prototype` 只有 12 個成員，全部 `enumerable: false`，其中只有 `__proto__` 是存取器屬性
4. `__proto__` 是 **ES2015 Annex B** 的遺留特性，不是 ES5，且已 deprecated
5. React 原始碼裡這三種掛法全部都有，而且每一個選擇都有理由

---

## 明天

Day 4 要處理 `this`。今天講了實例方法「在意 `this`」，但 `this` 到底是什麼時候決定的？為什麼箭頭函式沒有自己的 `this`？

這題直接決定你能不能講清楚「class component 為什麼要 bind、hooks 為什麼不用」——那是 React 面試最常見的分水嶺題。

---

## 參考來源

| 來源 | 版本／查證時間 |
| --- | --- |
| MDN｜Object.prototype.\_\_proto\_\_ | 頁面最後更新 2026-05-22 |
| MDN｜Object | 頁面最後更新 2026-05-22 |
| MDN｜Object.getPrototypeOf() | 標示為 static method，ES5 引入 |
| React 原始碼 `react/cjs/react.development.js` | v19.2.8，2026-08-19 實際下載檢視 |

本篇所有 JS 輸出與 React 原始碼片段都是實際執行與檢視過的，不是憑記憶寫的。
