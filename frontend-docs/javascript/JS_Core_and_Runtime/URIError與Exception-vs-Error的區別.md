---
title: URIError 與 Exception vs Error
type: topic-note
source: Gemini
tags: [gemini, javascript, error-handling]
sources:
  - https://gemini.google.com/app/0d9f2ea6dd05cd7b
  - https://gemini.google.com/app/7f7f6e0f59f17cde
updated: 2026-11-05
---

# URIError 與 Exception vs Error

本篇重點 a–f，共 6 個

## 重點整理

(a) <mark style="background: #ADCCFFA6;">URIError</mark> 是 JS 內建的 Error 子類型，當 `decodeURI()`、`decodeURIComponent()`、`encodeURI()`、`encodeURIComponent()` 收到不合法的 URI 就會拋出。
(b) 常見成因：<mark style="background: #FF5582A6;">非法的百分比編碼</mark>，例如 `%` 後面不是兩位十六進位數字（`%3Z`），或字串結尾只有 `%` 或 `%1`。
(c) 範例：

```javascript
try {
  decodeURIComponent('%3Z');          // 'Z' 不是合法十六進位
} catch (error) {
  console.log(error instanceof URIError); // true
  console.log(error.message);             // "URI malformed"（各引擎訊息文字略有不同）
}
```

   逐行：`try` 圈出可能拋錯的區塊 → `decodeURIComponent('%3Z')` 解碼失敗，引擎建立 URIError 並丟出 → `catch (error)` 接住 → `instanceof URIError` 檢查它的原型鏈是否含 URIError。

(d) <mark style="background: #BBFABBA6;">解法</mark>：處理使用者輸入或外部來源的 URL 字串時一律包在 `try...catch`，避免未捕捉的 URIError 讓程式崩潰。
(e) Exception vs Error：Gemini 的說法是 Exception 為「可預期且可處理的狀況」，Error 為「嚴重且通常無法恢復的問題（如記憶體不足）」。
   ⚠️ 存疑／更正：這個二分法是 <mark style="background: #FF5582A6;">Java 的分類</mark>（`Exception` 與 `Error` 都是 `Throwable` 的子類）。在 JavaScript 沒有獨立的 Exception 類別，`throw` 可以丟任何值，慣例是丟 `Error` 物件，URIError、TypeError、RangeError 都是 Error 的子類，而且都可以被 catch。
(f) 結論：講「Exception handling」時指的是 <mark style="background: #FFF3A3A6;">例外處理機制（try/catch/throw）</mark>，Error 是被丟出的物件類型之一，兩者在 JS 不是同層級的對立概念。

## 各對話來源

### URIError 解析與範例（2026-11-05 讀取）— https://gemini.google.com/app/0d9f2ea6dd05cd7b

使用者：URIError 是什麼
Gemini：JS 內建錯誤類型，URI 處理函數收到非法格式時拋出，並提供 `decodeURIComponent('%3Z')` 範例與 try...catch 建議（詳見 a–d）。

### 異常與錯誤的區別（2026-11-05 讀取）— https://gemini.google.com/app/7f7f6e0f59f17cde

使用者：Exception handling exception 就完全等於 error 嗎？
Gemini：不完全相同。Exception 通常指可預期並處理的狀況，Error 往往代表嚴重問題（詳見 e–f 的更正）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| URIError | [MDN URIError](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/URIError) | 官方文件，未於本次重新抓取 |
| Error 與子類 | [MDN Error](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Error) | 官方文件，未於本次重新抓取 |
| Java Exception vs Error | [Oracle Java Throwable](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Throwable.html) | 官方文件，未於本次重新抓取 |
| 對話原文 | 見 frontmatter sources | 2026-11-05 讀取 |

相關筆記：[[15-ReferenceError-vs-undefined-值與錯誤的分界-互動版]]（另一種 JS 內建錯誤型別 ReferenceError）。
