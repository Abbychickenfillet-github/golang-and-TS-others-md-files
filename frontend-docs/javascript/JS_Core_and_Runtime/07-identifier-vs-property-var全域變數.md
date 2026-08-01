---
title: identifier vs property —— var 全域變數為什麼會變成 window 屬性
type: topic-note
tags: [javascript, identifier, property, var, window, global-scope]
aliases: [identifier-vs-property-var全域變數]
related:
  - "[[字面量-關鍵字-識別碼基礎]]"
updated: 2026-07-29
---

# identifier vs property（簡版）

> [!info]- 📍 承接06，銜接08
> <mark style="background: #ADCCFFA6;">承接</mark>：[[06-靜態檢查vs動態檢查-TS-vs-JS]]是編譯期收尾，這篇是執行期的第一篇——`var`全域宣告在執行期被引擎實作成`window`的property，是識別碼在執行期具體落地的例子。
> <mark style="background: #BBFABBA6;">下一步</mark>：`var`變`window`property只是執行期眾多行為之一；下一篇[[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]講執行期真正的核心機制——Execution Context。

`var a = 1;` 的 `a`，同時是兩件事，分屬不同層次，不衝突：

- **語法層次**：`a` 是 **identifier**（識別碼）——原始碼裡用來稱呼這個變數的名字，要符合命名規則（開頭限英文字母/`_`/`$`，不可用保留字等）。
- **執行期層次**：只有 `var` 在**全域作用域**宣告時，引擎才會把這個綁定實作成 **`window` 物件的一個 own property**，所以才能用 `window.a` 讀到。`let`/`const` 的全域綁定不會變成 `window` 的 property。

一句話：**identifier 是語法分類（這個名字是什麼角色）；property 是 `var` 全域綁定在執行期的實作方式**，兩者描述同一個 `a`，只是站在不同層次講話。

> 🔗 這裡的「執行期」跟 [[函式呼叫核心機制-Execution-Context-與-Parameter-Binding]] (g) 節講的是同一個「執行期」——都是指 Parse／編譯完成、Bytecode 產生之後，程式碼真正被跑的那個階段（含 Creation Phase、Execution Phase），不是編譯期。

完整版（含命名規則細節、Declarative Environment Record 說明）見 [[字面量-關鍵字-識別碼基礎]]。

---

> [!info]- ➡️ 下一篇
> [[08-函式呼叫核心機制-Execution-Context-與-Parameter-Binding]]——執行期真正的核心機制：每次呼叫函式怎麼建立Execution Context。
