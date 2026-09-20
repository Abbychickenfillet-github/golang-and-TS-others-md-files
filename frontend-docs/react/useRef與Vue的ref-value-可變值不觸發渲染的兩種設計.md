---
title: useRef 與 Vue 的 ref.value｜可變值不觸發渲染的兩種設計
type: topic-note
source: Gemini
tags: [gemini, react, useRef, vue, angular, viewchild, react19, reactivity, 響應式, getter-setter, 鐵人賽]
sources:
  - https://gemini.google.com/app/98af81d8878facae
  - https://gemini.google.com/app/5b6fc934e5d7f253
updated: 2026-09-15
---

# useRef 與 Vue 的 ref.value｜可變值不觸發渲染的兩種設計

> [!info] 本篇重點 a–j，共 10 個
> 這是一場語音對話，語音辨識把不少詞聽錯（「told a cigar rapper」其實是在念 `const count = ref(...)`，「Move it to center」被誤判成韓語），所以逐字稿讀起來很跳。但底下的問題串很清楚：<mark style="background: #FFF3A3A6;">React 的 `useRef` 與 Vue 的 `ref` 名字幾乎一樣，`.current` 與 `.value` 也長得像，但兩者的設計目的正好相反。</mark>
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[proxy-reactivity-demo.js]]</mark> 示範 Vue 響應式底層的 Proxy 攔截，這篇是它在 `ref` 這個 API 上的表層呈現；<mark style="background: #ADCCFFA6;">[[10-傳值vs傳址-賦值與記憶體空間]]</mark> 講「為什麼包一層物件才改得動」，正是 `.current` / `.value` 存在的根本理由。

---

## 重點整理

### 一. React 的 `useRef`

(a) <mark style="background: #ADCCFFA6;">`useRef` 的兩個用途：儲存「不需要觸發重新渲染的可變值」，或直接存取 DOM 元素。</mark>

(b) <mark style="background: #FF5582A6;">澄清一個常見誤解：這裡的「可變值」不限於基本型別（primitive）或字串。</mark>物件、陣列、函式、DOM 元素、計時器 ID，幾乎什麼都可以塞。「可變」講的不是型別，是「你可以隨時改它，而 React 不會因此重畫」。

(c) 改 `ref.current` 不會觸發重新渲染，這就是它跟 `useState` 的分水嶺：

| | `useState` | `useRef` |
| --- | --- | --- |
| 改值的方式 | `setCount(1)` | `ref.current = 1` |
| 會重新渲染嗎 | <mark style="background: #BBFABBA6;">會</mark> | <mark style="background: #FF5582A6;">不會</mark> |
| 值存在哪 | React 內部的 fiber 上 | 同一個永遠不變的物件的 `.current` 屬性上 |
| 適合放 | 要顯示在畫面上的東西 | 計時器 ID、上一次的值、DOM 節點、不想被畫面看見的旗標 |

(d) <mark style="background: #FFF3A3A6;">為什麼一定要 `.current` 這一層？</mark>因為 React 每次渲染都會重跑整個組件函式。如果 `useRef` 直接回傳一個值，那個值一離開這次渲染就沒了。回傳一個<mark style="background: #ADCCFFA6;">身分永遠不變的物件</mark>，你改的是物件裡的屬性（傳址），跨渲染就留得住。這跟 Vue 的理由是同一個。

### 二. 中文輸入法（注音／IME）的實際場景

(e) 對話裡提到「打注音時每打一個字都在變更」。這是 <mark style="background: #ADCCFFA6;">IME composition（組字）</mark>的經典題：使用者打注音時，`onChange` 會一直觸發，但那些中間狀態不是最終文字。

(f) <mark style="background: #BBFABBA6;">正解做法：用 `useRef` 存一個 `isComposing` 旗標，配合 `onCompositionStart` / `onCompositionEnd` 事件。</mark>組字進行中就跳過送出邏輯，組字結束才處理。這個旗標不需要出現在畫面上，所以用 `ref` 而不是 `state`，可以少掉一整輪重新渲染。

### 三. Vue 的 `ref` 與 `.value`

(g) <mark style="background: #ADCCFFA6;">`ref()` 建立的是一個包含 `.value` 屬性的物件。</mark>`.value` 代表 ref 物件內真正儲存的值。

(h) <mark style="background: #FFF3A3A6;">為什麼要包一層：JavaScript 沒辦法攔截「對一個變數重新賦值」這件事。</mark>`count = 5` 這種事引擎不會通知任何人。但「對一個物件的屬性賦值」可以被攔截，所以 Vue 把值裝進物件，用 <mark style="background: #ADCCFFA6;">getter / setter</mark> 包住 `.value`：讀 `.value` 時做依賴收集（track），寫 `.value` 時觸發更新（trigger）。

(i) <mark style="background: #BBFABBA6;">在 template 裡不用寫 `.value`，是因為 Vue 的編譯器看得出 `count` 是個 ref，編譯階段自動幫你補上。</mark>在 `<script setup>` 的 JS 邏輯裡沒有這個魔法，該寫還是要寫。

(j) <mark style="background: #FF5582A6;">最容易混淆的一句話，記起來：</mark>

> React 的 `useRef` 是為了「<mark style="background: #FF5582A6;">避開</mark>響應式」；Vue 的 `ref` 是為了「<mark style="background: #BBFABBA6;">建立</mark>響應式」。名字像，`.current` 與 `.value` 也像，目的完全相反。

### 四. 順帶釐清的 getter / setter

對話中途 Gemini 冒出 getter / setter 的定義（因為語音辨識誤判），但這個概念剛好就是 (h) 的核心，順手記下來：

- <mark style="background: #ADCCFFA6;">Getter</mark>：讀取屬性時被呼叫的函式，讓你在「讀」的瞬間插入邏輯。
- <mark style="background: #ADCCFFA6;">Setter</mark>：寫入屬性時被呼叫的函式，讓你在「寫」的瞬間插入驗證或副作用。
- Vue 2 用 `Object.defineProperty` 做這件事，Vue 3 改用 `Proxy`，差別在 `Proxy` 能攔截新增／刪除屬性與陣列索引，`defineProperty` 不行。

---

## 程式碼範例

同層的 `useref-vs-vue-ref.js` 把兩邊的寫法與行為差異並排寫出來，包含一個手刻的 mini ref 讓你看清楚 getter/setter 在做什麼。

---

## 練習題

React Hooks 沒有直接的 LeetCode 題，但「包一層物件才留得住狀態」這個底層直覺可以用閉包題練：

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 2622 | [Cache With Time Limit](https://leetcode.com/problems/cache-with-time-limit/) | 用閉包存 timer ID，跟 `useRef` 存計時器是同一個心智模型 |
| 2623 | [Memoize](https://leetcode.com/problems/memoize/) | 跨次呼叫留住資料，理解「身分不變的容器」 |
| 2665 | [Counter II](https://leetcode.com/problems/counter-ii/) | 回傳一組操作同一份私有狀態的方法，等於手刻一個 ref |
| 2637 | [Promise Time Limit](https://leetcode.com/problems/promise-time-limit/) | 計時器的建立與清理，對應 `useRef` + `useEffect` cleanup |

---

### 追加 2026-09-15：補上 Angular 這一欄，以及 React 19 之後 useRef 的職責分流

前面兩節把 React 與 Vue 講完了，這一節把 Angular 補進同一張表，並交代 React 19 之後 `useRef` 被哪些新機制分流。

#### (一) 同一件事，三個框架拆法不同

React 的 `useRef` 一個人扛了兩個職責，Vue 與 Angular 則是**把這兩個職責拆開**：

| 框架 | 渲染模型（決定了下面兩欄） | 職責 1：綁定／操作 DOM 元素 | 職責 2：保存跨渲染但不觸發渲染的變數 |
| --- | --- | --- | --- |
| React | 每次 re-render 重新執行整個函式 | `const el = useRef(null)` 搭配 `ref={el}` | `useRef(initialValue)`，回傳固定 heap 指標的 `{ current }` 物件 |
| Vue 3 | `<script setup>` 只執行一次，之後由 Proxy 精準更新 | `const el = useTemplateRef('id')`（3.5+）或同名 `ref(null)` | 普通的 `let count = 0` 就夠，靠閉包存活整個生命週期 |
| Angular | Class 實體化一次，靠 Change Detection／Signals 更新視圖 | `el = viewChild('id')`（v17.2+）或 `@ViewChild('id')` | 普通的 class property `private count = 0`，附著在 `this` 上 |

<mark style="background: #FFF3A3A6;">**關鍵一句話：Vue 與 Angular 不需要「useRef 這種東西來鎖住記憶體指標」，因為它們的程式碼本來就只跑一次。**</mark>

#### (二) 「全函式執行」到底是什麼意思

Abby 問「全函式執行是指函式元件重新執行的時候會重新渲染嗎」——順序其實是**反過來**的：

> 使用者呼叫 setter（如 `setCount`） → React 在對應的 Fiber 節點記下新狀態並向 scheduler 登記「這個元件要重畫」 → scheduler 在下一個 render phase **重新呼叫 `Counter()` 這個函式** → 函式從第一行跑到最後一行，裡面每一個 `let`／`const` 都重新宣告一次 → 回傳新的 JSX。

所以是「**重新渲染 ⇒ 整個函式重新執行**」，不是「函式重新執行 ⇒ 觸發渲染」。

記憶體上的三種寫法對照：

| 寫法 | 記憶體發生什麼事 | 結果 |
| --- | --- | --- |
| 函式內 `let count = 0` | Render 1 在位址 A 建立，Render 2 時 A 被 GC，另在位址 B 重建 | 每次渲染歸零，活不過一次渲染 |
| 函式外 `let globalCount = 0` | 位址固定 | 位址固定但**所有實例共用**，頁面放兩個 `<Counter/>` 會互相污染 |
| `useRef(0)` | Mount 時在該元件的 Fiber 上配置一個 `{ current: 0 }`，之後每次都回傳**同一個位址** | 每個實例各有一份，且跨渲染存活 |

`useRef` 的簡化心智模型（不是真實實作，只是幫助理解）：

```js
function useRef(initialValue) {
  // 掛在「該元件對應的 Fiber 節點」上，所以每個實例各有一份
  const [refObject] = useState({ current: initialValue });
  return refObject;
}
```

改 `ref.current = 10` 是**原地修改物件屬性（mutable modification）**，React 根本不會去比對 ref 的變化，所以完全不會觸發 re-render。

#### (三) React 19 之後，useRef 的四個職責被分流

`useRef` 沒有被廢除，但它過去被濫用的場景各自有了專職工具：

| 以前用 useRef 硬做的事 | React 19+ 的做法 |
| --- | --- |
| 用 `forwardRef` 把 ref 轉接給子元件 | **`forwardRef` 不再需要**，`ref` 已升格為普通 prop：`function MyInput({ ref, ...props })` |
| 用 `useEffect` 搭 `ref.current` 處理 DOM 卸載清理 | **ref callback 可以直接 `return` 一個 cleanup 函式**，元素卸載時自動執行 |
| 暫存舊狀態做樂觀更新 | `useOptimistic` |
| 用 ref 鎖 `isSubmitting` 旗標 | `useActionState`／`useFormStatus` |
| 為了避免每次 render 重算而塞進 ref | **React Compiler** 自動做記憶化，不用再手寫 `useMemo`／`useCallback` |

```jsx
// React 19+：ref 是普通 prop，不用 forwardRef
function MyInput({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// React 19+：ref callback 支援 cleanup
<input ref={(node) => {
  if (node) console.log('DOM 掛載', node);
  return () => console.log('DOM 卸載清理');
}} />
```

<mark style="background: #BBFABBA6;">**結論：現在只有兩件事該用 `useRef`——(1) 存取真實 DOM 節點（`.focus()`、`.scrollTo()`）；(2) 跨渲染持久化非 UI 變數（`timerId`、WebSocket 實體）。**</mark>其餘交給專職 Hook。

> [!warning] ⚠️ 版本提醒
> `useTemplateRef` 需要 **Vue 3.5+**；Angular 的 `viewChild()` Signal 版需要 **v17.2+**；`ref` 當普通 prop 與 ref callback cleanup 需要 **React 19**。在舊版專案請回退到 `ref(null)`／`@ViewChild`／`forwardRef`。

## 各對話來源（原文）

### useRef 的用途與應用（2026-08）— https://gemini.google.com/app/98af81d8878facae

> [!note] 這是語音輸入對話，逐字稿有明顯的語音辨識錯誤，已保留原樣供回溯

**使用者：** 好像 react 的 useRef。

**Gemini：** 沒錯，`useRef` 在 React 裡主要用來儲存不需要觸發重新渲染的可變值，或者直接存取 DOM 元素。你是在考慮把它用在什麼樣的功能嗎？

**使用者：** 對，我記得它是可以用來處理這個中文字符，每打一個的注音就有變更的這個，有狀態變更，或是說可以說是觸發 setState 這個。這個問題嗎？那你說它用來儲存不需要觸發重新渲染的可變值，那這個可變值只是像 primitive value 中的這串嗎？還是什麼意思？不然不可變值是指什麼？物件中不能重新賦值的部分嗎？

**Gemini：** `useRef` 儲存的可變值不限於基本型別或字串，幾乎任何東西都可以，像是物件、陣列、函式，甚至是 DOM 元素。當你將值賦給 `ref.current` 時，你可以隨意修改它，而且不會觸發重新渲染，這就是所謂的不會觸發 `setState` 的狀態改變。

**使用者：**（語音辨識為「told a cigar rapper 算什麼？constant count 等於 referring」，實際應為 `const count = ref(...)`）

**使用者：** 我們說 template 是 Vue 編譯器處理的，他看得出 count 是個 ref，就在編譯時幫我補上 `.value`。為什麼要加 `.value`？`.value` 代表什麼？

**Gemini：** `.value` 代表的是 ref 物件內真正儲存的值。當你用 `ref()` 宣告時，Vue 會建立一個包含 `.value` 屬性的物件，這樣才能同時保有狀態的響應性並支援修改。

**使用者：**（語音辨識為「Move it to center. 翻譯成韓語」，Gemini 誤判為在問 getter/setter）

**Gemini：** Getter 和 setter 是物件導向程式設計中用來存取和修改物件屬性的方法。Getter 讓你讀取數值，而 Setter 讓你安全地更新數值。

---

### React useRef 跨框架實踐比較（2026-09）— https://gemini.google.com/app/5b6fc934e5d7f253

（原文為鐵人賽草稿，重點已整併進上方「追加 2026-09-15」，此處只留對話連結避免重複佔版面。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/98af81d8878facae | 2026-08，本次歸檔 2026-08-25 |
| React 官方 `useRef` | https://react.dev/reference/react/useRef | 查證 2026-08-25 |
| React 官方：Referencing Values with Refs | https://react.dev/learn/referencing-values-with-refs | 查證 2026-08-25 |
| Vue 官方：Reactivity Fundamentals（含 why `.value`） | https://vuejs.org/guide/essentials/reactivity-fundamentals.html | Vue 3，查證 2026-08-25 |
| Vue 官方：Reactivity in Depth | https://vuejs.org/guide/extras/reactivity-in-depth.html | Vue 3，查證 2026-08-25 |
| MDN：`Object.defineProperty` getter / setter | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get | 查證 2026-08-25 |
| Vue `useTemplateRef`（3.5+） | https://vuejs.org/api/composition-api-helpers.html#usetemplateref | Vue 3 官方 API，查證 2026-09-15 |
| Angular `viewChild()` Signal query | https://angular.dev/guide/signals/queries | Angular 官方，查證 2026-09-15 |
| React 19：ref 作為 prop、forwardRef 不再需要 | https://react.dev/blog/2024/12/05/react-19 | React 官方 blog，2024-12-05，查證 2026-09-15 |
| React `ref` callback cleanup | https://react.dev/reference/react-dom/components/common#ref-callback | React 官方，查證 2026-09-15 |
| 本次追加的原始對話（Gemini） | https://gemini.google.com/app/5b6fc934e5d7f253 | 對話擷取 2026-09-15 |

> [!warning] ⚠️ 存疑 / 補充
> Gemini 的回答本身沒有錯，但<mark style="background: #FF5582A6;">完全沒有指出 React `useRef` 與 Vue `ref` 的目的相反</mark>，一路混著講兩邊，很容易讓人以為它們是同一種東西的兩個名字。(j) 那一點是本篇補上的關鍵區分，請以兩邊官方文件為準。
> 另外對話中<mark style="background: #FF5582A6;">語音辨識錯誤很嚴重</mark>，若日後回頭看逐字稿讀不通，是辨識問題不是內容問題。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
