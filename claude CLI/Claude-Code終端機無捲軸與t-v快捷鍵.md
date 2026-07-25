---
title: Claude Code 終端機無捲軸與 t / v 快捷鍵
type: topic-note
source: Gemini
tags: [gemini, claude-code, cli, terminal]
sources:
  - https://gemini.google.com/app/5f227d7d1e62bee4
updated: 2026-07-20
---

# Claude Code 終端機無捲軸與 t / v 快捷鍵

## 重點整理

(a) Claude Code 的全螢幕終端機介面（TUI 模式）<mark style="background: #FF5582A6;">預設沒有傳統圖形捲軸（Scroll bar）</mark>。原因是它執行時會切換到終端機的<mark style="background: #ADCCFFA6;">交替螢幕緩衝區（Alternate Screen Buffer）</mark>來渲染互動介面，這個機制會直接繞過原本終端機軟體（iTerm2、VS Code 內建終端機、Ghostty、Windows Terminal）自帶的常規捲動與捲動快取限制——這也是為什麼滑鼠滾輪往上滾有時會誤觸切換成瀏覽歷史指令，或滾到一定行數就碰到硬上限、看不到更早的 diff／工具執行結果。

(b) 翻閱被截斷的歷史紀錄，內建兩個快捷鍵：
- <mark style="background: #BBFABBA6;">按 `t` 鍵（Transcript 檢視）</mark>：把整段對話完整內容「倒回」到原生終端機緩衝區，此時終端機原本的圖形捲軸恢復作用，可用滑鼠自由滾動或 `Cmd/Ctrl+F` 搜尋；閱讀完按 `q` 或 `Esc` 回到 Claude Code 互動介面。
- <mark style="background: #BBFABBA6;">按 `v` 鍵（外部編輯器開啟）</mark>：把目前對話紀錄寫入暫存檔，並自動用系統預設編輯器（VS Code、Vim 等）開啟，可用編輯器完整的捲軸與搜尋功能檢視全部歷史脈絡。

(c) 日常聊天的微幅畫面移動，可直接用鍵盤 `Page Up` / `Page Down` 在 viewport 內上下滾動，不需要進到 Transcript 模式。

## 各對話來源

### Claude Code 終端機捲軸問題與解決（2026-07-20）— https://gemini.google.com/app/5f227d7d1e62bee4
使用者：Claude code的終端機是不是沒有捲軸scroll bar
Gemini：是的，TUI 模式因切換到交替螢幕緩衝區（Alternate Screen Buffer）而繞過終端機原生捲軸；提供兩個解法快捷鍵：`t`（Transcript 檢視，倒回原生緩衝區用滑鼠/Cmd+F 檢視，`q`/`Esc` 退出）與 `v`（寫入暫存檔並用預設編輯器開啟）；日常微幅移動可用 Page Up/Down。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/5f227d7d1e62bee4 | 2026-07-20 查證 |
