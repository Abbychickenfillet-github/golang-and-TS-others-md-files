---
title: PostgreSQL Checkpoint 與 SIGTERM／SIGKILL（Docker 容器關閉）
type: topic-note
source: Gemini
tags: [gemini, postgresql, checkpoint, docker, signal, sigterm, sigkill]
sources:
  - https://gemini.google.com/app/15200ee3b4981591
updated: 2026-06-15
---

# PostgreSQL Checkpoint 與 SIGTERM／SIGKILL（Docker 容器關閉）

> 這篇來自一次語音輸入的自我問答複習，整理三個核心概念。

## 重點整理

### PostgreSQL Checkpoint（檢查點）

- 主要作用：把<mark style="background: #FFF3A3A6;">記憶體 buffer 中「修改過（dirty）但還沒寫回硬碟」的資料，flush 寫入磁碟</mark>，確保資料的完整性與一致性。
- <mark style="background: #FF5582A6;">不是</mark>對磁碟做健康檢查；它跟資料庫的崩潰恢復（crash recovery）機制有關。
- 「資料表（table）」＝資料庫中由行與列組成的資料結構，用來儲存與組織實際資料。

### SIGTERM vs SIGKILL（Unix 程序信號）

| 信號 | 編號 | 性質 |
|------|------|------|
| `SIGTERM` | 15 | <mark style="background: #BBFABBA6;">禮貌的關閉請求</mark>，讓程序有時間清理、優雅關閉；**可被攔截／處理** |
| `SIGKILL` | 9 | <mark style="background: #FF5582A6;">強制終止</mark>，無法被攔截，沒有轉圜餘地 |

### Docker 容器關閉機制

- `docker stop` 先送 <mark style="background: #ADCCFFA6;">SIGTERM</mark> 給容器的主程序（PID 1），給它機會保存狀態優雅關閉。
- 若超時仍未關閉，再送 <mark style="background: #FF5582A6;">SIGKILL</mark> 強制結束。
- 容器的生命週期綁定 PID 1：<mark style="background: #FFF3A3A6;">主程序死掉，容器就會跟著結束</mark>。

## 各對話來源
### PostgreSQL Log Explanation（2026-06）— https://gemini.google.com/app/15200ee3b4981591

（語音輸入的自我問答複習，夾雜複習 jest/enzyme/mocha、投履歷與作品集整理的疲憊心情。）

使用者：checkpoint 是檢查資料庫對磁碟做讀寫檢查、看運行狀態是否健康嗎？ → Gemini：稍寬泛了。checkpoint 主要是把記憶體中修改過的資料寫回硬碟，確保完整性與一致性，不是磁碟健康檢查。

使用者：資料表是什麼？ → Gemini：就是「表」，由行和列組成、用來儲存資料的結構。

使用者：SIGTERM 是 Unix 信號 15 的禮貌關閉請求，可被攔截；PID 容器主 process 死掉容器就會死。 → Gemini：完全正確。不聽話就送 SIGKILL（信號 9）強制關閉；Docker stop 正是先 SIGTERM 給機會保存狀態、超時再強制關閉。
