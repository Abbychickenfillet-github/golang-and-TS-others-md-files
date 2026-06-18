---
title: PHP 與高並發伺服端語言
type: topic-note
source: Gemini
tags: [gemini, php, backend, 高並發, nodejs, golang, java]
sources:
  - https://gemini.google.com/app/78743608d6877f49
updated: 2026-06-11
---

# PHP 與高並發伺服端語言

## 重點整理

### PHP 現況與用途
- PHP 在 2026 依然熱門且強大,驅動網站絕大多數伺服器。主要用於傳統網頁開發、內容管理系統(如 WordPress),以及越來越多高並發即時應用;現代 PHP 版本大幅提升執行效率與安全性。

### 高並發伺服端語言比較
- **Golang / PHP**:各有強項。
- **Node.js**:基於事件驅動 + 非阻塞 I/O 模型,處理高並發、I/O 密集型任務非常有效率,適合即時應用。
- **Java**:強大的 JVM 與多執行緒支援,企業級高效能系統廣泛採用。
- 「厲害」不等於「萬能」:選哪種取決於專案需求、團隊熟悉度與系統架構設計。

### 環境/安裝相關(順帶)
- 畫面上 475 GB / 剩 9.27 GB 顯示的是硬碟(C 槽)容量,**不是 RAM**(RAM 數字通常小很多、標在系統其他處)。
- 已有 DBeaver 與 HeidiSQL 的話,不一定需要裝 XAMPP(XAMPP 較耗資源、MySQL 一 crash 就麻煩);不急用 PHP 可等需要時再裝。
- 用 `winget` 在 CMD 安裝 PHP 失敗——CMD 是正確終端機,不是用錯;失敗常因權限不足或網路連線中斷。
- 資源回收筒(垃圾桶)的檔案也會佔硬碟容量,「清空資源回收筒」可釋放空間(本例約 3GB)。

## 各對話來源
### PHP 下載與安裝建議(2026-06)— https://gemini.google.com/app/78743608d6877f49
使用者(語音輸入,夾雜離題)與 Gemini 討論:硬碟容量 vs RAM 的辨識、是否需要 XAMPP(已有 DBeaver/HeidiSQL)、winget 安裝 PHP 失敗原因、PHP 是否仍熱門與用途、以及高並發伺服端語言(Golang/PHP/Node.js/Java)的比較與選型取決於需求。
