---
title: 這些 JS 觀念在 React 裡長成什麼樣 — 索引與對照
tags: [JavaScript, React, 索引, 對照, Object-is, 閉包, truthy-falsy, 不可變性]
created: 2026-09-05
updated: 2026-09-05
charset: utf-8
type: index
note: 這是一篇「地圖」不是新內容。你 vault 裡已經有 6 篇寫得很完整的 React 筆記，這篇的工作是把前三篇的 JS 觀念一條一條接到它們身上，並補上目前沒有任何一篇涵蓋的三個空缺。
---

# 這些 JS 觀念在 React 裡長成什麼樣

---

## 0. 先講結論：你已經寫過的東西比你以為的多

我掃過整個 vault，這條「JS 觀念 → React 行為」的線上，**有四個主題你已經寫得比我這三篇還深**。所以這篇不重寫，只做兩件事：

- a. **對照表**：把前三篇的每個 JS 觀念，接到你既有筆記的**完整檔案路徑**
- b. **補空缺**：只寫三個目前沒有任何一篇涵蓋到的坑

---

## 1. 對照表：JS 觀念 → React 行為 → 已經寫在哪個檔案

| JS 觀念（來自前三篇）                         | 在 React 裡長成什麼                               | 已經寫在哪（完整路徑）                                                                                 | 狀態                                                                                                            |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **物件可變、比較的是參考**                      | `setState(user)` 直接 mutate 不重繪              | `frontend-docs/javascript/JS_Core_and_Runtime/比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對.md` | ✅ **已寫透**，206 行，含 React 兩條路徑與 Vue 的 hasChanged 對照                                                             |
| **`==` / `===` / `Object.is` 的差異**   | React 用 `Object.is` 做 bailout 判斷            | 同上（第三節「React 的兩條路徑」h–l）                                                                     | ✅ **已寫透**，還有配圖 `frontend-docs/javascript/JS_Core_and_Runtime/images/學習JS_圖解_比較三兄弟與React重繪判斷路徑_2026-09-05.svg` |
| **閉包、Environment Record、變數活多久**      | Hook 的 stale closure（過期閉包）                  | `frontend-docs/react/useState底層-Fiber-Tree-memoizedState與過期閉包.md`                           | ✅ **已寫透**，323 行，含 memoizedState 單向鏈表與 key 的真正作用                                                               |
| **`useRef` 取代閉包私有變數**                | `timerRef.current` 跨 render 存活              | `debounce-與-React計時器/debounce為什麼一定要setTimeout-以及React的useRef.md` 第 2 節                      | ✅ 本系列第 2 篇                                                                                                    |
| **getter / setter 與 Proxy**          | 為什麼 React 不像 Vue 自動偵測                       | `iThome鐵人賽-2026/草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md`                              | ✅ **已寫透**，464 行，五星，含 `useRef.current` vs Vue `ref.value` 的對照                                                  |
| **函式的純粹性**                           | render 必須是純函數、StrictMode 跑兩次                | `frontend-docs/react/01-React-純函數與嚴格模式-StrictMode.md`                                       | ✅ 442 行                                                                                                       |
| **JSX 其實是函式呼叫**                      | `createElement` / `jsx-runtime`             | `編譯與打包-學習路徑/05-JSX轉譯機制-createElement與jsx-runtime-Babel與SWC三步驟.md`                           | ✅ 211 行                                                                                                       |
| **effect 的 cleanup 就是 clearTimeout** | Render 與 Commit 兩階段、Unmount 時機              | `frontend-docs/react/React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期.md`                  | ✅ 187 行                                                                                                       |
| **稀疏陣列與 `Array(5)`**                 | `.map()` 產生元件清單、`key` 規則                    | `JS-資料型別/JavaScript資料型別總覽-原始型別與物件.md` 第 8-b 節                                               | ✅ 本系列第 1 篇                                                                                                    |
| **truthy / falsy**                   | ⚠️ **JSX 條件渲染的 `0` 陷阱**                     | ❌ **沒有任何一篇寫過**                                                                              | 👇 補在第 2 節                                                                                                    |
| **哪些值 React 會「渲染出來」**                | ⚠️ `{null}` 不渲染但 `{0}` 會                    | ❌ **沒有任何一篇寫過**                                                                              | 👇 補在第 3 節                                                                                                    |
| **物件不能當 React child**                | ⚠️ `Objects are not valid as a React child` | ❌ **沒有任何一篇寫過**                                                                              | 👇 補在第 4 節                                                                                                    |

---

## 2. 空缺一：JSX 條件渲染的 `0` 陷阱（最常見的 falsy 事故）

這是把「truthy / falsy」直接踩爆的地方，而且**畫面上會冒出一個孤零零的 0**，看起來像 UI 壞掉。

```jsx
// ❌ 購物車是空的時候，畫面上會出現一個「0」
function Cart({ items }) {
  return (
    <div>
      {items.length && <ItemList items={items} />}
    </div>
  );
}
```

**為什麼**：`&&` 運算子**不回傳布林值**，它回傳的是「決定結果的那個運算元」。

- a. `items.length` 是 `0`（falsy）→ `&&` 短路，**回傳 `0` 本身**
- b. JSX 拿到 `0`，而 **React 會把數字渲染出來**
- c. 畫面上就多了一個「0」

```jsx
0 && <ItemList />        // 回傳 0        → 畫面出現 0
"" && <ItemList />       // 回傳 ""       → 空字串，看不見（但仍是被渲染的）
null && <ItemList />     // 回傳 null     → 不渲染，安全
undefined && <ItemList />// 回傳 undefined→ 不渲染，安全
NaN && <ItemList />      // 回傳 NaN      → 畫面出現「NaN」
```

⚠️ 注意 **8 個 falsy 值裡有 3 個會被渲染出來**（`0`、`NaN`、`""`），另外 5 個安全（`false`、`null`、`undefined`、`-0` 會顯示 `0`、`0n` 會顯示 `0`）—— 實際上只有 `false`、`null`、`undefined` 是真正安全的。

### 三種正解

```jsx
// ✅ 方法 1：把條件變成真正的布林（最推薦，意圖最明確）
{items.length > 0 && <ItemList items={items} />}

// ✅ 方法 2：用雙重否定強制轉成布林
{!!items.length && <ItemList items={items} />}

// ✅ 方法 3：用三元運算子（要處理「否則顯示什麼」的時候用這個）
{items.length ? <ItemList items={items} /> : <EmptyState />}
```

⚠️ **不要用 `Boolean(items.length) && ...`** —— 能動，但比 `> 0` 多打好幾個字又沒有比較清楚。

### 相關聯：本系列第 1 篇

`JS-資料型別/JavaScript資料型別總覽-原始型別與物件.md` 第 4 節列了完整的 8 個 falsy 值，第 4-b 節解釋了「`==` 不是用 truthy / falsy 判斷的」。這裡是同一組知識在 JSX 裡的**實際事故現場**。

---

## 3. 空缺二：React 到底會渲染哪些值

這張表沒有任何一篇筆記整理過，但它是理解上面那個陷阱的根本：

| 值 | React 的行為 | 畫面上看到什麼 |
|---|---|---|
| `"abc"` | 渲染 | `abc` |
| `123` | 渲染 | `123` |
| **`0`** | **渲染** | **`0`** ⚠️ |
| **`NaN`** | **渲染** | **`NaN`** ⚠️ |
| `""` | 渲染（但是空的） | 什麼都沒有 |
| `null` | **不渲染** | 什麼都沒有 ✅ |
| `undefined` | **不渲染** | 什麼都沒有 ✅ |
| `true` / `false` | **不渲染** | 什麼都沒有 ✅ |
| `[1, 2, 3]` | 逐項渲染 | `123`（⚠️ 陣列項目要 key） |
| `{ a: 1 }` | **丟錯** | `Error: Objects are not valid as a React child` |
| `Symbol("s")` | **丟錯** | 同上 |
| `10n`（BigInt） | 依版本而異，通常丟錯 | 建議先自己 `String(bigintValue)` |

**記憶口訣**：**只有 `null`、`undefined`、`boolean` 是「安靜的」**，其他原始型別都會現形，物件則直接爆炸。

### 為什麼 `false` 不渲染但 `0` 會

這是 React 刻意的設計取捨：`&&` 短路在**大多數**情況下回傳的是 `false`，如果 `false` 也被渲染成「false」三個字，那全世界的條件渲染都會壞掉。但 `0` 是個合法的、使用者可能真的想顯示的數字（例如「庫存：0」），React 沒有立場替你決定要不要顯示它。

所以 **`0` 的陷阱不是 React 的 bug，是 `&&` 運算子的語意** —— 責任在 JS 那一邊。

---

## 4. 空缺三：`Objects are not valid as a React child`

```jsx
const user = { name: "Abby", age: 20 };
return <div>{user}</div>;
// ❌ Error: Objects are not valid as a React child (found: object with keys {name, age})
```

**為什麼會擋**：React 需要把值變成文字節點，但物件的預設 `toString()` 只會給你 `"[object Object]"` —— 那對使用者完全沒有意義。與其默默印出一坨沒用的字，React 選擇直接丟錯讓你在開發階段就發現。

**最常見的三個觸發情境**：

- a. **忘記取欄位** —— `{user}` 應該是 `{user.name}`
- b. **API 回傳的錯誤物件直接塞進畫面** —— `{error}` 應該是 `{error.message}`
- c. **日期物件** —— `{new Date()}` 會丟錯，要 `{date.toLocaleDateString()}`

⚠️ **`Date` 是最容易漏的那個**，因為它「看起來很像可以直接顯示的東西」。

### 對照：本系列第 3 篇

`JS-資料型別/追問-BigInt取捨-不可變性-與包裝物件.md` 第 5 節講的是「原始型別靠臨時包裝物件才有方法」，而這裡是反過來 —— **物件在需要變成原始值的場合（渲染成文字）反而過不去**。兩邊都是 ToPrimitive 這條線上的事。

---

## 5. 補充：getter / Proxy 算「reactive system」嗎？

**算是它的零件，但不等於它。** 你自己在 `iThome鐵人賽-2026/草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md` 的最後（「c. 響應式 ＝ Proxy 嗎？」那段）已經下過結論：

> 不是。**響應式是「效果」，Proxy 是「手段」。**

這裡把那句話展開成可檢查的定義。

### 一個完整的 reactive system 需要三個零件

- a. **攔截（intercept）** —— 知道「有人讀了 / 有人寫了這個值」
  這一層才是 getter / setter 與 Proxy 負責的部分。
- b. **依賴收集（dependency tracking）** —— 在**讀**的時候記下「是誰在讀我」
  Vue 叫 `track()`，它把「目前正在執行的 effect」記進這個屬性的訂閱清單。
- c. **觸發更新（trigger / scheduler）** —— 在**寫**的時候通知剛才記下的那些人
  Vue 叫 `trigger()`，然後丟進 `queueJob` 排程。

**只有 a 不算 reactive system**，那只是「可以攔截」。三個湊齊才是。

### 各家對照

| 框架 / API | 攔截用什麼 | 有依賴收集嗎 | 有觸發更新嗎 | 算 reactive system 嗎 |
|---|---|---|---|---|
| Vue 2 | `Object.defineProperty`（getter/setter） | ✅ | ✅ | ✅ 是 |
| Vue 3 `reactive()` | **Proxy** | ✅ | ✅ | ✅ 是 |
| Vue 3 `ref()` | **getter / setter**（`RefImpl` 的 `get value`） | ✅ | ✅ | ✅ 是 |
| Solid / Preact Signals / Angular Signals | 函式呼叫（`count()`） | ✅ | ✅ | ✅ 是 |
| Svelte 5 runes | 編譯期改寫 | ✅ | ✅ | ✅ 是 |
| **React `useState`** | **完全沒有攔截** | ❌ | ❌ | ❌ **不是** |

⚠️ 注意第 1 與第 3 列：**同樣是 getter / setter，Vue 2 和 Vue 3 的 `ref()` 都是 reactive system**。所以「用什麼手段攔截」跟「算不算 reactive」是兩回事 —— 差別在有沒有 b 和 c。

### React 為什麼三個零件一個都不做

因為它走的是完全不同的路線：**pull-based（拉）而不是 push-based（推）**。

```text
【push-based：Vue / Solid / Signals】

  你改了 state.count = 1
        │
        ▼
  set trap 被攔截
        │
        ▼
  查訂閱清單：「誰讀過 count ？」→ 找到 [畫面 A, computed B]
        │
        ▼
  只通知這兩個 ── 精準到單一節點，不需要 diff
        │
        ▼
  更新畫面 A 與 computed B


【pull-based：React】

  你呼叫 setCount(1)
        │
        ▼
  React 只知道「有人說變了」，不知道是誰用到它
        │            ← 因為它從來沒攔截過讀取，沒有訂閱清單
        ▼
  把整個元件函式「從頭再跑一次」，產生新的 element 樹
        │
        ▼
  跟上一棵樹做 diff / reconciliation
        │
        ▼
  找出真的不一樣的地方，commit 到 DOM
```

### 這條線串起你既有的三篇

- a. **為什麼 React 需要新物件** —— 因為它沒有攔截，只能在 re-render 時用 `Object.is` 比新舊參考。這就是 `frontend-docs/javascript/JS_Core_and_Runtime/比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對.md` 講的事。
- b. **為什麼陣列不能 `push`** —— 同上，`push` 是原地改，參考沒變，`Object.is` 判定沒變。
- c. **為什麼 `useRef` 改 `.current` 不會重繪** —— 因為 ref 連「有人說變了」這個訊號都不發。
- d. **為什麼 Vue 可以直接改** —— 因為 Proxy 攔截得到，所以有訂閱清單可查。

### ⚠️ 一個容易誤會的新東西：React Compiler

**React Compiler v1.0 已於 2025-10-07 正式發布**（React Conf 2025）。它會自動幫你插入 memoization，效果上很像「React 變聰明了」，但**它不是 reactive system**：

- a. 它在**編譯期**（build time）分析你的程式碼，自動補上等價於 `useMemo` / `useCallback` / `React.memo` 的邏輯
- b. 它**沒有**在執行期攔截任何讀寫，**沒有**訂閱清單
- c. React 依然是 pull-based，只是「重跑」的範圍被編譯器縮小了

所以到 2026 年為止，**React 官方仍然沒有引入 signals，也沒有 runtime 的 reactivity**。這是路線選擇，不是還沒做到。

> 關聯：`frontend-docs/vue/00-ref與reactive-響應式的兩種實作.md` 第三節與第四節把 `ref()`（getter/setter）與 `reactive()`（Proxy）拆得很清楚，配合這一節的三零件定義讀，兩邊會扣起來。

---

## 6. 建議的閱讀順序

如果你要重新把這條線走一次（你說之前失敗過，這是重來的路徑）：

- a. `JS-資料型別/JavaScript資料型別總覽-原始型別與物件.md` —— 型別本身
- b. `JS-資料型別/追問-BigInt取捨-不可變性-與包裝物件.md` —— 為什麼要這樣分（不可變 vs 可變）
- c. `frontend-docs/javascript/JS_Core_and_Runtime/比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對.md` —— 「可變」直接導出 React 為什麼要新物件
- d. `iThome鐵人賽-2026/草稿-useState為什麼沒更新-從getter與Proxy看React的設計選擇.md` —— React 為什麼不學 Vue 自動偵測
- e. `debounce-與-React計時器/debounce為什麼一定要setTimeout-以及React的useRef.md` —— 閉包私有變數怎麼變成 `useRef`（**先建立閉包的心智模型**）
- f. `frontend-docs/react/useState底層-Fiber-Tree-memoizedState與過期閉包.md` —— Fiber、memoizedState 鏈表、stale closure（**這篇同時需要 d 的設計動機與 e 的閉包，所以排最後**）
- g. **這一篇** —— falsy 與渲染規則的收尾

### 為什麼 d（getter 與 Proxy）要排在 f（useState 底層）前面

一句話：**d 回答「為什麼」，f 回答「怎麼做」，先有動機再看實作才不會卡住。**

- a. **d 是設計層**：它回答「React 為什麼**需要**你呼叫 `setState`，不能像 Vue 一樣直接改就好」。答案是 React 刻意不做攔截（見下一節）。
- b. **f 是實作層**：它回答「你呼叫 `setState` 之後，Fiber 上的 `memoizedState` 鏈表發生了什麼」。
- c. **前置知識的門檻差很多**：d 只需要「存取器屬性」這一個前置（你在 `iThome鐵人賽-2026/Day03-靜態方法-實例方法-存取器屬性-讀懂React原始碼的三行寫法.md` 已經寫過）；f 需要 Fiber、單向鏈表、閉包**三個**前置。
- d. 如果先讀 f，你會一路帶著「所以到底為什麼不能直接改 state 就好」這個疑問看完整篇，那個疑問的答案在 d。

⚠️ **修正**：這份順序我第一版把 e、f 寫反了。`useState底層` 那篇的第四節是「過期閉包（Stale Closure）」，它需要閉包的心智模型當前置，所以應該排在 `debounce與useRef` **之後**。已改正。

---

## 7. 延伸練習

- a. [LeetCode 2704. To Be Or Not To Be](https://leetcode.com/problems/to-be-or-not-to-be/) —— 相等判斷
- b. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) —— falsy 清單實戰
- c. [LeetCode 2635. Apply Transform Over Each Element in Array](https://leetcode.com/problems/apply-transform-over-each-element-in-array/) —— 自己實作 map，對應 JSX 清單渲染
- d. [LeetCode 2625. Flatten Deeply Nested Array](https://leetcode.com/problems/flatten-deeply-nested-array/) —— 不可變思維

---

## 8. 參考來源

所有 URL 於 **2026-09-05** 查閱。

- a. React 官方文件 —— [Conditional Rendering（含 `&&` 的 `0` 陷阱官方說明）](https://react.dev/learn/conditional-rendering)
- b. React 官方文件 —— [Rendering Lists](https://react.dev/learn/rendering-lists)
- c. React 官方文件 —— [Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- d. React 官方文件 —— [Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- e. MDN —— [邏輯 AND (&&)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND)（「回傳運算元本身而不是布林」的規範行為）
- f. MDN —— [Glossary: Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)
- g. MDN —— [Object.is()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
- h. MDN —— [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) ｜ [Object.defineProperty()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)（Vue 2 的攔截手段）
- i. Vue 官方文件 —— [Reactivity in Depth（track / trigger 與依賴收集）](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- j. React 官方部落格 —— [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)（**2025-10-07 發布**，確認它是編譯期 memoization 而非 runtime reactivity）
- k. React 官方文件 —— [useRef（改 `.current` 不觸發 re-render）](https://react.dev/reference/react/useRef)
