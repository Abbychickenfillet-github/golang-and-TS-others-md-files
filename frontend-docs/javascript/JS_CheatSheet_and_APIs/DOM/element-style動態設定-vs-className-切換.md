---
title: element.style 動態設定 vs className 切換——什麼時候用 inline style 才不算壞味道
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - DOM
  - inline-style
  - className
  - CSS
  - var-let
  - closure
aliases: [inline style, element.style, className切換]
related:
  - "[[13-閉包-Closure-私有變數與傳址陷阱]]"
  - "[[05-作用域-scope-global-function-block]]"
  - "[[事件流與事件代理]]"
sources:
  - https://gemini.google.com/app/f6838f7685a4fc80
updated: 2026-08-09
---

# `element.style` 動態設定 vs `className` 切換

> **本篇重點 a–j，共 10 個。**
> 背景：Abby 寫了一個「JavaScript 作用域與閉包記憶體綁定動畫」，用 JS 動態設定方塊的 `style.left` 來畫連線與位移，然後問 Gemini：「這樣寫算 inline 樣式嗎？這樣會不好嗎？」

![Abby 做的 var 函式作用域動畫：三個按鈕的函式全部指向同一格記憶體，迴圈結束時 i 已經是 3](../../../../obsidian-attachment/螢幕擷取畫面%202026-08-09%20110946.png)

---

## 問題一：用 JS 設 `style` 算不算 inline style

(a) <mark style="background: #BBFABBA6;">算</mark>。`el.style.left = '120px'` 跟直接在 HTML 寫 `<div style="left:120px">` <mark style="background: #ADCCFFA6;">結果完全一樣</mark>——它操作的就是元素的 inline style 屬性，會出現在 DOM 的 `style` attribute 上。

(b) <mark style="background: #ADCCFFA6;">CSS 優先序（specificity）上，inline style 高於任何選擇器</mark>（只輸給 `!important`）。<mark style="background: #FF5582A6;">這正是它「好用」與「危險」的同一個原因</mark>：它一定蓋得過去，所以也一定不受樣式表管轄。

---

## 問題二：這樣會不好嗎——分兩種情況

(c) <mark style="background: #FF5582A6;">會不好的情況：把「靜態的、事先就知道的」樣式寫進 JS</mark>。

```js
// ✗ 不好：這些值從頭到尾都不會變，卻散在 JS 裡
box.style.backgroundColor = '#c0392b';
box.style.borderRadius = '8px';
box.style.padding = '12px';
```

<mark style="background: #FF5582A6;">壞處</mark>：改配色要翻 JS、無法被 CSS 變數或主題切換影響、沒辦法用媒體查詢做 RWD、樣式散落兩處難維護。

(d) <mark style="background: #BBFABBA6;">正解：抽成 class，用 `className` 或 `classList` 切換</mark>。

```js
// ✓ 好：狀態用 class 表達，長相交給 CSS 決定
box.classList.add('is-active');
box.classList.toggle('is-highlighted', shouldHighlight);
```

(e) <mark style="background: #BBFABBA6;">不會不好的情況：值是「執行期才算得出來的」</mark>——動畫座標、拖曳位置、依資料算出的長度或角度、跟著滑鼠跑的元素。

```js
// ✓ 好：這個數字 CSS 事先不可能知道
line.style.left = `${btn.offsetLeft + btn.offsetWidth / 2}px`;
bar.style.width = `${value / max * 100}%`;
```

(f) <mark style="background: #FFF3A3A6;">判準一句話：CSS 事先寫得出來的值就交給 CSS，只有執行期才算得出來的數字才寫進 `style`</mark>。Abby 在對話中自己補的那句「那個應該算動態」，用的就是這個判準，方向是對的。

(g) <mark style="background: #D2B3FFA6;">現代折衷做法</mark>：把動態的數字寫進 CSS 自訂屬性，長相仍然留在樣式表裡。<mark style="background: #BBFABBA6;">這樣既保留了動態性，又讓所有視覺規則集中在 CSS</mark>。

```js
el.style.setProperty('--x', `${x}px`);
```

```css
.node { transform: translateX(var(--x)); transition: transform .3s; }
```

---

## 順帶複習：那支動畫在演什麼

(h) 截圖裡那支動畫演的是<mark style="background: #FFF3A3A6;">迴圈中 `var` 的經典陷阱</mark>：

```js
for (var i = 0; i < 3; i++) {
  btn[i].onclick = function () { console.log(i); };
}
// 三顆按鈕全部印出 3
```

(i) <mark style="background: #ADCCFFA6;">原因</mark>：`var` 是函式作用域，被 hoist 到迴圈外，<mark style="background: #FF5582A6;">從頭到尾只有「一格」記憶體</mark>。三個 onclick 函式的作用域鏈（scope chain）全部指向同一格，迴圈結束時那一格已經被累加到 3，所以誰讀都是 3。

(j) <mark style="background: #BBFABBA6;">改成 `let` 就好了</mark>：`let` 是區塊作用域，<mark style="background: #BBFABBA6;">每一輪迭代都會建立一個新的綁定</mark>（規格上叫 per-iteration binding），三個函式各自捕捉到不同的那一格，所以會分別印出 0、1、2。

---

## 關聯筆記與關聯原因

- [[13-閉包-Closure-私有變數與傳址陷阱]]：<mark style="background: #D2B3FFA6;">(h)–(j) 就是那篇「傳址陷阱」在迴圈場景的具體案例</mark>。閉包捕捉的是「綁定」不是「值」，這支動畫把那句抽象的話畫成了畫面。
- [[05-作用域-scope-global-function-block]]：<mark style="background: #D2B3FFA6;">函式作用域 vs 區塊作用域的差別，決定了 (i) 與 (j) 的不同結果</mark>。那篇是理論，這裡是它造成的實際 bug。
- [[事件流與事件代理]]：<mark style="background: #D2B3FFA6;">同樣是「一個迴圈綁一堆事件」的場景</mark>。事件代理提供的是另一條解法——根本不要綁三次，綁在父層用一次。

---

## 各對話來源（原文）

### 程式碼寫法與變數作用域（2026-08-09，語音對話）— https://gemini.google.com/app/f6838f7685a4fc80

> **使用者：** 你覺得寫法好嗎？
>
> **Gemini：** 這段程式碼在處理變數作用域的差異和邏輯控制上都滿清楚的，特別是透過動態展示來呈現 var 和 let 在迴圈中的行為差異，滿有助於理解的。
>
> **使用者：** one slot 的這個 class name 跟 style left 這樣子寫是算 inline 的樣式嗎？這樣會不好嗎？
>
> **Gemini：** 沒錯，直接操作 style 物件設定樣式，確實等同於寫在 HTML 元素的 inline style 裡面。這樣做本身不算不好，對於需要透過 JavaScript 動態計算位置的場景，像是動畫或座標設定，是很常見的做法。不過，如果可以的話，把靜態的樣式抽離到 CSS 檔案或透過改 className 來統一管理，會讓程式碼更好維護。
>
> **使用者：** 但那個應該算動態。
>
> **Gemini：** 你說得沒錯，在程式碼裡有些地方的樣式確實是透過計算動態產生的，這種做法在需要根據資料變化的時候是很合理且必要的。

（CSS 自訂屬性折衷做法、specificity 說明與 `let` per-iteration binding 為後續補充，原對話沒有談到。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/f6838f7685a4fc80 | 2026-08-09（對話當下） |
| MDN：`HTMLElement.style` | https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style | 查證於 2026-08-09 |
| MDN：CSS specificity（inline style 的權重） | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity | 查證於 2026-08-09 |
| MDN：使用 CSS 自訂屬性 | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties | 查證於 2026-08-09 |
| MDN：`let` 的 per-iteration binding | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let | 查證於 2026-08-09 |
| Abby 的實機截圖 | `obsidian-attachment/螢幕擷取畫面 2026-08-09 110946.png` | 擷取於 2026-08-09 |
