# DOM：動態建立元素（createElement 流程）

> 可執行範例：`JavaScript-practicing/createElement-method.html`
> MDN：<https://developer.mozilla.org/zh-TW/docs/Web/API/Document/createElement>

## 一句話

用 JS 動態加元素的固定三步：**① 建立元素 → ② 填入內容 → ③ 插進 DOM**。沒做第 ③ 步，元素只存在記憶體裡，畫面看不到。

---

## 範例拆解（你的 createElement-method.html）

```js
document.body.onload = addElement;     // 頁面載入完才執行（此時 DOM 已存在）

function addElement(){
  // ① 建立一個 <div> 元素（此時還沒進畫面）
  const newDiv = document.createElement("div");
  newDiv.id = "newDiv";

  // ② 建立文字節點，塞進 newDiv
  const newContent = document.createTextNode("這是動態建立的 div");
  newDiv.appendChild(newContent);

  // ③ 找到參考點，把 newDiv 插進 DOM（畫面才看得到）
  const currentDiv = document.getElementById("div1");
  document.body.insertBefore(newDiv, currentDiv);   // 插在 currentDiv 「之前」
}
```

---

## 用到的 API

| API | 作用 |
|---|---|
| `document.createElement("div")` | 建立一個元素節點（還沒進畫面） |
| `document.createTextNode("文字")` | 建立純文字節點 |
| `element.appendChild(child)` | 把子節點加到某元素「裡面的最後」 |
| `document.getElementById("div1")` | 用 id 抓既有元素 |
| `parent.insertBefore(新節點, 參考節點)` | 把新節點插在「參考節點之前」 |

### `insertBefore` 的順序別搞反
```js
parent.insertBefore(要插入的新節點, 要插在它前面的節點)
//                    ↑ 新的              ↑ 參考點
```

---

## 填內容的三種方式（重要對照）

```js
// 方式1：createTextNode + appendChild（範例用的，最「正統」）
el.appendChild(document.createTextNode("文字"))

// 方式2：textContent（推薦，最簡單安全）
el.textContent = "文字"

// 方式3：innerHTML（會解析 HTML 標籤，有 XSS 風險，放使用者輸入要小心）
el.innerHTML = "<b>文字</b>"
```
- 純文字 → 用 **`textContent`** 最省事。
- 要插 HTML 結構 → 才用 `innerHTML`，但別塞未經處理的使用者輸入。

---

## 現代寫法（比 appendChild / insertBefore 更直覺）

```js
parent.append(child)        // 加到最後（可一次多個、可直接加字串）
parent.prepend(child)       // 加到最前
refNode.before(newNode)     // 插在 refNode 前（取代 insertBefore）
refNode.after(newNode)      // 插在 refNode 後
```

---

## 何時執行？（onload / DOMContentLoaded）

DOM 操作要等「元素已經存在」才做，否則 `getElementById` 抓到 `null`。
```js
document.body.onload = addElement;          // 範例寫法
window.addEventListener("DOMContentLoaded", addElement);  // 更常見、更早觸發
```
或把 `<script>` 放在 `</body>` 前，也能確保 DOM 已載入。

---

## 記憶總表
| 步驟 | 做什麼 | API |
|---|---|---|
| ① 建立 | 造元素 / 文字節點 | `createElement` / `createTextNode` |
| ② 填內容 | 塞文字或子節點 | `textContent`（推薦）/ `appendChild` |
| ③ 插入 | 放進 DOM 畫面才看得到 | `append` / `prepend` / `before` / `insertBefore` |

> 最常忘的就是第 ③ 步——只建立不插入，畫面什麼都不會出現。
