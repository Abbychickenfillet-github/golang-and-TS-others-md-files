---
title: JS vs Java 差異（型別檢查時機）
type: topic-note
source: Gemini
tags: [gemini, JavaScript, Java, TypeScript, 靜態型別, 動態型別]
sources:
  - https://gemini.google.com/app/6941c26690c3c846
updated: 2026-11-12
---

# JS vs Java 差異（型別檢查時機）

本篇重點 a–f，共 6 個。詳細的靜態／動態檢查時間軸見 [[06-靜態檢查vs動態檢查-TS-vs-JS]]（本篇是「跟別人口頭解釋 JS 與 Java 不同」的白話版）。

## 重點整理

a. <mark style="background: #FFF3A3A6;">核心差異 = 型別檢查的時機</mark>：Java 在 compile 階段就擋下型別錯誤，JavaScript 是跑到那一行才發現（動態型別）。
b. 白話比喻：JavaScript 像<mark style="background: #ADCCFFA6;">自排車</mark>（記憶體管理、型別轉換引擎代勞，上手快），Java 像<mark style="background: #ADCCFFA6;">手排車</mark>（型別、物件宣告都要交代清楚，囉嗦但穩健）。
c. 執行環境：JavaScript 原生為瀏覽器而生，後來靠 Node.js 到後端；Java 是通用語言，靠 JVM（Java Virtual Machine，Java 虛擬機器）「Write Once, Run Anywhere」。
d. 範式：Java 是（幾乎）純物件導向；JavaScript 可物件導向也可函數式，較自由。
e. TypeScript 能讓 JS 在寫扣（LSP，Language Server Protocol，語言伺服器協定，IDE 即時噴紅字）與 build（`tsc`）時得到類似 Java 的靜態檢查，<mark style="background: #FF5582A6;">但型別會在 transpile 後被擦除（type erasure），執行期仍是動態型別 JS</mark>；Java 的型別資訊則延續到 Bytecode 與 JVM 執行期。
f. 「靜態型別檢查 = build 完、還沒 run 之前就檢查」→ 正確；動態檢查 = 邊 run 邊檢查，使用者點到那段邏輯才 TypeError。

## 各對話來源

### JS 與 Java 差異解析（2026-11-12）— https://gemini.google.com/app/6941c26690c3c846

使用者：JavaScript 是高階語言，底層操作少、封裝函式多，要怎麼跟別人說它跟 Java 不一樣？
Gemini：用「自排車 vs 手排車」比喻，並從型別檢查、執行環境、語法範式三面向說明。
使用者：差異就是型別檢查時機吧？JS 靠 TypeScript 也能有靜態檢查、LSP 報錯？
Gemini：沒錯，但 TS 型別只存在開發期、執行時被擦除；Java 型別延續到 JVM 執行期。
使用者：靜態型別檢查就是單純 build 還沒 run？
Gemini：對，寫扣時由 LSP 即時檢查、build 時 compiler 掃整份，失敗就不產出可執行檔；動態檢查則是 run 到才報錯。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇全部內容 | https://gemini.google.com/app/6941c26690c3c846 | Gemini 對話，2026-11-12 擷取；未另查外部文件，概念與 06 筆記一致 |
