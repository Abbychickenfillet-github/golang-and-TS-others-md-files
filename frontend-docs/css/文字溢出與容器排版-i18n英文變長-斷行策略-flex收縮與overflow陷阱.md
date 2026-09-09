---
title: 文字溢出與容器排版：i18n 英文變長、斷行策略、flex 收縮與 overflow 陷阱
type: topic-note
source: Gemini
category: 技術
tags: [gemini, css, i18n, 多語系, 文字溢出, word-break, overflow-wrap, flexbox, overflow, futuresign]
sources:
  - https://gemini.google.com/app/33a188966032d679
  - https://gemini.google.com/app/b6641c38914d433e
updated: 2026-08-29
---

# 文字溢出與容器排版：i18n 英文變長、斷行策略、flex 收縮與 overflow 陷阱

> 本篇重點 a–n，共 14 個。兩段 Gemini 對話合併：Future Sign 官網切換英文版時 footer 標語溢出容器的修法，以及票券／掃描頁面卡片排版被 `+container` 那一層影響的除錯方向。

---

## 重點整理

### 一、為什麼切英文就爆版

- <mark style="background: #ADCCFFA6;">i18n ＝ Internationalization，國際化</mark>（i 與 n 中間有 18 個字母），指讓同一套介面支援多語系。
- <mark style="background: #ADCCFFA6;">CJK ＝ Chinese、Japanese、Korean，中日韓文字</mark>。

(a) <mark style="background: #FFF3A3A6;">同一句話翻成英文通常會變長 30% 到 50%</mark>，而中文每個字都是等寬方塊、可以在任意兩字之間換行；英文是由空白分隔的單字串，<mark style="background: #FF5582A6;">瀏覽器預設不會把一個單字從中間切斷</mark>，所以固定寬度的容器一旦裝不下最長的那個單字就會撐破或溢出。

(b) 本例的元凶是 `.footer-tagline-container` 寫死了 `max-width: 260px`，中文標語剛好塞得下，英文版 "A story about home, time, and the beauty of imperfection." 就滿出來。

### 二、三種修法（由推薦到微調）

(c) <mark style="background: #BBFABBA6;">方案一：放寬容器上限（最推薦）</mark>

```css
.footer-tagline-container {
  max-width: 320px; /* 由 260px 放寬以容納英文 */
  width: 100%;      /* 小螢幕時仍能收縮，不會硬撐 */
}
```

<mark style="background: #FFF3A3A6;">重點是 `max-width` 搭配 `width: 100%` 一起寫</mark>：`max-width` 管上限、`width: 100%` 管「空間不夠時可以縮」，兩者缺一都會在某個斷點出事。

(d) <mark style="background: #BBFABBA6;">方案二：讓文字自動斷行</mark>

```css
.footer-tagline {
  white-space: normal;      /* 確保沒有被別的規則設成 nowrap */
  word-break: break-word;   /* 遇到超長單字強制斷開 */
  overflow-wrap: break-word;/* 標準寫法，優先讓字在單字邊界換行 */
}
```

(e) <mark style="background: #ADCCFFA6;">三個屬性的差別要分清楚</mark>：

| 屬性 | 行為 | 什麼時候用 |
| --- | --- | --- |
| `white-space: nowrap` | 完全不換行，一路往右衝 | <mark style="background: #FF5582A6;">溢出時的頭號嫌疑犯</mark>，先檢查有沒有被誰設成這個 |
| `overflow-wrap: break-word` | 只有在整行放不下時才把單字切開 | <mark style="background: #BBFABBA6;">一般文案的首選</mark>，斷得最自然 |
| `word-break: break-all` | 不管三七二十一，滿了就切 | 網址、雜湊值、無空白的長字串 |

(f) <mark style="background: #FF5582A6;">`word-break: break-word` 其實是已被規範標示為 deprecated 的舊寫法</mark>，現代規範建議用 `overflow-wrap: break-word` 或 `overflow-wrap: anywhere`。兩個一起寫是為了相容舊瀏覽器，不是必須。

(g) 方案三：微調字級與行高（只差一點點時）

```css
.footer-tagline {
  font-size: 14px;  /* 或 0.9rem */
  line-height: 1.6;
}
```

(h) <mark style="background: #D2B3FFA6;">實務建議</mark>：多語系網站不要對文字容器寫死 px 寬度，改用 `max-width` ＋ `ch` 單位（例如 `max-width: 34ch`，代表約 34 個字元寬），這樣中英文都能自動適應。

---

### 三、卡片與掃描區的排版優化（票券頁）

(i) <mark style="background: #BBFABBA6;">卡片間距</mark>：卡片之間留 `margin-bottom: 16px` 左右的垂直間距，增加呼吸感，比擠在一起好掃讀。

(j) <mark style="background: #BBFABBA6;">點選回饋範圍</mark>：右側是 radio 或 checkbox 時，<mark style="background: #FFF3A3A6;">要讓整張卡片都是可點擊區（clickable area），而不是只有那個小圓圈</mark>。做法是用 `<label>` 包住整張卡片內容，這樣點卡片任一處都會觸發對應的 input，同時對螢幕閱讀器也更友善。

(k) <mark style="background: #BBFABBA6;">狀態區分</mark>：已被選中的卡片除了原本的黃色邊框，可再加上淡底色或輕微的 `box-shadow`，讓選取狀態有一致的視覺語彙。

(l) <mark style="background: #BBFABBA6;">相機掃描區（Scanner UI）</mark>：預覽框的 `border-radius` 要與上方卡片一致，維持圓角語彙統一；「相機準備中」時放一段簡單的掃描線動畫當佔位符（placeholder），提示使用者這裡即將出現畫面。

### 四、`+container` 那一層為什麼會影響排版

(m) <mark style="background: #FF5582A6;">Flexbox 衝突</mark>：如果父層是 `display: flex`，子層寫 `width: 100%` 常常會失效。原因是 flex 子項的預設值是 `flex-shrink: 1`，空間不夠時會被壓縮；再加上父層若有 `align-items: center`（交叉軸置中），子層在交叉軸方向會縮成內容的最小寬度而不是撐滿。<mark style="background: #BBFABBA6;">修法是視情況加 `flex-shrink: 0`，或把 `align-items` 改成 `stretch`（預設值）</mark>。

(n) <mark style="background: #FF5582A6;">Overflow 限制</mark>：檢查該層是否有 `overflow: hidden`。它會切掉超出邊界的內容，<mark style="background: #FF5582A6;">連 `box-shadow` 和溢出的文字都會被硬生生裁掉</mark>，看起來就像陰影消失或文字被吃掉。除錯時先在 DevTools 把這條暫時關掉，就能確認是不是它造成的。

---

## 除錯順序（遇到文字溢出時照這個順序查）

1. 開 F12 選到溢出的元素，看 Computed 面板的 `white-space` 是不是 `nowrap`。
2. 往上找有沒有寫死的 `width` 或 `max-width`（px 值）。
3. 檢查父層是不是 `display: flex`，子層有沒有被 `flex-shrink` 壓縮。
4. 檢查有沒有 `overflow: hidden` 把東西切掉。
5. 最後才調 `font-size` 或 `line-height`。

---

## 關聯筆記（以及為什麼相關）

- [[frontend-docs/css/CJK漢字復用與Noto字體選擇-i18n多語系與Docker打包]]：<mark style="background: #FFF3A3A6;">關聯原因</mark>：同樣是 i18n 主題的另一面。那篇處理「字體檔怎麼選、怎麼打包」，本篇處理「換語系之後版面怎麼不爆」，兩篇合起來才是完整的多語系前端檢查清單。
- [[frontend-docs/css/02-1-盒模型-BoxModel與border-box]]：<mark style="background: #FFF3A3A6;">關聯原因</mark>：`max-width` 到底含不含 padding 與 border，取決於 `box-sizing`。如果沒設 `border-box`，把 `max-width` 從 260px 調到 320px 的實際效果會跟預期差一截。
- [[frontend-docs/css/圖形中間挖空-hollow-的CSS做法]]：<mark style="background: #D2B3FFA6;">關聯原因</mark>：那篇也大量依賴 `overflow` 的裁切行為，本篇 (n) 的 `overflow: hidden` 陷阱是同一個機制的反面案例。
- [[frontend-docs/css/04-1-CSS方法論與權重-OOCSS-BEM-SMACSS-ITCSS]]：<mark style="background: #D2B3FFA6;">關聯原因</mark>：`.footer-tagline` 與 `.footer-tagline-container` 這種「容器負責尺寸、內容物負責排版」的拆法，正是 OOCSS 分離結構與外觀的實作。

---

## 相關練習題（CSS 沒有 LeetCode，改列等效練習）

<mark style="background: #FF5582A6;">LeetCode 與 NeetCode 沒有 CSS 排版題</mark>（LeetCode 的資料庫題是 SQL、其餘為演算法）。等效的刻意練習資源：

- CSS Battle — https://cssbattle.dev/ ：用最少字元復刻版面，逼你熟練盒模型與定位。
- Flexbox Froggy — https://flexboxfroggy.com/#zh-tw ：專練 `align-items`、`flex-shrink` 這些本篇 (m) 用到的屬性。
- CSS Grid Garden — https://cssgridgarden.com/#zh-tw ：與 vault 內既有筆記 [[frontend-docs/css/CSS-Grid-Garden-顯式網格vs隱式網格與repeat語法]] 直接對應。
- Frontend Mentor — https://www.frontendmentor.io/challenges ：有多個含長英文文案的卡片版面挑戰，適合驗證本篇的斷行策略。

---

## ⚠️ 存疑／更正

- Gemini 建議 `word-break: break-word`，但<mark style="background: #FF5582A6;">這個值在 CSS 規範中已被標示為 deprecated（僅為相容舊內容而保留）</mark>，正解應以 `overflow-wrap: break-word` 為主，必要時用 `overflow-wrap: anywhere`。詳見 MDN 的 word-break 條目說明。
- Gemini 提到「父層 `align-items: center` 導致子層縮成最小寬度」，這個描述<mark style="background: #FFF3A3A6;">只在交叉軸方向成立</mark>（例如父層 `flex-direction: row` 時影響的是高度不是寬度），原文沒有講清楚方向，本篇 (m) 已補上限定條件。

---

## 各對話來源

### 解決英文版文字溢出問題（2026-08）— https://gemini.google.com/app/33a188966032d679

使用者：我不希望英文版的時候文字超出邊框我應該在哪一層標籤下什麼屬性跟值試試看？（附截圖）

Gemini：從截圖看，切到英文版時文案 "A story about home, time, and the beauty of imperfection." 變長，撐破了設定寬度的容器。建議在 `.footer-tagline` 或 `.footer-tagline-container` 這一層調整。方案一（推薦）：`.footer-tagline-container` 目前是 `max-width: 260px`（第 646 行），英文單字較長，這個限制太死，改成 `max-width: 320px` 並加 `width: 100%`。方案二：`.footer-tagline` 加 `white-space: normal`、`word-break: break-word`、`overflow-wrap: break-word` 讓文字自動斷行。方案三：若只超出一點點，把 `font-size` 調成 14px、`line-height` 調成 1.6。

### 解決 Future Sign 排版問題（2026-08）— https://gemini.google.com/app/b6641c38914d433e

使用者：（附票券／掃描頁面截圖）排版怎麼調

Gemini：卡片設計優化——間距方面卡片之間可加 `margin-bottom: 16px` 增加呼吸感；點選回饋方面因右側有 radio 或 checkbox，應確保整張卡片都是可點擊範圍，可用 `<label>` 包住整張卡片內容；狀態區分方面最上方「票券入場」已有黃色邊框，下方活動券被選中時也可加入類似邊框色或輕微陰影。相機掃描區——圓角一致性，讓相機預覽框的 `border-radius` 與上方卡片一致；佔位符優化，「相機準備中」時加入簡單的掃描線動畫。關於 `+container` 那層影響排版：可能是 Flexbox 衝突（父層 `display: flex` 時子層 `width: 100%` 有時失效，檢查 `flex-shrink: 0` 或父層 `align-items: center` 是否導致子層縮成最小寬度），或 Overflow 限制（該層若有 `overflow: hidden` 會切斷陰影或超出範圍的文字）。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 對話：解決英文版文字溢出問題 | https://gemini.google.com/app/33a188966032d679 | 對話 2026-08，整理於 2026-08-29 |
| Gemini 對話：解決 Future Sign 排版問題 | https://gemini.google.com/app/b6641c38914d433e | 對話 2026-08，整理於 2026-08-29 |
| MDN：overflow-wrap | https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap | MDN 持續更新，查證於 2026-08-29 |
| MDN：word-break（含 break-word 已棄用說明） | https://developer.mozilla.org/en-US/docs/Web/CSS/word-break | MDN 持續更新，查證於 2026-08-29 |
| MDN：flex-shrink | https://developer.mozilla.org/en-US/docs/Web/CSS/flex-shrink | MDN 持續更新，查證於 2026-08-29 |
| MDN：overflow | https://developer.mozilla.org/en-US/docs/Web/CSS/overflow | MDN 持續更新，查證於 2026-08-29 |
| W3C CSS Text Module Level 3（規範原文） | https://www.w3.org/TR/css-text-3/ | W3C 工作草案，持續修訂 |

> 註：本次執行因本機磁碟空間吃緊，未額外擷取新截圖，原對話中的截圖請直接開上方 Gemini 連結查看。
