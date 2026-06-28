# Database Sharding

## 一句話定義

把一張「大到一台 DB 扛不動」的表，**按某個 key 切成好幾份**，分散到不同 DB 實例上。

## 直覺例子

假設 `orders` 表有 **10 億筆**，一台 MySQL 查詢很慢。

**Sharding 做法：** 依 `user_id % 4` 切成 4 份：

```
DB-0: user_id % 4 == 0 的訂單  (2.5 億)
DB-1: user_id % 4 == 1 的訂單  (2.5 億)
DB-2: user_id % 4 == 2 的訂單  (2.5 億)
DB-3: user_id % 4 == 3 的訂單  (2.5 億)
```

每次查詢先算 `user_id % 4` → 只打對應那台 DB。

## 跟其他概念的差別

| 技術 | 做什麼 | 解決什麼 |
|------|-------|---------|
| **Index** | 同一張表加索引 | 查詢慢 |
| **Partition** | 同一個 DB 內部切分區 | 單表太大，掃描慢 |
| **Replication** | 主從複製，多份一樣的資料 | 讀取流量大 / 容災 |
| **Sharding** | 切成多份，**每份都不一樣** | **寫入** 太多、單機裝不下 |

**關鍵：** Replication 是「複製」，Sharding 是「切開」。

## 前置知識：DB Instance / Database / Table 三層

聊 sharding 前要先分清楚三個名詞，常被混用：

| 名詞 | 是什麼 | 比喻 |
|------|-------|------|
| **DB Instance（實例）** | 一個跑著的 MySQL **server 程式**（佔 port、佔記憶體、佔 CPU） | 一台「冰箱」 |
| **Database（資料庫）** | Instance 裡面的一個 schema | 冰箱裡的一個「抽屜」 |
| **Table（表）** | Database 裡的一張表 | 抽屜裡的一個「盒子」 |

**FutureSign 例子：** staging 那台 `hnd1.clusters.zeabur.com:32195`：

- ✅ 1 個 MySQL **instance**（一個跑著的 mysqld）
- 裡面可能有 `futuresign_dev`、`futuresign_test` 等多個 **database**
- 每個 database 裡有 `users`、`orders`、`tickets` 等多個 **table**

### 「分散到不同 DB 實例」是什麼意思

**不是**「一張表拆去不同 database」，**是**「拆去不同台伺服器（instance）」。

```
不分 sharding：
┌─────────────────────────┐
│ Server A (一台機器)         │
│  └─ MySQL instance      │
│      └─ orders 表 (10 億筆) │  ← 一台扛不住
└─────────────────────────┘

分 sharding：
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Server A     │  │ Server B     │  │ Server C     │  │ Server D     │
│ MySQL inst.  │  │ MySQL inst.  │  │ MySQL inst.  │  │ MySQL inst.  │
│ orders shard 0│  │ orders shard 1│  │ orders shard 2│  │ orders shard 3│
│ (2.5 億筆)   │  │ (2.5 億筆)   │  │ (2.5 億筆)   │  │ (2.5 億筆)   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**重點是「實體機器分開」**，所以：

- 4 台機器 = 4 倍 CPU、4 倍記憶體、4 倍硬碟
- 每台只扛 1/4 的查詢壓力

### Sharding vs Replication 對照

```
Replication（讀寫分離）：每台都是「完整一份」
┌──────────┐         ┌──────────┐
│ Master   │ ──同步──>│ Replica1 │ ← 只讀
│ (寫入)   │ ──同步──>│ Replica2 │ ← 只讀
│ orders   │         │ orders   │
│ (10 億)  │         │ (10 億)  │ ← 完整 10 億
└──────────┘         └──────────┘

Sharding：每台是「不一樣的一塊」
┌──────────┐  ┌──────────┐
│ Shard 0  │  │ Shard 1  │
│ orders   │  │ orders   │
│ (5 億)   │  │ (5 億)   │ ← 加起來才是 10 億
└──────────┘  └──────────┘
```

**差別一句話：** Replication 是「複製」，Sharding 是「切開」。

## Sharding Key 怎麼選

常見策略：

| 策略 | 範例 | 優點 | 缺點 |
|------|------|------|------|
| **Range** | `user_id 1~100萬 → DB0` | 範圍查詢快 | 熱點（新用戶都在最後一台） |
| **Hash** | `user_id % N` | 分佈均勻 | 擴容難（要 rehash 搬資料） |
| **Consistent Hash** | 環狀 hash | 擴容只搬一部分 | 實作複雜 |
| **Geo** | 亞洲 / 美洲各一台 | 延遲低 | 跨區查詢麻煩 |

## 痛點（為什麼不輕易用）

1. **跨 shard 查詢地獄** — `SELECT * FROM orders WHERE amount > 1000` 要打所有 shard 再合併
2. **跨 shard JOIN 幾乎不可能** — 訂單在 DB-0、會員在 DB-2，JOIN 寫不出來
3. **跨 shard transaction 難** — 沒有 ACID，要用分散式交易（2PC / Saga）
4. **擴容痛** — 從 4 台加到 8 台，資料要搬
5. **Sharding key 選錯 = 災難** — 後期要換 key，幾乎要重灌

## 對照 FutureSign

**目前完全不需要 sharding。** 判斷依據：

| 指標 | Sharding 門檻 | FutureSign 現況 |
|------|-------------|----------------|
| 單表資料量 | > 10 億筆 | 遠低於 |
| 寫入 QPS | > 單機極限（MySQL 約 5k-10k/s）| 遠低於 |
| 單表大小 | > 500GB | 遠低於 |

**先做這些更有效：**

1. 加對的 **index**（最便宜）
2. **讀寫分離**
3. **分表不分庫**（MySQL Partition，`event_id` 範圍切）
4. **冷資料歸檔**（舊活動的訂單搬到 archive 表）

**什麼時候才考慮 sharding？** 單一活動（例如 KKBOX MIC、Pinkoi 市集）票券量達百萬級、且一台 DB 寫入跟不上的時候。
