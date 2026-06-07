# background-clip: text(文字鏤空 / 底圖透字）

> 相關:[[for...in]](同樣是「觀念分層」的題)
> MDN:<https://developer.mozilla.org/zh-TW/docs/Web/CSS/background-clip>

## 核心觀念:border-radius 管「框」,background-clip 管「背景畫在哪」
這兩個是**不同圖層的東西**,常被搞混:
- `width/height/border-radius:50%` → 作用在 **box(盒子)**,把「框」變圓。
- `background-clip: text` → 控制**背景的繪製範圍**,把背景裁切成「文字字形」的形狀。

所以想要「數字 0 鏤空、透出底圖」要動的是 **background-clip**,不是 border-radius。
border-radius 把盒子變圓,跟文字鏤空完全無關。

## 正確三件套(缺一不可)
```css
.hollow-zero{
  font-size: 260px;
  font-weight: 900;                 /* 字夠粗才看得到底圖 */
  background: url("bg.jpg") center/cover;
  -webkit-background-clip: text;    /* 舊瀏覽器前綴 */
  background-clip: text;            /* 標準 */
  -webkit-text-fill-color: transparent; /* 關鍵:文字本體透明 */
  color: transparent;               /* 後備 */
}
```

## 為什麼我的 0 變成「實心圓」而不是鏤空?
因為 **少了 `color: transparent`(或 `-webkit-text-fill-color: transparent`)**。
- 沒讓文字透明 → 文字的實色蓋在最上面,你看不到底圖透字。
- 若 background-clip:text 根本沒生效(被覆蓋/拼錯)→ 背景就填滿整個 box,
  再加上 `border-radius:50%`,看起來就是一顆「實心圓」。
- 反過來:background-clip:text 一旦生效,背景只畫在「0」的字形上,
  圓框的背景根本不會出現,**border-radius 就失去意義了**。

## 常見雷
1. `background: url("/assets/...")` 開頭的 `/` 是「網站根目錄」絕對路徑,
   用 file:// 直接開檔會找不到圖。本機測試改相對路徑 `assets/...`。
2. 字太細看不出效果 → `font-weight` 調粗、`font-size` 調大。
3. 只寫 `background-color` 沒有圖案 → 純色裁切到文字看不出差異,用漸層或圖最明顯。
4. Safari/舊 Chrome 需要 `-webkit-background-clip` 前綴。

## 一句話
要「文字鏤空透底圖」= `background-clip:text` + **文字透明**;
`border-radius` 是把「框」變圓,跟鏤空無關。
