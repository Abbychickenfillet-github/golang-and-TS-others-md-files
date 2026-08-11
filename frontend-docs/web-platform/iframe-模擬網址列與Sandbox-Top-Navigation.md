---
title: iframe 模擬網址列、Sandbox Top Navigation 與 i18n 參數定義
type: topic-note
source: Gemini
category: 技術
tags: [gemini, frontend, iframe, sandbox, same-origin-policy, i18n]
sources:
  - https://gemini.google.com/app/e9f1d9cabaeab8ff
updated: 2026-07-25
---

# iframe 模擬網址列、Sandbox Top Navigation 與 i18n 參數定義

相關筆記：[[../HTML5演進-Quirks-Mode與HTML5-API]]

本篇重點 a–j，共 10 個。

## 重點整理

### iframe 沒有原生網址列，要自己做
(a) <mark style="background: #ADCCFFA6;">`<iframe>` 是「巢狀瀏覽上下文（Nested Browsing Context）」</mark>，功能僅止於嵌入內容，本身<mark style="background: #FF5582A6;">不含任何瀏覽器原生 UI</mark>（沒有網址列、工具列、狀態列）。看起來「上方有網址列」的效果，都是工程師自己做的：一個 `<input readonly>` 模擬網址框 + 一個 `<iframe>`，兩者用 JS 把值同步在一起。

(b) 同步做法：監聽 `iframe.onload`，在裡面讀 `iframe.contentWindow.location.href` 寫回 input。<mark style="background: #FF5582A6;">但這只在「同源（same-origin）」時可行</mark>——如果 iframe 載入的是跨網域頁面，讀取 `contentWindow.location` 會直接拋出錯誤，這是瀏覽器安全機制刻意的限制，不是 bug。

(c) 圖片右上角常見的「手機／平板／電腦」預覽切換，原理是<mark style="background: #BBFABBA6;">用 CSS 改變 iframe 的寬度</mark>（例如切手機版就把 `iframe.style.width` 設成 `375px`），跟瀏覽器原生功能無關，一樣是自製組件。

### MDN 官方文件佐證
(d) 對照 [MDN iframe 文件](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)：確認 `<iframe>` 是 Nested Browsing Context，不含原生 UI；`src` 屬性定義內容來源；同源政策限制父頁面讀取跨網域 iframe 的 `window.location`。這些都與上面 (a)(b) 的說法一致，「自製網址列」屬於應用層 UI 設計，並非 HTML 標籤原生功能。

### Sandbox 與 Top Navigation
(e) <mark style="background: #FF5582A6;">sandbox 屬性預設極度受限</mark>：沒有明確加上 `allow-top-navigation` 或 `allow-top-navigation-by-user-activation`，iframe 內部完全無法把最外層分頁（`window.top`）導到別的網址，寫 `window.top.location.href = '...'` 會被瀏覽器擋下。

(f) 兩種頂層導覽權限的差異：`allow-top-navigation` 是<mark style="background: #FF5582A6;">腳本隨時可跳轉</mark>（頁面一載入就能把整個分頁轉走，這是惡意廣告常見手法）；`allow-top-navigation-by-user-activation` 則<mark style="background: #BBFABBA6;">只有使用者親手點擊 iframe 內連結／按鈕才允許跳轉</mark>，是較安全的折衷做法，能防止腳本自動跳轉。

(g) <mark style="background: #ADCCFFA6;">頂層導覽權限是「繼承制」</mark>：如果巢狀結構是「主頁面 → iframe A（Parent）→ iframe B（Nested）」，只要中間的 iframe A 沒有被授權 `allow-top-navigation`，即使最內層 iframe B 自己設定了這個屬性，也無法跳轉最外層主頁面——整條嵌入鏈（chain of embedding）都要被授權才行。

### window / parent / top 的層級關係
(h) 三層定義要分清楚：<mark style="background: #ADCCFFA6;">`window`</mark>＝目前程式碼所在那個 iframe 自己的執行環境；<mark style="background: #ADCCFFA6;">`window.parent`</mark>＝嵌入目前 iframe 的上一層視窗；<mark style="background: #ADCCFFA6;">`window.top`</mark>＝不論中間巢狀了幾層，最外面那個瀏覽器分頁本身。

(i) 「iframe 是 Element 還是 Route」的釐清：從父頁面角度看，它是 DOM <mark style="background: #ADCCFFA6;">Element</mark>（可用 `document.querySelector('iframe')` 抓到、操控寬高，像一台電視機）；從 iframe 內部程式碼執行的角度看，它是一個獨立的 <mark style="background: #ADCCFFA6;">Window 執行環境</mark>，`window` 變數指的是 iframe 內部空間，而不是外面的大視窗。<mark style="background: #FFF3A3A6;">同源政策判斷的依據是 Route（網域），不是 Element 本身</mark>：Route 跟父頁面同網域才能透過 `window.parent` 互通資料，不同網域就會被鎖死在 iframe 這個「盒子」裡。

### 附帶主題：i18n 動態參數定義（interpolation）
{% raw %}(j) 翻譯 JSON 用 <mark style="background: #ADCCFFA6;">`{{key}}`</mark> 佔位符預留變數位置，呼叫 `t('key', { name: value })` 時第二個參數把實際值帶入替換。三種進階用法各自的使用時機：<mark style="background: #FFB8EBA6;">複數（Plural）</mark>——依 `count` 自動切換單複數語法（英文 1 message / 5 messages）；<mark style="background: #FFB8EBA6;">數值格式化（Formatting）</mark>——同一數字依語系自動套用當地貨幣/日期寫法（不用自己手動拼字串）；<mark style="background: #FFB8EBA6;">HTML 嵌入（Trans component）</mark>——句子中間夾雜連結/粗體時，用 `<0></0>` 這類標籤佔位，避免拆句翻譯在日文/德文等語序不同的語言裡對不起來。純中文系統感覺不出差異，但要做英文版/多國語系時這三者是必備功能。{% endraw %}

> [!tip] 實務建議：CMS 預覽功能只需要「顯示」網址、不需要跳轉權限，保持 sandbox 限制、用自製 input 框純文字顯示網址即可，安全性最高。

## 各對話來源

### 模擬 iframe 網址列實作筆記（2026-07-25）— https://gemini.google.com/app/e9f1d9cabaeab8ff

**使用者:** 我如果嵌入iframe有辦法做到顯示那個網址嗎

**Gemini:** iframe 預設不會顯示網址列，需自製「模擬網址列」UI 組件（input + iframe 同步），並示範 HTML 基礎結構、`iframe.onload` 動態同步網址（含同源限制警語）、以及用 CSS 改寬度做響應式預覽切換。

**使用者:** 請幫我再確認一次mdn手冊跟你講得1不1樣?（附 MDN iframe 文件連結）

**Gemini:** 核對 MDN 後確認一致：iframe 是 Nested Browsing Context、無原生 UI、src 屬性定義內容、同源政策限制跨網域讀取 location；「自製網址列」屬於應用層 UI 設計而非 HTML 原生功能。

**使用者:** A sandboxed frame blocks all top navigation unless the sandbox attribute values are set to allow-top-navigation or allow-top-navigation-by-user-activation. Note that top-navigation permissions are inherited, so a nested frame can perform a top navigation only if its parent frames are also allowed to. 這1句對嗎

**Gemini:** 確認正確，並拆解 `allow-top-navigation`（腳本隨時可跳轉）vs `allow-top-navigation-by-user-activation`（僅使用者操作才可跳轉）的差異，以及權限繼承邏輯（整條嵌入鏈都要被授權）。

**使用者:** （追問繼承邏輯）不夠具體欸不太懂 是說我這邊引用他的父視窗嗎？富視窗的定義是啥而我們也沒設定呀

**Gemini:** 定義 `window`／`window.parent`／`window.top` 三層關係，並用「後台管理系統(Top) → 內容編輯器(Parent) → 實際畫面預覽(Child)」情境說明繼承邏輯，建議 Abby 的情境不需要開放這些權限，保持 sandbox 限制、用自製 input 顯示網址即可。

**使用者:** 目前代碼跑所在的那個 iframe 視窗。是指element還是route

**Gemini:** 釐清「Element（父頁面看到的 DOM 容器）」vs「Route（`src` 指向的網址內容）」，並說明同源政策判斷依據是 Route（網域）而非 Element 本身。

**使用者:** i18n 的 use fn param def?

{% raw %}**Gemini:** 解讀為 i18n 翻譯函式 `t()` 的參數定義方式，說明 `{{key}}` 佔位符 + 第二參數帶值的用法，並列出翻譯檔定義與程式碼呼叫範例。{% endraw %}

**使用者:** （追問）這3個啥時會用到

**Gemini:** 分別說明複數（Plural）、數值格式化（Formatting）、HTML 嵌入（Trans component）三種進階用法各自的使用情境與實戰對照表。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/e9f1d9cabaeab8ff | 2026-07-25 查證 |
| MDN `<iframe>` 元素文件 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | 對話中由 Abby 本人提出核對，2026-07-25 查證 |
