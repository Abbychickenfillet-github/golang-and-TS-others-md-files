# Day 24：setState 只有 12 行 —— 打開 React 原始碼，讀懂那個 `.call` 在防誰

## 今天要回答的四個問題

1. Day 23 說 React「攔截、收集、觸發三個零件一個都不做」，那它到底**做**了什麼？`setState` 那幾行實際上在幹嘛？
2. 為什麼 React 原始碼裡到處是 `hasOwnProperty.call(obj, key)`？直接寫 `obj.hasOwnProperty(key)` 會怎樣？真的有人會踩到嗎？
3. ES2022 已經有 `Object.hasOwn` 了，那 `.call` 這招還要學嗎？
4. `ComponentDummy` 那三行到底在做什麼，為什麼要多做一次 `assign`？

![[學習React_圖解_setState只有12行與hasOwnProperty的call在防誰_ISO5807_2026-09-25.png]]

<!--
貼到 iThome 之前要做兩件事：
一、把上面這行 Obsidian wikilink 刪掉。
二、到 iThome 編輯器把同名的 .png 上傳，用它回傳的網址改寫成 ![圖說](那個網址)。
本機相對路徑與 wikilink 在 iThome 上都不會有圖，因為它讀不到你電腦裡的檔案。
-->

---

## 一、承接 Day 23，先更正一個編號

Day 23 的結尾我寫了這句話：

> 那個 `.call` 的寫法，就是 Day 10 講的靜態方法與實例方法的分別在真實專案裡的樣子。

**編號寫錯了。** 靜態方法與實例方法那篇實際發表的是 **Day 3**（`Day03-靜態方法-實例方法-存取器屬性-讀懂React原始碼的三行寫法`），Day 10 是我最初的 30 天大綱裡的排法，後來實際發文順序調整過。今天要接的是 Day 3，不是 Day 10。

除了編號，這篇要接的是兩條線：

- **Day 23** 講 React 在響應式那三個零件上**不做**什麼。今天反過來讀它**做**了什麼 —— 而答案會有點反高潮：`setState` 連「改 state」都不做
- **Day 3** 講靜態方法與實例方法是兩個不同的盒子。今天那個 `.call` 就是把實例方法**當成靜態方法用**，而且 React 有一個檔案專門在做這件事

用的版本是 **React v19.3.0**（截至 2026-09-25 npm 上的 `latest`）。下面所有引用的原始碼都是我實際讀那個 tag 的檔案抄下來的，不是憑記憶寫的。

---

## 二、`Component.prototype.setState` 的全文，一共 12 行

檔案位置：`packages/react/src/ReactBaseClasses.js`

```js
Component.prototype.setState = function (partialState, callback) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    );
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};
```

白話解釋這段：**前面那個 `if` 只是在擋參數型別，真正做事的只有最後一行。**

把它再壓縮一次：

| `setState` 做了什麼 | 做 |
|---|---|
| 檢查 `partialState` 的型別 | 是 |
| 把工作丟給 `this.updater` | 是 |
| 改 `this.state` | **沒有** |
| 重新渲染 | **沒有** |
| 排程、批次、合併 | **沒有** |

一個你每天呼叫幾十次的 API，本體是一行**委派**。這就是第一個問題的答案。

### 那個錯誤訊息少了主詞

注意那個 `throw` 的字串：`'takes an object of state variables to update or a function which returns an object of state variables.'`

它的開頭是動詞 `takes`，沒有主詞。這不是我漏抄 —— React 把訊息前面原本會拼上的元件名稱拿掉了，所以現在讀起來像半句話。實測（Part A 情境三）丟出來的就是這個不完整的句子。

### 註解裡藏了三個契約

原始碼在 `setState` 上面有一段很長的 JSDoc，裡面有三句話是**寫進文件的行為保證**，不是實作細節：

- a. `You should treat this.state as immutable.` —— 你應該把 `this.state` 當成不可變的
- b. `There is no guarantee that this.state will be immediately updated` —— **不保證** `this.state` 會立刻更新
- c. `There is no guarantee that calls to setState will run synchronously, as they may eventually be batched together` —— **不保證**同步執行，因為它們可能被批次合併

很多人把 b 當成「React 的怪癖」，但它在原始碼註解裡就是明寫的契約。Part A 的實測會讓你看到這個契約的具體後果。

---

## 三、`this.updater` 是誰？預設是一個什麼都不做的空殼

`setState` 把事情丟給 `this.updater`，那 `this.updater` 從哪來？看建構函式：

```js
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  this.updater = updater || ReactNoopUpdateQueue;
}
```

那句註解講得很清楚：**預設的 updater 只是佔位，真的那個由 renderer 注入。**

`ReactNoopUpdateQueue` 是什麼？Noop 就是 no operation。它的 `enqueueSetState` 全文是這樣：

```js
enqueueSetState: function (publicInstance, partialState, callback, callerName) {
  warnNoop(publicInstance, 'setState');
},
```

只印一行警告，什麼都不做。實測（Part B，真實 React 19.3.0）：

```
  react 版本 = 19.3.0
  this.updater 身上有哪些方法 = ["isMounted","enqueueForceUpdate","enqueueReplaceState","enqueueSetState"]
  setState 之前 this.state = {"count":0}
Can't call setState on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. ...
  setState 之後 this.state = {"count":0}   ← 完全沒變
```

這解釋了一個很多人覺得莫名其妙的事：**為什麼只裝 `react` 不裝 `react-dom`，什麼都畫不出來。**

因為 `react` 這個套件只定義了「要呼叫誰」，沒有定義「被呼叫的人要做什麼」。`react-dom`、`react-native`、`react-three-fiber` 各自提供自己的 updater，這就是同一份元件程式碼能跑在不同平台上的結構原因。

---

## 四、那「排隊、合併、重繪」誰做？我手寫一個最小 updater

要看懂 `setState` 少做的那三件事有多關鍵，最快的方法是自己補上去。我寫了一個 30 行的 `createMiniUpdater`（完整程式碼在文末 Part A），它做三件事：

- a. **排隊**：把每次的 `partialState` 推進佇列
- b. **合併**：同一批裡的所有 `partialState` 依序疊上去
- c. **重繪**：合併完才寫回 `instance.state`，並算一次重繪

然後把 React 原始碼那 12 行照抄過來當 `setState`，配上這個 updater 跑。

### 實測情境一：連按三次 `setState({ count: this.state.count + 1 })`

```
  呼叫前 this.state = {"count":0}
    [updater] 收到一筆，佇列長度 1
    [updater] 收到一筆，佇列長度 2
    [updater] 收到一筆，佇列長度 3
  三次呼叫結束，此刻 this.state = {"count":0}   ← 還沒變
    [updater] 合併完成，重繪第 1 次，state = {"count":1}
  微任務跑完後 this.state = {"count":1}   ← 只加了 1
  重繪次數 = 1
```

**加三次只加了 1。** 原因不是 React 偷懶，是第二節註解 b 那個契約的直接後果：三次呼叫都讀到同一個還沒更新的 `this.state.count = 0`，所以三筆 patch 的內容都是 `{ count: 1 }`，合併起來當然還是 `{ count: 1 }`。

### 實測情境二：改成傳函式

```
    [updater] 合併完成，重繪第 2 次，state = {"count":3}
  微任務跑完後 this.state = {"count":3}   ← 這次真的加了 3
```

差別在 `flush()` 裡這一行：

```js
const patch =
  typeof item.partialState === 'function'
    ? item.partialState(nextState, instance.props)   // ← 傳的是 nextState
    : item.partialState
```

白話解釋：**函式版拿到的 `prev` 是「已經套上前面幾筆」的 `nextState`，不是元件身上那個舊的 `this.state`。** 所以 `prev => ({ count: prev.count + 1 })` 每一筆看到的都是上一筆的結果。

這就是「為什麼連續更新要用函式版」的機制層答案。它跟 Day 20、Day 21 講的樂觀更新其實是同一個毛病的兩種版本：**你讀到的是一份快照，而那份快照在你讀它的時候可能已經不是最新的了。**

### 實測情境三：`setState` 到底擋什麼

```
  setState(123) → 丟 Error：takes an object of state variables to up...
  setState("abc") → 丟 Error：takes an object of state variables to up...
  setState(true) → 丟 Error：takes an object of state variables to up...
  setState(null) → 沒有丟錯
  setState(undefined) → 沒有丟錯
```

`null` 與 `undefined` 都被放過，因為那個條件寫的是 `partialState != null`（寬鬆比較，`undefined != null` 是 `false`）。這是 Day 3 講相等比較時的那個分界，在原始碼裡的實際用途。

---

## 五、`hasOwnProperty.call` ：把實例方法當靜態方法用

現在進第二個問題。先回到 Day 3 那兩個盒子：

- **靜態方法**放在建構函式（或 class）本身上，例如 `Object.keys(obj)` —— 你把物件**當參數傳進去**
- **實例方法**放在原型上，例如 `obj.toString()` —— 你透過**某個實例去呼叫它**，`this` 就是那個實例

`hasOwnProperty` 是**實例方法**，它住在 `Object.prototype` 上。正常用法是 `obj.hasOwnProperty('key')`。

但 React 有一個檔案專門把它從原型上拆下來。`packages/shared/hasOwnProperty.js` 的**全文**是這樣（含授權標頭一共 13 行，程式碼只有兩行）：

```js
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// $FlowFixMe[method-unbinding]
const hasOwnProperty = Object.prototype.hasOwnProperty;

export default hasOwnProperty;
```

兩個細節值得停一下：

**a. 這就是「把實例方法當靜態方法用」的手法。** 拆下來之後，`hasOwnProperty.call(config, key)` 的形狀跟 `Object.keys(config)` 一樣了：物件變成參數。`.call` 的第一個參數就是「要問誰」。

**b. 那行註解 `// $FlowFixMe[method-unbinding]`。** Flow（Meta 自己的型別檢查器）本來會警告「你把方法從物件上拆下來了，`this` 可能會壞掉」，React 在這裡明確把警告壓掉。**型別檢查器認為這是可疑寫法，而 React 說：我知道，我就是要。** 這種「有意識地違反通則並留下痕跡」的寫法，是讀原始碼最值得偷的東西。

### 真實使用現場

`packages/react/src/jsx/ReactJSXElement.js` 裡 `createElement` 與 `cloneElement` 各有一段：

```js
// Remaining properties are added to a new props object
for (propName in config) {
  if (
    hasOwnProperty.call(config, propName) &&
    // Skip over reserved prop names
    propName !== 'key' &&
    ...
```

**`config` 是誰給的？是寫 JSX 的人給的。** 也就是說，它是外部資料，React 不能假設它長得正常。

---

## 六、三個真的會出事的情境（實測）

我寫了兩個版本的 `createElement` 來對照。天真版：

```js
function 天真版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (config.hasOwnProperty(propName)) props[propName] = config[propName]
  }
  return { type, props }
}
```

React 版：

```js
const hasOwnProperty = Object.prototype.hasOwnProperty

function React版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (hasOwnProperty.call(config, propName)) props[propName] = config[propName]
  }
  return { type, props }
}
```

### 情境一：有人把 `hasOwnProperty` 當成 prop 名

`<div hasOwnProperty="oops" title="hi" />` 是**完全合法的 JSX**。實測：

```
  天真版 → 爆炸：TypeError：config.hasOwnProperty is not a function
  React 版 → {"type":"div","props":{"hasOwnProperty":"oops","title":"hi"}}
  真實 React 19.3.0 → props = {"hasOwnProperty":"oops","title":"hi"}
```

白話解釋：**`config.hasOwnProperty` 這時候不是那個函式了，它是字串 `"oops"`。** 屬性查找會先找自有屬性，找到了就不往原型鏈上走。字串不能被當成函式呼叫，所以直接 `TypeError`。

「真的有人會這樣寫嗎？」你自己大概不會。但 React 是給全世界用的，而且：你有沒有寫過 `<Foo {...data} />`，而 `data` 是從 API 回來的？那個 spread 會把 API 給你的每一個 key 都變成 prop 名。

### 情境二：`config` 是 `Object.create(null)` 做的

```
  天真版 → 爆炸：TypeError：config.hasOwnProperty is not a function
  React 版 → {"type":"div","props":{"title":"hi"}}
  真實 React → props = {"title":"hi"}
```

`Object.create(null)` 做出來的物件**原型是 `null`**，身上根本沒有 `hasOwnProperty` 可以繼承。

這不是怪招，它是「乾淨字典」的標準做法：用它當 map，key 就不會撞到 `toString`、`constructor` 這些從 `Object.prototype` 繼承來的名字。很多解析器、模板引擎、i18n 套件回傳的物件都是這種形狀。

### 情境三：原型被污染，`for...in` 會多撈到東西

```
  for...in 撈到的 key = ["title","被污染的屬性"]   ← 多了一個
  React 版過濾後 props = {"title":"hi"}   ← 乾淨
```

這一段要講清楚的是：**`for...in` 會走整條原型鏈。** 所以「用 `for...in` 撈」跟「用 `hasOwnProperty` 過濾」是一組必須成對出現的寫法 —— React 原始碼那兩段迴圈就是這個形狀。

---

## 七、但 React 自己也用 `obj.hasOwnProperty()`，所以規則不是「一律加 `.call`」

這是今天最容易被寫成教條的地方，所以特別講。

**同一個檔案** `ReactBaseClasses.js` 裡，React 用的是實例方法的寫法：

```js
if (__DEV__) {
  const deprecatedAPIs = {
    isMounted: [ ... ],
    replaceState: [ ... ],
  };
  ...
  for (const fnName in deprecatedAPIs) {
    if (deprecatedAPIs.hasOwnProperty(fnName)) {      // ← 沒有 .call
      defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    }
  }
}
```

為什麼這裡可以？因為 `deprecatedAPIs` 是**上面三行剛寫出來的物件字面量**。它的原型一定是 `Object.prototype`，內容也一定只有那兩個 key，全部在自己控制之下。三顆地雷一顆都踩不到。

所以真正的規則是這一句：

| 物件的來源 | 寫法 |
|---|---|
| 外部給的（props、`JSON.parse`、使用者輸入、別的套件回傳） | `hasOwnProperty.call(obj, k)` 或 `Object.hasOwn(obj, k)` |
| 這幾行自己剛做出來的字面量 | 直接 `obj.hasOwnProperty(k)` 也安全 |

判準是**「這個物件的原型與 key 是不是在我的控制範圍內」**，不是「看到 `hasOwnProperty` 就加 `.call`」。

---

## 八、`in`、`hasOwnProperty`、`Object.hasOwn`、`Object.keys`、`for...in` 的五欄對照

第三個問題的答案在這張表裡。我用一個三層物件實測（Part E 輸出）：

```js
const 父 = { 繼承來的: 1 }
const 子 = Object.create(父)
子.自己的 = 2
Object.defineProperty(子, '不可列舉的', { value: 3, enumerable: false })
```

| key | `k in 子` | `hasOwnProperty.call` | `Object.hasOwn` | `Object.keys` 看得到 | `for...in` 撈得到 |
|---|---|---|---|---|---|
| 自己的 | 是 | 是 | 是 | 是 | 是 |
| 繼承來的 | 是 | 否 | 否 | 否 | 是 |
| 不可列舉的 | 是 | 是 | 是 | 否 | 否 |
| 不存在的 | 否 | 否 | 否 | 否 | 否 |

讀這張表要抓三個分界：

- a. `in` 與 `hasOwnProperty` 的分界是「**要不要往原型鏈上找**」
- b. `hasOwnProperty` 與 `Object.keys` 的分界是「**可不可列舉（enumerable）**」
- c. `for...in` 同時被兩件事影響：它**走原型鏈**，而且**只撈可列舉的**

`Object.hasOwn`（ES2022）就是為了取代 `hasOwnProperty.call` 而進標準的，語意一模一樣，而且三顆地雷都踩不到：

```
  Object.hasOwn(Object.create(null), 'x') = false            ← 不會爆
  Object.hasOwn({ hasOwnProperty: 'oops' }, 'title') = false  ← 不受影響
```

所以第三個問題的答案是：**新寫的程式碼直接用 `Object.hasOwn`，但 `.call` 這招還是要認得。** 因為 React、Vue、lodash 這些成熟專案的程式碼都比 ES2022 老得多，你讀原始碼一定會遇到。

---

## 九、`ComponentDummy` 那三行：React 刻意把原型鏈壓平

第四個問題。`ReactBaseClasses.js` 的結尾：

```js
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

/**
 * Convenience component with default shallow equality check for sCU.
 */
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;
```

拆成兩件事看：

**a. `new ComponentDummy()` 是在做「只繼承原型鏈，不執行父建構函式」。**

`ComponentDummy` 是一個空函式，它的 `prototype` 被指向 `Component.prototype`。所以 `new ComponentDummy()` 產出的物件，原型是 `Component.prototype`，但**完全沒有跑過 `Component` 的建構函式**（沒有設 `this.props`、沒有設 `this.updater`）。

為什麼不直接 `PureComponent.prototype = new Component()`？因為那會真的執行一次建構函式，把 `props`、`updater` 這些實例屬性設到**原型**上去，之後每個實例都會繼承到那組垃圾值。這是 `class extends` 語法出現之前處理繼承的標準手法，`Object.create(Component.prototype)` 是它的現代寫法。

**b. `assign(pureComponentPrototype, Component.prototype)` 把方法複製一份過去。**

`assign` 就是 `Object.assign`（`packages/shared/assign.js` 全文也只有一行 `const assign = Object.assign`）。而那句註解直白得不能再直白：**`// Avoid an extra prototype jump for these methods.`**

也就是說，明明沿著原型鏈就找得到 `setState`，React 還是刻意在 `PureComponent.prototype` 上**複製一份**，只為了少跳一階。

### 驗證一：這件事真的出貨了嗎

直接對真實的 React 19.3.0 問（Part F 實測）：

```
  Object.getPrototypeOf(PureComponent.prototype) === Component.prototype → true
  hasOwnProperty.call(PureComponent.prototype, 'setState')    → true   ← 自有，不用往上找
  hasOwnProperty.call(PureComponent.prototype, 'forceUpdate') → true
  PureComponent.prototype 的自有屬性 = ["constructor","isReactComponent","setState","forceUpdate","isPureReactComponent"]
  Component.prototype 的自有屬性     = ["constructor","isReactComponent","setState","forceUpdate","isMounted","replaceState"]
```

**原型鏈還連著**（所以 `instanceof` 還是對的），但查找**不需要走**它。

還有一個意外的收穫。注意 `isMounted` 與 `replaceState` 只出現在 `Component.prototype` 上，沒有被複製過去：

```
    hasOwnProperty.call(PureComponent.prototype, 'isMounted') → false
    'isMounted' in PureComponent.prototype                   → true   ← 但沿著鏈還是找得到
    它的 descriptor：get 是 function，enumerable = false
```

為什麼沒被帶過去？因為那兩個是用 `Object.defineProperty` 定義的 getter，而 `Object.defineProperty` 的 `enumerable` 預設是 `false`；**`Object.assign` 只複製「可列舉的自有屬性」**。

這正好是第八節那張表**第二個分界**的實例 —— 而它就發生在 React 自己的原始碼裡，不是課本例題。

### 驗證二：多跳一階原型到底貴多少

我疊出不同深度的原型鏈，各呼叫一千萬次同一個方法，三輪取中位數（Part F）：

| 原型鏈階數 | 一千萬次呼叫（毫秒） | 對照 0 階的倍數 | 換算每次呼叫多花 |
|---|---|---|---|
| 0 階 | 39.4 | 1.00 倍 | 0.00 奈秒 |
| 1 階 | 60.2 | 1.53 倍 | 2.08 奈秒 |
| 2 階 | 50.1 | 1.27 倍 | 1.07 奈秒 |
| 3 階 | 48.3 | 1.23 倍 | 0.89 奈秒 |
| 10 階 | 52.3 | 1.33 倍 | 1.29 奈秒 |

這組數字要同時看兩件事，不然會得出相反的結論：

- a. 倍數欄看起來很嚇人，**0 階與「有原型」之間的差距是穩定重現的**，所以「多跳原型」確實有成本，那句註解不是迷信。但 1 階到 10 階之間並沒有乾淨地遞增 —— **雜訊已經大於階數本身的差距，這件事本身就是結論**
- b. 最後一欄才是實際尺度：多跳一階每次只多花大約 **2 奈秒**。要累積到人眼看得出來的 10 毫秒，得呼叫大約 500 萬次

所以這個最佳化值不值得，取決於那個方法被呼叫多頻繁。`setState` 剛好是整個框架裡被呼叫最頻繁的方法之一，而這段程式碼是 2015 年前後寫的，當年引擎的 Inline Cache 也沒有現在聰明。

換句話說：**這種寫法出現在框架裡是合理的，抄到你自己的業務程式碼裡就是過早最佳化。**

真正值得學的不是「快多少」，是那句註解揭露的習慣 —— 他們知道自己在做一個取捨，所以**把理由寫進註解**，而不是留一行沒人看得懂的 `assign`。

### 順便：`isReactComponent = {}` 這個空物件在幹嘛

```js
Component.prototype.isReactComponent = {};
```

一個永遠不會被讀取內容的空物件。它的用途是**標記（brand）**：React 內部要區分「這是 class component 還是 function component」，判斷方式就是看原型上有沒有這個屬性。

為什麼用空物件而不是 `true`？我沒有找到官方說明，所以這條我列在文末「沒有驗證的部分」。

---

## 十、面試被問到的話，我會怎麼講

**「你有讀過 React 原始碼嗎？」** 這題的陷阱是講一堆 Fiber 名詞但講不出細節。我會挑 `ReactBaseClasses.js` 這個檔案講，因為它只有 130 行左右，而且每一段都能講出「為什麼」：

1. **`setState` 本體是一行委派。** 它不改 state、不重繪、不排程，全部丟給 `this.updater`
2. **預設 updater 是 `ReactNoopUpdateQueue`，什麼都不做。** 真的那個由 renderer 注入 —— 這是 React 能跑在 DOM、Native、Canvas 上的結構原因
3. **「`this.state` 不保證立刻更新」是原始碼註解裡明寫的契約**，不是怪癖。連續更新要用函式版，因為函式版拿到的是已經套上前面幾筆的中間狀態
4. **`hasOwnProperty.call` 是因為 `config` 是外部資料**，可能沒有原型（`Object.create(null)`），也可能有人拿那個名字當 prop。而 React 自己在同一個檔案裡也用 `obj.hasOwnProperty()` —— 差別是那個物件在不在自己控制範圍內
5. **`ComponentDummy` 那三行**是 class 語法之前的繼承手法，加上一次刻意的原型鏈壓平，註解寫了理由

第 4 點是最容易拉開差距的：大部分人會說「`.call` 比較安全」，但說不出安全在防什麼，也不知道 React 自己並不總是這樣寫。

---

## 完整 demo 原始碼

檔名 `day24-setstate-and-hasownproperty.js`。Part A、D、E 不需要任何依賴；Part B、C、F 會去 `require('react')`，**沒裝也跑得起來**，那幾段會自己跳過並印出提示。要跑完整版：

```
npm install react@19.3.0
node day24-setstate-and-hasownproperty.js
```

我的環境是 Node.js v22.22.2、react 19.3.0。

```js
/**
 * day24-setstate-and-hasownproperty.js
 *
 * 讀 React 原始碼：Component.prototype.setState 那 12 行
 * 以及為什麼 React 寫 hasOwnProperty.call(obj, key) 而不是 obj.hasOwnProperty(key)
 * 搭配 iThome 鐵人賽 2026 Day 24
 *
 * 執行方式：node day24-setstate-and-hasownproperty.js
 * 環境：Node.js v18 以上
 *
 * 依賴：Part B、Part C 之二、Part F 之二會去 require('react')。
 *      沒有裝 react 也跑得起來，那幾段會自己跳過並印出提示。
 *      要跑完整版：npm install react@19.3.0
 *
 * 六個 Part
 *   Part A  setState 只做一件事：委派。手寫最小 updater 把那件事做出來
 *   Part B  沒有 renderer 的時候，this.updater 是一個什麼都不做的空殼
 *   Part C  為什麼一定要寫 .call：三個會讓 obj.hasOwnProperty(key) 出事的真實情境
 *   Part D  但 React 自己也有用 obj.hasOwnProperty()，所以規則不是「一律用 .call」
 *   Part E  in、hasOwnProperty、Object.hasOwn 的四格對照
 *   Part F  ComponentDummy 那三行：為什麼 React 要把原型鏈壓平
 */

'use strict'

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(66))
  console.log(title)
  console.log('='.repeat(66))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

/** 安全地載入 react，沒裝就回傳 null */
function 載入React() {
  try {
    return require('react')
  } catch (error) {
    return null
  }
}

const React = 載入React()

// ============================================================
// Part A：setState 只做一件事，就是把事情丟給別人
// ============================================================

/**
 * 這是 React v19.3.0 packages/react/src/ReactBaseClasses.js 裡
 * Component.prototype.setState 的實際內容，我照抄下來（註解省略）
 *
 * 白話解釋：前面那個 if 只是在擋參數型別，真正做事的只有最後一行。
 * setState 自己不改 state、不重繪、不排程，它把這三件事全部交給 this.updater。
 */
function setState照抄版(partialState, callback) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    )
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState')
}

/**
 * 手寫一個最小的 updater，把 renderer 該做的事補上
 * 它要做三件 setState 自己不做的事：排隊、合併、重繪
 */
function createMiniUpdater() {
  const queue = []            // 排隊中的 partialState
  let renderCount = 0
  let flushScheduled = false

  const updater = {
    enqueueSetState(instance, partialState, callback) {
      queue.push({ instance, partialState, callback })
      console.log(`    [updater] 收到一筆，佇列長度 ${queue.length}`)

      // 批次：同一輪裡收到幾筆都只排一次 flush
      if (!flushScheduled) {
        flushScheduled = true
        Promise.resolve().then(flush)     // 用微任務模擬 React 的批次時機
      }
    },
    enqueueForceUpdate(instance) {
      renderCount += 1
      console.log(`    [updater] forceUpdate，直接重繪（第 ${renderCount} 次）`)
    },
  }

  function flush() {
    flushScheduled = false
    if (queue.length === 0) return

    const instance = queue[0].instance
    let nextState = { ...instance.state }
    const callbacks = []

    for (const item of queue) {
      // partialState 可以是物件，也可以是函式。函式版拿得到「已經套上前面幾筆」的 state
      const patch =
        typeof item.partialState === 'function'
          ? item.partialState(nextState, instance.props)
          : item.partialState
      if (patch != null) nextState = { ...nextState, ...patch }
      if (item.callback) callbacks.push(item.callback)
    }
    queue.length = 0

    instance.state = nextState            // 這一步才是真的改 state
    renderCount += 1
    console.log(`    [updater] 合併完成，重繪第 ${renderCount} 次，state = ${JSON.stringify(nextState)}`)
    for (const cb of callbacks) cb()
  }

  return {
    updater,
    get renderCount() { return renderCount },
  }
}

async function partA() {
  分隔線('Part A：setState 只做一件事 —— 把事情丟給 this.updater')

  const mini = createMiniUpdater()

  // 自己組一個最小的 class component，不靠 react
  class Counter {
    constructor(props) {
      this.props = props
      this.state = { count: 0 }
      this.updater = mini.updater
    }
  }
  Counter.prototype.setState = setState照抄版

  const c = new Counter({})

  小標('情境一：連按三次 setState({ count: this.state.count + 1 })')
  console.log(`  呼叫前 this.state = ${JSON.stringify(c.state)}`)
  c.setState({ count: c.state.count + 1 })
  c.setState({ count: c.state.count + 1 })
  c.setState({ count: c.state.count + 1 })
  console.log(`  三次呼叫結束，此刻 this.state = ${JSON.stringify(c.state)}   ← 還沒變`)
  await Promise.resolve()
  await Promise.resolve()
  console.log(`  微任務跑完後 this.state = ${JSON.stringify(c.state)}   ← 只加了 1`)
  console.log(`  重繪次數 = ${mini.renderCount}`)
  console.log('')
  console.log('  原因：三次都讀到同一個 this.state.count = 0，所以三筆 patch 都是 { count: 1 }')
  console.log('        合併起來還是 { count: 1 }。這不是 bug，是「state 不保證立刻更新」的直接後果')
  console.log('        原始碼註解原話：There is no guarantee that `this.state` will be immediately updated')

  小標('情境二：改成傳函式 setState(prev => ({ count: prev.count + 1 }))')
  const c2 = new Counter({})
  c2.setState((prev) => ({ count: prev.count + 1 }))
  c2.setState((prev) => ({ count: prev.count + 1 }))
  c2.setState((prev) => ({ count: prev.count + 1 }))
  await Promise.resolve()
  await Promise.resolve()
  console.log(`  微任務跑完後 this.state = ${JSON.stringify(c2.state)}   ← 這次真的加了 3`)
  console.log('')
  console.log('  差別：函式版拿到的 prev 是「已經套上前面幾筆」的 state，不是元件上那個舊的 this.state')
  console.log('        看 flush() 裡那一行 item.partialState(nextState, instance.props) 就知道為什麼')

  小標('情境三：setState 只擋這一種參數')
  const c3 = new Counter({})
  for (const 參數 of [123, 'abc', true]) {
    try {
      c3.setState(參數)
      console.log(`  setState(${JSON.stringify(參數)}) → 沒有丟錯`)
    } catch (error) {
      console.log(`  setState(${JSON.stringify(參數)}) → 丟 Error：${error.message.slice(0, 40)}...`)
    }
  }
  for (const 參數 of [null, undefined]) {
    try {
      c3.setState(參數)
      console.log(`  setState(${String(參數)}) → 沒有丟錯（因為 partialState != null 用的是寬鬆比較，null 與 undefined 都被放過）`)
    } catch (error) {
      console.log(`  setState(${String(參數)}) → 丟 Error`)
    }
  }
  console.log('')
  console.log('  注意那個錯誤訊息：它的開頭是「takes an object of...」，句子沒有主詞')
  console.log('  因為 React 把前面的元件名稱拿掉了，這是原始碼裡真的長這樣，不是我漏抄')
}

// ============================================================
// Part B：沒有 renderer 的時候，this.updater 是什麼
// ============================================================

function partB() {
  分隔線('Part B：this.updater 預設是一個什麼都不做的空殼')

  if (!React) {
    console.log('  （沒有安裝 react，這一段跳過。要跑請先 npm install react@19.3.0）')
    return
  }

  console.log(`  react 版本 = ${React.version}`)

  class Counter extends React.Component {
    constructor(props) {
      super(props)
      this.state = { count: 0 }
    }
    render() { return null }
  }

  const c = new Counter({})
  console.log(`  this.updater 身上有哪些方法 = ${JSON.stringify(Object.keys(c.updater))}`)
  console.log(`  setState 之前 this.state = ${JSON.stringify(c.state)}`)
  console.log('  （下面這行 console.error 是 React 自己印的，不是我印的）')
  c.setState({ count: 1 })
  console.log(`  setState 之後 this.state = ${JSON.stringify(c.state)}   ← 完全沒變`)
  console.log('')
  console.log('  原始碼裡那一行是這樣寫的：')
  console.log('    this.updater = updater || ReactNoopUpdateQueue')
  console.log('  Noop 就是 no operation。react 這個套件只定義了「呼叫誰」，')
  console.log('  真正會做事的 updater 是 react-dom 這類 renderer 在建立元件的時候注入的。')
  console.log('  這就是為什麼只裝 react 不裝 react-dom 什麼都畫不出來。')
}

// ============================================================
// Part C：為什麼一定要寫 hasOwnProperty.call
// ============================================================

/**
 * 天真版：直接呼叫物件自己的 hasOwnProperty
 * 這是把「方法在不在原型鏈上」這件事託付給了呼叫方的物件
 */
function 天真版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (config.hasOwnProperty(propName)) props[propName] = config[propName]
  }
  return { type, props }
}

/**
 * React 版：從 Object.prototype 上把方法借出來，用 .call 指定要問誰
 * 對應原始碼 packages/shared/hasOwnProperty.js 那三行
 */
const hasOwnProperty = Object.prototype.hasOwnProperty

function React版createElement(type, config) {
  const props = {}
  for (const propName in config) {
    if (hasOwnProperty.call(config, propName)) props[propName] = config[propName]
  }
  return { type, props }
}

function partC() {
  分隔線('Part C：三個會讓 obj.hasOwnProperty(key) 出事的情境')

  小標('情境一：有人把 hasOwnProperty 當成 prop 傳進來')
  console.log('  JSX 寫成 <div hasOwnProperty="oops" title="hi" /> 是完全合法的')
  const config1 = { hasOwnProperty: 'oops', title: 'hi' }
  try {
    console.log(`  天真版 → ${JSON.stringify(天真版createElement('div', config1))}`)
  } catch (error) {
    console.log(`  天真版 → 爆炸：${error.constructor.name}：${error.message}`)
  }
  console.log(`  React 版 → ${JSON.stringify(React版createElement('div', config1))}`)
  if (React) {
    const el = React.createElement('div', config1)
    console.log(`  真實 React ${React.version} → props = ${JSON.stringify(el.props)}`)
  }
  console.log('')
  console.log('  白話解釋：config.hasOwnProperty 這時候不是那個函式了，它是字串 "oops"，')
  console.log('            字串不能被當成函式呼叫，所以直接 TypeError。')

  小標('情境二：config 是 Object.create(null) 做出來的物件')
  const config2 = Object.create(null)
  config2.title = 'hi'
  console.log('  這種物件的原型是 null，身上根本沒有 hasOwnProperty 可以繼承')
  try {
    console.log(`  天真版 → ${JSON.stringify(天真版createElement('div', config2))}`)
  } catch (error) {
    console.log(`  天真版 → 爆炸：${error.constructor.name}：${error.message}`)
  }
  console.log(`  React 版 → ${JSON.stringify(React版createElement('div', config2))}`)
  if (React) {
    console.log(`  真實 React → props = ${JSON.stringify(React.createElement('div', config2).props)}`)
  }
  console.log('')
  console.log('  這種物件不是怪招，它是「乾淨字典」的標準做法。')
  console.log('  用它當 map 就不會有 key 撞到 toString、constructor 這些繼承屬性的問題。')

  小標('情境三：原型被污染，for...in 會多撈到東西')
  const 髒物件 = JSON.parse('{"title":"hi"}')
  Object.prototype.被污染的屬性 = '我不該出現在 props 裡'

  const forIn全部撈 = []
  for (const k in 髒物件) forIn全部撈.push(k)
  console.log(`  for...in 撈到的 key = ${JSON.stringify(forIn全部撈)}   ← 多了一個`)
  console.log(`  React 版過濾後 props = ${JSON.stringify(React版createElement('div', 髒物件).props)}   ← 乾淨`)
  delete Object.prototype.被污染的屬性

  console.log('')
  console.log('  這一段要講清楚的是：`for...in` 會走整條原型鏈，')
  console.log('  所以「用 for...in 撈」跟「用 hasOwnProperty 過濾」是一組必須成對出現的寫法。')
  console.log('  React 原始碼 createElement 與 cloneElement 裡的那兩段迴圈就是這個形狀。')

  小標('對照：真實 React 原始碼裡的那一段（v19.3.0 ReactJSXElement.js）')
  console.log('    for (propName in config) {')
  console.log('      if (')
  console.log('        hasOwnProperty.call(config, propName) &&')
  console.log("        // Skip over reserved prop names")
  console.log("        propName !== 'key' &&")
  console.log('        ...')
  console.log('  config 是誰給的？是寫 JSX 的人給的。所以它是外部資料，不能假設它長得正常。')
}

// ============================================================
// Part D：React 自己也用 obj.hasOwnProperty()，規則是什麼
// ============================================================

function partD() {
  分隔線('Part D：React 自己也有用 obj.hasOwnProperty()，所以規則不是「一律用 .call」')

  console.log('  同一個檔案 ReactBaseClasses.js 裡，React 用的是實例方法的寫法：')
  console.log('')
  console.log('    const deprecatedAPIs = {')
  console.log("      isMounted: [ ... ],")
  console.log("      replaceState: [ ... ],")
  console.log('    }')
  console.log('    for (const fnName in deprecatedAPIs) {')
  console.log('      if (deprecatedAPIs.hasOwnProperty(fnName)) {   // ← 沒有 .call')
  console.log('        defineDeprecationWarning(fnName, deprecatedAPIs[fnName])')
  console.log('      }')
  console.log('    }')
  console.log('')
  console.log('  為什麼這裡可以？因為 deprecatedAPIs 是上面三行剛寫出來的物件字面量，')
  console.log('  它的原型一定是 Object.prototype，內容也一定只有那兩個 key，全部在自己控制之下。')
  console.log('')
  console.log('  所以真正的規則是這一句，不是「看到 hasOwnProperty 就加 .call」：')
  console.log('')
  console.log('    物件是外部給的（props、JSON、使用者輸入、別的套件回傳）  → 用 hasOwnProperty.call')
  console.log('    物件是這幾行自己剛做出來的字面量                        → 直接呼叫也安全')
  console.log('')
  console.log('  順便一個細節：packages/shared/hasOwnProperty.js 那三行裡有一行註解是')
  console.log('    // $FlowFixMe[method-unbinding]')
  console.log('  意思是型別檢查工具 Flow 本來會警告「你把方法從物件上拆下來了」，React 明講「我就是要」。')
}

// ============================================================
// Part E：in、hasOwnProperty、Object.hasOwn 的四格對照
// ============================================================

function partE() {
  分隔線('Part E：in、hasOwnProperty、Object.hasOwn 各自回答什麼問題')

  const 父 = { 繼承來的: 1 }
  const 子 = Object.create(父)
  子.自己的 = 2
  Object.defineProperty(子, '不可列舉的', { value: 3, enumerable: false })

  const keys = ['自己的', '繼承來的', '不可列舉的', '不存在的']
  const forIn = []
  for (const k in 子) forIn.push(k)

  console.log('')
  console.log('| key | k in 子 | hasOwnProperty.call | Object.hasOwn | Object.keys 看得到 | for...in 撈得到 |')
  console.log('|---|---|---|---|---|---|')
  for (const k of keys) {
    const a = k in 子
    const b = hasOwnProperty.call(子, k)
    const c = Object.hasOwn(子, k)
    const d = Object.keys(子).includes(k)
    const e = forIn.includes(k)
    const f = (v) => (v ? '是' : '否')
    console.log(`| ${k} | ${f(a)} | ${f(b)} | ${f(c)} | ${f(d)} | ${f(e)} |`)
  }

  console.log('')
  console.log('  讀這張表要抓的是三個分界：')
  console.log('    a. in 與 hasOwnProperty 的分界是「要不要往原型鏈上找」')
  console.log('    b. hasOwnProperty 與 Object.keys 的分界是「可不可列舉」')
  console.log('    c. for...in 同時被兩件事影響：它走原型鏈，而且只撈可列舉的')
  console.log('')
  console.log('  Object.hasOwn（ES2022）是為了取代 hasOwnProperty.call 而生的，語意一模一樣：')
  console.log(`    Object.hasOwn(Object.create(null), 'x') = ${Object.hasOwn(Object.create(null), 'x')}   ← 不會爆`)
  console.log("    Object.hasOwn({ hasOwnProperty: 'oops' }, 'title') =", Object.hasOwn({ hasOwnProperty: 'oops' }, 'title'), '  ← 不受影響')
  console.log('')
  console.log('  所以新寫的程式碼直接用 Object.hasOwn 就好，不用學 .call 這招。')
  console.log('  但你讀 React、Vue、lodash 這些成熟專案的原始碼一定會遇到 .call，')
  console.log('  因為它們的程式碼比 ES2022 老得多。')
}

// ============================================================
// Part F：ComponentDummy 那三行，為什麼要把原型鏈壓平
// ============================================================

function partF() {
  分隔線('Part F：ComponentDummy 那三行 —— React 刻意把原型鏈壓平')

  console.log('  原始碼（ReactBaseClasses.js 結尾）：')
  console.log('')
  console.log('    function ComponentDummy() {}')
  console.log('    ComponentDummy.prototype = Component.prototype')
  console.log('')
  console.log('    const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy())')
  console.log('    pureComponentPrototype.constructor = PureComponent')
  console.log('    // Avoid an extra prototype jump for these methods.')
  console.log('    assign(pureComponentPrototype, Component.prototype)')
  console.log('    pureComponentPrototype.isPureReactComponent = true')
  console.log('')
  console.log('  拆成兩件事看：')
  console.log('    a. new ComponentDummy() → 做出一個原型指向 Component.prototype 的空物件。')
  console.log('       目的是「繼承原型鏈但不執行 Component 的建構函式」，這是 class 語法之前的標準做法。')
  console.log('    b. assign(pureComponentPrototype, Component.prototype) → 把 setState 與 forceUpdate')
  console.log('       直接複製一份到 PureComponent.prototype 上面，那句註解講得很直白：少跳一階原型。')

  小標('驗證一：這件事真的出貨了嗎')
  if (!React) {
    console.log('  （沒有安裝 react，這一段跳過）')
  } else {
    const C = React.Component.prototype
    const P = React.PureComponent.prototype
    console.log(`  Object.getPrototypeOf(PureComponent.prototype) === Component.prototype → ${Object.getPrototypeOf(P) === C}`)
    console.log(`  hasOwnProperty.call(PureComponent.prototype, 'setState')    → ${hasOwnProperty.call(P, 'setState')}   ← 自有，不用往上找`)
    console.log(`  hasOwnProperty.call(PureComponent.prototype, 'forceUpdate') → ${hasOwnProperty.call(P, 'forceUpdate')}`)
    console.log(`  PureComponent.prototype 的自有屬性 = ${JSON.stringify(Object.getOwnPropertyNames(P))}`)
    console.log(`  Component.prototype 的自有屬性     = ${JSON.stringify(Object.getOwnPropertyNames(C))}`)
    console.log('')
    console.log('  注意 isMounted 與 replaceState 只出現在 Component.prototype 上，沒有被複製過去：')
    console.log(`    hasOwnProperty.call(PureComponent.prototype, 'isMounted') → ${hasOwnProperty.call(P, 'isMounted')}`)
    console.log(`    'isMounted' in PureComponent.prototype                   → ${'isMounted' in P}   ← 但沿著鏈還是找得到`)
    const d = Object.getOwnPropertyDescriptor(C, 'isMounted')
    if (d) {
      console.log(`    它的 descriptor：get 是 ${typeof d.get}，enumerable = ${d.enumerable}`)
      console.log('    因為 enumerable 是 false，而 Object.assign 只複製「可列舉的自有屬性」，所以它沒被帶過去。')
      console.log('    這正好是 Part E 那張表第二個分界的實例。')
    }
    console.log('')
    console.log(`  （上面看到 isMounted 存在，表示現在讀到的是 development 版；`)
    console.log('    那兩個棄用警告在原始碼裡包在 if (__DEV__) 裡面，production 版不會有。）')
  }

  小標('驗證二：多跳一階原型到底貴多少')
  console.log('  自己疊出不同深度的原型鏈，各呼叫一千萬次同一個方法')

  function 建鏈(depth) {
    const base = { ping() { return 1 } }
    let obj = base
    for (let i = 0; i < depth; i += 1) obj = Object.create(obj)
    return obj
  }

  const 次數 = 10_000_000
  const 輪數 = 3
  const depths = [0, 1, 2, 3, 10]
  const 成績 = new Map(depths.map((d) => [d, []]))

  for (let round = 0; round < 輪數; round += 1) {
    for (const depth of depths) {
      const obj = 建鏈(depth)
      // 先暖機，讓 JIT 有機會最佳化，避免量到編譯成本
      for (let i = 0; i < 200_000; i += 1) obj.ping()
      const t0 = process.hrtime.bigint()
      let sum = 0
      for (let i = 0; i < 次數; i += 1) sum += obj.ping()
      const t1 = process.hrtime.bigint()
      if (sum !== 次數) throw new Error('迴圈被最佳化掉了，數字不可信')
      成績.get(depth).push(Number(t1 - t0) / 1e6)
    }
  }

  const 中位數 = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]
  const rows = depths.map((d) => ({ depth: d, ms: 中位數(成績.get(d)) }))
  const base = rows[0].ms

  console.log('')
  console.log(`| 原型鏈階數 | 一千萬次呼叫（毫秒，${輪數} 輪取中位數） | 對照 0 階的倍數 | 換算每次呼叫多花 |`)
  console.log('|---|---|---|---|')
  for (const r of rows) {
    const 每次奈秒 = ((r.ms - base) * 1e6) / 次數
    console.log(`| ${r.depth} 階 | ${r.ms.toFixed(1)} | ${(r.ms / base).toFixed(2)} 倍 | ${每次奈秒.toFixed(2)} 奈秒 |`)
  }

  console.log('')
  console.log('  這組數字要同時看兩件事，不然會得出相反的結論：')
  console.log('')
  const 一階倍數 = rows[1].ms / base
  const 十階倍數 = rows[rows.length - 1].ms / base
  const 一階奈秒 = ((rows[1].ms - base) * 1e6) / 次數
  const 累積到十毫秒需要 = Math.round(10 / (一階奈秒 / 1e6) / 1e6)

  const 單調 = rows.every((r, i) => i === 0 || r.ms >= rows[i - 1].ms)

  console.log(`    a. 倍數欄看起來很嚇人：0 階到 1 階差 ${一階倍數.toFixed(2)} 倍，到 10 階差 ${十階倍數.toFixed(2)} 倍。`)
  console.log('       0 階與有原型這件事的差距是穩定重現的，所以「多跳原型」確實有成本，那句註解不是迷信。')
  console.log(
     單調
      ? '       這一輪 1 到 10 階剛好也是越深越慢。'
      : '       但這一輪 1 到 10 階之間並沒有乾淨地遞增 —— 雜訊已經大於階數本身的差距，這件事本身就是結論。',
  )
  console.log(`    b. 但最後一欄才是實際尺度：多跳一階每次只多花 ${一階奈秒.toFixed(2)} 奈秒。`)
  console.log(`       要累積到人眼看得出來的 10 毫秒，得呼叫大約 ${累積到十毫秒需要} 百萬次。`)
  console.log('       （這幾個數字每次跑都會浮動，因為它會被當下的 CPU 負載影響，看方向不要記死數字。）')
  console.log('')
  console.log('  所以這個最佳化值不值得，取決於那個方法被呼叫多頻繁。')
  console.log('  setState 剛好是整個框架裡被呼叫最頻繁的方法之一，而那段程式碼是 2015 年前後寫的，')
  console.log('  當年引擎的 Inline Cache 也沒有現在聰明。')
  console.log('')
  console.log('  換句話說：**這種最佳化寫在框架裡合理，抄到你自己的業務程式碼裡就是過早最佳化。**')
  console.log('  真正值得學的不是「快多少」，是那句註解揭露的習慣 ——')
  console.log('  他們知道自己在做一個取捨，所以把理由寫進註解，而不是留一行沒人看得懂的 assign。')
}

// ============================================================
// main
// ============================================================

async function main() {
  console.log('day24-setstate-and-hasownproperty.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log(`react ${React ? React.version + '（已載入）' : '未安裝，Part B/C/F 的實測段落會跳過'}`)

  await partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. Component.prototype.setState 全文 12 行，扣掉參數檢查只剩一行：把事情丟給 this.updater')
  console.log('  2. 預設的 updater 是 ReactNoopUpdateQueue，什麼都不做。做事的那個由 renderer 注入')
  console.log('  3. 「this.state 不保證立刻更新」不是實作細節，是原始碼註解裡寫明的契約')
  console.log('  4. hasOwnProperty.call 是因為 config 是外部資料，可能沒有原型，也可能有人拿它當 prop 名')
  console.log('  5. React 自己也用 obj.hasOwnProperty()，差別在那個物件是不是自己剛做出來的')
  console.log('  6. ComponentDummy 那三行是用 class 語法之前的繼承手法，加上一次刻意的原型鏈壓平')
}

main().catch((error) => {
  console.error('執行失敗：', error)
  process.exit(1)
})
```

---

## 這篇的每個說法各自從哪來

**一、官方原始碼與可查證的一手來源**

我這次是**直接讀 v19.3.0 這個 tag 的檔案**，不是憑記憶，所以把每個檔案的完整路徑列出來讓你自己去對。

| 內容 | 出處 |
|---|---|
| `Component.prototype.setState` 全文 12 行、`this.updater = updater \|\| ReactNoopUpdateQueue`、三句 JSDoc 契約、`isReactComponent = {}`、`ComponentDummy` 那三行、`deprecatedAPIs.hasOwnProperty(fnName)` | `packages/react/src/ReactBaseClasses.js`：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/ReactBaseClasses.js |
| `hasOwnProperty` 模組全文兩行、`// $FlowFixMe[method-unbinding]` 那行註解 | `packages/shared/hasOwnProperty.js`：https://github.com/facebook/react/blob/v19.3.0/packages/shared/hasOwnProperty.js |
| `assign` 就是 `Object.assign`（全文一行） | `packages/shared/assign.js`：https://github.com/facebook/react/blob/v19.3.0/packages/shared/assign.js |
| `warnNoop` 與 `enqueueSetState` 的 no-op 實作、`Can't call setState on a component that is not yet mounted` 這段警告文字 | `packages/react/src/ReactNoopUpdateQueue.js`：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/ReactNoopUpdateQueue.js |
| `for (propName in config) { if (hasOwnProperty.call(config, propName) && ...` 出現在 `createElement` 與 `cloneElement`，另外 `hasValidRef`、`hasValidKey`、`jsxDEVImpl` 也各有一處 | `packages/react/src/jsx/ReactJSXElement.js`：https://github.com/facebook/react/blob/v19.3.0/packages/react/src/jsx/ReactJSXElement.js |
| react 的 `latest` 是 19.3.0（2026-09-25 查詢） | npm registry：https://registry.npmjs.org/react/latest |
| `Object.hasOwn` 是 ES2022 加入的、語意等同 `Object.prototype.hasOwnProperty.call` | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn |
| `Object.assign` 只複製「可列舉的自有屬性」 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign |
| `Object.defineProperty` 的 `enumerable` 預設為 `false` | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty |
| `for...in` 會列舉原型鏈上可列舉的屬性 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in |
| `Function.prototype.call` 的語意（第一個參數就是 `this`） | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call |

**二、我實際跑出來的部分**

Part A 到 Part F 的所有輸出，由 `day24-setstate-and-hasownproperty.js` 實測產生（Node.js v22.22.2、react 19.3.0，2026-09-25 執行），可以重跑驗證。包含：

- 三次 `setState` 物件版只加 1、函式版加 3、重繪都只有 1 次
- `setState(123)` 丟錯、`setState(null)` 與 `setState(undefined)` 不丟錯
- 真實 React 實例的 `this.updater` 方法清單，以及 `setState` 之後 `this.state` 完全沒變
- 三顆地雷在天真版上各自丟出的 `TypeError`，以及真實 `React.createElement` 全部正常處理
- 第八節那張五欄對照表（每一格都是跑出來的，不是背的）
- `PureComponent.prototype` 的自有屬性清單、`isMounted` 的 descriptor
- 第九節驗證二的原型鏈深度量測

**Part A 的 `createMiniUpdater` 是我手寫的最小模型，不是 React 的原始碼。** 它只示範「排隊、合併、重繪」這三件 `setState` 自己不做的事，真實的 updater 牽涉 Fiber、lane 優先級、並行 render 與 `Object.is` bailout，複雜得多。我用微任務（`Promise.resolve().then`）來模擬批次時機，**這也不是 React 真實的排程方式**。

**三、我自己的整理與判斷（沒有外部出處）**

- 第二節那張「`setState` 做了什麼／沒做什麼」的五列表，是我自己整理的切法
- 「這就是為什麼只裝 `react` 不裝 `react-dom` 什麼都畫不出來」這個因果連結，是我從 `updater || ReactNoopUpdateQueue` 那一行推出來的，官方註解只說了 the real one gets injected by the renderer
- 「`setState` 的快照問題跟 Day 20、Day 21 的樂觀更新是同一個毛病的兩種版本」這個類比
- 第七節那張「物件來源決定寫法」的判準表，以及「判準是控制範圍，不是看到就加 `.call`」這句話
- 第九節「這種寫法出現在框架裡合理，抄到業務程式碼裡就是過早最佳化」這個界線
- 「`<Foo {...data} />` 而 `data` 來自 API」這個會讓情境一變得現實的例子
- 第十節那五點的排序，以及「第 4 點最容易拉開差距」這個判斷

**四、我沒有驗證的部分**

- **`isReactComponent` 為什麼用空物件 `{}` 而不是 `true`**，我沒有找到官方說明。常見的說法是為了讓打包工具不容易把它最佳化掉、或避免與其他布林值混淆，但我**沒有找到 React 團隊自己的文字**，所以這條請當成未確認
- **React 為什麼還沒全面換成 `Object.hasOwn`**，我沒有查到討論紀錄。合理推測是相容性與大量既有程式碼的慣性，但這是推測
- 我讀的是 GitHub 上 v19.3.0 那個 tag 的**原始碼**，跟 npm 上安裝到的 `react@19.3.0` 是**編譯後的產物**，兩者理論上對應但我沒有逐行比對。不過 Part B、F 的實測是跑在 npm 安裝的那份上，結果與原始碼一致
- `ComponentDummy` 那段程式碼「是 2015 年前後寫的」，是我從 React 的歷史推測的，**我沒有去查那幾行的 git blame**
- 第五節說「很多解析器、模板引擎、i18n 套件回傳 `Object.create(null)` 物件」，我知道有這種做法但**沒有實際清點過哪些套件**

**五、幾個要講清楚的量測限制**

- 第九節驗證二的數字在**雲端容器**裡跑，CPU 是共享的，所以 1 階到 10 階之間的差距被雜訊吃掉了。你在自己機器上跑很可能得到更乾淨的遞增曲線。**這組數字要證明的是「有成本但尺度是奈秒」，不是精確的階數成本函數**
- Part F 那個 `建鏈()` 疊出來的物件，每一層都是 `Object.create(上一層)`，**這跟 React 真實的 class 繼承鏈形狀不完全一樣**（真實的多一層 `constructor` 與各種 own property，會影響 V8 的 hidden class）
- Part B 讀到的 `Component.prototype` 上有 `isMounted` 與 `replaceState`，表示我載入的是 **development 版**。那兩個棄用警告在原始碼裡包在 `if (__DEV__)` 裡，production build 不會有 —— 所以如果你在 production 環境跑 Part F，自有屬性清單會比我印出來的短

（查閱日期：2026-09-25。原始碼版本 React v19.3.0。程式碼實測於 Node.js v22.22.2）

---

## 相關筆記與關聯原因

- **Day 3｜靜態方法、實例方法、存取器屬性**：**關聯原因**：今天的 `hasOwnProperty.call` 就是「把實例方法當靜態方法用」，而 `packages/shared/hasOwnProperty.js` 那兩行是這個手法在真實專案裡最乾淨的一個標本。Day 3 講的是兩個盒子，今天講的是怎麼把東西從一個盒子搬到另一個盒子用
- **Day 9｜物件的真面目：原型鏈階數、屬性列舉四格矩陣**：**關聯原因**：第八節那張五欄表是那個矩陣的擴充版（多了 `Object.hasOwn` 與 `for...in`），而第九節的「原型鏈階數」量測就是那篇的實測版
- **Day 23｜攔截、收集、觸發**：**關聯原因**：Day 23 說 React 三個零件一個都不做，今天讀出來的 `setState` 本體只有一行委派，正好是那個結論在原始碼層的證據 —— 它連「改 state」都交給別人
- **Day 20｜TanStack Query** 與 **Day 21｜樂觀更新**：**關聯原因**：`setState` 讀到舊 `this.state`、樂觀更新讀到舊快取、競態條件讀到舊回應，三者是同一個結構問題的三個版本 ——「**你手上那份資料在你讀它的時候可能已經不是最新的**」
- **`frontend-docs/react/useState底層-Fiber-Tree-memoizedState與過期閉包.md`**：**關聯原因**：今天讀的是 class component 那條路；那篇講的是 function component 的 `useState` 怎麼存 state。明天會把這兩條路接起來

---

## 明天

今天讀的是 **class component** 那條路：`this.setState` → `this.updater.enqueueSetState`。

明天 Day 25 讀 **function component** 那條路：`useState` 回傳的那個 setter 到底是什麼函式，它跟 `this.setState` 差在哪，以及為什麼有時候 `setCount(跟現在一樣的值)` 明明不該重繪，React 還是會多跑一次 render 才決定放棄 —— 那個「eager state 比較」與 bailout 的時機，就是 Day 23 那個 `Object.is` 在 React 內部真正被呼叫的地方。
