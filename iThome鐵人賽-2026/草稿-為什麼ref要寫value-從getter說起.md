---
title: 為什麼 Vue 的 ref 一定要寫 .value
type: article-draft
importance: ⭐⭐⭐⭐⭐
tags: [ithome, 鐵人賽, javascript, getter-setter, accessor-property, proxy, vue, 五星必懂]
related:
  - "[[00-ref與reactive-響應式的兩種實作]]"
  - "[[00-GoF-23種設計模式總覽]]"
  - "[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]"
updated: 2026-08-18
---

# 為什麼 Vue 的 ref 一定要寫 .value？從 JavaScript 的 getter 說起

> 這篇是純 Markdown 格式，沒有用 Obsidian 的 callout 與 highlight 語法，可以直接貼到 iThome。

寫 Vue 的第一天，每個人都會遇到這行：

```js
const count = ref(0)
count.value++      // ← 為什麼是 .value？不能直接 count++ 嗎？
```

網路上多數答案是「因為 Vue 規定要這樣寫」。這不是答案，這是複述現象。

真正的原因藏在 JavaScript 的語言設計裡，而且要從一個比 Vue 還早十年的語法講起。

---

## 一、先認識 getter：定義時是函式，使用時是屬性

JavaScript 的物件屬性其實有兩種。

第一種你天天在用，叫**資料屬性（Data Property）**，就是直接存一個值：

```js
const person = { name: 'Abby' }
person.name        // 'Abby'  ← 把存進去的東西原封不動拿出來
```

第二種叫**存取器屬性（Accessor Property）**，它存的不是值，是**一段程式**：

```js
const person = {
  name: 'Abby',

  get greeting() {              // ← 用 get 開頭定義
    return 'Hi, ' + this.name
  }
}

person.greeting    // 'Hi, Abby'
```

注意最後那行，`person.greeting` **後面沒有小括號**，但它確實執行了那個函式。

這就是 getter 的全部：**你以為在讀一個屬性，JavaScript 偷偷幫你呼叫了一個函式。**

### getter 的中文怎麼說

- `get` → **取值器**（也有人翻成取得器、讀取器）
- `set` → **設值器**（也有人翻成設定器、寫入器）
- 兩者合稱 → **存取器（Accessor）**

正式規範術語是 Accessor Property，中文常見譯法是「存取器屬性」。面試講英文原文比較不會誤會。

### setter 是同一件事的反面

```js
const person = {
  firstName: 'Abby',
  lastName: 'L',

  set fullName(v) {                       // ← 用 set 開頭定義
    [this.firstName, this.lastName] = v.split(' ')
  }
}

person.fullName = 'Abby Lin'   // 看起來是賦值，其實是呼叫上面那個函式
person.firstName               // 'Abby'
person.lastName                // 'Lin'
```

**讀屬性時執行的是 getter，寫屬性時執行的是 setter。** 就這樣，沒有第三種。

---

## 二、那為什麼 `person.greeting()` 會爆炸？

這是最多人卡住的地方。兩行都會執行到那個函式，為什麼一個對一個錯？

```js
person.greeting     // 'Hi, Abby'   ✅
person.greeting()   // 💥 TypeError: person.greeting is not a function
```

關鍵在於**加了括號等於做了兩件事，而不是一件事**。

拆開看第二行實際發生了什麼：

```js
person.greeting()

// 步驟 1：JavaScript 先計算 person.greeting
//         → 觸發 getter → 執行函式 → 得到字串 'Hi, Abby'

// 步驟 2：把步驟 1 的結果拿來，對它加上 ()
//         → 也就是變成 'Hi, Abby'()
//         → 字串不是函式，不能被呼叫 → 爆炸
```

**你不是在呼叫 getter，你是在呼叫 getter 回傳的那個東西。**

所以「兩者回傳的都是字串，為什麼一個會錯」這個疑問，前提就錯了——第二行根本走不到「回傳」那一步，它在拿到字串之後想再呼叫一次，那一次才是錯的地方。

用普通函式對照就很清楚：

```js
const obj = {
  normalFn() { return 'Hi' },      // 普通方法
  get accessor() { return 'Hi' }   // 存取器
}

obj.normalFn      // ƒ normalFn()  ← 拿到函式本身，還沒執行
obj.normalFn()    // 'Hi'          ← 加括號才執行

obj.accessor      // 'Hi'          ← 直接就是結果，函式已經被偷偷執行了
obj.accessor()    // 💥            ← 等於 'Hi'()
```

**一句話記法：普通方法是「拿到函式，你自己執行」；getter 是「函式已經幫你執行完，你拿到的是結果」。**

---

## 三、getter/setter 的致命限制：只能攔「具名」屬性

到這裡 getter 看起來很萬能，但它有一個硬傷。

```js
const obj = {
  get name()  { /* 只攔 name */ },
  get age()   { /* 想攔 age 要再寫一組 */ },
  get email() { /* 想攔 email 再寫一組 */ },
}
```

**你必須事先把每個屬性的名字寫死。** 這就是「具名屬性」的意思。

更麻煩的是，事先不知道名字的，就永遠攔不到：

```js
obj.newThing = 123   // 你沒定義過 newThing 的 setter，完全攔不到
delete obj.name      // 刪除也攔不到
```

這正是 Vue 2 的痛點。Vue 2 用 `Object.defineProperty`（getter/setter 的另一種寫法）實作響應式，所以：

- 新增屬性偵測不到 → 必須手動呼叫 `Vue.set()`
- 刪除屬性偵測不到 → 必須手動呼叫 `Vue.delete()`
- `arr[0] = x` 偵測不到 → Vue 2 只好改寫 `push`、`pop` 等 7 個陣列方法硬補

所有 Vue 2 開發者都被 `Vue.set()` 折磨過，根源就是這一條。

---

## 四、Proxy 怎麼解決這件事：把名字變成參數

ES6（2015）加進來的 `Proxy`，解法優雅得多：

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

看出差別了嗎？

| | getter / setter | Proxy |
|---|---|---|
| 攔誰 | 一個名字一組，**寫死在程式碼裡** | 一個函式吃全部，**名字用參數傳進來** |
| 新增的屬性 | 攔不到 | 攔得到 |
| 刪除屬性 | 攔不到 | 攔得到（`deleteProperty`） |
| 陣列索引賦值 | 攔不到 | 攔得到 |
| 要不要事先知道名字 | **要** | **不用** |

一句話：**getter/setter 是「一個名字一組，寫死」；Proxy 是「一個函式吃全部，名字用參數傳進來」。**

Proxy 的 handler 裡最多可以定義 13 種攔截行為，官方術語叫 **trap（陷阱）**，常用的是 `get`、`set`、`has`（攔 `in` 運算子）、`deleteProperty`（攔 `delete`）。

---

## 五、reactive() 到底做了什麼

有了 Proxy，就能理解 `reactive()`。

**它只做一件事：把你的物件換成一個長得一模一樣、但會偷偷記筆記的替身。**

先看沒有它的世界：

```js
const obj = { count: 0 }
obj.count = 1        // 改完了。然後呢？沒有然後。
                     // 沒有人知道你改了，畫面不會動。
```

有了它：

```js
const state = reactive({ count: 0 })
state.count = 1      // 改完之後，畫面自動更新了
```

中間多做的事只有三步：

```
1. 畫面上顯示 state.count
   → get trap 被觸發 → 替身記下：「畫面 A 用到了 count」
   → 這一步叫「依賴收集 track」

2. 你執行 state.count = 1
   → set trap 被觸發 → 替身查筆記：「誰用到 count？→ 畫面 A」
   → 這一步叫「觸發更新 trigger」

3. 替身通知畫面 A 重新渲染
```

用比喻的話：普通物件是一張紙，你在上面塗改沒人知道；`reactive()` 的物件是同一張紙，但旁邊站了一個祕書，誰看過這張紙、誰改了哪一行他全部記下來，一改就打電話通知看過的人。

**而那個祕書，就是 Proxy。**

順帶一提，這個「找一個替身站在真實物件前面控制存取」的做法，在設計模式裡有正式名稱，叫**代理模式（Proxy Pattern）**，是 GoF 二十三個模式的其中一個。Vue 用的是其中的「智慧代理」：替身不改變原本的行為，只是在存取前後多做一件事。

---

## 六、回到最初的問題：`.value` 到底從哪來的

現在所有拼圖都在了。

**Proxy 有一個硬性限制：它的 target 必須是物件。**

```js
new Proxy(0, {})    // 💥 TypeError: Cannot create proxy with a non-object as target
```

所以 `reactive(0)` 是無效的。數字、字串、布林這些 primitive（原始值），Proxy 一律攔不到。

Vue 的解法分兩步：

1. **把純值裝進一個物件**，這樣才有東西可以攔
2. **改用 getter/setter 攔那個物件的屬性**

但 getter/setter 只能攔**具名**屬性，所以那個屬性必須有一個名字。Vue 選的名字就是 `value`。

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

function ref(value) {
  return new RefImpl(value)
}
```

**所以 `.value` 不是 Vue 想刁難你，是「getter/setter 必須有一個具名屬性可以攔」這個語言限制逼出來的結果。** 它總得叫某個名字，Vue 挑了 `value`。

Vue 官方文件講得很明確：「Vue 3 中則使用了 Proxy 來創建響應式對象，仍將 getter / setter 用於 ref。」

也就是說 Vue 3 裡面其實有**兩套響應式實作**：

| | 底層機制 | 能裝什麼 |
|---|---|---|
| `reactive()` | Proxy | 只能裝物件 |
| `ref()` | getter / setter | 什麼都能裝 |

---

## 七、那個 `_value` 是什麼？為什麼不直接用 `value`

這是實作 getter/setter 時的經典陷阱，值得單獨拿出來講。

先說 `_` 這個底線：它是 JavaScript 的**命名慣例**，表示「這是內部使用的，外面不要碰」。JavaScript 在 ES2022 之前沒有真正的私有欄位，所以社群用底線當作君子協定。（現在有 `#value` 這種真私有語法了，Vue 原始碼裡也在用。）

但這裡有一個比慣例更硬的理由——**如果不換名字，會無限遞迴**：

```js
class Bad {
  get value() {
    return this.value      // 💥 讀 this.value 又觸發 getter
  }                        //    → 又讀 this.value → 又觸發 getter → 無限迴圈
}

new Bad().value            // RangeError: Maximum call stack size exceeded
```

因為 getter 攔的就是 `value` 這個名字，所以你**不能在 getter 裡面再讀 `this.value`**，否則等於自己呼叫自己。

必須換一個名字來實際存放資料：

```js
class Good {
  get value() {
    return this._value     // ✅ _value 沒有 getter，不會觸發攔截
  }
}
```

**`_value` 是真正存資料的地方，`value` 是給外面用的門面。** 這個「對外門面 + 對內實際儲存」的雙層結構，是所有 getter/setter 實作的標準寫法，跟 Vue 一點關係都沒有。

---

## 八、常見誤解澄清

寫完這些，順手整理幾個很多人會搞混的點。

**a. `class` 跟 `get`/`set` 是 Vue 的語法嗎？**

不是。`class`、`get value()`、`set value()` 全部都是**原生 JavaScript 語法**，任何 JS 專案都能寫。`RefImpl` 只是 Vue 原始碼裡替這個類別取的名字，換成 `MyBox` 一樣能跑。

**b. getter/setter 是 Vue 的東西嗎？**

不是。存取器屬性是 **ES5（2009）** 就加進 JavaScript 的語言特性，比 Vue 出生還早。Vue 只是使用者，不是擁有者。

**c. 響應式 = Proxy 嗎？**

不是。**響應式是「效果」，Proxy 是「手段」。**

| 誰 | 用什麼手段 | 達成的效果 |
|---|---|---|
| Vue 2 | `Object.defineProperty` | 響應式 |
| Vue 3 的 `reactive()` | `Proxy` | 響應式 |
| Vue 3 的 `ref()` | getter / setter | 響應式 |
| Svelte | 編譯期改寫賦值 | 響應式 |
| Angular | Signals | 響應式 |

同一個效果，五種不同做法。講「響應式就是 Proxy」在面試會被追問到說不下去，因為 Vue 2 沒有 Proxy 但一樣有響應式。

**d. `reactive` 這個字有兩個意思**

- 形容詞 reactive ＝「響應式的」，是概念
- 函式 `reactive()` ＝ Vue 的一個具體 API，跟 `ref()` 並列

講「Vue 的響應式」是前者，講「用 `reactive()` 包一個物件」是後者。`ref()` 也能達成響應式，但它不叫 reactive。

**e. `ref(物件)` 是哪一種？**

兩種都是。如果傳給 `ref()` 的是物件，它內部會再呼叫 `reactive()` 包一層：

```js
const user = ref({ name: 'Abby' })
// user       → RefImpl 實例，用 getter/setter 攔 .value
// user.value → Proxy，因為內部呼叫了 reactive()
```

所以 `user.value.name = 'X'` 一樣會觸發更新——外層 getter/setter 加內層 Proxy，兩種機制疊在一起。

---

## 九、不懂這些會寫出什麼 Bug

**a. 在 `<script>` 裡漏寫 `.value`**

```js
const count = ref(0)

function add() {
  count++          // ❌ 你在對一個物件做加法
}
```

如果沒開 TypeScript，這行**不會報錯**，`count` 會安靜地變成 `NaN`，畫面顯示一個莫名其妙的值，而且很難查。開了 TypeScript 就會直接被紅字擋下，說 `Ref<number>` 不能做算術運算——這是 TS 在 Vue 專案裡最實際的價值之一。

順帶一提，`Ref<number>` 讀作「裝著數字的 ref 盒子」，它不等於 `number`。

**b. 對 primitive 用 `reactive()`**

```js
const count = reactive(0)    // ❌ 靜悄悄地沒有響應式
```

不會爆錯，但完全沒作用，Vue 會直接把它原樣回傳。

**c. 解構 `reactive` 物件**

```js
const state = reactive({ count: 0 })
const { count } = state      // ❌ count 只是一個普通數字，失去響應式
```

因為解構等於把值複製出來，離開了 Proxy 的攔截範圍。要保留響應式得用 `toRefs()`。

**d. 以為 `reactive(obj) === obj`**

```js
const raw = { a: 1 }
const state = reactive(raw)
state === raw     // false ← 你拿到的是替身不是本人
```

要取回原物件得用 `toRaw()`。

---

## 小結

一條線串起來：

1. **getter/setter**（ES5）讓「讀寫屬性」變成「執行函式」，但只能攔事先寫死名字的具名屬性
2. **Proxy**（ES6）把名字變成參數，一個函式攔全部，連新增與刪除都攔得到
3. **`reactive()`** 用 Proxy 做出「有人改就通知」的替身
4. **Proxy 攔不到 primitive**，所以純值改用 getter/setter，而 getter/setter 需要一個具名屬性
5. **那個屬性 Vue 命名為 `value`**，於是就有了 `.value`

下次有人問你「為什麼要寫 `.value`」，答案不是「Vue 規定的」，而是「因為 Proxy 攔不到數字」。

---

## 參考資料

- Vue 官方文件，深入響應式系統：https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- Vue 官方 API，`ref()`：https://cn.vuejs.org/api/reactivity-core.html#ref
- Vue 官方 API，`reactive()`：https://cn.vuejs.org/api/reactivity-core.html#reactive
- MDN，`Proxy`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
- MDN，getter 語法：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get

（查閱日期：2026-08-18）
