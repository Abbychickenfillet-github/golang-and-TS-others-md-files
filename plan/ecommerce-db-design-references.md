# 電商資料庫設計參考文獻

> 相關 Issue：[Issue #308 — 品牌商品頁功能](issue-308-brand-product.md)
> GitHub: https://github.com/yutuo-tech/futuresign_backend/issues/308

這些文章在規劃 product 表擴展（新增 `sell_type` 區分設備/品牌商品）時作為參考，了解業界電商資料庫的常見設計模式。

---

## 文章一：E-Commerce Database Schema Design

**作者**：Biswanath Giri
**來源**：[Medium](https://bgiri-gcloud.medium.com/designing-the-database-schema-for-a-new-e-commerce-platform-and-considering-factors-like-ec28d4fb81db)

### 重點摘要

這篇文章從 normalization、denormalization、indexing、效能優化四個面向，討論如何為電商平台設計資料庫 schema。

### 核心資料表

| 表名 | 主要欄位 | 說明 |
|------|---------|------|
| Users | user_id, username, email, timestamps | 用戶帳號 |
| Products | product_id, name, description, price, stock_quantity, category_id | 商品目錄 |
| Categories | category_id, name | 商品分類 |
| Orders | order_id, user_id, total_amount, status, timestamps | 訂單 |
| OrderItems | order_item_id, order_id, product_id, quantity, price | 訂單明細 |
| Payments | payment_id, order_id, amount, method, status | 付款 |

### Normalization vs Denormalization

| 概念 | 做法 | 適用場景 |
|------|------|---------|
| **Normalization（正規化）** | 消除重複資料，至少做到 3NF（第三正規化） | 資料一致性優先的場景，例如用戶資料、商品基本資訊 |
| **Denormalization（反正規化）** | 刻意保留冗餘資料以加速查詢 | 讀取密集的場景，例如在 Orders 表直接存 `total_amount` 而不是每次從 OrderItems 計算 |

**什麼時候該 denormalize？**
- 某個計算要 JOIN 多張表且頻率很高 → 把結果直接存在主表
- 例：訂單總金額、商品評分平均值

### Indexing（索引策略）

建議加 index 的欄位：
```sql
CREATE INDEX idx_users_email ON Users(email);           -- 登入查詢
CREATE INDEX idx_products_category ON Products(category_id);  -- 分類篩選
CREATE INDEX idx_orders_user ON Orders(user_id);         -- 用戶訂單查詢
```

### 效能優化建議

- **Materialized View（物化視圖）**：對不常變動的複雜查詢建立物化視圖，避免每次重新計算
- **Caching（快取）**：頻繁存取的資料（商品列表、分類）用 Redis 等快取減少 DB 負擔
- **Partitioning（分區）**：大表按時間或類型分區，例如訂單表按月份分

### 跟我們的關係

我們的 `product` 表同時存設備和品牌商品，用 `sell_type` 區分，本質上就是一種 denormalization — 不拆兩張表，而是在同一張表用欄位區分，換取查詢和維護的簡潔性。加上 `idx_product_sell_type` 索引就能確保查詢效能。

---

## 文章二：Key Aspects of Ecommerce Database Design

**作者**：ScienceSoft
**來源**：[ScienceSoft](https://www.scnsoft.com/ecommerce/ecommerce-database)

### 重點摘要

ScienceSoft 從諮詢顧問的角度，歸納了電商資料庫設計的幾個核心面向。

### 資料庫的用途

電商資料庫讓你用結構化的方式管理：
- **庫存追蹤** — 即時掌握商品數量
- **商品目錄更新** — SKU、價格、描述、圖片
- **交易管理** — 訂單、付款、退款

### 商品目錄設計：EAV 模型

這篇最有價值的觀點是關於 **EAV（Entity-Attribute-Value）模型**：

**問題**：如果你賣很多種類的商品，每種商品的屬性差異很大（例如衣服有尺寸/顏色，電器有瓦數/電壓），把所有屬性都放在同一張表會導致大量 NULL。

**傳統做法（單一表）：**
```
product_id | name | color | size | wattage | voltage | ...
1          | T恤  | 紅色  | M    | NULL    | NULL    | ...
2          | 電扇 | NULL  | NULL | 60W     | 110V    | ...
```
→ 很多 NULL 欄位，每新增一種商品類型就要 ALTER TABLE

**EAV 模型：**
```
-- 表 1：product（實體）
product_id | name

-- 表 2：attribute（屬性定義）
attribute_id | attribute_name
1            | color
2            | size
3            | wattage

-- 表 3：product_attribute_value（值）
product_id | attribute_id | value
1          | 1            | 紅色
1          | 2            | M
2          | 3            | 60W
```
→ 不管有幾種屬性都不用改 schema，動態擴展

**EAV 的缺點**：
- 查詢變複雜（要 JOIN 或 pivot）
- 無法對 value 做型別約束（全部是 VARCHAR）
- 效能比固定欄位差

### 訂單管理的雙表結構

訂單通常拆成兩張表：
1. **Orders 表**：訂單整體資訊（日期、總金額、客戶 ID）
2. **OrderItems 表**：訂單裡的每個商品（產品 ID、單價、數量）

這跟我們系統的 `order` + `registration`（報名明細）是同樣的概念。

### 跟我們的關係

我們的商品屬性差異不大（設備和品牌商品共用大部分欄位），所以不需要 EAV 模型。用 `sell_type` 欄位區分 + 部分欄位 NULL（設備不需要 `display_start_at`，品牌商品不需要 `deposit`）是更簡單實際的做法。

但如果未來品牌商品需要大量自訂屬性（例如食物的過敏原標示、手工藝品的材質說明），可以考慮把這些動態屬性塞進 `specifications` JSON 欄位（我們已經有這個欄位了），本質上就是簡化版的 EAV。

---

## 文章三：How to Design a Relational DB for E-commerce

**作者**：GeeksforGeeks
**來源**：[GeeksforGeeks](https://www.geeksforgeeks.org/dbms/how-to-design-a-relational-database-for-e-commerce-website/)

### 重點摘要

這篇是入門級教學，列出電商系統的基本表結構和關聯。

### 核心表結構

```sql
CREATE TABLE Product (
    P_ID INT PRIMARY KEY,
    Name VARCHAR(255),
    Price DECIMAL(10, 2),
    Description TEXT
);

CREATE TABLE Customer (
    User_ID INT PRIMARY KEY,
    Name VARCHAR(255),
    Email VARCHAR(255),
    Password VARCHAR(255)
);

CREATE TABLE Orders (
    Order_ID INT PRIMARY KEY,
    Order_Amount DECIMAL(10, 2),
    Order_Date DATE
);

CREATE TABLE Cart (
    Cart_ID INT PRIMARY KEY,
    User_ID INT,
    FOREIGN KEY (User_ID) REFERENCES Customer(User_ID)
);

CREATE TABLE Category (
    C_ID INT PRIMARY KEY,
    Name VARCHAR(255),
    Picture VARCHAR(255),
    Description TEXT
);

CREATE TABLE Payment (
    Payment_ID INT PRIMARY KEY,
    Type VARCHAR(50),     -- UPI, credit card, debit card
    Amount DECIMAL(10, 2)
);
```

### 表之間的關聯

| 關聯 | 類型 | 說明 |
|------|------|------|
| Customer → Order | 一對多 | 一個用戶可以下多筆訂單 |
| Product ↔ Cart | 多對多 | 商品可以出現在多個購物車，購物車可以有多個商品 |
| Customer → Payment | 一對多 | 一個用戶有多筆付款紀錄 |
| Order → Product | 一對多 | 一筆訂單包含多個商品 |
| Order → Payment | 一對一 | 一筆訂單對應一筆付款 |
| Product → Category | 多對一 | 多個商品屬於同一分類 |

### 設計原則

| 原則 | 說明 |
|------|------|
| Normalization | 減少冗餘，確保資料完整性 |
| Indexing | 對常查詢的欄位加索引 |
| 資料型別 | 選對型別（VARCHAR, DECIMAL, DATE）優化儲存 |
| 參照完整性 | 用外鍵約束維護表之間的一致性 |
| 安全性 | SSL 加密、認證授權、敏感資料加密 |

### 跟我們的關係

這篇的架構很基礎，但驗證了我們系統的基本結構方向是正確的。我們的 product 表比這篇更複雜（多了 `sell_type`、`event_id`、`provider_company_id` 等），因為我們是 **活動電商** 而非傳統電商，商品跟活動和攤位綁定。

---

## 文章四：Marketplace Data Model

**作者**：DataModelPack
**來源**：[DataModelPack](https://datamodelpack.com/data-models/marketplace-data-model.html)

### 重點摘要

這是一個商業產品（付費 schema 套件），提供完整的 marketplace 資料模型。它把 schema 拆成 9 個領域，總計 74 個實體（表），適合多攤商平台。

### 9 大領域

| 領域 | 實體數 | 涵蓋內容 |
|------|--------|---------|
| **Customer** | 7 | 用戶帳號、地址、聯繫方式 |
| **Store** | 10 | 多店面設定、店家資訊、營業時間 |
| **Item** | 8 | 商品/服務目錄、屬性、變體 |
| **Inventory and Stock** | 4 | 即時庫存管理、倉庫 |
| **Price and Discount** | 5 | 定價策略、折扣規則、促銷 |
| **Order** | 13 | 訂單處理、運送、退貨 |
| **Document** | 16 | 文件記錄、發票、報表 |
| **Payment and Invoice** | 4 | 金流、發票、對帳 |
| **Employee and Role** | 7 | 權限控制、角色管理 |

### 核心功能

- **即時庫存管理**：追蹤每個商品在每個倉庫/店面的數量
- **價格與折扣設定**：支援多種定價策略（依數量、依會員等級）
- **自動稅務計算**：根據地區自動計算稅額
- **多銷售渠道**：同一個商品可以在多個店面上架
- **訂單與客戶追蹤**：完整的訂單生命週期管理

### 跟我們的關係

這個模型比我們需要的複雜很多（74 張表 vs 我們整個系統 38 張），但它的 **Store（店面）** 概念跟我們的 **booth（攤位）** 很像 — 每個 vendor 有自己的「店面」，在上面展示和販售商品。

它的 **Item** 領域把商品和 store 做多對多關聯（一個商品可以在多個 store 上架），我們簡化成 product 直接綁 `event_id` + `booth_booking_id`，因為我們的商品不會跨活動上架。

---

## 文章五：Multi-Vendor E-Commerce Marketplace Development

**作者**：Aalpha
**來源**：[Aalpha](https://www.aalpha.net/blog/how-to-develop-a-multi-vendor-ecommerce-marketplace/)

### 重點摘要

Aalpha 從開發公司的角度，介紹多攤商電商平台的架構設計和開發要點。

### 多攤商平台 vs 單一賣家平台

| | 單一賣家 | 多攤商 (Multi-Vendor) |
|---|---|---|
| 商品來源 | 平台自己的商品 | 多個攤商各自上架 |
| 庫存管理 | 集中管理 | 每個攤商管理自己的 |
| 金流 | 直接收款 | 分潤、佣金、結算 |
| 複雜度 | 低 | 高（需要多租戶架構） |

### 架構建議

**API-first 設計**：
- 所有功能都透過 API 暴露，前後端分離
- 模組化微服務：商品目錄、用戶帳號、交易、搜尋、分析各自獨立

**資料模型重點**：
- 商品目錄要支援**多個賣家上架相同/不同的 SKU**
- 每個 listing 綁定攤商特有的屬性：價格、庫存、變體、運費規則
- 文章強調：「資料模型是 marketplace 的經濟骨架，如果這層設計錯了，再多的 UI 打磨或 API 優化都救不回來」

**攤商管理功能**：
- 攤商入駐審核
- 佣金邏輯與結算
- 商品目錄審核（平台方可以審核攤商上架的商品）
- 分潤付款（split payment）
- 多地點出貨

**技術堆疊參考**：
- Next.js + Node.js + PostgreSQL
- React + Django + Redis
- 推薦 Headless 架構（前後端完全分離）

### 跟我們的關係

我們的系統本質上就是一個 **multi-vendor marketplace**：
- vendor（品牌商）= 攤商
- booth_booking = 攤位租賃（入駐審核）
- product (sell_type=vendor_goods) = 攤商上架的商品

但我們目前**不處理金流和物流**（Issue #308 明確說只做展示），所以比完整的 multi-vendor 平台簡單很多。Aalpha 提到的佣金結算、分潤付款、多地點出貨等功能，都是未來如果要做線上購買時才需要考慮的。

---

## 五篇文章的綜合比較

| 文章 | 適合階段 | 核心觀點 | 跟我們的關聯度 |
|------|---------|---------|--------------|
| Medium (Giri) | 設計初期 | normalization/denormalization 的取捨、indexing 策略 | 高 — sell_type 本質上是 denormalization |
| ScienceSoft | 設計初期 | EAV 模型處理多種商品屬性 | 中 — 我們可以用 specifications JSON 替代 |
| GeeksforGeeks | 入門學習 | 基礎表結構和關聯 | 低 — 太基礎，但驗證基本方向正確 |
| DataModelPack | 複雜系統 | 完整的 74 表 marketplace schema | 低 — 規模太大，但 Store/Item 概念有參考價值 |
| Aalpha | 架構決策 | multi-vendor 平台的架構和功能需求 | 高 — 驗證我們是 multi-vendor 模式 |

### 對 Issue #308 的設計啟發

1. **用 `sell_type` 區分是合理的 denormalization** — 不拆表，加欄位區分，是業界常見做法
2. **`specifications` JSON 可以當簡化版 EAV** — 未來品牌商品如果需要自訂屬性，不用改 schema
3. **商品綁 booth_booking_id 是正確的** — 等同 marketplace 裡「商品綁店面」的概念
4. **目前只做展示是明智的** — 金流/物流是另一個數量級的複雜度，先展示再迭代
