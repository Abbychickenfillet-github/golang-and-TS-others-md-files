---
title: 找回舊影片與檔案：Windows AQS 搜尋語法、Everything 與 YouTube 後台篩選
type: topic-note
source: Gemini
tags: [gemini, windows, 檔案搜尋, AQS, everything, youtube-studio, 工具]
sources:
  - https://gemini.google.com/app/0ef53f94af0fcbb9
updated: 2026-09-09
---

# 找回舊影片與檔案：Windows AQS 搜尋語法、Everything 與 YouTube 後台篩選

## 本篇重點 a–j，共 10 個

> 情境：<mark style="background: #FFF3A3A6;">要找一支自己錄的 XSS 學習影片，但用標題關鍵字怎麼查都查不到</mark>。核心觀念是 — <mark style="background: #FF5582A6;">當年隨手取的檔名跟你現在記得的內容通常對不上</mark>，所以要放棄「用內容關鍵字找」，改成「用檔案的客觀屬性篩」：型別、副檔名、大小、日期。

## 1. 先講清楚縮寫：AQS 是什麼

a. <mark style="background: #ADCCFFA6;">AQS 是 Advanced Query Syntax（進階查詢語法）</mark>，Windows 檔案總管與 Windows Search 共用的一套查詢語言。你在搜尋框輸入的 `kind:` 、`ext:` 、`size:` 、`datemodified:` 這些都是 AQS 的欄位，冒號後面接條件，多個條件用空白隔開就是 AND。

b. <mark style="background: #D2B3FFA6;">AQS 不是正規表示式（Regex）</mark>，它沒有 `.*` 這類萬用比對，只有欄位加比較運算子。想做真正的模式比對要走 PowerShell，見 [[PowerShell-找檔案與遞迴搜尋陷阱]]。

## 2. Windows：用屬性篩，不要用檔名篩

c. <mark style="background: #BBFABBA6;">常用 AQS 欄位對照</mark>（查證 2026-09-09）：

| 欄位 | 意思 | 範例 |
|---|---|---|
| `kind:=video` | 只列出系統判定為影片的檔案 | `kind:=video` |
| `ext:` | 指定副檔名 | `ext:mp4` |
| `size:` | 依檔案大小篩選 | `size:>100MB` |
| `datemodified:` | 依修改日期篩選，可用區間 | `datemodified:>01/01/2026` |
| `datecreated:` | 依建立日期篩選 | `datecreated:>01/01/2026` |
| `contents:` | 搜尋檔案內容（需已建索引） | `contents:XSS` |

d. <mark style="background: #FFF3A3A6;">組合起來就是一句查詢</mark>：`kind:=video size:>100MB datemodified:>01/01/2026`。
    這句話翻成人話是「請列出所有系統認得是影片、檔案大於 100 MB、而且 2026 年 1 月 1 日之後被改過的檔案」。<mark style="background: #BBFABBA6;">螢幕錄影檔通常很大，所以「大小」比「檔名」可靠得多</mark>。

e. <mark style="background: #BBFABBA6;">Everything 是更快的替代方案</mark>。它是 Windows 上的免費檔名搜尋工具，直接讀 NTFS 的主檔案表（MFT），所以是即時列出全機檔名，不必等索引建好。缺點是它預設只搜檔名、不搜內容。

f. <mark style="background: #FF5582A6;">最常被忽略的一步：去看錄影軟體的預設儲存路徑</mark>。OBS、Zoom、QuickTime、Windows 內建的螢幕錄影，各自有自己的預設資料夾，檔案很可能根本不在你以為的「影片」資料夾，而是躺在 `C:\Users\<使用者>\Videos` 或 `Documents` 底下。

## 3. YouTube：前台搜不到不代表影片不存在

g. <mark style="background: #FF5582A6;">關鍵觀念</mark>：設為「不公開（Unlisted）」或「私人（Private）」的影片，在 YouTube 前台搜尋是絕對搜不到的。要找就必須進 <mark style="background: #ADCCFFA6;">YouTube Studio 後台</mark>的「你的影片（Your Videos）」。

h. 後台的三個篩法：
    1. 篩選器選「瀏覽權限」，把「不公開」與「私人」都勾起來。
    2. 篩選器選「日期」，縮到你大概學那個主題的月份或年份。
    3. 把每頁顯示筆數拉到最大，直接用<mark style="background: #BBFABBA6;">縮圖肉眼掃</mark> — 學習錄影的縮圖多半是編輯器畫面，即使標題是「未命名」或一串日期，看縮圖也認得出來。

i. <mark style="background: #D2B3FFA6;">別忘了播放清單</mark>：當初可能順手歸到「課程」「程式學習」「未分類」之類的清單裡，從清單反查比從搜尋框查快。

## 4. 最後一條線索：回頭查自己的筆記庫

j. <mark style="background: #FFF3A3A6;">在 Obsidian 裡搜 `XSS`、`Web Security`、`Cross-Site Scripting`、`錄影`</mark>，看當時的筆記有沒有順手貼上不公開連結，或寫了「今天錄了 XSS 的影片，檔名是⋯」這種雜記。
    這也反過來說明<mark style="background: #BBFABBA6;">為什麼筆記要跟產出物互相連結</mark> — 筆記本身就是最後一道索引。

### 行動 checklist

- [ ] 用 `kind:=video` 或 `ext:mp4` 撈出所有影片，按「修改日期」排序。
- [ ] 檢查 OBS／QuickTime／螢幕錄影軟體的預設儲存路徑。
- [ ] 用 `size:>100MB` 依大小排序，長影片一定排在前面。
- [ ] 進 YouTube Studio 後台（不是前台首頁）。
- [ ] 篩選器勾「不公開」與「私人」。
- [ ] 用縮圖掃有沒有程式碼畫面的影片，即使標題是預設日期或「未命名」。
- [ ] 回 Obsidian 搜主題關鍵字，看筆記裡有沒有留連結或檔名。

## 5. ⚠️ 存疑與更正

- <mark style="background: #FF5582A6;">Gemini 寫的 `kind:movie 大小:>100MB` 混用了中英文欄位名</mark>。中文版 Windows 的搜尋框確實接受部分中文欄位名，但<mark style="background: #BBFABBA6;">跨語系一律用英文欄位名 `size:` 才保險</mark>，本篇表格已統一改成英文。
- Gemini 把 `kind:movie` 與 `kind:=video` 混著寫。<mark style="background: #ADCCFFA6;">`=` 是精確比對</mark>，`kind:=video` 比 `kind:movie` 明確，建議固定用前者。
- macOS 的部分本篇不展開，因為 Abby 目前是 Windows 環境；Finder 的搜尋框跟 Spotlight 原生查詢語法（`mdfind`）規則不同，Gemini 給的 `ext:mp4 OR ext:mov` 不保證在 Finder 搜尋框直接生效，真要用建議走 `mdfind` 指令。

## 6. 關聯筆記與理由

- [[PowerShell-找檔案與遞迴搜尋陷阱]] — 當 AQS 的欄位篩選不夠用（例如要用萬用字元或遞迴比對內容），下一步就是走 PowerShell 的 `Get-ChildItem -Recurse`，那篇講了遞迴會踩到的坑。
- [[檔案命名禁用字元與空格規則]] — 這次找不到檔案的根本原因是「命名」，那篇講的是命名規則，兩篇合起來就是「怎麼命名才不會有下次」。
- [[grep-options]] — 在 Linux／WSL 環境下，`contents:` 的對應工具就是 `grep`，概念一樣是「不靠檔名靠內容」。
- [[副檔名意義總表]] — 用 `ext:` 篩之前得先知道錄影軟體會吐哪些副檔名（`.mp4`、`.mov`、`.mkv`、`.webm`），那份圖鑑就是查這個用的。

> [!tip] LeetCode／NeetCode 對應題目
> 本篇是工具操作，沒有直接對應的演算法題。若想練「用屬性而非精確值查找」的思路，可以做 [LeetCode 208. Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/)，Everything 這類檔名即時搜尋工具底層用的就是前綴樹與索引的概念。

## 各對話來源

### XSS 學習影片搜尋指南（2026-09-09 擷取）— https://gemini.google.com/app/0ef53f94af0fcbb9

使用者：我找不到我之前錄 XSS 學習的影片，本地跟 yt 怎麼找比較有效率，我查影片標題關鍵字都沒有。

Gemini：有時候我們記住的「影片內容」跟當初隨手命名的「檔案名稱」或「標題」可能完全對不上。本地端搜尋法 — Mac 用 Spotlight／Finder，可輸入 `kind:movie` 或 `kind:video` 撈出所有影片，`ext:mp4 OR ext:mov` 限定格式，`kind:movie date:2025-05-01-2026-05-30` 結合時間；Windows 強烈推薦免費的 Everything 軟體（一秒搜全機），原生檔案總管可輸入 `kind:=video`，並依時間與大小篩（錄影檔通常大於 100MB）。進階技巧：檢查 OBS、Zoom、QuickTime 或 Screen Recorder 的預設儲存路徑，影片可能被存在 `C:\Users\使用者\Videos` 或 Documents。

YouTube 搜尋法 — 關鍵字找不到很可能是標題太簡短（如「0530錄影」「測試」）。善用 YouTube Studio 後台篩選最精準：把每頁顯示筆數拉到最大（50 筆）用預覽圖肉眼掃有沒有程式碼畫面；進階篩選器選「瀏覽權限」勾選「不公開（Unlisted）」與「私人（Private）」，前台是絕對搜不到的；選「日期」篩出大概的月份或年份。也可檢查「你的影片（Your Videos）」清單，以及當初有沒有歸到「課程」「程式學習」「未分類」等播放清單。

最後一個隱藏線索在筆記軟體（例如 Obsidian）裡：搜尋 XSS、Web Security、Cross-Site Scripting 或「錄影」，看當時的筆記有沒有順手貼上 YouTube 的不公開連結，或寫下「今天錄了 XSS 的影片，檔名是⋯」的雜記。（Gemini 最後附上一份本地端與 YouTube 的行動 checklist。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇原始對話 | `https://gemini.google.com/app/0ef53f94af0fcbb9` | Gemini 對話，2026-09-09 擷取 |
| Windows 檔案總管進階搜尋語法（kind、size、datemodified 組合） | `https://www.windowscentral.com/software-apps/windows-11/how-to-boost-search-efficiency-on-file-explorer-for-windows-11` | 查證日 2026-09-09 |
| File Explorer 搜尋語法整理（AQS 欄位一覽） | `https://windowsloop.com/useful-file-explorer-search-syntax-commands/` | 查證日 2026-09-09 |
| 只搜尋影片檔的 `kind:=video` 用法 | `https://winsides.com/find-search-video-files-only-in-windows-11/` | 查證日 2026-09-09 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-09
