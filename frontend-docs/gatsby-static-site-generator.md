---
title: Gatsby 靜態網站產生器 - 安裝與啟動
type: topic-note
source: 5xcampus 部落格
tags: [gatsby, react, static-site-generator, cli, powershell]
sources:
  - https://5xcampus.com/posts/static-site-generator-gastbyjs
updated: 2026-08-09
---

# Gatsby 靜態網站產生器 - 安裝與啟動

## 重點整理

(a) Gatsby 是開源的**靜態網站產生器**，用 JavaScript + React 撰寫。跟動態網頁不同，靜態網頁「一旦出版內容就不太會更動」，Gatsby 負責把 React 原始碼編譯成純 HTML/CSS/JS，並提供本機開發伺服器即時預覽變動。

(b) 安裝與建立專案指令：

```bash
# 全域安裝 Gatsby CLI
npm install -g gatsby-cli

# 用官方 hello-world 樣板建立新專案
gatsby new hello-world https://github.com/gatsbyjs/gatsby-starter-hello-world
```

(c) 常用指令：
| 指令 | 用途 |
|---|---|
| `gatsby new [專案名] [樣板 URL]` | 建立新專案 |
| `gatsby develop` | 啟動開發伺服器（`http://localhost:8000/`） |
| `gatsby build` | 打包網站輸出至 `/public` |
| `gatsby serve` | 本機預覽打包後的版本（`http://localhost:9000/`） |

(d) 專案結構：`/src`（原始碼）、`/pages`（頁面）、`/templates`（模板）、`/public`（build 輸出）。

## 踩坑記錄：PowerShell 不支援 `&&`

在 Windows PowerShell 5.1 下執行：
```powershell
cd gatsby-starter-blog && gatsby develop
```
會出現：
```
在這個版本中 '&&' 語彙基元不是有效的陳述式分隔符號。
```
原因：`&&` 是 bash/cmd 的指令串接語法，PowerShell 5.1 不支援。改用分號 `;` 串接（不檢查前一步是否成功），或用 `if ($?) { ... }` 確保前一步成功才繼續：

```powershell
# 直接串接
cd gatsby-starter-blog; gatsby develop

# 前一步成功才執行下一步
cd gatsby-starter-blog; if ($?) { gatsby develop }
```

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gatsby 安裝與指令介紹 | https://5xcampus.com/posts/static-site-generator-gastbyjs | 2026-08-09 查證 |
| PowerShell `&&` 不支援問題 | 實際操作時的錯誤訊息 | 2026-08-09 |
