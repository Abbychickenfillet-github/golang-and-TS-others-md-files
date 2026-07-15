---
title: claude 指令跑不出來｜排查索引
created: 2026-06-21
tags: [CLI, claude, powershell, troubleshooting, windows]
authors: [Abby, Claude]
---

# claude 指令在終端機跑不出來 — 排查索引

> 互動版見 👉 [[claude-指令跑不出來-排查筆記.html]]（用 Obsidian HTML Reader 開,含填空/是非/申論/可切換答案）

## 一句話結論

`Get-Command claude` 回 `ExternalScript claude.ps1` = **claude 有裝、在 PATH 裡**。
問題不是「找不到」,而是「殼有了但執行不起來」。

## 症狀 → 處方

| 症狀 | 病因 | 處方 |
|------|------|------|
| 紅字 `scripts is disabled` | PowerShell 執行原則擋 .ps1 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `node not recognized` | Node 不見/不在 PATH | 重裝 Node LTS |
| 秒跳回、無輸出 | 殼空轉、安裝壞 | `npm install -g @anthropic-ai/claude-code` |
| 有版本但互動卡住 | 終端機相容/設定壞 | 換 Windows Terminal、清 `.claude` 重登 |

## 關聯

- [[where-vs-get-command]] — 查指令裝在哪
- [[Claude-Code-Bash環境說明]] — Claude Code 的 bash 環境
- [[Bash-vs-PowerShell設計哲學差異]]
- [[venv-tiktoken-not-found-排查]] — **同源問題**:venv 沒啟動 / ExecutionPolicy 擋 Activate.ps1

## 補充:桌面排程

Cowork 自動化排程由 **Claude 桌面 App** 觸發 → 需保持電腦開機 + App 開著(登入狀態)才會在指定時間執行。關 App 或關機就不會跑。
