---
title: "useSlideDeck 逐題解析：ref、closest、forEach、scroll-snap"
tags: [react, hooks, dom, css, scroll-snap]
---

# useSlideDeck 逐題解析

> 檔案：`next-one-main/hooks/use-slide-deck.js`
> 相關：[[useCallback-函式身分與元件掛載卸載]]、[[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]、[[React兩階段渲染-Render與Commit-Mount-Update-Unmount生命週期]]、[[02-陣列遍歷-forEach與callback]]、[[CSS自訂屬性-custom-properties-var與雙連字號變數]]

---

## 一、forEach 在這個功能做什麼

- `slides.forEach((s) => io.observe(s))`
  - `slides` 是 DOM 元素組成的陣列
  - **forEach 沒有改陣列**，只對每個元素執行一次動作（註冊觀察）
  - 原因：`io.observe()` 一次只收**一個**元素，沒有批次版本，要逐一呼叫
- `entries.forEach((e) => { ... setActive(...) })`
  - `entries` 是 IntersectionObserver 一次回報的**一批**變動
  - 逐筆檢查哪張進入畫面
- `slides.forEach((s, i) => { ... })`（`currentIndex` 裡）
  - 逐張算距離，記下最近的那張的索引

| | `forEach` | `map` |
|---|---|---|
| 回傳 | `undefined` | 新陣列 |
| 用途 | 做**副作用**（註冊、記錄、改外部變數） | 轉換資料 |
| 能中途停止 | 不能（除非丟例外） | 不能 |
| 要提早結束 | 改用 `for...of`、`some`、`every`、`find` | 同左 |

- 這個功能的 forEach 都是「對每個元素做一件事」，不需要回傳值，所以不用 `map`

---

## 二、`scrollSnapType` 是原生 CSS 屬性

- 是。CSS 屬性 `scroll-snap-type`，JS 讀寫時寫成**駝峰** `scrollSnapType`
- 驗證：`getComputedStyle(document.querySelector('main')).scrollSnapType`，在首頁回傳 `y mandatory`（實測）
- 分工（兩半缺一不可）：

| 設在哪 | 屬性 | 專案裡 |
|---|---|---|
| **捲動容器** | `scroll-snap-type: y mandatory` | `.snapMain`，由 hook 加到 `main` |
| **容器的子元素** | `scroll-snap-align: start` | `.slide`，寫在 scss |

- `mandatory`：不在吸附點時，捲動結束後**一定**吸附
- `proximity`：**可能**吸附，由瀏覽器決定；只寫軸向不寫強度時預設就是它
- 設在不捲動的元素上無效：`deck` 不捲，真正捲的是 `main`
- 狀態：Baseline Widely available，2022 年 4 月起各大瀏覽器可用

---

## 三、`snapClass` 不是 MDN 的東西

| 名稱 | 來源 |
|---|---|
| `scroll-snap-type`、`classList.add`、`closest` | **標準**，MDN 有文件 |
| `snapClass`（參數名） | **自己取的變數名**，沒有任何標準 |
| `snapMain`（class 名） | **自己取的 class 名**，CSS Modules 編譯後變成 `intro-module-scss-module__xxx__snapMain` |

- 流轉：頁面 `styles.snapMain` → 傳給 hook 當 `snapClass` → `main.classList.add(snapClass)` → `main` 套用 `scroll-snap-type`
- hook 不寫死 class 名，由呼叫端傳入，所以 `/about` 與首頁各用各自 scss 的 `snapMain`
- `classList` 是 `DOMTokenList`，是 `className` 字串的方便版，`add`、`remove` 不用自己切字串

---

## 四、deck 不是「附加到」main，是本來就在 main 裡

- `deck` **不是元件**，是頁面元件最外層的那個 `<div>`（DOM 元素）
- 結構來自 `layout.js`：`<main>{children}</main>`，`children` 就是頁面，所以頁面的根 `<div>` 天生是 `main` 的後代

```
<main>                       ← layout.js 渲染
  <div class="introPage">    ← 頁面元件的根，就是 deck
    <section data-slide="0">
```

- 程式沒有「附加」動作，是 React 掛載時自然產生這個父子關係
- `deck.closest('main')`：從 `deck` 自己開始**往祖先找**，回傳第一個符合 `main` 的元素，找不到回傳 `null`
- 所以 hook 是「從 deck 往上找到 main」，不是「把 deck 接到 main」

---

## 五、`deckRef.current` 的用途

- 是 hook 拿到**真實 `<div>`** 的唯一入口，後面所有 DOM 操作都從它出發：

| 用途 | 程式 |
|---|---|
| 找到 main | `deck.closest('main')` |
| 寫 CSS 變數 | `deck.style.setProperty('--deck-h', ...)` |
| 找所有投影片 | `deck.querySelectorAll('[data-slide]')` |
| 點圓點捲動 | `goTo` 裡的 `deckRef.current?.querySelector(...)` |

- 為什麼用 ref 而不是 `document.querySelector`
  - 只限定在**這個頁面元件**的範圍內找，不會抓到別處同名元素
- 時間：第一次渲染 `current` 是 `null`，commit 之後才是 `<div>`，所以讀它的程式放在 `useEffect` 與點擊事件裡
- `current` 改變**不會**觸發重新渲染

---

## 六、來源（查閱日 2026-10-29，日期為頁面標示的最後修改）

1. MDN，[scroll-snap-type](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type)，2026-07-26
2. MDN，[Element.closest()](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)，2026-05-27
3. MDN，[IntersectionObserver.observe()](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/observe)，2026-06-16
4. MDN，[Array.prototype.forEach()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)，2026-10-26
5. MDN，[Element.classList](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList)，2025-11-25

未查證：`snapMain` 編譯後的雜湊名稱格式依 Next.js 版本與設定而定，這裡的範例名稱來自實測的開發模式輸出。
