---
title: Day 1 一個 for 迴圈，四個維護成本
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 宣告式, 高階函式]
updated: 2026-08-20
source: ExplainThis 軟體工程白話聊
---

# Day 1｜一個 for 迴圈，四個維護成本

> 純 Markdown，可直接貼到 iThome。

「好維護」這三個字很虛，虛到 code review 時你只能說「我覺得這樣比較好」，然後對方問「為什麼」，你就卡住了。

這個系列想做的事很具體：**每天拆一段真實的程式碼，把「我覺得比較好」翻譯成講得出口的理由。**

第一天從一段幾乎每個人都寫過的程式碼開始。

---

## 一、重構前

需求：檢查一批請求是不是**全部**都合法。

```js
let everyRequestValid = true

for (const request of requests) {
  if (!isValid(request)) {
    everyRequestValid = false
    break
  }
}

if (everyRequestValid) {
  processRequests(requests)
}
```

這段程式碼**完全正確**，效能也沒問題。它能上線、能通過測試、能跑十年。

但它有四個維護成本。

---

## 二、成本一：讀的人必須在腦中模擬執行

這段是**命令式（Imperative）**的寫法——它描述的是「怎麼做」：

1. 先開一個變數存結果
2. 走訪每一個元素
3. 遇到不合法的就把變數改掉
4. 然後跳出迴圈
5. 最後再檢查那個變數

**讀的人得跟著跑一遍才知道它在幹嘛。** 你的眼睛要同時追蹤 `everyRequestValid` 的值、迴圈跑到哪、`break` 有沒有觸發。

**宣告式（Declarative）**的寫法描述的是「要什麼」：

```js
if (requests.every(isValid)) {
  processRequests(requests)
}
```

`requests.every(isValid)` 這行英文直接讀出來就是答案：**「是不是每一個 request 都合法」**。不用模擬執行，讀完就懂。

這不是「比較短所以比較好」，而是**讀者的認知負擔從「模擬一台機器」降級成「讀一句話」**。

---

## 三、成本二：樣板程式碼（Boilerplate）稀釋了重點

數一下重構前有多少行是「真正的商業邏輯」：

| 程式碼 | 是商業邏輯嗎 |
|---|---|
| `let everyRequestValid = true` | ❌ 只是為了記錄狀態 |
| `for (const request of requests)` | ❌ 只是為了走訪 |
| `if (!isValid(request))` | ✅ 這是重點 |
| `everyRequestValid = false` | ❌ 記錄狀態 |
| `break` | ❌ 控制流程 |
| `if (everyRequestValid)` | ✅ 這是重點 |

**六行裡只有兩行在講需求，其他四行都在講「怎麼實作走訪」。**

重構後那一行，兩個重點都還在（`isValid` 和 `if`），四行雜訊消失。

樣板程式碼真正的代價不是「打字比較累」，而是**它把重點稀釋掉了**。當一個函式裡有六段這種迴圈，讀的人要在 36 行裡找出那 12 行真正的邏輯。

---

## 四、成本三：一個可變變數，就是一個未來的 bug 入口

```js
let everyRequestValid = true
```

這個 `let` 宣告出來的瞬間，它就變成一個**可以被任何人在任何地方改掉的狀態**。

現在只有六行，看起來很安全。但三個月後這個函式長到八十行，中間有人插了一段：

```js
// 三個月後某人加的
if (someEdgeCase) {
  everyRequestValid = true   // 想修一個 bug，結果蓋掉了前面的判斷
}
```

**這種 bug 極難查**，因為每一行單獨看都合理，錯的是它們的組合。

`requests.every(isValid)` 沒有這個問題——**它沒有留下任何可以被改的東西**，結果直接進到 `if` 判斷式裡，中間沒有空隙。

少一個可變狀態，就少一個未來的入口。

---

## 五、成本四：`break` 的意圖沒有被記錄下來

原本的 `break` 是為了**短路（Short-circuiting）**：一旦發現有不合法的，後面不用再檢查了。

這是一個效能優化，但**它是隱含的**。讀的人看到 `break`，得自己想「喔，因為已經確定是 false 了所以不用繼續」。

`every()` **內建就是短路的**——遇到第一個回傳 `false` 的元素立刻停止。效能跟手寫 `break` 完全一樣，但你不用寫，也不用解釋。

順帶一提，`some()` 也是短路的（遇到第一個 `true` 就停），`find()` 和 `findIndex()` 同理。**這是規範保證的行為，不是實作巧合**，可以放心依賴。

---


## 六、兩個我一開始想錯的地方

寫到這裡我自己卡了兩題，猜想讀者也會卡，所以實測一遍。

### 疑問一：`break` 是必要的嗎？沒有會怎樣？

先講結論：**`break` 不影響答案的正確性，只影響跑幾次。**

沒有 `break` 的版本一樣會得到正確結果，因為 `everyUserEligible` 一旦被設成 `false` 就不會再變回 `true`。差別只在它會把剩下的元素**白跑完**。

實測：1000 筆資料，計算 `isEligible` 被呼叫幾次。

| 情境 | 有 break | 沒有 break | `every()` | 答案一致 |
|---|---|---|---|---|
| 第 1 筆就不合格 | **1** | 1000 | **1** | ✅ |
| 第 500 筆不合格 | **500** | 1000 | **500** | ✅ |
| 全部都合格 | 1000 | 1000 | 1000 | ✅ |

三個重點：

- a. **答案永遠一樣**，所以 `break` 是效能優化不是正確性需求。
- b. **`every()` 的次數跟有 break 的版本完全相同**，這就是「內建短路」的意思——你不用寫，它自己會停。
- c. **最壞情況是「全部都合格」**。這一點有點反直覺：資料越「乾淨」，反而跑得越久。

第三點值得多想一下。`every()` 在找的是**反例**——只要抓到一個不合格的，答案立刻確定是 `false`。所以**不合格的出現得越早，越快結束**；如果一個反例都沒有，它別無選擇，只能檢查到最後一筆才能宣告「全部都合格」。

反過來說，`some()` 找的是**正例**，短路條件是「遇到第一個 `true`」，最壞情況變成「全部都不符合」。

### 疑問二：`isEligible` 不也是要另外宣告嗎？那不是一樣有樣板？

這個質疑很合理，但答案是**不一樣**，理由有兩層。

**第一層：`isEligible` 在重構前後都存在。**

回頭看重構前的程式碼：

```js
for (const user of users) {
  if (!isEligible(user)) {     // ← 這裡本來就在用 isEligible
```

它不是重構帶來的新成本，是**兩個版本共有的**。重構消掉的是另外那五樣東西：`let` 宣告、`for` 迴圈、`= false` 賦值、`break`、以及最後那個 `if`。

**第二層：`let` 變數和函式是性質完全不同的東西。**

| | `let everyUserEligible` | `isEligible` |
|---|---|---|
| 本質 | 可變狀態 | 純函式 |
| 會被改嗎 | **會**，這正是它存在的目的 | 不會 |
| 能重用嗎 | 不能，只服務這一個迴圈 | **能**，任何地方都能呼叫 |
| 能單獨測試嗎 | 不能 | **能** |
| 表達的是 | 「我需要一個地方記結果」 | 「什麼叫做合格」 |

**判準只有一句：這個宣告表達的是「需求」還是「怎麼做」？**

`isEligible` 回答的是需求問題——什麼樣的使用者算合格。這是商業邏輯，不管你用什麼寫法都需要它。

`everyUserEligible` 回答的是實作問題——我需要一個變數來暫存迴圈的中間結果。這純粹是為了讓 `for` 迴圈跑得起來，需求本身不需要它。

**所以樣板程式碼的定義不是「多寫的行數」，而是「為了讓實作方式成立而存在、但需求本身不需要的東西」。**

順帶一提，如果條件很簡單，`isEligible` 連抽都不用抽：

```js
users.every(u => u.age >= 18 && u.verified)
```

一樣可以動。抽成具名函式的價值在於**那個名字本身就是註解**，而且可以單獨寫測試。



### 疑問三：`isValid` 也是外部宣告的，難道它不會造成 side effect？

上面那一段我原本寫「`isValid` 是純函式所以不會被改」，**這句話講得太滿，要修正**。實測三種情況。

**情況 A：用 `const` 宣告——語言層擋住**

```js
const isValid = (r) => r.status === 'ok'
isValid = () => true          // TypeError: Assignment to constant variable.
```

`const` 從語法層面禁止重新賦值，這一層是安全的。

**情況 B：改用 `let` 宣告——真的會被掉包**

```js
let isValidLoose = (r) => r.status === 'ok'
requests.every(isValidLoose)      // false

isValidLoose = () => true         // ← 別的地方把它整個換掉
requests.every(isValidLoose)      // true   ← 結果被改變了
```

**這種情況下質疑完全成立，重構保護不了你。**

**情況 C：函式本身就不純——重構完全救不了**

```js
let auditLog = []
const isValidImpure = (r) => {
  auditLog.push(r.id)             // ← 副作用：偷偷改了外部陣列
  return r.status === 'ok'
}

requests.every(isValidImpure)
console.log(auditLog)             // [1, 2]  ← every 一樣產生了副作用
```

`every()` 不會因為它是高階函式就自動變乾淨。**乾淨的是「寫法」，不是「被呼叫的東西」。**

### 所以「避免狀態污染」精確講是什麼意思

關鍵不在「有沒有在外部宣告」，而在**這段程式碼裡它會不會被賦值第二次**。

```js
let everyRequestValid = true    // ← 宣告它
everyRequestValid = false       // ← 又改它      ← 賦值第二次
if (everyRequestValid)          // ← 再讀它
```

這個變數**從出生到死亡都在這六行裡**，它的存在只是為了讓 `for` 迴圈跑得起來。

| | 這段程式碼裡會被賦值第二次嗎 | 定位 |
|---|---|---|
| `everyRequestValid` | **會**（`= false`） | 可變狀態，是樣板 |
| `isValid` | 不會（只被呼叫） | 依賴，是商業邏輯 |

所以原本那句「避免狀態污染」，更精確的說法是：

> **少一個「你自己在這段邏輯裡創造並修改」的變數，不是少一個「你依賴的東西」。**

**這個修正很重要**，因為如果你以為「改用 `every()` 就自動沒有副作用」，遇到情況 B 或 C 時會完全找不到問題在哪。

---

## 七、順帶釐清：這兩行的宣告順序有規定嗎

寫範例時我把函式放在資料前面：

```js
const isValid = (request) => request.status === 'ok' && request.payload !== null

const requests = [
  { id: 1, status: 'ok',    payload: { a: 1 } },
  { id: 2, status: 'error', payload: null     },
  { id: 3, status: 'ok',    payload: { c: 3 } },
]
```

**這個順序不是語言要求，兩行可以對調。**

因為它們**互相沒有依賴**——`isValid` 的定義裡沒用到 `requests`，`requests` 的定義裡也沒用到 `isValid`。

**唯一的硬性規則只有一條：**

> 用到它的那一行執行時，它必須已經初始化完成。

```js
const isValid  = ...          // 初始化
const requests = [ ... ]      // 初始化
requests.every(isValid)       // ← 真正「使用」它們的是這一行，此時兩者都好了
```

### 那什麼時候順序才會出事

當你在初始化之前就去用它，會撞上 **TDZ（Temporal Dead Zone 暫時性死區）**：

```js
tdzTest()                     // ReferenceError: Cannot access 'tdzTest' before initialization
const tdzTest = () => 'hi'
```

`const` 和 `let` 宣告的變數會被提升，但停在 TDZ 裡，碰它就報錯。

### 函式宣告與函式表達式的差別才是重點

```js
hoisted()                     // ✅ '可以，我被完整提升了'
function hoisted() { return '可以，我被完整提升了' }

notHoisted()                  // ❌ ReferenceError
const notHoisted = () => '我不會被提升'
```

| 寫法 | 能先呼叫嗎 | 原因 |
|---|---|---|
| `function foo() {}` | ✅ 可以 | 整個函式被提升 |
| `const foo = () => {}` | ❌ 不行 | 卡在 TDZ |
| `var foo = () => {}` | ❌ 不行 | 只提升變數名，值是 `undefined` |

### 那為什麼習慣上還是把函式寫在前面

純粹是**可讀性的選擇**：

- a. 先看到「什麼叫有效」再看到資料，讀起來像在讀規格書。
- b. 資料通常比較長（十幾筆），先擺會把規則推到很下面。

反過來寫也完全正確。

**唯一要小心的是**：如果改用 `function` 宣告，它會被提升，這時「寫在後面但先被呼叫」在語法上是合法的——**能跑，但讀的人要往下捲才找得到定義，可讀性反而變差**。這正好呼應這個系列的主題：**語言允許的，不代表好維護。**

---

## 八、但是——什麼時候不該這樣改

這個系列不打算變成「高階函式萬歲」的傳教文。三種情況我不會改：

**a. 迴圈裡需要 `continue` 或多層跳出**

```js
outer: for (const a of listA) {
  for (const b of listB) {
    if (match(a, b)) continue outer
  }
}
```

硬要用高階函式改寫，可讀性反而更差。

**b. 需要非同步逐一等待**

```js
for (const item of items) {
  await save(item)      // 一個一個存，不能同時打爆資料庫
}
```

`forEach` 不會等 `await`，這是很常見的坑。這種情況 `for...of` 才是對的。

**c. 效能敏感的極大量資料**

在數百萬筆的迴圈裡，高階函式的函式呼叫開銷是真實存在的。但要強調——**這種情況遠比你以為的少**。先量測再優化，不要憑感覺。

---

## 九、今天的判斷標準

下次看到 `let flag = ...` 加上 `for` 加上 `break` 的組合，問自己一句：

> **「這個迴圈的目的，有沒有一個現成的動詞可以描述？」**

| 你想做的事 | 現成的動詞 |
|---|---|
| 每個都符合嗎 | `every()` |
| 有任何一個符合嗎 | `some()` |
| 找出第一個符合的 | `find()` |
| 挑出所有符合的 | `filter()` |
| 每個都轉換成別的 | `map()` |
| 全部濃縮成一個值 | `reduce()` |

**有現成動詞就用它，因為那個動詞本身就是註解。** 沒有的話再手寫迴圈，那時候手寫才是對的選擇。

---

## 明天預告

Day 2 講**巢狀 if 怎麼攤平**，以及為什麼「提早 return」比「把邏輯包在 else 裡」好維護。同樣會附上「什麼時候不該攤平」。

---

## 參考來源

- ExplainThis 軟體工程白話聊，〈寫出好維護的程式碼——如何透過高階函式降低程式碼閱讀負擔？〉：https://www.youtube.com/watch?v=0ANjSvoFq0g （本文的重構範例出自這支影片，四個維護成本的拆解與後續實測為個人整理）
- MDN, `Array.prototype.every()`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
- MDN, `Array.prototype.some()`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some

（查閱日期：2026-08-20）
