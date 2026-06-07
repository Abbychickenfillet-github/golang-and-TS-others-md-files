# Day 1 — 數字「1」：絕對定位 + rotate 拼字形

題目：https://100dayscss.com/days/1/
在藍色漸層方塊上，用兩條白色圓角長方形拼出數字「1」：
- `#one-two`：主幹（直立的豎線）
- `#one-one`：頂端那一勾（斜撇），靠 `rotate` 斜放

---

## 我踩到的 4 個雷

### 1. `#one-one` 沒寫 `width` → 斜線看起來壞掉(是很醜)
`rotate(50deg)` **有在作用**，但因為 div 裡有文字「1」又沒給 `width`，
盒子寬度被文字撐開、不固定，轉完就是一塊歪掉的東西，不像細長斜撇。
➡️ 補 `width: 24px;`（要跟豎線同寬）斜撇才會回來。

### 2. `.number` 的 `position` 打成 `postion` → 整行失效
```css
.number{ postion: relative; }   /* ⚠️ 拼錯，無效 */
```
失效後 `#one-one`(absolute) 往上找定位脈絡，會抓到 `.center` 而不是 `.number`，
座標原點跑掉。➡️ 改成 `position: relative;`，讓 `.number` 真的當定位脈絡。

### 3. `#one-two` 沒寫 `position` → `top/left/z-index` 全失效
預設是 `static`，`static` 元素的 `top/left/z-index` **完全無效**，只能待在正常流。
➡️ 補 `position: absolute;`，偏移值才會生效。

### 4. div 裡放了文字「1」
原題的兩個 div 是**空的**，純用白塊拼形狀。放文字會撐大盒子、疊在白塊上破壞比例。
➡️ 清空：`<div id="one-one"></div><div id="one-two"></div>`

---

## 核心觀念：定位脈絡 (containing block)
`position: absolute` 的元素，`top/left` 是相對「**最近的、有定位的祖先**」計算。
協調兩塊相對位置的正確做法：
1. 讓 `.number` `position: relative` → 當共同原點
2. 兩塊都 `position: absolute` → 共用同一個左上角原點
3. 先放好豎線當基準，再用 `top/left` 把斜撇推到豎線頂端、旋轉

---

## 核心觀念：`rotate` 繞中心，`left` 負值是「視覺微調」出來的
- `transform-origin` 預設 = 元素**正中心 (center center)**
- 順序是：先 `top/left` 擺位 → 再 `rotate` 繞中心轉
- `left` 設的是「**旋轉前**」的左邊界；轉 50° 後視覺位置整個位移，
  所以要用 `left` 負值把整條往左推，讓斜勾下端接到豎線左上角
- `left: -16px` 這種值**沒有公式**，是一邊改一邊看、對齊到滿意才停的 trial-and-error
- 它跟 `width / height / 角度 / 豎線位置` 連動：任何一個改了，這個負值就要重調

💡 想讓偏移好預測：把 `transform-origin: bottom left;`，讓它繞**左下角**轉，
左下角固定不動，就能先把那個角擺在豎線頂端，`left` 補償量會小很多、更直覺。

---

## 修正後參考
```css
.number{ position: relative; width: 24px; height: 100px; }

#one-one{   /* 斜撇 */
  position: absolute; width: 24px; height: 40px;
  top: -8px; left: -16px;
  background:#fff; border-radius:3px;
  transform: rotate(50deg);
  box-shadow:0 0 13px 0 rgba(0,0,0,0.2);
}
#one-two{   /* 豎線 */
  position: absolute; width: 24px; height: 100px;
  top: 0; left: 0;
  background:#fff; border-radius:3px;
  box-shadow:0 0 13px 0 rgba(0,0,0,0.2);
}
```
主要是文檔流的問題還有 background-clip的屬性練習，好像最後沒有用這個屬性但是也可以用好像是靠border-radius的粗度來控制的
2026-06-07 需要再處理
相關：[[../css-problem]]、定位脈絡 / transform-origin
