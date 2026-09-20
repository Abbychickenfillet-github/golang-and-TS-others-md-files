---
title: "content attribute vs IDL property（HTML 屬性與 JS 屬性的兩套系統），與 form 提交機制"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, html, webidl, idl-attribute, content-attribute, form, submit, query-string, name, dom]
aliases: [IDL屬性是什麼, HTML屬性與JS屬性差在哪, 表單提交機制]
related:
  - "[[HTML文件結構-DOCTYPE與骨架]]"
  - "[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]"
  - "[[textContent-innerText-innerHTML差異]]"
  - "[[window物件三種成員與滑鼠座標-client-screen-page-與innerHTML覆蓋陷阱]]"
  - "[[字串不可變性-JS-vs-C-與TDZ變數遮蔽]]"
  - "[[標準內建物件與全域物件-MDN十三大分類與static-vs-instance判準]]"
sources:
  - https://gemini.google.com/app/c2e73f83487fd392
updated: 2026-09-19
---

# content attribute vs IDL property，與 form 提交機制

> 本篇重點 a–n，共 14 個。
> 互動版（含主軸流程圖、點擊填空、是非題、申論題）：`content-attribute-vs-IDL-property-與表單提交機制.html`
> 可執行範例：同層的 `form-attribute-vs-property-demo.html`

> [!info]- 🔗 與既有筆記的關聯（為什麼放在這一層）
> a. 本篇的主角是「**同一個 `<input>`，在 HTML 原始碼裡叫 attribute、在 JS 物件上叫 property，兩套名字兩套值**」，這是 HTML 規格層面的東西，所以歸進 `html-basics/`。
> b. 與 [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]] 直接接得上：那篇講 parser 怎麼把 bytes 變成 DOM 節點，本篇接著講「**節點被建出來之後，它身上那兩套屬性是怎麼對應的**」——WebIDL 那一層正是那篇 Q7 講的「JS 側像 JS 物件，實體是 C++ 物件，中間隔一層 WebIDL 包裝」。
> c. 與 [[textContent-innerText-innerHTML差異]] 同屬「讀寫 DOM 的幾組容易搞混的名字」系列。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | IDL 屬性是什麼？ | IDL ＝ **Interface Definition Language**（Web 平台用的是 Web IDL）。IDL 屬性就是「**你在 JS 裡用 `元素.xxx` 讀寫的那個欄位**」 | §1 |
| Q2 | 那 HTML 屬性又是什麼？ | 規格正名叫 **content attribute**，是「**寫在標籤上的那串字**」，型別永遠是字串 | §1 |
| Q3 | 兩者永遠同步嗎？ | **不是**。`id`／`class` 會同步，但 `value`／`checked` 這組**使用者一動就分家** | §2 |
| Q4 | `<input type="submit">` 做了什麼？ | 按下去時**瀏覽器**打包整個 form 的資料，送到 `<form action>`，不需要自己寫 `onclick` | §3 |
| Q5 | 資料打包的 key 是哪來的？ | 是 `name` 屬性，**不是 `id`**。沒有 `name` 的欄位不會被送出 | §3 |
| Q6 | `text=mytext` 這串是什麼？ | 是 key=value 的 pair：`text` 來自 `name="text"`，`mytext` 是使用者輸入的值 | §3 |
| Q7 | `<button type="submit">` 跟 `<input type="submit">` 差在哪？ | 提交行為相同，差在 `<button>` **能包子元素**（圖示、粗體字），`<input>` 只能放純文字 | §3 |
| Q8 | `<button>` 不寫 `type` 會怎樣？ | 在 form 裡預設就是 `type="submit"`，會意外送出表單 | §3 |

---

## 1. 兩套系統：content attribute 與 IDL property

<mark style="background: #FFF3A3A6;">同一個元素有兩個身分</mark>：它是 HTML 原始碼裡的一段文字，也是 JS 裡的一個物件。兩邊各有一套屬性。

| | content attribute（HTML 屬性） | IDL property（JS 屬性） |
|---|---|---|
| 寫在哪 | HTML 標籤上 | JS 程式裡 |
| 長相 | `<input value="搜尋" maxlength="10">` | `el.value`、`el.maxLength` |
| 型別 | **永遠是字串**（連 `maxlength="10"` 都是字串 `"10"`） | 有真正的型別（Number、Boolean、DOMTokenList…） |
| 怎麼讀寫 | `el.getAttribute('value')` / `el.setAttribute('value', 'x')` | `el.value` / `el.value = 'x'` |
| 誰定義的 | HTML 規格的元素定義 | **Web IDL**，由規格用 `attribute DOMString value;` 這種語法宣告，瀏覽器據此在原型上生出 getter／setter |
| 代表什麼 | 這份文件**初始寫了什麼** | 這個元素**現在是什麼狀態** |

> [!note]+ 重點 b–d：名字為什麼這麼繞
> b. 中文常把兩者都翻成「屬性」，所以一定會混。<mark style="background: #BBFABBA6;">記英文就不會亂</mark>：HTML 上的叫 **attribute**，JS 物件上的叫 **property**。
> c. IDL 的全名是 <mark style="background: #ADCCFFA6;">**Interface Definition Language**（介面定義語言）</mark>，Web 平台用的方言叫 **Web IDL**。它不是給你寫的語言，是**規格作者拿來描述「這個介面有哪些成員、各是什麼型別」的語言**，瀏覽器實作者再照著它把 C++ 物件包成 JS 看得懂的樣子。
> &nbsp;&nbsp;&nbsp;&nbsp;所以你在 MDN 看到 `HTMLInputElement` 底下列的那一排 `value`、`checked`、`disabled`，全部都是從 Web IDL 定義生出來的 IDL property。
> d. 這也解釋了 [[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]] 裡「DOM 節點半對半不對是 JS 物件」那句話：<mark style="background: #D2B3FFA6;">實體是引擎的 C++ 物件，Web IDL 是那層翻譯</mark>。

---

## 2. 同步關係：分成三種，別一概而論

Gemini 說「兩者通常會同步」——<mark style="background: #FF5582A6;">這句話太模糊，實際上分三類，而最常用的 `value` 剛好是不同步的那一類</mark>。

| 類型 | 代表屬性 | 行為 | 白話 |
|---|---|---|---|
| 完全反映（reflect） | `id`、`className`／`class`、`href`、`title`、`placeholder` | 改一邊，另一邊立刻同步 | 兩邊是同一份資料的兩個入口 |
| 名字不同但仍反映 | `class` ↔ `el.className`、`for` ↔ `el.htmlFor`、`maxlength` ↔ `el.maxLength` | 同步，但 JS 側改名了 | 因為 `class`／`for` 是 JS 保留字，只好換名 |
| **只作為初始值，之後分家** | `value`、`checked`、`selected` | content attribute 記的是**預設值**，IDL property 記的是**當前值**；使用者一輸入就各走各的 | 這是最常踩的坑 |

```js
// <input id="k" value="預設文字">
const el = document.getElementById('k');

el.value;                       // "預設文字"
el.getAttribute('value');       // "預設文字"

// ---- 使用者在畫面上把文字改成 "我打的字" ----

el.value;                       // "我打的字"   ← IDL property：當前狀態
el.getAttribute('value');       // "預設文字"   ← content attribute：原始碼寫了什麼，沒變
el.defaultValue;                // "預設文字"   ← 這個才是 content attribute 的 IDL 對口
```

> [!important]+ 重點 e–g
> e. <mark style="background: #FFF3A3A6;">要拿使用者「現在打了什麼」，一律用 `el.value`</mark>；用 `getAttribute('value')` 會永遠拿到頁面剛載入時的預設值。
> f. 反過來，<mark style="background: #FF5582A6;">`el.setAttribute('value', 'x')` 在使用者已經打過字之後，畫面不會變</mark>，因為 IDL property 已經「髒」了（dirty value flag），不再跟著 content attribute 走。
> g. `checked` 同理：`<input type="checkbox" checked>` 的 content attribute 是「預設勾起」，`el.checked` 才是「現在有沒有勾」。表單 reset 時會把 IDL property 拉回 content attribute 的值，這就是 `defaultValue`／`defaultChecked` 存在的理由。

---

## 3. form 提交機制：誰打包、打包成什麼、送給誰

<mark style="background: #BBFABBA6;">動詞—受詞—拋接關係寫成完整一句</mark>：

> 使用者按下 `<input type="submit">` → **瀏覽器**觸發該 `<form>` 的 submit 事件 → 瀏覽器走訪 form 內所有**有 `name` 的可提交控制項**，把 `name=value` 收集成 form data set → 依 `method` 把這份 data set **編碼**（GET 就接成 query string 貼在網址後面，POST 就放進 request body）→ 向 `action` 指定的 URL 送出 HTTP request → 瀏覽器用回應的內容**整頁換掉現在這一頁**。

```html
<form action="/api/search" method="GET">
  <!-- 使用者輸入資料的欄位 -->
  <label for="keyword">關鍵字：</label>
  <input type="text" id="keyword" name="q" placeholder="請輸入搜尋內容">

  <!-- 點擊後觸發表單提交的按鈕 -->
  <input type="submit" value="開始搜尋">
</form>
```

打字 `mytext` 後按下按鈕，瀏覽器送出的是：

```text
GET /api/search?q=mytext HTTP/1.1
        ▲        ▲  ▲
        │        │  └── value：使用者實際打的字
        │        └── = ：連接符號
        └── key：來自 name="q"（不是 id="keyword"！）
```

> [!tip]+ 重點 h–k：最常踩的四個坑
> h. <mark style="background: #FF5582A6;">打包用的 key 是 `name` 不是 `id`</mark>。`id` 是給 CSS／JS／`<label for>` 用的，<mark style="background: #ADCCFFA6;">**沒有 `name` 的欄位根本不會被送出**</mark>。
> i. `<input type="submit">` 按鈕上顯示的文字由 <mark style="background: #FFF3A3A6;">`value` 屬性</mark>決定，這跟文字框用 `value` 存內容是兩回事，同一個字在不同 type 下語意不同。
> j. `<button>` 放在 form 裡而**不寫 `type`**，預設就是 `type="submit"`，會意外整頁刷新；只想做一般按鈕要明寫 <mark style="background: #BBFABBA6;">`type="button"`</mark>。
> k. 不寫 `method` 時預設是 `GET`，敏感資料（密碼、個資）就會直接曝在網址與瀏覽紀錄裡，要用 `POST`。

| 寫法 | 提交行為 | 能包子元素嗎 | 按鈕文字來源 | 建議 |
|---|---|---|---|---|
| `<input type="submit" value="送出">` | 會提交 | **不能**，只能放純文字 | `value` 屬性 | 舊寫法，還能用 |
| `<button type="submit">送出</button>` | 會提交 | **能**，可包 `<svg>`／`<strong>`／圖示 | 標籤之間的內容 | 現代預設選它 |
| `<button>送出</button>`（在 form 內） | **會提交**（預設 type=submit） | 能 | 標籤之間的內容 | 容易誤觸，別這樣寫 |
| `<button type="button">送出</button>` | 不提交 | 能 | 標籤之間的內容 | 只想跑 JS 時用這個 |

> [!note]+ 重點 l–n：現代前端怎麼接手這件事
> l. SPA 裡通常會 <mark style="background: #D2B3FFA6;">`e.preventDefault()` 攔下瀏覽器的預設提交</mark>，改用 `fetch` 自己送，避免整頁刷新。
> m. 即使攔下來，仍然建議<mark style="background: #BBFABBA6;">保留 `<form>` 與 `name`</mark>：一來能用 `new FormData(formEl)` 一行收齊所有欄位，二來鍵盤按 Enter 送出、螢幕閱讀器的表單語意都靠它。
> n. `<label for="keyword">` 的 `for` 指向的是 <mark style="background: #ADCCFFA6;">`id`</mark>（不是 `name`），點 label 會聚焦到該欄位——這是另一個「for 在 JS 側叫 `htmlFor`」的名字不同但仍反映的例子。

---

## 4. 岔題：String 包裝物件（auto-boxing）

這組對話的最後一問岔到了「為什麼字串可以呼叫方法」。這個主題歸在 [[字串不可變性-JS-vs-C-與TDZ變數遮蔽]]，本篇不重複；那邊有完整的 auto-boxing 三步驟與 <mark style="background: #FF5582A6;">Gemini 把 `typeof x` 寫成 `console.typeof(x)` 的更正</mark>。

---

## 5. 自己考自己：相關題目

| 平台 | 題號／名稱 | 為什麼相關 |
|---|---|---|
| LeetCode | 2695 Array Wrapper | 練「同一個東西在不同情境下被讀成不同型別」，跟 content attribute 永遠是字串、IDL property 有真型別是同一套直覺 |
| LeetCode | 2727 Is Object Empty | 練分辨「物件身上有哪些自有 key」，對應 `getAttributeNames()` vs 原型上的 IDL property |

連結：`https://leetcode.com/problems/array-wrapper/`、`https://leetcode.com/problems/is-object-empty/`

---

## 各對話來源（原文）

### HTML表單與IDL屬性解析（2026-09）— https://gemini.google.com/app/c2e73f83487fd392

**使用者：** 「IDL 屬性是什麼？如果要讓人可以輸入的話是 `type="text"`，但還要搭配一個按鈕為 `<input type="submit"/>` 這我就不太懂」

**Gemini：** IDL 屬性（Interface Definition Language Attribute）指的是透過 JavaScript 在 DOM 物件上存取或修改的程式性屬性，與 HTML 原始碼中的「HTML 屬性（Attribute）」相對應。HTML 屬性是寫在 HTML 標籤上的設定（例如 `<input value="搜尋">`）；IDL 屬性是在 JavaScript 中透過物件讀寫的欄位（例如 `inputElement.value`）。兩者通常會同步，但 IDL 屬性反映的是網頁執行時的當前狀態。
&nbsp;&nbsp;&nbsp;&nbsp;`<input type="submit">` 的作用：按下時瀏覽器會自動打包表單內所有輸入欄位的內容，向 `<form action="...">` 指定的網址發送請求；不需要另外寫 `onclick`，本身就具備提交的預設行為；按鈕上顯示的文字由 `value` 屬性決定。範例流程是使用者在 `type="text"` 欄位輸入文字 → 點擊 `type="submit"` 按鈕 → 瀏覽器自動收集資料（以 `name` 屬性作為 Key），並將 `q=使用者輸入的內容` 傳送到伺服器。補充：現代開發也常用 `<button type="submit">送出資料</button>` 代替，兩者功能相同，但 `<button>` 更方便包覆圖示或做複雜的 CSS 樣式。

⚠️ **存疑／補充：**「兩者通常會同步」這句太模糊。`value`／`checked`／`selected` 這一組**不同步**——content attribute 是預設值，IDL property 是當前值，使用者一輸入就分家。見 §2。

**使用者：** 「這句英文是啥意思」（指 `text=mytext`）

**Gemini：** 這句英文 `text=mytext` 代表表單提交時傳送到伺服器的資料格式（鍵值對，Key-Value Pair）。`text`（等號左邊）是 `<input type="text" name="text">` 欄位中指定的 `name` 屬性名稱，伺服器靠這個名稱識別這是哪一個輸入框傳進來的資料；`=` 是連接符號；`mytext`（等號右邊）是使用者實際填寫的內容。當你輸入 `mytext` 並按下提交，瀏覽器打包發送給後端的數據就會呈現 `text=mytext` 這樣的形式（例如出現在網址後方的 `?text=mytext`）。

**使用者：** 「所以還有一個 STRING 物件是因為資料型別都互有一個自己的的物件嗎？」

**Gemini：** 大部分原始型別都有對應的包裝物件（Wrapper Objects）。JavaScript 有 7 種原始型別，其中 String／Number／Boolean／Symbol／BigInt 都有對應的全域物件，`null` 與 `undefined` 沒有。當你執行 `str.toUpperCase()` 或存取 `str.length` 時，JavaScript 會在背後做三件事（Auto-boxing 自動包裝）：暫時將原始字串包裝成 `new String("hello")` → 執行物件上的方法或存取屬性 → 執行完畢後立即銷毀該臨時物件。日常開發強烈建議只用原始純值，避免 `new String()`，因為 `primitive == object` 為 true 但 `primitive === object` 為 false。

⚠️ **存疑／更正：** Gemini 的程式碼寫成 `console.typeof(primitive)`，**這不是合法語法**，`console` 上沒有 `typeof` 這個方法。正確寫法是 `typeof primitive`（`typeof` 是運算子不是函式）。完整整理見 [[字串不可變性-JS-vs-C-與TDZ變數遮蔽]]。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原文：HTML表單與IDL屬性解析 | `https://gemini.google.com/app/c2e73f83487fd392` | Gemini Flash，2026-09，擷取於 2026-09-19 |
| Web IDL 規格（IDL attribute 的定義來源） | `https://webidl.spec.whatwg.org/` | WHATWG Living Standard，查證於 2026-09-19 |
| HTML 規格：reflecting content attributes in IDL attributes | `https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes` | WHATWG Living Standard，查證於 2026-09-19 |
| HTML 規格：form submission algorithm | `https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm` | WHATWG Living Standard，查證於 2026-09-19 |
| HTMLInputElement.value 與 defaultValue（dirty value flag） | `https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value` | MDN，查證於 2026-09-19 |
| MDN：Attribute（content attribute）總覽 | `https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes` | MDN，查證於 2026-09-19 |
| MDN：`<button>` 的 type 預設值 | `https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#type` | MDN，查證於 2026-09-19 |

---

*由 Gemini 對話自動整理 · 更新於 2026-09-19*
