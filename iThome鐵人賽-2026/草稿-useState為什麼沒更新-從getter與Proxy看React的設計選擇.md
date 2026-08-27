---
title: useState 為什麼沒更新？從 getter 與 Proxy 看 React 的設計選擇
type: article-draft
importance: ⭐⭐⭐⭐⭐
tags: [ithome, 鐵人賽, react, javascript, getter-setter, accessor-property, proxy, useRef, immutable, 五星必懂]
related:
  - "[[00-ref與reactive-響應式的兩種實作]]"
  - "[[00-GoF-23種設計模式總覽]]"
  - "[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]"
updated: 2026-08-18
---

# useState 為什麼沒更新？從 getter 與 Proxy 看 React 的設計選擇

> 純 Markdown 格式，沒有用 Obsidian 的 callout 與 highlight 語法，可以直接貼到 iThome。

寫 React 的人都問過這三題：

```jsx
// 一、為什麼直接改沒反應？
const [user, setUser] = useState({ name: 'Abby' })
user.name = 'Bob'          // 畫面完全沒動

// 二、為什麼 useRef 要寫 .current？
const inputRef = useRef(null)
inputRef.current.focus()   // 為什麼不是 inputRef.focus()？

// 三、為什麼陣列不能用 push？
todos.push(newTodo)
setTodos(todos)            // 畫面還是沒動
```

多數教學的答案是「React 規定要這樣寫」。這不是答案，這是複述現象。

真正的原因是一個**語言層的限制**，以及 React 團隊在那個限制前面做的一個**取捨**。這篇從 JavaScript 本身講起，一路推到 React 為什麼長成現在這樣，中間會拿 Vue 當對照組，因為它在同一個岔路口選了另一條路。

---

## 一、JavaScript 有兩種「偷聽屬性」的能力

要理解 React 的選擇，得先知道 JavaScript 提供了什麼選項。

### 能力一：getter / setter（ES5，2009 年）

一般的物件屬性就是存一個值，這叫**資料屬性（Data Property）**：

```js
const person = { name: 'Abby' }
person.name        // 'Abby'  ← 存什麼拿什麼
```

但 JavaScript 還有第二種屬性，叫**存取器屬性（Accessor Property）**，它存的不是值，是**一段程式**：

```js
const person = {
  name: 'Abby',

  get greeting() {              // ← 用 get 開頭
    console.log('有人讀了 greeting')
    return 'Hi, ' + this.name
  },

  set nickname(v) {             // ← 用 set 開頭
    console.log('有人寫了 nickname =', v)
    this.name = v
  }
}

person.greeting          // 印出「有人讀了 greeting」，然後得到 'Hi, Abby'
person.nickname = 'Bob'  // 印出「有人寫了 nickname = Bob」
```

**這就是 getter 的全部：你以為在讀一個屬性，JavaScript 偷偷幫你呼叫了一個函式。**

中文譯名：`get` 是**取值器**，`set` 是**設值器**，合稱**存取器（Accessor）**。

#### 一個很多人卡住的細節：為什麼 `person.greeting()` 會爆炸

```js
person.greeting     // 'Hi, Abby'   正常
person.greeting()   // TypeError: person.greeting is not a function
```

兩行都會執行到那個函式，為什麼一個對一個錯？

因為**加括號等於做了兩件事，不是一件事**：

```js
person.greeting()

// 步驟 1：先計算 person.greeting
//         → 觸發 getter → 執行函式 → 得到字串 'Hi, Abby'

// 步驟 2：把步驟 1 的結果拿來，對它加上 ()
//         → 實際上變成 'Hi, Abby'()
//         → 字串不是函式 → 爆炸
```

**你不是在呼叫 getter，你是在呼叫「getter 回傳的那個東西」。**

跟普通方法對照就很清楚：

```js
const obj = {
  normalFn() { return 'Hi' },      // 普通方法（值剛好是函式的資料屬性）
  get accessor() { return 'Hi' }   // 存取器屬性
}

obj.normalFn      // ƒ normalFn()  ← 拿到函式本身，還沒執行
obj.normalFn()    // 'Hi'          ← 加括號才執行

obj.accessor      // 'Hi'          ← 函式已經被偷偷執行完了
obj.accessor()    // TypeError     ← 等於 'Hi'()
```

一句話記法：**普通方法是「拿到函式，你自己執行」；getter 是「函式已經幫你執行完，你拿到的是結果」。**

#### 另外兩個容易混淆的點

**a. getter 是在什麼時候觸發的？** 執行期（runtime）。這是純粹的執行期行為，編譯期或打包期不會發生任何事。每一次讀到那個屬性就執行一次，讀十次就執行十次。

**b. 自己寫的普通函式會不會觸發 getter？** 不會。**getter 是「屬性的定義方式」，不是「函式的種類」。** 只有你用 `get` 關鍵字定義的屬性才是 getter，普通的 `foo() {}` 只是一個值剛好是函式的資料屬性，讀它不會執行任何東西。

但反過來，如果你在自己的函式裡讀到一個有 getter 的屬性，那當然會觸發——觸發的是那個屬性，跟你的函式是不是自己寫的無關。

#### getter/setter 的致命限制：只能攔「事先寫死名字」的屬性

```js
const obj = {
  get name()  { /* 只攔 name */ },
  get age()   { /* 想攔 age 要再寫一組 */ },
  get email() { /* 想攔 email 再寫一組 */ },
}

obj.newThing = 123   // 沒定義過 newThing 的 setter，完全攔不到
delete obj.name      // 刪除也攔不到
```

**你沒辦法寫一組 getter 去攔「所有屬性」。** 每個屬性都要事先把名字寫死，這叫**具名屬性**。

### 能力二：Proxy（ES6，2015 年）

Proxy 就是來解決上面那個限制的：

```js
const proxy = new Proxy(target, {
  get(target, key) {          // ← key 是參數！
    console.log('有人讀了', key)
    return Reflect.get(target, key)
  },
  set(target, key, value) {
    console.log('有人寫了', key, '=', value)
    return Reflect.set(target, key, value)
  }
})
```

差別就在那個 `key`：

| | getter / setter | Proxy |
|---|---|---|
| 攔誰 | 一個名字一組，寫死在程式碼裡 | 一個函式吃全部，名字用參數傳進來 |
| 事先要知道名字嗎 | 要 | 不用 |
| 新增的屬性 | 攔不到 | 攔得到 |
| 刪除屬性 | 攔不到 | 攔得到 |
| 陣列索引賦值 | 攔不到 | 攔得到 |
| 能攔數字或字串嗎 | 不適用 | 不行，target 必須是物件 |

Proxy 的 handler 最多可定義 13 種攔截行為，官方術語叫 **trap（陷阱）**。

順帶一提，這個「放一個替身在真實物件前面控制存取」的做法，在設計模式裡叫**代理模式（Proxy Pattern）**，是 GoF 二十三個模式之一。

---

## 二、Vue 選了「用 Proxy 偷聽」

先看對照組，因為它比較直覺。

```js
const state = reactive({ count: 0 })
state.count = 1      // 畫面自動更新了
```

`reactive()` 做的事只有一件：**把你的物件換成一個長得一模一樣、但會偷偷記筆記的替身。**

```
1. 畫面上顯示 state.count
   → get trap 觸發 → 替身記下：「畫面 A 用到了 count」   （依賴收集 track）

2. 你執行 state.count = 1
   → set trap 觸發 → 替身查筆記：「誰用到 count？→ 畫面 A」（觸發更新 trigger）

3. 替身通知畫面 A 重新渲染
```

比喻：普通物件是一張紙，你在上面塗改沒人知道。`reactive()` 的物件是同一張紙，但旁邊站了一個祕書，誰看過、誰改了哪一行他全部記下來，一改就打電話通知看過的人。**那個祕書就是 Proxy。**

---

## 三、React 刻意不做這件事

這是整篇的核心。

**React 沒有在你的 state 上放任何攔截層。** 沒有 Proxy，沒有 getter/setter，你拿到的 `user` 就是一個乾乾淨淨的普通物件。

```jsx
const [user, setUser] = useState({ name: 'Abby' })

user.name = 'Bob'    // 這行就只是改了一個普通物件的屬性
                     // 沒有任何人在旁邊記筆記，React 完全不知情
```

**所以 React 判斷「有沒有變」的唯一依據，是比對參考（reference）。**

它在每次渲染時用 `Object.is` 比對新舊 state：

```js
Object.is(prevState, nextState)
// true  → 認定沒變，跳過渲染
// false → 認定變了，重新渲染
```

現在回頭看那三個經典問題，答案全部浮出來了。

### 問題一：為什麼直接改沒反應

```jsx
user.name = 'Bob'
setUser(user)        // 傳進去的還是同一個物件

// React 內部：Object.is(舊的 user, 新的 user) === true
// → 參考沒變 → 判定「沒有變化」→ 不重新渲染
```

物件內容確實改了，但 React 看的不是內容，是**這還是不是同一個盒子**。你在同一個盒子裡換東西，它看不出來。

正確做法是**給它一個新盒子**：

```jsx
setUser({ ...user, name: 'Bob' })    // 新物件 → 新參考 → Object.is 為 false → 重新渲染
```

**所以「不可變更新（immutable update）」不是 React 的風格潔癖，是它的偵測機制決定的必要條件。**

### 問題二：為什麼陣列不能用 push

```jsx
todos.push(newTodo)
setTodos(todos)      // push 是原地修改，陣列還是同一個參考
```

同樣的道理。要用會回傳新陣列的方法：

```jsx
setTodos([...todos, newTodo])           // 新增
setTodos(todos.filter(t => t.id !== id)) // 刪除
setTodos(todos.map(t => t.id === id ? { ...t, done: true } : t))  // 修改
```

記法：**`push`、`pop`、`splice`、`sort`、`reverse` 都會原地改；`map`、`filter`、`concat`、`slice` 都回傳新陣列。** React 只吃後者。

### 問題三：為什麼要呼叫 setState

因為 React 沒有替身可以偷聽，**你必須主動通報**。`setUser()` 這個呼叫本身就是通報動作——它告訴 React「這個元件的 state 換了，請排一次重新渲染」。

Vue 不需要通報，是因為它的祕書一直在旁邊看著。

---

## 四、useRef 的 .current 與 Vue 的 .value：兩個盒子，一個有祕書一個沒有

這組對照是理解 React 設計哲學最好的例子。

### 為什麼 useRef 要寫 .current

`useRef` 回傳的不是你傳進去的值，是一個**盒子**：

```jsx
const countRef = useRef(0)
console.log(countRef)          // { current: 0 }  ← 是物件不是數字
countRef.current               // 0
```

原因很單純：**React 需要一個在多次渲染之間「不會變的容器」。**

元件每次渲染都是重新執行整個函式，所有區域變數都會重來。React 的做法是回傳同一個物件參考，你把值放進它的 `current` 屬性，這樣不管渲染幾次，盒子都是同一個。

### Vue 的 ref 為什麼寫 .value

Vue 也需要盒子，但理由不同——**Proxy 攔不到 primitive**：

```js
new Proxy(0, {})    // TypeError: Cannot create proxy with a non-object as target
```

數字、字串、布林都不是物件，Proxy 完全無能為力。所以 Vue 對純值改用 getter/setter，而 getter/setter 只能攔**具名屬性**，那就得先造一個屬性出來給它攔。

`ref()` 的實作骨架大致長這樣：

```js
class RefImpl {
  constructor(value) {
    this._value = value
  }
  get value() {
    track(this, 'value')      // 依賴收集
    return this._value
  }
  set value(newVal) {
    this._value = newVal
    trigger(this, 'value')    // 觸發更新
  }
}
```

### 關鍵差異：一個有 getter，一個沒有

| | React 的 `useRef` | Vue 的 `ref` |
|---|---|---|
| 盒子的屬性名 | `.current` | `.value` |
| 那個屬性是什麼 | **普通的資料屬性** | **存取器屬性（有 getter/setter）** |
| 改了會怎樣 | **什麼都不會發生** | 自動觸發畫面更新 |
| 用途 | 存跨渲染的值，**刻意不要觸發渲染** | 存響應式狀態，**就是要觸發渲染** |

```jsx
countRef.current = 999    // 值真的改了，但畫面一動也不動
```

**這不是缺陷，這正是 `useRef` 存在的理由。** 當你需要存一個「跨渲染保留、但改了不該重畫」的東西——計時器 ID、DOM 節點、上一次的值——就用它。

**同樣是盒子，Vue 的盒子裡裝了祕書，React 的盒子是空的。這一個差別，就是兩個框架的哲學分歧。**

### 順帶回答：那個屬性名是固定的嗎

是的，**`value` 就是 Vue 團隊挑的一個固定名字**，寫死在 `RefImpl` 這個類別裡，不是什麼特殊工具或關鍵字。所有的 ref 都用同一個名字 `value`，不是每個 ref 各自取名。

React 挑的是 `current`。兩邊都可以叫別的——`val`、`inner`、`box` 都行，只是團隊做了不同的命名決定而已。

---

## 五、那 React 為什麼不乾脆用 Proxy 就好？

這題面試很愛問，而且是分辨「有沒有想過」的好題目。

幾個公認的理由：

**a. 顯式優於隱式。** `setCount(c => c + 1)` 囉唆，但你 grep 得到所有狀態變動點。Vue 的 `state.count++` 簡潔，代價是資料流有隱式魔法，大型團隊追 bug 時比較痛。

**b. React 的心智模型是「UI 是狀態的函數」。** 它希望你把渲染想成「給定 state，算出畫面」，而不是「哪個值變了就去改哪一塊 DOM」。自動偵測會把人往後者的方向拉。

**c. Proxy 無法被 polyfill。** React 誕生於 2013 年，那時 Proxy 還沒進規範。Vue 3 選了 Proxy，代價就是直接放棄 IE11。

**d. 不可變資料有額外好處。** 時光旅行除錯、樂觀更新回滾、`React.memo` 的淺比較，全都建立在「舊值還在、新值是另一個物件」這個前提上。

**這題沒有標準答案，重點是你講不講得出取捨。** 「React 最好」會被扣分，「React 在寫法簡潔度上輸給 Vue，但換來顯式的資料流與可預測性，我這個專案需要的是後者」會加分。

---

## 六、不懂這些會寫出什麼 Bug

**a. 直接改 state 物件**

```jsx
user.name = 'Bob'
setUser(user)        // 畫面不動
```

最陰險的是它**有時候會動**——如果同一次事件裡還有別的 state 更新，元件被迫重新渲染，你會看到改後的值，於是誤以為程式碼是對的。等到某天單獨改它時才發現壞掉，而且完全不知道為什麼上次可以。

**b. 巢狀物件只複製了第一層**

```jsx
setUser({ ...user })                    // 只有最外層是新的
user.profile.age = 30                   // profile 還是舊的參考，改了它 React 看不到
```

正確：

```jsx
setUser({ ...user, profile: { ...user.profile, age: 30 } })
```

**c. 以為 `useRef` 改了畫面會動**

```jsx
countRef.current++    // 值有變，畫面不會動
```

不是 bug，是設計。要畫面動就該用 `useState`。

**d. Vue 那邊：在 `<script>` 裡漏寫 `.value`**

```js
const count = ref(0)
count++          // 你在對一個物件做加法
```

沒開 TypeScript 的話**不會報錯**，`count` 會安靜地變成 `NaN`。開了 TS 就會直接紅字擋下，說 `Ref<number>` 不能做算術運算——這是 TS 在 Vue 專案裡最實際的價值。

---

## 七、幾個常見誤解

**a. `class`、`get`、`set` 是 Vue 的語法嗎？**

不是，全部都是**原生 JavaScript**。`RefImpl` 只是 Vue 原始碼替那個類別取的名字，改叫 `MyBox` 一樣能跑。

**b. `_value` 那個底線是什麼？**

底線是 JavaScript 的**命名慣例**，表示「內部使用，外面別碰」。但這裡有比慣例更硬的理由——**不換名字會無限遞迴**：

```js
get value() {
  return this.value    // 讀 this.value 又觸發 getter → 又讀 → 無限迴圈
}                      // RangeError: Maximum call stack size exceeded
```

getter 攔的就是 `value` 這個名字，所以裡面不能再讀 `this.value`，必須換一個沒被攔截的名字實際存資料。**`_value` 是真正存東西的地方，`value` 是給外面用的門面。** 這個雙層結構是所有 getter/setter 實作的標準寫法。

**c. 響應式 ＝ Proxy 嗎？**

不是。**響應式是「效果」，Proxy 是「手段」。**

| 誰 | 手段 | 效果 |
|---|---|---|
| Vue 2 | `Object.defineProperty` | 響應式 |
| Vue 3 的 `reactive()` | `Proxy` | 響應式 |
| Vue 3 的 `ref()` | getter / setter | 響應式 |
| Svelte | 編譯期改寫賦值 | 響應式 |
| Angular | Signals | 響應式 |
| React | **不做響應式**，改用參考比對 | — |

講「響應式就是 Proxy」在面試會被追問到說不下去，因為 Vue 2 沒有 Proxy 但一樣有響應式。

**d. `reactive` 這個字有兩個身分**

形容詞 reactive 是「響應式的」（概念），函式 `reactive()` 是 Vue 的一個具體 API。`ref()` 也能達成響應式，但它不叫 reactive。

---

## 小結

一條線串起來：

1. JavaScript 提供兩種偷聽屬性的能力：**getter/setter**（ES5，只能攔寫死名字的具名屬性）與 **Proxy**（ES6，名字變參數，一網打盡）
2. **Vue 兩個都用**：`reactive()` 用 Proxy，`ref()` 用 getter/setter，所以它知道你改了什麼
3. **React 兩個都不用**，它沒有攔截層，只能用 `Object.is` 比對參考
4. 所以你必須**給新參考**（不可變更新）並**主動通報**（`setState`）
5. `useRef` 的 `.current` 是**普通屬性沒有 getter**，這就是它改了不會重繪的原因，也正是它的用途

下次有人問你「為什麼 React 要不可變更新」，答案不是「React 規定的」，而是「因為 React 沒有在你的物件上放攔截層，它只看得到參考變沒變」。

---

## 參考資料

- React 官方文件，Updating Objects in State：https://react.dev/learn/updating-objects-in-state
- React 官方文件，Referencing Values with Refs：https://react.dev/learn/referencing-values-with-refs
- Vue 官方文件，深入響應式系統：https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- MDN，`Proxy`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
- MDN，getter 語法：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
- MDN，`Object.is`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is

（查閱日期：2026-08-18）
