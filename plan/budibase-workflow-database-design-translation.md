# Workflow Management Database Design（工作流程管理資料庫設計）

原文：https://budibase.com/blog/data/workflow-management-database-design/

---

## 前言

工作流程管理資料庫設計是建構提升效率工具的關鍵。大多數內部任務都可以表達成一連串的「請求」和「決策」— 有人提出請求，另一個人根據預定的邏輯來核准或拒絕。

---

## 什麼是工作流程管理資料庫？

工作流程管理資料庫儲存的是「一個流程在任何時間點的狀態資訊」，以及「它是如何走到這一步的」。

這對應到電腦科學裡的**有限狀態機（Finite-State Machine）**模型：
- 資源存在於數個狀態中的某一個
- 動作會讓資源從一個狀態移動到另一個
- 狀態的流轉是基於商業規則

### 範例：Bug 追蹤流程

1. 使用者提交 bug（狀態：**已提交 submitted**）
2. 客服驗證提交格式是否正確（格式不對 → **拒絕 declined**）
3. 分派給開發團隊（狀態：**待處理 pending**）
4. 開發開始修復（狀態：**進行中 in-progress**）
5. 修復完成（狀態：**已解決 resolved**）
6. 通知原始提交者

這就是一個典型的工作流程 — 一個請求經過多個狀態，每個狀態之間的轉換都有規則。

---

## 需要哪些核心資料實體？

基本模型需要能夠代表以下東西：

- **請求（Requests）** — 可以被審查、核准或執行的東西
- **流程（Processes）** — 定義每個請求應該怎麼被處理的規則
- **請求資訊（Request Data）** — 每個請求附帶的資料（不同流程需要不同的資料）
- **狀態（States）** — 請求可以處於的各種狀態
- **流轉與動作（Transitions & Actions）** — 定義狀態之間怎麼跳轉、使用者可以執行什麼操作
- **使用者（Users）** — 參與工作流程的人

---

## 五步驟設計過程

### 第一步：流程與使用者（Processes & Users）

兩張核心表：

**users（使用者表）**
- 儲存個人資訊和角色

**processes（流程表）**
- 儲存流程的唯一 ID 和描述性名稱
- 例如：「Bug 修復流程」、「請假流程」、「活動刪除審核流程」

再加一張 **junction table（關聯表）** 建立使用者和流程之間的多對多關係 — 一個人可以參與多個流程，一個流程也有多個參與者。

### 第二步：請求（Requests）

**requests（請求表）** 儲存：
- 標題（title）
- 請求日期（request date）
- 關聯的流程（associated process）
- 提出請求的使用者（requesting user）
- 目前狀態（current state）

**requestStakeholders（請求關係人表）** — junction table，記錄所有跟這個請求有關的人。一個請求可能牽涉到多個人（提交者、審核者、通知對象等）。

**requestData（請求資料表）** — 用 name/value pairs（名稱/值對）儲存每個流程特有的資訊。

為什麼用 name/value pairs？因為不同流程需要的資料不一樣：
- Bug 修復流程需要：重現步驟、嚴重程度、影響範圍
- 請假流程需要：請假日期、天數、代理人
- 活動刪除流程需要：刪除原因

用固定欄位的話每個流程都要改表結構，用 name/value pairs 就不用。

### 第三步：狀態與流轉（States & Transitions）

**stateTypes（狀態類型表）** — 把狀態分成 5 大類。
例如：初始狀態、進行中狀態、等待中狀態、完成狀態、失敗狀態。

**states（狀態表）** 儲存：
- 唯一 ID
- 名稱和描述
- 關聯到哪個 stateType
- 跟 requests 是一對多關係（一個狀態可以對應多個請求）

**transitions（流轉表）** 定義狀態之間的合法移動路徑：
- 主鍵
- 關聯到哪個流程（process）
- 來源狀態（currentStateId）— 從哪個狀態
- 目標狀態（nextStateId）— 到哪個狀態

例如：
```
流程：活動刪除審核
transition 1: pending → approved（待審核 → 已核准）
transition 2: pending → rejected（待審核 → 已拒絕）
transition 3: pending → cancelled（待審核 → 已取消，申請者自己撤回）
```

這樣就定義了「從 pending 只能往 approved / rejected / cancelled 走，不能跳到其他狀態」。

### 第四步：動作（Actions）

**actionTypes（動作類型表）** — 把動作分成 7 大類。

**actions（動作表）** 儲存：
- 唯一 ID、名稱、描述
- 關聯到哪個 actionType 和 process
- 跟 transitions 是多對多關係（一個動作可以觸發多個流轉，一個流轉也可以被多個動作觸發）

動作是使用者可以對請求做的事。例如：
- 「核准」動作 → 觸發 pending → approved 的流轉
- 「拒絕」動作 → 觸發 pending → rejected 的流轉
- 「撤回」動作 → 觸發 pending → cancelled 的流轉

### 第五步：實作邏輯（Implementing Logic）

商業邏輯可以放在三個地方：

1. **資料庫層**（stored procedures）— 用預存程序直接在 DB 裡處理
2. **中介層**（middleware）— 在後端 API 裡處理（我們的做法：Go service 層）
3. **個別工具**（application-specific）— 在前端或特定應用裡處理

---

## 其他考量

### 角色存取控制（RBAC）

「有相似職責的同事可以群組在一起，簡化權限管理。」

例如：
- admin 角色 → 可以核准/拒絕刪除請求
- organizer 角色 → 只能提出刪除請求
- viewer 角色 → 只能看，不能操作

### 預存程序（Stored Procedures）

預先定義好的複雜查詢，用名字就能呼叫。好處是效能好、安全性高。

### 驗證規則（Validation Rules）

確保使用者提供的資料符合欄位的限制條件。應該在資料庫層和 UI 層都做驗證。

例如：
- 刪除原因不能為空
- 狀態只能是 pending / approved / rejected / cancelled 其中之一

### 工作流程自動化（Workflow Automation）

一致的資料庫結構可以支援自動化。例如用 Zapier 或 low-code 平台串接：
- 刪除請求核准後 → 自動發通知給主辦方
- 退款審核通過後 → 自動觸發退款 API

### 資料庫互動方式（Database Interactions）

決定怎麼存取資料庫：
- 手動下 SQL 查詢
- CRUD 應用（我們的做法：Go API + Repository 層）
- Dashboard 儀表板
- 管理後台

---

## 結論

這整套設計建立了一個可重複使用的框架，適用於多個類似的工作流程。同一套資料庫結構可以支援各種內部工具和自動化方案。

---

## 跟我們的 action_log / approval_request 的關係

Budibase 這篇描述的是一個**完整的 workflow engine（工作流程引擎）**，包含 7+ 張表：
processes、users、requests、requestData、states、stateTypes、transitions、actions、actionTypes...

**我們不需要這麼複雜。** 我們的需求很單純：
- 只有幾種固定的流程（活動刪除、退款審核）
- 狀態流轉很簡單（pending → approved/rejected/cancelled）
- 不需要動態定義新流程

所以我們用一張表 + status 欄位就能搞定，不用建整套 workflow engine。
但這篇文章的概念（requests、states、transitions、actions）是我們設計的理論基礎。
