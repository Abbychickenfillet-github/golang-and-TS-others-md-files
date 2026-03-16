# 批次查詢 vs N+1 問題

## 什麼是 N+1

迴圈裡每個元素各查一次 DB：

```go
// ❌ N+1：100 個攤位 = 100 次 DB 查詢
for _, booth := range booths {
    price, _, _, _ := service.GetBoothPrice(&booth)  // 每次都查 DB
}
```

## 批次查詢解法

先一次查完所有資料，迴圈中只做記憶體比對：

```go
// ✅ 批次：2 次 DB 查詢 + 100 次記憶體比對
cacheData := service.BuildPriceCacheV2(boothTypes)  // 1-2 次 DB

for _, booth := range booths {
    price, _, _ := service.ResolvePriceForBooth(&booth, cacheData)  // 純記憶體，0 次 DB
}
```

## 實際案例（2026-03-16 攤位定價修正）

### 第一次修（錯誤）
把 handler 的 priceCache 改成每個攤位呼叫 `GetBoothPrice`：
- 100 個攤位 × 每次查 1-2 次 DB = 100-200 次 DB 查詢
- 每次查詢 ~100ms（遠端 staging DB）= 10-20 秒載入時間

### 第二次修（正確）
用 `BuildPriceCacheV2` 批次查 + `ResolvePriceForBooth` 記憶體匹配：
- 2 次 DB 查詢（所有定價記錄）
- 100 次記憶體 map lookup + array scan
- 總計 ~200ms

## 判斷何時需要批次

如果你在迴圈裡看到 DB 查詢（repository 呼叫），就是 N+1：

```go
// 🚩 警告信號：迴圈裡有 repo/service 呼叫
for _, item := range items {
    result, _ := repo.GetByID(item.ID)      // ← 每次都查 DB
    pricing, _ := repo.GetCurrentPricing(id) // ← 每次都查 DB
}
```

改法：在迴圈外先批次查好，迴圈內只用 map 查找。
