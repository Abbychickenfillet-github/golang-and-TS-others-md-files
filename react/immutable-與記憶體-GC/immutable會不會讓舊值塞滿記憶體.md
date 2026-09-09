---
title: immutable 會不會讓舊值塞滿記憶體
date: 2026-09-07
tags: [react, javascript, immutable, gc, v8, memory, structural-sharing]
---

# immutable 會不會讓舊值塞滿記憶體

![[學習React_圖解_immutable更新的記憶體實況-結構共享與GC_2026-09-07.svg]]

## 名詞先講清楚

a. **immutable（不可變）**：不修改原本的資料，而是產生一份新的資料
b. **mutable（可變）**：直接就地修改原本的資料，例如 `arr.push(x)`
c. **primitive（原始型別）**：number、string、boolean、null、undefined、symbol、bigint。它們是「值」不是「物件」
d. **reference（參考／指標）**：變數裡存的不是物件本身，而是物件在堆積中的位址。64 位元 V8 上一個指標是 8 bytes
e. **heap（堆積）**：物件實際被配置的那塊記憶體區域
f. **GC（Garbage Collection，垃圾回收）**：自動找出「再也無法被存取到的物件」並釋放
g. **reachable（可達）／unreachable（不可達）**：從根（全域物件、目前的呼叫堆疊、閉包⋯⋯）順著參考走得到就是可達。**GC 的判準是「不可達」，不是「舊」**
h. **structural sharing（結構共享）**：新的資料結構與舊的共用沒變動的部分，只有變動路徑上的節點是新的
i. **Smi（Small Integer，小整數）**：V8 把小整數直接編碼在指標的位元裡，完全不配置堆積記憶體
j. **generational hypothesis（世代假說）**：大多數物件出生後很快就死。V8 依此把堆積分成新生代與老生代
k. **minor GC / Scavenger（清道夫）**：新生代的回收器。它只走訪「活下來的物件」並把它們搬走，**成本跟垃圾量無關**
l. **bail out（提前退出）**：React 發現新舊 state 用 `Object.is` 比較相同時，直接跳過重新渲染

## 一、先修正一個關鍵誤解

你說「`count + 1` 是新增一個新的值」。這句話在**語意層**是對的，但在**記憶體層**不成立。

a. `number` 是 primitive，它是**值**不是物件，不存在「舊物件留在堆積裡」這件事
b. 小整數走 Smi 最佳化，連堆積都不會進去
c. 所以 `setCount(count + 1)` 在記憶體上的成本基本是零

實測（`node --expose-gc immutable-memory-gc.js`，2026-09-07 於本機 node v22.23.2）：

```
A. 一千萬次 count = count + 1
   heap 變化： 0.02 MB
```

一千萬次「產生新值」，堆積只動了 0.02 MB，而且那 0.02 MB 還是量測本身的雜訊。

**所以你的擔心要成立，必須是物件或陣列的情境**，例如 `setTodos([...todos, newTodo])`。下面就談那個。

## 二、物件情境：structural sharing 讓「新的一份」其實很便宜

```js
const oldArr = [{n:1}, {n:2}, {n:3}]
const newArr = [...oldArr, {n:4}]

oldArr === newArr        // false ← 外殼是新的，React 才比得出差別
oldArr[0] === newArr[0]  // true  ← 元素是同一個物件，沒有被複製
```

a. `[...arr]` 複製的是**外殼裡的那一排指標**，不是指標指向的那些物件
b. 每個元素只花一個指標的錢

實測：

```
E. 對 100000 筆物件做一次拷貝的成本
   [...base]（淺拷貝，共享元素）： 0.76 MB → 每個元素約 8.0 bytes
   map(o => ({...o}))（複製元素）： 4.58 MB → 每個元素約 48.0 bytes
```

c. 8 bytes 就是一個 64 位元指標
d. 48 bytes 才是「真的又生了一個物件」的價錢，**貴 6 倍**
e. 所以真正要避免的不是 immutable，是**手滑寫成深拷貝**

React 官方文件的建議寫法就是只複製變動路徑：

```js
setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
// 新外殼 1 個 + 新元素 1 個，其餘 N-1 個元素原封不動
```

## 三、那些舊的去哪了：GC 的判準是「不可達」不是「舊」

```js
let items = []
for (let i = 0; i < 20000; i++) {
  items = [...items, { id: i }]
  // 上一圈的陣列在這一行之後就沒有任何人指向它 → unreachable
}
```

實測：

```
B. 20000 次 items = [...items, newObj]，只保留最新一份
   GC 後 heap 增加： 1.53 MB   陣列長度： 20000
```

a. 產生了 20000 個陣列，最後只剩 1.53 MB，等於只留下最後那一份加上 20000 個 item 物件
b. 中間的 19999 個舊外殼全部被回收了
c. 回收它們幾乎不花錢，因為 V8 的 Scavenger 只走訪**活下來的物件**，垃圾越多反而越划算

這就是為什麼「大量產生短命物件」在現代 JS 引擎上是被最佳化過的路徑，而不是反模式。

參考來源｜V8 官方部落格 Orinoco: young generation garbage collection，2017-11-29 發表，查閱日期 2026-09-07
<https://v8.dev/blog/orinoco-parallel-scavenger>

參考來源｜V8 官方部落格 Trash talk: the Orinoco garbage collector，2019-07-01 發表，查閱日期 2026-09-07
<https://v8.dev/blog/trash-talk>

## 四、記憶體真的會漲的唯一原因：你自己把舊值抓住

```js
const history = []
for (let i = 0; i < 5000; i++) {
  cur = [...cur, { id: i }]
  history.push(cur)     // ← 罪魁禍首，每一版都被 history 抓住，永遠可達
}
```

實測：

```
C. 同樣做 immutable 更新 5000 次，但每一版都 push 進 history
   GC 後 heap 增加： 144.11 MB   版本數： 5000
```

a. 從 1.53 MB 變成 144 MB，但**次數還少了 4 倍**
b. 原因是第 i 版的外殼有 i 個指標，全部留著的總成本是 n(n+1)/2 個指標，也就是 **O(n²)**
c. 把 5000 調成 20000 會直接吃掉約 1.6 GB 而 OOM（Out Of Memory，記憶體不足）
d. 所以問題從來不是 immutable 本身，是「保留了幾份」

常見的「不小心抓住」清單：

1. 沒有上限的 undo／redo 堆疊
2. 全域或模組層級的快取 Map，只寫不刪
3. 閉包意外捕獲了一個大物件（例如 event handler 抓住整份列表）
4. `useRef` 存了歷史紀錄卻沒有清
5. 已卸載元件的 `setInterval` 沒有 clear，callback 把舊 state 一直抓著

## 五、immutable 真正的成本是 CPU，不是記憶體

```
F. 速度比較（各 30000 次）
   mutable push        ： 1.83 ms
   immutable [...arr,x]： 3912.51 ms   → 慢約 2138 倍
```

a. `push` 是攤銷 O(1)，`[...arr, x]` 每一圈都要複製 i 個指標，整體是 O(n²)
b. 在 React 裡通常不痛，因為你是「一次事件一次更新」，不是「迴圈裡跑三萬次」
c. 但如果真的要在迴圈裡累積，正確做法是**先用 mutable 在區域變數裡組好，最後再一次交出新陣列**：

```js
setTodos(prev => {
  const draft = [...prev]        // 只複製一次外殼
  for (const item of incoming) draft.push(item)
  return draft                   // 交出去的是全新的外殼，React 比得出來
})
```

d. 這也是 Immer 這類函式庫的核心價值：讓你寫起來像 mutation，實際產出的是 structural sharing 的新樹

## 六、為什麼 React 願意付這個代價

a. **比較成本從 O(n) 降到 O(1)**　只要比外殼的參考是否相同，不用逐欄位深比較
b. **`React.memo`、`useMemo`、`useEffect` 的依賴陣列全部靠這個機制**　它們用的都是 `Object.is`
c. **Concurrent Rendering（並行渲染）需要快照語意**　React 可能中斷、丟棄、重跑一次渲染，如果 state 會被就地改掉，中途的結果就不可信
d. **time travel 與除錯**　每一版都是完整可讀的值，不是一堆 diff

參考來源｜React 官方文件 useState（`Object.is` 比較與 bail out 的說明），查閱日期 2026-09-07
<https://react.dev/reference/react/useState>

## 七、可執行的範例在哪裡

a. 記憶體實測（node 執行）：`C:\coding\JavaScript-practicing\immutable-memory-gc.js`
　　執行方式 `node --expose-gc immutable-memory-gc.js`
　　沒有 `--expose-gc` 就無法手動觸發回收，數字會被背景 GC 干擾而不準

b. React 互動視覺化：`app/immutable-memory/page.tsx`
　　網址 <http://localhost:3000/immutable-memory>
　　畫面會逐列標示「這個元素跟上一輪是不是同一個物件」，可以親眼比較三種寫法：
　　1. 正確的 immutable：1 個新外殼 + 1 個新元素
　　2. 就地修改：外殼沒換，React 直接 bail out，畫面不動
　　3. 深拷貝：全部元素變新物件，共用完全消失

c. 本資料夾內的同步副本：`demo-01-immutable-memory-gc.js`、`demo-02-immutable-visualizer.tsx`

d. 互動測驗：`immutable會不會讓舊值塞滿記憶體-互動版.html`

## 八、相關題目練習

a. LeetCode 2635. Apply Transform Over Each Element in Array　<https://leetcode.com/problems/apply-transform-over-each-element-in-array/>
　　關聯原因：要求自己實作 `map`，正好練習「產生新陣列而不動原陣列」這個 immutable 的最小單位

b. LeetCode 2724. Sort By　<https://leetcode.com/problems/sort-by/>
　　關聯原因：`Array.prototype.sort` 是**就地排序**（會 mutate 原陣列），在 React 裡直接 `setItems(items.sort(...))` 會因為外殼沒換而不重新渲染，這題會逼你正視這件事

c. LeetCode 2722. Join Two Arrays by ID　<https://leetcode.com/problems/join-two-arrays-by-id/>
　　關聯原因：合併物件時要決定「哪些欄位共用、哪些要新建」，是 structural sharing 的手動版練習

## 九、關聯筆記

a. [[為何setCount(count++)無效而setCount(count+1)可以]]
　　關聯原因：那一篇問「為什麼不能改」，這一篇問「不改而是一直生新的，代價是什麼」。兩篇合起來才是完整的 React state 心智模型

b. [[V8引擎完整管線-Parse到Deoptimization]]
　　關聯原因：那一篇講 V8 怎麼把程式碼變成機器碼，這一篇講 V8 怎麼管理這些程式碼產生的物件。Smi 最佳化與分代 GC 都是同一個引擎的兩面

c. [[debounce為什麼一定要setTimeout-以及React的useRef]]
　　關聯原因：`useRef` 是最容易「意外抓住舊值」的地方，本篇第四節的記憶體洩漏清單第 4、5 項都跟它有關

---

參考來源總表

1. V8 官方部落格, Orinoco: young generation garbage collection, 2017-11-29　<https://v8.dev/blog/orinoco-parallel-scavenger>
2. V8 官方部落格, Trash talk: the Orinoco garbage collector, 2019-07-01　<https://v8.dev/blog/trash-talk>
3. React 官方文件, useState　<https://react.dev/reference/react/useState>
4. React 官方文件, State as a Snapshot　<https://react.dev/learn/state-as-a-snapshot>
5. MDN Web Docs, Memory management　<https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management>
6. 本機實測數據, `immutable-memory-gc.js`, node v22.23.2, 2026-09-07

（查閱日期皆為 2026-09-07）
