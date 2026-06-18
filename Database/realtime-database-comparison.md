# Realtime Database 比較 — 為什麼 Supabase 把這個當賣點？

> 「資料庫變更即時推送到前端」這件事看起來是 Supabase / Firebase 的特殊功能。
> 真相是——**PostgreSQL / MySQL 都有「變更感知」能力，只是沒幫你推送到前端**。
> Supabase 的價值是把這條鏈路包好成一行 code 的 SDK。

---

## 1. 「Realtime DB」要做的兩件事

> 直覺：資料庫變了 → 前端立刻看到、不用刷新

這需要兩個能力：

| 能力 | 內容 |
|---|---|
| **變更感知** | 資料庫知道「有人改了資料」這件事 |
| **推送到前端** | 把變更通知透過 WebSocket / SSE 推到 client |

**關鍵**：大多數資料庫**第一個能力都有**，但**第二個能力只有 BaaS 包好給你用**。

---

## 2. 三個層級的 Realtime 能力

### 層 1：完全沒有 → 只能 Polling

```
前端每 1 秒問一次「有新資料嗎？」
    ↓
即使沒變化也打了 API、浪費頻寬
    ↓
不是 realtime，是「定時刷新」
```

❌ 笨、慢、貴。

### 層 2：有變更感知（但只給伺服器端用）

主流關聯式資料庫**都內建變更感知機制**，只是 API 給伺服器端訂閱、不是給前端：

| 資料庫 | 變更感知機制 |
|---|---|
| **PostgreSQL** | `LISTEN / NOTIFY`（內建 pub/sub）、**WAL**（Write-Ahead Log）、Logical Replication |
| **MySQL** | **Binlog**（binary log，可串流出來）|
| **MongoDB** | **Change Streams**（最接近 realtime 的設計）|
| **Redis** | Pub/Sub、Keyspace Notifications |

⚠️ 這些都不會直接推給前端——你還要自己架 **WebSocket server** + **訂閱資料庫變更** + **路由給對的使用者**。

### 層 3：原生 realtime to client（產品定位）

| 產品 | 怎麼做到 |
|---|---|
| **Firebase Firestore** | 整個產品 realtime first，client SDK 直接 subscribe |
| **Supabase** | PostgreSQL + Realtime Server 包好（Elixir/Phoenix 寫的）|
| **PocketBase** | SQLite + 內建 WebSocket |
| **Hasura** | PostgreSQL + GraphQL Subscriptions |
| **AWS AppSync** | DynamoDB / Aurora + GraphQL Subscriptions |
| **MongoDB Realm / Atlas Device Sync** | Change Streams + 推送 |

---

## 3. Supabase Realtime 內幕——其實就是包裝 PostgreSQL 的 WAL

Supabase 沒發明新東西，**它把 PostgreSQL 早就有的功能串起來**：

```
你前端寫一行：
supabase.from('messages').on('INSERT', cb).subscribe()
                              ↓
                              ↓  Supabase 在背後做的事 ↓
                              ↓
PostgreSQL 寫入 INSERT
    ↓
WAL（Write-Ahead Log）紀錄這條變更
    ↓
Logical Replication slot 把 WAL 串流出來
    ↓
Supabase Realtime Server（Elixir / Phoenix 寫的）解析 WAL
    ↓
透過 WebSocket 推給訂閱了 'messages' 表的前端
    ↓
你前端的 callback 被觸發
```

**5 個層級全部代勞**——這就是 Supabase 賣點。

### WAL 是什麼？

**WAL = Write-Ahead Log**（預寫式日誌）。PostgreSQL 在真正寫入資料表**之前**，先把這次變更寫進 WAL——目的：
- **崩潰恢復**：機器掛了，下次開機重放 WAL 還原資料
- **複寫**：standby 可以訂閱主庫的 WAL，做即時同步
- **Realtime 副產品**：既然有變更紀錄串流，順便讓 Supabase 訂閱推給前端

---

## 4. 自架 vs Supabase 工程量對比

如果你想「自架 PostgreSQL + 自己做 realtime」要寫的東西：

| 要做的事 | 自架 PostgreSQL | Supabase |
|---|---|---|
| 架 WebSocket server（Node.js / Go） | 幾百行 | ✅ 內建 |
| 訂閱 WAL（用 `wal2json` 或 logical replication slot）| 進階 PG 知識 | ✅ 內建 |
| Row-Level Security 整合（避免訂閱洩漏別人資料）| 安全坑很多 | ✅ 內建（和 Auth 整合）|
| Reconnection、heartbeat、斷線重訂閱 | 自己寫、很煩 | ✅ 內建 |
| Channel routing（誰能看哪個 table 哪一列）| 自己設計 | ✅ 內建 |
| **總工程量** | 數百行 + 安全責任 | `.on('INSERT', cb).subscribe()` |

這就是 BaaS（Backend as a Service）的賣點——**用工程時間換錢**。

---

## 5. 適合 / 不適合 Realtime 的場景

### ✅ 適合

| 場景 | 為什麼 |
|---|---|
| **聊天訊息** | 不能用刷新看新訊息 |
| **通知推送** | 即時性是核心體驗 |
| **多人協作**（Notion / Figma 多遊標）| 看得到別人在做什麼 |
| **即時儀錶板**（股票、訂單、車輛追蹤）| 數字變化要立刻看到 |
| **多裝置同步** | 手機改了、電腦立刻更新 |

### ❌ 不適合或不需要

| 場景 | 為什麼 |
|---|---|
| **一次性 Q&A、文件問答** | 沒有「持續變化」的資料 |
| **報表系統**（一天打開幾次）| 手動 reload 即可 |
| **後台管理介面** | 操作完自己 reload，不需要別人改你立刻看到 |
| **電商商品列表** | 庫存變化不需要秒級同步 |

---

## 6. 為什麼 Firebase / Supabase 都把這個當賣點？

因為**現代前端應用幾乎都需要 realtime**——但傳統做法（REST API + Polling）做這些**體驗很差**。

Realtime DB 是 BaaS 的**差異化武器**：
- Firebase 從第一天就把 realtime 當核心
- Supabase 跟進並用 PostgreSQL（避開 Firebase 的 NoSQL 鎖定）
- PocketBase 用 SQLite 做小型版

**這個賣點本質**：**省去開發者自架 WebSocket + WAL 訂閱 + 路由 + RLS** 的好幾週工程時間。

---

## 7. 一句話總結

> **PostgreSQL / MySQL 都有「變更感知」能力（WAL、Binlog），但只給伺服器端用。Supabase 的 Realtime 是把「PostgreSQL 變更感知 → WebSocket 推給前端」這條鏈路做成開箱即用的 SDK——不是創新功能，是降低工程門檻。**

---

## 相關概念

- **WAL（Write-Ahead Log）**：PostgreSQL 的核心日誌機制，崩潰恢復 + 複寫 + Realtime 都靠它
- **Logical Replication**：PostgreSQL 內建的「訂閱 WAL 變更」介面
- **Change Data Capture (CDC)**：資料庫變更串流的通用術語，Debezium、Maxwell 等工具做這件事
- **WebSocket / SSE**：把推送送到 client 的傳輸層
