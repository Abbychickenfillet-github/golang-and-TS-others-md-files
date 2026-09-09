---
title: Syncthing 資料夾顯示 Paused — 三個原因與恢復同步
type: topic-note
source: Gemini
tags: [gemini, syncthing, 同步, obsidian, vault, 排錯]
aliases: [Syncthing暫停, Paused]
related:
  - "[[DOCUMENT_STRUCTURE]]"
sources:
  - https://gemini.google.com/app/d68ea1d4b9f82da8
  - https://gemini.google.com/app/c4cf33faea9066d9
updated: 2026-09-07
---

# Syncthing 資料夾顯示 Paused — 三個原因與恢復同步

> [!info]- 🔗 為什麼這篇值得留著
> Abby 的 `Abby-notes` vault 是靠 Syncthing 在電腦與手機之間同步的。<mark style="background: #FF5582A6;">一旦某端悄悄變成 Paused，兩邊筆記就會各自長大，之後合併很痛苦</mark>，所以「發現 Paused → 三步驟排查」值得記成固定 SOP。

> 本篇重點 a–m，共 13 個。（a–d：Paused 排查；e–m：2026-09-07 追加的「同步不等於備份」）

> [!info] 與其他筆記的關聯（附理由）
> **·** 呼應 [[../系統維護-C槽清理/C槽空間清理SOP]]：那篇處理「空間不夠」，本篇 e–m 處理「空間裡的東西會不會消失」，是同一台機器維運的一體兩面。
> **·** 呼應 [[../Git/git-fetch只更新遠端追蹤分支-為何還要reset--hard]]：本篇 f 節說明 Git 為什麼算「內容備份」，前提是你真的有 push 出去，那篇講的正是本地與遠端不同步時的心智模型。
> **·** 呼應 [[../計算機概論/SSD-vs-HDD-儲存原理與資料復原]]：那篇講硬碟壞掉後「還救不救得回來」，本篇講的是「壞掉之前該先做什麼」，接在它前面讀最順。

## 重點整理

(a) <mark style="background: #ADCCFFA6;">資料夾右側出現紫色 `Paused` 標籤</mark>，代表該資料夾處於<mark style="background: #ADCCFFA6;">手動暫停或設定造成的暫停</mark>狀態，不是錯誤。

(b) <mark style="background: #BBFABBA6;">原因一：手動暫停過</mark>。點該資料夾展開詳細選單，找 <mark style="background: #BBFABBA6;">Resume（恢復）</mark> 按鈕點下去即可。<mark style="background: #FFF3A3A6;">大多數情況是這個。</mark>

(c) <mark style="background: #BBFABBA6;">原因二：行動裝置的運行條件沒滿足</mark>。Android 版（尤其 Syncthing-Fork）有省電與網路限制，<mark style="background: #FF5582A6;">常見的是「僅在 Wi-Fi 下同步」與「僅在充電時同步」</mark>，條件不符就自動轉 Paused。到 App 的 <mark style="background: #ADCCFFA6;">Settings → Run Conditions</mark> 檢查勾選項。

(d) <mark style="background: #BBFABBA6;">原因三：遠端裝置那頭暫停了</mark>。切到 <mark style="background: #ADCCFFA6;">Devices（裝置）</mark> 分頁，確認對方裝置顯示為已連線且非 Paused。<mark style="background: #D2B3FFA6;">兩端只要有一端暫停，資料就停在原地。</mark>

## 追加 2026-09-07｜「我有 Git 又有 Syncthing，硬碟壞掉是不是就沒差？」（e–m）

> 起因對話：〈電腦啟動自動開啟網頁設定〉（標題是 Gemini 亂命名的，內容其實在問備份策略）— <https://gemini.google.com/app/c4cf33faea9066d9>

(e) <mark style="background: #FF5582A6;">先講結論：Git ＋ Syncthing 這個組合可以擋「硬碟壞掉」，但擋不了「誤刪」與「中毒」。</mark>兩者都不是備份工具，只是剛好有備份的副作用。

(f) <mark style="background: #ADCCFFA6;">Git 備的是「內容的歷史」</mark>。它保存每一次 commit 的完整快照，所以你可以回到任何一個過去的版本。<mark style="background: #FF5582A6;">但它只保護「已經 commit 而且 push 出去」的東西</mark>——未追蹤的檔案（`.gitignore` 掉的 `.env`、`node_modules`、資料庫檔）、以及只在本地 commit 還沒 push 的內容，硬碟壞掉就一起走了。

(g) <mark style="background: #ADCCFFA6;">Syncthing 備的是「當下的狀態」</mark>。它做的是<mark style="background: #FFF3A3A6;">雙向即時同步（two-way sync）</mark>：A 裝置的檔案長什麼樣，B 裝置就跟著長什麼樣。

(h) <mark style="background: #FF5582A6;">這正是它最危險的地方：刪除也會被同步。</mark>你在電腦上手滑刪掉整個資料夾、或中了勒索軟體把檔案全加密，Syncthing 會盡責地把「刪除」與「加密後的檔案」推到手機與另一台電腦，<mark style="background: #FF5582A6;">幾秒之內所有副本一起陣亡</mark>。Syncthing 官方 FAQ 自己就寫得很直白：它不是一個好的備份程式，因為所有變更都會傳播到所有裝置。

(i) <mark style="background: #BBFABBA6;">緩解方式一：打開 Syncthing 的 File Versioning（檔案版本控制）</mark>。它會把被覆蓋或刪除的舊檔丟進資料夾內的 `.stversions/`。<mark style="background: #FF5582A6;">但有一個關鍵限制：versioning 只對「從別台裝置同步過來的變更」生效</mark>——如果是你在<mark style="background: #FF5582A6;">本機自己</mark>改壞或刪掉檔案，Syncthing 不會、也沒辦法幫你歸檔舊版本。所以它是安全網，不是備份。

(j) <mark style="background: #BBFABBA6;">緩解方式二：補一份「冷備份」（cold backup）</mark>，也就是<mark style="background: #ADCCFFA6;">不常時連線、不會即時跟著變動的離線副本</mark>，例如平常拔掉的外接硬碟、或每週手動壓縮上傳的雲端封存。<mark style="background: #FFF3A3A6;">冷備份的價值就在「它不同步」——災難傳不過去。</mark>

(k) <mark style="background: #ADCCFFA6;">業界慣用的檢查表是 3-2-1 原則</mark>：<mark style="background: #FFF3A3A6;">3 份副本、放在 2 種不同媒體、其中 1 份異地（offsite）</mark>。對照 Abby 現況：Abby-notes 有「本機 + 手機（Syncthing）+ GitHub（Git）」大致湊得出 3 份、2 種媒體、1 份異地，<mark style="background: #BBFABBA6;">結構上其實是合格的</mark>；缺的是「有一份不會即時同步」的那一環。

(l) <mark style="background: #ADCCFFA6;">RTO（Recovery Time Objective，復原時間目標）</mark>是備份策略裡另一個常被忽略的維度：資料沒丟不等於沒影響。硬碟壞掉後，重灌系統、`git clone`、重裝相依套件、等 Syncthing 把幾十 GB 重新同步回來，<mark style="background: #FFB8EBA6;">這段時間你是不能工作的</mark>。<mark style="background: #D2B3FFA6;">評估備份時要同時問「救不救得回」與「多久救得回」。</mark>

(m) <mark style="background: #FF5582A6;">最容易漏掉的是「不在任何備份範圍內的檔案」</mark>：瀏覽器設定檔、各種工具的 `AppData` 設定、SSH 私鑰、`.env`、本機資料庫。<mark style="background: #BBFABBA6;">建議做法是列一張「換新電腦要重建什麼」的清單</mark>（vault 裡已有 [[../系統維護-C槽清理/本機應用程式用途清單]] 可以延伸），比事後才想起來好得多。

> [!warning] ⚠️ 存疑／更正
> Gemini 在這則對話裡把 Syncthing 描述成「備份」的一種，<mark style="background: #FF5582A6;">這個定位是錯的</mark>——Syncthing 官方文件明確說明自己不是備份程式。本篇 h、i 兩節已依官方 FAQ 與 File Versioning 文件更正。另外 Gemini 提到 versioning 可以救誤刪，<mark style="background: #FF5582A6;">也沒有說明「本機自己刪的救不到」這個關鍵限制</mark>，已於 (i) 補上。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/d68ea1d4b9f82da8 | Gemini Flash，2026-09-05 |
| 追加對話（Git／Syncthing 備份策略，e–m 節） | https://gemini.google.com/app/c4cf33faea9066d9 | 2026-09-07 讀取 |
| Syncthing FAQ — 「Syncthing 不是好的備份程式」原文 | https://docs.syncthing.net/users/faq.html | Syncthing 現行文件，2026-09-07 查證 |
| Syncthing — File Versioning（含「只對遠端來的變更生效」的限制） | https://docs.syncthing.net/users/versioning.html | Syncthing 現行文件，2026-09-07 查證 |
| CISA — Back Up Business Data（3-2-1 原則的官方建議） | https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data | 2026-09-07 查證 |
| Syncthing — Folder Status 說明 | https://docs.syncthing.net/users/foldertypes.html | Syncthing 現行文件，2026-09-05 查證 |
| Syncthing-Fork（Android）— Run Conditions | https://github.com/Catfriend1/syncthing-android | 專案現行說明，2026-09-05 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
