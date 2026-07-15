# bubble-sort.py19 console.log打了以後要怎麼讓.js檔

> Cursor · 2026-06-02 11:17 · `2c15adb5-2289-461d-b1c2-2fb6e7adf864` · 3 則

## 你
@bubble-sort.py:19 console.log打了以後要怎麼讓.js檔案log

## Cursor
查看你的 JavaScript 檔案與專案結構，以便說明如何執行並看到 `console.log` 輸出。

## Cursor
`.js` 檔裡的 `console.log` **不會自己出現**，要先把檔案「跑起來」。依檔案類型有兩種常見做法：

## 1. 純 `.js`（例如 `while-loop.js`）→ 用 Node.js

在終端機進到專案資料夾後執行：

```bash
cd c:\coding\JavaScript-practicing
node while-loop.js
```

輸出會直接印在終端機。

若出現 `node` 不是指令，請先安裝 [Node.js](https://nodejs.org/)，安裝後重開終端機再試。

在 Cursor 裡：`` Ctrl+` `` 開終端機 → 輸入上面的 `node` 指令即可。

---

## 2. 寫在 `.html` 裡的 `<script>` → 用瀏覽器

像 `createElement-method.html`、`object.entries.html`：

1. 用瀏覽器開啟該 HTML（雙擊或在 Cursor 用 Live Server 等擴充）
2. 按 **F12** 開開發者工具
3. 切到 **Console** 分頁  
   `console.log` 會出現在那裡，不是終端機。

---

## 和你現在的 `while-loop.js` 有關

你目前的程式：

```1:4:c:\coding\JavaScript-practicing\while-loop.js
while(i<10){
    i++;
    console.log(i);
}
```

執行 `node while-loop.js` 時，若沒先宣告 `i`，可能會報 `i is not defined`。可先改成：

```javascript
let i = 0;
while (i < 10) {
  i++;
  console.log(i);
}
```

再執行一次 `node while-loop.js`，應會印出 `1` 到 `10`。

---

## 對照：`bubble-sort.py` 那行註解

Python 用 `print()`，在終端機執行：

```bash
python bubble-sort.py
```

JavaScript 的 `console.log` 對應的就是：**純 JS 用 `node 檔名.js`，HTML 內的 script 用瀏覽器 Console**。
