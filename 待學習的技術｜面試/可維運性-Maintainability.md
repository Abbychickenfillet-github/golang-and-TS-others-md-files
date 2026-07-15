---
title: 可維運性 Maintainability vs 不可維運（Legacy）
type: topic-note
source: Gemini
tags: [gemini, 軟體工程, 面試, maintainability, legacy, 前端]
sources:
  - https://gemini.google.com/app/49eca5622129f96b
updated: 2026-06-19
---

# 可維運性 Maintainability vs 不可維運（Legacy）

## 重點整理

<mark style="background: #ADCCFFA6;">可維運性（Maintainability）</mark>＝軟體上線後，被修改、修 bug、提效能、擴功能時的「容易程度」。

### 可維運的四大指標
- <mark style="background: #FFF3A3A6;">可理解性</mark>（Understandability）：新人能快速看懂架構與邏輯，不用通靈。
- <mark style="background: #FFF3A3A6;">可測試性</mark>（Testability）：模組化、易寫單元測試，確保「改 A 不會壞 B」。
- <mark style="background: #FFF3A3A6;">可擴充性</mark>（Extensibility）：加新功能像疊樂高，不破壞原架構。
- <mark style="background: #FFF3A3A6;">易修正性</mark>（Correctability）：靠清晰 Log 快速定位並修復線上 Bug。

### 不可維運（Legacy / Unmaintainable）特徵
動到一處牽全身的失控狀態，常因時程壓力、人員離職累積而成：

- <mark style="background: #FF5582A6;">麵條程式碼（Spaghetti Code）</mark>：邏輯混亂、強耦合，改按鈕結果下單壞掉。
- <mark style="background: #FF5582A6;">複製貼上架構</mark>：同邏輯複製五份，改的時候漏一個就變線上 Bug。
- <mark style="background: #FF5582A6;">缺文件與測試</mark>：沒人知道為何存在、沒人敢動，即「祖傳程式碼」。
- <mark style="background: #FF5582A6;">黑盒子依賴</mark>：過度依賴外包或已停止維護的第三方套件，出事無法自救。

### 實務對比（前端視角）

| 項目 | ✅ 可維運 | ❌ 不可維運 |
|---|---|---|
| 元件設計 | 共用 UI 元件庫、高度複用 | 各頁 hard-code 樣式、五花八門 |
| 技術選型 | 統一架構與撰寫慣例 | 多框架混雜、依賴版本過期混亂 |
| 程式碼審查 | 落實 Code Review 把關 | 各自盲目交付、品質無把關 |
| 修改風險 | 風險可評估、時程可控 | 工時極長、改動心驚膽顫 |

## 各對話來源

### 可維運性與不可維運的差異（2026-06）— https://gemini.google.com/app/49eca5622129f96b

使用者：何謂可維運性 何謂不可維運

Gemini：可維運性＝上線後修改/修錯/擴充的容易程度，四大指標為可理解、可測試、可擴充、易修正。不可維運（Legacy）＝動一髮牽全身，特徵有麵條程式碼、複製貼上架構、缺文件與測試（祖傳程式碼）、黑盒子依賴。並給前端視角對比表（元件設計、技術選型、Code Review、修改風險）。
