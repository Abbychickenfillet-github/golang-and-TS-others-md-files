---
title: 事件處理器 vs 事件監聽器 — on-event 與 addEventListener 差在哪
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, dom, event-handler, event-listener, addEventListener, once, capture, 事件]
sources:
  - https://gemini.google.com/app/8e9aa6457858bff9
related:
  - "[[Axios-vs-Fetch-回應解析與錯誤處理]]"
  - "[[事件流與事件代理]]"
  - "[[element-style動態設定-vs-className-切換]]"
  - "[[window物件三種成員與滑鼠座標-client-screen-page-與innerHTML覆蓋陷阱]]"
  - "[[content-attribute-vs-IDL-property-與表單提交機制]]"
updated: 2026-09-21
---

# 事件處理器 vs 事件監聽器 — on-event 與 addEventListener 差在哪

本篇重點 a–l，共 12 個

> 關聯原因：[[事件流與事件代理]] 講的是事件「在 DOM 樹上怎麼跑」（捕獲 → 目標 → 冒泡），這篇講的是「你要怎麼把函式掛上去接它」。
> 	兩篇合起來才完整：先知道事件會經過誰，再知道用哪種方式接。
> 而 [[content-attribute-vs-IDL-property-與表單提交機制]] 的觀念在這裡直接派上用場：<mark style="background: #ADCCFFA6;">`onclick` 是 DOM 物件上的 IDL property（一個插槽）</mark>，所以它才會被第二次賦值蓋掉。

---

## 一、主軸圖：小括號與插槽

![[學習JS_圖解_加不加小括號決定綁函式還是綁回傳值-ISO5807_2026-09-21.svg]]

（a）這張圖分上下兩半：上半是「加不加小括號」的分岔，下半是「綁第二個函式時，插槽 vs 佇列」的對比。之後追問請指回圖上的某個方框。

---

## 二、第一個坑：不能加小括號

（b）正確寫法是 <mark style="background: #BBFABBA6;">`el.onblur = checkUsername;`</mark>，<mark style="background: #FF5582A6;">不是 `el.onblur = checkUsername();`</mark>。

（c）誰對誰做什麼，兩種寫法講清楚：

| 寫法 | 這一行實際發生什麼 | 事件觸發時的結果 |
| --- | --- | --- |
| `el.onblur = checkUsername` | 你把函式本身當成一個值，賦給 `el` 的 `onblur` 插槽 | 使用者讓輸入框失焦時，瀏覽器才去呼叫這個函式 |
| `el.onblur = checkUsername()` | 引擎讀到這一行就立刻執行 `checkUsername`，再把它的回傳值（通常是 `undefined`）賦給 `onblur` | 插槽裡是 `undefined`，事件觸發時完全沒有函式可以執行 |

（d）<mark style="background: #FFF3A3A6;">記法：小括號 `()` 的意思是「現在就跑」。你要的是「等一下再跑」，所以不能加。</mark>

（e）例外情況是你「真的需要傳參數」，那就包一層函式，把呼叫延後：

```js
el.onblur = () => checkUsername('abby');            // on-event 寫法
el.addEventListener('blur', () => checkUsername('abby')); // listener 寫法
```

> [!example] 同一條規則在 Fetch API 的現場（2026-09-21 補）
> 這個坑不只出現在 DOM 元素上，只要是 `addEventListener` 都一樣。用 `AbortSignal` 監聽中斷事件時：
> ```js
> req.signal.addEventListener("abort", console.log("abort"));   // ✗ 立刻印出，插槽裡是 undefined
> req.signal.addEventListener("abort", () => console.log("abort")); // ✓
> ```
> <mark style="background: #ADCCFFA6;">`AbortSignal` 也是一個 EventTarget</mark>，所以（b）到（e）整套規則原封不動適用。AbortController 與 `{ signal }` 的完整用法（取消 fetch、逾時、一次拔掉整批監聽器）寫在 [[Axios-vs-Fetch-回應解析與錯誤處理]] 第 5 節——關聯原因：那篇是「為什麼要取消」，這篇是「怎麼把取消的處理函式正確掛上去」。

---

## 三、on-event 處理器與 addEventListener 的本質差異

（f）<mark style="background: #ADCCFFA6;">`el.onclick` 是一個「插槽」，`addEventListener` 是往一條「佇列」裡排隊。</mark>這一句解釋得了底下所有差異。

（g）插槽只有一格，所以會互相覆蓋：

```js
const btn = document.querySelector('button');

btn.onclick = functionA;
btn.onclick = functionB;   // functionA 被蓋掉，點擊時只會執行 functionB
```

（h）佇列可以排很多個，依照加入順序執行：

```js
btn.addEventListener('click', functionA);
btn.addEventListener('click', functionB);  // 點擊時 functionA 與 functionB 都會執行
```

（i）完整對照：

| 特性 | 傳統事件處理器（on-event） | 現代事件監聽器（addEventListener） |
| --- | --- | --- |
| 同一事件綁多個函式 | ❌ 不行，後面的蓋掉前面的 | ⭕ 可以，依加入順序執行 |
| 語法範例 | `el.onclick = handleClick` | `el.addEventListener('click', handleClick)` |
| 事件名稱寫法 | 要加 `on`，例如 `onclick`、`onblur` | 不加 `on`，直接寫 `'click'`、`'blur'` |
| 進階選項 | ❌ 沒有 | ⭕ 有，第三個參數可傳 `capture`、`once`、`passive`、`signal` |
| 移除方式 | `el.onclick = null` | `el.removeEventListener('click', handleClick)` |
| 相容性 | 極高，很舊的瀏覽器也支援 | IE9 以後全面支援，現代開發沒有問題 |

（j）<mark style="background: #BBFABBA6;">現代開發一律優先用 `addEventListener`</mark>，維護性與擴充性好很多。on-event 寫法只在極簡單的示範或非常舊的程式碼裡出現。

---

## 四、once：只觸發一次就自我銷毀

（k）`addEventListener` 的第三個參數傳 `{ once: true }` 時，<mark style="background: #FFF3A3A6;">這個 listener 執行完一次之後會自動把自己移除</mark>，之後再怎麼點都不會再跑。

```js
const btn = document.querySelector('button');

btn.addEventListener('click', function () {
  console.log('這個按鈕只能點一次！');
}, { once: true });
```

	常見情境：領取優惠券或折扣碼的按鈕（防止重複領取）、表單送出按鈕（避免網路慢時使用者連點造成重複送出）、初次導覽教學的一次性彈窗。

（l）<mark style="background: #D2B3FFA6;">補充：`once` 是「執行完就移除」而不是「禁止再點」。</mark>如果你要的是「處理中先鎖住、失敗還能重試」，那要自己控制 `btn.disabled`，或改用 `AbortController` 搭配 `{ signal }` 手動決定什麼時候解除監聽。

```js
const ac = new AbortController();
btn.addEventListener('click', handleSubmit, { signal: ac.signal });
ac.abort();   // 想拔掉的時候自己喊停，比記住函式參考再 removeEventListener 乾淨
```

---

## 五、⚠️ 存疑／更正

<mark style="background: #FF5582A6;">⚠️ Gemini 把第三個參數只講了 `capture` 與 `once`，漏掉常考的另外兩個。</mark>完整的 options 物件有四個常用欄位：`capture`（在捕獲階段觸發）、`once`（觸發一次後自動移除）、`passive`（承諾不呼叫 `preventDefault`，讓瀏覽器可以放心優化捲動效能）、`signal`（搭配 `AbortController` 移除）。面試問到 `addEventListener` 第三個參數時，`passive` 幾乎一定會被追問，因為它跟捲動效能直接相關。

---

## 六、自己動手

配套檔案：`demo-handler-vs-listener.html`（同一層資料夾，用瀏覽器直接開，四個按鈕各示範一種行為）

---

## 七、延伸練習

事件綁定屬於 DOM API 而非演算法，LeetCode 沒有直接對應題。最接近的是 JavaScript 專區裡「回呼與函式當值傳遞」的題目，觀念正好是（b）到（d）在講的事：

- [LeetCode 2666. Allow One Function Call](https://leetcode.com/problems/allow-one-function-call/)：<mark style="background: #BBFABBA6;">用手寫的方式實作出 `{ once: true }` 的行為</mark>，寫完再回頭看（k）會特別有感。
- [LeetCode 2620. Counter](https://leetcode.com/problems/counter/)：練「回傳函式而不是回傳值」，正好是（d）那個小括號陷阱的反面。
- [LeetCode 2637. Promise Time Limit](https://leetcode.com/problems/promise-time-limit/)：練把函式當值包一層再交出去。

---

## 八、各對話來源（原文）

### 事件處理器（2026-09-21 擷取）— https://gemini.google.com/app/8e9aa6457858bff9

使用者：所以會寫成 `element.onevent = checkUsername()` 嗎？

Gemini：不行的，不能加小括號。正確寫法是 `el.onblur = checkUsername;`。原因：不加小括號（`checkUsername`）是將函式「本身」當作一個值傳給事件處理器，這樣瀏覽器才會在使用者觸發事件（例如失去焦點 onblur）時，才去呼叫這個函式。加了小括號（`checkUsername()`）代表「立刻執行」這個函式，程式碼執行到這一行時函式就會馬上跑完，並把函式回傳的結果（通常是 `undefined`）賦值給 `el.onblur`，這會導致事件觸發時完全沒有函式可以執行。書中的範例圖示與說明中也有特別標註「不需要小括號」。

使用者：事件處理器跟事件監聽器差在哪？

Gemini：兩者最大的差別在於能不能同時綁定多個函式，以及語法與彈性。（1）事件處理器（Event Handlers）就是傳統寫法，例如 `element.onclick = functionName`，只能綁定一個函式，如果對同一個事件重複指定，後面的會覆蓋掉前面的。優點是語法簡單直覺、相容性極高；缺點是無法讓同一個事件同時執行多個獨立的任務，移除時只能設為 `null`。（2）事件監聽器（Event Listeners）是現代 JavaScript 最推薦的標準寫法，使用 `addEventListener()`，對同一個事件綁定多個函式時它們會依序執行，不會互相覆蓋；事件名稱第一個參數寫 `'click'`、`'blur'`、`'mouseover'`，前面不用加 `on`；可以傳入第三個參數控制捕獲／冒泡階段（capture）或讓事件只觸發一次（`once: true`）；隨時可以用 `removeEventListener()` 移除特定的監聽函式。在現代開發中，基本上都建議優先使用 `addEventListener`。

使用者：Once！

Gemini：對，`once: true` 是 `addEventListener` 非常好用的一個進階設定。當你傳入 `{ once: true }` 時，這個事件監聽器在被觸發執行完一次之後，就會自動自我銷毀（自動移除），後面再怎麼點擊或觸發都不會再執行了。常見的使用情境：領取優惠券／折扣碼按鈕（防止使用者重複點擊領取）、表單提交或送出按鈕（避免使用者因為網路慢連續點擊導致重複送出表單）、初次導覽教學的一次性彈出。

---

## 九、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| addEventListener 與 options（capture／once／passive／signal） | https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener | MDN，2026-09-21 查證 |
| on-event 處理器（event handler property）的定義與限制 | https://developer.mozilla.org/en-US/docs/Web/Events/Event_handlers | MDN，2026-09-21 查證 |
| AbortController 搭配 signal 移除監聽 | https://developer.mozilla.org/en-US/docs/Web/API/AbortController | MDN，2026-09-21 查證 |
| Gemini 對話原文 | https://gemini.google.com/app/8e9aa6457858bff9 | 2026-09-21 擷取 |

> 相關：註冊的 callback 何時被呼叫由 Event Loop 決定，見 [[JavaScript-Event Loop事件循環機制與閉包-面試核心]] 的 1-3。
