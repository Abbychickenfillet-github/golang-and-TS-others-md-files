---
title: Console 方法家族一次講完｜table、dir、group、time、assert
tags: [javascript, console, devtools, debug, 除錯]
created: 2026-08-19
source:
  - MDN console.table()（頁面最後更新 2025-07-04）
  - MDN console（頁面最後更新 2025-02-13）
---

# Console 方法家族一次講完

> [!info] 為什麼會有這篇
> 起因是 [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] 裡用了 `console.table` 印比較表，
> 你問「這個 table 是什麼」。那篇在講「怎麼把資料撈出來」，這篇在講「怎麼把撈出來的資料印得看得懂」，是同一件事的前後兩半。

---

## a. 先講你問的那一行

```js
console.table(Object.getOwnPropertyNames(Object.prototype));
```

拆成兩層看：

1. **內層** `Object.getOwnPropertyNames(Object.prototype)` 回傳一個**陣列**，內容是 12 個字串
2. **外層** `console.table(陣列)` 把這個陣列印成**表格**，而不是印成一行 `["constructor", "__defineGetter__", ...]`

差別就是可讀性。同樣的資料，`console.log` 印出來要橫著讀，`console.table` 印出來是一欄一列。

---

## b. console.table 的三種輸入長什麼樣

### b-1. 原始值陣列 → 兩欄

```js
console.table(["apples", "oranges", "bananas"]);
```

| (index) | Values |
| --- | --- |
| 0 | 'apples' |
| 1 | 'oranges' |
| 2 | 'bananas' |

`(index)` 是陣列索引，`Values` 這一欄只在「陣列裡裝的是原始值」時才出現。

### b-2. 物件陣列 → 每個屬性自成一欄

```js
console.table([
  { firstName: "Tyrone", lastName: "Jones" },
  { firstName: "Janet",  lastName: "Smith" },
]);
```

| (index) | firstName | lastName |
| --- | --- | --- |
| 0 | 'Tyrone' | 'Jones' |
| 1 | 'Janet' | 'Smith' |

這是最實用的用法，也是你之後印比較表都會用的形狀。

### b-3. 物件的物件 → 屬性名當列標題

```js
console.table({ abby: { age: 20 }, bob: { age: 30 } });
```

`(index)` 欄變成 `abby`、`bob`，不再是 0、1。

### b-4. 第二個參數：只印你要的欄

```js
console.table(people, ["firstName"]);   // 只顯示 firstName 這一欄
```

MDN 明列的限制：Firefox 最多顯示 1000 列（含表頭），且這個方法在 Web Worker 裡也能用。

---

## c. console.log 與 console.dir 差在哪

這是最多人搞混的一組：

| 方法 | 行為 | 什麼時候用 |
| --- | --- | --- |
| `console.log(obj)` | 印一般訊息。傳 **DOM 元素**時 Chrome 會印成 **HTML 標籤樣子**，可以點開看子節點 |
| `console.dir(obj)` | 一律印成**可展開的屬性列表**，就是那個有三角形可以點的樣子 |

```js
const el = document.body;
console.log(el);   // <body>...</body>   看起來像 Elements 分頁
console.dir(el);   // body ▸ accessKey, align, ...  看得到所有 JS 屬性
```

所以要**看一個物件到底有哪些屬性與原型**，用 `console.dir`。要看 DOM 結構，用 `console.log`。
這也是為什麼上一篇要看 `Object.prototype` 的成員時我用的是 `console.dir(Object.prototype)`。

---

## d. 完整家族分類

MDN 把 console 的方法分成這幾類：

### d-1. 印訊息（差別只在等級與圖示）

| 方法 | 說明 |
| --- | --- |
| `console.log()` | 一般訊息 |
| `console.info()` | 資訊等級，Chrome 顯示上跟 log 幾乎一樣 |
| `console.warn()` | 警告等級，黃色底加驚嘆號，可在 DevTools 用等級篩選 |
| `console.error()` | 錯誤等級，紅色底，**會附上呼叫堆疊** |
| `console.debug()` | 除錯等級，Chrome 預設**隱藏**，要在 Levels 勾 Verbose 才看得到 |

> [!tip] 實用小技巧
> 用 `warn` 與 `error` 而不是全部用 `log`，是為了之後可以在 DevTools 右上角的 Levels 下拉選單過濾。
> 專案大起來以後這個差別很有感。

### d-2. 結構化輸出

| 方法 | 說明 |
| --- | --- |
| `console.table(data, columns?)` | 印成表格。本篇 b 節 |
| `console.dir(obj)` | 印成可展開屬性列表。本篇 c 節 |
| `console.dirxml(obj)` | 印成 XML／HTML 樹狀 |
| `console.group(label)` | 開一個可摺疊的群組，之後的輸出全部縮排一層 |
| `console.groupCollapsed(label)` | 同上但**預設收合** |
| `console.groupEnd()` | 關掉最內層的群組 |

```js
console.group("使用者資料");
console.log("name: Abby");
console.log("age: 20");
console.groupEnd();
```

### d-3. 計時與計次

| 方法 | 說明 |
| --- | --- |
| `console.time(label)` | 開始計時，同時最多 10000 個計時器 |
| `console.timeLog(label)` | 印出目前經過的毫秒數，但**不停止** |
| `console.timeEnd(label)` | 停止計時並印出總毫秒數 |
| `console.count(label)` | 印出「這行被跑過幾次」 |
| `console.countReset(label)` | 把計數器歸零 |
| `console.timeStamp(label)` | 在效能面板的時間軸上插一個標記 |

```js
console.time("排序");
bigArray.sort();
console.timeEnd("排序");     // 排序: 12.345ms
```

這組在「這段程式碼是不是效能瓶頸」的時候比 `Date.now()` 相減方便很多。

### d-4. 斷言與追蹤

| 方法 | 說明 |
| --- | --- |
| `console.assert(條件, 訊息)` | 條件為 **false** 時才印錯誤。條件為 true 時完全靜音 |
| `console.trace()` | 印出從進入點到這一行的完整呼叫堆疊 |
| `console.clear()` | 清空主控台 |
| `console.profile()` ／ `profileEnd()` | 啟動與停止瀏覽器內建的效能分析器 |

```js
console.assert(user.age >= 18, "未成年", user);   // age < 18 才會印
```

> [!warning] assert 的邏輯是反的
> 很多人以為「條件成立才印」，實際上是**條件不成立才印**。名字叫 assert 就是「我斷言這件事是真的，如果不是就叫我」。

---

## e. 格式化字串（Chrome 常用）

`console.log` 的第一個參數可以放格式指示符：

| 指示符 | 意思 |
| --- | --- |
| `%s` | 字串 |
| `%d` ／ `%i` | 整數 |
| `%f` | 浮點數 |
| `%o` ／ `%O` | 物件 |
| `%c` | **套用 CSS 樣式**，最好玩的一個 |

```js
console.log("%c===== 探測開始 =====", "color:#8b5cf6; font-weight:bold; font-size:14px");
console.log("%s 今年 %d 歲", "Abby", 20);
```

`%c` 用來在一長串 log 裡標出重點段落，做示範檔的時候很好用。

---

## f. 三個常見誤解

| 誤解 | 實際情況 |
| --- | --- |
| `console.log(obj)` 印出來的是「當下的快照」 | **不一定**。Chrome 對物件是「展開時才求值」，所以你之後改了物件，點開看到的可能是新值。要快照請用 `console.log(JSON.parse(JSON.stringify(obj)))` 或 `structuredClone` |
| `console` 是 JavaScript 語言的一部分 | **不是**。它是宿主環境提供的 Web API，規範在 WHATWG Console Standard，不在 ECMA-262 裡。Node.js 有自己的實作，所以行為會有小差異 |
| 正式環境留著 console.log 沒差 | 會拖慢效能而且可能洩漏資料。建議用建置工具移除，或包一層自己的 logger |

---

## 參考來源

| 來源 | 網址 | 頁面最後更新 |
| --- | --- | --- |
| MDN｜console.table() | https://developer.mozilla.org/en-US/docs/Web/API/console/table_static | 2025-07-04 |
| MDN｜console | https://developer.mozilla.org/en-US/docs/Web/API/console | 2025-02-13 |

> [!note] 驗證方式
> 同資料夾的 `console-methods-練習.html` 是可執行檔，用瀏覽器開啟後按 F12 看 Console，
> 每一組方法都有對應按鈕，按下去就會在主控台看到實際輸出。

---

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| [[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] | 那篇是這篇的起因。那篇負責「撈資料」，這篇負責「印資料」 |
| [[Object建構子-plain-object的建立與存取]] | 用 `console.dir(Object.prototype)` 看 12 個成員，就是本篇 c 節在講的 log 與 dir 之別 |
| [[Object靜態方法速查]] | 那篇的範例也是開 F12 看 Console，搭配本篇的 table 會更好讀 |
| [[事件流與事件代理]] | 除錯事件冒泡時 `console.group` 加縮排最好用 |
