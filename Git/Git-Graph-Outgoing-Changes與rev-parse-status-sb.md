---
title: Git Graph Outgoing Changes 與 git rev-parse / status -sb
type: topic-note
source: Gemini
tags: [gemini, git, git-graph, cli]
sources:
  - https://gemini.google.com/app/05ea73adaf847781
  - https://gemini.google.com/app/0a254a9c8a7c9b2a
updated: 2026-09-17
---

# Git Graph Outgoing Changes 與 git rev-parse / status -sb

## 重點整理

(a) VS Code「Git Graph」擴充功能裡的 <mark style="background: #ADCCFFA6;">Outgoing Changes</mark>：代表本地分支（如 `master`）已經 commit、但尚未 push 到遠端（如 `origin/master`）的紀錄。圖中藍色圈圈/線條代表本地狀態、紫色標籤 `origin/master` 代表遠端位置、藍色標籤 `master` 代表本地分支位置；本地領先遠端時就會出現 Outgoing Changes。

(b) ⚠️ 容易搞混：清單中帶 `M`(Modified)/`A`(Added) 標記的檔案<mark style="background: #FF5582A6;">還沒 commit</mark>（只是 Working Directory / Staging Area 的改動），跟 Outgoing Changes（已 commit 但未 push）是兩個不同階段——若此時直接 `git push`，這些未 commit 的檔案不會被送出去。正確順序：`git add` → `git commit` → `git push`。重開電腦不影響這些未 push/未 commit 的本地紀錄，都還安穩存在本機。

(c) <mark style="background: #ADCCFFA6;">`git rev-parse --abbrev-ref HEAD`</mark>：只印出目前分支名稱（`rev-parse` 是 Git 底層解析工具；`--abbrev-ref` 顯示縮寫引用名，如 `master` 而非 `refs/heads/master`）。常用在自動化腳本抓取分支名稱做變數。

(d) <mark style="background: #ADCCFFA6;">`git status -sb`</mark>：`-s`(short) 精簡模式，只用 `M`/`A`/`??` 等代碼表示狀態；`-b`(branch) 顯示分支資訊，包含領先/落後遠端多少個 commit。輸出範例：`## master...origin/master [ahead 1]` 後面接檔案狀態行。<mark style="background: #D2B3FFA6;">`-sb` 不是罵人縮寫</mark>，是 `git status --short --branch` 的組合參數，可設 alias（如 `alias gst="git status -sb"`）方便日常使用。

(e) <mark style="background: #ADCCFFA6;">`rev-parse` 字根拆解</mark>：`rev` = Revision（版本/修訂版，Git 內部把 commit/tag/branch 統稱 Revisions），`parse` = 語法解析；跟「倒回（Reverse）」或「解析樹（Parse Tree）」無關。核心功能是把人類易讀的版本標記（如 `HEAD~3`、`origin/master@{yesterday}`、`feature/xxx^`）解析並翻譯成 Git 底層真正使用的 40 字元 SHA-1 雜湊值。例如 `git rev-parse HEAD` 會印出目前 commit 的完整雜湊值。

(f) <mark style="background: #FF5582A6;">裝了 Git Graph 卻在左側面板找不到它，是因為它本來就不會自己長出圖示</mark>（2026-09-17 由 Gemini 對話補入）。Git Graph 是一個「用指令叫出來的檢視」，不是一個活動列（Activity Bar）圖示。三種正確的啟動方式：

| 啟動方式 | 你要做的動作 | 產物 |
|---|---|---|
| 編輯區右鍵 | 在編輯區空白處按右鍵，選 `Git Graph` | 開出 Git Graph 分頁 |
| 指令面板 | 按 `Ctrl+Shift+P` 打開指令面板，輸入 `View Git Graph` | 開出 Git Graph 分頁 |
| 狀態列 | 看 VS Code 最下方的狀態列，找 `Git Graph` 小圖示並點擊 | 開出 Git Graph 分頁 |

(g) <mark style="background: #FF5582A6;">⚠️ 別認錯：`Toggle Git Blame Editor Decoration` 不是 Git Graph</mark>。
	那個指令是用來開關 <mark style="background: #ADCCFFA6;">Git Blame</mark>（在每一行程式碼右側顯示「這行最後是誰、什麼時候改的」）的裝飾，跟 Git Graph 的分支線圖完全是兩件事。

(h) <mark style="background: #ADCCFFA6;">VS Code 原始檔控制面板中的「暫存的變更」，英文是 `Staged Changes`</mark>。
	點該區塊旁邊的 `+` 號，就是把 Working Directory 的改動加進 Staging Area，等同 CLI 的 `git add`；對照 (b) 的三階段順序 `git add` → `git commit` → `git push`。

## 各對話來源

### Git Graph Outgoing Changes Explained（2026-07-20）— https://gemini.google.com/app/05ea73adaf847781
使用者：為啥這有outgoing changes
Gemini：解釋 Outgoing Changes 代表本地已 commit 但尚未 push 到遠端的紀錄，並拆解截圖中藍色/紫色標籤的意義，附上 `M`/`A` 標記檔案尚未 commit 的提醒與 add→commit→push 建議流程。

使用者：就是我之前還沒push的嗎
Gemini：確認正確，補充「領先(Ahead)/同步(Synced)」關係與未 commit 檔案的處理步驟（git add → git commit → git push），並比喻為「寫好信封口但還沒投進郵筒」。

使用者：（後續穿插 Cursor 預設用 Edge 開啟連結的排查，與整理要貼給 Cursor 的後台管理需求文字，非 Git 主題，故不收錄於本筆記重點）

使用者：git rev-parse --abbrev-ref HEAD && git status -sb 這啥意思
Gemini：拆解兩指令：`rev-parse --abbrev-ref HEAD` 印出當前分支名稱；`status -sb` 精簡顯示分支與檔案狀態，並給出輸出範例解讀。

使用者：-sb 傻逼?
Gemini：澄清 `-sb` 是 `--short --branch` 的組合，不是罵人縮寫，附輸出範例解析。

使用者：Rev-parse的意思是倒回解析樹的意思嗎
Gemini：澄清 `rev` 是 Revision（版本）而非 Reverse（倒回），`rev-parse` 是把人類可讀的版本標記解析翻譯成 Git 底層 SHA-1 雜湊值的「版本解析」工具，並用 `git rev-parse HEAD` 舉例。

### 安裝 Git Graph 擴充功能（2026-09-17 擷取）— https://gemini.google.com/app/0a254a9c8a7c9b2a
使用者：Git Graph 為什麼沒有出現在這邊？我裝了，就是沒有在左側面板看到啊。
Gemini：Git Graph 並不會主動產生左側面板的小圖示。請在編輯區空白處按右鍵選擇「Git Graph」，或者打開指令面板輸入「View Git Graph」，就能啟動它了。

使用者：我有看到切換 Git Blame 編輯器裝飾，是這個嗎？toggle Git Blame editor decoration。
Gemini：那不是 Git Graph 喔。「Toggle Git Blame Editor Decoration」是用來開關 Git Blame 的裝飾。要啟動 Git Graph，請在指令面板輸入「View Git Graph」，或者看看最下方的狀態列，有沒有「Git Graph」的小圖示可以點擊。

使用者：暫存的變更英文是什麼？
Gemini：在 VS Code 裡「暫存的變更」英文是「Staged Changes」。點擊該區塊旁的 `+` 號，就能將變更加入暫存區。

## 資料來源（含查證時間）
| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/05ea73adaf847781 | 2026-07-20 查證 |
| 本篇 (f)(g)(h) 的 Gemini 對話 | https://gemini.google.com/app/0a254a9c8a7c9b2a | Gemini Flash，2026-09-17 擷取 |
| git rev-parse / git status 官方文件 | https://git-scm.com/docs/git-rev-parse , https://git-scm.com/docs/git-status | 與 Git 官方文件說明一致，2026-07-20 查證 |
| Git Graph 擴充功能（VS Code Marketplace，含 View Git Graph 指令） | https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph | Marketplace 現行頁面，2026-09-17 查證 |
| VS Code Docs — Source Control（Staged Changes 的定義） | https://code.visualstudio.com/docs/sourcecontrol/overview | VS Code 官方文件，2026-09-17 查證 |
