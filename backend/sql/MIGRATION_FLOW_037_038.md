# 資料庫遷移流程說明：037 + 038

## 📋 流程概覽

### 目標
1. 將 Product 與 GeneralContractor 的關係從**多對多**改為**一對多**
2. 在 `general_contractor` 表新增 `user_id` 欄位，關聯登入帳號
3. 建立 `general_contractor` 角色並分配權限

---

## 🔄 完整遷移流程

### 步驟 1：執行 037_product_add_gc_id_remove_junction.sql

#### 1.1 在 product 表新增 `general_contractor_id` 欄位
```sql
ALTER TABLE product
ADD COLUMN general_contractor_id VARCHAR(36) NULL;
```

**說明**：
- 欄位名稱是 `general_contractor_id`（全稱）
- `gc` 只是 SQL 查詢中的**別名（alias）**，用來縮短查詢語句
- 例如：`LEFT JOIN general_contractor gc` 中的 `gc` 是別名，不是欄位名

#### 1.2 從 junction table 遷移資料

**遷移邏輯**：
- 從 `general_contractor_product` junction table 讀取關聯資料
- 如果一個 product 對應多個 GC，只取**最早建立**的那筆（`MIN(created_at)`）
- 將 `general_contractor_id` 寫入 `product.general_contractor_id`

#### 1.3 驗證遷移結果

**驗證查詢說明**：
```sql
SELECT
    COUNT(*) AS total_products,
    SUM(CASE WHEN general_contractor_id IS NOT NULL THEN 1 ELSE 0 END) AS has_gc,
    SUM(CASE WHEN general_contractor_id IS NULL THEN 1 ELSE 0 END) AS no_gc
FROM product;
```

**結果解讀**：
- `has_gc = 1` 表示：有 1 筆商品已經分配給 GC（`general_contractor_id IS NOT NULL`）
- `has_gc = 0` 表示：沒有商品分配給 GC（所有商品的 `general_contractor_id` 都是 `NULL`）
- `has_gc` 是**計數**，不是布林值

#### 1.4 刪除 junction table
```sql
DROP TABLE IF EXISTS general_contractor_product;
DROP TABLE IF EXISTS general_contractor_inventory;
```

---

### 步驟 2：執行 038_create_general_contractor_role.sql

#### 2.1 在 general_contractor 表新增 `user_id` 欄位
```sql
ALTER TABLE general_contractor
ADD COLUMN user_id VARCHAR(36) NULL;
```

**目的**：讓 User（登入帳號）與 GeneralContractor（公司資料）建立關聯

#### 2.2 建立 general_contractor 角色
- 建立角色記錄
- 分配權限（商品管理、訂單查看等）

---

## 🔍 常見問題解答

### Q1: 在哪裡指定 `general_contractor_id = gc_id`？

**A**: 沒有這個指定！這是誤解。

- **欄位名稱**：`general_contractor_id`（全稱，存在資料庫中）
- **別名（alias）**：`gc`（只在 SQL 查詢中使用，用來縮短語句）

**範例**：
```sql
-- 這裡 gc 是別名，general_contractor_id 是實際欄位名
SELECT p.id, gc.company_name
FROM product p
LEFT JOIN general_contractor gc ON p.general_contractor_id = gc.id
--                                    ↑ 實際欄位名          ↑ 別名
```

### Q2: `has_gc = 1` 是什麼意思？

**A**: `has_gc` 是**計數**，不是布林值。

- `has_gc = 1`：有 1 筆商品的 `general_contractor_id` 不是 `NULL`
- `has_gc = 0`：沒有商品的 `general_contractor_id` 有值（全部都是 `NULL`）
- `has_gc = 5`：有 5 筆商品的 `general_contractor_id` 不是 `NULL`

**驗證查詢**：
```sql
SELECT
    COUNT(*) AS total_products,
    SUM(CASE WHEN general_contractor_id IS NOT NULL THEN 1 ELSE 0 END) AS has_gc,
    SUM(CASE WHEN general_contractor_id IS NULL THEN 1 ELSE 0 END) AS no_gc
FROM product;
```

### Q3: 為什麼要從多對多改為一對多？

**A**: 因為 Product 表有庫存欄位（`total_quantity`, `available_quantity` 等）

**多對多的問題**：
- 一個 Product 可以對應多個 GC
- 但庫存數量寫在 Product 表
- 無法區分「這 50 張桌子」屬於哪家 GC

**一對多的解決方案**：
- 一個 Product 只屬於一個 GC（`product.general_contractor_id`）
- 庫存數量明確屬於那家 GC
- 如果兩家 GC 都有「標準餐桌」，就建立兩筆 Product 記錄

---

## 📊 資料結構變化

### 遷移前（多對多）
```
Product (id=1, name="標準餐桌", total_quantity=50)
    ↕ (多對多)
GeneralContractorProduct (junction table)
    ↕
GC_A, GC_B (兩家 GC 都關聯到同一個 Product)
❌ 問題：50 張桌子屬於誰？
```

### 遷移後（一對多）
```
Product (id=1, name="標準餐桌", gc_id=GC_A, total_quantity=30)
Product (id=2, name="標準餐桌", gc_id=GC_B, total_quantity=20)
✅ 明確：GC_A 有 30 張，GC_B 有 20 張
```

---

## ✅ 執行順序

1. **先執行** `037_product_add_gc_id_remove_junction.sql`
   - 新增欄位
   - 遷移資料
   - 刪除 junction table

2. **再執行** `038_create_general_contractor_role.sql`
   - 新增 user_id 欄位
   - 建立角色和權限

---

## 🚨 注意事項

1. **備份資料**：執行前請先備份資料庫
2. **檢查資料**：執行後檢查驗證查詢的結果
3. **欄位名稱**：實際欄位名是 `general_contractor_id`，不是 `gc_id`
4. **別名使用**：`gc` 只是查詢中的別名，不影響實際欄位名
