---
title: Bootstrap：bootstrap-theme.css、min.css 與 npm 安裝
type: topic-note
source: Gemini
tags: [gemini, bootstrap, css, npm]
sources:
  - https://gemini.google.com/app/7fb3abd394045512
updated: 2026-11-01
---

# Bootstrap：bootstrap-theme.css、min.css 與 npm 安裝

## 重點整理

本篇重點 a–c，共 3 個

(a) bootstrap-theme.css 是舊版產物
  舊版（Bootstrap 3）提供 bootstrap-theme.css 當預設佈景。Bootstrap 5 已沒有這個檔案，客製主題改為覆寫 Sass 變數（Sass variables）後重新編譯。

(b) .min.css 只是縮小化
  min＝minified（縮小化）：移除空白與註解以縮減檔案大小、加速載入。它仍是完整樣式表，不是客製化模組。

(c) npm i bootstrap 的做法
  npm i bootstrap 會把檔案下載到 node_modules，之後在程式碼 import 需要的 CSS（或 Sass 原始碼自行編譯）。

## 自我測驗

- Q：bootstrap.min.css 是客製化模組嗎？
  - A：不是，是縮小化後的完整樣式表。
- Q：Bootstrap 5 怎麼客製主題？
  - A：覆寫 Sass 變數再編譯。
- Q：npm i bootstrap 裝在哪？
  - A：node_modules。

## 各對話來源（原文摘要）

使用者：幫我介紹一下 Bootstrap theme。CSS 跟其他的版本有什麼差？
Gemini：bootstrap-theme.css 是舊版預設佈景檔，Bootstrap 5 沒有了，改用 Sass 變數客製。
使用者：所以 min.css 是用來做客製化的一個模組嗎？
Gemini：不是，min 是縮小化，完整樣式表。
使用者：不是可以用 npm i 來使用 Bootstrap 嗎？
Gemini：可以，裝到 node_modules 再引入 CSS。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Bootstrap 5.3 下載與 Sass 客製 | https://getbootstrap.com/docs/5.3/customize/sass/ | 引用自 Gemini 對話（2026-11-01），官方頁面本次未重新核對；⚠️ 「theme.css 於哪一版移除」Gemini 只說「現在的版本」，待核 |
| Gemini 對話 | https://gemini.google.com/app/7fb3abd394045512 | 擷取於 2026-11-01 |
