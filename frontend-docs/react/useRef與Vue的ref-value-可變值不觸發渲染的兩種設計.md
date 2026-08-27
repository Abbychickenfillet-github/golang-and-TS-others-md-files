---
title: useRef 與 Vue 的 ref.value｜可變值不觸發渲染的兩種設計
type: topic-note
source: Gemini
tags: [gemini, react, useRef, vue, reactivity, 響應式, getter-setter]
sources:
  - https://gemini.google.com/app/98af81d8878facae
updated: 2026-08-25
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

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/98af81d8878facae | 2026-08，本次歸檔 2026-08-25 |
| React 官方 `useRef` | https://react.dev/reference/react/useRef | 查證 2026-08-25 |
| React 官方：Referencing Values with Refs | https://react.dev/learn/referencing-values-with-refs | 查證 2026-08-25 |
| Vue 官方：Reactivity Fundamentals（含 why `.value`） | https://vuejs.org/guide/essentials/reactivity-fundamentals.html | Vue 3，查證 2026-08-25 |
| Vue 官方：Reactivity in Depth | https://vuejs.org/guide/extras/reactivity-in-depth.html | Vue 3，查證 2026-08-25 |
| MDN：`Object.defineProperty` getter / setter | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 補充
> Gemini 的回答本身沒有錯，但<mark style="background: #FF5582A6;">完全沒有指出 React `useRef` 與 Vue `ref` 的目的相反</mark>，一路混著講兩邊，很容易讓人以為它們是同一種東西的兩個名字。(j) 那一點是本篇補上的關鍵區分，請以兩邊官方文件為準。
> 另外對話中<mark style="background: #FF5582A6;">語音辨識錯誤很嚴重</mark>，若日後回頭看逐字稿讀不通，是辨識問題不是內容問題。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
