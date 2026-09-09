---
title: SwiftUI 與 React 心智模型對照 — 宣告式 UI 與 State、Environment、task
type: topic-note
source: Gemini
tags: [gemini, swiftui, react, ios, 宣告式ui, 跨框架對照, 面試]
aliases: [SwiftUI對照React, UIKit差異]
related:
  - "[[iOS-SummerCamp-SwiftUI基礎與開發環境]]"
  - "[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]"
  - "[[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]]"
sources:
  - https://gemini.google.com/app/1107c75ef68e4b63
updated: 2026-09-05
---

# SwiftUI 與 React 心智模型對照 — 宣告式 UI 與 State、Environment、task

> [!info]- 🔗 與既有筆記的關聯
> (1) [[iOS-SummerCamp-SwiftUI基礎與開發環境]] 記的是 SwiftUI 的環境與基礎語法，本篇是<mark style="background: #FFF3A3A6;">「用已經會的 React 當橋，快速搬過去」</mark>的那一份對照表。
> (2) [[00-前端框架比較-Vue-React-Angular難易度與優缺點]] 已經做過三個 Web 框架的橫向比較，本篇把這張比較表延伸到 iOS 原生，<mark style="background: #ADCCFFA6;">同一條軸線是「宣告式 vs 指令式」</mark>。
> (3) [[useRef與Vue的ref-value-可變值不觸發渲染的兩種設計]] 討論「哪些值會觸發重繪」，`@State` 在 SwiftUI 裡扮演的正是那個角色。

> 本篇重點 a–g，共 7 個。

## 重點整理

### 一、核心概念一一對照（a–c）

(a) <mark style="background: #FFF3A3A6;">SwiftUI 與 React 在設計哲學上非常接近</mark>，核心公式是同一句：<mark style="background: #ADCCFFA6;">UI = f(State)</mark>。<mark style="background: #BBFABBA6;">有 React 經驗轉 SwiftUI 會相當快</mark>。

| 概念 | React (Web) | SwiftUI (iOS) | 共同點 |
| --- | --- | --- | --- |
| 宣告式 UI | JSX | View Builder | 描述 UI 該長什麼樣，而不是一步步操作 DOM／View |
| 組件化 | Component | View | 切成可重用的獨立模組 |
| 單向資料流 | State Driven UI | State Driven UI | UI 是狀態的映射 |
| 元件內部狀態 | `useState()` | `@State` | 狀態改變框架自動重繪對應 UI |
| 跨層級共享狀態 | `useContext()` | `@Environment` | 不用層層 props 傳遞 |
| 副作用 | `useEffect()` | `.task` / `.onChange` | 初始化請求或監聽特定狀態 |

(b) 同一個計數器，兩邊寫起來的節奏幾乎一樣：

```jsx
// React
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: 20 }}>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

```swift
// SwiftUI
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") {
                count += 1
            }
        }
        .padding(20)
    }
}
```

(c) <mark style="background: #ADCCFFA6;">`@State` 前面那個 `@` 是 Swift 的 property wrapper（屬性包裝器）</mark>，作用是讓一個普通變數在被讀寫時多做一層事情——這裡是「通知框架重繪」。<mark style="background: #D2B3FFA6;">概念上跟 Vue 用 getter／setter 攔截、React 用 Hook 排程更新，是同一類「在賦值這件事上動手腳」的設計。</mark>

### 二、三個要注意的差異（d–g）

(d) <mark style="background: #FF5582A6;">UIKit 才是跟 React 差很多的那個</mark>。UIKit 是 iOS 的舊架構、屬於<mark style="background: #ADCCFFA6;">指令式（Imperative）</mark>寫法，要手動 `addSubview()`、`layoutSubviews()`、手動改文字，<mark style="background: #FFF3A3A6;">比較像傳統的 DOM 操作</mark>。看教學文章時要先確認講的是 SwiftUI 還是 UIKit。

(e) <mark style="background: #ADCCFFA6;">佈局系統完全不同</mark>：React 主要靠 Flexbox；<mark style="background: #BBFABBA6;">SwiftUI 用 `VStack`（垂直堆疊）、`HStack`（水平堆疊）、`ZStack`（層疊）</mark>。<mark style="background: #FF5582A6;">不要想把 Flexbox 的 `justify-content` / `align-items` 直接翻譯過去</mark>，堆疊模型是另一套思路。

(f) <mark style="background: #ADCCFFA6;">Swift 的型別系統比 JavaScript／TypeScript 嚴格得多</mark>，而且是編譯期強制檢查。<mark style="background: #FFF3A3A6;">TypeScript 的型別可以被 `any` 繞過，Swift 不行。</mark>

(g) <mark style="background: #D2B3FFA6;">面試可用的一句話</mark>：<mark style="background: #BBFABBA6;">「SwiftUI 與 React 的相似不是巧合——兩者都是宣告式 UI 這一波典範轉移的產物，差別在宿主語言的型別強度與佈局原語不同。」</mark>

## 各對話來源（原文摘要）

### iOS SwiftUI 與 React 寫法對比（2026-09-05）— https://gemini.google.com/app/1107c75ef68e4b63

**使用者：** iOS 的 app 比較靠近 React 的寫法嗎？有什麼類似之處？

**Gemini：** 給出核心概念對照表（宣告式 UI／組件化／單向資料流／`useState` 對 `@State`／`useContext` 對 `@Environment`／`useEffect` 對 `.task`）、Counter 語法對照範例，以及三個主要差異（UIKit 是指令式、Swift 強型別、堆疊佈局 vs Flexbox）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/1107c75ef68e4b63 | Gemini Flash，2026-09-05 |
| Apple Developer — SwiftUI `State` | https://developer.apple.com/documentation/swiftui/state | Apple 現行文件，2026-09-05 查證 |
| Apple Developer — SwiftUI `Environment` | https://developer.apple.com/documentation/swiftui/environment | Apple 現行文件，2026-09-05 查證 |
| Apple Developer — `View.task(priority:_:)` | https://developer.apple.com/documentation/swiftui/view/task(priority:_:) | Apple 現行文件，2026-09-05 查證 |
| Apple Developer — SwiftUI Layout（VStack／HStack／ZStack） | https://developer.apple.com/documentation/swiftui/vstack | Apple 現行文件，2026-09-05 查證 |
| React — `useState` | https://react.dev/reference/react/useState | React 現行文件，2026-09-05 查證 |

## 練習題（LeetCode／NeetCode 對照）

本篇是框架對照題，LeetCode／NeetCode 沒有對應題型。SwiftUI 的官方互動教學（https://developer.apple.com/tutorials/swiftui ）比刷題更適合驗收這一篇。

## 關聯筆記

| 筆記 | 關聯原因 |
| --- | --- |
| iOS-SummerCamp-SwiftUI基礎與開發環境 | SwiftUI 的環境與基礎語法在那篇 |
| 00-前端框架比較-Vue-React-Angular難易度與優缺點 | 同一條「宣告式 vs 指令式」比較軸線 |
| useRef與Vue的ref-value-可變值不觸發渲染的兩種設計 | 「哪些值會觸發重繪」是 @State 的核心議題 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-05
