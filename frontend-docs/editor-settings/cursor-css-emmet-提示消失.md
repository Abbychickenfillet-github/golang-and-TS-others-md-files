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

## 關鍵觀念：Emmet 「Tab 展開」 vs 「建議清單」是兩回事

- **Tab 展開**（打 `div` 按 Tab → `<div></div>`）由 `emmet.triggerExpansionOnTab`（預設 `true`）控制。上面那些設定**沒關它**，所以 Tab 展開一直都還能用。
- 失去的是「打字時自動跳出 Emmet／CSS 建議清單」，那是 `quickSuggestions` + `snippetSuggestions` 控制的。
- 所以「提示不見」≠「功能不見」，兩者來源不同。

## CSS 提示為什麼最容易被誤以為壞掉

`<style>` 標籤內的 CSS 走 VS Code 內嵌語言服務，但提示是否自動跳，仍受**全域** `editor.quickSuggestions` 與 `suggestOnTriggerCharacters` 控制。只要這兩個是 false，CSS 屬性提示就完全不會自己出現。

## Cursor 特有補充

Cursor 的 AI Tab 補全有時會跟 Emmet 的 Tab 展開搶 `Tab` 鍵。若打 `div` 按 Tab 跑出 AI 補全而不是 Emmet，可在設定找 Cursor 的 Tab 相關選項調整優先順序。

## 修復後

settings.json 改完 VS Code/Cursor 通常即時生效；若沒反應，`Ctrl+Shift+P` → `Reload Window`。
