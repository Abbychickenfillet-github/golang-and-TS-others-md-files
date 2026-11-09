---
title: "useCallback：函式身分與元件掛載卸載"
tags: [react, hooks, useCallback, mount, unmount]
---

# useCallback：要看懂它，得先看懂元件的「掛載」與「卸載」

> 來源情境：2026-10-26，讀 `use-slide-deck.js` 時卡在 `deckRef.current` 一開始是 `null`、`goTo` 為什麼要包 `useCallback`
> 相關：[[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]、[[useState底層-Fiber-Tree-memoizedState與過期閉包]]、[[02-useEffect的setup清理函式-return一個函式而不是執行它]]、[[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]、[[JIT與useMemo-CPU記憶體取捨]]

---

## 一、結論

`useCallback`：**同一個元件實例**、**依賴沒變**時，拿到**同一個函式物件**。

三個限定詞都跟掛載、卸載有關：

| 限定詞 | 意思 | 跟掛載、卸載的關係 |
|---|---|---|
| **同一個元件實例** | 快取住在這個實例身上 | 實例被卸載就整個消失，重新掛載是全新的實例，從頭開始 |
| **依賴沒變** | 用 `Object.is` 逐項比較 | 依賴值本身的壽命也跟實例綁在一起 |
| **同一個函式物件** | 比的是記憶體位置，不是長相 | 沒有快取時，每次渲染都會產生一個長得一樣、但身分不同的新函式 |

- **函式身分的壽命 = 元件實例的壽命**
- 不知道實例何時出生、何時消失，就判斷不出 `useCallback` 何時有效、何時白包

---

## 二、元件的一生（掛載、更新、卸載）

互動圖：[[元件掛載卸載與渲染時間軸-互動版.html]]

`use-slide-deck.js` 所在頁面的一次造訪：

```
a. 第一次渲染（render 階段）
   - 執行元件函式，const deckRef = useRef(null) → { current: null }
   - 執行 useSlideDeck，useCallback 第一次呼叫：記下 [goTo 函式, [deckRef]]
   - 此時畫面上還沒有任何東西

b. 掛載（commit 階段）
   - React 把 <div ref={deckRef}> 真的放進畫面
   - 同時把這個 <div> 放進 deckRef.current（所以現在不是 null 了）
   - 然後才執行 useEffect 的 setup（我們在這裡量高度、綁事件）

c. 更新（之後每次 setActive 觸發重新渲染）
   - 元件函式再執行一次，產生一個「新的」goTo 函式
   - useCallback 比較依賴：[deckRef] 跟上次是不是 Object.is 相等
   - 相等（deckRef 這個盒子整個壽命都是同一個）→ 丟掉新的，回傳上次那一個
   - useEffect 依賴 [deckRef, snapClass] 也沒變 → setup 不會再跑

d. 卸載（使用者離開這個頁面）
   - 先執行 useEffect 的清理函式（解除事件、disconnect observer）
   - React 把 deckRef.current 設回 null
   - 這個實例的所有 hook 資料（含 useCallback 記住的函式）一起被丟掉

e. 再次造訪
   - 是一個「新的實例」，從 a 重新開始
   - goTo 是全新的函式，跟上次造訪的那個沒有任何關係
```

### 為什麼 `deckRef.current` 在 a 階段是 `null`

- `useRef(null)` 是在**渲染時**執行，這時畫面還沒建好，所以盒子是空的。
- 盒子是在 **b 階段**才被填入。
- 所以 `useEffect`（b 之後才執行）裡讀 `deckRef.current` 才安全。
- 在 `goTo` 裡讀它也安全，因為 `goTo` 只會在使用者點圓點時被呼叫，那一定在掛載之後。

---

## 三、useCallback 實際在做什麼

### 官方說法（react.dev）

- 第一次渲染：回傳你傳進去的那個函式。
- 之後的渲染：用 `Object.is` 比較依賴。沒變就回傳**上一次快取**的函式，變了就回傳**這一次傳入**的函式。
- 它**不會呼叫**你的函式，只是決定「要拿哪一個函式物件」。

### 關鍵誤解：它不是「讓函式不要被重新建立」

```jsx
const goTo = useCallback((i) => { ... }, [deckRef])
```

- 這個箭頭函式 `(i) => { ... }` **每次渲染都會被建立**，這是 JavaScript 的行為，跟 React 無關。
- `useCallback` 做的只是：比較依賴，沒變就**丟掉**這次剛建好的，改回傳上次那個。
- 所以它沒有省下「建立函式」的成本，省下的是「**身分變了所造成的後續反應**」。

### 為什麼身分會造成後續反應

函式是物件，`Object.is` 比的是記憶體位置：

```js
(() => {}) === (() => {})   // false：長得一樣，身分不同
```

兩個地方會拿函式身分做比較，這才是 `useCallback` 唯一的用處：

| 比較的人 | 情境 | 身分變了會怎樣 |
|---|---|---|
| `React.memo` 包住的子元件 | 把函式當 prop 傳下去 | 子元件的 prop 比較失敗，白白重新渲染 |
| `useEffect`、`useMemo`、`useCallback` 的依賴陣列 | 函式放進依賴 | effect 被判定「依賴變了」，先清理再重跑一次 |

---

## 四、卸載與重新掛載，怎麼讓 useCallback 失效

### a. 元件被卸載，快取就沒了

React 官方說明：元件從樹中移除時，它的 state 會被銷毀。hook 記住的資料跟 state 住在同一個地方，所以 `useCallback` 的快取也一起消失。

### b. 用 `key` 或條件渲染會造成「看起來沒變、其實重新掛載」

```jsx
<Chat key={to.id} contact={to} />   // to.id 變了 = 卸載舊的、掛載新的
{open && <Panel />}                  // open 從 true 變 false 再變 true = 兩個不同的實例
```

- 官方說明：`key` 是「位置」的一部分，key 一變，React 就視為不同位置的不同元件，state 重置。
- 所以在這種情況下，`Panel` 裡的 `useCallback` **每次重新出現都是從零開始**，不要期待它跨越卸載保留身分。

### c. 在元件裡面定義元件，會每次都卸載重掛

官方警告：在元件裡面再定義元件，每次渲染都會產生新的元件型別，React 視為不同元件，state 被重置。這是 `useCallback` 救不了的，因為整個實例都被換掉了。

### d. 開發模式的 StrictMode 會刻意掛載、卸載、再掛載

- 開發時，React 會刻意讓 effect 做「掛載 → 清理 → 掛載」，用來抓出清理函式漏寫的 bug。
- 所以 `use-slide-deck.js` 的清理函式（`removeEventListener`、`disconnect`、`classList.remove`）如果漏寫，開發時就會看到事件被綁兩次。
- 官方也提到：React 不會無故丟掉快取的函式，但有特定理由時會，例如開發時編輯檔案、或初次掛載時元件 suspend。所以**不能把快取當成語意上的保證**，只能當效能優化。

---

## 五、實例：`use-slide-deck.js` 的 `goTo`

```js
const goTo = useCallback(
  (i) => {
    deckRef.current
      ?.querySelector(`[data-slide="${i}"]`)
      ?.scrollIntoView({ behavior: 'smooth' })
  },
  [deckRef]
)
```

逐行拆解：

a. `(i) => { ... }`：點第 `i` 個圓點時要做的事。`i` 是呼叫時才傳進來的參數，不是外面的變數。
b. `deckRef.current`：讀盒子裡的值。因為是在**點擊當下**才讀，這時一定是掛載之後，所以是真實的 `<div>`。
c. `?.`：保險用，卸載後盒子被設回 `null` 時，不會丟錯誤。
d. `[deckRef]`：依賴只有 `deckRef` 這個**盒子本身**。盒子在整個實例壽命中永遠是同一個物件，所以依賴永遠沒變，`goTo` 的身分整個實例壽命都不會變。

### 實際效益：目前沒有

- `goTo` 被傳給 `<SlideDots onSelect={goTo} />`，但 `SlideDots` **沒有**包 `React.memo`，所以不管 `goTo` 身分變不變，它在父元件重新渲染時都會跟著重新渲染。
- `goTo` 也**沒有**被放進任何 `useEffect` 或 `useMemo` 的依賴陣列。
- 所以這裡的 `useCallback` 是「防禦性寫法」，不是必要。要它有用，要嘛把 `SlideDots` 用 `React.memo` 包起來，要嘛把 `goTo` 放進某個依賴陣列。
- 官方也說，在其他情況下包 `useCallback` 沒有好處（"no benefit in other cases"），並且有些團隊選擇能包就包，並不違規。

### React Compiler

官方說明 React Compiler 會自動記憶化值與函式，減少手動寫 `useCallback` 的需要。這個專案有沒有啟用編譯器我沒有確認，要確認的話看 `next.config.js` 有沒有 `reactCompiler`。

---

## 六、常見誤解整理

| 誤解 | 實際 |
|---|---|
| `useCallback` 讓函式不會被重新建立 | 函式每次渲染都會建立，只是被丟掉，改回傳舊的 |
| 包了 `useCallback` 就一定更快 | 比較依賴也要成本，沒有 `memo` 或依賴陣列接收者就沒有收益 |
| 卸載再掛載後函式身分還在 | 實例是全新的，快取不跨實例 |
| 依賴陣列寫 `[]` 最省事 | 函式裡用到的外部值會停在第一次渲染的版本，變成過期閉包，見 [[useState底層-Fiber-Tree-memoizedState與過期閉包]] |
| `useRef` 的盒子換了會觸發重新渲染 | `.current` 改變不會觸發，見 [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]] |

---

## 七、關聯原因（為什麼這幾篇要連在一起）

- [[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]：講清楚「什麼時候是 render、什麼時候是 commit」，正是 `deckRef.current` 一開始是 `null`、掛載後才有值的原因。
- [[useState底層-Fiber-Tree-memoizedState與過期閉包]]：`useCallback` 記住的 `[函式, 依賴]` 和 state 住在同一個 hook 資料結構，壽命一樣跟著實例。
- [[02-useEffect的setup清理函式-return一個函式而不是執行它]]：卸載時清理函式的執行時機，和 `useCallback` 快取消失是同一個事件。
- [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]：`deckRef` 為什麼是穩定的盒子，所以能當依賴。
- [[JIT與useMemo-CPU記憶體取捨]]：`useMemo` 與 `useCallback` 是同一類取捨，`useCallback(fn, deps)` 等於 `useMemo(() => fn, deps)`。

---

## 八、自我測驗

> [!question]- 1. 元件卸載後又掛載回來，`useCallback` 回傳的函式還是原本那一個嗎？
> 不是。卸載時這個實例的所有 hook 資料都被丟掉，重新掛載是全新的實例，第一次渲染回傳的是剛傳入的新函式。

> [!question]- 2. `useCallback(fn, [])` 裡的 `fn` 會在每次渲染時被建立嗎？
> 會。`fn` 是一般的函式表達式，每次渲染都會建立。`useCallback` 只是在下一步比較依賴，沒變就丟掉這次的、回傳舊的。

> [!question]- 3. 把 `useCallback` 加到一個沒有被 `memo` 包住的子元件的 prop 上，會減少子元件重新渲染嗎？
> 不會。子元件沒有 `memo`，父元件重新渲染時它一定跟著重新渲染，不管 prop 身分變不變。

> [!question]- 4. `<Panel key={id} />` 的 `id` 改變時，Panel 裡的 `useCallback` 會發生什麼事？
> `key` 變了，React 視為不同位置的不同元件：舊的卸載、新的掛載。新的實例沒有任何舊快取，函式是新的。

> [!question]- 5. `goTo` 讀 `deckRef.current` 為什麼不用擔心是 `null`？
> `goTo` 只在使用者點圓點時呼叫，那一定發生在掛載之後，這時 `deckRef.current` 已經是真實的 `<div>`。保留 `?.` 是為了卸載後的保險。

---

## 九、來源

1. React 官方文件，[useCallback](https://react.dev/reference/react/useCallback)：第一次渲染回傳傳入的函式，之後用 `Object.is` 比較依賴，快取可能被丟棄，不要到處加，React Compiler 會自動記憶化。頁面沒有標示最後更新日期，查閱日 2026-10-26。
2. React 官方文件，[Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)：state 綁在樹中的位置，元件被移除時 state 被銷毀，`key` 可重置 state，不要巢狀定義元件。頁面沒有標示最後更新日期，查閱日 2026-10-26。

未查證：`[函式, 依賴]` 與 state 存在同一個 hook 資料結構，來自 React 原始碼 `ReactFiberHooks`（`mountCallback`、`updateCallback`），未重新打開原始碼確認。
