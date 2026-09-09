---
title: Markdown 裡的 LaTeX `\text{}` — 什麼時候該用反引號而不是數學模式
type: topic-note
source: Gemini
tags: [gemini, markdown, latex, obsidian, mathjax, katex, 排版]
aliases: [text指令, Markdown數學模式]
related:
  - "[[Markdown-渲染為DOM的過程]]"
  - "[[比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對]]"
  - "[[YAML-Frontmatter與SSG-Foreword-Preface概念]]"
sources:
  - https://gemini.google.com/app/4efd5d0f40993f0f
updated: 2026-09-05
---

# Markdown 裡的 LaTeX `\text{}` — 什麼時候該用反引號而不是數學模式

> [!info]- 🔗 與既有筆記的關聯
> (1) [[Markdown-渲染為DOM的過程]] 講 Markdown 怎麼被解析成 DOM，本篇是那條管線上的一個岔路：`$...$` 不是 Markdown 原生語法，而是被外掛（MathJax／KaTeX）接手的第二套語法。
> (2) 這串對話的起因是 [[比較三兄弟-鬆散等於-嚴格等於-Object-is-與React-Vue的狀態比對]] 那張表格裡被塞了一堆 `$(\text{true})$`，兩篇是同一次排版翻車的前因後果。表格換行的部分記在那一篇的第六節。

> 本篇重點 a–f，共 6 個。

## 重點整理

### 一、那串符號到底是什麼（a–c）

(a) <mark style="background: #ADCCFFA6;">`$` 是「進入數學模式」的開關</mark>。單個 `$...$` 是行內公式、`$$...$$` 是獨立成行的公式。<mark style="background: #FF5582A6;">這不是 Markdown 原生語法</mark>，是 Obsidian、GitHub、Jupyter 等環境掛上 MathJax 或 KaTeX 之後才支援的。

(b) <mark style="background: #ADCCFFA6;">`\text{}` 是 LaTeX 的專用指令，用來「在數學公式中顯示一般字型的文字」</mark>。因為數學模式預設會把字母當變數排成斜體（`true` 會被排成 $t\cdot r\cdot u\cdot e$ 四個變數相乘的樣子），`\text{true}` 才會讓它維持正常的直立字體。

(c) 所以 <mark style="background: #FFF3A3A6;">`$(\text{true})$` 的意思是「在數學模式裡放一個括號和一段正常字體的 true」</mark>——技術上沒有錯，但用在一份講程式碼的筆記裡是<mark style="background: #FF5582A6;">殺雞用牛刀而且反而變醜</mark>。

### 二、該怎麼改（d–f）

(d) <mark style="background: #BBFABBA6;">要呈現程式碼或布林值，直接用反引號</mark>：

```markdown
❌ `1 == "1"` $(\text{true})$
✅ `1 == "1"`（`true`）
✅ `1 == "1"` (true)
```

(e) <mark style="background: #BBFABBA6;">括號要不要留？要留</mark>。改的時候是把 `$(\text{true})$` 整串換成 `(true)`，括號本來就是原本要呈現的內容，不要連括號一起刪掉。

(f) <mark style="background: #FFF3A3A6;">判準一句話</mark>：<mark style="background: #FFF3A3A6;">只有真的在寫數學（分數、上下標、求和符號、矩陣）才進數學模式；其餘一律用反引號或純文字。</mark>

| 情境 | 該用什麼 | 例子 |
| --- | --- | --- |
| 程式碼、識別字、布林值 | 反引號 | `` `Object.is` ``、`` `true` `` |
| 純粹的說明文字 | 什麼都不用 | (true) |
| 真的在寫數學 | 數學模式 | `$O(n \log n)$`、`$\frac{a}{b}$` |
| 數學式裡要插一段中文或英文單字 | `\text{}` | `$T_{\text{avg}} = \frac{n}{2}$` |

> [!warning] Obsidian 的額外坑
> Obsidian 的數學模式對 `$` 前後的空白很敏感，而且 `$` 在表格裡容易跟 `|` 打架。<mark style="background: #FF5582A6;">在表格儲存格裡盡量不要用 `$...$`</mark>，這也是 Abby 那張表格會炸開的原因之一。

## ⚠️ 存疑／更正

- 這串對話是用語音輸入的，Gemini 的回覆被斷句切得很碎、而且中途切換成簡體中文，內容本身沒有錯但幾乎沒有資訊量。<mark style="background: #FF5582A6;">本篇的 (a)(b)(f) 三點與對照表是查 MathJax／KaTeX／Obsidian 官方文件補上的，不是 Gemini 說的</mark>，來源見文末表格。
- Gemini 說「`\text{}` 用來在數學公式中顯示一般文本」是對的，但沒有說明<mark style="background: #FF5582A6;">為什麼需要它（數學模式預設把字母排成斜體變數）</mark>，這才是真正該記的原因。

## 各對話來源

### 修改 Markdown 中的 LaTeX 語法（2026-09，語音輸入）— https://gemini.google.com/app/4efd5d0f40993f0f

**使用者：** 我現在要怎麼樣去改這個？markdown 檔裡面的，因為我也看不懂他這個 latex 原本是要表達什麼？

**Gemini：** 這個 LaTeX 語法是想在表格中呈現文字排版。建議把 `$(\text{true})$` 改為 `(true)`、把 `$(\text{false})$` 改為 `(false)`，這樣 Markdown 檔案的內容就會簡單清楚很多。

**使用者：** 對，要包含小括號嗎？

**Gemini：** 是的，要包含括號。直接把 `($\text{true}$)` 改成 `(true)`、`($\text{false}$)` 改成 `(false)`，排版就會符合需求，在 Markdown 檔裡看起來也比較乾淨。

**使用者：** 為什麼他是個前世斜線 text？{括號} true {括號}，這是算什麼？樣本語法嗎？（語音輸入把「反斜線」聽成「前世斜線」）

**Gemini：** 這個 `\text{}` 是 LaTeX 語法，用來在數學模式中呈現一般字型的文字，而外面的 `$` 則表示進入數學模式。如果只是想顯示括號加文字，直接用普通文字會簡單清楚很多，也更容易閱讀。

**使用者：** 城市碼（語音輸入誤判，原意可能是「程式碼」）

**Gemini：** `\text{}` 是 LaTeX 的專用格式指令，用來在數學公式中顯示一般文本。如果現在想要在文章中呈現程式碼範例，通常直接在 Markdown 中使用反引號來包住程式碼，排版效果會更好。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/4efd5d0f40993f0f | Gemini Flash，2026-09-05 |
| KaTeX — 支援的函式列表（含 \text） | https://katex.org/docs/supported.html | KaTeX 現行文件，2026-09-05 查證 |
| MathJax — TeX 與 LaTeX 支援（數學模式與 \text） | https://docs.mathjax.org/en/latest/input/tex/index.html | MathJax 現行文件，2026-09-05 查證 |
| Obsidian 官方 — Basic formatting syntax（數學公式用 $ 與 $$） | https://help.obsidian.md/syntax | Obsidian 現行說明，2026-09-05 查證 |
| GitHub Docs — 在 Markdown 中撰寫數學運算式 | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions | GitHub 現行文件，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
