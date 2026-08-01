---
title: Deno：現代 JavaScript / TypeScript 執行環境
type: topic-note
source: Gemini
tags: [gemini, deno, nodejs, javascript, typescript, runtime]
sources:
  - https://gemini.google.com/app/885a007d1af5aae1
updated: 2026-06-19
---

# Deno：現代 JavaScript / TypeScript 執行環境

## 重點整理

<mark style="background: #ADCCFFA6;">Deno</mark> 是現代的 JavaScript / TypeScript / WebAssembly 執行環境（Runtime），可視為 <mark style="background: #FFF3A3A6;">Node.js 的現代升級版</mark>，用 Rust 打造、更安全更快、對 TS 極友好。

> [!info] 有趣的身世
> Deno 創始人 Ryan Dahl 同時是 Node.js 原作者。他在 2018 演講「我對 Node.js 感到遺憾的十件事」指出 Node 在安全性、模組管理（巨大的 node_modules）、非同步支援上的設計缺陷，於是打造 Deno 來解決。

核心特色：

- <mark style="background: #BBFABBA6;">原生支援 TypeScript & JSX</mark>：免設定 Babel/tsc 即可直接執行 TS；內部用 <mark style="background: #ADCCFFA6;">SWC</mark>（Speedy Web Compiler）大幅加快啟動與編譯。
- <mark style="background: #FF5582A6;">預設安全（Secure by Default）</mark>：除非明確加參數（`--allow-net`、`--allow-read` 等），否則無法存取網路、檔案系統、環境變數，執行未知程式碼更安心。
- <mark style="background: #BBFABBA6;">去中心化模組管理</mark>：拋棄 npm / package.json，沒有 node_modules，透過標準 URL 直接 import 模組。
- <mark style="background: #BBFABBA6;">內建工具鏈</mark>：自帶格式化/Linter（`deno lint`）、測試執行器、打包工具，省去配置一堆前端工具。
- <mark style="background: #ADCCFFA6;">相容 Web API</mark>：盡量貼近瀏覽器標準（`fetch`、`window` 等可直接用），讓前後端撰寫邏輯一致。

## 各對話來源

### Deno：現代 JavaScript 執行環境（2026-06）— https://gemini.google.com/app/885a007d1af5aae1

使用者：deno 是啥

Gemini：Deno 是現代 JS/TS/WASM 執行環境，可視為 Node.js 升級版；創始人 Ryan Dahl 也是 Node 原作者，因 2018 演講指出 Node 缺陷而打造 Deno。特色：原生支援 TS/JSX（內部用 SWC 加速）、預設安全（要明確 --allow-* 才能存取網路/檔案/環境變數）、去中心化模組（用 URL import、無 node_modules）、內建工具鏈（lint/test/bundle）、相容 Web API（fetch/window）。用 Rust 打造、更安全更快、對 TS 友好。

使用者：請問 Deno 是誰?

Gemini：（重申）Deno 是 Node.js 創始人 Ryan Dahl 開發的現代 JavaScript 執行環境。
