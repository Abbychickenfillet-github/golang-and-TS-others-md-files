---
title: border-radius 縮寫順序—為什麼它不像 margin 繞圈圈
type: topic-note
source: Gemini
tags: [gemini, css, border-radius, shorthand, 圓角]
sources:
  - https://gemini.google.com/app/dddc61acda639957
updated: 2026-08-08
---

# border-radius 縮寫順序—為什麼它不像 margin 繞圈圈

> 🔖 本篇重點索引：a–i，共 9 個。

## 重點整理

**(a)** <mark style="background: #FF5582A6;">先破除最大的誤會</mark>：`border-radius` 的縮寫邏輯<mark style="background: #FF5582A6;">跟 `margin`／`padding` 完全不同</mark>。`margin` 是「邊」的四方向繞圈（上→右→下→左），`border-radius` 是「角」的<mark style="background: #FFF3A3A6;">對角線分配</mark>——省略的值是拿「對角」來補，不是拿「對邊」來補。

**(b)** <mark style="background: #ADCCFFA6;">四值完整寫法的起點與方向</mark>：從<mark style="background: #FFF3A3A6;">左上角開始，順時鐘</mark>——左上 → 右上 → 右下 → 左下。

```css
/* 左上 | 右上 | 右下 | 左下 */
border-radius: 0px 20px 40px 20px;
```

**(c)** <mark style="background: #BBFABBA6;">值的數量對照表（背這張就夠）</mark>：

| 值的數量 | 對應位置 | 省略規則 |
|---|---|---|
| 1 個值 | 四個角全部相同 | — |
| 2 個值 | ①左上＋右下，②右上＋左下 | 兩組對角各一個值 |
| 3 個值 | ①左上，②右上＋左下，③右下 | 中間那個值管<mark style="background: #FFF3A3A6;">兩個對角</mark> |
| 4 個值 | 左上 → 右上 → 右下 → 左下（順時鐘） | — |

**(d)** <mark style="background: #FFF3A3A6;">直接解 Abby 的原題</mark>：`border-radius: 0px 20px 40px;` 三個值分別是——

- 第一個 `0px` → <mark style="background: #ADCCFFA6;">左上角（Top-left）</mark>
- 第二個 `20px` → <mark style="background: #ADCCFFA6;">右上角（Top-right）與 左下角（Bottom-left）</mark>，這兩個是一組對角
- 第三個 `40px` → <mark style="background: #ADCCFFA6;">右下角（Bottom-right）</mark>

所以答案不是「哪邊是上下、哪邊是左右」——<mark style="background: #FF5582A6;">border-radius 根本沒有上下左右的概念，只有四個角</mark>，這正是題目本身容易卡住的原因。

**(e)** <mark style="background: #D2B3FFA6;">好記的心法</mark>：想像從左上角出發、順時鐘繞一圈。給幾個值就走幾步，<mark style="background: #FFF3A3A6;">走不完的角，就抄「它正對面那個角」的值</mark>。三值時右下（第三步）已經寫了，剩下的左下（第四步）就抄它的對角右上，所以右上與左下同值。

**(f)** <mark style="background: #BBFABBA6;">寫不確定時的兩個保險做法</mark>：

```css
/* 保險做法一：一律寫滿四個值，不靠省略規則 */
border-radius: 0px 20px 40px 20px;

/* 保險做法二：拆成長寫法，語意最清楚、code review 也最好讀 */
border-top-left-radius: 0px;
border-top-right-radius: 20px;
border-bottom-right-radius: 40px;
border-bottom-left-radius: 20px;
```

**(g)** <mark style="background: #ADCCFFA6;">進階—斜線 `/` 語法可以做橢圓圓角</mark>：`border-radius` 的每個角其實吃<mark style="background: #FFF3A3A6;">兩個半徑</mark>（水平 rx 與垂直 ry）。斜線前面那組是全部角的<mark style="background: #FFB8EBA6;">水平半徑</mark>，後面那組是<mark style="background: #FFB8EBA6;">垂直半徑</mark>。不寫斜線時，垂直半徑預設等於水平半徑，圓角就是正圓弧。

```css
/* 水平半徑 / 垂直半徑 → 每個角都是橢圓弧 */
border-radius: 50px / 20px;

/* 經典的「葉子形」按鈕 */
border-radius: 0 100% 0 100% / 0 100% 0 100%;
```

**(h)** <mark style="background: #FFB8EBA6;">百分比的基準不一樣</mark>：`border-radius` 用 `%` 時，<mark style="background: #FF5582A6;">水平半徑以元素寬度為基準、垂直半徑以元素高度為基準</mark>（跟 `padding` 的 `%` 一律看寬度不同）。所以 `border-radius: 50%` 在正方形上得到正圓，在長方形上會得到橢圓。

**(i)** <mark style="background: #FF5582A6;">半徑過大時瀏覽器會等比縮小</mark>：若相鄰兩個角的半徑加起來超過該邊的長度，瀏覽器<mark style="background: #BBFABBA6;">不會報錯</mark>，而是把所有半徑<mark style="background: #FFF3A3A6;">乘上同一個縮放係數</mark>直到剛好塞得下。這就是為什麼寫 `border-radius: 9999px` 可以安全地做出膠囊（pill）形狀——不用去算元素高度的一半。

## 各對話來源

### CSS border-radius 三值縮寫解析（2026-08）— https://gemini.google.com/app/dddc61acda639957

<mark style="background: #FFF3A3A6;">使用者：`border-radius: 0px 20px 40px;` 哪一邊是上下哪邊是左右</mark>

Gemini：直接拆解三個值分別對應左上、右上＋左下、右下（重點 d）；指出 `border-radius` 的縮寫邏輯與 `margin`／`padding` 不同，是以對角線為邏輯分配（重點 a）；附上 1／2／3／4 個值的完整對照表（重點 c）；建議容易搞混時改用四值縮寫或拆成 `border-top-left-radius` 等長寫法（重點 f）。

> 註：重點 (g)(h)(i) 的橢圓語法、百分比基準與半徑縮放規則為本次整理時依 MDN 與 CSS 規範補充，原對話未涵蓋。

## 資料來源（含查證時間）

> 查證日期：2026-08-08（Gemini 對話為 2026-08，模型為 Flash-Lite；縮寫順序已對照 MDN 與 W3C 規範確認無誤，補充內容另註出處）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話原文 | [CSS border-radius 三值縮寫解析](https://gemini.google.com/app/dddc61acda639957) | 2026-08 |
| `border-radius` 縮寫順序與 `/` 語法 | [MDN — border-radius](https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius) | MDN，持續更新 |
| 百分比基準與半徑過大時的縮放規則 | [W3C CSS Backgrounds and Borders Level 3 — Corner Overlap](https://www.w3.org/TR/css-backgrounds-3/#corner-overlap) | W3C CR，持續更新 |
| `margin` 四值繞圈邏輯（用來對照差異） | [MDN — margin](https://developer.mozilla.org/en-US/docs/Web/CSS/margin) | MDN，持續更新 |

## 相關筆記

- [[02-1-盒模型-BoxModel與border-box]]——關聯原因：圓角是切在 border box 的四個角上，元素設 `box-sizing: border-box` 與否會改變實際邊框大小，也就改變了 (i) 半徑縮放的觸發門檻。
- [[圖形中間挖空-hollow-的CSS做法]]——關聯原因：同屬「用 CSS 做形狀」的技巧，本篇 (g) 的斜線橢圓語法常跟挖空技巧一起用來做非矩形卡片。
- [[svg-basics-and-display]]——關聯原因：`border-radius` 只能處理矩形的四個角，複雜曲線得改用 SVG 的 `path` 或 `clip-path`；兩篇合看可以判斷「什麼時候該離開 CSS」。
- [[03-1-樣式階層表變數定義帶編譯解釋]]——關聯原因：實務上圓角值通常抽成 CSS 變數（如 `--radius-md`）統一管理，那篇講變數定義與階層，是本篇落地到設計系統的前置。

## 互動練習

同層的 [[border-radius-互動練習.html]] 是可直接用 Obsidian HTML Reader 外掛開啟的即時預覽工具——拖動四個角的滑桿看形狀變化，並即時顯示對應的縮寫寫法。
