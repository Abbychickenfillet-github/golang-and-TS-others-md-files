---
title: GitHub 網頁編輯器無法貼上／拖曳圖片的原因與解法
type: topic-note
source: Gemini
tags: [gemini, github, markdown, 圖片上傳]
sources:
  - https://gemini.google.com/app/fb0c30b77fa4081d
updated: 2026-07-23
---

# GitHub 網頁編輯器無法貼上／拖曳圖片的原因與解法

本篇重點 a–d，共 4 個

## 重點整理

a. <mark style="background: #FF5582;">原因</mark>:GitHub 的「直接編輯」(Edit file，網頁上的簡易檔案編輯模式)僅支援純文字編輯，不支援二進位檔案(如圖片)的剪貼簿貼上或拖曳上傳。這是網頁編輯器本身的限制，不是瀏覽器或帳號問題。

b. <mark style="background: #BBFABB;">解法一(最快):借用 Issues／Discussions 當跳板</mark>:開啟 Repo 的 Issues 頁面 → New Issue → 在內容框直接 `Ctrl+V` 貼上或拖曳圖片 → GitHub 會自動產生圖片連結(例如 `![](https://github.com/...)`)→ 複製該連結貼回 `.md` 檔即可，不需要真的送出 Issue。

c. <mark style="background: #BBFABB;">解法二:GitHub Web Editor(按 `.` 鍵)</mark>:在 Repo 首頁按下鍵盤 `.`，會開啟網頁版 VS Code，可直接從電腦拖曳圖片到左側檔案樹，上傳成功後在 Markdown 用 `![描述](圖片路徑)` 引用。

d. <mark style="background: #BBFABB;">解法三:直接上傳到資料夾</mark>:回到該目錄頁面(非編輯模式)→ 右上角 `Add file` → `Upload files` → 拖入圖片並 Commit → Markdown 中寫 `![ALT](image-name.png)`。<mark style="background: #D2B3FF;">長期工作流建議</mark>:把 Repo clone 到本地，用 VS Code + Obsidian 整理，本地可裝 Markdown Paste 之類外掛做到 `Ctrl+V` 直接存圖並自動產生路徑，再一起 `git push`。

## 各對話來源(原文)

### GitHub 圖片上傳與編輯教學 (2026-07-23) — https://gemini.google.com/app/fb0c30b77fa4081d

**使用者:** 為什麼我的圖片沒有辦法ctrl+v或者拖曳進去

**Gemini:** 看來你在 GitHub 的網頁編輯器(Web Editor)中遇到了無法直接貼上或拖曳圖片的問題。這通常是因為 GitHub 的簡易檔案編輯模式並不支援多媒體檔案的直接上傳。(完整三種解法見重點 b、c、d)

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/fb0c30b77fa4081d | 2026-07-23 |
| GitHub 網頁編輯器圖片限制為 GitHub 產品既有行為 | https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository | 查證於 2026-07-23,以 GitHub 官方文件行為為準 |

---
由 Gemini 對話自動整理 · 更新於 2026-07-23
