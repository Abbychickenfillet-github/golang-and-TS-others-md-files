---
title: <var> 元素、規範性用語（非規範性 vs 非常規）與 HTML 元素內容分類（Categories）
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - html
  - var
  - spec
  - content-categories
  - 語意化
sources:
  - https://gemini.google.com/app/2b8407f2cdd83035
  - https://gemini.google.com/app/f6a294f58e2cc5fd
related:
  - "[[abbr元素-縮寫與acronym的差異-title屬性怎麼被看見]]"
  - "[[HTML文件結構-DOCTYPE與骨架]]"
updated: 2026-10-23
---

# `<var>` 元素、規範性用語（非規範性 vs 非常規）與 HTML 元素內容分類（Categories）

本篇重點 a–h，共 8 個

> 關聯原因：[[abbr元素-縮寫與acronym的差異-title屬性怎麼被看見]] 同樣是「語意化行內元素」，本篇再補上 `<var>`，並把讀規格書（WHATWG HTML Spec）時會遇到的兩組詞彙一次講清楚。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">`<var>`</mark> 是 variable（變數）的縮寫，<mark style="background: #FFF3A3A6;">用途是在文章段落中標記「變數或佔位符」</mark>，跟換行完全無關。
　　規格書範例：`<p>If there are <var>n</var> pipes…</p>`，渲染後 n 預設以斜體顯示。

(b) 會把 `<var>` 誤認成換行，是因為跟 `<br>`（Line Break，真正的換行）與 `<pre>`（Preformatted Text，保留原始排版與換行）搞混。
　　<mark style="background: #BBFABBA6;">要換行用 `<br>`，要保留排版用 `<pre>`，要標示變數才用 `<var>`</mark>。

(c) <mark style="background: #ADCCFFA6;">非規範性（Non-normative）</mark>指「參考用、非強制」的內容，例如規格書裡的歷史背景、舉例與備註。
　　不看這段，實作出來的行為仍然完全符合標準。

(d) <mark style="background: #ADCCFFA6;">非常規的（Non-conforming）</mark>指「違反規定、不合標準」的寫法。
　　<mark style="background: #FF5582A6;">兩者中文很像但意思相反方向：前者是「說明文字的性質」，後者是「你寫的 code 有問題」</mark>。

(e) 對照表：

| 詞彙 | 修飾對象 | 意思 | 例子 |
|---|---|---|---|
| Non-normative（非規範性） | 規格書的某段文字 | 補充說明，不具強制力 | 歷史沿革、範例 |
| Non-conforming（非常規） | 作者寫的標記或實作 | 違反規格，可能出問題 | 使用已廢棄的標籤 |

(f) HTML 規格把元素依用法分成「內容類別（Content Categories）」，例如 Flow content（流程內容）、Phrasing content（短語內容）。
　　`p`、`div` 屬於 Flow content，`img`、`strong` 屬於 Phrasing content，一個元素可同時屬於多類。

(g) 分類的好處：<mark style="background: #FFF3A3A6;">規範「哪個元素可以放進哪個元素裡面」，讓 parser 與開發者對巢狀結構有共同的規則</mark>。

(h) 不是所有元素都必須有類別：<mark style="background: #FFF3A3A6;">`head` 的 Categories 欄寫 None</mark>，代表它不屬於任何內容類別，它只能出現在 `html` 的固定位置。

⚠️ 存疑/更正：Gemini 第二段回答「幫助瀏覽器正確解析網頁結構」說法偏簡化。內容類別主要是規範「內容模型（Content Model，誰能放進誰）」，瀏覽器 parser 對錯誤巢狀其實有容錯演算法，並不依賴這個分類才能運作。

## 各對話來源（原文）

### 祖先來源物件解析（2026-10）— https://gemini.google.com/app/2b8407f2cdd83035

**使用者：** <var>標籤我第一次看到它是一個可以儲存n換行符號的標籤嗎

**Gemini：** 不是的！<var> 標籤不是用來儲存換行符號的，它跟換行完全沒有關係。在 HTML 中，<var> 是 Variable（變數）的縮寫，用來在文字段落中標記一個「變數」或「佔位符」。…… 預設樣式：瀏覽器通常會把 <var> 內文字用斜體顯示。（節錄）

**使用者：** 非常規的跟非規範性的意思上有差嗎

**Gemini：** 非規範性（Non-normative）：指的是「這不是硬性規定／標準」（例如規格書中的補充說明、舉例、歷史背景）。非常規的（Non-conforming）：指的是「不符合常規、不合規定」。簡單對照：非規範性＝參考用、不看也無所謂；非常規＝違反規定、會出問題。（節錄）

### HTML 元素分類（2026-10）— https://gemini.google.com/app/f6a294f58e2cc5fd

**使用者：** 這個 Waterbury 的 Spark 。都寫 categories none 。那 head element 它沒有 categories 。那有 categories 的 element 會是哪一些呢？（語音輸入，原文如此）

**Gemini：** 在 HTML 規範中，會將元素分類到不同的類別中，比如「流程內容」或「短語內容」。像是 p 或 div 就是流程內容，而 img 或 strong 則屬於短語內容。有些元素可能同時屬於多個類別，而像 head 這樣特定的元素，則可能不屬於任何類別。

**使用者：** 這樣子對他們來說有什麼好處嗎？或是幫助？

**Gemini：** 這些分類能幫助瀏覽器正確解析網頁結構，並確保元素能正確呈現。（回答被截斷）

**使用者：** 是它一定要有分類嗎？

**Gemini：** 不一定，並不是所有的 HTML 元素都需要有分類。head 元素的 categories 就寫著 None。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| `<var>` 元素 | [MDN：var](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var) | 2026-10-23 依常識列出，未逐字核對 |
| 內容類別（Kinds of content） | [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content) | Living Standard，持續更新，2026-10-23 列出 |
| 對話原文 | 上列兩則 Gemini 連結 | 2026-10 |
