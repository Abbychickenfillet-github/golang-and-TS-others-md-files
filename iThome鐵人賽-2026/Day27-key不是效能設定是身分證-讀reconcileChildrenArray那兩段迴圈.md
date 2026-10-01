# Day 27：`key` 不是效能設定，是身分證 —— 讀 `reconcileChildrenArray` 那兩段迴圈

## 今天要回答的四個問題

1. 資料真的變了以後，React 怎麼決定**哪幾個 DOM 節點該動**？
2. 「列表的 `key` 不要用陣列索引」這句話大家都聽過，但**用了會怎樣**？是變慢，還是出錯？
3. 不寫 `key` 跟寫 `key={index}`，哪個比較糟？
4. Day 23 提到的 Fiber「雙緩衝」，在這一步實際做了什麼？

![[學習React_圖解_key不是效能設定是身分證-reconcileChildrenArray兩段式比對_ISO5807_2026-09-28.png]]

<!--
貼到 iThome 之前要做兩件事：
一、把上面這行 Obsidian wikilink 刪掉。
二、到 iThome 編輯器把同名的 .png 上傳，用它回傳的網址改寫成 ![圖說](那個網址)。
本機相對路徑與 wikilink 在 iThome 上都不會有圖，因為它讀不到你電腦裡的檔案。
-->

---

## 一、承接 Day 26：這兩篇是同一件事的正反面

Day 26 講的是「**同一筆資料回來，怎麼讓 React 別動**」——`replaceEqualDeep` 內容沒變就回傳原本那個物件，讓 `Object.is` 判定相等，React 就有機會跳過。

今天反過來：**資料真的變了，React 要動哪幾個節點。**

兩篇合起來才是完整的一句話：

> React 沒有響應式的攔截層（Day 23），所以它只能靠**比參考**判斷「還是同一個東西嗎」。物件層面的比較交給 `Object.is`（Day 26），而**列表層面的比較交給 `key`**（今天）。

`key` 就是你親手交給 React 的那個「身分證」。今天要講的是：它拿去做什麼、以及你給錯的時候它會怎麼處理。

用的版本是 **React v19.3.0**，檔案是 `packages/react-reconciler/src/ReactChildFiber.js`。跟 Day 24 一樣，下面引用的原始碼都是我實際讀那個 tag 抄下來的。

---

## 二、比對分成兩段，第一段對不上才進第二段

`reconcileChildrenArray` 的骨架是兩個 `for` 迴圈。先講結構，再看程式碼。

- **第一段（快路徑）**：新舊**同位置**逐格比 `key`。一格對不上就 `break`
- **第二段（慢路徑）**：把剩下的舊項目做成一個 `Map`，用 `key` 去撈
- **第三段**：`Map` 裡沒被撈走的，就是真的被刪掉了

第一段的迴圈長這樣（節錄）：

```js
for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
  if (oldFiber.index > newIdx) {
    nextOldFiber = oldFiber;
    oldFiber = null;
  } else {
    nextOldFiber = oldFiber.sibling;
  }
  const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
  if (newFiber === null) {
    // ...
    break;
  }
  // ...
  lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
  // ...
}
```

白話解釋這段：**它一格一格往下走，每格問一次 `updateSlot`。只要有一格回傳 `null`，整個迴圈就 `break`。**

而 `updateSlot` 的第一行註解把它的職責講完了：

```js
function updateSlot(returnFiber, oldFiber, newChild, lanes) {
  // Update the fiber if the keys match, otherwise return null.
  const key = oldFiber !== null ? oldFiber.key : null;
  // ...
      case REACT_ELEMENT_TYPE: {
        if (newChild.key === key) {
          // ...
          return updateElement(returnFiber, oldFiber, newChild, lanes);
        } else {
          return null;
        }
      }
```

**key 對上就重用，對不上就回 `null`。** 沒有模糊空間，也沒有「相似度」這種東西——它是嚴格的相等比較。

### 為什麼要分兩段

實測輸出（我照原始碼手寫了一個最小版，完整程式碼在文末）：

**劇本一：只改內容，順序沒變**

```
    第 0 格：key="a" 對上，重用同一個 DOM 節點
    第 1 格：key="b" 對上，重用同一個 DOM 節點
    第 2 格：key="c" 對上，重用同一個 DOM 節點
    第 3 格：key="d" 對上，重用同一個 DOM 節點
    第 4 格：key="e" 對上，重用同一個 DOM 節點
    統計：{"原地更新":5,"移動":0,"插入":0,"刪除":0,"走到慢路徑":false}
```

**劇本二：把最後一筆搬到最前面**

```
    第 0 格：舊 key="a" 新 key="e" → 對不上，跳出快路徑
    進入慢路徑，把剩下 5 個舊項目做成 Map
    Map 的 key 是：["a","b","c","d","e"]
    第 0 格：用 key="e" 從 Map 撈到，重用 dom#10
    第 1 格：用 key="a" 從 Map 撈到，重用 dom#6
    ...
    統計：{"原地更新":5,"移動":4,"插入":0,"刪除":0,"走到慢路徑":true}
```

分兩段的理由很實際：**第一段是 O(n) 而且不配置任何 `Map`。** 而絕大多數的更新——只改內容、在尾端 append——都能走完第一段。只有順序真的變了，才付建 `Map` 的成本。

注意劇本二：**第 0 格就對不上，於是整個列表都走慢路徑。** 但因為 `key` 是對的，五個 DOM 節點一個都沒重建，只是被標記成移動。

---

## 三、不寫 `key` 不是「沒有 key」，是 `key = index`

這是第三個問題的答案，而且不是我推論的，是 `mapRemainingChildren` 的註解原文：

```js
function mapRemainingChildren(currentFirstChild) {
  // Add the remaining children to a temporary map so that we can find them by
  // keys quickly. Implicit (null) keys get added to this set with their index
  // instead.
  const existingChildren = new Map();

  let existingChild = currentFirstChild;
  while (existingChild !== null) {
    if (existingChild.key === null) {
      existingChildren.set(existingChild.index, existingChild);
    } else {
      existingChildren.set(existingChild.key, existingChild);
    }
    existingChild = existingChild.sibling;
  }
  return existingChildren;
}
```

白話解釋那三行 `if`：**沒給 `key` 的項目，React 拿它的位置（`index`）當 key 存進 `Map`。**

所以：

> `key={index}` 與**完全不寫** `key`，在比對階段的行為是**一樣的**。

差別只有一個——**不寫 `key` 在開發模式會被警告，`key={index}` 不會**。

也就是說：

> **`key={index}` 比不寫 `key` 更危險，因為它把警告關掉了，但沒有解決警告在提醒的那件事。**

這就是第三個問題的答案。很多人以為 `key={index}` 是「至少有給 key 了，比不給好」，實際上它只是讓 ESLint 跟 React 閉嘴。

實測兩種 key 的 `Map` 長相：

```
    index key 版本的 Map key：[0,1,2,3,4]
    id key 版本的 Map key：   ["a","b","c","d","e"]
```

刪掉第一筆之後，新列表的第 0 格要去 `Map` 裡找對應的項目：

- **index 版本**：它找「key 是 `0` 的那個」，撈到的是**原本的第一筆**（已經被刪掉那筆的位置）
- **id 版本**：它找 `"b"`，撈到的就是夏季展本人

---

## 四、那用 `index` 當 key 到底會怎樣：先看數字

第二個問題。我先給一張表，因為它跟大多數人的直覺不一樣。

五筆資料的列表，五種操作 × 兩種 key，實測 DOM 操作數：

| 操作 | key | 原地更新 | 移動 | 插入 | 刪除 | **新建 DOM** | 走慢路徑 |
|---|---|---|---|---|---|---|---|
| 只改一筆的內容 | id | 5 | 0 | 0 | 0 | **0** | 否 |
| 只改一筆的內容 | index | 5 | 0 | 0 | 0 | **0** | 否 |
| 在尾端加一筆 | id | 5 | 0 | 1 | 0 | **1** | 否 |
| 在尾端加一筆 | index | 5 | 0 | 1 | 0 | **1** | 否 |
| 刪掉第一筆 | id | 4 | 0 | 0 | 1 | **0** | 是 |
| 刪掉第一筆 | index | 4 | 0 | 0 | 1 | **0** | 否 |
| 在最前面插一筆 | id | 5 | 0 | 1 | 0 | **1** | 是 |
| 在最前面插一筆 | index | 5 | 0 | 1 | 0 | **1** | 否 |
| 整個反轉 | id | 5 | 4 | 0 | 0 | **0** | 是 |
| 整個反轉 | index | 5 | 0 | 0 | 0 | **0** | 否 |

**這張表有三件事跟直覺不一樣：**

**a. 「刪掉第一筆」在兩種 key 下，新建的 DOM 都是 0。**

index key 並**沒有**「把五個節點全部重建」。它重用了全部節點——問題不是效能，**是它重用到錯的節點上**。

**b. 「在尾端加一筆」用 index key 反而看起來更漂亮**（沒進慢路徑）。

這就是為什麼 index key 在很多專案裡看起來完全沒事：**只要你只做 append，它真的沒事。** 出事的是刪除、插入、排序。所以這個 bug 通常是在產品上線、使用者開始刪東西之後才出現的。

**c. 「整個反轉」用 index key 是 0 次移動，用 id key 是 4 次移動。**

看起來 index key 贏了。但這是因為 **index key 根本沒有在追蹤身分**——它沒有「把節點搬過去」，它只是把每個位置上的文字換掉。對純文字列表這樣沒差，對任何帶狀態的東西就是災難。

所以第二個問題的答案是：**`key={index}` 不會讓你變慢，它會讓你出錯。** 而且是那種「效能面板上看不出來、只有使用者會抱怨」的錯。

---

## 五、那個錯法長什麼樣子：刪掉第一筆，`input` 內容錯位

劇本：五筆展覽，每筆旁邊有一個 `<input>` 讓你填備註（**沒有受 React 控制**，也就是所謂的 uncontrolled input）。使用者在「夏季展」那一行打了「要訂便當」，然後按下「刪除春季展」。

**用 `index` 當 key：**

```
  刪除之前：
    dom#75  春季展    input=「」
    dom#76  夏季展    input=「要訂便當」
    dom#77  秋季展    input=「」
    dom#78  冬季展    input=「」
    dom#79  年度展    input=「」
  刪除春季展之後：
    dom#75  夏季展    input=「」
    dom#76  秋季展    input=「要訂便當」   ← 錯位了
    dom#77  冬季展    input=「」
    dom#78  年度展    input=「」
```

**用 `row.id` 當 key：**

```
  刪除春季展之後：
    dom#81  夏季展    input=「要訂便當」
    dom#82  秋季展    input=「」
    dom#83  冬季展    input=「」
    dom#84  年度展    input=「」
```

注意 index 版本的 `dom#` 編號：**它們一個都沒變**，全部被重用了。只是文字內容往上移了一格，而使用者打的字**沒有跟著移**。

### 錯的那一刻在哪一行

這一段是今天最值得記的機制：

- a. index key 的情況下，新列表第 0 格要找「key `0`」，撈到的是原本第 0 列的 fiber
- b. 那個 fiber 被 `useFiber()` 重用，而 `createWorkInProgress` 裡有這一行：

```js
workInProgress.stateNode = current.stateNode;
```

**DOM 節點被原封不動地沿用了。**

- c. `props` 換成了「夏季展」，但那個 DOM 節點上使用者打的字還在原地
- d. 結果：文字往上移一格，`input` 裡的字留在原處

### 為什麼這件事無法用「小心一點」避免

關鍵在於：**React 只負責它知道的東西（`props`、`state`）。** 而下面這些都不在 React 的帳本上，它們黏在 DOM 節點上：

- 使用者在 uncontrolled `<input>`、`<textarea>`、`<select>` 裡打的字
- `scroll` 位置（包含 `<div>` 內部的捲動）
- `<video>`／`<audio>` 播到第幾秒、有沒有在播
- 進行到一半的 CSS transition 或 animation
- 焦點（`:focus`）在哪個元素上
- 使用者選取的文字範圍

還有一類更容易忽略的：**子元件自己的 `useState`。** fiber 被重用，hooks 的 `memoizedState` 就跟著留下來——所以「展開／收合」的狀態、「編輯中／檢視中」的狀態，都會留在錯的那一行。

所以那句常見的講法——「`key` 是為了效能」——**是錯的**，或者至少講反了重點：

> `key` 是你告訴 React「這一筆資料的身分」。給錯身分證，使用者的東西就會住到別人家。

---

## 六、`placeChild`：移動與留在原地的唯一判準

第一段跟第二段迴圈裡都會呼叫 `placeChild`，它是「這一項要不要標記成移動」的唯一決定點。全文很短：

```js
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;
  if (!shouldTrackSideEffects) {
    newFiber.flags |= Forked;
    return lastPlacedIndex;
  }
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      // This is a move.
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    } else {
      // This item can stay in place.
      return oldIndex;
    }
  } else {
    // This is an insertion.
    newFiber.flags |= Placement | PlacementDEV;
    return lastPlacedIndex;
  }
}
```

白話解釋這段：`lastPlacedIndex` 記著「目前已經安置好的項目之中，最大的舊索引」。如果某一項的舊索引**比它小**，代表這一項必須往前跨過已經放好的東西 → 標記成移動。否則它可以留在原地，並把 `lastPlacedIndex` 推高。

換句話說：**React 找的是一段「舊索引遞增」的子序列留在原地，其他全部移動。** 它不算最佳解（不做最長遞增子序列），只做一次貪心掃描——便宜，但不保證移動次數最少。

實測五筆資料的不同排列（都用 id 當 key）：

| 新順序 | 移動次數 | 留在原地 | 說明 |
|---|---|---|---|
| a b c d e | 0 | 5 | 原樣不動 |
| e a b c d | 4 | 1 | 最後一筆搬到最前 |
| b c d e a | 1 | 4 | 第一筆搬到最後 |
| b a c d e | 1 | 4 | 交換相鄰兩筆 |
| e d c b a | 4 | 1 | 整個反轉 |

**同樣是「換順序」，代價差四倍。**

- 「第一筆搬到最後」只要 1 次移動，因為剩下的 `b c d e` 舊索引是 `1 2 3 4`，本來就遞增
- 「整個反轉」要 4 次移動，因為舊索引 `4 3 2 1 0` 完全反向，找不到遞增的子序列

實務上的意義：**如果你的表格有「排序方向切換」的按鈕，反轉是最貴的那一種操作。** 但要講清楚——貴的是「移動」，不是「重建」。DOM 節點與元件狀態都還在，只是位置被搬動，所以那個 `input` 裡的字會跟著它一起走。

---

## 七、雙緩衝：第四個問題

Day 23 那張表寫「React：單向鏈表 ＋ 雙緩衝」，當時只講了結構，沒講它在更新時做什麼。答案在 `createWorkInProgress` 的註解：

```js
// This is used to create an alternate fiber to do work on.
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;
    // ...
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // ...
    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.flags = NoFlags;
    // ...
  }
  // ...
}
```

白話解釋這段：**任何時刻只需要兩棵樹**——畫面上那棵（`current`），以及正在算的那棵（work-in-progress）。算完就交換身分。兩棵樹上對應的節點用 `alternate` 互相指著，所以下一次更新可以直接撈上次那個來覆寫，不必重新配置。

實測（對同一個五筆列表反覆 render，統計總共造出幾個 fiber 物件）：

```
  render    1 次 → 總共造出   10 個 fiber，每個位置平均 2.00 個
  render    2 次 → 總共造出   10 個 fiber，每個位置平均 2.00 個
  render   10 次 → 總共造出   10 個 fiber，每個位置平均 2.00 個
  render 2000 次 → 總共造出   10 個 fiber，每個位置平均 2.00 個
```

**render 兩千次，每個位置永遠只有 2 個 fiber 物件。**

這件事的意義要講準確：

> 雙緩衝省下來的**不是比對時間**，是**垃圾回收的壓力**。

Day 23 說 React 沒有響應式的攔截層，所以它必須整棵重算。既然要整棵重算，如果每次都產生一整棵新物件，GC 就會被打爆。雙緩衝讓它用兩份物件輪替，代價是記憶體常駐兩份——**這正是 Day 23 那張表裡「push 省在更新、pull 省在啟動」那個取捨的另一個面向。**

順帶一提，`workInProgress.stateNode = current.stateNode` 這一行就在這個函式裡——也就是說，**雙緩衝跟第五節那個 bug 是同一個機制的兩面**。fiber 被重用所以 GC 壓力小，而 fiber 被重用所以 DOM 節點被沿用，而 DOM 節點被沿用所以使用者的字留在原地。

---

## 八、所以實務上該怎麼選 key

按照「可靠度」排序：

- a. **資料庫的主鍵**（`row.id`、`uuid`）。最好的選擇，因為它跟資料的身分是同一件事
- b. **業務上唯一的欄位**（訂單號、email、slug）。可以，但要確定它真的唯一而且不會被編輯
- c. **`JSON.stringify(整筆資料)` 或 hash**。可以但很貴，而且內容一改 key 就變，等於每次編輯都重建一次
- d. **陣列索引**。只有在**列表永遠不會被刪除、插入、排序，而且項目不含任何狀態**時才安全
- e. **`Math.random()` 或 `Date.now()`**。永遠不要。每次 render 都是新 key，等於每次都把整個列表拆掉重建，狀態全部清空

還有三個實務上的細節：

**「新增一筆還沒存到後端，我沒有 id 怎麼辦」** —— 在前端產一個臨時 id（`crypto.randomUUID()`），存進資料本身，等後端回真 id 再換。不要用 index 頂著，也不要在 render 裡呼叫 `randomUUID()`。

**`key` 只在同一組兄弟之間要唯一**，不用全域唯一。不同列表可以有相同的 key。

**`key` 不會被當成 prop 傳進元件。** 如果你在元件裡需要那個 id，要另外傳一次 `id={row.id}`。

---

## 九、面試被問到的話，我會怎麼講

「為什麼 `key` 不能用 index」這題很常出現，而大部分答案停在「會有效能問題」——**那個答案是錯的**。我會這樣講：

1. **`key` 是列表層面的身分比對。** React 沒有響應式攔截層，物件層面靠 `Object.is` 比參考，列表層面就靠 `key`
2. **比對分兩段**：同位置逐格比 `key`，一格對不上就 `break` 進慢路徑，建一個 `Map` 用 `key` 撈
3. **不寫 `key` 不是沒有 key，是 `key = index`**，`mapRemainingChildren` 的註解寫得很明白。所以 `key={index}` 比不寫更危險——它把警告關掉了
4. **index key 的問題不是效能，是正確性。** 刪掉第一筆的時候它新建 0 個 DOM，它重用了全部節點——但重用到錯的資料上
5. **錯在 `workInProgress.stateNode = current.stateNode`。** fiber 被重用，DOM 節點就被沿用，所以 uncontrolled input 的字、scroll 位置、子元件的 `useState` 都留在錯的那一行
6. **同一個機制也是雙緩衝的基礎**：fiber 重用讓 GC 壓力變小，代價就是它會把不該帶的狀態一起帶過去

第 4、5 點是拉開差距的地方。**「會變慢」是背來的答案，「會錯位、而且錯在哪一行」是讀過的答案。**

---

## 完整 demo 原始碼

檔名 `day27-keys-and-reconciliation.js`，**沒有任何依賴**，`node day27-keys-and-reconciliation.js` 直接跑。

它照 React v19.3.0 的 `reconcileChildrenArray`、`updateSlot`、`mapRemainingChildren`、`placeChild`、`createWorkInProgress` 手寫了一個最小版本（函式名稱刻意跟原始碼一致，方便對照），然後用它量測上面所有的表格。我的環境是 Node.js v22.22.2。

```js
/**
 * day27-keys-and-reconciliation.js
 *
 * 資料真的變了以後，React 怎麼決定哪幾個 DOM 節點該動
 * 照 React v19.3.0 的 reconcileChildrenArray 手寫最小版，並量測 index key 與 id key 的差別
 * 搭配 iThome 鐵人賽 2026 Day 27
 *
 * 執行方式：node day27-keys-and-reconciliation.js
 * 環境：Node.js v18 以上。沒有任何依賴
 *
 * 六個 Part
 *   Part A  照原始碼實作 React 的兩段式比對，逐步印出它在想什麼
 *   Part B  不給 key 不是「沒有 key」，是 key = index（原始碼裡寫得很明白）
 *   Part C  五種列表操作 × 兩種 key，DOM 操作數對照表
 *   Part D  重現那個經典 bug：刪掉第一筆，input 內容全部錯位
 *   Part E  placeChild 的移動判準：為什麼反轉列表幾乎全是移動
 *   Part F  雙緩衝：render 幾千次，每個位置永遠只有兩個 fiber 物件
 */

'use strict'

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------

function 分隔線(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

function 小標(title) {
  console.log('\n--- ' + title + ' ---')
}

// ============================================================
// Part 0：最小的 fiber 與 DOM 模型
// ============================================================

let fiber流水號 = 0
let DOM節點流水號 = 0
let 建立DOM次數 = 0

/**
 * 假的 DOM 節點
 * 重點在 value 這個欄位：它模擬「沒有被 React 管的狀態」
 * 例如使用者在 <input> 裡打的字、scroll 位置、video 播到第幾秒
 */
function createDOMNode(標籤) {
  DOM節點流水號 += 1
  建立DOM次數 += 1
  return {
    id: `dom#${DOM節點流水號}`,
    標籤,
    props: null,
    value: '',          // ← 使用者打進去的字。React 不知道它的存在
  }
}

/**
 * 最小的 fiber
 * 只留今天用得到的欄位，名字跟 React 原始碼一致
 */
function createFiber(元素) {
  fiber流水號 += 1
  return {
    序號: fiber流水號,
    key: 元素.key,            // null 代表「沒給 key」
    type: 元素.type,
    pendingProps: 元素.props,
    memoizedProps: null,
    index: 0,
    sibling: null,
    alternate: null,          // ← 雙緩衝：指向另一棵樹上的同一個位置
    stateNode: null,          // ← 真正的 DOM 節點
    flags: '',                // 'Placement' 代表要移動或插入
  }
}

/**
 * 對應 React 的 createWorkInProgress
 * 原始碼註解原文：
 *   We use a double buffering pooling technique because we know that we'll
 *   only ever need at most two versions of a tree.
 */
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate
  if (workInProgress === null) {
    // 第一次：真的造一個新 fiber，然後兩邊互指
    workInProgress = createFiber({ key: current.key, type: current.type, props: pendingProps })
    workInProgress.stateNode = current.stateNode      // ← DOM 節點直接沿用，不重建
    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    // 之後：重用上一次那個，只把欄位覆寫掉
    workInProgress.pendingProps = pendingProps
    workInProgress.type = current.type
    workInProgress.flags = ''
    workInProgress.stateNode = current.stateNode      // ← 同上
  }
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.index = current.index
  workInProgress.sibling = current.sibling
  return workInProgress
}

/** 對應 React 的 useFiber：從舊 fiber 複製出 work-in-progress */
function useFiber(fiber, pendingProps) {
  const clone = createWorkInProgress(fiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

// ============================================================
// Part 0.5：照原始碼實作的最小 reconcileChildrenArray
// ============================================================

/**
 * 對應 React 的 mapRemainingChildren
 *
 * 原始碼註解原文（這句是今天整篇文章的關鍵）：
 *   Add the remaining children to a temporary map so that we can find them by
 *   keys quickly. Implicit (null) keys get added to this set with their index
 *   instead.
 */
function mapRemainingChildren(第一個舊fiber) {
  const existingChildren = new Map()
  let existingChild = 第一個舊fiber
  while (existingChild !== null) {
    if (existingChild.key === null) {
      existingChildren.set(existingChild.index, existingChild)   // ← 沒給 key 就用 index 當 key
    } else {
      existingChildren.set(existingChild.key, existingChild)
    }
    existingChild = existingChild.sibling
  }
  return existingChildren
}

/**
 * 對應 React 的 updateSlot
 * 原始碼註解原文：Update the fiber if the keys match, otherwise return null.
 */
function updateSlot(舊fiber, 新元素, 紀錄) {
  const key = 舊fiber !== null ? 舊fiber.key : null
  if (新元素.key === key) {
    if (舊fiber !== null && 舊fiber.type === 新元素.type) {
      紀錄.原地更新 += 1
      return useFiber(舊fiber, 新元素.props)
    }
    // key 對上但 type 不同 → 不能重用，必須拆掉重建
    紀錄.型別不同要重建 += 1
    return null
  }
  return null                        // ← key 對不上，回 null，第一段迴圈就會 break
}

/**
 * 對應 React 的 placeChild
 * 這是「要不要標記成移動」的唯一判準
 */
function placeChild(newFiber, lastPlacedIndex, newIndex, 紀錄) {
  newFiber.index = newIndex
  const current = newFiber.alternate
  if (current !== null) {
    const oldIndex = current.index
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags = 'Placement'            // 這是一次移動
      紀錄.移動 += 1
      return lastPlacedIndex
    }
    return oldIndex                            // 可以留在原地
  }
  newFiber.flags = 'Placement'                 // 這是一次插入
  紀錄.插入 += 1
  return lastPlacedIndex
}

/**
 * 對應 React 的 reconcileChildrenArray
 * 回傳新的 fiber 串列 ＋ 這一輪的操作統計
 */
function reconcileChildrenArray(第一個舊fiber, 新元素們, { 印步驟 = false } = {}) {
  const 紀錄 = { 原地更新: 0, 移動: 0, 插入: 0, 刪除: 0, 型別不同要重建: 0, 走到慢路徑: false }
  let resultingFirstChild = null
  let previousNewFiber = null
  let oldFiber = 第一個舊fiber
  let nextOldFiber = null
  let newIdx = 0
  let lastPlacedIndex = 0

  // ---------- 第一段：同位置逐格比，一對不上就跳出 ----------
  for (; oldFiber !== null && newIdx < 新元素們.length; newIdx += 1) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber
      oldFiber = null
    } else {
      nextOldFiber = oldFiber.sibling
    }
    const newFiber = updateSlot(oldFiber, 新元素們[newIdx], 紀錄)
    if (newFiber === null) {
      if (印步驟) {
        console.log(`    第 ${newIdx} 格：舊 key=${JSON.stringify(oldFiber && oldFiber.key)}`
          + ` 新 key=${JSON.stringify(新元素們[newIdx].key)} → 對不上，跳出快路徑`)
      }
      if (oldFiber === null) oldFiber = nextOldFiber
      break
    }
    if (印步驟) {
      console.log(`    第 ${newIdx} 格：key=${JSON.stringify(新元素們[newIdx].key)} 對上，重用同一個 DOM 節點`)
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
    if (previousNewFiber === null) resultingFirstChild = newFiber
    else previousNewFiber.sibling = newFiber
    previousNewFiber = newFiber
    oldFiber = nextOldFiber
  }

  // ---------- 新的用完了：剩下的舊的全部刪除 ----------
  if (newIdx === 新元素們.length) {
    while (oldFiber !== null) {
      紀錄.刪除 += 1
      if (印步驟) console.log(`    多出來的舊項目 key=${JSON.stringify(oldFiber.key)} → 刪除`)
      oldFiber = oldFiber.sibling
    }
    return { 第一個: resultingFirstChild, 紀錄 }
  }

  // ---------- 舊的用完了：剩下的新的全部新建 ----------
  if (oldFiber === null) {
    for (; newIdx < 新元素們.length; newIdx += 1) {
      const newFiber = createFiber(新元素們[newIdx])
      newFiber.stateNode = createDOMNode(新元素們[newIdx].type)
      if (印步驟) console.log(`    第 ${newIdx} 格：沒有舊的可用 → 新建 ${newFiber.stateNode.id}`)
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
      if (previousNewFiber === null) resultingFirstChild = newFiber
      else previousNewFiber.sibling = newFiber
      previousNewFiber = newFiber
    }
    return { 第一個: resultingFirstChild, 紀錄 }
  }

  // ---------- 第二段（慢路徑）：把剩下的舊項目做成 Map，用 key 撈 ----------
  紀錄.走到慢路徑 = true
  const existingChildren = mapRemainingChildren(oldFiber)
  if (印步驟) {
    console.log(`    進入慢路徑，把剩下 ${existingChildren.size} 個舊項目做成 Map`)
    console.log(`    Map 的 key 是：${JSON.stringify([...existingChildren.keys()])}`)
  }

  for (; newIdx < 新元素們.length; newIdx += 1) {
    const 新元素 = 新元素們[newIdx]
    const 查詢用key = 新元素.key === null ? newIdx : 新元素.key
    const 撈到的 = existingChildren.get(查詢用key)

    let newFiber
    if (撈到的 !== undefined && 撈到的.type === 新元素.type) {
      existingChildren.delete(查詢用key)
      newFiber = useFiber(撈到的, 新元素.props)
      紀錄.原地更新 += 1
      if (印步驟) console.log(`    第 ${newIdx} 格：用 key=${JSON.stringify(查詢用key)} 從 Map 撈到，重用 ${newFiber.stateNode.id}`)
    } else {
      newFiber = createFiber(新元素)
      newFiber.stateNode = createDOMNode(新元素.type)
      if (印步驟) console.log(`    第 ${newIdx} 格：Map 裡沒有 key=${JSON.stringify(查詢用key)} → 新建 ${newFiber.stateNode.id}`)
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, 紀錄)
    if (previousNewFiber === null) resultingFirstChild = newFiber
    else previousNewFiber.sibling = newFiber
    previousNewFiber = newFiber
  }

  // ---------- 第三段：Map 裡沒被撈走的，就是被刪掉的 ----------
  existingChildren.forEach((child) => {
    紀錄.刪除 += 1
    if (印步驟) console.log(`    Map 裡剩下 key=${JSON.stringify(child.key)} 沒人要 → 刪除 ${child.stateNode.id}`)
  })

  return { 第一個: resultingFirstChild, 紀錄 }
}

// ------------------------------------------------------------
// 建立列表的輔助工具
// ------------------------------------------------------------

/** 把資料列轉成「元素」陣列。用 index 當 key 的版本就是把 key 傳成 null */
function 建元素們(資料列, 用id當key) {
  return 資料列.map((row, i) => ({
    key: 用id當key ? row.id : null,
    type: 'row',
    props: { 名稱: row.名稱 },
  }))
}

/** 第一次掛載：直接造一串 fiber */
function 首次掛載(元素們) {
  let 第一個 = null
  let 前一個 = null
  元素們.forEach((元素, i) => {
    const f = createFiber(元素)
    f.index = i
    f.memoizedProps = 元素.props
    f.stateNode = createDOMNode(元素.type)
    if (前一個 === null) 第一個 = f
    else 前一個.sibling = f
    前一個 = f
  })
  return 第一個
}

const 串成陣列 = (第一個) => {
  const out = []
  let f = 第一個
  while (f !== null) { out.push(f); f = f.sibling }
  return out
}

const 原始資料 = [
  { id: 'a', 名稱: '春季展' },
  { id: 'b', 名稱: '夏季展' },
  { id: 'c', 名稱: '秋季展' },
  { id: 'd', 名稱: '冬季展' },
  { id: 'e', 名稱: '年度展' },
]

// ============================================================
// Part A：兩段式比對，逐步印出
// ============================================================

function partA() {
  分隔線('Part A：React 的比對分兩段，第一段對不上才進第二段')

  console.log('  React 的 reconcileChildrenArray 是兩段式的：')
  console.log('')
  console.log('    第一段（快路徑）：新舊同位置逐格比 key。一格對不上就 break')
  console.log('    第二段（慢路徑）：把剩下的舊項目做成一個 Map，用 key 去撈')
  console.log('    第三段：Map 裡沒被撈走的，就是真的被刪掉了')
  console.log('')
  console.log('  為什麼要分兩段：第一段是 O(n) 而且不配置 Map，絕大多數更新（只改內容、')
  console.log('  在尾端 append）都能走完第一段。只有順序真的變了才付 Map 的成本。')

  小標('劇本一：只改內容，順序沒變（用 id 當 key）')
  const 樹1 = 首次掛載(建元素們(原始資料, true))
  const 改內容 = 原始資料.map((r) => (r.id === 'c' ? { ...r, 名稱: '秋季展（改名）' } : r))
  const r1 = reconcileChildrenArray(樹1, 建元素們(改內容, true), { 印步驟: true })
  console.log(`    統計：${JSON.stringify(r1.紀錄)}`)
  console.log('    → 五格全部對上，完全沒進慢路徑，沒有任何 DOM 被新建或刪除')

  小標('劇本二：把最後一筆搬到最前面（用 id 當 key）')
  const 樹2 = 首次掛載(建元素們(原始資料, true))
  const 搬到最前 = [原始資料[4], ...原始資料.slice(0, 4)]
  const r2 = reconcileChildrenArray(樹2, 建元素們(搬到最前, true), { 印步驟: true })
  console.log(`    統計：${JSON.stringify(r2.紀錄)}`)
  console.log('    → 第 0 格就對不上（舊的是 a，新的是 e），立刻跳進慢路徑')
  console.log('    → 但慢路徑靠 key 全部撈到了，所以一個 DOM 都沒重建，只是標記移動')
}

// ============================================================
// Part B：不給 key 等於 key = index
// ============================================================

function partB() {
  分隔線('Part B：不給 key 不是「沒有 key」，是 key = index')

  console.log('  這句話不是我推論的，是 mapRemainingChildren 的註解原文：')
  console.log('')
  console.log('    // Add the remaining children to a temporary map so that we can find them by')
  console.log('    // keys quickly. Implicit (null) keys get added to this set with their index')
  console.log('    // instead.')
  console.log('')
  console.log('  對應的程式碼就是這三行：')
  console.log('')
  console.log('    if (existingChild.key === null) {')
  console.log('      existingChildren.set(existingChild.index, existingChild)   // ← 用 index')
  console.log('    } else {')
  console.log('      existingChildren.set(existingChild.key, existingChild)')
  console.log('    }')
  console.log('')
  console.log('  白話解釋這段：沒給 key 的項目，React 拿它的位置當 key 存進 Map。')
  console.log('  所以 key={index} 與完全不寫 key，在比對階段的行為是**一樣的**。')
  console.log('  差別只有一個：不寫 key 在開發模式會被警告，key={index} 不會 ——')
  console.log('  **所以 key={index} 比不寫 key 更危險，因為它把警告關掉了。**')

  小標('實測：刪掉第一筆，兩種 key 的 Map 長什麼樣')
  const 用index = 首次掛載(建元素們(原始資料, false))
  const 用id = 首次掛載(建元素們(原始資料, true))
  console.log(`    index key 版本的 Map key：${JSON.stringify([...mapRemainingChildren(用index).keys()])}`)
  console.log(`    id key 版本的 Map key：   ${JSON.stringify([...mapRemainingChildren(用id).keys()])}`)
  console.log('')
  console.log('    刪掉第一筆之後，新列表的第 0 格想找「key 是 0 的那個」——')
  console.log('    在 index 版本裡，key 0 是原本的第一筆（春季展），它撈到了「錯的那個」。')
  console.log('    在 id 版本裡，第 0 格想找 "b"，撈到的就是夏季展本人。')
}

// ============================================================
// Part C：五種操作 × 兩種 key
// ============================================================

function partC() {
  分隔線('Part C：五種列表操作 × 兩種 key，DOM 操作數對照')

  const 操作們 = [
    ['只改一筆的內容', (d) => d.map((r) => (r.id === 'c' ? { ...r, 名稱: '改過了' } : r))],
    ['在尾端加一筆', (d) => [...d, { id: 'f', 名稱: '新展' }]],
    ['刪掉第一筆', (d) => d.slice(1)],
    ['在最前面插一筆', (d) => [{ id: 'z', 名稱: '插隊' }, ...d]],
    ['整個反轉', (d) => [...d].reverse()],
  ]

  console.log('')
  console.log('| 操作 | key | 原地更新 | 移動 | 插入 | 刪除 | 新建 DOM | 走慢路徑 |')
  console.log('|---|---|---|---|---|---|---|---|')

  for (const [名稱, 變換] of 操作們) {
    for (const 用id of [true, false]) {
      const 樹 = 首次掛載(建元素們(原始資料, 用id))
      const 之前 = 建立DOM次數
      const { 紀錄 } = reconcileChildrenArray(樹, 建元素們(變換(原始資料), 用id))
      const 新建 = 建立DOM次數 - 之前
      console.log(
        `| ${名稱} | ${用id ? 'id' : 'index'} | ${紀錄.原地更新} | ${紀錄.移動} | ${紀錄.插入} | ${紀錄.刪除} | ${新建} | ${紀錄.走到慢路徑 ? '是' : '否'} |`,
      )
    }
  }

  console.log('')
  console.log('  這張表有兩個地方跟直覺不一樣，值得停下來看：')
  console.log('')
  console.log('  a. **「刪掉第一筆」在兩種 key 下，新建 DOM 都是 0。**')
  console.log('     index key 並沒有「重建五個節點」，它重用了全部節點——')
  console.log('     問題不是效能，是**它重用到錯的節點上**。這就是 Part D 那個 bug。')
  console.log('')
  console.log('  b. **「在尾端加一筆」用 index key 反而看起來更漂亮**（沒進慢路徑）。')
  console.log('     這就是為什麼 index key 在很多專案裡看起來沒事：')
  console.log('     只要你只做 append，它真的沒事。出事的是刪除、插入、排序。')
}

// ============================================================
// Part D：重現 input 內容錯位
// ============================================================

function partD() {
  分隔線('Part D：重現那個經典 bug —— 刪掉第一筆，input 內容全部錯位')

  console.log('  劇本：五筆展覽，每筆旁邊有一個 <input> 讓你填備註（沒有受 React 控制）。')
  console.log('  使用者在「夏季展」那一行打了「要訂便當」，然後按下「刪除春季展」。')

  function 跑一次(用id) {
    fiber流水號 = 0
    const 樹 = 首次掛載(建元素們(原始資料, 用id))
    const 節點們 = 串成陣列(樹)

    // 使用者在第 1 列（夏季展）的 input 裡打字
    節點們[1].stateNode.value = '要訂便當'

    console.log(`\n  【${用id ? '用 id 當 key' : '用 index 當 key'}】`)
    console.log('  刪除之前：')
    for (const f of 節點們) {
      console.log(`    ${f.stateNode.id}  ${f.memoizedProps.名稱.padEnd(6)} input=「${f.stateNode.value}」`)
    }

    const { 第一個 } = reconcileChildrenArray(樹, 建元素們(原始資料.slice(1), 用id))
    console.log('  刪除春季展之後：')
    let 錯位 = false
    for (const f of 串成陣列(第一個)) {
      const 標記 = f.stateNode.value !== '' && f.pendingProps.名稱 !== '夏季展' ? '   ← 錯位了' : ''
      if (標記) 錯位 = true
      console.log(`    ${f.stateNode.id}  ${f.pendingProps.名稱.padEnd(6)} input=「${f.stateNode.value}」${標記}`)
    }
    return 錯位
  }

  const index版錯位 = 跑一次(false)
  const id版錯位 = 跑一次(true)

  console.log('')
  console.log(`  index key 版本有錯位嗎：${index版錯位 ? '有' : '沒有'}`)
  console.log(`  id key 版本有錯位嗎：   ${id版錯位 ? '有' : '沒有'}`)
  console.log('')
  console.log('  為什麼會這樣，機制講清楚：')
  console.log('')
  console.log('    a. index key 的情況下，新列表第 0 格要找「key 0」，撈到的是原本第 0 列的 fiber')
  console.log('    b. 那個 fiber 被 useFiber 重用，而 createWorkInProgress 裡有一行：')
  console.log('         workInProgress.stateNode = current.stateNode')
  console.log('       **DOM 節點被原封不動地沿用了**')
  console.log('    c. props 換成了「夏季展」，但那個 DOM 節點上使用者打的字還在原地')
  console.log('    d. 結果：文字內容往上移了一格，input 裡的字沒有移')
  console.log('')
  console.log('  關鍵在於：React 只負責它知道的東西（props、state）。')
  console.log('  **使用者打在 DOM 上的字、scroll 位置、video 播放進度、CSS 動畫進行到一半，')
  console.log('  這些都黏在 DOM 節點上，而 key 決定了哪個 DOM 節點被配給哪一筆資料。**')
  console.log('')
  console.log('  所以 key 不是效能設定，是**身分證**。給錯身分證，資料就會住到別人家。')
}

// ============================================================
// Part E：placeChild 的移動判準
// ============================================================

function partE() {
  分隔線('Part E：placeChild 的移動判準 —— 為什麼反轉幾乎全是移動')

  console.log('  placeChild 的原始碼只有一個判斷：')
  console.log('')
  console.log('    const oldIndex = current.index')
  console.log('    if (oldIndex < lastPlacedIndex) {')
  console.log('      newFiber.flags |= Placement          // This is a move.')
  console.log('      return lastPlacedIndex')
  console.log('    } else {')
  console.log('      return oldIndex                      // This item can stay in place.')
  console.log('    }')
  console.log('')
  console.log('  白話解釋這段：lastPlacedIndex 記著「目前已經安置好的項目裡，最大的舊索引」。')
  console.log('  如果某一項的舊索引比它小，代表它必須往前跨過那些項目 → 標記成移動。')
  console.log('  否則它可以留在原地，並把 lastPlacedIndex 推高。')
  console.log('')
  console.log('  換句話說：React 找的是一段**舊索引遞增的子序列**留在原地，其他全部移動。')
  console.log('  它不做最佳解（最長遞增子序列），只做一次貪心掃描 —— 便宜，但不是最少移動。')

  小標('實測：五筆資料，不同排列方式各要移動幾次（都用 id 當 key）')

  const 排列們 = [
    ['原樣不動', ['a', 'b', 'c', 'd', 'e']],
    ['最後一筆搬到最前', ['e', 'a', 'b', 'c', 'd']],
    ['第一筆搬到最後', ['b', 'c', 'd', 'e', 'a']],
    ['交換相鄰兩筆', ['b', 'a', 'c', 'd', 'e']],
    ['整個反轉', ['e', 'd', 'c', 'b', 'a']],
  ]

  console.log('')
  console.log('| 新順序 | 移動次數 | 留在原地 | 說明 |')
  console.log('|---|---|---|---|')
  for (const [名稱, 順序] of 排列們) {
    const 樹 = 首次掛載(建元素們(原始資料, true))
    const 新資料 = 順序.map((id) => 原始資料.find((r) => r.id === id))
    const { 紀錄 } = reconcileChildrenArray(樹, 建元素們(新資料, true))
    console.log(`| ${順序.join(' ')} | ${紀錄.移動} | ${5 - 紀錄.移動} | ${名稱} |`)
  }

  console.log('')
  console.log('  讀這張表要看的是「同樣是換順序，代價差很多」：')
  console.log('')
  console.log('    a. 「第一筆搬到最後」只要 1 次移動，因為 b c d e 的舊索引 1 2 3 4 本來就遞增')
  console.log('    b. 「整個反轉」要 4 次移動，因為舊索引 4 3 2 1 0 完全反向，找不到遞增的子序列')
  console.log('')
  console.log('  實務上的意義：**如果你的列表有「排序方向切換」的功能，反轉是最貴的那一種。**')
  console.log('  但貴的是移動，不是重建 —— DOM 節點與元件狀態都還在，只是位置被搬動。')
}

// ============================================================
// Part F：雙緩衝
// ============================================================

function partF() {
  分隔線('Part F：雙緩衝 —— render 幾千次，每個位置永遠只有兩個 fiber')

  console.log('  createWorkInProgress 的原始碼註解原文：')
  console.log('')
  console.log('    // We use a double buffering pooling technique because we know that we\'ll')
  console.log('    // only ever need at most two versions of a tree. We pool the "other" unused')
  console.log('    // node that we\'re free to reuse. This is lazily created to avoid allocating')
  console.log('    // extra objects for things that are never updated.')
  console.log('')
  console.log('  白話解釋這段：任何時刻只需要兩棵樹 —— 畫面上那棵（current），')
  console.log('  以及正在算的那棵（work-in-progress）。算完就交換身分，不用丟掉重造。')
  console.log('  兩棵樹上對應的節點用 alternate 互相指著。')

  小標('實測：對同一個列表 render 2000 次，總共造出幾個 fiber 物件')

  for (const 次數 of [1, 2, 10, 2000]) {
    fiber流水號 = 0
    const 元素們 = 建元素們(原始資料, true)
    let 樹 = 首次掛載(元素們)
    for (let i = 0; i < 次數; i += 1) {
      const 改過的 = 原始資料.map((r) => ({ ...r, 名稱: `${r.名稱}#${i}` }))
      const { 第一個 } = reconcileChildrenArray(樹, 建元素們(改過的, true))
      // 交換身分：算完的那棵變成畫面上那棵
      串成陣列(第一個).forEach((f, idx) => { f.index = idx; f.memoizedProps = f.pendingProps })
      樹 = 第一個
    }
    const 每個位置平均 = (fiber流水號 / 原始資料.length).toFixed(2)
    console.log(`  render ${String(次數).padStart(4)} 次 → 總共造出 ${String(fiber流水號).padStart(4)} 個 fiber，`
      + `每個位置平均 ${每個位置平均} 個`)
  }

  console.log('')
  console.log('  不管 render 一次還是兩千次，每個位置永遠只有 2 個 fiber 物件。')
  console.log('  第一次 render 造 1 個，第二次造出它的 alternate，之後就一直在這兩個之間輪替。')
  console.log('')
  console.log('  這也解釋了 Day 23 那張表為什麼寫「React：單向鏈表 ＋ 雙緩衝」：')
  console.log('  React 沒有響應式的攔截層，所以它必須整棵重算；')
  console.log('  既然要整棵重算，就用兩份物件輪替，避免每次 render 都產生一整棵垃圾。')
  console.log('  **省的不是比對時間，是垃圾回收的壓力。**')
}

// ============================================================
// main
// ============================================================

function main() {
  console.log('day27-keys-and-reconciliation.js')
  console.log(`Node ${process.version}｜執行時間 ${new Date().toISOString()}`)
  console.log('照 React v19.3.0 的 reconcileChildrenArray 手寫，無外部依賴')

  partA()
  partB()
  partC()
  partD()
  partE()
  partF()

  分隔線('六句話總結')
  console.log('  1. React 比對列表分兩段：同位置逐格比 key，對不上才建 Map 走慢路徑')
  console.log('  2. 不給 key 不是沒有 key，是 key = index。原始碼註解寫得很明白')
  console.log('  3. 所以 key={index} 跟不寫 key 行為一樣，但它把開發模式的警告關掉了，更危險')
  console.log('  4. index key 的問題不是效能。刪掉第一筆時它新建 0 個 DOM —— 它重用到錯的節點上')
  console.log('  5. 錯的那一刻在 workInProgress.stateNode = current.stateNode：DOM 節點被沿用')
  console.log('  6. key 不是效能設定，是身分證。給錯身分證，使用者打的字就會住到別人家')
}

main()
```

---

## 這篇的每個說法各自從哪來

**一、官方原始碼與文件（可查證的一手來源）**

| 內容 | 出處 |
|---|---|
| `reconcileChildrenArray` 的兩段迴圈、`updateSlot` 的「Update the fiber if the keys match, otherwise return null.」、`mapRemainingChildren` 的「Implicit (null) keys get added to this set with their index instead.」、`placeChild` 全文與「This is a move.」／「This item can stay in place.」／「This is an insertion.」三個註解 | `packages/react-reconciler/src/ReactChildFiber.js`：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactChildFiber.js |
| `createWorkInProgress` 全文、雙緩衝註解「We use a double buffering pooling technique because we know that we'll only ever need at most two versions of a tree.」、以及 `workInProgress.stateNode = current.stateNode` 這一行 | `packages/react-reconciler/src/ReactFiber.js`：https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiber.js |
| 「`key` 只需要在兄弟之間唯一」、「`key` 不會被當成 prop 傳進元件」、「不要用 index 當 key」 | React 官方文件，Rendering Lists：https://react.dev/learn/rendering-lists#rules-of-keys |
| `key` 改變會讓元件狀態被重設（官方把這個當成一種刻意的用法） | React 官方文件：https://react.dev/learn/preserving-and-resetting-state#resetting-state-with-a-key |
| `Object.is` 的比較語意 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is |
| `crypto.randomUUID()` | MDN：https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID |

**二、我實際跑出來的部分**

Part A 到 Part F 的所有輸出，由 `day27-keys-and-reconciliation.js` 實測產生（Node.js v22.22.2，2026-09-28 執行），可以重跑驗證。包含：

- 兩個劇本的逐格比對過程與統計
- 兩種 key 的 `Map` key 長相（`[0,1,2,3,4]` 對 `["a","b","c","d","e"]`）
- 第四節那張「五種操作 × 兩種 key」的完整表格，包含「新建 DOM 都是 0」這個反直覺結果
- 第五節的 `input` 錯位重現，含 `dom#` 編號沒變的證據
- 第六節五種排列的移動次數
- 第七節 render 2000 次仍然只有 2 個 fiber 的結果

**這支 demo 是我照原始碼手寫的最小模型，不是 React 的原始碼。** 函式名稱刻意取成一樣（`updateSlot`、`mapRemainingChildren`、`placeChild`、`createWorkInProgress`、`useFiber`）方便對照，但真實的 reconciler 還牽涉 lanes 優先級、Suspense、Fragment、Portal、`REACT_OPTIMISTIC_KEY`、以及一整套 `flags` 與 commit 階段，複雜得多。

**三、我自己的整理與判斷（沒有外部出處）**

- 「`key` 不是效能設定，是身分證」這個講法
- **「`key={index}` 比不寫 `key` 更危險，因為它把警告關掉了」** —— 這是我的推論。前提（兩者比對行為相同、不寫 key 會被警告）是可查證的，但「所以更危險」這個價值判斷是我的
- 第四節那張表的三個觀察，特別是「index key 新建 0 個 DOM，所以問題不是效能」這個結論
- 「只做 append 的話 index key 真的沒事，所以這個 bug 通常上線後才出現」這個現象描述
- 「整個反轉用 index key 是 0 次移動，因為它根本沒在追蹤身分」這個解讀
- 第五節那份「黏在 DOM 節點上的東西」清單（focus、文字選取範圍、CSS 動畫進度等）是我自己列的
- 「雙緩衝省的不是比對時間，是 GC 壓力」這個結論
- 「雙緩衝跟錯位 bug 是同一個機制的兩面」這個連結
- 第八節 a 到 e 的 key 選擇排序，以及三個實務細節的取捨
- 第九節的面試回答順序

**四、我沒有驗證的部分**

- **`reconcileChildrenArray` 我讀的是節錄，不是全文。** WebFetch 在我要求完整貼出四個函式時以長度為由拒絕了，所以 `updateElement`、`updateFromMap`、`useFiber` 這三個我**只讀到了它們被呼叫的地方與名字**，沒有讀到內文。我在 demo 裡對它們的實作是**照名字與上下文推測的**，可能與真實實作有落差
- **`v19.3.0` 這個 tag 的 `ReactFiber.js` 我讀到的版本含有 `enableOptimisticKey` 這個 flag。** 那是一個還在開發中的功能（樂觀 key），我在文章裡**刻意省略了它**，因為它會讓主線變複雜。如果那個 flag 在你的版本是開啟的，`mapRemainingChildren` 的行為會多一條負索引的分支
- **「子元件自己的 `useState` 會留在錯的那一行」** 這個說法，我是從「fiber 被重用、`memoizedState` 掛在 fiber 上」推論的，**我沒有在真實 React 裡跑出來**。機制上應該成立，但請以你自己的測試為準
- **`focus`、文字選取範圍、CSS 動畫進度會錯位** 這幾項我沒有實測，是從「它們都存在 DOM 節點或瀏覽器狀態上」推論的
- **第八節說「`JSON.stringify(整筆資料)` 當 key 很貴」**，我沒有量過到底多貴
- **React 為什麼選貪心掃描而不是最長遞增子序列**（Vue 3 就用了 LIS），我沒有找到 React 團隊的說法。合理推測是「LIS 的 O(n log n) 加上額外配置不值得」，但這是推測。**Vue 用 LIS 這件事我也只是知道，沒有讀它的原始碼**

**五、幾個要講清楚的量測限制**

- **第四節那張表的數字是我的最小模型算出來的，不是真實 React 的 DevTools 數據。** 它要證明的是**演算法層面的行為**（誰被重用、誰被新建、誰被標記移動），不是真實環境的效能數字。真實的 React 還有 commit 階段的批次、`insertBefore` 的實際 DOM 成本
- **「新建 DOM 都是 0」這個結果成立的前提是元素 `type` 沒變。** 如果你的列表裡混了不同 `type`（有時 `<div>` 有時 `<li>`），`updateSlot` 會因為 type 不同而回 `null`，結果會不一樣。我的 demo 有處理這條分支但沒有列進表格
- **第七節的 fiber 計數只算列表項目，沒有算父節點與 root。** 真實的樹還有其他層，總數會更多，但「每個位置兩個」這個結論不變
- 第五節那個 `<input>` 是我用一個 `value` 欄位模擬的，**不是真的 DOM**。真實瀏覽器裡 uncontrolled input 的值存在 DOM 屬性上，行為一致，但我沒有在瀏覽器裡跑一次驗證

（查閱日期：2026-09-28。原始碼版本 React v19.3.0。程式碼實測於 Node.js v22.22.2）

---

## 相關筆記與關聯原因

- **Day 26｜快取回來後要不要重繪**：**關聯原因**：這兩篇是同一件事的正反面。Day 26 是「資料沒變，怎麼讓 React 別動」（`replaceEqualDeep` 保住參考），今天是「資料變了，React 該動哪幾個」（`key` 決定身分）。兩篇都收在同一個前提上——React 只能比參考
- **Day 24｜setState 只有 12 行**：**關聯原因**：方法完全一樣——先讀原始碼那幾行，再手寫一個最小版去驗證它真的是那樣。而且兩篇都出現同一個模式：**官方在註解裡老實寫了理由**（Day 24 是「Avoid an extra prototype jump」，今天是「double buffering pooling technique」）
- **Day 23｜攔截、收集、觸發**：**關聯原因**：Day 23 說 React 三個零件一個都不做，所以必須整棵重算。今天的兩段式比對與雙緩衝，就是「整棵重算」這個決定被迫發展出來的配套。那張表裡「React：單向鏈表 ＋ 雙緩衝」這一格，今天補上了它在更新時做什麼
- **Day 21｜樂觀更新**：**關聯原因**：Day 21 的回滾要把刪掉的項目「插回原本的位置」，當時我寫「這是 b 的一個具體版本」但沒解釋為什麼。今天的答案是：**因為 `key` 決定了哪個 DOM 節點配給哪一筆資料，插回錯的位置就等於把使用者的輸入搬到別人身上**
- **`frontend-docs/react/useState底層-Fiber-Tree-memoizedState與過期閉包.md`**：**關聯原因**：那篇講 `memoizedState` 掛在 fiber 上。今天講 fiber 什麼時候被重用、什麼時候被丟掉——合起來就是「子元件的 state 什麼時候會被保留、什麼時候會被清空」

---

## 明天

今天講的是「同一層的兄弟之間，React 怎麼配對」。

明天 Day 28 往上一層：**當元素的 `type` 變了會發生什麼**——為什麼把 `<div>` 換成 `<section>` 會讓整棵子樹的狀態全部清空，以及第四節那張表裡我刻意沒列進去的那條分支（`updateSlot` 因為 type 不同回傳 `null`）實際上會觸發什麼。順便講官方文件那個「用 `key` 主動重設狀態」的技巧，其實就是今天這套機制的反向利用。
