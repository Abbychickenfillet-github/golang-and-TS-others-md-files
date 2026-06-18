---
title: GraphQL 概念與 REST 對比
type: topic-note
source: Gemini
tags: [gemini, backend, graphql, rest, api]
sources:
  - https://gemini.google.com/app/5004a4f4252619f3
updated: 2026-06-17
---

# GraphQL 概念與 REST 對比

## 重點整理

> [!info] 什麼是 GraphQL？
> Facebook 2012 年開發、2015 年開源的一種 API <mark style="background: #ADCCFFA6;">查詢語言（Query Language）</mark>，同時也是執行查詢的伺服器端 Runtime。是傳統 REST API 的替代方案，讓前端<mark style="background: #FFF3A3A6;">「要什麼資料，就給什麼資料」</mark>，不多也不少。

### 比喻
REST 像點<mark style="background: #FFB8EBA6;">固定套餐（Endpoint）</mark>，想吃某道小菜得點整套；GraphQL 像<mark style="background: #BBFABBA6;">自助餐</mark>，拿點單（Query）勾你要的菜，引擎精準打包成 JSON 回給你。

### 解決的兩大痛點
- <mark style="background: #FF5582A6;">過度撈取（Over-fetching）</mark>：只想顯示「姓名」卻被迫下載含生日、地址、訂單等 50 個欄位，浪費流量。
- <mark style="background: #FF5582A6;">撈取不足（Under-fetching）／多次請求</mark>：要顯示文章列表＋作者姓名＋最新留言，REST 可能得先 `/posts`、再 `/users/1`、再 `/posts/1/comments`，發多次 HTTP 請求。

### REST vs GraphQL 對比

| 特性 | REST API | GraphQL |
|---|---|---|
| 進入點 Endpoints | 多個（/users, /posts, /comments） | <mark style="background: #BBFABBA6;">單一（通常只有 /graphql）</mark> |
| 資料決定權 | 後端定義回傳結構 | <mark style="background: #BBFABBA6;">前端決定要哪些欄位</mark> |
| 回傳資料量 | 固定，易 Over-fetching | 精準，要什麼給什麼 |
| 強型別系統 | 需額外工具（如 Swagger） | <mark style="background: #ADCCFFA6;">原生內建 Schema（Schema-driven）</mark> |

## 各對話來源

### GraphQL 概念、優缺點與比較(2026-06)— https://gemini.google.com/app/5004a4f4252619f3
使用者：GraphQL 是什麼？

Gemini：(摘要)Facebook 開發的 API 查詢語言＋Runtime，REST 替代方案、「要什麼給什麼」。用套餐 vs 自助餐比喻；解決 Over-fetching 與 Under-fetching/多次請求兩痛點；對比表（單一 endpoint、前端決定欄位、精準回傳、原生 Schema 強型別）。
