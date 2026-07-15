# 如何判斷一個 function 是不是原生（native）？

## 一句話
把函式 `.toString()` 印出來，看到 `[native code]` 就是原生（引擎底層 C++ 實作），看得到 JS 程式碼就是自己寫的。

## 範例
```js
Function.prototype.bind.toString()   // "function bind() { [native code] }"
[].map.toString()                    // "function map() { [native code] }"
console.log.toString()               // "function log() { [native code] }"

function myFn() { return 1 }
myFn.toString()                      // "function myFn() { return 1 }"
```

## bind / call / apply 算原生嗎？
算。它們是 Function.prototype 上的內建方法（native code），所有函式都能用。

## 原生 function vs 自己寫的 function

| | 原生 function（native） | 自己寫的 function |
|---|---|---|
| 誰寫的 | JS 引擎底層（C++） | 你（用 JS 寫） |
| `.toString()` 看到什麼 | `[native code]`（看不到內部） | 看得到你寫的每一行 |
| 例子 | `bind`、`map`、`parseInt`、`console.log` | `function myFn() {...}` |
| 改得動嗎 | 改不了（引擎內建） | 你自己控制、隨時改 |
| 要自己定義嗎 | 不用，開瀏覽器就有 | 要先寫才有 |

```js
// 原生：沒定義就能用，toString 看不到內部
parseInt.toString()        // "function parseInt() { [native code] }"

// 自己寫的：toString 看得到你寫的內容
function double(x) { return x * 2 }
double.toString()          // "function double(x) { return x * 2 }"
```

> 白話比喻：原生 function 像「遙控器上內建的按鈕」（廠商做好、你只能按、拆不開）；
> 自己寫的 function 像「你自己設的自訂快捷鍵」（你決定它做什麼，也隨時改得動）。