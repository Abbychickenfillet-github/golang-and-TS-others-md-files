---
title: 存取器屬性的三種定義方式｜getter、setter 與資料驗證
tags: [javascript, accessor-property, getter, setter, defineProperty, class, 面試]
created: 2026-08-19
source:
  - MDN Object.defineProperty()
  - MDN get / set（Functions 章節）
  - MDN Object.prototype.__proto__（頁面最後更新 2026-05-22）
sources:
  - https://gemini.google.com/app/ca2463a1acf1bdc6
updated: 2026-09-05
---

# 存取器屬性的三種定義方式

> [!info] 承接與去向
> a. 承接 [[Object建構子-plain-object的建立與存取]] 的 j 節與 k 節：那裡說 `__proto__` 是「定義在 `Object.prototype` 上的存取器屬性」，這篇把「存取器屬性到底怎麼做出來」講完。
> b. 本篇的資料驗證段落，是 [[草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇]] 的前置知識：Vue 用 getter／setter 攔截、React 沒有，差別就在這裡。
> c. 本篇 defineProperty 的 `enumerable: false` 直接對應 [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] 主軸圖的第 3 格。

---

## a. 先修正一個觀念：getter 與 setter 是真的存在的函式

有一種誤解是「getter／setter 不是具體的東西，只是 `Object.getPrototypeOf()` 這種方法的統稱」。**不是這樣。**

它們是**貨真價實的函式物件**，你可以把它們挖出來自己呼叫：

```js
const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');

typeof d.get        // "function"
d.get.name          // "get __proto__"  ← 它連名字都有
d.set.name          // "set __proto__"

// 挖出來自己用
d.get.call([]) === Array.prototype        // true
d.set.call(myObj, someProto)              // 手動觸發 setter
```

那它跟 `Object.getPrototypeOf` 是同一個東西嗎？**不是。**

```js
d.get === Object.getPrototypeOf           // false ← 兩個不同的函式物件
d.get.call([]) === Object.getPrototypeOf([])   // true ← 但做同一件事
```

> [!important] 正確的理解
> 「讀原型」這件事有**兩條管道**：
> a. 存取器屬性 `obj.__proto__` —— 讀的時候那個叫 `get __proto__` 的函式被自動呼叫
> b. 靜態方法 `Object.getPrototypeOf(obj)` —— 你自己明確呼叫
> 兩條管道通到同一個內部行為，但**是兩個不同的函式**，一個是遺留設計、一個是正規 API。

---

## b. 三種定義方式

### b-1. 物件字面量的 `get` / `set`

```js
const user = {
  _age: 0,

  get age() {
    return this._age;
  },

  set age(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) throw new TypeError('age 必須是數字');
    if (!Number.isInteger(n)) throw new RangeError('age 必須是整數');
    if (n < 0 || n > 150) throw new RangeError('age 要在 0 到 150 之間');
    this._age = n;
  },
};

user.age = 20;      // setter 跑驗證，通過才寫進 _age
user.age;           // 20，getter 執行
user.age = 'abc';   // TypeError: age 必須是數字
user.age;           // 還是 20 ← 驗證失敗時舊值沒被弄髒
```

**這就是「在 setter 裡加資料合法性檢查」的做法**：把驗證寫在 `set` 裡面，通過才真的寫進去。

| 面向 | 說明 |
| --- | --- |
| 掛在哪 | **物件自己身上**，`Object.hasOwn(user, 'age')` 是 `true` |
| 私有值 | 靠 `_age` 這種底線慣例，但外面還是改得到，**不是真的私有** |
| 適合 | 一次性的物件、設定物件 |

### b-2. `Object.defineProperty`

```js
const config = {};
let _theme = 'light';                      // 真正的私有值，藏在閉包裡
const ALLOWED = ['light', 'dark', 'auto'];

Object.defineProperty(config, 'theme', {
  get() { return _theme; },
  set(v) {
    if (!ALLOWED.includes(v)) throw new RangeError('theme 只能是 ' + ALLOWED.join('、'));
    _theme = v;
  },
  enumerable: false,      // ← 只有這個寫法給你這個控制權
  configurable: true,
});

config.theme = 'dark';    // OK
config.theme = 'rainbow'; // RangeError
```

實測結果：

```js
Object.keys(config)                    // []        ← enumerable:false 掃不到
Object.getOwnPropertyNames(config)     // ["theme"] ← 這個掃得到
JSON.stringify(config)                 // {}        ← 序列化也拿不到
```

**這正好是 [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] 主軸圖的第 3 格：字串鍵＋不可列舉。**

| 面向 | 說明 |
| --- | --- |
| 掛在哪 | 你指定的任何物件，包括別人的 `prototype` |
| 能控旗標 | **四個都能控**：`enumerable`、`configurable`（存取器沒有 `value` 與 `writable`） |
| 私有值 | 靠**閉包**，外面真的碰不到 |
| 適合 | 要隱藏屬性、要唯讀、要在既有物件上加東西 |

> [!note] `__proto__` 就是用這種方式做出來的
> `Object.getOwnPropertyDescriptor(Object.prototype, '__proto__')` 得到
> `{ get, set, enumerable: false, configurable: true }` —— 跟上面 `config.theme` 的結構一模一樣。
> 差別只在於它的 setter 改的不是一個普通變數，而是物件的**內部原型插槽**。

### b-3. `class` 的 `get` / `set` ＋ 私有欄位

```js
class Temperature {
  #celsius = 0;                    // # 開頭是真正的私有欄位，不是慣例

  get celsius() { return this.#celsius; }

  set celsius(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) throw new TypeError('溫度必須是數字');
    if (v < -273.15) throw new RangeError('低於絕對零度 -273.15°C，物理上不可能');
    this.#celsius = v;
  }

  get fahrenheit() {               // 唯讀存取器：只有 get 沒有 set
    return this.#celsius * 9 / 5 + 32;
  }
}

const t = new Temperature();
t.celsius = 25;
t.fahrenheit;         // 77 ← 算出來的，沒有實際存這個值
t.celsius = -300;     // RangeError
```

**唯讀存取器被寫入時的行為**（跟 `writable: false` 一樣的規則）：

```js
t.fahrenheit = 100;                    // 非嚴格模式：靜默失敗
(function(){ 'use strict';
  t.fahrenheit = 100;                  // TypeError: Cannot set property fahrenheit
                                       // of #<Temperature> which has only a getter
})();
```

**最關鍵的一點：class 的存取器掛在 `prototype` 上，實例共用一份。**

```js
Object.hasOwn(Temperature.prototype, 'celsius')   // true
Object.hasOwn(t, 'celsius')                       // false
```

**這跟 `__proto__` 掛在 `Object.prototype` 上是完全一樣的結構。** 你懂了 `__proto__`，就懂了 class 的 getter 存在哪。

私有欄位真的碰不到：

```js
Object.keys(t)                    // []
Object.getOwnPropertyNames(t)     // []
JSON.stringify(t)                 // {} ← 存取器不會被序列化
```

---

## c. 三種寫法對照表

| 寫法 | 掛在哪 | 能控旗標 | 私有值靠 | 適合 |
| --- | --- | --- | --- | --- |
| 字面量 `{ get x(){} }` | 物件自己身上 | 不能 | `_` 底線慣例或閉包 | 一次性物件 |
| `Object.defineProperty` | 你指定的物件 | **四個都能** | 閉包 | 要藏起來、要唯讀、要加到既有物件 |
| `class get/set` | **prototype 共用** | 不能（預設不可列舉） | `#` 私有欄位 | 有多個實例 |

---

## d. 存取器屬性的四個實務用途

| 用途 | 例子 |
| --- | --- |
| **資料驗證** | 上面三個範例，寫入前先擋 |
| **計算屬性** | `get fahrenheit()` 從攝氏算出來，不佔記憶體、永遠同步 |
| **唯讀對外介面** | 只給 `get` 不給 `set`，內部值藏在閉包或 `#` 欄位 |
| **偷聽讀寫** | 在 getter／setter 裡記 log 或觸發更新 —— **這就是 Vue 2 響應式的原理** |

最後一項是 [[草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇]] 那篇的主軸：Vue 2 用 `Object.defineProperty` 把每個屬性換成存取器來攔截讀寫，Vue 3 換成 `Proxy`，而 React 選擇**完全不攔截**，改用「你必須給我一個新物件」的約定。三個框架在同一個岔路口做了三種選擇。

---

## e. 常見陷阱

| 陷阱 | 說明 |
| --- | --- |
| getter 裡面讀自己 | `get age(){ return this.age; }` → 無限遞迴，`RangeError: Maximum call stack size exceeded` |
| 忘記存取器不能有 `value` | 資料描述器與存取器描述器**互斥**，同時寫 `value` 與 `get` 會 `TypeError` |
| `Object.assign` 會執行 getter | 複製時 getter 被跑掉，結果變成死值。要保留得用 `Object.getOwnPropertyDescriptors` |
| `JSON.stringify` 會執行 getter | 字面量與 class 的可列舉存取器會被序列化成計算後的值；`enumerable:false` 的則完全不出現 |
| 唯讀在非嚴格模式靜默失敗 | 寫了沒反應又不報錯，最難除錯。寫示範檔記得加 `'use strict'` |

---

## f. 追加 2026-09-05｜getter 的「名稱」可以寫成哪幾種

> 來源：Gemini 對話〈語法參數與性名稱〉https://gemini.google.com/app/ca2463a1acf1bdc6

(f-1) <mark style="background: #FF5582A6;">MDN 文件裡寫的 `get prop()` 那個 `prop` 只是佔位符（placeholder）</mark>，<mark style="background: #BBFABBA6;">不是保留字，可以自由命名</mark>。這點很容易誤會成「一定要叫 prop」。

(f-2) 名稱總共有四種合法寫法：

| 寫法 | 範例 | 說明 |
| --- | --- | --- |
| 識別碼（Identifier） | `get latest()` `get fullName()` | 最常見，符合一般變數命名規則即可 |
| 字串字面量（String Literal） | `get "first-name"()` | 名稱含空格或連字號等特殊字元時用 |
| 數字字面量（Number Literal） | `get 123()` | 合法但罕見，讀取時要寫 `obj[123]` |
| 計算屬性名稱（Computed Property Name） | `get [expr]()` | ES2015 起支援，用中括號包表達式來動態決定名稱 |

```js
const expr = "foo";
const obj = {
  get [expr]() { return "bar"; }   // 名稱動態決定為 "foo"
};
obj.foo;   // "bar"
```

(f-3) <mark style="background: #ADCCFFA6;">順帶釐清一個名詞：Object Initializer（物件初始器）</mark>。<mark style="background: #FF5582A6;">它不是程式碼裡的關鍵字，所以在範例裡是找不到 `initializer` 這個字的</mark>——它是規範層的語法概念名稱，<mark style="background: #BBFABBA6;">指的就是用大括號直接建立並初始化物件的那整段 `{ ... }`</mark>（也就是常說的 object literal 物件實字）。

```js
var obj = {                       // ← Initializer 從這個左大括號開始
  log: ["example", "test"],
  get latest() {
    if (this.log.length == 0) return undefined;
    return this.log[this.log.length - 1];
  },
};                                // ← 到這個右大括號結束
console.log(obj.latest);          // "test"
```

> [!tip] 附帶收穫：Chrome 內建閱讀模式可以朗讀網頁
> 同一串對話中順便問到「怎麼讓頁面朗讀」。<mark style="background: #BBFABBA6;">不用裝擴充功能</mark>：在網址列右側點「進入閱讀模式」圖示（或在頁面空白處按右鍵選「在閱讀模式中開啟」），右側側邊欄頂部有播放鍵，可調語速與聲音。想要更自然的語音再考慮 Read Aloud（`Alt + P` 開始／暫停）或 NaturalReader。<mark style="background: #D2B3FFA6;">對 Abby 讀 MDN 長文很實用。</mark>

---

## 參考來源

| 來源 | 說明 |
| --- | --- |
| Gemini 對話｜語法參數與性名稱（2026-09-05） | f 節的 getter 命名四種寫法與 Object Initializer 名詞釐清 |
| MDN｜get（Functions 章節，語法區的 prop 與 expression） | f 節的四種名稱寫法，2026-09-05 查證 |
| MDN｜Object initializer | f 節的名詞定義，2026-09-05 查證 |
| MDN｜Object.defineProperty() | 描述器的四個旗標與存取器／資料描述器互斥 |
| MDN｜get / set | 字面量與 class 的存取器語法 |
| MDN｜Object.prototype.\_\_proto\_\_（2026-05-22 更新） | `__proto__` 的描述器結構 |

> [!note] 驗證方式
> 本篇所有輸出都在 Node.js v22 的 V8 實跑過，腳本是同資料夾的 `存取器-三種定義方式-demo.js`。

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[Object建構子-plain-object的建立與存取]] | j 節與 k 節說 `__proto__` 是存取器屬性，本篇說明存取器怎麼做出來 |
| [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] | `enumerable:false` 的存取器就住在那張圖的第 3 格 |
| [[草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇]] | 存取器攔截是 Vue 響應式的原理，本篇是那篇的語言層前置知識 |
| [[Object靜態方法速查]] | `defineProperty` 與 `getOwnPropertyDescriptor` 的速查在那裡 |
| [[原型與引擎最佳化-Shape-InlineCache-ValidityCell]] | 為什麼 `__proto__` 的 setter 特別貴，答案在那篇 |
