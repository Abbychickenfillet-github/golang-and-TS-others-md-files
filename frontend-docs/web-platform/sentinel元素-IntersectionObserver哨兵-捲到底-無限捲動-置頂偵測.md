---
title: sentinel 元素：用一個看不見的小方塊代替 scroll 事件
type: topic-note
source: Claude
tags:
  - sentinel
  - IntersectionObserver
  - infinite-scroll
  - scroll-to-agree
  - sticky
related:
  - "[[捲到底才能同意-條款框-React做法]]"
  - "[[03-useEffect將元件同步到外部系統-Web-API與DOM]]"
updated: 2026-11-07
---

查證日 2026-11-07。MDN、Wikipedia 內容是用網頁擷取工具摘要，引用前建議再開原頁核對。**下面的程式碼是我寫的範例，沒有在瀏覽器實際跑過。**

## 一、sentinel 是什麼

| 項目 | 說明 |
|---|---|
| 字面意思 | sentinel = 哨兵 |
| 程式裡的原意 | Wikipedia「Sentinel value」：「a special value in the context of an algorithm which uses its presence as a condition of termination」，用它的出現當作結束條件 |
| 經典例子 | 線性搜尋：把要找的值先放到陣列最後一格，迴圈就不必每圈檢查「到底了沒」。 |
| 前端的用法 | 在容器裡放一個**不顯示內容的小元素**，用 IntersectionObserver 盯著它：它進入可視範圍，就代表「使用者捲到這個位置了」 |
| 在筆記中出現的地方 | [[捲到底才能同意-條款框-React做法]] 的做法 B（容器最後放 1px 的 sentinel） |

「sentinel 元素」不是 HTML 或 DOM 的標準名詞，是工程師對這種用法的稱呼。

## 二、為什麼不直接監聽 scroll

| | 監聽 `scroll` | sentinel + IntersectionObserver |
|---|---|---|
| 執行時機 | 每次捲動都跑 handler | 只在「相交狀態跨過門檻」時跑（MDN：只回報跨過 threshold 的變化） |
| 要自己算 | `scrollTop + clientHeight >= scrollHeight - 1`，要處理小數誤差 | 不用算位置，瀏覽器算相交 |
| 內容很短不用捲 | 要另外在 mount 時檢查 | `observe()` 之後 callback 會先跑一次（MDN：「The first time the observer is initially asked to watch a target element」） |
| 代價 | 少一個元素 | 多一個元素、多一個 effect |

MDN 同頁提醒：callback 跑在主執行緒，要盡量快，耗時工作用 `requestIdleCallback`。

## 三、三種常見用法

### a. 捲到底才解鎖（條款框）

完整程式見 [[捲到底才能同意-條款框-React做法]] 四、做法 B。重點：

```jsx
<div ref={boxRef} style={{ height: 320, overflowY: 'auto' }}>
  {children}
  <div ref={endRef} style={{ height: 1 }} aria-hidden="true" />   {/* sentinel */}
</div>
// IntersectionObserver 的 root 設為 boxRef.current，observe(endRef.current)
```

### b. 無限捲動（接近底部就載入下一頁）

用 `rootMargin` 提早觸發。MDN：`rootMargin` 讓「overflow targets 在變得可見之前就與 root 相交」，用來「在進入視野前就開始載入」。

```jsx
useEffect(() => {
  const io = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting && !loading && hasMore) loadMore() },
    { rootMargin: '0px 0px 400px 0px' }   // 底部多算 400px：離底還有 400px 就觸發
  )
  io.observe(endRef.current)
  return () => io.disconnect()
}, [loading, hasMore])
// <ul>{items}</ul><div ref={endRef} style={{ height: 1 }} />
```

### c. 偵測 sticky 元素有沒有「黏住」（置頂 sentinel）

做法（我的範例）：在 sticky 標題**上方**放一個 sentinel；它離開畫面頂端，就代表標題正黏在頂端，可以加陰影。

```jsx
const [stuck, setStuck] = useState(false)
useEffect(() => {
  const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting))
  io.observe(topRef.current)
  return () => io.disconnect()
}, [])
// <div ref={topRef} style={{ height: 1 }} />
// <header style={{ position: 'sticky', top: 0 }} className={stuck ? 'stuck' : ''}>…</header>
```

## 四、陷阱

| 陷阱 | 說明 |
|---|---|
| sentinel 高度設 0 | MDN：目標與 root「只共用一條邊界線」時，不算轉為相交；面積為 0 的情況會有零相交矩形。所以用 1px，不用 0。這是我從 MDN 這段推論，沒有實測 0px 的結果 |
| `display: none` | 沒有版面就沒有相交；要用 `height: 1px` 加 `aria-hidden`，不要隱藏它 |
| 容器有自己的捲軸，`root` 沒設 | 預設 `root` 是 viewport（MDN），整頁判斷會錯；`root` 要設成捲動容器，且 sentinel 必須是它的後代（MDN） |
| 載入後 sentinel 還在可視範圍 | callback 只在**跨過門檻**時跑，新內容很短、sentinel 仍可見時不會再觸發。推論：要讓它再觸發，需重新 `observe`（先 `unobserve` 再 `observe`），或把 `loading` 放進 effect 依賴重建 observer（上面 b 的寫法）。這是我從 MDN 的「只回報跨過門檻」推出的，沒有實測 |
| 重複觸發 | 用 `loading`、`hasMore` 旗標擋住，避免同一頁請求兩次 |
| 忘了清理 | effect 回傳 `io.disconnect()` |

## 五、什麼時候不用 sentinel

- 要在**捲動過程中**連續知道位置（視差、進度條）：IntersectionObserver 做不到，MDN：它「can't… trigger logic based on the exact number of pixels that overlap」。用 `scroll` 事件或 CSS scroll-driven animation。
- 條件簡單、不想多一個元素：用 `scrollTop` 判斷即可。

## 資料來源

| 內容 | 來源 |
|---|---|
| IntersectionObserver 用途、`root`、`rootMargin`、`threshold`、`isIntersecting`、`observe()` 先跑一次、零面積相交、主執行緒提醒 | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API |
| sentinel value 定義、線性搜尋例子 | https://en.wikipedia.org/wiki/Sentinel_value |
| 專案內的做法 B | [[捲到底才能同意-條款框-React做法]] |

未查證：「sentinel 元素」這個稱呼的出處與是否有更正式的名稱；置頂 sentinel 的做法沒有找到官方文件，是我的整理。
