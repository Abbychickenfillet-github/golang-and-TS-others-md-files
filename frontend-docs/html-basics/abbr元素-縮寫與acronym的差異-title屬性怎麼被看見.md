---
title: <abbr> 元素 — abbreviation 與 acronym 的差異，以及 title 屬性怎麼被看見
type: topic-note
source: Gemini
category: 技術
tags: [gemini, html, abbr, acronym, title, accessibility, 語意化, 無障礙]
sources:
  - https://gemini.google.com/app/c9f01038758d249c
related:
  - "[[HTML文件結構-DOCTYPE與骨架]]"
  - "[[content-attribute-vs-IDL-property-與表單提交機制]]"
  - "[[HTML-Parsing-瀏覽器拿到HTTP-response-body之後]]"
  - "[[HTML5演進-Quirks-Mode與HTML5-API]]"
updated: 2026-09-21
---

# &lt;abbr&gt; 元素 — abbreviation 與 acronym 的差異，以及 title 屬性怎麼被看見

本篇重點 a–k，共 11 個

> 關聯原因：[[content-attribute-vs-IDL-property-與表單提交機制]] 講的是「HTML 原始碼裡寫的 attribute」與「DOM 物件上的 property」是兩回事。
> 	`<abbr title="…">` 正是最乾淨的範例：<mark style="background: #FFF3A3A6;">title 是 content attribute，它不會變成文字節點，所以不參與排版</mark>，只在特定出口被取用。
> 另外 [[HTML5演進-Quirks-Mode與HTML5-API]] 裡提到的「HTML5 淘汰了哪些舊標籤」，`<acronym>` 就是其中一個。

---

## 一、主軸圖：title 走哪條路才會被看到

![[學習前端_圖解_abbr的title走哪條路才會被看到或被讀出來_2026-09-21.svg]]

（a）看圖重點：<mark style="background: #ADCCFFA6;">瀏覽器 parse 完之後，`<abbr>` 底下的文字節點只有「HTML」四個字，`title` 被存成 attribute 而不是子節點</mark>，所以排版引擎不會把它排進版面。它只在圖中那三個出口浮現。

---

## 二、規範原文與翻譯

（b）HTML 規範對 `<abbr>` 的定義原文是：

> The `abbr` element represents an abbreviation or acronym, optionally with its expansion. The `title` attribute may be used to provide an expansion of the abbreviation. The attribute, if specified, must contain an expansion of the abbreviation, and nothing else.

（c）翻譯：<mark style="background: #ADCCFFA6;">`<abbr>` 元素代表一個縮寫（abbreviation）或首字縮寫詞（acronym），並可選擇性地附帶它的完整展開內容。`title` 屬性可用來提供該縮寫的完整內容。若有指定這個屬性，它的內容必須「只」放縮寫的完整展開，不得夾帶其他無關文字。</mark>

（d）<mark style="background: #FF5582A6;">最後那句 “and nothing else” 是硬性規定</mark>，所以不要寫成 `title="HTML（超文字標記語言，1993 年提出）"`，補充說明要另外找地方放。

---

## 三、abbreviation 與 acronym 差在哪

（e）兩者在中文都叫「縮寫」，但在英文語言學上是包含關係：<mark style="background: #BBFABBA6;">acronym 是 abbreviation 的一種特例</mark>。

| 類別 | 定義與讀法 | 範例 |
| --- | --- | --- |
| Abbreviation（廣義縮寫） | 把單字截短，或按字母逐個發音 | `Dr.`（Doctor）、`e.g.`（exempli gratia）、`HTML`（唸 H-T-M-L） |
| Acronym（首字組合詞） | 取詞組中每個字的首字母，組成一個「新單字」來發音 | `NASA`（唸 ˈnæsə）、`RAM`（唸 ræm）、`laser` |

（f）分界點很單純：<mark style="background: #FFF3A3A6;">能不能當成一個單字唸出來。</mark>唸得出來（NASA）就是 acronym，得一個字母一個字母唸（HTML）就只是 abbreviation。

（g）<mark style="background: #FF5582A6;">HTML5 已經把 `<acronym>` 標籤廢棄（deprecated）</mark>，現在一律用 `<abbr>` 標示所有縮寫，不分是哪一種。MDN 的說法是 `<acronym>` should not be used。

---

## 四、實際用起來會發生什麼

（h）三個效果，分別由三個不同的角色去取用同一個 attribute：

| 出口 | 誰取用 title | 使用者看到什麼 |
| --- | --- | --- |
| 滑鼠 hover | 瀏覽器的原生 tooltip 機制 | 游標停留一兩秒後浮出小氣泡，顯示完整名稱 |
| 螢幕閱讀器 | 報讀軟體（NVDA、JAWS、VoiceOver） | 可選擇朗讀完整單字，而不是逐字母唸出縮寫 |
| 機器讀取 | 爬蟲與各種 HTML 解析工具 | 拿得到縮寫對應的完整語意 |

（i）<mark style="background: #FF5582A6;">title 的內容永遠不會被渲染進版面文字。</mark>

```html
<p>我正在學習 <abbr title="HyperText Markup Language">HTML</abbr> 網頁設計。</p>
```

	畫面上實際看到的只有：我正在學習 HTML 網頁設計。
	那串 “HyperText Markup Language” 完全不佔版面，只有滑鼠移上去才會浮現。

（j）視覺上的預設樣式：<mark style="background: #D2B3FFA6;">多數瀏覽器會幫「有 title 的 abbr」加上虛線底線（`text-decoration: underline dotted`）</mark>，但這不是規範保證的。

---

## 五、⚠️ 存疑／更正

（k）兩點要修正 Gemini 的說法：

1. <mark style="background: #FF5582A6;">⚠️「文字下方通常會自動出現虛線底線」講得太肯定。</mark>MDN 明確寫著各家表現不一致：有的加虛線底線、有的加虛線底線同時把內容轉成 small caps、有的根本不做任何特殊樣式（跟 `<span>` 一樣）。要保證一致就自己寫 CSS。
2. <mark style="background: #FF5582A6;">⚠️「提升 SEO」這一點沒有實證背書。</mark>`<abbr title>` 帶來的是語意與無障礙價值，Google 從未把 title 屬性列為排名因子。寫 `<abbr>` 的理由應該是無障礙（accessibility）與可維護性，不是為了排名。
	另外 MDN 補了一條實務建議：<mark style="background: #BBFABBA6;">能在內文裡直接把全名寫出來，就不要只靠 title</mark>（因為觸控裝置沒有 hover，手機使用者永遠看不到 tooltip）。第一次出現時寫「超文字標記語言（HTML）」才是最穩的做法。

---

## 六、自己動手

配套檔案：`demo-abbr.html`（同一層資料夾，用瀏覽器直接開）

---

## 七、各對話來源（原文）

### HTML abbr 標籤解析與差異說明（2026-09-21 擷取）— https://gemini.google.com/app/c9f01038758d249c

使用者：（貼上規範原文）The abbr element represents an abbreviation or acronym, optionally with its expansion. The title attribute may be used to provide an expansion of the abbreviation. The attribute, if specified, must contain an expansion of the abbreviation, and nothing else. 翻譯整段、解釋 abbreviation 與 acronym 差異、這個 `<abbr>` 標籤到底幹啥效果。

Gemini：（1）內文翻譯：`<abbr>` 元素代表縮寫（abbreviation）或首字縮寫詞（acronym），並可選擇性地附帶其完整擴展內容。title 屬性可用於提供該縮寫的完整內容。若有指定該屬性，其內容必須僅包含該縮寫的完整擴展內容，不得有其他無關文字。

（2）Abbreviation 與 Acronym 的差異：兩者在中文都常統稱為「縮寫」，但在英文語言學上有明確區別。Abbreviation（廣義縮寫）是將單字截短，或按字母逐個發音的縮寫，例如 Dr.（Doctor）、e.g.（exempli gratia）、HTML（唸 H-T-M-L）。Acronym（首字組合詞）是擷取詞組中每個單字的首字母，並組合成一個新單字來發音，例如 NASA（唸 ˈnæsə）、RAM（唸 ræm）、Laser。關係說明：Acronym 是 Abbreviation 的一種特例。在 HTML5 中，舊有的 `<acronym>` 標籤已被廢棄，統一使用 `<abbr>` 來標示所有縮寫與首字詞。

（3）`<abbr>` 標籤的效果與實際用途：電腦視覺效果（文字下方通常會自動出現虛線底線，滑鼠懸停時瀏覽器會跳出浮動氣泡顯示完整名稱）、無障礙輔助（螢幕閱讀器能透過 title 讀出完整的單字）、SEO 與語意化（讓搜尋引擎理解該縮寫代表的真實意涵）。

使用者：那 title 裡面放的完整字元會渲染出來嗎？

Gemini：不會直接渲染（顯示）在網頁的版面文字中。title 屬性裡面的完整字元是作為補充資訊儲存在後台，只有在特定的使用者互動或輔助工具情境下才會浮現：滑鼠懸停（Hover）時瀏覽器才會跳出一個小小的原生浮動提示框（Tooltip）顯示 title 的內容；螢幕閱讀器（Screen Reader）在視障使用者使用報讀軟體時，可以選擇讀出 title 裡的完整字詞，而不是只念出縮寫字母。範例：`<p>我正在學習 <abbr title="HyperText Markup Language">HTML</abbr> 網頁設計。</p>`，畫面實際渲染結果是「我正在學習 HTML 網頁設計。」，畫面中完全看不到 "HyperText Markup Language" 這串字。

---

## 八、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| &lt;abbr&gt; 元素定義、title 用法與預設樣式不一致 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/abbr | MDN，2026-09-21 查證 |
| &lt;acronym&gt; 已廢棄，改用 &lt;abbr&gt; | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/acronym | MDN，2026-09-21 查證 |
| title 全域屬性的語意與限制 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title | MDN，2026-09-21 查證 |
| 進階文字語意教學（含 abbr 實務建議） | https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Advanced_text_features | MDN，2026-09-21 查證 |
| Gemini 對話原文 | https://gemini.google.com/app/c9f01038758d249c | 2026-09-21 擷取 |
