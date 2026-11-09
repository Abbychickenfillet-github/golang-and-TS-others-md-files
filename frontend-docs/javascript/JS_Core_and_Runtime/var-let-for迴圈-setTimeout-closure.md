# var vs let：for 迴圈 + setTimeout 為什麼 var 印出 3

## 程式碼

```js
for (var i = 0; i < 3; i++) {
    setTimeout(function () {
        console.log('var i =', i); // 1 秒後：3、3、3
    }, 1000);
}

for (let i = 0; i < 3; i++) {
    setTimeout(function () {
        console.log('let i =', i); // 1 秒後：0、1、2
    }, 1000);
}
```

## 重點

- **var 沒有區塊作用域**：`var i` 屬於整個函式（這裡是全域），`for` 的 `{}` 擋不住，整個迴圈只有**一個** `i`。
- **setTimeout 的 callback 是非同步的**：它等 1 秒後才執行，那時同步的迴圈早已跑完。
- 迴圈結束時 `i++` 把 `i` 加到 `3`，條件 `i < 3` 不成立才跳出，所以 `i` 停在 `3`。三個 callback 讀的都是同一個 `i`，全部印出 `3`。
- **let 在 for 迴圈中每一輪都會建立新的綁定**（Per-Iteration Binding），並把上一輪的值複製過來。每個 callback 綁定的是自己那一輪的 `i`，所以是 `0、1、2`。

## 用 var 修正（IIFE 包起來）

```js
for (var j = 0; j < 3; j++) {
    (function (captured) {
        setTimeout(function () {
            console.log('var + IIFE i =', captured); // 0、1、2
        }, 1000);
    })(j);
}
```

每一輪用 IIFE 把當下的值當參數傳進去，形成獨立的函式作用域。

## 相關

- 閉包（closure）：callback 記住的是變數的「參照」，不是「當下的值」。
- 同樣的問題也會出現在 `btn[i].onclick = function () { console.log(i); }` 這種寫法。
