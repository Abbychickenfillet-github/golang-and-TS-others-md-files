---
title: 04-1-CSS 方法論與權重（OOCSS / BEM / SMACSS / ITCSS / Specificity）
type: topic-note
source: Gemini
tags:
  - gemini
  - css
  - oocss
  - bem
  - 方法論
  - 前端
  - 面試
  - "#modular"
  - "#scalable"
  - itcss
  - Sass
sources:
  - https://gemini.google.com/app/ca1ec9bb98e5fd41
  - https://gemini.google.com/app/8fd5c5f9f6ce1754
  - https://gemini.google.com/app/99e89ba6e17de585
  - https://gemini.google.com/app/a4dd26d7630bf8a2
  - https://gemini.google.com/app/8ebe8b81ffdb5c95
  - https://en.bem.info/methodology/history/
  - https://www.webdesignmuseum.org/web-design-history/bem-2009
  - https://smacss.com/book/about/
  - https://csswizardry.net/talks/2014/11/itcss-dafed.pdf
  - https://www.bennadel.com/blog/1633-object-oriented-css-oocss-by-nicole-sullivan.htm
  - https://csswizardry.com/2015/08/bemit-taking-the-bem-naming-convention-a-step-further/
  - https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture
  - https://sass-lang.com/documentation/breaking-changes/import/
  - https://sass-lang.com/documentation/at-rules/use/
updated: 2026-07-31
---
# CSS 方法論與權重（OOCSS / BEM / SMACSS / ITCSS / Specificity）

## 重點整理

兩者都是讓 CSS <mark style="background: #FFF3A3A6;">模組化、可重複利用、好維護</mark>的方法論，目的都只有兩個：<mark style="background: #FF5582A6;">讓 CSS 檔案變小</mark>（好重複利用）、讓程式碼好維護（不會改 A 壞 B 避免強烈耦合）。
[[https://share.gemini.google/KWRkJLUZ1AoY]]
<mark style="background: #BBFABBA6;">它們不是敵對，而是可以搭配的「內功心法」與「招式套路」。</mark>
書本作者認為雖然OOCSS有很多好的概念，但是它的實施可能每個人不盡相同。我認為它說的應該是只有的時候像我會讓為skeleton骨架跟皮膚是一種唯一的主題，可是有的人可能會分成骨架跟皮膚。
OOCSS比較有skin的概念，
我曾經認為React的組件是OOC我會舉一個比較誇張的例子做假設，但OOCSS是一種命名規範+拆職責
---

## 🎯 五種 CSS 架構方法論（面試速查小抄）

> 五種都在解同一題：**讓 CSS 可重用、好維護、不互相污染**。

**先分成兩掛，就不會混：**
- **「管 class 怎麼取／怎麼組職責」**（大多數）→ **OOCSS**（拆職責：結構 vs 外觀）、**BEM**（純命名規範）、**SMACSS**（分類 + 前綴）、**Atomic**（一個 class 一個樣式）。
- **「管檔案分層與載入順序」**（唯一例外）→ **ITCSS**：不碰命名，管的是 **stylesheet 分層 + `@import`/`@use` 的引入順序**（特異性由低到高）。它是架構概念、不綁 Sass，但因為要拆很多 partial 分層載入，**實務上幾乎都搭 Sass**（`@use`／舊版 `@import`）。

| 方法論                        | 切入點（一句話）                                                                                                                                                                                                                                                                           | 代表寫法                        | 解決的痛點                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| **OOCSS**                  | 結構與外觀(Skin)**分離**，樣式當樂高積木組合<br>#Atomic #object-oriented<br>> [!note]-OOCSS 為什麼不建議用後代選擇器？<br><br>後代選擇器（例如 `.a .b .c`）>隱含了一個假設：**「`c` 必須是 `b` 的兒子，且必須是 `a` 的孫子」**。<br><br>- `.list` 是一個物件。<br>- `.list-header` 是一個物件。<br>- `.list-body` 是一個物件。<br><br>它們應該平起平坐，各自管理自己的樣式，而不是誰是誰的附屬品。 | `.btn` + `.primary-skin`    | 重複樣式不用一寫再寫<br>是不是因為可以重用所以比較容易誤用<br><br>OOCSS 認為，**每一個 Class 都應該是一個獨立的「物件（Object）」**。 |
| **BEM**                    | **嚴格命名** `block__element--modifier` 表達隸屬                                                                                                                                                                                                                                           | `.card__title--active`      | class 一看就懂、不誤用                                                                       |
| **SMACSS**                 | 把規則**分 5 類**管理（↓ 展開）                                                                                                                                                                                                                                                               | `l-grid`、`is-active`        | 大專案 CSS 太亂、找不到                                                                       |
| **ITCSS**                  | 按**特異性由低到高**排檔案**引入順序**（↓ 展開）                                                                                                                                                                                                                                                      | Settings→…→Utilities        | 權重打架、被迫狂用 `!important`                                                               |
| **Atomic / Utility-First** | 一個 class 一個樣式，**用組合取代命名**<br>#Atomic                                                                                                                                                                                                                                               | Tailwind `text-red-500 p-4` | 懶得命名、想快速拼版                                                                           |

- **可混搭、不敵對**：最常見是「OOCSS 心法（結構/外觀分離）＋ BEM 命名」。
- **一句話串起來**：OOCSS 教你「拆」、BEM 教你「命名」、SMACSS 教你「分類」、ITCSS 教你「排順序」、Utility 教你「別命名、直接組」。

> [!note]- 📂 SMACSS 的 5 類（點開）
> - **Base**：原生標籤預設（`body`, `a`）
> - **Layout**：版面骨架，前綴 `l-`（`l-header`）
> - **Module**：可重用模組（`.card`, `.btn`）
> - **State**：狀態（`is-active`, `is-hidden`）
> - **Theme**：主題換膚

> [!note]- 🔻 ITCSS 倒三角引入順序（點開）
> 範圍由廣→窄、特異性由低→高依序 import：
> **Settings**(變數) → **Tools**(mixin) → **Generic**(reset) → **Elements**(原生標籤) → **Objects**(OOCSS 物件) → **Components**(元件) → **Utilities**(工具類，帶 `!important`)
>
> 實務上就是一支 `main.scss` 由上到下照這個順序引入各層 partial：
> ```scss
> // main.scss —— 由「影響最廣、特異性最低」到「最窄、最高」
> @use 'settings';    // 1. 變數、設計 token（$color-primary…），不輸出 CSS
> @use 'tools';       // 2. mixin / function，不輸出 CSS
> @use 'generic';     // 3. reset / normalize、box-sizing
> @use 'elements';    // 4. 原生標籤預設（h1, a, ul…），無 class
> @use 'objects';     // 5. OOCSS 版面物件（.o-container, .o-media）
> @use 'components';  // 6. 具體元件（.c-btn, .c-card）← 平常寫最多
> @use 'utilities';   // 7. 工具類（.u-hidden），可帶 !important 收尾
> ```
> - 越上面越抽象、影響越廣、特異性越低；越下面越具體、越能覆蓋前者。
> - 因為順序天生「低→高」，後面自然蓋得過前面，**不必亂灑 `!important`**（只留給最後的 Utilities）。
> - 舊寫法是 `@import 'settings';`（Sass 已淘汰、改用 `@use`）；純 CSS 則用 `@import url(...)`，但無變數/mixin 能力。

---

## 四大方法論的時間順序（依出現年份排列）

> 上面的表格是「切入點比較」，這裡補的是「誰先誰後」，同一條時間線放在一起看，會更清楚它們是一波一波接力解決同一個問題。

a. **OOCSS（2009年）**：Nicole Sullivan於2009年提出，公開演講與部落格文章集中在2009年（例如Ben Nadel於2009年7月8日的紀錄）。核心貢獻：把CSS拆成「結構與外觀分離」「容器與內容分離」兩條原則，是四者中最早出現的方法論。來源：[Ben Nadel - Object Oriented CSS (OOCSS) By Nicole Sullivan](https://www.bennadel.com/blog/1633-object-oriented-css-oocss-by-nicole-sullivan.htm)（記錄於2009-07-08）、[OOCSS - Wikipedia](https://en.wikipedia.org/wiki/OOCSS)

b. **BEM（正式成形於2009年，根源可追溯至2005年）**：Yandex團隊從2005年開始為了解決大型專案的class命名衝突而發展雛型，2007年秋天在ClientSide'2007會議正式提出Independent Block概念，直到2009年3月「Lego 2.0」發布才真正定型為BEM方法論，2010年才開源釋出（bem-bl、bem-tools）給社群使用。跟OOCSS幾乎同一年成熟，但根源起步更早。來源：[History / Methodology / BEM](https://en.bem.info/methodology/history/)、[BEM - Web Design Museum](https://www.webdesignmuseum.org/web-design-history/bem-2009)

c. **SMACSS（2011年）**：Jonathan Snook於2011年寫成，取材自他在Yahoo! Mail改版專案的實務經驗，是四者中第一個明確提出「把CSS規則分五類管理」架構層級思維的方法論。來源：[SMACSS - About](https://smacss.com/book/about/)

d. **ITCSS（2014年）**：Harry Roberts於2014年11月在dafed研討會上以《Managing CSS Projects with ITCSS》為題首次公開發表投影片，隔年起才陸續被業界大量引用與撰文介紹。是四者中最晚出現，也是唯一不管命名、只管「檔案分層與載入順序」的方法論。來源：[Csswizardry - ITCSS投影片（2014-11）](https://csswizardry.net/talks/2014/11/itcss-dafed.pdf)

- 時間軸看下來的重點：OOCSS與BEM幾乎同期（2009年）從不同公司獨立長出來，解決的都是「重複樣式、命名衝突」；SMACSS（2011）晚兩年出現，把視角拉高到「整個專案的CSS要分幾類資料夾管理」；ITCSS（2014）最晚，解決的是前三者都沒處理的「特異性打架、載入順序」問題，所以ITCSS常被拿來當作「容器」，內部的Objects層剛好用來放OOCSS的物件、Components層可以搭配BEM命名。
- 換句話說，時間順序剛好也大致對應「解決問題的抽象層級」：先解決單一元件內部怎麼拆（OOCSS）與怎麼命名（BEM），再解決整個專案怎麼分類（SMACSS），最後解決檔案怎麼排序載入（ITCSS）。

## 重要補充：OOCSS到底只是命名規範，還是連CSS內部區塊都有影響

上面的表格容易讓人誤以為「OOCSS = 一種取class名字的方式」，但這樣理解並不完整。

- <mark style="background: #FFF3A3A6;">OOCSS的本質是「拆職責」的架構思維，命名只是這個思維的外顯結果</mark>。它有兩條核心原則（來源：[Ben Nadel文章](https://www.bennadel.com/blog/1633-object-oriented-css-oocss-by-nicole-sullivan.htm)，2009-07-08）：
	1. **結構與外觀分離（Separate Structure and Skin）**：大小、間距、排版邏輯歸一組class；顏色、背景、外觀歸另一組class，兩組完全獨立、互不依賴。
	2. **容器與內容分離（Separate Container and Content）**：一個元素的樣式不該因為「它被放在哪個容器裡」而改變（避免依賴後代選擇器如`.sidebar .btn`）；如果某個元素需要不同呈現，應該額外加一個class去描述差異，而不是靠巢狀結構去覆蓋。
- 所以OOCSS影響的不只是「class叫什麼名字」，而是**CSS規則本身要怎麼切成幾個獨立區塊**、以及**HTML該怎麼組合套用這些class**。跟BEM「單純規定命名格式、不規定要不要拆結構」是不同層次的事情。
- BEM可以套用在完全沒有做結構/外觀分離的CSS上（單純只是把class名字寫成規範格式）；但OOCSS如果沒有把規則拆開，就不能算真正實踐OOCSS，即使class名字取得再漂亮也一樣。

### 你的範例驗證

```css
.btn-skeleton {
  width: 2rem;
  height: 1rem;
}
```

- 這一段只處理**尺寸大小**（結構性質），完全沒有碰顏色、背景，<mark style="background: #BBFABBA6;">算是把「骨架（structure）」獨立出來了，方向正確</mark>。
- 但要注意，OOCSS所謂的structure通常不只是width/height，也包含padding、border-radius、display、cursor這類「跟外觀顏色無關的通用規則」；而skin則專指background-color、color、border-color這類純視覺外觀。只要保持這兩種性質分開寫成兩個獨立class，就符合OOCSS第一原則。
- 換句話說，你只需要再補一個`.btn-color`（或任何名字）的class專門處理`background-color`/`color`，兩個class一起套用在同一個元素上，就是完整的OOCSS結構/外觀分離範例。

### `<button class="btn btn--primary">主按鈕</button>` 是BEM還是OOCSS

- <mark style="background: #ADCCFFA6;">這是標準的BEM Modifier寫法</mark>：`.btn`是Block，`--primary`是Modifier，語意是「btn這個Block底下的primary變體」。`--`雙連字號是BEM獨有的命名規範，OOCSS本身沒有規定要用`--`。
- 如果換成純OOCSS思路，通常**不會**寫成`.btn-skeleton` + `.btn-color`這種還是綁著`btn-`前綴的形式，而是兩個完全獨立、彼此沒有派生關係的class，例如`.btn-skeleton` + `.primary-skin`（或`.skin-primary`）。
- 關鍵差異在於：<mark style="background: #FF5582A6;">BEM的Modifier是「綁定在特定Block底下」的，只能給`.btn`用，`.card`若要同樣的紅色必須另外寫`.card--primary`</mark>，即使樣式內容一模一樣也要重複寫一次；而<mark style="background: #FF5582A6;">OOCSS的skin類則刻意設計成「跟元件無關、可以被btn、card、alert等任何元件共用」</mark>，所以命名上通常不會加上元件前綴，才能真正達到「重複利用」的目的。
- 所以你提出的`.btn-skeleton` + `.btn-color`，拆分骨架與外觀的**方向完全正確**，只是`.btn-color`這個名字若拿掉`btn-`前綴（直接叫`.primary-skin`），會更貼近OOCSS「跨元件共用skin」的原始精神。

> [!note]- 🔗 這篇筆記跟哪些筆記有關聯（點開）
> - 跟同資料夾的 [[04-2-OOCSS-vs-BEM-CSS命名方法論]] 互動筆記高度相關：那篇是OOCSS/BEM命名比較的第一版對話紀錄，這裡補的是「時間順序」與「OOCSS不只是命名規範」這兩個那篇沒講清楚的地方，建議兩篇對照著看。
> - 之所以放在一起，是因為兩篇都在回答「OOCSS跟BEM差在哪」這個核心問題，只是切入角度不同（一個講命名範例、一個講歷史脈絡與結構本質）。

---

### OOCSS（Object-Oriented CSS）用了skin這個字眼

核心思想：<mark style="background: #FFF3A3A6;">結構（Structure）與外觀（Skin）分離</mark>，把元件當成獨立「物件」，像樂高積木一樣自由組合。#modular #scalable

```css
/* 結構 Structure：大小、邊距、字體 */
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
/* 外觀 Skin：只負責顏色、背景 */
.primary-skin   { background-color: blue; color: white; }
.secondary-skin { background-color: gray; color: white; }
```

```html
<button class="btn primary-skin">主按鈕</button>
<button class="btn secondary-skin">次要按鈕</button>
```

- <mark style="background: #BBFABBA6;">優點：重複利用性極高</mark>（卡片想用同藍色，直接套 `.primary-skin`）。
- <mark style="background: #FF5582A6;">缺點：HTML class 變很長，難一眼看出 class 寫給誰用</mark>；不同人實作差異大。

### BEM（Block、Element、Modifier）[https://bem.info/en/methodology/quick-start/]

核心思想：<mark style="background: #FFF3A3A6;">嚴格的命名規範</mark>，讓結構一目了然。

- <mark style="background: #ADCCFFA6;">B（Block）</mark>：獨立區塊，例如 `btn`
- <mark style="background: #ADCCFFA6;">E（Element）</mark>：區塊內子元素，用 `__` 連接（例如 `btn__icon`）
- <mark style="background: #ADCCFFA6;">M（Modifier）</mark>：狀態或變體，用 `--` 連接（例如 `btn--primary`）

```css
.btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn--primary { background-color: blue; color: white; }
```

```html
<button class="btn btn--primary">主按鈕</button>
```

- <mark style="background: #BBFABBA6;">優點：命名嚴格有邏輯</mark>，看到 `btn--primary` 就知它依附在 `btn` 底下，不會誤用。
- <mark style="background: #FF5582A6;">缺點：名字常變很長</mark>（例如 `header__navigation-list--dark`）。

### 快速總結表

| 特性       | OOCSS                       | BEM                          |
| -------- | --------------------------- | ---------------------------- |
| 核心精神     | 樣式抽成「樂高積木」自由組合              | 用嚴格命名表達元件隸屬關係                |
| Class 命名 | 通常很短（`btn`, `primary-skin`） | 較長但清晰（`btn`, `btn--primary`） |
| 適用場景     | 減少 CSS 大小、重視重複利用            | 團隊協作、好維護、不易改壞別人              |

### 混血（Hybrid）實務作法

很多前端會結合兩者：用 <mark style="background: #BBFABBA6;">OOCSS 的「心法」（結構/外觀分離）+ BEM 的「規範」（命名）</mark>。把 OOCSS 的外觀（Skin）用 BEM 的 Modifier（`--`）命名：

```css
/* 結構（OOCSS 結構 + BEM Block 命名） */
.box { padding: 20px; border-radius: 8px; display: flex; }
/* 外觀（OOCSS 外觀 + BEM Modifier 命名）：獨立存在、可自由組合 */
.theme--light   { background: #fff; }
.theme--warning { background: #ffd; }
```
```html
<div class="box theme--warning">…</div>
```

# BEM避免多層巢狀元素
命名公式：Block__Element--Modifier
但是當單一個Element的元素嵌套太多之後，就會將Element獨立出來。絕不允許出現Block__Element__SubElement這種結構。或者一直用雙底線串下去，命名會變.product__nav__nav-list__nav-item__link--active
- 名字會長到無法閱讀
- 但是如果元素位子要改變。e.g. 將nav-item 搬到Header裡面用，因為名字綁死了.product，就必須重寫一遍CSS。
## <mark style="background: #FFB8EBA6;"> 解決方案：把子元素獨立升格為新區塊Block</mark>
- 可避免強烈耦合(乾淨)
	- product, product-nav
	- 若別的頁面也需要這個檔覽列，直接把整段HTML複製過去，樣式也完全不會壞掉。<- 真的嗎
- 由Russian網路巨頭Yandex開發出來的。Yandex當年的野心非常大，不只把BEM當作CSS的命名規範，還開發了一整套完整的開發框架
### 重要延伸

- React 開發中，<mark style="background: #D2B3FFA6;">BEM 精神（或 CSS Modules）更常被使用</mark>，因為能確保樣式不互相污染。
- <mark style="background: #FFB8EBA6;">Utility-First（如 Tailwind CSS）</mark>本質上是把 OOCSS「結構與外觀分離、極大化重複利用」發揮到極致的演變。
- 釐清：<mark style="background: #FF5582A6;">React 組件 ≠ OOCSS</mark>。React 組件是「拆 UI 成可重用部件」；OOCSS 是「寫 CSS 的方法論」。可在 React 組件內套用 OOCSS / BEM 來組織樣式。
考量CSS的程式碼量

## 追加 2026-07-19：ITCSS 熱度趨勢、BEM 為何誕生（XSL 血淚史）、Sass `@use as *`

> 本次追加重點 a–j，共 10 個。

a. <mark style="background: #FFF3A3A6;">ITCSS 部落格文章瀏覽量正緩慢下滑</mark>，與 2020 年 State of CSS 調查結果一致（前端開發者對 ITCSS 的興趣比例一年內從 40% 降到 37%）。但滿意度仍維持約 <mark style="background: #BBFABBA6;">78%</mark>，落在「用的人少、但用過都滿意」的象限，不是被淘汰，而是進入穩定期。

b. <mark style="background: #FF5582A6;">ITCSS 未被廣泛普及的主因</mark>：部分核心概念仍屬原創者 Harry Roberts 的半專利財產，網路上缺乏完全開源的官方文件，限制了它像 Tailwind CSS 或 BEM 那樣被大規模推廣採用。

c. <mark style="background: #FFF3A3A6;">BEM 為什麼會誕生：2005 年 Web 開發的真實痛點</mark>。當時 CSS3 尚未被瀏覽器支援（`border-radius`、`box-shadow` 都畫不出來），又要相容 IE5/IE6，設計師必須把圓角、陰影這類視覺效果切成一張張小圖片（`.gif`/`.png`），用 `<table>` 或 `<div>` 拼湊出來——這正是「連做個圓角都要用圖片」的由來。圖片指的是<mark style="background: #ADCCFFA6;">網頁切圖（UI 裝飾性圖片）</mark>，不是 CEO 照片這類內容圖片。

d. <mark style="background: #ADCCFFA6;">XSL（Extensible Stylesheet Language）</mark>是當時把 XML 資料轉成 HTML 的樣板引擎，外觀像 HTML 但充滿 `<xsl:for-each>`、`<xsl:value-of>` 這類自訂標籤。工程師會先寫好靜態 `index.html` 確認畫面，再手動複製貼上到 `.xsl`、把寫死文字改成動態標籤；<mark style="background: #FF5582A6;">前端改了 HTML 要手動同步回 XSL，後端改了 XSL 範本也要手動同步回 HTML，雙向依賴人工複製貼上</mark>，這種災難正是後來 BEM 團隊決定把組件「獨立化（Blocks）」、邁向自動化生成的關鍵動機。

```xml
<!-- 2005年代典型XSL片段：用table+圖片拼出圓角容器 -->
<table class="b-rounded-box">
  <tr>
    <td class="top-left-corner"><img src="i/corner-tl.png" /></td>
    <td class="top-edge"></td>
    <td class="top-right-corner"><img src="i/corner-tr.png" /></td>
  </tr>
  <tr>
    <td class="content-body">
      <h1><xsl:value-of select="page/user/name"/></h1>
    </td>
  </tr>
</table>
```

e. <mark style="background: #D2B3FFA6;">關聯：這段 XSL 血淚史補上了本篇「四大方法論時間順序」表格裡 BEM（2005 萌芽、2009 定型）為什麼要從 2005 年就開始發展的背景動機</mark>——不是憑空追求命名美感，而是為了終結「HTML 與樣板手動雙向同步」的維護地獄。

f. <mark style="background: #FFF3A3A6;">Sass `@use "路徑" as *`</mark>：`*` 不是把檔案改名叫星號，路徑依然要寫完整；`*` 的作用是<mark style="background: #ADCCFFA6;">省略掉這個模組的 Namespace（前綴）</mark>，讓你不用每次都寫 `corners.$radius`，直接寫 `$radius` 即可。

```scss
// 正常寫法：要加前綴 (namespace)
@use "src/corners";
.button { padding: 5px + corners.$radius; }

// as * 寫法：省略前綴，直接用
@use "src/corners" as *;
.button { padding: 5px + $radius; }   // 直接用 $radius
```

g. <mark style="background: #FF5582A6;">官方為何建議「只對自己寫的檔案用 as *」</mark>：如果同時引用多個第三方套件都用 `as *`，一旦兩個套件剛好都定義了同名變數（例如都叫 `$radius`），Sass 會無法判斷你指的是哪一個，直接產生<mark style="background: #FF5582A6;">命名衝突（Name Conflicts）</mark>。

h. `as *` 只省略「前綴」，<mark style="background: #ADCCFFA6;">`@include`、`@function` 等語法標籤本身都不能省</mark>：原本 `@include corners.rounded;` 用 `as *` 後變成 `@include rounded;`，`@include` 依然要寫，只是中間的 `corners.` 消失。

i. 同一檔案可以載入無數個 `@use`，但<mark style="background: #BBFABBA6;">不建議每個都用 `as *`</mark>——通常只挑「一個」最核心、最常用、確定不會撞名的檔案（例如變數包）用 `as *`，其他外來套件仍保留原本的 namespace，兩全其美：

```scss
@use "src/corners" as *;   // 常用變數包，用 as * 省字
@use "src/colors";         // 保留前綴，避免撞名 → colors.xxx
@use "src/buttons";        // 保留前綴 → buttons.xxx
```

j. 來源版本查證：Sass `@use`／`as *` 語法出自 Sass 官方文件 [Sass: @use](https://sass-lang.com/documentation/at-rules/use/)（查證日 2026-07-19）；ITCSS 熱度數據出自 State of CSS 2020 調查結果（經 Gemini 轉述）。

## 追加 2026-07-31：BEM 在 2026 年的現況、Scoped CSS 與 CSS Modules 如何自動做到樣式隔離

> 本次追加重點 k–m，共 3 個。起點：Abby 問「BEM 現在（2026）還流行嗎」以及「框架的樣式隔離具體是什麼意思」。

k. <mark style="background: #FFF3A3A6;">BEM 沒有死，但已從「唯一主流」變成「大型專案／傳統架構下的基本素養」</mark>：在 React／Vue／Svelte 生態裡，CSS Modules 或 Scoped CSS 已是標準配備，框架本身就做到樣式隔離，不再需要 BEM 那種 `.button__icon--large` 長命名去防止衝突；Tailwind 這類 Utility-First 也分走大量採用率。但在<mark style="background: #ADCCFFA6;">不使用現代框架的大型專案（純 HTML/CSS/JS、WordPress、多頁面應用）</mark>與<mark style="background: #ADCCFFA6;">企業級設計系統</mark>裡，BEM（或其變體 SUIT CSS）依然是維持命名一致性的穩定基石。

l. <mark style="background: #ADCCFFA6;">「樣式隔離」在框架裡具體是什麼機制</mark>——延續本篇最上方表格「BEM 靠人為命名防衝突」的概念，Scoped CSS 與 CSS Modules 則是把這件事交給編譯器自動處理：

| 技術特性 | BEM 命名法 | Scoped CSS | CSS Modules |
|---|---|---|---|
| 代表框架 | 無框架限定 | Vue（`<style scoped>`）、Svelte | React（常見 `Button.module.css`） |
| 隔離手段 | 人為開發規範，手工維護 | 編譯器自動加屬性選擇器 | 編譯器自動把 Class Name 雜湊化 |
| 程式碼外觀 | `.card__title--active` | `.title[data-v-12345]` | `._Button_title_jsx82` |
| 原理 | 靠命名長度表達隸屬關係 | 打包時幫該元件 HTML 加隨機屬性（如 `data-v-f3f3eg`），CSS 自動變成 `.title[data-v-f3f3eg]` | 直接把 class 名稱換成帶雜湊值的唯一名稱，HTML 與 CSS 一起替換 |
| 自動化程度 | ❌ 完全靠腦力維護 | ✅ 自動處理 | ✅ 自動處理 |
| 適合場景 | 傳統 MPA／WordPress／SCSS 專案 | Vue／Svelte 元件化開發 | React／Webpack 生態系 |

<mark style="background: #BBFABBA6;">跟本篇「重要延伸」段落早先寫的「React 開發中，BEM 精神（或 CSS Modules）更常被使用」是同一個結論，這裡補上兩種自動化機制實際運作原理與程式碼外觀對比。</mark>

m. 來源查證：BEM 2026 現況與 Scoped CSS／CSS Modules 原理為 Gemini 依訓練知識整理與推斷（無明確可查證單一權威來源網址，查證日 2026-07-31），Abby 使用時可留意此為 AI 綜合性說法而非單一規範引用。

## 各對話來源

### ITCSS 關注度下滑與實務應用（2026-07）— https://gemini.google.com/app/8fd5c5f9f6ce1754

使用者：為何 ITCSS 的部落格文章緩慢減少他要表達什麼？

Gemini：與 State of CSS 2020 調查一致，ITCSS 關注度比例一年內從 40% 降到 37%；但滿意度仍約 78%，屬於「低使用率、高滿意度」象限。未普及主因是核心概念半專利、缺乏完全開源文件，限制其像 Tailwind／BEM 那樣被大規模推廣。整合進上方追加第 a–b 點。

### 網頁開發早期技術解析（2026-07）— https://gemini.google.com/app/99e89ba6e17de585

使用者：Images were used for all sorts of design elements 是什麼意思？XSL 長怎樣？

Gemini：2005 年代因 CSS3 未普及、要相容 IE5/6，圓角陰影等視覺效果得靠切圖拼湊；XSL 是把 XML 轉 HTML 的樣板引擎，HTML 改了要手動同步回 XSL，反之亦然，雙向人工複製貼上正是 BEM 團隊後來走向組件獨立化、自動化生成的關鍵動機。整合進上方追加第 c–e 點。

### Sass @use as * 語法解析（2026-07）— https://gemini.google.com/app/a4dd26d7630bf8a2

使用者：`@use "<url>" as *` 是不是把檔案改名叫星號？@include 也不用寫嗎？這樣整個檔案只能載入一個 module 吧？

Gemini：`*` 只是省略 namespace 前綴，路徑仍要寫完整；`@include`、`@function` 等語法都不能省；可以載入無數個 `@use`，但只建議挑一個最核心、確定不會撞名的檔案用 `as *`，避免多個套件同名變數造成命名衝突。整合進上方追加第 f–i 點。

### BEM 現況與 Scoped CSS／CSS Modules 樣式隔離（2026-07-31）— https://gemini.google.com/app/8ebe8b81ffdb5c95

使用者：BEM 在現今 2026 還是一個流行的 CSS methodology 嗎？／框架本身就能做到「樣式隔離」是什麼意思？

Gemini：BEM 依然實用但不再是唯一主流，React/Vue/Svelte 生態多用 CSS Modules／Scoped CSS，Tailwind 也分走採用率；大型傳統專案與企業設計系統仍常用 BEM。樣式隔離指 Scoped CSS 靠編譯器自動加屬性選擇器（如 `data-v-xxx`）、CSS Modules 靠編譯器把 class 名稱雜湊化，兩者都把「人工防衝突」變成「機器自動處理」。整合進上方追加第 k–l 點。（同一對話後段也問了 Obsidian 與 Google Docs 銜接方式，屬不同主題，已另存於 Obsidian 工具筆記。）

### OOCSS vs. BEM Comparison（2026-06）— https://gemini.google.com/app/ca1ec9bb98e5fd41

- 起點：上傳一張「比較 OOCSS 與 BEM 的書本照片」以語音提問。
- 書的觀點：OOCSS 概念好但實作因人而異；BEM 標準明確、團隊較易一致。
- CSS = Cascading Style Sheets，設定網頁元素樣式的語言。
- OOCSS 核心：物件的「結構」與「外觀(skin)」分離 → 同一設計套到不同元素不必重寫。
- React 組件 ≠ OOCSS：組件是「拆 UI 成可重用部件」，OOCSS 是「寫 CSS 的方法論」（可在組件內套用）。
- 結論：OOCSS 與 BEM 非敵對，可混搭（OOCSS 心法 + BEM 命名）；現代 React 多用 BEM 精神或 CSS Modules；Tailwind 的 Utility-First 是 OOCSS 思想的演變。

---

## 補充筆記（平板加註：CSS 權重、Tailwind 與繼承）

記住權重要怎講？說到內層會覆蓋到外層

Tailwind的CSS跟傳統Inline Style一樣嗎？
不一樣。傳統的語法是用style="color: red;"非常難被覆蓋
Tailwind本質上還是類別選擇器, Tailwind只是預先在一個隱藏的CSS檔案裡寫好了

當我們寫，
```html
<div class="text-red-500'><div>
```
時其實只是在套用一個普通的class，權重就跟一般的.my-style一樣
另==直接命中標籤的權重比繼承來的還要大==。內層元素自己身上的樣式永遠會勝過外層傳下來的樣式。在CSS的世界裡，子元素會繼承父元素的一些文字屬性

有哪些屬性是子元素不會繼承的？
1. 會繼承
	- 文字
		- color
		- font-family/font-size/font-wight/font-style
		- line-height/letter-spacing/word-spacing
		- text-align文字對齊方式
	- 只需寫一次在父元素

2. 不會繼承：盒模型與空間尺寸（BoxModel&Sizing)
	- 盒模型空間尺寸（長相 大小 骨架）
		- width/height
		- display flex不影響子元素也變成flex容器，依然是預設的block或inline
		- border
		- box-sizing
		- margin/padding
	- 外框邊距與佈局與排版模式
		- display
		- position
		- float/clear
	- 背景與視覺特異性Backgrounds & Effects
		- background(包括background-color,background-image)
		- opacity
		- box-shadow
		- filter
	- 如果想強迫子元素繼承可以用inherit

### 🔑 `inherit`（搭配上面的繼承整理）

- CSS 屬性值之一，意思是「**強迫這個屬性去拿父元素的值**」。
- 專門用在上面列的那些「**不會繼承**」屬性上（`border`、`padding`、`width`…）——它們預設不繼承，寫 `inherit` 就強制沿用父層。
- 同家族：`initial`（回規範預設值）、`unset`（會繼承的→當 inherit、不會的→當 initial）、`revert`（退回瀏覽器預設樣式表）。
靠北 要實際練習 但這邊怎麼實際練習？

> [!example]- 點開看範例：強制子元素繼承 border
> ```css
> .child {
>   border: inherit;   /* 強制沿用父層的 border（border 本來不會繼承） */
> }
> ```

## CSS 權重（Specificity）速查 — 那「五個」層級

決定「**同一個元素被多條規則命中時，誰勝出**」。由高到低：

| 層級 | 例子 | 權重 |
|---|---|---|
| ① `!important` | `color: red !important;` | 覆蓋一切（嚴格說不算 specificity，是最後的強制手段，濫用很痛） |
| ② Inline style（行內） | `<div style="color:red">` | (1,0,0,0) |
| ③ ID | `#header` | (0,1,0,0) |
| ④ Class／屬性／偽類 | `.btn`、`[type]`、`:hover` | (0,0,1,0) |
| ⑤ 元素／偽元素 | `div`、`::before` | (0,0,0,1) |

- **比法**：先比 ID 數量 → 一樣才比 class 數量 → 再比元素數量。**高位永遠壓過低位、不會進位**（256 個 class 也贏不過 1 個 ID）。
- 通用選擇器 `*`、`:where()` **不加權重**（0）。
- 呼應上面「內層覆蓋外層」：那其實是 **「直接命中」 vs 「繼承而來」** 的差別——元素身上只要有**直接命中**的規則，就贏過從父層繼承下來的值。這和 specificity 是**兩個不同階段**的比較（先看有沒有直接命中，再用 specificity 分勝負）。

---

## 補充問答（2026-07-19 第二輪）：ITCSS 命名前綴、Objects 層本質、@use 現況、container/content 分離範例

### 1. ITCSS 的 Objects 為什麼要用`o-`開頭,是不是我多想了

不是多想,這是Harry Roberts自己明講的官方命名慣例,不是巧合。他在《BEMIT》這篇文章裡直接寫：<mark style="background: #FFF3A3A6;">`c-`給Components、`o-`給Objects、`u-`給Utilities、`is-`或`has-`給狀態(State)</mark>,目的是讓人一看class名字前綴,就知道這個class「屬於哪一層、可以在哪裡重複使用」。來源：[BEMIT: Taking the BEM Naming Convention a Step Further – CSS Wizardry](https://csswizardry.com/2015/08/bemit-taking-the-bem-naming-convention-a-step-further/)（發表於2015-08）

### 2. Objects是不是比Generic更高一層,還是我搞錯了

你的直覺是對的：<mark style="background: #BBFABBA6;">Elements是元素(未加class的原生標籤,如h1、a)、Objects是格線/佈局(有加class但不含任何顏色外觀的純結構樣式,如media object、grid)</mark>,原本的說法不夠精確,以下更正：

- ITCSS七層由上到下排列,排序依據是**特異性(specificity)由低到高**、以及**規則影響範圍由廣到窄**,不是「誰比誰更大」。
- **Generic**：不帶class,靠`*`或`html`/`body`<mark style="background: #D2B3FFA6;">這類極低特異性選擇器</mark>做reset/normalize,影響範圍最廣(幾乎整個頁面)。
- **Elements**：一樣不帶class,只用原生標籤選擇器(`h1`、`a`、`ul`)去改寫瀏覽器預設樣式,範圍縮小到「特定標籤」。
- **Objects**：<mark style="background: #ADCCFFA6;">第一個開始用class選擇器的層</mark>,但這個class刻意「不含任何外觀顏色」,只處理排版結構(例如`.o-media`、`.o-layout`這種可以套在留言、文章、通知等任何地方的骨架樣式),來源：[ITCSS: Scalable and Maintainable CSS Architecture - xfive](https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture)。
- **Components**：也是class選擇器,但這裡才開始加上具體外觀(顏色、品牌樣式),是實務上寫最多的一層,通常搭配BEM命名。
- 換句話說,Generic跟Elements管的是「沒加class的東西」,Objects跟Components才開始管「有加class的東西」;Objects因為刻意「不含外觀」,所以可以被更多不同的Components共用,這才是它被安排在Elements之後、Components之前的原因,而不是因為它「比較大」。

### 3. 為什麼你查到的範例用`@import`,我這篇用`@use`

兩個都存在,原因是**時間點不同**：

- `@use`／`@forward`是Sass在<mark style="background: #FF5582A6;">2019年才推出</mark>的新模組系統,ITCSS這個方法論本身誕生於2014年,當年Sass根本還沒有`@use`,所以早期(尤其2019年以前)的ITCSS教學文章一定只會用`@import`,這不是錯,只是舊寫法。
- Sass官方從2020年起把`@import`標記為**已淘汰(deprecated)**,並公開建議「所有人改用`@use`」;但截至目前(2026-07)`@import`**還沒有被真正移除**,官方文件明講要等到Dart Sass 3.0.0才會拿掉,而3.0.0「最早也要在Dart Sass 1.80.0發布之後兩年才會推出」(1.80.0是2023年10月發布的),所以`@import`目前還能用,只是每次編譯都會跳警告。來源：[Sass: Breaking Change - @import](https://sass-lang.com/documentation/breaking-changes/import/)
- 這篇筆記用`@use`是因為那是官方**目前建議、面向未來**的寫法;你查到用`@import`的文章多半是2019年以前寫的、或作者還沒更新到新語法,兩者現階段都能跑,但新專案建議直接用`@use`。

### 4. 「一個元素的樣式不該因為它被放在哪個容器裡而改變」的具體範例

這句話指的是OOCSS反對的「**位置依賴(location-dependent)樣式**」,用範例來對比：

<mark style="background: #FF5582A6;">❌ 違反容器/內容分離（樣式綁在容器上,元素被搬到別的容器就會跑掉）</mark>
```css
.sidebar h3 { font-size: 14px; color: #666; }
.header  h3 { font-size: 24px; color: #000; }
```
```html
<div class="header"><h3>大標題</h3></div>
<div class="sidebar"><h3>小標題</h3></div>
```
同一個`<h3>`標籤,樣式完全取決於它被塞進哪個容器,如果哪天把這個`h3`從sidebar搬到footer,樣式會直接跑掉、變成footer那組規則(或什麼都沒有),而且要改樣式得去猜它現在在哪個容器底下,很難維護。

<mark style="background: #BBFABBA6;">✅ 符合容器/內容分離（樣式直接寫在元素自己身上的class,搬到哪裡都長一樣）</mark>
```css
.title--large { font-size: 24px; color: #000; }
.title--small { font-size: 14px; color: #666; }
```
```html
<div class="header"><h3 class="title--large">大標題</h3></div>
<div class="sidebar"><h3 class="title--small">小標題</h3></div>
```
現在`title--large`不管搬到header、footer還是任何容器裡,樣式都不會變,因為樣式來源是元素自己身上的class,而不是它剛好被放在哪個父層底下。

### 5. 骨架(structure)裡的width、height、padding、border-radius、display、cursor,通常會全部放同一個class嗎

通常會。<mark style="background: #FFF3A3A6;">經典OOCSS的做法是把「這個物件所有跟外觀顏色無關的結構性宣告」合併寫進同一個structure class裡</mark>,像Nicole Sullivan原始教學裡的media object範例就是把display、overflow、margin這些結構屬性通通放在同一個`.media`class,不會刻意拆成好幾個更小的class。

- 只有當你想要更細粒度的重複利用時(例如「這個padding也想單獨套到別的地方」),才會進一步拆成更小的原子class(例如`.p-16`、`.flex`這種)。這種做法已經不算傳統OOCSS,而是**Utility-First(如Tailwind)**的思路,是OOCSS「結構外觀分離」精神被推向極致後的演變,前面的筆記裡也提過這個關聯。
- 所以答案是：傳統OOCSS結構層通常合併成一個class;想拆更細,是Utility-First在做的事,不是OOCSS原本的規範。

### 6. 除了skin(外觀)以外,通常還會有一個獨立的「skeleton」層級嗎

沒有正式的第三層。<mark style="background: #ADCCFFA6;">經典OOCSS只定義兩個角色：structure（結構）與skin（外觀）</mark>,「skeleton」只是大家口語上拿來代替「structure」的說法而已,兩個字指的是同一件事,不是三層架構。如果你想要更細的第三層(例如再拆出「排版layout」跟「尺寸空間sizing」),那是你自己團隊為了更好維護而做的延伸慣例,不是OOCSS原始定義的一部分,建議如果要這樣拆,乾脆考慮直接採用Utility-First或搭配ITCSS的Objects/Components層去做區分,會比自創第三個OOCSS專有名詞更有共識。

### 7. `.btn-skeleton` + `.primary-skin`的完整範例(對照BEM會怎麼重複寫)

**OOCSS寫法（`primary-skin`可以被btn、card共用,只寫一次）**
```css
/* 結構/骨架：跟顏色外觀無關,每種元件各自一份 */
.btn-skeleton {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.card-skeleton {
  display: block;
  padding: 16px;
  border-radius: 8px;
}

/* 外觀/膚色：跟元件無關,只寫一次,誰都能套 */
.primary-skin {
  background-color: #2f6fed;
  color: #ffffff;
}
.warning-skin {
  background-color: #ffcc00;
  color: #333333;
}
```
```html
<button class="btn-skeleton primary-skin">主按鈕</button>
<div class="card-skeleton primary-skin">主色卡片</div>
<div class="card-skeleton warning-skin">警告卡片</div>
```

**BEM寫法（同樣的顏色規則,`.btn`跟`.card`要各自重寫一次）**
```css
.btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn--primary { background-color: #2f6fed; color: #ffffff; }

.card { display: block; padding: 16px; border-radius: 8px; }
.card--primary { background-color: #2f6fed; color: #ffffff; } /* 內容跟.btn--primary一模一樣,但BEM規定Modifier綁在自己Block底下,必須重寫 */
```
```html
<button class="btn btn--primary">主按鈕</button>
<div class="card card--primary">主色卡片</div>
```

- <mark style="background: #FF5582A6;">關鍵對比：OOCSS的`.primary-skin`只寫一次規則、兩種元件共用；BEM的`.btn--primary`跟`.card--primary`內容完全相同,卻要各自宣告一次</mark>,這正是OOCSS「重複利用」跟BEM「命名清晰但較易重複程式碼」這兩種取捨的具體差異。

### 8. OOCSS比較需要「兩個class搭配」,BEM先決定命名就不需要搭配,對嗎

對,但要拆成兩件事情看：

- <mark style="background: #FFF3A3A6;">OOCSS靠疊加多個各自獨立、互不知情的class拼出最終樣子</mark>,`.btn-skeleton`跟`.primary-skin`彼此完全不知道對方存在,只是剛好一起套在同一個元素上。所以這是一種**隱性契約**：開發者得自己記得把對的structure跟對的skin同時套上,漏掉其中一個元素就會壞(少skin顏色不見,少structure版面跑掉)。
- <mark style="background: #BBFABBA6;">BEM則相反：Block命名空間先決定好,Element跟Modifier都是這個Block的附屬品</mark>,`.btn--primary`只有在`.btn`底下才有意義,不是一個能脫離`.btn`單獨存在、拿去跟別的Block自由搭配的獨立class。雖然HTML上一樣疊了兩個class(`btn btn--primary`),但這兩個class不是像OOCSS那樣「兩個各自獨立、可以任意排列組合」的關係,而是「一個主體加上它自己的變體」,是同一個決策脈絡下一次決定好的,不需要像OOCSS一樣去想「這個skin可以套用在哪些不同的structure上」。
- 至於「行數」要看你指的是哪種：若是指CSS規則被拆成幾個獨立區塊(rule body),兩者其實都會拆成兩塊,行數上不見得差很多;若是指**真正省下來的重複行數**,這才是關鍵差異：OOCSS的skin被設計成可以跨btn、card、alert共用,理論上省下來的是跨元件的重複行數;而BEM的Modifier無法脫離自己的Block被別的Block重用,`.card`要同樣的紅色必須另外寫一次`.card--primary`,即使內容一模一樣,所以BEM在跨元件共用顏色的情境下反而比較容易產生重複程式碼。
- 簡單說,兩邊定性都對：OOCSS的核心成本在於要記得搭配兩個獨立class,BEM的核心成本在於 Modifier綁死Block底下、跨元件重複利用時容易重複寫。
