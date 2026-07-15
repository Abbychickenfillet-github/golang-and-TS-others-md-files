---
title: Cursor／VS Code 沒有 CSS 提示與 HTML Emmet 提示的原因
type: troubleshooting-note
tags: [cursor, vscode, emmet, css, intellisense, settings, 編輯器設定]
updated: 2026-06-16
---

# Cursor／VS Code 沒有 CSS 提示與 HTML Emmet 提示

## 症狀

- 在 `<style>` 裡打 `col` 不會跳出 `color`（沒有 CSS 屬性提示）。
- 在 HTML 裡打 `div.box` 不會跳出 Emmet 展開預覽。
- 不是 Cursor 壞掉，而是 `settings.json` 把整套原生 IntelliSense 手動關掉了。

## 根因：settings.json 這幾行

```json
"editor.quickSuggestions": { "other": false, "comments": false, "strings": false },
"editor.suggestOnTriggerCharacters": false,
"editor.snippetSuggestions": "none",
"editor.inlineSuggest.enabled": false,
"editor.parameterHints.enabled": false,
"javascript.suggest.enabled": false,
"typescript.suggest.enabled": false,
"editor.acceptSuggestionOnEnter": "off"
```

## 每個設定管什麼（對照表）

| 設定 | 關掉的後果 | 原生預設 | 想要提示該設 |
|---|---|---|---|
| `editor.quickSuggestions.other` | 打字時不自動跳建議清單（**CSS 屬性提示靠這個**） | `on` | `true` |
| `editor.suggestOnTriggerCharacters` | 輸入 `.` `<` `:` 等觸發字元不跳提示 | `true` | `true` |
| `editor.snippetSuggestions` | 不顯示 snippet → **Emmet 建議清單被擋掉** | `inline` | `inline` |
| `editor.inlineSuggest.enabled` | 關掉 AI/Copilot 行內灰字補全 | `true` | `true` |
| `editor.parameterHints.enabled` | 不顯示函式參數提示 | `true` | `true` |
| `javascript.suggest.enabled` | 關掉 JS IntelliSense | `true` | `true` |
| `typescript.suggest.enabled` | 關掉 TS IntelliSense | `true` | `true` |
| `editor.acceptSuggestionOnEnter` | Enter 不接受建議 | `on` | `on` |

### `editor.snippetSuggestions` 四個值的差別

指「程式碼片段範本」（打 `for` 跳出迴圈骨架、Emmet 展開建議都算 snippet）要顯示在建議清單的哪裡：

| 值 | 意思 |
|---|---|
| `"top"` | snippet 永遠排在清單**最上面** |
| `"bottom"` | snippet 永遠排在**最下面** |
| `"inline"` | snippet 跟一般提示**混排、依相關度排序**（**預設值**） |
| `"none"` | **完全不顯示** snippet → Emmet 建議清單被擋掉 |

> 別跟 `editor.acceptSuggestionOnEnter` 混淆，那行沒有 `inline`，只吃 `"on"` / `"smart"` / `"off"`。

### 超易混：snippet 建議 vs「灰底幽靈文字」是兩個東西

很多人（含我一開始）以為 snippet 就是那個灰灰的佔位提示，**錯**。它們是兩套獨立 UI：

```
【A】snippet 建議 → 出現在「彈出的清單」裡
    在 CSS 打  col
   ┌────────────────────────────────────┐
   │  color                     屬性      │ ← 一般提示
   │  color-scheme              屬性      │
   │  ▣ Flexbox Center      程式碼片段    │ ← snippet（小方框圖示）
   └────────────────────────────────────┘
      ↑ 整個彈出選單叫 suggestion widget
      snippetSuggestions 只決定「▣ 那種項目」排清單的哪裡

【B】灰底幽靈文字 → 完全不同的東西
   function sum(a, b) {
       return a + b        ← 灰色斜體，浮在程式碼上
   }
      ↑ 叫 inline suggestion / ghost text
      由 editor.inlineSuggest 控制（AI／Copilot），跟 snippet 無關
```

| UI | 長相 | 由誰控制 |
|---|---|---|
| suggestion widget | 彈出的**清單/選單** | `quickSuggestions`（跳不跳）、`snippetSuggestions`（snippet 排哪） |
| ghost text | 灰色斜體**幽靈文字**，浮在游標後 | `editor.inlineSuggest`（AI 補全） |

**snippet 的關鍵特徵**：選了它會展開成一段**有「跳格點」的範本**（按 Tab 在 `${1}`、`${2}` 之間跳）。Emmet `!` → HTML 骨架本質就是一個 snippet。

## 關鍵觀念：Emmet 「Tab 展開」 vs 「建議清單」是兩回事

- **Tab 展開**（打 `!` 或 `div.box` 按 Tab → 直接展開）由 `emmet.triggerExpansionOnTab` 控制，這個設定**原生預設是 `false`**（查證：VS Code 官方文件）。所以**不加這行，`!` + Tab 產生 HTML 骨架是不會動的** —— 這是常見誤解，很多人以為 Tab 展開是內建開好的。
  ```json
  "emmet.triggerExpansionOnTab": true
  ```
- 建議清單（打字時自動跳出 Emmet／CSS 展開預覽）則是 `quickSuggestions` + `snippetSuggestions` 控制，跟上面的 Tab 展開是兩條獨立路徑。
- 所以 `!` + Tab 沒反應，八成是 `emmet.triggerExpansionOnTab` 沒開，跟 quickSuggestions 無關。

## `true` 與 `"on"` 是等價的

`editor.quickSuggestions.other` 這欄同時吃布林和字串：

- `true` ≡ `"on"`（舊布林寫法 vs 新字串寫法，效果一樣）
- `false` ≡ `"off"`

寫哪個都行，但同一份設定**別混用**，否則會誤以為值被改動過。`"strings"` 原生預設是 `false`；若設 `true` 是「比預設更開」，好處是 `class="..."` 引號內也會跳提示。

## CSS 提示為什麼最容易被誤以為壞掉

`<style>` 標籤內的 CSS 走 VS Code 內嵌語言服務，但提示是否自動跳，仍受**全域** `editor.quickSuggestions` 與 `suggestOnTriggerCharacters` 控制。只要這兩個是 false，CSS 屬性提示就完全不會自己出現。

## Cursor 特有補充

Cursor 的 AI Tab 補全有時會跟 Emmet 的 Tab 展開搶 `Tab` 鍵。若打 `div` 按 Tab 跑出 AI 補全而不是 Emmet，可在設定找 Cursor 的 Tab 相關選項調整優先順序。

## 修復後

settings.json 改完 VS Code/Cursor 通常即時生效；若沒反應，`Ctrl+Shift+P` → `Reload Window`。
 Update(C:/Users/User/AppData/Roaming/Cursor/User/settings.json)
Added 9 lines, removed 9 lines
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.inlineSuggest.enabled": false,
  "editor.inlineSuggest.enabled": true,
  "editor.quickSuggestions": {
    "other": false,
    "other": true,
    "comments": false,
    "strings": false
    "strings": true
  },
  "editor.suggestOnTriggerCharacters": false,
  "editor.parameterHints.enabled": false,
  "javascript.suggest.enabled": false,
  "typescript.suggest.enabled": false,
  "editor.snippetSuggestions": "none",
  "editor.acceptSuggestionOnEnter": "off",
  "editor.suggestOnTriggerCharacters": true,
  "editor.parameterHints.enabled": true,
  "javascript.suggest.enabled": true,
  "typescript.suggest.enabled": true,
  "editor.snippetSuggestions": "inline",
  "editor.acceptSuggestionOnEnter": "on",
  "diffEditor.hideUnchangedRegions.enabled": true,
  "workbench.colorTheme": "Solarized Light",
  "[typescriptreact]": {

改好了。VS Code/Cursor 會即時套用設定,通常不用重開;如果當下那個 HTML 檔還是沒反應,按 Ctrl+Shift+P → 輸入 Reload Window 重載一次就會生效。