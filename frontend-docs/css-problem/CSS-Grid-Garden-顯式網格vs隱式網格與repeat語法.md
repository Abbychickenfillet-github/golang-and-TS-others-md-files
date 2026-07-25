---
title: CSS Grid Garden 關卡解析 — 顯式/隱式網格、repeat() 語法與 Block Axis
type: topic-note
source: Gemini
tags: [gemini, css, grid, grid-garden, block-axis]
sources:
  - https://gemini.google.com/app/d52dcb56dc438f54
updated: 2026-07-23
---

# CSS Grid Garden 關卡解析 — 顯式/隱式網格、repeat() 語法與 Block Axis

本篇重點 a–f，共 6 個

## 重點整理

a. <mark style="background: #FF5582;">顯式網格 vs 隱式網格(Explicit vs Implicit Grid)</mark>：`grid-template-rows` 定義的是顯式網格，數值的「數量」就是「列數」。若目標物件(例如 `#water`)被指定在 `grid-row: 5 / 6`，但顯式網格只定義了 2 列(如 `50px 4fr;`)，瀏覽器會為了容納它自動產生「隱式網格」，這些自動產生列的高度通常是 `auto`(依內容決定)，導致版面完全跑掉。結論：目標物件在第 N 列，`grid-template-rows` 就必須明確定義出至少 N 個值。

b. <mark style="background: #ADCCFF;">repeat(n, size) 的 n 代表列數，總列數要精確對齊</mark>：`repeat(4, 1fr)` = 4 列，`50px repeat(4, 1fr)` 總共是 1+4=5 列，剛好對應 `grid-row: 5/6`。但若多寫成 `50px repeat(4, 1fr) 1fr`，就變成 1+4+1=6 列，水仍會乖乖待在「第 5 列」，可是花園底部會多出第 6 列空地，水沒有真正「填滿最後一列」而判定失敗。

c. <mark style="background: #FF5582;">fr 是比例單位，前面必須帶數字</mark>：`repeat(4, fr)` 是無效語法（少了數字 1），瀏覽器無法判斷比例；正確寫法是 `repeat(4, 1fr)`。即使只要「1 份」也要寫成 `1fr`，不能只寫 `fr`。

d. <mark style="background: #D2B3FF;">語法邏輯正確仍不過關時的排查清單</mark>：①檢查輸入框是否已內建結尾分號，自己又多打一個變成 `;;`；②確認只需要寫 `grid-template-rows` 這一個屬性，別誤刪或覆蓋了 `grid-template-columns`；③拼字是否為複數 `rows`(不是 `row`)；④若懷疑判別器僅接受展開式寫法，可先試 `50px 1fr 1fr 1fr 1fr;` 這種不用 `repeat()` 的寫法排除語法相容性問題。

e. <mark style="background: #ADCCFF;">Block Axis(區塊軸) vs Inline Axis(行內軸)</mark>：Block Axis 是「內容堆疊、換行的方向」，在預設(由左至右、由上而下)書寫模式下等於「垂直方向」；Inline Axis 則是「同一行內文字排列的方向」，等於「水平方向」。`align-items`／`align-self` 控制物件在 Block Axis 上的對齊(start/center/end 對應頂/中/底)，`justify-items`／`justify-self` 控制 Inline Axis(水平)對齊。⚠️ 若書寫模式改為直書(如中文古籍、日文直書)，Block Axis 會變成水平方向 —— 但目前一般網頁開發只需記住「Block=垂直、Inline=水平」即可。記憶法：align 像尖塔上下對齊，justify 像鉤子橫向調整。

f. <mark style="background: #FFB8EB;">CSS Grid Garden 的進度保存方式(LocalStorage 排查衍生知識)</mark>：實測發現 Grid Garden 並未把關卡進度存進 LocalStorage(該網站 LocalStorage 只有一組隨機 `user` ID)，而是採用 <mark style="background: #ADCCFF;">URL Hash(網址錨點)</mark> 保存進度，例如網址列的 `#26` 就代表第 26 關。特點：伺服器不會讀取 Hash，但頁面 JavaScript 會讀取它來決定顯示內容；只要網址的 `#數字` 不變，刷新頁面(F5)進度不會遺失；但無痕模式關閉分頁、或手動清除瀏覽器資料時進度才會真的消失。跳關/救援技巧：直接把網址改成 `https://cssgridgarden.com/#26` 即可手動回到指定關卡。

## 各對話來源(原文，節錄)

### CSS Grid Garden 關卡 26 解析 (2026-07-23) — https://gemini.google.com/app/d52dcb56dc438f54

**使用者:** 那為什麼這邊沒有過關(使用 `50px 4fr;`)

**Gemini:** 這是經典的 CSS Grid 陷阱！你只定義了 2 列，而水被設定在第 5 列……(見重點 a)

**使用者:** grid-template-rows: 50px repeat(4, 1fr) 1fr; 換成這樣為什麼不過

**Gemini:** 你現在切出了 6 列，但水只需要待在第 5 列……(見重點 b)

**使用者:** grid-template-rows:50px repeat(4, fr); 沒讓我過關

**Gemini:** 少寫了一個「1」，fr 前面必須帶數字……(見重點 c)

**使用者:** grid-template-rows:50px repeat(4, 1fr); 她沒讓我過關

**Gemini:** 通常是分號重複、屬性寫錯或判別器相容性問題……(見重點 d)

**使用者:** https://cssgridgarden.com/ 這頁我如果刷新我玩的資料會都不見嗎／我剛剛看過localstorage了沒有欸／user1775962274143.gi1k8073pw8 只有這個 我的user

**Gemini:** 這款遊戲用 URL Hash 保存進度，不是 LocalStorage……(見重點 f)

**使用者:** align-items 在 grid layout 中控制 block axis，> block axis 指的是什麼

**Gemini:** Block Axis 是內容堆疊的方向，預設書寫模式下等於垂直方向……(見重點 e)

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/d52dcb56dc438f54 | 2026-07-23 |
| CSS Grid / repeat() / fr 單位為 CSS 規範標準行為 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout | 以 MDN CSS Grid 文件為準，查證於 2026-07-23 |
| Grid Garden 練習網站 | https://cssgridgarden.com/ | 查證於 2026-07-23 |

---
由 Gemini 對話自動整理 · 更新於 2026-07-23
