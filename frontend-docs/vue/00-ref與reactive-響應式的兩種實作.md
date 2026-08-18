---
title: ref 與 reactive：響應式的兩種實作
type: topic-note
source: Claude
tags:
  - vue
  - ref
  - reactive
  - proxy
  - getter-setter
  - 響應式
  - 設計模式
  - 面試
aliases:
  - ref vs reactive
  - Vue 響應式實作
related:
  - "[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]"
  - "[[00-GoF-23種設計模式總覽]]"
  - "[[高階函式與函數式範式-取代OOP三大設計模式]]"
updated: 2026-08-18
---

# ref 與 reactive：響應式的兩種實作

> [!info] 三向關聯，以及為什麼要一起看
> - a. [[00-前端框架比較-Vue-React-Angular難易度與優缺點]] 第 (i) 點：那裡講 **Proxy 怎麼做出響應式**，是機制層。本篇補上那篇沒說清楚的一半——<mark style="background: #FFF3A3A6;">`ref()` 根本不是用 Proxy 做的</mark>，所以那篇的結論要加一個但書。
> - b. [[00-GoF-23種設計模式總覽]] 第四節：那裡辨異 Proxy／Decorator／Adapter 三個模式。本篇是「Proxy 模式落到真實產品」的個案，可以驗證那節的判準——`reactive()` 介面不變功能不變，確實是 Proxy 不是 Decorator。
> - c. [[高階函式與函數式範式-取代OOP三大設計模式]]：那篇講 JS 的語言特性怎麼吸收設計模式。本篇的 getter／setter 是同一個現象的另一例——<mark style="background: #BBFABBA6;">語言在 ES5 就內建了「讀屬性時執行一段程式」的能力，Vue 只是拿來用，並沒有發明它</mark>。

---

## 一、先把三個一直被混用的詞分層

<mark style="background: #FF5582A6;">這三個詞我自己在對話裡也混用過，先切乾淨再往下讀。</mark>

| 層次 | 名稱 | 是什麼 | 誰定義的 |
|---|---|---|---|
| 概念 | <mark style="background: #ADCCFFA6;">響應式 Reactivity</mark> | **效果**：資料變了畫面自動更新 | 沒有人擁有，各家框架都在做 |
| 語言 | <mark style="background: #ADCCFFA6;">`Proxy` 物件、getter／setter</mark> | **工具**：原生 JavaScript 提供的攔截能力 | ECMAScript 規範，文件在 MDN |
| 框架 | <mark style="background: #ADCCFFA6;">`reactive()`、`ref()`</mark> | **產品**：Vue 拿上面的工具做出來的 API | Vue 團隊 |

三句話講完關係：

- a. <mark style="background: #BBFABBA6;">響應式是「要達成的效果」，不是任何一種技術。</mark>Vue 2 用 getter／setter 達成、Vue 3 用 Proxy 達成、Svelte 用編譯器改寫達成、Angular 用 Signals 達成，效果同名，手段完全不同。
- b. <mark style="background: #BBFABBA6;">`Proxy` 是 JavaScript 的東西不是 Vue 的東西。</mark>它是 ES6（2015）加進語言的內建物件，寫在 ECMAScript 規範裡，MDN 有完整文件。就算你這輩子不碰 Vue，`Proxy` 一樣存在。
- c. <mark style="background: #BBFABBA6;">`reactive()` 是 Vue 的產品，它內部呼叫的是 (b) 那個語言 API。</mark>所以「Vue 的 `reactive()` 是拿語言 API 做出來的」這句話裡的「語言 API」，指的就是 MDN 上的 `Proxy`。

> [!warning] ⚠️ 特別容易打結的地方：reactive 這個字有兩個身分
> - a. <mark style="background: #FF5582A6;">形容詞 reactive</mark>＝「響應式的」，是概念。講「reactive system」時是這個意思。
> - b. <mark style="background: #FF5582A6;">函式 `reactive()`</mark>＝ Vue 的一個具體 API，跟 `ref()` 並列。
>
> 講「Vue 的響應式」時是 (a)，講「用 `reactive()` 包一個物件」時是 (b)。<mark style="background: #FFF3A3A6;">前者是效果，後者是達成效果的其中一個入口——`ref()` 也能達成同樣效果，但它不叫 reactive。</mark>

## 二、getter／setter 是原生 JavaScript，跟 Vue 無關

<mark style="background: #FFF3A3A6;">存取器屬性（Accessor Property）是 ES5（2009）就加進 JavaScript 的語言特性，比 Vue 出生還早。</mark>它讓「讀一個屬性」這件事變成「執行一段函式」。

三種原生寫法，都不需要任何框架：

```javascript
// 寫法 1：物件字面量
const person = {
  firstName: 'Abby',
  lastName: 'L',
  get fullName() {              // 讀 person.fullName 時執行這段
    console.log('[getter 被呼叫]');
    return this.firstName + ' ' + this.lastName;
  },
  set fullName(v) {             // 寫 person.fullName = '...' 時執行這段
    console.log('[setter 被呼叫]');
    [this.firstName, this.lastName] = v.split(' ');
  }
};

person.fullName;                // 看起來像讀屬性，其實在呼叫函式
person.fullName = 'Abby Lin';   // 看起來像賦值，其實在呼叫函式

// 寫法 2：Object.defineProperty（Vue 2 用的就是這個）
Object.defineProperty(person, 'age', {
  get() { return 18; },
  set(v) { console.log('攔到寫入', v); }
});

// 寫法 3：class 裡的 get／set（Vue 3 的 ref 用這個）
class Box {
  #inner = 0;
  get value() { return this.#inner; }
  set value(v) { this.#inner = v; }
}
```

<mark style="background: #BBFABBA6;">結論：getter／setter 是語言能力，Vue 只是使用者不是擁有者。</mark>把它講成「Vue 的 getter／setter」是錯的，正確說法是「Vue 用了 JavaScript 的 getter／setter」。

> [!tip] 這跟 Proxy 的差別在哪
> - <mark style="background: #ADCCFFA6;">getter／setter</mark>：<mark style="background: #FF5582A6;">一次只能攔一個「你事先指定好名字」的屬性</mark>。要攔 10 個屬性就要定義 10 組。新增的屬性完全攔不到，因為你沒事先定義。
> - <mark style="background: #ADCCFFA6;">Proxy</mark>：<mark style="background: #BBFABBA6;">攔的是整個物件</mark>，任何屬性、包含之後才新增的、包含刪除，全部一網打盡。
>
> 這一句話就解釋了 Vue 2 為什麼需要 `Vue.set()`，而 Vue 3 不需要。

## 三、`ref()` 的真面目：它用的是 getter／setter，不是 Proxy

Vue 官方文件原話：「Vue 3 中則使用了 Proxy 來創建響應式對象，<mark style="background: #FFF3A3A6;">仍將 getter / setter 用於 ref</mark>。」

`ref()` 的實作骨架大致長這樣（極簡版）：

```javascript
class RefImpl {
  constructor(value) {
    this._value = value;
  }
  get value() {          // ← 這裡是 getter，不是 Proxy
    track(this, 'value');       // 依賴收集
    return this._value;
  }
  set value(newVal) {    // ← 這裡是 setter
    this._value = newVal;
    trigger(this, 'value');     // 觸發更新
  }
}

function ref(value) {
  return new RefImpl(value);
}
```

> [!check] 這段程式碼一次回答了三個為什麼
> - a. <mark style="background: #FFF3A3A6;">為什麼一定要寫 `.value`？</mark>因為 getter／setter 只能攔截**具名屬性**。要攔得到，就必須真的有一個叫 `value` 的屬性。這個 `.value` 不是 Vue 故意刁難，是 getter／setter 這個機制的硬性要求。
> - b. <mark style="background: #FFF3A3A6;">為什麼 primitive 需要 `ref()` 而不能用 `reactive()`？</mark>因為 `Proxy` 的 target 必須是物件，`reactive(0)` 沒有東西可以代理。Vue 的解法是把純值裝進一個有 `value` 屬性的盒子，再用 getter／setter 攔那個屬性。
> - c. <mark style="background: #FFF3A3A6;">為什麼 `count` 印出來是 `RefImpl { value: 0 }` 而不是 `0`？</mark>因為 `ref()` 回傳的是這個 class 的實例，不是數字本身。它是盒子。

### `Ref<number>` 這個 TypeScript 型別在說什麼

```typescript
const count = ref(0)        // 型別是 Ref<number>
```

- <mark style="background: #ADCCFFA6;">`Ref`</mark> 是 Vue 提供的泛型型別，代表「一個 ref 盒子」。
- <mark style="background: #ADCCFFA6;">`<number>`</mark> 是型別參數，說明盒子裡裝的是數字。

所以 `Ref<number>` 讀作「<mark style="background: #BBFABBA6;">裝著數字的 ref 盒子</mark>」，它**不是** `number`。這就是為什麼你在 `<script>` 裡寫 `count++` 時 TypeScript 會報錯——它在說「你想對一個盒子做加法」。正確寫法是 `count.value++`，先打開盒子再加。

<mark style="background: #FFB86CA6;">實驗建議：故意把 `.value` 拿掉，把 TypeScript 的紅字錯誤截圖存起來。那張圖是「ref 是盒子」最有力的證據。</mark>

## 四、`reactive()` 的真面目：這個才是 Proxy

```javascript
function reactive(target) {
  return new Proxy(target, {       // ← 這裡才是 Proxy
    get(t, key, receiver) {
      track(t, key);
      return Reflect.get(t, key, receiver);
    },
    set(t, key, value, receiver) {
      const ok = Reflect.set(t, key, value, receiver);
      trigger(t, key);
      return ok;
    }
  });
}
```

### 兩者對照表

| | `ref()` | `reactive()` |
|---|---|---|
| 底層機制 | <mark style="background: #ADCCFFA6;">getter／setter（ES5）</mark> | <mark style="background: #ADCCFFA6;">`Proxy`（ES6）</mark> |
| 能裝什麼 | <mark style="background: #BBFABBA6;">都可以</mark>：數字、字串、布林、物件、陣列 | <mark style="background: #FF5582A6;">只能裝物件</mark>，`reactive(0)` 無效 |
| 存取寫法 | script 裡要 `.value`，模板自動解包 | 直接 `state.count`，沒有 `.value` |
| 解構之後 | 解構出來的 ref 仍保有響應式 | <mark style="background: #FF5582A6;">解構會失去響應式</mark>，要用 `toRefs()` |
| 整包替換 | <mark style="background: #BBFABBA6;">可以</mark>：`obj.value = newObj` | <mark style="background: #FF5582A6;">不行</mark>：重新賦值會換掉代理本身 |
| 與原物件是否相等 | 不適用 | `reactive(o) === o` 是 `false`，要 `toRaw()` 取回本人 |

> [!note] 一個容易忽略的混合行為
> <mark style="background: #FFF3A3A6;">`ref()` 如果你傳進去的是物件，它內部會再呼叫 `reactive()` 把物件包一層。</mark>
>
> ```javascript
> const user = ref({ name: 'Abby' })
> // user 本身   → RefImpl，用 getter／setter
> // user.value  → Proxy，因為內部呼叫了 reactive()
> ```
>
> 所以 `ref({...})` 是<mark style="background: #BBFABBA6;">兩種機制疊在一起</mark>：外層 getter／setter 攔 `.value` 的讀寫，內層 Proxy 攔物件屬性的讀寫。這也是為什麼 `user.value.name = 'X'` 一樣會觸發更新。

### 實務上怎麼選

- a. <mark style="background: #FFB86CA6;">官方與社群主流建議：一律用 `ref()`。</mark>心智負擔最低，不用記「這個能不能解構、那個能不能整包換」。代價只是到處寫 `.value`。
- b. <mark style="background: #FFB86CA6;">`reactive()` 適合</mark>一組永遠一起變動、而且不會整包替換的狀態，例如表單欄位群組。
- c. <mark style="background: #FF5582A6;">不要混用同一份資料</mark>，會出現「有時要 `.value` 有時不用」的混亂。

## 五、模板自動解包 unwrap 是什麼意思

<mark style="background: #FFF3A3A6;">解包（unwrap）＝ 把盒子打開，拿出裡面的東西。</mark>

```vue
<script setup>
const count = ref(0)
console.log(count)        // RefImpl { value: 0 }   ← 盒子
console.log(count.value)  // 0                      ← 自己開盒子
</script>

<template>
  {{ count }}             <!-- 顯示 0，Vue 幫你開盒子 -->
</template>
```

原因：<mark style="background: #ADCCFFA6;">`<template>` 是 Vue 編譯器處理的</mark>，編譯時它認得出 `count` 是個 ref，就自動把 `count` 編譯成 `count.value`。而 <mark style="background: #ADCCFFA6;">`<script>` 是純 JavaScript</mark>，Vue 沒有機會插手，只能靠你自己寫。

> [!warning] 這是 Vue 被詬病的設計不一致
> 同一個變數在兩個區塊寫法不同，是新手第一名的坑。<mark style="background: #FF5582A6;">在 script 裡漏寫 `.value` 通常不會報執行期錯誤</mark>（除非用 TypeScript），只會安靜地給你錯誤結果，很難查。用 TypeScript 就會直接被紅字擋下，這是 TS 在 Vue 專案裡最實際的價值之一。

## 六、`@click` 跟 React 的 `onClick` 差在哪

| Vue | React | 說明 |
|---|---|---|
| `@click` | `onClick` | `@` 是 `v-on:` 的簡寫 |
| `:title` | `title={}` | `:` 是 `v-bind:` 的簡寫 |
| `@input` | `onChange` | 表單事件名稱也不同 |

<mark style="background: #ADCCFFA6;">功能對應，但本質不同：</mark>

- a. React 的 `onClick={fn}` 傳的是<mark style="background: #BBFABBA6;">真正的 JavaScript 函式值</mark>，它就是一個 prop。
- b. Vue 的 `@click="count++"` 引號裡是<mark style="background: #BBFABBA6;">模板表達式字串</mark>，由 Vue 編譯器解析後轉成程式碼。

所以 Vue 可以直接寫 `@click="count++"`，React 不行——React 必須寫 `onClick={() => setCount(c => c + 1)}`，因為它需要一個函式值而不是一段敘述。

> [!info] 這就是「模板 DSL」與「Everything is JavaScript」的具體證據
> [[00-前端框架比較-Vue-React-Angular難易度與優缺點]] 的 (m) 提醒過「Vue 的模板讓組件化沒 React 好用」這種說法太強。這裡是比較公允的版本：<mark style="background: #FFF3A3A6;">模板 DSL 讓簡單情境更短（`count++` 對上 `() => setCount(c => c + 1)`），代價是你學到的是 Vue 的語法而不是 JavaScript 的語法。</mark>兩邊各有得失，這是取捨不是優劣。

## 自我測驗

> [!question] 填空題
> 1. 「響應式」是 ||效果||，`Proxy` 是 ||工具（手段）||，`reactive()` 是 ||Vue 做出來的 API（產品）||。
> 2. getter／setter 是 ||ES5||（西元 ||2009|| 年）就加進 JavaScript 的語言特性，正式名稱叫 ||存取器屬性（Accessor Property）||。
> 3. `ref()` 底層用的是 ||getter／setter||，`reactive()` 底層用的是 ||Proxy||。
> 4. `ref()` 一定要寫 `.value`，是因為 getter／setter 只能攔截 ||具名屬性||，所以必須真的存在一個叫 ||value|| 的屬性。
> 5. `Ref<number>` 讀作 ||裝著數字的 ref 盒子||，它不等於 ||number||。
> 6. Vue 模板會自動 ||解包（unwrap）|| ref，因為 `<template>` 是由 ||Vue 編譯器|| 處理的，而 `<script>` 是 ||純 JavaScript||。

> [!question] 是非題
> 1. Proxy 是 Vue 發明的。 → ||✘ 錯。Proxy 是 ES6（2015）加進 JavaScript 的內建物件，寫在 ECMAScript 規範裡，MDN 有文件。Vue 只是使用者。||
> 2. getter／setter 屬於 Vue 的特有語法。 → ||✘ 錯。ES5 就有，三種原生寫法：物件字面量的 get／set、Object.defineProperty、class 的 get／set。||
> 3. Vue 的響應式一定要靠 Proxy 才能做到。 → ||✘ 錯。Vue 2 用 Object.defineProperty 一樣做出響應式。響應式是效果，Proxy 只是其中一種手段。||
> 4. `ref({ name: 'Abby' })` 裡面完全沒有用到 Proxy。 → ||✘ 錯。傳物件進 ref 時，內部會呼叫 reactive() 把物件包成 Proxy，所以是 getter／setter 與 Proxy 兩種機制疊在一起。||
> 5. `reactive(0)` 可以正常運作。 → ||✘ 錯。Proxy 的 target 必須是物件，攔不到 primitive，純值要用 ref()。||

> [!question] 申論題
> 面試官問：「Vue 3 的響應式是怎麼做的？」請答得比「用 Proxy」更完整。
> → ||要分兩條路講，因為 Vue 3 其實有兩套實作。reactive() 用的是 ES6 的 Proxy，在 get trap 做依賴收集、在 set trap 觸發更新，好處是攔的是整個物件，新增屬性、刪除屬性、陣列索引賦值都攔得到，這正是 Vue 2 用 Object.defineProperty 做不到而需要 Vue.set() 的原因。||
> ||但 ref() 不是用 Proxy，官方文件明講「仍將 getter / setter 用於 ref」。原因是 Proxy 的 target 必須是物件，攔不到 primitive，所以 Vue 把純值裝進一個 RefImpl 實例，用 class 的 get value() 與 set value() 去攔，這就是為什麼一定要寫 .value——getter／setter 只能攔具名屬性，那個屬性必須真的存在。||
> ||補充一個細節：如果傳給 ref() 的是物件，內部會再呼叫 reactive() 包一層，所以那種情況下兩種機制是疊在一起的。||

## 資料來源（含查證時間）

| 主題 | 連結 | 查證時間 |
|---|---|---|
| Vue 官方：深入響應式系統（明確寫出「使用 Proxy 創建響應式對象，仍將 getter／setter 用於 ref」） | https://cn.vuejs.org/guide/extras/reactivity-in-depth.html | 2026-08-18 |
| Vue 官方 API：`reactive()` | https://cn.vuejs.org/api/reactivity-core.html#reactive | 2026-08-18 |
| Vue 官方 API：`ref()` | https://cn.vuejs.org/api/reactivity-core.html#ref | 2026-08-18 |
| MDN：`Proxy` 物件（ES6） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy | 2026-08-18 |
| MDN：物件的 getter 語法（ES5 存取器屬性） | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get | 2026-08-18 |

> [!warning] ⚠️ 存疑與待補
> - a. 本篇的 `RefImpl` 與 `reactive()` 程式碼是<mark style="background: #FF5582A6;">教學用的極簡骨架，不是 Vue 原始碼</mark>。真實實作還包含 `__v_isRef` 標記、`shallowRef`、`customRef`、依賴清理等機制。要引用實作細節請以 `vuejs/core` 的 `packages/reactivity` 為準。
> - b. 本專案目前跑的是 <mark style="background: #FFF3A3A6;">Vue 3.6 RC（Vapor Mode）</mark>，Vapor Mode 下的響應式核心相同，但渲染層不再產生 Virtual DOM。本篇只談響應式，不涉及渲染差異。
