---
title: Syncthing P2P 檔案同步——Obsidian Vault 跨裝置同步設定
type: topic-note
source: Gemini
category: tech
tags: [gemini, syncthing, p2p, obsidian, 同步, android, ios, 工具]
aliases: [Syncthing設定, Obsidian同步, Möbius-Sync]
related:
  - "[[Obsidian-語音筆記與GoogleDocs銜接限制]]"
sources:
  - https://gemini.google.com/app/a6870dde43fd81ec
  - https://gemini.google.com/app/ee0ee352fc1402cf
updated: 2026-09-09
---

# Syncthing P2P 檔案同步——Obsidian Vault 跨裝置同步設定

> [!info]- 📍 為什麼要記這個
> Obsidian 官方的 Obsidian Sync 要訂閱費，而 vault 本質上只是<mark style="background: #FFF3A3A6;">一堆 `.md` 純文字檔加附件</mark>——只要能把資料夾同步過去，手機上的 Obsidian 就能直接打開。Syncthing 正好解決這件事，而且<mark style="background: #BBFABBA6;">不經過任何雲端</mark>。
> 關聯：[[Obsidian-語音筆記與GoogleDocs銜接限制]] 講的是「內容怎麼進 vault」，這篇講的是「vault 怎麼在裝置之間流動」。

> 本篇重點 (a)–(l)，共 12 個。

---

## 一、Syncthing 是什麼，跟雲端硬碟差在哪

a. <mark style="background: #ADCCFFA6;">Syncthing 是開源的 P2P（Peer-to-Peer，點對點）檔案同步工具</mark>。它<mark style="background: #FF5582A6;">不提供任何雲端空間</mark>，檔案是從你的電腦「直接」傳到你的手機，中間不落地到第三方伺服器。

| | Syncthing | Google Drive／Dropbox 這類雲端 |
|---|---|---|
| 檔案存在哪 | <mark style="background: #BBFABBA6;">只存在你自己的裝置上</mark> | 存在廠商的伺服器 |
| 容量上限 | 你的硬碟有多大就多大 | 依方案付費 |
| 需要裝置同時開機嗎 | <mark style="background: #FF5582A6;">需要，兩台都要在線才會同步</mark> | 不需要，雲端隨時在 |
| 隱私 | 端對端加密，廠商看不到內容 | 廠商技術上讀得到 |
| 費用 | 免費開源（iOS 客戶端除外） | 超過免費額度要付費 |

b. <mark style="background: #FF5582A6;">最容易搞混的一點</mark>：搜尋時會看到 <mark style="background: #FFB8EBA6;">「Sync.com」</mark>（賣 1TB／2TB／10TB 雲端空間的廠商），那跟 Syncthing、跟 Möbius Sync <mark style="background: #FF5582A6;">是完全不同的服務</mark>，別買錯。

---

## 二、各平台該裝哪一個

c. 這是最花錢也最容易踩雷的一格：

| 平台 | 該裝什麼 | 費用 |
|---|---|---|
| Windows／macOS／Linux | Syncthing 官方版（網頁介面操作） | <mark style="background: #BBFABBA6;">完全免費</mark> |
| Android（含紅米平板） | <mark style="background: #BBFABBA6;">Syncthing-Fork</mark>（Google Play 上的社群維護版） | <mark style="background: #BBFABBA6;">完全免費、無容量上限</mark> |
| iOS／iPadOS | Möbius Sync（第三方客戶端，內部用 Syncthing 引擎） | 免費版<mark style="background: #FF5582A6;">只有 20MB 且僅限 App 自己的沙盒</mark>，需一次性內購解鎖 |

> [!danger]+ 別在 Android 上找付費選項
> d. <mark style="background: #FF5582A6;">Android 完全不需要付費</mark>。Android 版 Syncthing 沒有容量限制，本身就是免費開源的完整軟體。<mark style="background: #FFF3A3A6;">Möbius Sync 是 iOS 專屬的客戶端</mark>，因為 Apple 的沙盒（sandbox）機制不允許 App 隨意讀寫其他 App 的資料夾，才需要額外開發與付費解鎖。

> [!question]+ 「Möbius Sync 沒有跳出付費按鈕」怎麼辦
> e. Möbius Sync 的解鎖<mark style="background: #FFF3A3A6;">不是一個獨立按鈕，而是「觸發限制時才跳出」</mark>。原因有二：（1）免費額度還沒用完——只要沙盒內檔案總量沒超過 20MB，系統不會催你付費；（2）還沒去碰受限功能——要解鎖「存取其他 App 的沙盒」（例如同步 Obsidian 的外部資料夾），得<mark style="background: #BBFABBA6;">實際去點 Add Folder 並選一個外部資料夾</mark>，權限被擋下時購買流程才會啟動。
> f. 另一條路是直接下載獨立的 <mark style="background: #ADCCFFA6;">Möbius Sync Pro</mark>（另一個 App），功能與內購解鎖後完全相同。

---

## 三、配對流程：ID 不要貼成自己的

g. <mark style="background: #FF5582A6;">最常見的失敗原因</mark>：把自己裝置的 ID 貼進自己的設定裡。正確方向是<mark style="background: #BBFABBA6;">交換</mark>——在電腦上輸入「手機的 ID」，在手機上接受「電腦的邀請」。

h. <mark style="background: #ADCCFFA6;">裝置 ID（Device ID）</mark>長這樣：一長串大寫英數字，每 7 碼用一個橫槓隔開，例如 `3PXANYP-M6L7EHF-Z4L9AHD-2P6J3E4-G3H7K4J-F5R6D7A-L2G9Y4P-B3H6N2D`。<mark style="background: #FFF3A3A6;">格式不對系統會直接擋下來</mark>，所以貼錯不會靜默失敗，這點還算友善。

```text
[手機] 複製自己的 Device ID
   │
   ▼
[電腦] Syncthing 網頁介面 → 新增遠端裝置 → 貼上「手機的」ID
   │
   ▼
[手機] 跳出通知 → 接受
   │
   ▼
兩台裝置互相看得見了（狀態顯示 Connected）
```

---

## 四、加入資料夾：不用先手動建好

i. <mark style="background: #BBFABBA6;">不需要事先在另一台建好同名資料夾</mark>。Syncthing 會自動建。只要在其中一邊設定、另一邊按「接受」即可：

- **從電腦推出去**：電腦 → Add Folder → 選現有資料夾（例如 Obsidian vault）→ Sharing 分頁勾選手機 → 手機收到通知按接受 → 手機自動長出同名資料夾。
- **從手機推出去**：手機 Syncthing-Fork → Add Folder → 選資料夾 → 分享給電腦 → 電腦按接受。

j. 把 Obsidian vault 加進來之後，手機端的 Obsidian 只要<mark style="background: #FFF3A3A6;">用「開啟現有 vault」指向那個同步資料夾</mark>，就能直接編輯，改動會自動流回電腦。

> [!warning]+ ⚠️ Obsidian ＋ Syncthing 的已知風險（對話沒提到，但很重要）
> - <mark style="background: #FF5582A6;">兩台同時編輯同一個檔案會產生衝突副本</mark>（檔名會多出 `sync-conflict` 字樣）。習慣是「編輯前先確認另一台已同步完成」。
> - 建議在 Syncthing 的資料夾設定裡<mark style="background: #BBFABBA6;">忽略 `.obsidian/workspace.json`</mark> 這類會頻繁變動的介面狀態檔，否則兩台會一直互相覆蓋。
> - 開啟<mark style="background: #BBFABBA6;">檔案版本控制（File Versioning）</mark>，誤刪時還救得回來。

---

## 五、手機老是顯示「斷線 Offline」

k. Syncthing 要同步必須<mark style="background: #FFF3A3A6;">同時滿足三件事</mark>：兩台都開著 App、兩台都連著網路、兩台找得到彼此。手機顯示 Offline 通常是被系統省電機制殺掉了背景程序。

l. Android 上的三個設定（依重要性排序）：

| 設定 | 位置 | 做什麼 |
|---|---|---|
| <mark style="background: #FF5582A6;">停用電池最佳化</mark> | 系統設定 → 應用程式 → Syncthing-Fork → 電池 → 選「不受限制／不最佳化」 | 最關鍵。Android 為了省電會自動關掉背景 App，這一項不改其他都白搭 |
| 開啟背景同步 | Syncthing-Fork App 內 → 設定 → Background Sync | 讓它常駐在背景 |
| 允許行動網路 | Syncthing-Fork → 設定 → 連線／資料用量 → Use Mobile Data | 不在同一個 Wi-Fi 也想同步時才需要開；同一個 Wi-Fi 下連線品質最好 |

> [!warning]+ ⚠️ 存疑／更正
> - Gemini 在對話中把 <mark style="background: #D2B3FFA6;">Android 版建議成「Syncthing 官方版」</mark>，但官方版早已從 Google Play 下架、專案也已封存；<mark style="background: #BBFABBA6;">現在 Android 上實際該裝的是社群維護的 Syncthing-Fork</mark>（對話後段自己也改口用 Syncthing-Fork 了，前後不一致）。
> - 這兩段都是<mark style="background: #D2B3FFA6;">邊操作邊問的語音／截圖對話</mark>，中間夾雜了英文文法、影片鼓勵等完全無關的問題，本篇只抽出 Syncthing 相關內容。
> - 20MB 與一次性內購的價格會隨時間變動，<mark style="background: #FFB8EBA6;">查證當下（2026-09-09）官方 FAQ 記載為 20MB 沙盒上限、一次性內購解鎖無限同步</mark>，實際金額以 App Store 顯示為準。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話：Syncthing 安裝與設定指南 | https://gemini.google.com/app/a6870dde43fd81ec | 對話擷取於 2026-09-09 |
| Gemini 對話：Syncthing 手機下載與替代方案 | https://gemini.google.com/app/ee0ee352fc1402cf | 對話擷取於 2026-09-09 |
| Syncthing 官方網站（P2P、開源、端對端加密） | https://syncthing.net/ | 查證於 2026-09-09 |
| Syncthing 官方文件（Device ID 格式、資料夾分享流程） | https://docs.syncthing.net/ | 查證於 2026-09-09 |
| Möbius Sync FAQ（20MB 沙盒上限、一次性內購解鎖） | https://mobiussync.com/faq/ | 官方 FAQ；查證於 2026-09-09 |
| Möbius Sync App Store 頁面 | https://apps.apple.com/us/app/m%C3%B6bius-sync/id1539203216 | 查證於 2026-09-09 |
| Möbius Sync Pro（獨立付費版） | https://apps.apple.com/us/app/m%C3%B6bius-sync-pro/id1671184333 | 查證於 2026-09-09 |
| Syncthing-Fork（Android 社群維護版） | https://github.com/Catfriend1/syncthing-android | 查證於 2026-09-09 |

---

<sub>由 Gemini 對話自動整理 · 更新於 2026-09-09</sub>
