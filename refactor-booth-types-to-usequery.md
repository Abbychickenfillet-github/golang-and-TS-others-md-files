# Refactor: loadBoothTypesAndPricing → useQuery + 後端聚合 API

> **建立日期**: 2026/03/02
> **狀態**: 規劃中
> **相關 commit**: `2e7d446` (feat: 新增地圖按鈕 + 攤位類型按 map_id 分離)
> **PR**: https://github.com/yutuo-tech/future_sign.official-website/pull/88

## 問題分析

### 前端目前做了什麼（4 層 API 瀑布）

`loadBoothTypesAndPricing()` 一次呼叫打了 **1 + N + N + 1 個 API**：

```
第 1 層: GET /event-booth-types/?event_id=xxx&map_id=yyy
         → 拿到 N 個 booth types

第 2 層: 對每個 type → GET /event-booth-types/{id}/pricings
         → N 個平行請求，拿每個 type 的定價列表

第 3 層: 對每個 type → GET /event-booth-types/{id}/pricings/deleted
         → N 個平行請求，拿每個 type 的已刪除定價

第 4 層: GET /event-booth-types/deleted?event_id=xxx&map_id=yyy
         → 拿已刪除的 booth types
```

假設有 5 個攤位類型，一次載入就打 **1 + 5 + 5 + 1 = 12 個 API**。
遠端 staging DB 每個 query ~80ms，這就是 ~1 秒的瀑布延遲。

### 為什麼不應該前端做這件事

後端已經有 `GetBoothTypeWithPricings`（單一類型含 pricings），
但沒有「批量取得所有類型 + 各自的 pricings」的聚合 API。
前端被迫自己 N+1 查詢來組合資料，這應該是後端 service 層做的事。

---

## 方案：新增後端聚合 API

### 新 API

```
GET /api/v1/event-booth-types/with-pricings?event_id=xxx&map_id=yyy
```

**回傳格式：**
```json
{
  "data": [
    {
      "id": "...",
      "type_code": "A",
      "type_name": "標準攤位",
      "pricings": [ ... ]
    }
  ],
  "count": 5
}
```

一個請求取代前端的 1 + N 個請求（types + 每個 type 的 pricings）。

> **已刪除資料不包含在聚合 API 中**
>
> `deletedBoothTypes` 和 `deletedPricingTiers` 只用在「歷史紀錄」面板，
> 使用者點「歷史紀錄」按鈕才需要。可以保持原本的 lazy load 方式，
> 或之後再加 `GET /event-booth-types/deleted/with-pricings` 聚合。
> 不需要一個 `include_deleted` flag 把所有東西塞進同一個請求。

### 後端改動

| 檔案 | 改動 |
|------|------|
| `internal/dto/event_booth_type.go` | 新增 `EventBoothTypeFull` response DTO |
| `internal/service/event_booth_type_service.go` | 新增 `GetBoothTypesFullByEvent(eventID, mapID)` — 內部用 GORM Preload 一次撈 types + pricings |
| `internal/handler/event_booth_type_handler.go` | 新增 `GetBoothTypesFull` handler，路由掛 `/event-booth-types/full` |
| `cmd/server/main.go` | 註冊新路由 |

**關鍵**：用 GORM `Preload("Pricings")` 一次撈出，不需要 N+1 查詢：
```go
func (s *eventBoothTypeService) GetBoothTypesWithPricings(eventID, mapID string) ([]models.EventBoothType, int64, error) {
    var types []models.EventBoothType
    query := s.db.Where("event_id = ? AND map_id = ?", eventID, mapID).
        Preload("Pricings")  // 一次撈全部 active pricings
    query.Find(&types)
    // ... 轉換成 DTO
}
```

### 前端改動

| 檔案 | 改動 |
|------|------|
| `EventsCreateBoothSettingsPage.tsx` | `loadBoothTypesAndPricing` 90 行 → `useQuery` ~15 行 |

**Before（90 行，12 個 API）：**
```typescript
const loadBoothTypesAndPricing = async () => {
  const types = await apiClient.get('/event-booth-types/?event_id=...')
  const typesWithPricings = await Promise.all(
    types.map(type => apiClient.get(`/event-booth-types/${type.id}/pricings`))
  )
  // ... 組合 tierMap、deletedTierMap ...
  const deletedTypes = await apiClient.get('/event-booth-types/deleted?event_id=...')
  // ... N+1 查詢取 deleted pricings ...
}
```

**After（~15 行，1 個 API）：**
```typescript
const { data: boothTypesData, refetch: refetchBoothTypes } = useQuery({
  queryKey: ['booth-types-with-pricings', eventId, currentMapId],
  queryFn: () => apiClient.get<BoothTypesWithPricingsResponse>(
    `/event-booth-types/with-pricings?event_id=${eventId}&map_id=${currentMapId}`
  ),
  enabled: !!eventId && !!currentMapId,
})

// 從 query data 派生
const boothTypes = boothTypesData?.data ?? []
const pricingTiers = useMemo(() => buildTierMap(boothTypes), [boothTypes])
// deleted 資料保持原本的 lazy load（使用者點歷史紀錄才載入）
```

**額外好處：**
- `queryKey` 帶 `currentMapId` → 切地圖自動 refetch，不需要額外 useEffect
- 5 個手動呼叫 `loadBoothTypesAndPricing()` → 改成 `refetchBoothTypes()`
- tierMap 組合邏輯抽成 `buildTierMap()` 純函式，更好測試
- 可以刪掉 `setBoothTypes`、`setPricingTiers` 等 useState（改用 query data 派生）

---

## 工作拆分

### Step 1: 後端 — 新增聚合 API
1. DTO: 新增 `EventBoothTypeWithPricingsListResponse`
2. Service: 新增 `GetBoothTypesWithPricings(eventID, mapID)` 用 Preload 撈資料
3. Handler: 新增 `GetBoothTypesWithPricingsList`
4. 路由: 註冊 `GET /event-booth-types/with-pricings`
5. 測試: service 層測試

### Step 2: 前端 — 改用 useQuery + 新 API
1. 替換 `loadBoothTypesAndPricing` 中 types + pricings 部分 → `useQuery` + 新聚合 API
2. 抽出 `buildTierMap()` 純函式
3. 5 處手動呼叫改成 `refetchBoothTypes()`
4. 刪掉 2 個 useEffect（`[eventId]` 和 `[currentMapId]`）
5. deleted types / deleted pricings 保持原本獨立請求（lazy load，只在使用者點歷史紀錄時載入）

---

## 效能影響

| 指標 | Before | After |
|------|--------|-------|
| API 呼叫數（主要載入） | 1 + N (6 個 @ 5 types) | 1 |
| API 呼叫數（含 deleted） | 1 + N + N + 1 (12 個 @ 5 types) | 1 + 原本 deleted lazy load |
| 遠端 DB 延遲 | ~1s (瀑布) | ~100ms (單次 Preload) |
| 前端程式碼 | ~90 行命令式 | ~15 行宣告式 |
| 快取 | 無 | React Query 自動快取 |
| 切地圖重載 | 手動 useEffect | queryKey 自動 |
