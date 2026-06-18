---
title: iOS SummerCamp 筆記 — SwiftUI 基礎與開發環境
type: topic-note
source: Gemini
tags: [gemini, ios, swift, swiftui, xcode, sf-symbols, 學習計畫]
sources:
  - https://gemini.google.com/app/0aae552229f06c54
updated: 2026-06-14
---

# iOS SummerCamp 筆記 — SwiftUI 基礎與開發環境

> 來自 iOS SummerCamp Preview Talk 2 講座，邊聽邊問。Abby 尚未開始寫 Swift，等 M5 Mac 到位。

## 重點整理

### 開發環境與預算

- 講者建議的 Mac 規格門檻：M5、16G RAM / 512G。
- <mark style="background: #FFF3A3A6;">Apple 開發者帳號年費約台幣 3,400 元/年。</mark>
- 思維：先做 MVP 上架（不必等精通記憶體管理/進階架構），但<mark style="background: #FFB8EBA6;">至少要懂最基本 Swift 語法（變數、if/else、迴圈、陣列、物件導向）與基本 SwiftUI 概念</mark>才能堆出第一個 MVP。

### 專案路徑規範：~/Developer（大寫 D）

```bash
cd ~
mkdir Developer   # 大小寫必須完全一致，首字母大寫 D
```

- <mark style="background: #BBFABBA6;">macOS 隱藏官方規範：在使用者根目錄 ~ 建立大小寫完全正確的 Developer 資料夾，系統會自動賦予藍色錘子圖示</mark>，Xcode 與自動化工具預設識別 ~/Developer 為開發者基地。
- 放在 ~ 這層確保完整讀寫權限，避免 CocoaPods / SPM / 編譯時 Permission Denied。
- 路徑乾淨原則：<mark style="background: #FF5582A6;">避免中文與空格</mark>，防止 toolchain 解析路徑錯誤。
- 建議：原本的 `coding` 資料夾可直接改名為 `Developer`，兼顧集中管理習慣＋符合 Apple 規範。

### SwiftUI 基礎語法解密

```swift
struct ContentView: View {
    var body: some View {        // 注意：不是 .var body
        VStack {                 // 垂直排列元件
            Image(systemName: "globe")
                .imageScale(.large)
            Text("Hello, world!")
        }
    }
}
```

- **`Image(systemName: "globe")`**：<mark style="background: #ABF7F7A6;">SF Symbols</mark>——Apple 內建上千個高品質向量圖示，本質是「字體」。`"globe"` 只是圖示名稱（非全域變數）。其他例：`heart.fill`、`gear`、`person.circle`。
- **`.imageScale(.large)`**：Modifier（修飾器）。`.large` 是<mark style="background: #FFF3A3A6;">「語意化尺寸（Semantic Sizing）」</mark>——不給絕對像素，而是相對於系統字體大小，會隨動態字體（無障礙放大）與裝置等比連動。要寫死可用 `.frame(width:50, height:50)`。
- **`var body: some View`**：每個 SwiftUI View 的核心。<mark style="background: #ABF7F7A6;">`some` 是「不透明型別（Opaque Types）」</mark>——你向編譯器承諾 body 最終回傳一個合法 View，至於底層複雜型別（如 `VStack<TupleView<...>>`）由編譯器自己算，讓你能自由換元件不必改外層型別宣告。

### 圖片/文字尺寸連動邏輯

- <mark style="background: #FF5582A6;">改一個元件的絕對像素（px），隔壁元件不會等比連動</mark>——它們是獨立元件。
- SF Symbols 與 Text 都是「字體」，<mark style="background: #BBFABBA6;">要一起縮放需在外層容器加 `.font(.system(size:10))`（由外而內傳遞）</mark>。
- 一般自訂圖片 `Image("logo")` 是點陣/向量圖，非字體；需加 `.resizable()` 才能縮放，否則以原始大小爆版。文字沒設尺寸時用系統預設 `.body`（約 17px）。

### 元件重用

重複出現的元件包成自訂 View，避免重複寫：

```swift
struct MyGlobeIcon: View {
    var body: some View {
        Image(systemName: "globe")
            .imageScale(.large)
            .foregroundColor(.blue)
    }
}
// 之後 VStack / Sidebar 直接 MyGlobeIcon() 呼叫
```

### 工具觀念

- <mark style="background: #FFF3A3A6;">Xcode 是 IDE（整合開發環境），不是版控；Git 才是版本管理工具</mark>（Xcode 內建 Git 圖形介面）。
- **MCP（Model Context Protocol）**：Anthropic 提出的開放標準，讓外部 AI Agent 透過 MCP 連動操作 Xcode（讀專案結構、寫 code、debug）。指令如 `codex mcp add ...` 把 AI 插件/Agent 加進開發工作流。
- **Codex 插件**：可整合第三方插件，如 <mark style="background: #ABF7F7A6;">Datadog（數據監控與日誌分析平台）</mark>，App 上架後即時監控閃退、連線速度等維運指標。

### 學習時程與資源

- 下一位講者 JaneChao（頻道 **ChaoCode**）教 Swift 基本語法，台灣 iOS 圈很有名。
- <mark style="background: #FF5582A6;">建議：不要等 2~3 個月後才學！現在（或 1 個月內）就開始看影片。</mark>看語法邏輯不需要 Mac，可利用等 M5 Mac 的空窗期建立「Swift 語感」，Mac 一到就能跳過卡關直接動手。

### 極簡團隊何時才擴增（補充）

維持極簡團隊原則，只在這些轉折點才加人：① 出現技術單點故障（核心技術只有一人會）→ 為技術備援買保險 ② 核心戰力長期陷入高耗能低價值瑣事且自動化已達極限 ③ 爆發性市場機會 + 緊迫交付期（優先短期外包/Contractor）④ 技能盲區且學習成本過高（找專家/合夥人）。擴增前檢查：AI 與自動化用盡了嗎、產品功能砍夠了嗎、能否外包/零工替代。

## 各對話來源
### iOS SummerCamp 筆記與提問（2026-05~06）— https://gemini.google.com/app/0aae552229f06c54

使用者：好啊 你幫我取名 → Gemini：建立 Google Doc《iOS SummerCamp Preview Talk 2 講座精華與行動指南》，整理 M5 Mac 規格（16G/512G）、開發者帳號年費 3,400 元、先上架 MVP 思維，及向講者提問擬稿（App 審查被拒如條款 4.3）。

使用者：開發專案要放使用者帳號那層 mkdir "Developer" 大小寫一模一樣，這是官方規定，幫我補充 → Gemini：補充官方路徑規範到 Doc V2。~/Developer 大寫，Xcode 預設識別、避免權限問題、路徑乾淨（無中文空格）。

使用者：Image(systemName:"globe") .imageScale(.large) var body 解釋；我用了 coding 資料夾好嗎（還沒開始做 iOS）→ Gemini：讚 coding 的管理意識，建議改名 Developer。解釋 SF Symbols、Modifier、body；提醒程式碼多了 .var，附正確 ContentView 結構。更新 Doc。

使用者：.large 沒說放大多少？some View 是什麼？ → Gemini：.large 是語意化尺寸（SF Symbols 本質字體，隨動態字體與裝置等比），some View 是不透明型別（向編譯器承諾回傳合法 View）。更新 Doc。

使用者：為何只有 VStack 裡寫 Image globe，globe 是全域嗎？其他元件也要這樣寫還是一次就好 → Gemini：globe 是圖示名稱非全域；聲明式 UI 每處要顯示都要寫，重複多就包成自訂 View（MyGlobeIcon）。

使用者：JaneChao 是下一位講者（ChaoCode 教 swift）；2-3 個月後學會太久嗎；Xcode 是版控嗎；Intelligence 允許 agent 用 Xcode(MCP) codex mcp add；codex 有插件如 datadog → Gemini：Xcode 是 IDE 非版控（Git 才是）；MCP 讓 Agent 操作 Xcode；Datadog 是監控插件；強烈建議現在就學（看影片不需 Mac），不要等 2-3 個月。更新 Doc V3。

使用者：我修好 cursor 的 ctrl+v，幫我寫到行事曆 → Gemini：之前有看到設定 keybindings.json 讓 Cursor 終端機用 Ctrl+V/Ctrl+C 的紀錄，詢問日曆事件名稱與時段。

使用者：其他人什麼時候會想擴增團隊，幫我補充到 document，以後團隊會非常小 → Gemini：（先用 Obsidian callout 格式）極簡團隊擴增時機：單點故障備援、核心戰力被瑣事耗損、市場機會期、技能盲區；擴增前檢查清單。

使用者：我不是說不要用 obsidian 專用格式了嗎 → Gemini：抱歉，改補充到 Google Doc V4，用乾淨內文列出技術單點故障、核心戰力耗損、爆發性市場機會三大擴增時機。
