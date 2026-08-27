---
title: 屬性列舉決策矩陣｜keys、getOwnPropertyNames、getOwnPropertyDescriptor、Reflect.ownKeys
tags: [javascript, object, 屬性列舉, descriptor, reflect, 面試]
created: 2026-08-19
source:
  - MDN Object（頁面最後更新 2026-05-22）
  - MDN Object.getOwnPropertyNames
  - MDN Reflect.ownKeys
---

# 屬性列舉決策矩陣

> [!info] 承接與去向
> a. 承接 [[Object建構子-plain-object的建立與存取]]：那篇問「Object.prototype 到底有什麼」，答案是 12 個成員，而你之所以平常看不到它們，原因就寫在本篇的第 3 格。
> b. 跟 [[Object靜態方法速查]] 分工：那篇是「有哪些方法」的清單，本篇是「該挑哪一個」的決策依據，不重複列 API。
> c. 本篇第 1 格與繼承那一圈的差別，就是 [[for...in]] 那篇在講的事。
> d. 第 2 格與第 4 格的 Symbol 鍵，細節在 [[Symbol-符號型別與物件key]]。

---

## 主軸圖

![[學習JS_圖解_物件屬性列舉方法涵蓋範圍矩陣_2026-08-19.svg]]

> [!tip] 記法
> 屬性被兩個維度切成四格，再加上「繼承」這一圈。
> 兩個維度分別是：key 是**字串還是 Symbol**，以及 **enumerable 是 true 還是 false**。
> 之後看到任何列舉方法，只要問「它看得到哪幾格」，就分得出來了。

---

## a. 先把名詞講清楚

| 名詞 | 全名與意思 |
| --- | --- |
| enumerable | 可列舉。屬性描述器上的一個布林旗標，決定這個屬性會不會被 `Object.keys()` 與 `for...in` 掃到 |
| own property | 自有屬性。直接寫在物件自己身上的，相對於從原型鏈繼承來的 |
| property descriptor | 屬性描述器。描述一個屬性「怎麼被定義」的設定物件，不是它的值 |
| data descriptor | 資料描述器。有 `value` 與 `writable` 的那種 |
| accessor descriptor | 存取器描述器。有 `get` 與 `set` 的那種，跟資料描述器互斥 |
| Reflect | 反射。ES6 新增的內建物件，把「操作物件的底層行為」整理成一組函式 |

---

## b. 四格分別是什麼

| 格 | key 型別 | enumerable | 典型例子 |
| --- | --- | --- | --- |
| 1 | 字串 | `true` | `obj.name = "Abby"` 你平常寫的每一個屬性 |
| 2 | Symbol | `true` | `obj[Symbol("s")] = 1` |
| 3 | 字串 | `false` | `Object.prototype.toString` 這類內建方法，或自己用 `defineProperty` 藏起來的 |
| 4 | Symbol | `false` | `Symbol.iterator` 這類「行為掛勾」 |

> [!note] 為什麼內建方法都住在第 3 格
> 如果 `toString`、`hasOwnProperty` 這些是可列舉的，那你每次寫 `for (const k in obj)` 都會多掃出一堆繼承來的方法名稱。
> JS 把它們的 `enumerable` 全部設成 `false`，就是為了讓迴圈只看到你自己放的資料。
> 這也是 [[Object建構子-plain-object的建立與存取]] 裡 `Object.keys(Object.prototype)` 會回空陣列的原因。

---

## c. 決策矩陣（實測結果）

測試物件長這樣：

```js
const sym       = Symbol("symKey");
const hiddenSym = Symbol("hiddenSym");
const parent    = { inherited: "from parent" };

const obj = Object.create(parent);
obj.visible = "V";                                    // 第 1 格：字串＋可列舉
obj[sym] = "S";                                       // 第 2 格：Symbol＋可列舉
Object.defineProperty(obj, "hidden", {                // 第 3 格：字串＋不可列舉
  value: "H", enumerable: false, writable: true, configurable: true,
});
Object.defineProperty(obj, hiddenSym, {               // 第 4 格：Symbol＋不可列舉
  value: "HS", enumerable: false,
});
obj[2] = "two";
obj[1] = "one";
```

跑出來的結果：

| 方法 | 實際輸出 | 看得到哪幾格 |
| --- | --- | --- |
| `Object.keys(obj)` | `["1", "2", "visible"]` | 只有第 1 格 |
| `Object.values(obj)` | `["one", "two", "V"]` | 只有第 1 格 |
| `Object.entries(obj)` | `[["1","one"], ["2","two"], ["visible","V"]]` | 只有第 1 格 |
| `for...in` | `["1", "2", "visible", "inherited"]` | 第 1 格＋繼承來的可列舉字串鍵 |
| `Object.getOwnPropertyNames(obj)` | `["1", "2", "visible", "hidden"]` | 第 1＋3 格，所有字串鍵 |
| `Object.getOwnPropertySymbols(obj)` | `[Symbol(symKey), Symbol(hiddenSym)]` | 第 2＋4 格，所有 Symbol 鍵 |
| `Reflect.ownKeys(obj)` | `["1", "2", "visible", "hidden", Symbol(symKey), Symbol(hiddenSym)]` | **四格全包** |
| `JSON.stringify(obj)` | `{"1":"one","2":"two","visible":"V"}` | 只有第 1 格 |

一句話：**`Object.keys` 拿到 3 個，`Reflect.ownKeys` 拿到 6 個，中間差的就是第 2、3、4 格。**

---

## d. getOwnPropertyNames 到底是什麼

`Object.getOwnPropertyNames(obj)` 回傳「這個物件**自己身上所有字串 key**」的陣列，**不管 enumerable 是 true 還是 false**，但**不含 Symbol key**，也**不含繼承來的**。

跟 `Object.keys` 的關係是包含關係：

```
Object.keys(obj)  ⊂  Object.getOwnPropertyNames(obj)
可列舉字串鍵          全部字串鍵
```

最實用的一招就是拿它來看內建原型有什麼：

```js
Object.getOwnPropertyNames(Object.prototype);
// 12 個：constructor, __defineGetter__, __defineSetter__, hasOwnProperty,
//        __lookupGetter__, __lookupSetter__, isPrototypeOf, propertyIsEnumerable,
//        toString, valueOf, __proto__, toLocaleString

Object.keys(Object.prototype);
// []  ← 全部 enumerable: false，所以空陣列
```

---

## e. getOwnPropertyDescriptor 到底拿到什麼

它拿到的不是屬性的值，而是**這個屬性怎麼被定義的整組設定**。而且描述器有兩種，互斥：

### e-1. 資料描述器 data descriptor

```js
Object.getOwnPropertyDescriptor(obj, "visible")
// { value: "V", writable: true, enumerable: true, configurable: true }
```

| 旗標 | 意思 | 設成 false 會怎樣 |
| --- | --- | --- |
| `value` | 屬性的值 | — |
| `writable` | 可不可以改值 | 賦值失敗。非嚴格模式靜默失敗，嚴格模式丟 `TypeError` |
| `enumerable` | 會不會被 `Object.keys` 與 `for...in` 掃到 | 從第 1 格掉到第 3 格，變成隱形 |
| `configurable` | 可不可以刪除、可不可以再改描述器 | `delete` 失敗，也不能再 `defineProperty` 改回來 |

### e-2. 存取器描述器 accessor descriptor

```js
Object.getOwnPropertyDescriptor({ get a() { return 1; } }, "a")
// { get: [Function: a], set: undefined, enumerable: true, configurable: true }
```

有 `get` 與 `set` 就沒有 `value` 與 `writable`，兩種描述器不能混用。

### e-3. 三個容易踩的點

- 繼承來的屬性拿不到：`Object.getOwnPropertyDescriptor(obj, "inherited")` 回 `undefined`，因為它只看自有屬性
- 要一次拿全部用複數版 `Object.getOwnPropertyDescriptors(obj)`
- 想連 getter／setter 一起完整複製一個物件，`Object.assign` 會把 getter 執行後的值抄過去，正確做法是
  `Object.create(Object.getPrototypeOf(o), Object.getOwnPropertyDescriptors(o))`

---

## f. Reflect.ownKeys：唯一的完整答案

```js
Reflect.ownKeys(obj)
// 等價於 [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)]
```

`Reflect` 是 ES6 加的內建物件，把「操作物件的底層行為」整理成一組函式。跟 `Object` 靜態方法的差別在於：

| 面向 | `Object.xxx` | `Reflect.xxx` |
| --- | --- | --- |
| 失敗時 | 常常丟 `TypeError` | 回傳 `false`，讓你自己判斷 |
| 回傳值 | 常常回傳物件本身，不好接 | 回傳有意義的結果 |
| 用途 | 日常寫程式 | 寫 Proxy 攔截器時搭配使用 |

日常用不太到，但**「我要拿到一個物件所有的 key，一個都不能漏」** 這個需求只有它做得到。

---

## g. 鍵的排序規則（很多人不知道）

物件的 key **不是**照寫入順序排的，規則是三段：

```js
const ord = { b: 1, 2: 1, a: 1, 1: 1, [Symbol("s")]: 1, 10: 1 };
Reflect.ownKeys(ord);
// ["1", "2", "10", "b", "a", Symbol(s)]
```

- 第一段：**整數字串鍵**，照數字由小到大。注意是 `1, 2, 10` 而不是字串排序的 `1, 10, 2`
- 第二段：**其他字串鍵**，照寫入順序
- 第三段：**Symbol 鍵**，照寫入順序

所以你如果拿數字當 key 又期待照插入順序輸出，會被這條規則坑。需要保證順序請用 `Map`。

---

## h. 決策速查：我該用哪個

| 我想做的事 | 用這個 |
| --- | --- |
| 拿我自己放進去的資料 | `Object.keys` ／ `Object.entries` |
| 想連原型鏈繼承的一起掃 | `for...in`，記得配 `Object.hasOwn` 過濾 |
| 想看內建原型上有什麼方法 | `Object.getOwnPropertyNames` |
| 想知道某個屬性為什麼掃不到 | `Object.getOwnPropertyDescriptor` 看 `enumerable` |
| 想完整複製含 getter 的物件 | `Object.getOwnPropertyDescriptors` ＋ `Object.create` |
| 一個 key 都不能漏 | `Reflect.ownKeys` |
| 檢查某個 key 是不是自有的 | `Object.hasOwn`，別再用 `obj.hasOwnProperty` |

---

## 參考來源

| 來源 | 網址 | 頁面最後更新 |
| --- | --- | --- |
| MDN｜Object | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object | 2026-05-22 |
| MDN｜Object.getOwnPropertyNames | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames | — |
| MDN｜Reflect.ownKeys | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/ownKeys | — |

> [!note] 驗證方式
> 本篇 c 節與 g 節的所有輸出都在 Node.js v22 的 V8 引擎實跑過，不是憑記憶寫的。
> 可執行腳本在同資料夾的 `屬性列舉決策矩陣-demo.js`，用 `node 屬性列舉決策矩陣-demo.js` 就能重現。

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object建構子-plain-object的建立與存取]] | 那篇問「Object.prototype 有什麼」，本篇解釋為什麼那 12 個平常看不到 |
| [[Object靜態方法速查]] | 那篇是 API 清單，本篇是挑選依據。兩篇是「有什麼」與「用哪個」的分工 |
| [[for...in]] | 本篇「繼承那一圈」的完整版 |
| [[Symbol-符號型別與物件key]] | 本篇第 2 格與第 4 格的細節 |
| [[Console方法家族-一次講完]] | 本篇的實測全部靠 `console.table` 印出來，那篇講怎麼把資料印漂亮 |
| [[查看plain-object的prototype]] | 用 `getOwnPropertyNames` 檢查原型的實作範例 |
