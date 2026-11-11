---
title: 自動產生索引 build-index.py：為什麼筆記沒進索引
tags: [github-pages, jekyll, index, automation]
date: 2026-11-11
---

# 自動產生索引 build-index.py：為什麼筆記沒進索引

本篇重點 a–e，共 5 個。

## a. 為什麼筆記沒進索引

`index.html` 原本是「某一天手動（或請 Claude 一次性）寫出來的快照」，沒有任何程式維護它，所以快照之後發生的事都不會反映。

| 發生的事 | 結果 | 實例（2026-11） |
|---|---|---|
| 新增筆記 | 不會自動出現在索引 | 約 97 篇漏列（frontend-docs 38、backend 30…） |
| 搬移／改名筆記 | 索引仍指舊路徑，點下去 404 | 認證系列搬進資料夾後 16 筆死連結；11/11 又加序號改名，再斷 10 筆 |
| 資料夾被 Jekyll 排除 | 索引有列，線上卻 404 | `Git/` 28 篇、`系統維護-C槽清理/` 344 篇 |
| 檔名以 `_` 開頭 | Jekyll 不發布，線上 404 | `__init__.py解釋`、`__proto__三種寫法差在哪`、`_封存-B+樹索引…` 3 篇；已在檔名前加序號 `1-` 解決（2026-11-11） |
| `assets/wikilink-index.json`（網站端 wikilink 對照表） | 同樣是手動快照，改名後目標不存在 | 1136 筆中 30 筆死掉；目前仍需手動維護，build-index.py 還沒涵蓋 |

## b. 現在怎麼運作

`build-index.py` 掃描整個 repo，用檔案系統當唯一真相重建 `index.html`。`<head>`、CSS、`<script>` 沿用現有檔案，你改過的樣式不會被蓋掉。

| 規則 | 說明 |
|---|---|
| 收錄 | `.md` 與 `.html`；`.md` 會被 Jekyll 轉成同名 `.html`，連結一律指向 `.html` |
| 互動版 | 同資料夾有 `X.md` 與 `X-互動版.html` 時，互動版變成 X 後面的 `[互動版]` 連結 |
| 同名成對 | 同名 md+html 只列一次 |
| 略過 | 以 `.` `_` `#` 開頭的檔案與資料夾、`_config.yml` 的 `exclude`、`assets`、`obsidian-attachment`、`index.html` 本身 |
| 排序 | 檔案在前、資料夾在後；自然排序（2 排在 10 前面） |
| 數字 | 資料夾後面的 (n) 是遞迴篇數；標題「共 N 篇」是全站收錄數 |

## c. 怎麼用

```bash
python build-index.py          # 重新產生 index.html
python build-index.py --check  # 只檢查；索引過期時 exit code = 1
```

## d. 自動觸發（需要你自己啟用一次）

| 問題 | 答案 |
|---|---|
| `git config core.hooksPath .githooks` 做了什麼 | 不會建立 hook；只是告訴 Git「hook 腳本去 `.githooks/` 找，不要去預設的 `.git/hooks/`」。腳本本身是 repo 內已存在的 `.githooks/pre-commit` |
| 觸發時機 | 執行 `git commit` 時，在 commit 建立之前（`pre-commit`）；`git push` 不會觸發 |
| 設定存在哪 | 本機 `.git/config`，不會被 push、不會被 clone |
| 要確認推上線有沒有成功 | push 之後執行 `gh run list --limit 1`，看 `pages build and deployment` 是不是 `success` |

repo 內已附 `.githooks/pre-commit`：每次 commit 前自動執行 `build-index.py` 並把 `index.html` 加進這次 commit；腳本失敗只警告、不擋 commit。Git 預設不會讀這個資料夾，要在這個 repo 執行一次：

```bash
git config core.hooksPath .githooks
```

這個設定只存在本機 `.git/config`，不會被 push；換電腦要再執行一次。

## e. 重要副作用：被 exclude 的資料不再出現在索引

舊索引顯示 1306 篇、新索引 1003 篇，差異如下（舊的 1306 裡有一大部分在線上根本打不開）：

| 項目 | 篇數 | 原因 |
|---|---|---|
| 舊索引收錄 | 1306 | 手動快照，含 404 連結 |
| 扣掉 `系統維護-C槽清理/` | -344 | `_config.yml` 排除，線上 404 |
| 扣掉 `Git/` | -28 | `_config.yml` 排除，線上 404 |
| 扣掉改名後失效的舊路徑與底線檔 | -15 | 路徑已不存在或 Jekyll 不發布 |
| 補上漏列的新筆記 | +80 | 新增與改名後的新路徑 |
| 新索引 | 999 → 1003 | +1 本說明筆記；+3 底線檔改名加序號後可被發布、收進索引 |

`_config.yml` 的 `exclude` 是單一真相。`Git/` 和 `系統維護-C槽清理/` 因為被排除，線上本來就是 404，所以新索引不再列它們（共 372 篇）。若想讓 `Git/` 的筆記公開，把 `_config.yml` 裡的 `- Git/` 那行拿掉，再執行一次 `build-index.py` 即可，索引會自動補回。

注意：`Git/` 被排除的理由寫的是「含個人 repo 操作紀錄」，公開前先確認內容。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| GitHub Pages 限制（站台 1 GB、部署 10 分鐘 timeout） | [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | 2026-11-11 查證 |
| 線上 404 實測（`Git/`、`系統維護-C槽清理/`、`__init__.py解釋.html` 回 404；一般筆記回 200） | `https://abbychickenfillet-github.github.io/golang-and-TS-others-md-files/` 對應路徑 | 2026-11-11 curl 實測 |
