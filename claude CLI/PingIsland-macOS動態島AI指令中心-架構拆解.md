---
title: Ping Island — macOS 動態島 AI 指令中心架構拆解
type: topic-note
source: Gemini
tags: [gemini, macos, swift, appkit, ai-agent, claude-code, 抽象化]
sources:
  - https://gemini.google.com/app/cb9ed1b895127283
updated: 2026-08-07
---

# Ping Island — macOS 動態島 AI 指令中心架構拆解

本篇重點 a–k，共 11 個

## 重點整理

### 這是什麼

(a) <mark style="background: #ADCCFFA6;">Ping Island</mark> 是一款 macOS 專用的「動態島（Dynamic Island）」風格指令中心，用來<mark style="background: #FFF3A3A6;">集中管理與監控多個 AI 程式設計助理</mark>（Claude Code、GitHub Copilot、Gemini CLI、Cursor 等十幾種）。

(b) <mark style="background: #BBFABBA6;">核心價值 — 減少視窗切換</mark>：當 AI 需要你批准（執行指令、讀取檔案）或等待回覆時，它會從螢幕頂部展開，讓你<mark style="background: #FFF3A3A6;">直接在動態島介面點同意／拒絕／輸入文字</mark>，不必中斷思緒切回終端機或 IDE。

(c) 另外兩項功能：<mark style="background: #ADCCFFA6;">集中狀態監控</mark>（在瀏海／選單列精簡顯示各代理狀態）與<mark style="background: #ADCCFFA6;">一鍵跳轉</mark>（點擊直接帶回正在跑該任務的 iTerm2／Terminal／tmux 或編輯器視窗），不同 AI 工具還有專屬吉祥物圖示以便區分。

(d) <mark style="background: #FF5582A6;">Windows 不能用</mark>：系統需求明訂 macOS 14.0 以上，介面與功能高度依賴 Mac 原生系統 API。<mark style="background: #FFB8EBA6;">Abby 是 Windows 使用者，所以這款只能當架構參考，不能實際安裝</mark>。

### 為什麼是 .swift

(e) <mark style="background: #ADCCFFA6;">`.swift`</mark> 是 Apple 官方語言 Swift 的原始碼副檔名（專案中如 `Package.swift`、`PingIslandUITests.swift`）。選用 Swift 的三個理由：

- <mark style="background: #BBFABBA6;">原生 macOS 開發</mark>：能直接調用 SwiftUI 與 AppKit 打造懸浮介面與動畫
- <mark style="background: #BBFABBA6;">底層系統 API 介接</mark>：需要 macOS 的 <mark style="background: #ADCCFFA6;">Accessibility API（輔助使用 API）</mark>做視窗跳轉、呼叫 `sysctl` 監控背景 AI 進程，Swift 才拿得到最完整的原生權限
- <mark style="background: #BBFABBA6;">高效能低耗</mark>：Swift 是編譯型語言，常駐選單列時不會吃掉太多記憶體與 CPU

(f) <mark style="background: #ADCCFFA6;">頂部懸浮 UI 怎麼做到的</mark>：用 SwiftUI + AppKit 的 <mark style="background: #ADCCFFA6;">`NSPanel` / `NSWindow`</mark> 建立懸浮視窗，把視窗層級（window level）設為浮動層級，貼附於螢幕頂部選單列或瀏海區域，達成動態島效果。

### 最值得學的一段：統一 Session 資料結構

(g) <mark style="background: #FFF3A3A6;">問題</mark>：要同時支援十幾種 AI 工具，但它們的狀態輸出格式完全不同——

| 工具 | 輸出形式 |
|---|---|
| 工具 A | JSON，例如 `{"status": "waiting_permission"}` |
| 工具 B | 終端機純文字，例如 `Do you want to run this command? (Y/n)` |
| 工具 C | 只能從背景 Process 狀態判斷忙碌中 |

(h) <mark style="background: #FF5582A6;">不標準化的後果</mark>：動態島介面必須<mark style="background: #FF5582A6;">為每一種 AI 工具各寫一套渲染與判斷邏輯</mark>，程式碼混亂且難以維護，每多支援一個工具就要動到 UI 層。

(i) <mark style="background: #BBFABBA6;">解法 — 抽象化（Abstraction）</mark>：在 `Models` 模組定義一個通用的 `struct Session`，把所有 AI 工具的回傳狀態都轉成一致的欄位（ID／PID、狀態、訊息內容、所屬視窗等）。各工具各寫一個「轉接器」負責把自家格式翻譯成 `Session`，<mark style="background: #FFF3A3A6;">UI 層只認得 `Session` 一種型別</mark>。

(j) <mark style="background: #FFF3A3A6;">面試可用的一句話總結</mark>：這是典型的<mark style="background: #ADCCFFA6;">轉接器模式（Adapter Pattern）＋ 反腐層（Anti-Corruption Layer）</mark>思路——把「外部系統的雜亂格式」擋在邊界外，內部只流通自己定義的乾淨資料模型。新增第 15 種 AI 工具時只要多寫一個轉接器，UI 一行都不用改。

(k) <mark style="background: #D2B3FFA6;">⚠️ 存疑備註</mark>：Gemini 對 `Models`、`UI` 目錄與 `struct Session` 欄位的描述是<mark style="background: #FF5582A6;">從目錄結構與 commit 紀錄推論</mark>的，未逐行讀原始碼。實際欄位名稱請以官方 repo 為準再核對，本篇的架構解讀當概念參考即可。

## 相關筆記

- [[plugin-marketplace-vs-install]]（同屬 AI 開發工具生態；該篇談 Claude Code 外掛的安裝與市集機制，本篇則是「從外部監控多個 AI 代理」的另一種整合思路）
- [[Claude-Code終端機無捲軸與t-v快捷鍵]]（同樣在解決「AI 代理在終端機裡不好觀察」的痛點；該篇用終端機設定解決，本篇用獨立 GUI 監控解決，是同一問題的兩種答案）
- [[iOS-SummerCamp-SwiftUI基礎與開發環境]]（承接 (e)(f) 的 Swift／SwiftUI；該篇是語法與開發環境入門，本篇是 SwiftUI + AppKit `NSPanel` 的實際應用案例）
- [[interface-dependency-injection]]（Golang 版的同一個抽象化思想；該篇用 interface 把實作細節隔離在邊界外，正是 (i)(j) 的 `struct Session` 在做的事，跨語言對照特別有感）

## 各對話來源

### macOS 動態島 AI 指令中心（2026-08-06）— https://gemini.google.com/app/cb9ed1b895127283

使用者：這個套件是幹什麼用的？
Gemini：說明 Ping Island 是 macOS 專用的動態島風格指令中心，用於管理監控多個 AI 程式設計助理，四大功能為集中狀態監控、減少視窗切換、快速返回工作區、廣泛相容性。

使用者：Windows 作業系統能用嗎？
Gemini：不行。專為 macOS 開發，需 macOS 14.0 以上，核心功能與介面高度依賴 Mac 原生系統 API。

使用者：他怎麼達成的？你看他的 source code。
Gemini：從目錄結構與 commit 紀錄判斷是基於 macOS 原生 Swift 開發，頂部懸浮 UI 使用 SwiftUI 與 AppKit 的 `NSPanel` / `NSWindow` 建立懸浮視窗，並將視窗層級設為浮動層級貼附於選單列或瀏海區域。

使用者：為何是 .swift 檔案？
Gemini：`.swift` 是 Swift 原始碼副檔名；選用理由為原生 macOS 開發（可調用 SwiftUI／AppKit）、底層系統 API 介接（Accessibility API 做視窗跳轉、`sysctl` 監控背景進程）、以及編譯型語言的高效能低資源消耗。

使用者：「定義統一的 Session 資料結構（Models），將不同 AI 助理的回傳狀態標準化」是什麼意思？
Gemini：這是抽象化與標準化的架構設計。因為十幾種 AI 工具的狀態輸出格式各異（JSON／終端文字／Process 狀態），若不統一，介面就要為每種工具各寫渲染邏輯；因此在 Models 模組定義通用的 `struct Session`，把所有工具的回傳狀態轉為一致欄位（ID／PID 等）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 對話原始出處 | https://gemini.google.com/app/cb9ed1b895127283 | 2026-08-07 查證 |
| Apple `NSPanel` 官方文件 | https://developer.apple.com/documentation/appkit/nspanel | AppKit 懸浮面板，2026-08-07 查證 |
| Apple Accessibility API（macOS） | https://developer.apple.com/documentation/applicationservices/axuielement_h | 用於跨 App 視窗控制，2026-08-07 查證 |
| Adapter Pattern（轉接器模式） | https://refactoring.guru/design-patterns/adapter | 對應重點 (j) 的架構命名，2026-08-07 查證 |
