# Day 23：攔截、收集、觸發 —— React 為什麼三個零件一個都不做

## 今天要回答的三個問題

1. Day 22 說「Vue 精確追蹤修改，只更新相關 DOM 節點」，React 則是「整個組件樹重新執行函式」。這兩句話背後到底差在哪個零件？
2. 「響應式（reactive）」這個詞常常跟 Proxy 畫上等號，但 Vue 2 沒有 Proxy 也是響應式的。那響應式到底是由什麼構成的？
3. React 明明知道 Proxy 存在，為什麼不用？而 2025 年底出的 React Compiler 算不算它終於改邪歸正了？

---

## 一、承接 Day 22：那張表裡我少講了一格

Day 22 我列了一張三框架的對照表，其中「重新渲染觸發時機」那一欄是這樣寫的：

| 框架 | 觸發方式 | 影響 |
| --- | --- | --- |
| React | `setState` 呼叫 → 整個組件樹重新執行函式 | 可能不必要的重渲染 |
| Vue | 直接修改 `ref.value` → 響應式系統偵測 | 精確追蹤修改，只更新相關 DOM 節點 |

這張表描述的是**現象**，不是**原因**。讀者看完會知道「Vue 比較精準」，但不會知道「精準」是從哪裡來的，更不會知道 React 要付出什麼才能換到同樣的精準。

今天把那一格拆開。拆開之後你會發現，**所謂「響應式系統」不是一個東西，是三個零件組起來的**，而市面上每一個框架的差異，都可以用「這三個零件它做了哪幾個」來定位。

Day 22 講的是**怎麼寫**，今天講**為什麼只能這樣寫**。

![[學習React_圖解_攔截-收集-觸發三零件-push與pull兩條路_ISO5807_2026-09-24.png]]

<!--
貼到 iThome 之前要做兩件事：
一、把上面這行 Obsidian wikilink 刪掉。
二、到 iThome 編輯器把同名的 .png 上傳，用它回傳的網址改寫成 ![圖說](那個網址)。
本機相對路徑與 wikilink 在 iThome 上都不會有圖，因為它讀不到你電腦裡的檔案。
-->


---

## 二、JavaScript 只給了兩種「偷聽屬性」的能力

在談框架之前，得先知道語言本身給了什麼牌。答案是兩張，而且都有明確的限制。

### 能力一：存取器屬性（accessor property，ES5，2009 年）

一般的物件屬性存的是**值**，這叫**資料屬性（data property）**：

```js
const person = { name: 'Abby' }
person.name        // 'Abby'，存什麼拿什麼
```

但 JavaScript 還有第二種屬性，它存的不是值，是**一段程式**：

```js
const person = {
  _name: 'Abby',
  get name () {            // get 開頭 → 這叫取值器（getter）
    console.log('有人讀了 name')
    return this._name
  },
  set name (v) {           // set 開頭 → 這叫設值器（setter）
    console.log('有人寫了 name =', v)
    this._name = v
  }
}
```

白話解釋這段：**別人以為自己在「讀一個屬性」，實際上 JavaScript 偷偷幫他呼叫了一個函式。** 讀 `person.name` 會執行 `get name()` 這個函式，並把它的回傳值交給你；寫 `person.name = 'Bob'` 則會把 `'Bob'` 當參數丟進 `set name(v)`。

`get` 與 `set` 合稱**存取器（accessor）**，這種屬性就叫**存取器屬性**。

#### 為什麼內部要用 `_name` 而不是 `name`

這不是命名潔癖，是硬性需求。看這段：

```js
const trap = {
  get boom () { return this.boom }   // 讀 boom 又觸發 boom 的 getter
}
trap.boom
```

白話解釋這段：getter 攔截的就是 `boom` 這個名字，所以函式內部再去讀 `this.boom` 會再次觸發同一個 getter，第二次又觸發第三次，永遠回不來。我在 demo 裡實際跑過，結果是：

```
RangeError: Maximum call stack size exceeded
```

所以**必須換一個沒被攔截的名字實際存資料**。`_value`、`_name` 這種底線開頭的屬性就是真正的倉庫，沒有底線的那個是給外面用的門面。這個雙層結構是所有 getter／setter 實作的標準寫法，等一下看 Vue 的 `RefImpl` 就會再遇到一次。

#### 存取器屬性的天花板：只能攔「事先寫死名字」的屬性

```js
const obj = {
  get name  () { /* 只攔 name */ },
  get age   () { /* 想攔 age 要再寫一組 */ },
}

obj.newThing = 123     // 沒定義過它的 setter，完全攔不到
delete obj.name        // 刪除也攔不到
```

白話解釋這段：**你沒有辦法寫一組 getter 去攔「所有屬性」。** 每個屬性都要事先把名字寫死。這叫**具名屬性（named property）**，這就是 Vue 2 的根本限制 —— 它用 `Object.defineProperty` 在初始化時把每個欄位都掛一組 getter／setter，所以**後來才新增的欄位它偵測不到**，才需要 `Vue.set()` 這個 API 來補。

### 能力二：Proxy（ES6，2015 年）

Proxy 就是來解決上面那個天花板的：

```js
const proxy = new Proxy(target, {
  get (obj, key) {                     // ← key 是參數，不是寫死的名字
    console.log('有人讀了', key)
    return Reflect.get(obj, key)
  },
  set (obj, key, value) {
    console.log('有人寫了', key, '=', value)
    return Reflect.set(obj, key, value)
  }
})
```

白話解釋這段：**Proxy 是在真實物件前面放一個長得一模一樣的替身，所有讀寫都要先經過替身。** 關鍵差別在那個 `key` —— 它是參數，所以一個函式就吃下所有屬性，包括你事先不知道名字的、之後才新增的、甚至被刪掉的。

`Reflect.get` 與 `Reflect.set` 是配套的內建工具，用途是「用預設的方式完成這個操作」，避免你在攔截函式裡手動寫 `obj[key] = value` 而漏掉一些邊界行為（例如原型鏈上的 setter、`this` 綁定）。

Proxy 的攔截函式在規格裡有個正式名稱叫 **trap（陷阱）**，一共可以定義 13 種。

兩種能力的差別：

| | 存取器屬性（getter／setter） | Proxy |
| --- | --- | --- |
| 攔誰 | 一個名字一組，寫死在程式碼裡 | 一個函式吃全部，名字用參數傳進來 |
| 事先要知道名字嗎 | 要 | 不用 |
| 新增的屬性 | 攔不到 | 攔得到 |
| 刪除屬性 | 攔不到 | 攔得到 |
| 陣列索引賦值 | 攔不到 | 攔得到 |
| 能包住數字或字串嗎 | 不適用 | **不行**，target 必須是物件 |
| 進規範的年份 | 2009（ES5） | 2015（ES6） |
| 能 polyfill 嗎 | 能 | **不能** |

最後兩列等一下會變成 React 做決定時的關鍵因素。

---

## 三、一個響應式系統需要三個零件

現在進入今天的主軸。**「響應式」不是一個機制，是三個機制串起來的效果。**

- **a. 攔截（intercept）** —— 知道「有人讀了 / 有人寫了這個值」。這一層才是 getter／setter 與 Proxy 負責的部分。
- **b. 依賴收集（dependency tracking）** —— 在**讀**的那一刻，記下「是誰在讀我」。Vue 原始碼裡這個函式叫 `track()`。
- **c. 觸發更新（trigger／scheduler）** —— 在**寫**的那一刻，翻出剛才記的名單，只通知名單上的人。Vue 原始碼裡叫 `trigger()`，通知完丟進 `queueJob()` 排程。

這三個名詞聽起來很抽象，但手寫出來只有二十幾行。下面這段是我 demo 裡的核心，每一行都標了它是哪個零件：

```js
let activeEffect = null            // 現在正在執行的 effect。「誰在讀」的答案就靠它。
const depsMap = new Map()          // 訂閱清單。key 是屬性名，value 是讀過它的 effect 集合。

// ── 零件 b：依賴收集 ──
function track (key) {
  if (!activeEffect) return                          // 沒有人在讀就不用記
  if (!depsMap.has(key)) depsMap.set(key, new Set())
  depsMap.get(key).add(activeEffect)                 // 把現在在跑的那個 effect 記進名單
}

// ── 零件 c：觸發更新 ──
function trigger (key) {
  const subs = depsMap.get(key)
  if (!subs) return                                  // 沒人訂閱這個 key，什麼都不用做
  for (const fn of subs) fn()                        // 只叫醒名單上的人
}

// ── 零件 a：攔截 ──
function reactive (target) {
  return new Proxy(target, {
    get (obj, key) {
      track(key)                                     // 零件 b 掛在「讀」的路徑上
      return Reflect.get(obj, key)
    },
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      trigger(key)                                   // 零件 c 掛在「寫」的路徑上
      return ok
    }
  })
}
```

這不是我自己想像的結構。Vue 官方文件「深入響應式系統」那一頁貼的示範碼，變數名幾乎一模一樣 —— 同樣有一個全域的 `activeEffect`，同樣在 `track()` 裡把它 `add` 進一個 Set，同樣在 `trigger()` 裡把那個 Set 全部叫起來。唯一的差別是**真實的 Vue 用 `WeakMap<target, Map<key, Set<effect>>>` 三層結構**，因為它要同時管很多個物件；我這裡只有一個物件，所以把最外層那個 `WeakMap` 拿掉，壓成單層的 `Map<key, Set<effect>>`。

白話解釋這整段：`reactive()` 把你的物件換成一個會記帳的替身。替身在被讀的時候記下「是誰讀的」，在被寫的時候查帳本「剛才誰讀過這個欄位」，然後只打電話給那幾個人。**`activeEffect` 這個全域變數就是整套機制的靈魂** —— 因為 JavaScript 是單執行緒，同一時間只會有一個 effect 在跑，所以「現在正在跑的是誰」永遠是個確定的答案，這才讓自動依賴收集成為可能。

實測結果（`node day23-three-parts-of-reactivity.js`，Node.js v22.23.2，2026-09-24 執行）：

```
改了沒人讀的 unrelated：effect 重跑 0 次（訂閱清單裡沒有它）
改了有人讀的 count    ：effect 重跑 1 次，畫面：count = 1
```

**改了沒人讀的欄位，重跑 0 次。** 這一行就是「精準」的全部內容。

### 拆掉零件 b 會怎樣

這是今天最值得看的一個對照組。我把攔截留著，只把依賴收集拿掉：

```js
function reactiveWithoutTrack (target) {
  return new Proxy(target, {
    get (obj, key) { return Reflect.get(obj, key) },   // 攔得到，但什麼都不記
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      for (const fn of noTrackSubs) fn()                // 沒有名單可查，只能全部叫醒
      return ok
    }
  })
}
```

白話解釋這段：因為沒有人記下「誰讀過哪個欄位」，寫入的時候就沒有名單可以查，**唯一還能做的事就是把所有人都叫起來**。實測：

```
→ 拆掉零件 b 之後，只改 a 一個欄位，三個 effect 全部重跑了 3 次
```

**只有零件 a 不算響應式系統，那只是「可以攔截」。** 三個湊齊才是。這也正好解釋了為什麼 React 明明可以在某處插個攔截層，卻還是得整個重跑 —— 缺的不是攔截，是名單。

### 零件 a 的天花板：Proxy 包不住原始型別

```js
new Proxy(0, {})
// TypeError: Cannot create proxy with a non-object as target or handler
```

白話解釋這段：數字、字串、布林都不是物件，Proxy 沒有東西可以包。**這就是 Vue 的 `ref()` 要你寫 `.value` 的唯一原因** —— 它得先造一個物件出來，把值塞進一個具名屬性，再回頭用 ES5 的 getter／setter 攔那個屬性：

```js
class RefImpl {
  constructor (value) { this._value = value }              // 真正存資料的地方
  get value () { track('value'); return this._value }      // 門面，讀它會被攔
  set value (v) { this._value = v; trigger('value') }      // 門面，寫它會被攔
}
```

白話解釋這段：`value` 就是 Vue 團隊挑的一個固定名字，寫死在這個類別裡，不是什麼關鍵字 —— 改叫 `box` 一樣能跑。而 `_value` 要有底線，理由就是第二節那個無限遞迴。

所以 Vue 3 的兩個 API 用的是**兩種不同的攔截手段**：`reactive()` 用 Proxy，`ref()` 用 getter／setter。但因為 b 和 c 都在，兩個都是完整的響應式系統。

---

## 四、React 三個零件一個都不做

逐個對。

### 零件 a 攔截 → 沒有

```jsx
const [count, setCount] = useState(0)
```

`useState` 回傳的 `count` 是一個**普通的區域變數**，不是 Proxy，也不是掛了 getter 的物件屬性。你在 JSX 裡寫 `{count}`，那就只是讀一個變數 —— 這件事在 JavaScript 語言層面不會發出任何訊號，沒有任何鉤子可以掛。

### 零件 b 依賴收集 → 沒有

因為 b 的前提是 a。既然讀取根本沒被攔下來，React 從頭到尾不知道「這個 state 被哪幾個 JSX 節點用到」，自然也沒有任何訂閱清單這種東西存在。

### 零件 c 觸發更新 → 有 scheduler，但沒有「以值為單位」的那一種

**這裡我要更正自己在筆記裡寫過的一句話。** 我之前整理的那張對照表把 React 的「有觸發更新嗎」直接標成 ❌，這是寫太滿了。

React 是**有** scheduler 的 —— `scheduler` 套件、Lane 優先級模型、批次更新（batching）都存在，論複雜度還遠超過 Vue 的 `queueJob`。差別不在「有沒有排程」，而在**排程的對象是誰**：

| | 觸發的對象 | 粒度 |
| --- | --- | --- |
| Vue 的 `trigger` | 讀過這個 key 的那幾個 effect | **單一屬性** |
| React 的排程 | 這個 Fiber 節點與需要重算的子樹 | **整個元件** |

所以精確的說法是：**React 沒有「攔截 → 收集 → 精準通知」這條鏈，它走的是「你喊一聲 → 我全部重算 → 我自己比對出差異」。**

這兩條路線有正式名稱：

- **push-based（推）** —— 值改變時，由資料端「推」給用到它的人。Vue、Solid、Signals 走這條。
- **pull-based（拉）** —— 值改變時只發一個籠統的訊號，由框架重新「拉」一次整份結果再比對。React 走這條。

---

## 五、實測：pull 多做了幾次工

抽象講完了，來看數字。我做了一個 200 個欄位的儀表板，畫面上有 200 個節點，每個節點只讀一個欄位，然後**只改其中 1 個欄位**。

pull 模型（手寫的最小 React 模型）跑出來：

```
只改 1 個欄位（f7），pull 模型做了：
  元件函式重跑     1 次
  產生新節點       200 個
  逐一比對節點     200 次
  真正寫進 DOM     1 次
```

**最後真的要改的只有 1 個節點，但它為了「找出是哪一個」付了 400 次的代價。** push 模型在同樣情境下是 1 次 —— 因為它在讀的時候就把答案記下來了。

再把規模與次數拉大，量時間（200 個欄位，連續 2000 次「只改其中 1 個」）：

| | 啟動（毫秒） | 更新（毫秒） |
| --- | --- | --- |
| push（三零件） | 0.10 ～ 0.16 | 1.4 ～ 7.4 |
| pull（重跑＋比對） | 0.04 ～ 0.07 | 57 ～ 119 |

**我跑了四輪，更新階段的倍數差在 16 倍到 66 倍之間跳動，變異很大。** 我不打算挑一個漂亮的數字寫「快 66 倍」，因為那是挑出來的。誠實的結論只有一句：**在「大量欄位、小量變動」這個特定形狀下，push 模型的更新成本明顯低於 pull 模型，數量級差一到兩個。**

但這只是硬幣的一面。

---

## 六、誠實的另一面：push 的代價

如果 push 全面勝出，這篇文章就不用寫了。三個零件不是免費的。

### 代價一：Proxy 的讀取有常態稅

```
讀 3,000,000 次屬性：普通物件 8.1 ～ 14.2 毫秒，Proxy 99.1 ～ 159.4 毫秒
```

四輪實測下來，**經過 Proxy 讀一個屬性比讀普通物件慢 8 到 18 倍**。這是因為每次讀取都要走一趟 get trap，而 trap 是一個真實的函式呼叫，引擎也難以對它做內聯快取（Inline Cache，引擎把「這個屬性在物件的哪個位置」記起來的最佳化）。

這筆錢是**每一次讀取都在付**，不管值有沒有變。React 的普通物件讀取則完全沒有這筆開銷。

### 代價二：啟動比較貴

同一份實測裡，push 的啟動階段是 pull 的 2.3 ～ 2.8 倍。因為它要建立 Proxy、跑一輪 effect 登記、建出整份訂閱清單。**頁面剛載入那一瞬間，pull 是比較輕的。**

### 代價三：記憶體裡多了一份帳本

`depsMap` 是真實存在的資料結構。欄位愈多、訂閱者愈多，帳本愈大，而且它的生命週期要跟著元件走 —— 元件卸載時沒清乾淨就是記憶體洩漏。React 沒有這份帳本，也就沒有這類問題。

### 代價四：隱式資料流

這一點無法量化，但在大型專案裡最有感。

```js
state.count++            // Vue：這一行會觸發什麼？要追進去才知道
setCount(c => c + 1)     // React：這一行囉唆，但你 grep 得到所有狀態變動點
```

白話解釋這個對照：Vue 的寫法簡潔，代價是「哪裡改了狀態」這件事散落在程式碼各處且外觀上跟普通賦值沒兩樣；React 強迫你顯式呼叫一個函式，囉唆，但換來的是**資料流可以被搜尋、被追蹤**。

**React 的取捨是：我在每次更新多付一點算力，換你在每次除錯少付很多時間。** 你可以不同意這個取捨，但要知道它是一個取捨，不是一個疏漏。

補充兩個歷史因素：

- **Proxy 無法被 polyfill。** React 誕生於 2013 年，那時 Proxy 還沒進規範。Vue 3 選了 Proxy，代價就是直接放棄 IE11。
- **不可變資料有額外好處。** 時光旅行除錯、樂觀更新回滾（這就是 Day 21 整篇在講的事）、`React.memo` 的淺比較，全都建立在「舊值還在、新值是另一個物件」這個前提上。Day 21 那個「回滾寫回的是整個世界」的問題，換成 Vue 的可變模型反而更難處理。

---

## 七、於是那三個經典問題有了答案

因為沒有攔截層，React 判斷「有沒有變」的唯一依據就是**比對參考（reference）**，用的是 `Object.is`。實測：

```
原地改：Object.is(舊, 新) = true   → React 判定沒變，不重繪
給新物件：Object.is(舊, 新) = false → React 判定變了，重繪
```

### 問題一：為什麼直接改物件沒反應

```jsx
user.name = 'Bob'
setUser(user)        // 傳進去的還是同一個物件，Object.is 為 true
```

物件內容確實改了，但 React 看的不是內容，是**這還是不是同一個盒子**。你在同一個盒子裡換東西，它看不出來。

**所以「不可變更新（immutable update）」不是 React 的風格潔癖，是它的偵測機制決定的必要條件。**

最陰險的是這個 bug **有時候會動** —— 如果同一次事件裡還有別的 state 更新，元件被迫重新渲染，你會看到改後的值，於是誤以為程式碼是對的。等到某天單獨改它時才壞掉，而且完全不知道為什麼上次可以。

### 問題二：為什麼陣列不能用 `push`

```
陣列 push 之後 Object.is(舊, 新) = true  → 一樣看不見
陣列展開之後 Object.is(舊, 新) = false → 看得見
```

記法：**`push`、`pop`、`splice`、`sort`、`reverse` 都會原地改；`map`、`filter`、`concat`、`slice` 都回傳新陣列。** React 只吃後者。

### 問題三：淺複製為什麼不夠

```
淺複製後 profile 還是同一個嗎：true
→ 改 copied.profile.age，原始的 user.profile.age 也變成 99
```

白話解釋這段：`{ ...user }` 只複製第一層，第二層的 `profile` 複製的是**那個參考**，兩邊指向同一個物件。所以要一層一層來：

```jsx
setUser({ ...user, profile: { ...user.profile, age: 99 } })
```

這也正是 Day 3 那篇「傳值 vs 傳址」的觀念在 React 裡的實際事故現場。

---

## 八、順帶清掉三個常見誤解

### 誤解一：響應式就等於 Proxy

不是。**響應式是「效果」，Proxy 是「手段」。**

| 框架／API | 攔截用什麼 | 有零件 b 嗎 | 有零件 c 嗎 | 算響應式系統嗎 |
| --- | --- | --- | --- | --- |
| Vue 2 | `Object.defineProperty`（getter／setter） | 有 | 有 | 是 |
| Vue 3 `reactive()` | Proxy | 有 | 有 | 是 |
| Vue 3 `ref()` | getter／setter | 有 | 有 | 是 |
| Solid ／ Signals | 函式呼叫（`count()`） | 有 | 有 | 是 |
| Svelte 5 runes | 編譯期改寫 | 有 | 有 | 是 |
| Angular Signals（v16＋） | 函式呼叫 | 有 | 有 | 是 |
| **Angular Zone.js（v2～20）** | **攔非同步 API，不攔值** | **沒有** | 有，但對象是整棵樹 | **不是**（詳見第十節） |
| **React `useState`** | **沒有攔截** | **沒有** | 有 scheduler，但不是以值為單位 | **不是** |

注意第 1 列與第 3 列：**同樣是 getter／setter，Vue 2 和 Vue 3 的 `ref()` 都是完整的響應式系統。** 所以「用什麼手段攔截」跟「算不算響應式」是兩回事 —— 差別在有沒有 b 和 c。

講「響應式就是 Proxy」在面試會被追問到說不下去，因為 Vue 2 沒有 Proxy 但一樣有響應式。

### 誤解二：React Compiler 讓 React 變成響應式了

**React Compiler v1.0 已於 2025-10-07 正式發布。** 它會自動幫你插入 memoization，效果上很像「React 變聰明了」，但它**不是**響應式系統：

- a. 它是**編譯期（build time）工具**，官方文件的第一句就是 "React Compiler is a build-time tool that optimizes your React app through automatic memoization."
- b. 它在編譯期分析資料流與可變性，自動補上等價於 `useMemo` ／ `useCallback` ／ `React.memo` 的邏輯，甚至能做到手寫辦不到的**條件式 memoization**。
- c. 它**沒有**在執行期攔截任何讀寫，**沒有**訂閱清單。三個零件依然一個都沒加。

所以它改變的是「重跑之後有多少東西需要重算」，不是「要不要重跑」。React 依然是 pull-based，只是那個 pull 的範圍被編譯器縮小了。

**這其實是一個很聰明的第三條路**：push 把成本付在執行期（Proxy 的常態稅、訂閱清單的記憶體），React Compiler 把成本付在編譯期 —— 編譯只做一次，使用者的瀏覽器一毫秒都不用付。

### 誤解三：Signals 已經進 JavaScript 標準了

還沒。TC39 的 Signals 提案目前在 **Stage 1**，提案本身的文件寫著 "It can currently be thought of as 'Stage 0'"。作者群明確表示要先做出多個產品級 polyfill、整合進主流框架之後才會申請推進階段。

它的架構就是標準化的三零件 —— 自動依賴發現、拓撲排序避免 glitch、computed 惰性求值。如果哪天它進了語言，零件 a 和 b 就變成引擎內建，那才是真正的分水嶺。**但那一天還沒到，截至 2026 年 9 月，React 官方仍然沒有引入 signals，也沒有 runtime 的 reactivity。這是路線選擇，不是還沒做到。**

---

## 九、`useRef` 的 `.current` 與 Vue 的 `.value`：兩個盒子，一個有祕書一個沒有

這組對照是驗收今天內容最好的題目。

| | React 的 `useRef` | Vue 的 `ref` |
| --- | --- | --- |
| 盒子的屬性名 | `.current` | `.value` |
| 那個屬性是什麼 | **普通的資料屬性** | **存取器屬性（有 getter／setter）** |
| 改了會怎樣 | **什麼都不會發生** | 自動觸發畫面更新 |
| 為什麼要有盒子 | 需要一個跨多次渲染不變的容器 | 因為 Proxy 包不住原始型別 |
| 用途 | 存跨渲染的值，**刻意不要觸發渲染** | 存響應式狀態，**就是要觸發渲染** |

兩邊都需要盒子，但**理由完全不同**，這點很多文章會混在一起講：

- React 需要盒子，是因為元件每次渲染都重新執行整個函式，區域變數全部重來，所以要一個參考不變的容器。
- Vue 需要盒子，是因為 `new Proxy(0, {})` 會直接丟 TypeError，它得先造一個物件才有屬性可以攔。

```jsx
countRef.current = 999    // 值真的改了，但畫面一動也不動
```

**這不是缺陷，這正是 `useRef` 存在的理由。** 它的 `.current` 是普通資料屬性，沒有 getter，所以連「有人說變了」這個訊號都不發。當你需要存一個「跨渲染保留、但改了不該重畫」的東西 —— 計時器 ID、DOM 節點、上一次的值 —— 就用它。

順帶一提 Vue 那邊對應的坑：在 `<script>` 裡漏寫 `.value`：

```js
const count = ref(0)
count++          // 你在對一個物件做加法
```

沒開 TypeScript 的話**不會報錯**，`count` 會安靜地變成 `NaN`。開了 TS 就會直接紅字擋下 —— 這是 TS 在 Vue 專案裡最實際的價值之一。

---

## 十、Angular 在三零件裡的形態：它是第三種答案

前面九節都在對照 React 與 Vue，但 Angular 不是「比較像其中一個」，**它是第三種形態，而且這三年從一端走到了另一端**。現行版本是 [Angular 22.1.7（2026-09-16 發布）](https://endoflife.date/angular)。

### 形態一：Zone.js 時代（Angular 2 到 20）

| 零件 | 有沒有 | 做法 |
| --- | --- | --- |
| a 攔截 | **有，但攔的是「非同步 API」不是「值」** | 把 `setTimeout`、`addEventListener`、`Promise`、XHR 換成自己的版本 |
| b 依賴收集 | **完全沒有** | 不知道哪個元件用到哪個值 |
| c 觸發更新 | 有，但對象是**整棵元件樹** | `tick()` 從根往下逐一比對每個樣板綁定 |

**這是今天整篇裡最值得記的一個對照：Vue 攔的是「值被讀寫」，Angular 攔的是「有事情發生了」。**

[Angular 官方文件](https://angular.dev/best-practices/zone-pollution)的原話是，Zone.js「captures asynchronous operations like `setTimeout`, network requests, and event listeners」，而「Angular schedules change detection based on signals from Zone.js」。

把 `setTimeout` 換掉這件事有個正式名稱叫 **monkey patching（猴子補丁）**，手寫出來就這樣：

```js
const nativeSetTimeout = globalThis.setTimeout
globalThis.setTimeout = function (fn, ms, ...rest) {
  return nativeSetTimeout(() => {
    fn()          // 先跑使用者原本要跑的事
    tick()        // 再通知框架：剛才有個非同步的東西結束了，全部檢查一遍
  }, ms, ...rest)
}
```

白話解釋這段：先把原本的 `setTimeout` 存起來，再把全域的那個換成自己的版本。自己的版本照常呼叫原本的，只是在使用者的回呼跑完之後**多做一件事** —— 通知框架去檢查。所以框架完全不需要知道你改了什麼，它只要知道「剛才有個非同步的縫隙」就會全部重查一遍。

**所以 Zone.js 時代的 Angular 比 React 更 pull。** React 至少知道是哪個元件呼叫了 `setState`，Angular 連這個都不知道。

實測（`day23b-angular-signal-model.js`，5 個元件 × 10 個綁定，3 個 `setTimeout` 但只有 1 個真的改了資料）：

```
被攔截的 setTimeout 呼叫：3 次
change detection 跑了  ：3 次
樣板綁定總共比對      ：150 次
→ 其中只有 1 次是真的有資料改變，另外 2 次是白跑的
```

`OnPush` 策略就是在補這個洞 —— 它用參考比對在**元件邊界**剪枝，本質上跟 `React.memo` 是同一招，也跟第七節的 `Object.is` 是同一件事。

### 形態二：Signals（v16 引入，v21 起 zoneless 成為預設）

| 零件 | 有沒有 | 做法 |
| --- | --- | --- |
| a 攔截 | **有，第三種手段：函式呼叫** | 讀值要寫 `count()` |
| b 依賴收集 | **有** | `activeConsumer`，跟 Vue 的 `activeEffect` 是同一套機制 |
| c 觸發更新 | **有** | 標記 view 為 dirty 再排程 |

這招最漂亮的地方在於：**第二節講的兩種「偷聽」能力，Signals 一種都不用。**

Vue 費盡力氣讓「讀屬性」看起來像在讀屬性、實際上偷偷執行程式（getter 或 Proxy）。Signals 乾脆**放棄偽裝**，直接叫你加括號 —— 而呼叫函式本來就會執行一段程式，語言層根本不需要被繞過。

手寫出來只有十幾行：

```js
function signal (initial) {
  let value = initial
  const subscribers = new Set()            // 這個 signal 專屬的訂閱清單

  const read = () => {
    if (activeConsumer) subscribers.add(activeConsumer)   // 零件 b：依賴收集
    return value                                          // 零件 a：攔截就是這次呼叫本身
  }
  read.set = (next) => {
    if (Object.is(value, next)) return                    // 值沒變就不通知，省一輪
    value = next
    for (const fn of subscribers) fn()                    // 零件 c：觸發更新
  }
  return read
}
```

白話解釋這段：`signal()` 回傳的不是值，是一個**函式**。這個函式被呼叫時做兩件事 —— 把現在正在跑的那個消費者記進訂閱清單，然後回傳值。`set` 則是先用 `Object.is` 擋掉「設成同一個值」的情況，再把清單上的人全部叫醒。

這正好扣回第二節那個 `person.greeting` 與 `person.greeting()` 的對照：**getter 是「函式已經幫你執行完，你拿到的是結果」，signal 是「你自己加括號執行」。** 同一件事，一個藏起來，一個攤開來。

副作用是 `signal(42)` 可以**直接裝數字**，不需要 `.value` —— 因為第三節證明過 `new Proxy(42, {})` 會直接丟 TypeError，但函式沒有這個限制。實測：

```
改了沒人讀的 unrelated：畫面重算 0 次
signal(42) 直接裝數字，讀出來是 42
對照組 new Proxy(42, {})：TypeError
```

**一個要誠實講的瑕疵**：我這份手寫 signal 在 `count` 同時被畫面與 `computed` 讀到時，畫面會重算 **2 次**而不是 1 次。這是菱形依賴造成的 **glitch（抖動）**，真實的 Angular 與 [TC39 Signals 提案](https://github.com/tc39/proposal-signals)都用拓撲排序解掉了，我沒有實作。

### zoneless 之後，誰還能觸發更新

[官方文件](https://angular.dev/guide/zoneless)列的觸發來源只有六個：

- a. `ChangeDetectorRef.markForCheck`
- b. signal 被更新，而且那個 signal 有被樣板讀到
- c. `AsyncPipe` 收到新的值
- d. `ComponentRef.setInput`
- e. 樣板或 host 上綁定的事件監聽
- f. 掛載一個已經被上面任一種標髒的 view

**注意這份清單沒有「時間到了」「網路回來了」這種東西。** 從「有事發生就全查」變成「你講我才查」，這就是 Angular 補上零件 b 之後最實際的差別。

---

## 十一、那這三個框架的元件樹長得一樣嗎

**不一樣，而且其中一個根本不是樹。**

這一節是上一節的自然延伸，因為**樹的形狀不是設計品味，是三零件選擇的後果** —— 你在「怎麼知道資料變了」上選了什麼，就決定了你需要一個什麼形狀的結構來善後。

### 先看結論表

| | React | Vue 3 | Angular（Ivy） |
| --- | --- | --- | --- |
| 有虛擬 DOM 嗎 | **有** | **有，但編譯器讓它跳過大半** | **沒有** |
| 執行期的主結構 | Fiber node 物件 | VNode 樹 ＋ 元件實例樹 | `LView` ／ `TView` **陣列** |
| 怎麼連到下一個 | `child` ／ `sibling` ／ `return` 三個指標 | `children` 陣列 | **陣列索引** |
| 靜態與動態有分開嗎 | **沒有**，全部重跑 | **有**，patch flag ＋ block tree | **有**，`TView` 存靜態、`LView` 存動態 |
| 更新時走多少節點 | 整棵（可被 memo 剪枝） | 只走 `dynamicChildren` | 依索引直接檢查綁定 |
| 有沒有兩棵樹 | **有**，`alternate` 雙緩衝 | 新舊 VNode 兩棵 | **沒有**，原地更新陣列 |

### React：單向鏈表 ＋ 雙緩衝

[React 原始碼的 `ReactInternalTypes.js`](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactInternalTypes.js) 裡，Fiber 的註解直接寫著 "Singly Linked List Tree Structure"（單向鏈表樹結構）。三個指標分別是：

- a. `child` —— 指向第一個子節點
- b. `sibling` —— 指向下一個兄弟節點
- c. `return` —— 指回父節點，註解寫的是「處理完這個之後要回去的那個 Fiber」

白話解釋這個結構：它不是「一個節點拿著一個子節點陣列」，而是**一條可以用迴圈走完、而且隨時能停下來記住位置、之後再接著走的鏈**。這個形狀是為了**可中斷**而選的 —— 因為 React 沒有依賴收集，每次更新都得走一大片，走太久會卡住主執行緒，所以它需要一個能走到一半放手、之後再從原地接回去的結構。陣列的遞迴走法做不到這件事，鏈表可以。

另外那個 `alternate` 欄位，官方註解寫的是 "This is a pooled version of a Fiber. Every fiber that gets updated will eventually have a pair."。白話解釋：**同一個元件永遠有兩個 Fiber 物件輪流當班** —— 一個是畫面上現在這棵（current），一個是正在算的那棵（workInProgress），算完就交換身分。這叫**雙緩衝（double buffering）**，好處是算到一半出錯可以整棵丟掉，畫面上那棵完全沒被動過。

**這兩個設計都是「沒有零件 b」的直接後果。** 因為不知道是誰變了，只能整片重算，所以必須讓「整片重算」這件事變得可中斷、可丟棄。

### Vue 3：一樣是 VNode，但編譯器先幫它把路縮短了

Vue 的虛擬 DOM 節點長得跟 React 的 element 很像，就是普通物件。真正的差別在於 **Vue 同時掌握編譯器與執行期**，所以它可以在編譯階段就先做標記。[官方文件「渲染機制」](https://vuejs.org/guide/extras/rendering-mechanism.html)講了三層優化：

- a. **Patch Flag（更新標記）** —— 編譯器把「這個節點只有 class 會變」這件事編成一個數字存進 VNode，執行期用位元運算檢查。官方的說法是「With the patch flags, Vue is able to do the least amount of work necessary when updating elements with dynamic bindings」。
- b. **Block Tree（區塊樹）／ Tree Flattening（樹扁平化）** —— 一個 block 會把它底下**所有帶 patch flag 的子孫節點收進一個扁平陣列**。官方原話：「When this component needs to re-render, it only needs to traverse the flattened tree instead of the full tree... Any static parts of the template are effectively skipped.」
- c. **Static Hoisting（靜態提升）** —— 純靜態的元素被提到 render 函式外面快取起來，連續的靜態元素還會被壓成一段 HTML 字串用 `innerHTML` 掛上去。

白話解釋這三層在幹嘛：**Vue 在編譯的時候就把「哪些地方會變」標好了，執行期只要照著那份名單走，靜態的部分連看都不看。** 這跟零件 b 是同一個思路的不同層次 —— 零件 b 在**執行期**記「誰讀了哪個值」，patch flag 在**編譯期**記「哪個節點會變」。Vue 兩層都做了，這是它能同時保有模板語法與效能的原因。

### Angular：沒有虛擬 DOM，它用的是兩個扁平陣列

這是三者裡差最多的一個。[Angular 原始碼的 `VIEW_DATA.md`](https://github.com/angular/angular/blob/main/packages/core/src/render3/VIEW_DATA.md) 寫得很直白：「Both `LView` and `TView.data` are arrays whose indices refer to the same item.」

兩個陣列**索引一一對應**，分工是這樣：

- a. **`TView`（Template View）** —— 每個元件**類型**共用一份，存的是編譯期就確定的東西：節點之間的父子關係、屬性名稱、指令型別。官方說法是「`TView.data` contains information on relationships and property labels」。
- b. **`LView`（Logical View）** —— 每個元件**實例**各有一份，存的是執行期的東西：真實 DOM 節點、上一次的綁定值。官方說法是「`LView` contains DOM instances and previous binding values only」。

白話解釋這個設計：**把「不會變的」跟「會變的」拆成兩個陣列，用同一組索引對齊。** 所以你畫面上開了 100 個一樣的元件，`TView` 只有一份，`LView` 有 100 份，而且 `LView` 裡面只裝真正會變動的資料 —— 記憶體省很多。

而且它**沒有虛擬 DOM**，所以不存在「產生新樹再跟舊樹 diff」這回事。改變偵測時，Angular 直接走到索引 `n`，把新算出來的綁定值跟 `LView[n]` 存的舊值比一下，不一樣就直接改 DOM。

**為什麼是陣列而不是物件樹**：因為 Zone.js 時代的 Angular 沒有零件 b，每次改變偵測都要**把所有綁定都檢查一遍**，而「從頭到尾跑完一個扁平陣列」是 JavaScript 引擎最擅長的事之一 —— 索引連續、型別穩定、對快取友善。既然注定要全查，那就讓「全查」這件事本身變便宜。

這跟 React 的選擇形成很有意思的對照：

- **React 注定要走一大片，於是把結構做成「可以中途放手」的鏈表。**
- **Angular 注定要查全部，於是把結構做成「查得最快」的陣列。**
- **Vue 有零件 b 知道是哪個元件，加上編譯器知道是哪個節點，於是根本不需要走一大片。**

### 一句話收束

**三個零件的選擇決定了元件樹的形狀，不是反過來。** 下次有人問你「React 跟 Vue 差在哪」，如果答案停在「一個 JSX 一個模板」，那就只講到了最表面的那一層 —— 真正的分歧從「要不要在讀取時記帳」那一刻就開始了，一路長到連資料結構是鏈表、物件樹還是陣列都不一樣。

---

## 十二、完整 demo 原始碼

檔名：`day23-three-parts-of-reactivity.js`
執行：`node day23-three-parts-of-reactivity.js`

```js
/**
 * Day 23 demo：攔截、收集、觸發 —— 一個響應式系統的三個零件
 *
 * Part A —— 存取器屬性是「讀一個屬性卻執行了一段程式」
 * Part B —— 三零件湊齊才叫響應式，缺一個是什麼下場
 * Part C —— React 的 pull 模型在同一個情境下實際多做了幾次工
 * Part D —— 規模拉到 200 個欄位時兩種模型的工作量差距（實測毫秒）
 * Part E —— 為什麼「原地改物件」在 React 眼裡等於什麼都沒發生
 *
 * 全部都是手寫的最小模型，不是 React 或 Vue 的原始碼。
 */

'use strict'

const line = (t = '') => console.log(t)
const title = (t) => { line(); line('━'.repeat(64)); line(t); line('━'.repeat(64)) }

// ══════════════════════════════════════════════════════════
// Part A：存取器屬性 —— 「讀」這個動作本身可以被劫持
// ══════════════════════════════════════════════════════════
title('Part A：存取器屬性 —— 讀一個屬性，其實執行了一段程式')

let readCount = 0

const person = {
  _name: 'Abby',
  // get 開頭的屬性叫取值器（getter）。它不存值，存的是一段程式。
  get name () {
    readCount++
    return this._name
  },
  // set 開頭的屬性叫設值器（setter）。賦值時會被它接走。
  set name (v) {
    this._name = v
  }
}

person.name
person.name
person.name = 'Bob'
line(`讀了兩次 person.name，getter 被執行了 ${readCount} 次，目前的值是 ${person.name}`)
line('→ 到這裡 readCount 變成 3，因為上一行的樣板字串又讀了一次')

// get name() { return this.name } 會讀到自己 → 再觸發 getter → 無限遞迴。
const trap = {
  get boom () { return this.boom }
}
try {
  trap.boom
} catch (err) {
  line(`→ get boom() { return this.boom } 的下場：${err.constructor.name}: ${err.message}`)
}

// ══════════════════════════════════════════════════════════
// Part B：三個零件 —— 攔截、依賴收集、觸發更新
// ══════════════════════════════════════════════════════════
title('Part B：三個零件湊齊才叫響應式')

let activeEffect = null            // 現在正在執行的 effect
const depsMap = new Map()          // 訂閱清單

let trackCalls = 0
let triggerCalls = 0
let effectRuns = 0

// ── 零件 b：依賴收集 ──
function track (key) {
  trackCalls++
  if (!activeEffect) return
  if (!depsMap.has(key)) depsMap.set(key, new Set())
  depsMap.get(key).add(activeEffect)
}

// ── 零件 c：觸發更新 ──
function trigger (key) {
  triggerCalls++
  const subs = depsMap.get(key)
  if (!subs) return
  for (const fn of subs) fn()
}

// ── 零件 a：攔截 ──
function reactive (target) {
  return new Proxy(target, {
    get (obj, key) {
      track(key)
      return Reflect.get(obj, key)
    },
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      trigger(key)
      return ok
    }
  })
}

// 把一個函式註冊成 effect：先把自己設成 activeEffect，再跑一次讓它去讀資料。
function effect (fn) {
  const wrapped = () => {
    effectRuns++
    activeEffect = wrapped
    fn()
    activeEffect = null
  }
  wrapped()
  return wrapped
}

const state = reactive({ count: 0, unrelated: 'x' })

let lastPainted = null
effect(() => { lastPainted = `畫面：count = ${state.count}` })

const runsAfterRegister = effectRuns
state.unrelated = 'y'
line(`改了沒人讀的 unrelated：effect 重跑 ${effectRuns - runsAfterRegister} 次（訂閱清單裡沒有它）`)

state.count = 1
line(`改了有人讀的 count    ：effect 重跑 ${effectRuns - runsAfterRegister} 次，${lastPainted}`)
line(`零件 b track 共 ${trackCalls} 次，零件 c trigger 共 ${triggerCalls} 次`)

// ── 拆掉零件 b，看看會怎樣 ──
let noTrackEffectRuns = 0
const noTrackSubs = new Set()
function reactiveWithoutTrack (target) {
  return new Proxy(target, {
    get (obj, key) { return Reflect.get(obj, key) },
    set (obj, key, value) {
      const ok = Reflect.set(obj, key, value)
      for (const fn of noTrackSubs) fn()
      return ok
    }
  })
}
const s2 = reactiveWithoutTrack({ a: 0, b: 0, c: 0 })
noTrackSubs.add(() => { noTrackEffectRuns++ })
noTrackSubs.add(() => { noTrackEffectRuns++ })
noTrackSubs.add(() => { noTrackEffectRuns++ })
s2.a = 1
line(`→ 拆掉零件 b 之後，只改 a 一個欄位，三個 effect 全部重跑了 ${noTrackEffectRuns} 次`)

// ── 零件 a 的天花板：Proxy 包不住原始型別 ──
try {
  new Proxy(0, {})
} catch (err) {
  line(`→ new Proxy(0, {}) 的下場：${err.constructor.name}: ${err.message}`)
}

// Vue 的 ref 怎麼繞過：先造一個物件，把值塞進具名屬性，再對那個屬性掛 getter/setter。
class RefImpl {
  constructor (value) { this._value = value }
  get value () { track('value'); return this._value }
  set value (v) { this._value = v; trigger('value') }
}
const r = new RefImpl(0)
r.value = 5
line(`→ RefImpl 用具名屬性 value 繞過 Proxy 的限制，現在 r.value = ${r.value}`)

// ══════════════════════════════════════════════════════════
// Part C：React 的 pull 模型 —— 三個零件一個都不做
// ══════════════════════════════════════════════════════════
title('Part C：pull 模型 —— 不攔截、不收集、只重跑再比對')

function createPullRuntime (initialState, componentFn) {
  let current = { ...initialState }
  let prevTree = null
  const stats = { componentRuns: 0, nodesCreated: 0, nodesDiffed: 0, domWrites: 0 }

  // current 是一個普通物件，沒有 Proxy 也沒有 getter。
  function render () {
    stats.componentRuns++
    const tree = componentFn(current, stats)
    if (prevTree) {
      for (let i = 0; i < tree.length; i++) {
        stats.nodesDiffed++
        if (prevTree[i] !== tree[i]) stats.domWrites++
      }
    } else {
      stats.domWrites += tree.length
    }
    prevTree = tree
  }

  // setState 就是「主動通報」。React 沒有攔截層，所以這個呼叫本身就是訊號。
  function setState (patch) {
    current = { ...current, ...patch }
    render()
  }

  render()
  return { setState, stats }
}

const FIELDS = 200
const initial = {}
for (let i = 0; i < FIELDS; i++) initial['f' + i] = 0

function Dashboard (s, stats) {
  const out = []
  for (let i = 0; i < FIELDS; i++) {
    stats.nodesCreated++
    out.push('f' + i + ':' + s['f' + i])
  }
  return out
}

const pull = createPullRuntime(initial, Dashboard)
const afterMount = { ...pull.stats }
pull.setState({ f7: 1 })

line(`只改 1 個欄位（f7），pull 模型做了：`)
line(`  元件函式重跑     ${pull.stats.componentRuns - afterMount.componentRuns} 次`)
line(`  產生新節點       ${pull.stats.nodesCreated - afterMount.nodesCreated} 個`)
line(`  逐一比對節點     ${pull.stats.nodesDiffed - afterMount.nodesDiffed} 次`)
line(`  真正寫進 DOM     ${pull.stats.domWrites - afterMount.domWrites} 次`)
line('→ 最後真的要改的只有 1 個節點，但它為了「找出是哪一個」付了 400 次的代價')

// ══════════════════════════════════════════════════════════
// Part D：規模量測 —— 兩種模型各自的成本結構
// ══════════════════════════════════════════════════════════
title('Part D：實測 —— push 省在更新，pull 省在啟動')

function benchPush (fields, updates) {
  const localDeps = new Map()
  let active = null
  const obj = {}
  for (let i = 0; i < fields; i++) obj['f' + i] = 0

  const p = new Proxy(obj, {
    get (o, k) {
      if (active) {
        if (!localDeps.has(k)) localDeps.set(k, new Set())
        localDeps.get(k).add(active)
      }
      return Reflect.get(o, k)
    },
    set (o, k, v) {
      const ok = Reflect.set(o, k, v)
      const subs = localDeps.get(k)
      if (subs) for (const fn of subs) fn()
      return ok
    }
  })

  const t0 = performance.now()
  // 啟動階段：每個欄位註冊一個 effect，這是 push 模型要先付的錢。
  for (let i = 0; i < fields; i++) {
    const fn = () => { void p['f' + i] }
    active = fn; fn(); active = null
  }
  const t1 = performance.now()
  // 更新階段：每次只改一個欄位。
  for (let u = 0; u < updates; u++) p['f' + (u % fields)] = u
  const t2 = performance.now()
  return { setup: t1 - t0, update: t2 - t1 }
}

function benchPull (fields, updates) {
  let state = {}
  for (let i = 0; i < fields; i++) state['f' + i] = 0
  let prev = null

  const renderOnce = () => {
    const tree = new Array(fields)
    for (let i = 0; i < fields; i++) tree[i] = 'f' + i + ':' + state['f' + i]
    if (prev) for (let i = 0; i < fields; i++) { if (prev[i] !== tree[i]) { /* dom write */ } }
    prev = tree
  }

  const t0 = performance.now()
  renderOnce()
  const t1 = performance.now()
  for (let u = 0; u < updates; u++) {
    state = { ...state, ['f' + (u % fields)]: u }   // 不可變更新：複製一份新的
    renderOnce()
  }
  const t2 = performance.now()
  return { setup: t1 - t0, update: t2 - t1 }
}

const FIELDS_BENCH = 200
const UPDATES = 2000
// 先空跑一輪讓 JIT（Just-In-Time 即時編譯器）暖機，否則第一輪會被編譯成本汙染。
benchPush(FIELDS_BENCH, UPDATES); benchPull(FIELDS_BENCH, UPDATES)

const push = benchPush(FIELDS_BENCH, UPDATES)
const pullB = benchPull(FIELDS_BENCH, UPDATES)

line(`情境：${FIELDS_BENCH} 個欄位，連續 ${UPDATES} 次「只改其中 1 個」`)
line('')
line('                  啟動（毫秒）    更新（毫秒）')
line(`push（三零件）      ${push.setup.toFixed(2).padStart(8)}      ${push.update.toFixed(2).padStart(8)}`)
line(`pull（重跑＋比對）  ${pullB.setup.toFixed(2).padStart(8)}      ${pullB.update.toFixed(2).padStart(8)}`)
line('')
line(`更新階段的倍數差：pull 是 push 的 ${(pullB.update / push.update).toFixed(1)} 倍`)
line(`啟動階段的倍數差：push 是 pull 的 ${(push.setup / pullB.setup).toFixed(1)} 倍`)

// Proxy 本身的讀取成本：這是 push 模型隱形的常態稅。
const plain = { v: 1 }
const wrapped = new Proxy({ v: 1 }, { get: (o, k) => Reflect.get(o, k) })
const N = 3_000_000
let sink = 0
let t = performance.now(); for (let i = 0; i < N; i++) sink += plain.v
const plainMs = performance.now() - t
t = performance.now(); for (let i = 0; i < N; i++) sink += wrapped.v
const proxyMs = performance.now() - t
line('')
line(`讀 ${N.toLocaleString('en-US')} 次屬性：普通物件 ${plainMs.toFixed(1)} 毫秒，Proxy ${proxyMs.toFixed(1)} 毫秒（${(proxyMs / plainMs).toFixed(1)} 倍）`)
line(`（sink = ${sink}，只是避免引擎把整個迴圈最佳化掉）`)

// ══════════════════════════════════════════════════════════
// Part E：為什麼原地改物件等於什麼都沒發生
// ══════════════════════════════════════════════════════════
title('Part E：Object.is 看的是盒子，不是盒子裡的東西')

const user = { name: 'Abby', profile: { age: 20 } }

const mutated = user
mutated.name = 'Bob'
line(`原地改：Object.is(舊, 新) = ${Object.is(user, mutated)}  → React 判定沒變，不重繪`)

const copied = { ...user, name: 'Cathy' }
line(`給新物件：Object.is(舊, 新) = ${Object.is(user, copied)} → React 判定變了，重繪`)

// 淺複製的陷阱：第一層是新的，第二層還是同一個參考。
line(`淺複製後 profile 還是同一個嗎：${Object.is(user.profile, copied.profile)}`)
copied.profile.age = 99
line(`→ 改 copied.profile.age，原始的 user.profile.age 也變成 ${user.profile.age}`)
line('   所以巢狀物件要一層一層複製：{ ...user, profile: { ...user.profile, age: 99 } }')

// 陣列同理：push 是原地改，map / filter / concat 才回傳新陣列。
const todos = [{ id: 1 }]
const pushed = todos
pushed.push({ id: 2 })
line(`陣列 push 之後 Object.is(舊, 新) = ${Object.is(todos, pushed)} → 一樣看不見`)
const spread = [...todos, { id: 3 }]
line(`陣列展開之後 Object.is(舊, 新) = ${Object.is(todos, spread)} → 看得見`)

line()
line('━'.repeat(64))
line('結論：push 用「記帳」換更新時的精準，pull 用「重算」換啟動時的輕與資料流的顯式。')
line('      React 三個零件一個都不做，不是做不到，是它把成本放在另一邊。')
line('━'.repeat(64))
```

---

## 十三、延伸練習

這幾題是把今天的零件拆開來各自手寫一遍，做完會比看十篇文章有用。

- a. [LeetCode 2694. Event Emitter](https://leetcode.com/problems/event-emitter/) —— 訂閱與通知，就是零件 b 和 c 的最小骨架。做完你會發現 `depsMap` 跟 EventEmitter 的 `listeners` 是同一個東西。
- b. [LeetCode 2695. Array Wrapper](https://leetcode.com/problems/array-wrapper/) —— `Symbol.toPrimitive`，跟零件 a 同一條「攔截語言行為」的線。
- c. [LeetCode 2705. Compact Object](https://leetcode.com/problems/compact-object/) —— 不可變思維的暖身，回傳新物件而不是原地改。
- d. [LeetCode 2625. Flatten Deeply Nested Array](https://leetcode.com/problems/flatten-deeply-nested-array/) —— 巢狀結構的遞迴複製，正好對應第七節那個淺複製陷阱。
- e. [LeetCode 2637. Promise Time Limit](https://leetcode.com/problems/promise-time-limit/) —— 順手複習 Day 20 的競態處理。

---

## 十四、這篇的每個說法各自從哪來

**一、有外部出處的部分**

| 內容 | 出處 |
| --- | --- |
| React Compiler 是 build-time 工具、做自動 memoization、可做條件式 memoization | React 官方部落格：https://react.dev/blog/2025/10/07/react-compiler-1 （發布日 2025-10-07） |
| `Object.is` 的比較語意 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is |
| Proxy 的 target 必須是物件、13 種 trap | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy |
| getter／setter 語法與存取器屬性定義 | MDN：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get |
| Vue 的 `track()` ／ `trigger()` 與依賴收集流程 | Vue 官方文件，深入響應式系統：https://vuejs.org/guide/extras/reactivity-in-depth.html |
| Vue 2 用 `Object.defineProperty`、新增屬性偵測不到 | Vue 2 官方文件，深入響應式原理：https://v2.vuejs.org/v2/guide/reactivity.html |
| React 不可變更新與 `useRef` 不觸發重繪 | React 官方文件：https://react.dev/learn/updating-objects-in-state ／ https://react.dev/reference/react/useRef |
| Signals 提案在 Stage 1、"can currently be thought of as Stage 0"、自動依賴發現與 glitch-free | TC39 提案 repo：https://github.com/tc39/proposal-signals |
| React scheduler 套件實際存在 | React 原始碼：https://github.com/facebook/react/tree/main/packages/scheduler |
| Fiber 是 "Singly Linked List Tree Structure"、`child` ／ `sibling` ／ `return` 的定義、`alternate` 是 pooled 版本（雙緩衝） | React 原始碼 `ReactInternalTypes.js`：https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactInternalTypes.js |
| Zone.js「captures asynchronous operations like `setTimeout`, network requests, and event listeners」、「Angular schedules change detection based on signals from Zone.js」 | Angular 官方文件，Zone pollution：https://angular.dev/best-practices/zone-pollution |
| zoneless 在 v21＋ 是預設、六種觸發來源清單 | Angular 官方文件，Zoneless：https://angular.dev/guide/zoneless |
| `LView` 與 `TView.data` 都是陣列且索引一一對應、兩者各自存什麼 | Angular 原始碼 `VIEW_DATA.md`：https://github.com/angular/angular/blob/main/packages/core/src/render3/VIEW_DATA.md |
| Patch Flag、Block Tree ／ Tree Flattening、Static Hoisting，以及「Any static parts of the template are effectively skipped」 | Vue 官方文件，渲染機制：https://vuejs.org/guide/extras/rendering-mechanism.html |
| Angular 目前版本 22.1.7（2026-09-16）與各版本支援期限 | endoflife.date：https://endoflife.date/angular |

**二、我實際跑出來的部分**

第三、四、五、六、七節所有的次數與毫秒數，全部由 `day23-three-parts-of-reactivity.js` 實測產生（Node.js v22.23.2，2026-09-24 執行，連跑四輪），可以重跑驗證。包含：

- 「改沒人讀的欄位重跑 0 次、改有人讀的欄位重跑 1 次」
- 「拆掉零件 b 之後三個 effect 全部重跑 3 次」
- 「pull 模型改 1 個欄位付出 200 次建節點 ＋ 200 次比對」
- 啟動 0.04 ～ 0.16 毫秒、更新 1.4 ～ 119 毫秒的區間
- Proxy 讀取慢 8 ～ 18 倍
- `Object.is` 在原地改／新物件／淺複製／陣列 push 四種情況的結果

**Part B 到 Part D 的 `reactive`、`track`、`trigger`、`createPullRuntime` 全是我手寫的最小模型，不是 Vue 或 React 的原始碼。** 它們只示範三個零件各自負責什麼，真實實作牽涉排程、批次、並行 render 與 glitch 處理，複雜得多。

**三、我自己的整理與判斷（沒有外部出處）**

- 把響應式系統拆成「攔截 / 依賴收集 / 觸發更新」三個零件來定位各家框架，這個切法是我整理的講法，不是官方術語。
- 「React 有 scheduler，但沒有以值為單位的訂閱清單」這個更正，以及據此主張原本標 ❌ 是寫太滿。
- 「push 把成本付在執行期、React Compiler 把成本付在編譯期」這個對照。
- 「React 的取捨是每次更新多付一點算力，換每次除錯少付很多時間」這句總結。
- 第六節四項代價的排序與「隱式資料流無法量化但在大型專案最有感」這個判斷。

第十節的 Angular 兩種形態，由 `day23b-angular-signal-model.js` 實測產生（同樣是 Node.js v22.23.2，2026-09-24 執行）。包含「3 次 setTimeout 攔截、3 輪 change detection、150 次綁定比對，其中 2 輪是白跑的」，以及手寫 signal 的三個結果。**這兩支 demo 裡的 `tick()`、`signal()`、`computed()` 一樣全是我手寫的最小模型，不是 Angular 原始碼**，而且我手寫的 signal 有菱形依賴的 glitch，真實實作用拓撲排序解掉了。

**四、我沒有實作驗證的部分**

- Solid、Svelte 5 runes 那兩列，我是讀各自文件整理的，**沒有在這個系列裡實際寫過**。
- 第十一節說「Angular 選陣列是因為注定要全查，所以讓全查變便宜」，這是我對 `VIEW_DATA.md` 那個資料結構的**解釋**，不是官方說法。官方只說了它是什麼，沒說為什麼選它。
- 第十一節說 Angular signals 的觸發粒度落在 view（元件）層而不是單一 DOM 綁定，這是我讀文件整理的推論，我沒有實際量測過。如果要照著用請以官方文件為準。
- 第六節說的「元件卸載時訂閱清單沒清乾淨會記憶體洩漏」，是機制上的推論，我沒有實際做過洩漏測試。
- Proxy 難以被引擎做 Inline Cache 最佳化，這是我對量測結果的解釋，我沒有讀 V8 原始碼確認。

**五、一個要講清楚的量測限制**

第五節的 push 與 pull 都是我手寫的最小模型，**不是 Vue 與 React 本身**。真實的 React 有 Fiber、批次更新、時間切片，真實的 Vue 有 effect 排程與去重，兩邊的實際數字都會跟這裡不同。這組數字要證明的是**成本結構的方向**（push 省在更新、pull 省在啟動），不是「Vue 比 React 快 N 倍」。拿這組數字去說哪個框架比較快，是誤用。

（查閱日期：2026-09-24。程式碼實測於 Node.js v22.23.2）

---

## 明天

今天講的是 React **不做**什麼。明天 Day 24 反過來看它**做**了什麼 —— 直接打開 React 原始碼，讀 `Component.prototype.setState` 那幾行，以及為什麼 React 內部到處都是 `hasOwnProperty.call(obj, key)` 而不是 `obj.hasOwnProperty(key)`。

那個 `.call` 的寫法，就是 Day 10 講的靜態方法與實例方法的分別在真實專案裡的樣子。
