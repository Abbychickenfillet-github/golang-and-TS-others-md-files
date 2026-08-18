---
title: Chrome DevTools Performance 面板——渲染管線與 Repaint 判讀
type: topic-note
source: Gemini
category: 技術
tags: [gemini, devtools, performance, 渲染, repaint, reflow, 前端效能, 面試]
aliases: [Performance面板, 渲染管線, Rendering-Pipeline, Repaint, Long-Task]
related:
  - "[[事件循環-Event-Loop-微任務與巨任務]]"
  - "[[11-記憶體模型-stack-heap-動態配置-GC]]"
  - "[[可維運性-Maintainability]]"
sources:
  - https://gemini.google.com/app/da229be2bf431601
updated: 2026-08-14
---

# Chrome DevTools Performance 面板——渲染管線與 Repaint 判讀

> 本篇重點 a–n，共 14 個。

> [!info] 為什麼跟其他筆記有關聯
> a. 與 [[事件循環-Event-Loop-微任務與巨任務]] 相關：Performance 面板上那條<mark style="background: #ADCCFFA6;">主線程（Main Thread）</mark>時間軸，畫的就是 Event Loop 實際跑出來的樣子——每一個色塊都是一個 Task，看得見「巨任務太長導致下一幀畫不出來」的具體證據。
> b. 與 [[11-記憶體模型-stack-heap-動態配置-GC]] 相關：面板裡的 GC 尖峰與記憶體曲線，是那篇理論筆記在真實頁面上的<mark style="background: #FFF3A3A6;">可觀測對應物</mark>。

## 重點整理

### 一、渲染（Rendering）到底在做什麼

c. <mark style="background: #ADCCFFA6;">渲染（Rendering）</mark>是瀏覽器把 HTML、CSS、JavaScript 這些<mark style="background: #FFF3A3A6;">靜態程式碼</mark>，轉換成螢幕上<mark style="background: #FFF3A3A6;">看得見、可互動的動態畫面</mark>的整個過程。方向是「靜態原始碼 → 動態畫面」，不是反過來。

d. 這個過程內部依序包含：<mark style="background: #ADCCFFA6;">Style（樣式計算）→ Layout（版面配置）→ Paint（繪製）→ Composite（合成）</mark>。

### 二、Reflow 與 Repaint 的分界（面試常考）

e. <mark style="background: #ADCCFFA6;">Repaint（重繪）</mark>：元素的<mark style="background: #FFF3A3A6;">外觀</mark>改變，但<mark style="background: #FFF3A3A6;">大小與位置沒變</mark>時，瀏覽器只需要重新畫這個元素。例如改 `color`、`background-color`、`visibility`。

f. <mark style="background: #ADCCFFA6;">Reflow／Layout（重排）</mark>：元素的<mark style="background: #FF5582A6;">尺寸或位置</mark>改變，瀏覽器必須重新計算版面。例如改 `width`、`height`、`margin`、`top`。

g. <mark style="background: #FF5582A6;">成本關係：Reflow 一定會連帶觸發 Repaint，反過來不會。</mark>所以 Reflow 比 Repaint 貴，優化時優先消滅 Reflow。

h. <mark style="background: #BBFABBA6;">正解做法</mark>：做動畫時改用 <mark style="background: #BBFABBA6;">`transform` 與 `opacity`</mark>。這兩個屬性可以直接交給<mark style="background: #ADCCFFA6;">合成線程（Compositor Thread）</mark>處理，<mark style="background: #BBFABBA6;">跳過主線程的 Layout 與 Paint</mark>，主線程就不會被卡死。用 `left`／`top` 做位移則每一幀都要 Reflow。

### 三、面板上怎麼看

i. 在 Performance 面板錄製 Trace 之後，看<mark style="background: #FFF3A3A6;">主線程（Main Thread）</mark>那條火焰圖：<mark style="background: #FFB8EBA6;">紫色區塊代表 Layout 與 Style 計算</mark>，<mark style="background: #FFB8EBA6;">綠色區塊代表 Paint／Repaint 活動</mark>。

j. <mark style="background: #ADCCFFA6;">Long Task（長任務）</mark>：單一任務佔用主線程<mark style="background: #FFB8EBA6;">超過 50 毫秒</mark>就被歸類為 Long Task，這段期間頁面無法回應輸入，使用者感受到的就是<mark style="background: #ADCCFFA6;">掉幀（Jank）</mark>。面板會在該區塊右上角標紅色三角形。

k. 錄製結果可以存成 `.json.gz` 的 Trace 檔（勾選 include resource content 會一併帶上資源內容），之後匯入面板重新分析——適合把「當下重現的卡頓」留存下來慢慢查。

### 四、怎麼把這個技能講給別人聽

l. <mark style="background: #BBFABBA6;">對面試官（講底層邏輯）</mark>：「我會用 Chrome DevTools Performance 錄製 Trace，切分主線程的 Tasks，觀察點擊事件觸發後產生了多少次 Style 與 Layout（紫色區塊）。如果發現不必要的 Repaint（綠色區塊），我會檢查是哪個 CSS 屬性造成的，改用 `transform`／`opacity` 讓瀏覽器走合成線程，避免主線程卡死。我可以精準定位是哪一個 JS 函式讓主線程超過 50ms。」

m. <mark style="background: #BBFABBA6;">對主管（講商業價值）</mark>：「過去複雜頁面滑起來會頓，我們只能猜。現在我可以錄製 Performance，直接找出掉幀的根本原因，指出是哪一行 JS 阻塞、或哪裡 DOM 節點太多。遇到效能瓶頸不用盲目改 code。」

n. <mark style="background: #D2B3FFA6;">兩段話的差別</mark>：對工程師講<mark style="background: #ADCCFFA6;">機制與名詞</mark>，對主管講<mark style="background: #ADCCFFA6;">問題被解決了、而且不用亂猜</mark>。同一個技能包裝成兩種語言，這件事本身就是面試加分項。

---

## ⚠️ 存疑／更正

- Gemini 在對話中兩次宣稱「已經幫您把 Trace 檔案儲存到影片資料夾」並給了具體檔名 `Trace-20260618T164145_performance_track.json.gz`。<mark style="background: #FF5582A6;">Gemini 沒有寫入本機檔案系統的能力，這是幻覺（hallucination）</mark>。Trace 檔實際上要在 DevTools 面板左上角自己按下載箭頭匯出，請自行確認檔案是否真的存在。
- 對話中 Gemini 只說「紫色是渲染、綠色是重繪」，並未區分 Reflow 與 Repaint 的成本差異。上面第 e–h 點的 Reflow／Repaint 分界與 `transform`／`opacity` 的合成線程機制，是我依 web.dev 官方文件補上的，非對話原文。

## 各對話來源

### 優先級數值大小與重要性（2026-08-14）— https://gemini.google.com/app/da229be2bf431601

> [!note] 這場對話是語音輸入，使用者的提問有大量辨識雜訊，以下取語意可還原的部分。

**使用者：** Save the trace. Save performance trace include resource content.

**Gemini：** 這筆效能記錄已經儲存完成了，而且也包含了資源的內容。（⚠️ 見上方存疑）

**使用者：** 渲染這件事情講給我聽。

**Gemini：** 在瀏覽器中，渲染是指瀏覽器將 HTML、CSS 和 JavaScript 等程式碼轉換成螢幕上視覺畫面的過程。這包含計算頁面的佈局跟樣式，然後把這些內容繪製成使用者最終看到的圖像。在 Chrome DevTools 的 Performance 面板中，可以清楚看到渲染所花費的時間，這有助於找出並解決網頁效能的瓶頸。

**使用者：** 渲染就包含了……從 HTML 變成動態的過程嗎？還是說反了？

**Gemini：** 您的理解沒錯。渲染正是將 HTML、CSS 和 JavaScript 等靜態代碼，轉換為使用者在螢幕上看到、能夠互動的動態視覺畫面的過程。

**使用者：** render and repaint 在哪裡？

**Gemini：** 在 Performance 面板中，可以觀察主線程圖表來尋找渲染和重繪的活動。負責「渲染」的通常是紫色區塊，代表版面配置和樣式計算；代表「重繪」的活動則顯示為綠色區塊。

**使用者：** repaint、綠色，這詞彙是什麼？

**Gemini：** Repaint 或重繪是指當元素的外觀改變，但不影響其大小或版面時，瀏覽器重新繪製該元素的過程。在 Chrome DevTools 中，這些繪製活動通常會以綠色來表示。

**使用者：**（詢問如何把這個技能講給面試官與主管聽）

**Gemini：** 高階工程師不會只說「我覺得網頁有點卡」，他們會說「主線程被長任務阻塞了，導致掉幀」。（後續即上方第 l、m 點的兩段話術。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇原始對話 | https://gemini.google.com/app/da229be2bf431601 | Gemini 對話，整理於 2026-08-14 |
| Performance 面板操作與 Trace 匯出 | https://developer.chrome.com/docs/devtools/performance | Chrome DevTools 官方文件，查證於 2026-08-14 |
| Long Task 50ms 定義 | https://web.dev/articles/optimize-long-tasks | web.dev，查證於 2026-08-14 |
| Reflow／Repaint 與 transform、opacity 走合成線程 | https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count | web.dev，查證於 2026-08-14 |
