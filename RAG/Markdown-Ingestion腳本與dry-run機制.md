---
title: RAG Markdown Ingestion 腳本(ingest.py)與 --dry-run 機制
type: topic-note
source: Gemini
category: 技術
tags: [gemini, RAG, pgvector, ingest, argparse, dry-run, embedding]
sources:
  - https://gemini.google.com/app/570dfd9018317aea
updated: 2026-06-25
---

# RAG Markdown Ingestion 腳本(ingest.py)與 --dry-run 機制

## 重點整理

### 這支腳本在做什麼

`ingest.py` 是把 <mark style="background: #FFF3A3A6;">Markdown 檔案匯入 pgvector</mark> 的進入點(entry point),供 RAG 存放 embedding。

執行模式(命令列旗標):

| 旗標 | 行為 |
|---|---|
| (預設) | <mark style="background: #BBFABBA6;">增量匯入(incremental)</mark>:只處理有變動的檔案 |
| `--full` | 重新匯入全部檔案(re-ingest everything) |
| `--dry-run` | <mark style="background: #ADCCFFA6;">預演:只回報「會更新哪些檔案」,但不實際改動資料庫</mark> |

### 這些旗標哪來的?argparse

<mark style="background: #ADCCFFA6;">`argparse` 是 Python 標準函式庫</mark>(內建,不用安裝),負責處理命令列參數。`--dry-run`、`--full` 這些選項就是<mark style="background: #FFF3A3A6;">在這支 `ingest.py` 的 `main()` 函式裡,用 argparse 自己定義出來的</mark>,不是來自其他外部套件。

### 增量匯入與 --dry-run 的核心:雜湊比對

腳本判斷檔案有沒有變動的方法是<mark style="background: #FFF3A3A6;">比對「目前檔案的 hash」與「資料庫中已存的 hash」</mark>:

- 兩者<mark style="background: #BBFABBA6;">相同 → 檔案沒變 → 跳過(skip)</mark>。
- 兩者不同 → 檔案有更新 → 刪除舊 chunks、插入新 chunks。

當 `args.dry_run` 為真時,腳本<mark style="background: #FF5582A6;">只「回報」哪些檔案會被更新,但刻意略過資料庫修改步驟(不刪除、不插入 chunks)</mark>,所以不會對 pgvector 做任何實際變更。

> [!tip] dry-run 的價值:在真的動資料庫前,先安全地預覽「這次會改到哪些檔案」,避免誤刪/誤改 embedding。增量 + hash 比對則讓重複執行很便宜(沒變的檔案不重做)。

## 各對話來源

### Markdown Ingestion Script Explanation (2026-06) — https://gemini.google.com/app/570dfd9018317aea

> 註:對話搭配使用者上傳的 `ingest.py` 程式碼截圖,以英文/語音逐步追問。

**使用者:** (附程式碼截圖)這支腳本做什麼?

**Gemini:** 這是把 Markdown 檔匯入 pgvector 的進入點。預設可增量執行,或用 `--full` 重新匯入全部、`--dry-run` 預覽會改什麼。

**使用者:** `--dry-run` 哪來的?是來自我們之前的模組嗎?

**Gemini:** `argparse` 是 Python 標準函式庫(內建),用來處理命令列參數,`--dry-run` 這類選項就是靠它。而 `--dry-run` 這個 argument 是在 `ingest.py` 的 `main()` 裡自己定義的,不是外部來的。

**使用者:** 它顯示總數與更新的檔案,但怎麼做到不動到 PG?只是比對嗎?是比對既有 hash 與新 hash?

**Gemini:** 沒錯,腳本比對目前檔案的 hash 與資料庫中存的 hash,相同就代表沒變、跳過。當 `args.dry_run` 啟用時,只回報哪些檔案會更新,但刻意略過資料庫修改(刪除/插入 chunks),所以不會有實際變更。
