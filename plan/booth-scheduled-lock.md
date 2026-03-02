# 攤位區域排程鎖定：設定鎖定時間，時間外自動解鎖

> **建立日期**: 2026/03/03
> **狀態**: 規劃中
> **影響範圍**: backend-go / dashboard / official_website (3 repos)

---

## 現狀分析

### 目前鎖定機制
- 鎖定是**前端 config JSON 裡的 `isLocked: boolean`**，存在 `maps.config` 欄位
- 區域（area）層級鎖定，不是攤位層級
- `isLocked = true` → 該區域攤位不可購買（前端攔截）
- `unlocked_booth_ids` → 鎖定區域中特別解鎖的攤位
- **後端沒有 lock 相關欄位**，無法做時間判斷

### 問題
1. 鎖定/解鎖完全手動操作
2. 無法預設「某時間自動開放」（例：VIP 區提前鎖定，活動前 3 天開放）
3. 前端 only 不安全，刷 API 可繞過鎖定

---

## 方案設計

### 核心思路
在 area config 中新增 `lock_until` 時間欄位。當 `isLocked = true` 且當前時間超過 `lock_until`，自動視為解鎖。

### 判斷邏輯
```
if (!isLocked) → 開放
if (isLocked && !lock_until) → 永久鎖定（手動解鎖）
if (isLocked && now >= lock_until) → 自動解鎖
if (isLocked && now < lock_until) → 鎖定中（顯示倒數）
```

---

## 方案 A：純前端 config 欄位（最小改動）

只改 area config JSON，後端不加欄位。

### 改動

#### Area Config JSON 結構變更
```typescript
// Before
interface AreaConfig {
  name: string
  color: string
  x: number; y: number; width: number; height: number
  isLocked?: boolean
  regionRule?: 'all' | 'tw_only' | 'foreign_only'
  pass_code?: string
  unlocked_booth_ids?: string[]
}

// After — 新增 lock_until
interface AreaConfig {
  // ... 同上
  isLocked?: boolean
  lock_until?: string  // ISO 8601，例 "2026-03-10T00:00:00+08:00"，null = 永久鎖定
}
```

#### Official Website (`EventsCreateBoothSettingsPage.tsx`)
| 改動 | 說明 |
|------|------|
| `customAreas` state 型別 | 新增 `lock_until?: string` |
| 區域鎖定 UI | 鎖定 toggle 旁加日期時間 picker |
| 攤位購買判斷 | `isLocked && (!lock_until \|\| now < lock_until)` |
| 儲存 config | lock_until 存入 maps.config JSON |

#### Dashboard (`booths.tsx`)
| 改動 | 說明 |
|------|------|
| Area 型別 | 新增 `lock_until?: string` |
| 區域卡片 UI | 「已鎖定」旁顯示解鎖時間 / 「已自動解鎖」|
| 鎖定設定 | 加日期時間 picker |

#### Backend
**不需要改動** — lock_until 存在 maps.config JSON 裡。

### 優點
- 最小改動，不需要 migration
- 不影響現有 API

### 缺點
- 前端 only，安全性弱（API 層沒有阻擋）
- 無法做 server-side 自動解鎖通知
- 不同前端（official_website / 未來 app）需各自實作判斷

---

## 方案 B：後端新增欄位（推薦）

後端新增 area 鎖定相關模型，讓鎖定邏輯由 server 判斷。

### 新欄位

#### Option B1：area 獨立為資料表（大改動）

把 area 從 config JSON 抽出成獨立 `map_area` 資料表：

```sql
CREATE TABLE map_area (
  id VARCHAR(36) PRIMARY KEY,
  map_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  x INT, y INT, width INT, height INT,
  is_locked BOOLEAN DEFAULT FALSE,
  lock_until DATETIME NULL,        -- NULL = 永久鎖定
  region_rule VARCHAR(20),         -- all / tw_only / foreign_only
  pass_code VARCHAR(100),
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME
);
```

改動量大，需要 migration、全新 CRUD、前端 config 解析重構。

#### Option B2：在 Booth model 加鎖定欄位（中等改動）

直接在攤位層級控制：

```go
// models/booth.go 新增
IsLocked   bool       `gorm:"default:false;comment:是否鎖定" json:"is_locked"`
LockUntil  *time.Time `gorm:"comment:鎖定截止時間，NULL=永久鎖定" json:"lock_until"`
```

但目前鎖定是 area 層級不是 booth 層級，語意不完全匹配。

#### Option B3：保持 config JSON + 後端加判斷（推薦，中間路線）

area 結構保持在 config JSON，但：
1. 後端在**攤位購買/預訂 API** 加入 lock 判斷
2. 解析 map config → 找到攤位所屬 area → 檢查 `isLocked` + `lock_until`
3. 如果鎖定中 → 拒絕購買

```go
// service/booth_service.go 新增方法
func (s *boothService) IsBoothLocked(boothID string) (bool, *time.Time, error) {
    // 1. 取得 booth 的 map_id + area
    // 2. 取得 map config JSON
    // 3. 解析 areas，找到對應 area
    // 4. 檢查 isLocked + lock_until
}
```

### 改動清單（B3 方案）

| Repo | 檔案 | 改動 |
|------|------|------|
| **backend-go** | `service/booth_service.go` | 新增 `IsBoothLocked()` 方法 |
| **backend-go** | `handler/booth_handler.go` | 購買/預訂前呼叫 lock 判斷 |
| **official_website** | `EventsCreateBoothSettingsPage.tsx` | area config 加 `lock_until`、日期 picker UI |
| **official_website** | 攤位購買頁 | 前端也判斷 lock（UX 提示） |
| **dashboard** | `booths.tsx` | 區域卡片顯示鎖定時間、設定 UI |
| **dashboard** | `types.ts` | area type 加 `lock_until` |

---

## 建議

**先做方案 A**（純前端 config），快速上線。
之後有需要再升級到 **B3**（後端加判斷）。

理由：
1. 目前鎖定本來就是前端 config，加 `lock_until` 是自然延伸
2. 不需要 DB migration
3. 購買流程本來就有其他驗證（庫存、付款），lock 被繞過的風險低
4. B3 可以獨立做，不影響 A 的資料結構

---

## 工作拆分（方案 A）

### Step 1: Official Website
1. `customAreas` 型別加 `lock_until?: string`
2. 區域設定 UI：鎖定 toggle 旁加「解鎖時間」日期時間 picker
3. `parseMapConfig` 解析 `lock_until`
4. 攤位顯示/購買判斷加入時間邏輯
5. 儲存時 `lock_until` 寫入 config JSON

### Step 2: Dashboard
1. `AreaConfig` 型別加 `lock_until?: string`
2. 區域卡片：顯示「鎖定至 YYYY/MM/DD HH:mm」或「已自動解鎖」
3. 區域設定 modal：加日期時間 picker

### Step 3: Backend（可選，方案 A 不需要）
- 無改動

---

## UI 草圖

### 區域鎖定設定（official_website）
```
┌─────────────────────────────────────┐
│ 區域：VIP 區                        │
│                                     │
│ [🔒 鎖定] ← toggle                 │
│                                     │
│ 解鎖時間（選填）                      │
│ ┌─────────────┐ ┌──────────┐       │
│ │ 2026-03-10  │ │ 00:00    │       │
│ └─────────────┘ └──────────┘       │
│ 留空 = 手動解鎖                      │
│                                     │
│ 狀態：🔒 鎖定中（3/10 自動解鎖）      │
└─────────────────────────────────────┘
```

### 消費者端看到的
```
┌─────────────────────────┐
│ VIP 區                  │
│ 🔒 尚未開放             │
│ 將於 3/10 00:00 開放選位 │
└─────────────────────────┘
```
