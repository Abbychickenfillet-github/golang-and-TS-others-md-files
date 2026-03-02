# Go 貨幣儲存：decimal(12,2) vs int64 vs string vs float64

> 核心問題：TWD 沒有小數，適合用 `decimal(12,2)` 嗎？用 `int64` 會不會比較好？Model 寫死 `int64` 以後就不能用小數了？乾脆都存 `string` 最安全？

> 相關筆記：[後端 DTO 角色與三層架構](../Golang/後端DTO角色與三層架構.md) — Model vs DTO 的型別差異

---

## 結論（先講答案）

| 層級 | 建議做法 | 我們專案目前的做法 |
|------|----------|-------------------|
| **MySQL 欄位** | `DECIMAL(12,2)` | ✅ 已經是 `decimal(12,2)` |
| **Go Model** | `decimal.Decimal`（shopspring） | ✅ 大部分已經是 |
| **Go DTO（輸入）** | `*string` | ✅ 已經是 |
| **Go DTO（輸出）** | `string` | ✅ 已經是 |
| **Service 層** | `decimal.NewFromString()` 轉換 | ✅ 已經有 |

**我們的做法已經是業界最佳實踐，不需要改。**

---

## 問題一：TWD 沒有小數，為什麼還用 `decimal(12,2)`？

### 答案：可以用，而且應該用

`decimal(12,2)` 的 `2` 代表**最多允許** 2 位小數，不代表**強制要有**小數：

```sql
-- TWD 存 100 元
INSERT INTO order_item (price) VALUES (100.00);  -- 小數就是 .00，完全合法

-- USD 存 $99.99
INSERT INTO order_item (price) VALUES (99.99);   -- 也合法
```

### 我們的 Service 層已經有防護

```go
// booth_product_service.go (line 93-104) — 已存在的程式碼
if currency == "TWD" && !p.Equal(p.Truncate(0)) {
    return nil, errors.New("TWD 幣別的價格不允許小數")
}
```

所以架構是：
```
DB 層：decimal(12,2) — 統一格式，允許小數
Service 層：if TWD → 不允許小數 — 業務規則控制
```

**DB 管「能不能存」，Service 管「該不該存」。** 這是正確的分層。

### 如果只支援 TWD，為什麼不用 `decimal(12,0)`？

因為未來可能支援其他幣別：

| 幣別 | 最小單位 | 小數位數 | `decimal(12,0)` 能存？ | `decimal(12,2)` 能存？ |
|------|---------|---------|----------------------|----------------------|
| TWD 台幣 | 1 元 | 0 | ✅ | ✅ |
| JPY 日圓 | 1 円 | 0 | ✅ | ✅ |
| USD 美元 | 1 cent | 2 | ❌ 會丟失精度 | ✅ |
| EUR 歐元 | 1 cent | 2 | ❌ 會丟失精度 | ✅ |
| KWD 科威特幣 | 1 fils | 3 | ❌ | ❌（需要 `decimal(12,3)`） |

用 `decimal(12,2)` 可以涵蓋世界上**大部分貨幣**，且 TWD 存進去就是 `.00` 結尾，不影響任何事。

---

## 問題二：為什麼不用 `int64`？

### int64 的優點

```go
// 存 NT$100 → 存 10000（乘以 100）
var priceTWD int64 = 10000

// 存 $99.99 → 存 9999（乘以 100）
var priceUSD int64 = 9999

// 顯示時再除回來
fmt.Printf("$%.2f", float64(priceUSD)/100.0)  // $99.99
```

- 效能最高（整數運算）
- 不會有精度問題
- 很多大公司（Stripe、Square）用這個做法

### int64 的缺點（對我們的專案）

1. **Model 寫死 int64 就不能用小數了**
   ```go
   // 如果 Model 是 int64
   Price int64 `gorm:"type:bigint"`

   // 以後要支援 USD → 所有欄位都要改型別 + 所有程式碼都要改
   // 而且要決定「乘以多少」：USD 乘 100、KWD 乘 1000？
   ```

2. **不同幣別的倍數不同**
   - TWD：乘以 1（沒有小數）
   - USD：乘以 100（2 位小數）
   - KWD：乘以 1000（3 位小數）
   - 每新增一種幣別就要加一套轉換邏輯

3. **DB 無法直接做 SQL 聚合**
   ```sql
   -- decimal(12,2) → 直接 SUM
   SELECT SUM(price) FROM order_item WHERE event_id = 'xxx';
   -- 結果：10500.00 ✅ 可讀

   -- int64 → SUM 出來是分
   SELECT SUM(price) FROM order_item WHERE event_id = 'xxx';
   -- 結果：1050000 ← 這是什麼？要除以多少？看幣別？😵
   ```

4. **我們已經用了 `decimal.Decimal`，改 int64 是倒退**

### 結論：int64 適合「從零開始 + 單一幣別」，不適合我們

---

## 問題三：為什麼不全部存 `string`？

### string 在 DTO 層 = ✅ 好做法（我們已經這樣做）

```go
// DTO — 前端傳進來 / 回傳給前端 → 用 string
type BoothProductPublic struct {
    Price string `json:"price"`  // "100.00"
}
```

好處：
- 避免 JSON 序列化的浮點數精度問題（`99.99` 不會變成 `99.98999999`）
- 前端收到字串可以直接顯示

### string 在 Model/DB 層 = ❌ 不好

```go
// 如果 Model 也用 string
Price string `gorm:"type:varchar(20)"`  // ← 不好
```

問題：
```sql
-- varchar 無法正確排序
SELECT * FROM order_item ORDER BY price ASC;
-- "100.00" < "99.99" ← 因為字串比較 "1" < "9"，排序錯誤！

-- varchar 無法做數學運算
SELECT SUM(price) FROM order_item;
-- 錯誤！不能 SUM 字串

-- varchar 沒有格式驗證
INSERT INTO order_item (price) VALUES ('abc');
-- 成功存入！DB 不會擋 ← 危險
```

### 什麼時候會需要 SUM / 排序？

在我們專案中，以下場景會直接在 DB 層操作金額：

```sql
-- 1. 報表：「這場活動的總營業額」
SELECT SUM(total_amount) FROM `order`
WHERE event_id = 'xxx' AND payment_status = 'paid';
-- decimal → 385000.00 ✅
-- string  → 報錯 ❌

-- 2. Dashboard 排序：「金額最高的訂單排前面」
SELECT * FROM `order` ORDER BY total_amount DESC;
-- decimal → 100000 > 9999 ✅
-- string  → "9999" > "100000"（"9" > "1" 字串比較）❌

-- 3. 篩選：「退款金額超過 5000 的訂單」
SELECT * FROM `order` WHERE refund_amount > 5000;
-- decimal → 正確比大小 ✅
-- string  → "500" > "5000"（字串比較）❌
```

即使你現在不在 DB 層做這些，未來有人寫 SQL 查詢（debug、報表、DBA 維護）時就會踩坑。
`decimal(12,2)` 是「不用多想就不會出錯」的選擇。

### 正確做法：DTO 用 string，Model 用 decimal.Decimal

```
前端 JSON ──string──→ DTO ──string──→ Service ──decimal.Decimal──→ Model ──decimal(12,2)──→ MySQL
前端 JSON ←─string──── DTO ←─string──── Service ←─decimal.Decimal──── Model ←─decimal(12,2)──── MySQL
```

Service 層負責轉換：
```go
// 輸入：string → decimal.Decimal
price, err := decimal.NewFromString(*req.Price)  // "100.50" → decimal

// 輸出：decimal.Decimal → string
public.Price = product.Price.String()  // decimal → "100.50"
```

---

## 問題四：float64 為什麼不行？

```go
var a float64 = 0.1
var b float64 = 0.2
fmt.Println(a + b)         // 0.30000000000000004 ← 不是 0.3！
fmt.Println(a + b == 0.3)  // false 😱
```

浮點數用二進制儲存，某些十進制小數**無法精確表示**。對貨幣來說這是致命的：

```
顧客付了 $100.10
系統算出 $100.09999999999999
少了 $0.00000000000001
一百萬筆交易累積下來 → 帳對不上
```

### 我們的專案有 3 個 Model 還在用 float64（需要修正）

| Model | 欄位 | 目前型別 | 應改為 |
|-------|------|---------|--------|
| `booth.go` | `OverrideBoothPrice` | `float64` | `decimal.Decimal` |
| `event_booth_type.go` | `DefaultPrice`, `Price` | `float64` | `decimal.Decimal` |
| `booth_booking.go` | `DepositAmount` | `float64` | `decimal.Decimal` |

---

## 四種做法完整比較

| | `decimal.Decimal` + `decimal(12,2)` | `int64` | `string` | `float64` |
|---|---|---|---|---|
| **精度** | ✅ 完美 | ✅ 完美 | ✅ 完美 | ❌ 有誤差 |
| **多幣別支援** | ✅ 直接支援 | ⚠️ 每種幣別要不同倍數 | ❌ 無法計算 | ❌ 有誤差 |
| **SQL SUM/AVG** | ✅ 直接用 | ⚠️ 要除以倍數 | ❌ 不能用 | ⚠️ 有誤差 |
| **SQL 排序** | ✅ 正確 | ✅ 正確 | ❌ 字串排序錯誤 | ✅ 正確 |
| **格式驗證** | ✅ DB 驗證 | ✅ 型別驗證 | ❌ 可存任意字串 | ✅ 型別驗證 |
| **效能** | 中 | 最高 | 低 | 高 |
| **改幣別彈性** | ✅ 高 | ❌ 低 | ✅ 高 | ❌ 不適用 |
| **業界推薦** | ✅ 金融/電商 | ✅ 支付平台 | ❌ 不推薦 | ❌ 禁止 |

---

## 我們專案的最佳實踐（已實作）

```
┌─────────────────────────────────────────────────────┐
│  前端 (React)                                        │
│  price: "100.00" ← 字串顯示，不做數學運算              │
└──────────────────────┬──────────────────────────────┘
                       │ JSON: {"price": "100.00"}
                       ↓
┌─────────────────────────────────────────────────────┐
│  DTO (輸入)          │  DTO (輸出)                    │
│  Price *string       │  Price string                  │
│  "100.00"            │  "100.00"                      │
└──────────┬───────────┴──────────────────────────────┘
           │ decimal.NewFromString()        .String()
           ↓                                  ↑
┌─────────────────────────────────────────────────────┐
│  Service 層                                          │
│  price decimal.Decimal                               │
│  → TWD 驗證：不允許小數                                │
│  → 計算：decimal 加減乘除，無精度問題                    │
└──────────┬──────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────┐
│  Model (GORM)                                        │
│  Price decimal.Decimal `gorm:"type:decimal(12,2)"`   │
└──────────┬──────────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────┐
│  MySQL                                               │
│  price DECIMAL(12,2) NOT NULL DEFAULT 0.00           │
│  → 100.00 (TWD)                                      │
│  → 99.99 (USD)                                       │
│  → 可 SUM, AVG, ORDER BY ✅                           │
└─────────────────────────────────────────────────────┘
```

---

## 參考資料

- [shopspring/decimal](https://github.com/shopspring/decimal) — 我們使用的 Go Decimal 套件
- [bojanz/currency](https://github.com/bojanz/currency) — 另一個支援多幣別的 Go 套件
- [Developing price and currency handling for Go](https://bojanz.github.io/price-currency-handling-go/) — 為什麼 int64 不適合多幣別
- [The Correct Approach to Store and Calculate Monetary Data in Go](https://medium.com/@geisonfgfg/the-correct-approach-to-store-and-calculate-monetary-data-in-go-add1c73461e1)
- [Handling Currency In Golang](https://dev.to/tentanganak/handling-currency-in-golang-and-other-programming-language-518h)
- [Go Forum: Proper equivalent to Decimal for money](https://forum.golangbridge.org/t/what-is-the-proper-golang-equivalent-to-decimal-when-dealing-with-money/413)

---

## 一句話總結

| 問題 | 答案 |
|------|------|
| TWD 能用 `decimal(12,2)` 嗎？ | ✅ 可以，小數位存 `.00`，Service 層驗證不允許小數輸入 |
| 用 `int64` 好嗎？ | ⚠️ 單一幣別可以，但 Model 寫死後無法支援小數幣別 |
| 全部存 `string` 好嗎？ | ❌ DB 層不行（無法排序/計算），DTO 層可以且應該用 string |
| `float64` 呢？ | ❌ 絕對不行，貨幣精度會出錯 |
| 最佳做法？ | DB 用 `decimal(12,2)` + Model 用 `decimal.Decimal` + DTO 用 `string` |
