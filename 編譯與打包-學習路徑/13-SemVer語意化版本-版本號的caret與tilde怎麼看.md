---
title: "SemVer 語意化版本｜版本號的 ^ 與 ~ 怎麼看"
tags: [npm, semver, package-json, package-lock, iron-session]
created: 2026-11-14
---

# SemVer 語意化版本｜版本號的 ^ 與 ~ 怎麼看

> [!info] 主檔是互動版 HTML
> 備用連結（內嵌沒顯示時點這個）：[13-SemVer語意化版本-版本號的caret與tilde怎麼看.html](<13-SemVer語意化版本-版本號的caret與tilde怎麼看.html>)
> 承接 [[07-前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]] 的 k、l 節

## 內嵌 HTML（測試 HTML Reader 是否支援）

![[13-SemVer語意化版本-版本號的caret與tilde怎麼看.html]]

## 大綱

1. [[#一句話]]
2. [[#相關筆記]]

## 一句話

- `MAJOR.MINOR.PATCH`：破壞性變更、向下相容的新功能、向下相容的 bug 修正
- `^8.0.4` ＝ `>=8.0.4 <9.0.0`，`~8.0.4` ＝ `>=8.0.4 <8.1.0`，不加符號＝固定版本
- 實際安裝版本看 `package-lock.json`，用 `npm ls iron-session` 查

## 相關筆記

- [[07-前端專案建立與打包選型-Vite與createVue與NextJS與npm鎖版本]]：本篇展開它 l 節的 ^ 與 ~
- [[08-npm-run-script-mechanism]]：同一組 npm 工具鏈
- [[00-閱讀順序]]（Session-Token-Cookie 認證系列）：範例套件 iron-session 屬於無狀態 session
- [[Redis介紹]]：傳統有狀態 session 在正式環境常存在 Redis
- LeetCode [165. Compare Version Numbers](https://leetcode.com/problems/compare-version-numbers/)
