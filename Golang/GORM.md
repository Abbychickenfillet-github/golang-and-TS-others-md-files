# GORM 是什麼？

> 建立日期: 2026-01-20

---

## 一句話解釋

**GORM = Go 語言的 ORM 框架，讓你用 Go 程式碼操作資料庫，不用寫 SQL。**

---

## ORM 是什麼？

ORM = **O**bject **R**elational **M**apping（物件關聯映射）

```
┌─────────────────┐         ┌─────────────────┐
│   Go 程式碼      │   ORM   │    資料庫        │
│                 │  ═══▶   │                 │
│   User{         │  轉換    │  SELECT * FROM  │
│     Name: "小明" │         │  user WHERE     │
│   }             │         │  name = '小明'   │
└─────────────────┘         └─────────────────┘
```

### 沒有 ORM vs 有 ORM

```go
// ❌ 沒有 ORM - 要自己寫 SQL
db.Query("SELECT id, name, email FROM users WHERE id = ?", 1)
// 然後要手動把結果轉成 Go struct...很麻煩

// ✅ 有 GORM - 直接用 Go 語法
var user User
db.First(&user, 1)  // 自動轉換，user 變數直接可用
```

---

## GORM 基本用法

### 1. 定義 Model（對應資料表）

```go
// 這個 struct 對應資料庫的 users 表
type User struct {
    ID        uint      `gorm:"primaryKey"`
    Name      string    `gorm:"type:varchar(100)"`
    Email     string    `gorm:"uniqueIndex"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`  // 軟刪除
}

// 指定表名（如果不想用預設的 "users"）
func (User) TableName() string {
    return "user"
}
```

### 2. CRUD 操作

```go
// Create 新增
user := User{Name: "小明", Email: "ming@example.com"}
db.Create(&user)
// SQL: INSERT INTO user (name, email, created_at, updated_at) VALUES ('小明', 'ming@example.com', ...)

// Read 查詢
var user User
db.First(&user, 1)                          // 找 ID=1 的
db.Where("name = ?", "小明").First(&user)   // 找 name='小明' 的
// SQL: SELECT * FROM user WHERE id = 1 LIMIT 1

// Update 更新
db.Model(&user).Update("name", "小華")
// SQL: UPDATE user SET name = '小華', updated_at = ... WHERE id = 1

// Delete 刪除
db.Delete(&user)
// SQL: UPDATE user SET deleted_at = ... WHERE id = 1  (軟刪除)
```

### 3. 查詢語法

```go
// 條件查詢
db.Where("age > ?", 18).Find(&users)

// 多條件
db.Where("age > ? AND name LIKE ?", 18, "%明%").Find(&users)

// 排序
db.Order("created_at DESC").Find(&users)

// 分頁
db.Offset(10).Limit(10).Find(&users)  // 跳過前 10 筆，取 10 筆

// 只取特定欄位
db.Select("name", "email").Find(&users)

// 計數
var count int64
db.Model(&User{}).Count(&count)
```

---

## GORM Tag 說明

在 struct 欄位後面的 `` `gorm:"..."` `` 叫做 tag，用來設定欄位行為：

```go
type User struct {
    ID       string  `gorm:"type:varchar(36);primaryKey;column:id"`
    //                      │                │            │
    //                      │                │            └── 資料庫欄位名
    //                      │                └── 設為主鍵
    //                      └── 資料庫類型

    Email    string  `gorm:"uniqueIndex;not null"`
    //                      │           │
    //                      │           └── 不可為 NULL
    //                      └── 唯一索引

    Age      int     `gorm:"default:18"`
    //                      └── 預設值

    Password string  `gorm:"-"`
    //                     └── 忽略這個欄位，不存入資料庫
}
```

### 常用 Tag 對照表

| Tag | 說明 | 範例 |
|-----|------|------|
| `column` | 指定欄位名 | `gorm:"column:user_name"` |
| `type` | 指定資料庫類型 | `gorm:"type:varchar(255)"` |
| `primaryKey` | 設為主鍵 | `gorm:"primaryKey"` |
| `uniqueIndex` | 唯一索引 | `gorm:"uniqueIndex"` |
| `index` | 一般索引 | `gorm:"index"` |
| `not null` | 不可為空 | `gorm:"not null"` |
| `default` | 預設值 | `gorm:"default:0"` |
| `-` | 忽略欄位 | `gorm:"-"` |

---

## AutoMigrate 自動遷移

GORM 可以根據 Model 自動建立/修改資料表結構：

```go
// 自動建立表、加欄位、加索引
db.AutoMigrate(&User{}, &Product{}, &Order{})
```

### AutoMigrate 會做什麼？

| 情況 | AutoMigrate 行為 |
|------|-----------------|
| 表不存在 | ✅ 建立新表 |
| 表存在但少欄位 | ✅ 新增欄位 |
| 表存在但欄位類型不同 | ⚠️ 嘗試修改（可能失敗）|
| 表有多餘欄位 | ❌ 不會刪除 |
| 欄位有外鍵約束 | ❌ 可能失敗 |

### 為什麼我們要禁用 AutoMigrate？

```yaml
# docker-compose.yml
environment:
  - AUTO_MIGRATE_ENABLED=false
```

原因：
1. **外鍵約束** - 資料庫有 `fk_user_role` 外鍵，AutoMigrate 無法修改被約束的欄位
2. **生產環境風險** - 自動修改表結構可能造成資料遺失
3. **版本控制** - 用手動 migration 更好追蹤變更歷史

---

## 軟刪除 (Soft Delete)

### 這是 GORM 標配還是我們專案寫的？

**兩者都是：**
1. **GORM 提供** `gorm.DeletedAt` 類型（標準功能）
2. **我們專案選擇使用它**，定義在 `Base` model 中

```
┌─────────────────────────────────────────────────────────────┐
│                      GORM 標準庫                             │
│                                                             │
│   提供 gorm.DeletedAt 類型                                   │
│   （你選擇用不用）                                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    我們專案的選擇                             │
│                                                             │
│   Base (有軟刪除)              BaseWithoutSoftDelete         │
│   ├── User                     └── Role                     │
│   ├── Member                                                │
│   ├── Company                                               │
│   ├── Event                                                 │
│   ├── Booth                                                 │
│   ├── Order                                                 │
│   └── ...                                                   │
└─────────────────────────────────────────────────────────────┘
```

### 相關檔案

#### 核心定義：`internal/models/base.go`

```go
// 第 12-17 行 - 有軟刪除的 Base
type Base struct {
    ID        string         `gorm:"type:varchar(36);primaryKey;column:id"`
    CreatedAt time.Time      `gorm:"not null;column:created_at"`
    UpdatedAt time.Time      `gorm:"not null;column:updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at"`  // ← 軟刪除在這裡
}

// 第 38-44 行 - 沒有軟刪除的 Base
type BaseWithoutSoftDelete struct {
    ID        string    `gorm:"type:varchar(36);primaryKey;column:id"`
    CreatedAt time.Time `gorm:"not null;column:created_at"`
    UpdatedAt time.Time `gorm:"not null;column:updated_at"`
    // 沒有 DeletedAt
}
```

#### 使用軟刪除的 Models（用 `Base`）

| 檔案 | Model |
|------|-------|
| `internal/models/user.go` | `User` |
| `internal/models/member.go` | `Member` |
| `internal/models/company.go` | `Company`, `MemberCompany` |
| `internal/models/event.go` | `Event` |
| `internal/models/booth.go` | `Booth` |
| `internal/models/ticket.go` | `Ticket` |
| `internal/models/order.go` | `Order` |
| `internal/models/guest.go` | `Guest` |
| `internal/models/event_image.go` | `EventImage` |
| `internal/models/event_booth_type.go` | `EventBoothType`, `EventBoothTypePricing` |
| `internal/models/event_coupon.go` | `EventCouponProgram`, `EventCouponClaim` |
| `internal/models/notification_log.go` | `NotificationLog` |

#### 不使用軟刪除的 Models（用 `BaseWithoutSoftDelete`）

| 檔案 | Model | 原因 |
|------|-------|------|
| `internal/models/role.go` | `Role` | 資料庫 `role` 表沒有 `deleted_at` 欄位 |

### 軟刪除如何運作

```go
type User struct {
    ID        uint
    Name      string
    DeletedAt gorm.DeletedAt `gorm:"index"`  // 軟刪除欄位
}

// 刪除時不會真的刪除，只是設定 deleted_at 時間戳
db.Delete(&user)
// SQL: UPDATE user SET deleted_at = '2026-01-20 12:00:00' WHERE id = 1

// 查詢時自動過濾已刪除的記錄
db.Find(&users)
// SQL: SELECT * FROM user WHERE deleted_at IS NULL

// 如果要查詢包含已刪除的記錄
db.Unscoped().Find(&users)
// SQL: SELECT * FROM user
```

### 我們遇到的問題

```go
// Role model 原本使用了 Base（包含 DeletedAt）
type Role struct {
    Base  // 這裡面有 DeletedAt
    Name  string
}

// 但資料庫的 role 表沒有 deleted_at 欄位
// 所以查詢時報錯：Unknown column 'role.deleted_at'
```

**解決方案：** 改用 `BaseWithoutSoftDelete`

```go
// 修正後
type Role struct {
    BaseWithoutSoftDelete  // 沒有 DeletedAt
    Name  string
}
```

### 總結

| 問題 | 答案 |
|------|------|
| 軟刪除是 GORM 標配嗎？ | ✅ 是，GORM 提供 `gorm.DeletedAt` 類型 |
| 我們專案有用嗎？ | ✅ 有，大部分 model 都透過 `Base` 使用 |
| 一定要用嗎？ | ❌ 不一定，可以選擇不用（像 `Role`）|

---

## GORM vs 原生 SQL

| 比較項目 | GORM | 原生 SQL |
|---------|------|----------|
| 學習曲線 | 需要學習 GORM 語法 | 需要熟悉 SQL |
| 開發速度 | 快（少寫很多程式碼）| 慢 |
| 可讀性 | 好（像寫 Go 程式）| 中等 |
| 效能 | 略慢（有額外轉換）| 最快 |
| 複雜查詢 | 可能需要用原生 SQL | 靈活 |
| 資料庫切換 | 容易（改連線設定）| 困難（SQL 語法不同）|

### 什麼時候用原生 SQL？

```go
// 複雜查詢還是可以用原生 SQL
var results []Result
db.Raw(`
    SELECT u.name, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
    HAVING order_count > 10
`).Scan(&results)
```

---

## 專案中的 GORM 使用

我們專案的架構：

```
Model (GORM)     →  Repository  →  Service  →  Handler
定義資料結構        資料庫操作      商業邏輯     HTTP 處理

internal/models/    internal/repository/    internal/service/    internal/handler/
  user.go             user_repository.go      user_service.go      user_handler.go
  role.go             role_repository.go      ...                  ...
```

### 範例流程

```go
// 1. Model (models/user.go)
type User struct {
    Base
    Email string `gorm:"uniqueIndex"`
}

// 2. Repository (repository/user_repository.go)
func (r *userRepository) GetByEmail(email string) (*models.User, error) {
    var user models.User
    err := r.db.Where("email = ?", email).First(&user).Error
    return &user, err
}

// 3. Service (service/user_service.go)
func (s *userService) Login(email, password string) (*User, error) {
    user, err := s.repo.GetByEmail(email)
    // 驗證密碼...
    return user, nil
}

// 4. Handler (handler/user_handler.go)
func (h *UserHandler) Login(c *gin.Context) {
    user, err := h.service.Login(email, password)
    c.JSON(200, user)
}
```

---

## Base 是什麼？b.ID 是什麼？

### Base = 所有資料表共用的「模板」

每一張資料表都有 `id`、`created_at`、`updated_at`、`deleted_at` 四個欄位。
與其每個 Model 都重複寫一次，不如抽出來放在一個共用 struct 叫 `Base`：

```go
// internal/models/base.go
type Base struct {
    ID        string         // 每筆資料的唯一識別碼（UUID）
    CreatedAt time.Time      // 這筆資料是什麼時候建立的
    UpdatedAt time.Time      // 這筆資料最後一次被更新是什麼時候
    DeletedAt gorm.DeletedAt // 軟刪除時間（有值 = 已刪除）
}
```

### 其他 Model 怎麼用 Base？

直接嵌入（embed），就自動繼承四個欄位：

```go
// internal/models/event.go
type Event struct {
    Base                    // ← 嵌入 Base，自動擁有 ID, CreatedAt, UpdatedAt, DeletedAt
    Name        string      // 活動名稱
    Description string      // 活動描述
    MemberID    string      // 主辦方 ID
}

// internal/models/user.go
type User struct {
    Base                    // ← 同樣嵌入 Base
    Email       string
    FullName    *string
}
```

等於資料庫長這樣：

```
event 表                          user 表
┌──────────────┬──────────┐      ┌──────────────┬──────────┐
│ id           │ varchar  │      │ id           │ varchar  │  ← 來自 Base
│ created_at   │ datetime │      │ created_at   │ datetime │  ← 來自 Base
│ updated_at   │ datetime │      │ updated_at   │ datetime │  ← 來自 Base
│ deleted_at   │ datetime │      │ deleted_at   │ datetime │  ← 來自 Base
│ name         │ varchar  │      │ email        │ varchar  │  ← Event 自己的
│ description  │ text     │      │ full_name    │ varchar  │  ← User 自己的
│ member_id    │ varchar  │      └──────────────┴──────────┘
└──────────────┴──────────┘
```

### b.ID 是什麼？

`b` 是函式接收器（receiver），代表「這個 Base 實例本身」：

```go
func (b *Base) BeforeCreate(_ *gorm.DB) error {
//    ↑
//    b = 這個 Base 實例
//    b.ID = 這個 Base 實例的 ID 欄位

    if b.ID == "" {          // 如果 ID 是空的
        b.ID = GenerateUUID() // 就產生一個 UUID 填進去
    }
    return nil
}
```

當你建立一個 Event 時：

```go
event := Event{Name: "展覽活動"}
db.Create(&event)
```

因為 `Event` 嵌入了 `Base`，GORM 會呼叫 `Base.BeforeCreate()`，
此時 `b` 就是這個 event 裡面的 Base 部分，`b.ID` 就是 `event.ID`。

### return nil 是什麼？等於 return null 嗎？

**是的，概念上 `nil` 就是 Go 的 `null`。**

```go
func (b *Base) BeforeCreate(_ *gorm.DB) error {
    if b.ID == "" {
        b.ID = GenerateUUID()
    }
    return nil  // ← 回傳 nil，意思是「沒有錯誤」
}
```

這個函式的回傳型別是 `error`。在 Go 裡面：

| 回傳值 | 意思 | GORM 的反應 |
|--------|------|------------|
| `return nil` | 沒有錯誤，一切正常 | 繼續執行 INSERT |
| `return errors.New("出錯了")` | 有錯誤 | **中止 INSERT**，不會寫入資料庫 |

```go
// 類比其他語言：
// Go:          return nil
// JavaScript:  return null
// Python:      return None
// Java:        return null
// TypeScript:  return null
```

為什麼一定要 `return nil`？因為 Go 要求函式宣告了回傳 `error` 就**必須回傳**，
不能像 JavaScript 那樣省略 return。

---

## CreatedAt / UpdatedAt 自動維護機制

### 為什麼我們沒寫任何程式碼，時間就自動填好了？

看我們的 `Base` struct：

```go
// internal/models/base.go
type Base struct {
    ID        string         `gorm:"type:varchar(36);primaryKey;column:id"`
    CreatedAt time.Time      `gorm:"not null;column:created_at"`     // ← 沒有寫任何 hook
    UpdatedAt time.Time      `gorm:"not null;column:updated_at"`     // ← 也沒有
    DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at"`
}
```

我們只寫了 `BeforeCreate` hook 來產生 UUID，但 **CreatedAt / UpdatedAt 完全沒有手動處理**。

### 答案：GORM 靠「欄位名稱」自動辨識

GORM 內部有一個 schema parser（結構解析器），在啟動時掃描每個 Model 的欄位名稱：

| 欄位名稱 | GORM 自動標記 | 行為 |
|----------|--------------|------|
| `CreatedAt` | `autoCreateTime` | `Create` 時自動填入 `time.Now()` |
| `UpdatedAt` | `autoUpdateTime` | `Create` 和每次 `Update` / `Save` 時自動填入 `time.Now()` |

你**不需要**寫任何 tag 或 hook，GORM 純粹靠欄位名叫 `CreatedAt` 和 `UpdatedAt` 就會觸發。

### 實際發生了什麼

```go
// 1. 建立記錄
user := User{Name: "小明", Email: "ming@example.com"}
db.Create(&user)
// GORM 內部自動做了：
//   user.CreatedAt = time.Now()  ← 自動
//   user.UpdatedAt = time.Now()  ← 自動
//   user.ID = GenerateUUID()     ← 我們寫的 BeforeCreate hook
// SQL: INSERT INTO user (id, name, email, created_at, updated_at)
//      VALUES ('uuid...', '小明', 'ming@example.com', '2026-02-25 10:00:00', '2026-02-25 10:00:00')

// 2. 更新記錄
db.Model(&user).Update("name", "小華")
// GORM 內部自動做了：
//   updated_at = time.Now()  ← 每次 update 都會重新設定
// SQL: UPDATE user SET name = '小華', updated_at = '2026-02-25 11:30:00' WHERE id = 'uuid...'

// 3. 用 Save 更新（整筆覆寫）
user.Name = "小華"
db.Save(&user)
// SQL: UPDATE user SET name = '小華', email = 'ming@example.com',
//      updated_at = '2026-02-25 11:30:00' WHERE id = 'uuid...'
//      ↑ updated_at 自動更新，created_at 不動
```

### 自動 vs 手動 的差異

```
我們專案的 Base struct 自動維護機制：

┌──────────────┬────────────────────────────┬──────────────────┐
│    欄位       │      誰負責                 │     怎麼觸發      │
├──────────────┼────────────────────────────┼──────────────────┤
│ ID           │ 我們寫的 BeforeCreate hook  │ 手動（base.go）   │
│ CreatedAt    │ GORM 內建自動辨識           │ 自動（靠欄位名稱） │
│ UpdatedAt    │ GORM 內建自動辨識           │ 自動（靠欄位名稱） │
│ DeletedAt    │ GORM 內建軟刪除機制         │ 自動（靠型別）     │
└──────────────┴────────────────────────────┴──────────────────┘
```

### 如果欄位不叫 CreatedAt 會怎樣？

如果欄位取名叫別的（例如 `InsertedAt`），GORM 就**不會自動維護**，你需要手動加 tag：

```go
// ❌ 欄位名不對，GORM 不會自動維護
type Bad struct {
    InsertedAt time.Time  // GORM 不認識這個名字，不會自動填
}

// ✅ 加 tag 手動指定
type Good struct {
    InsertedAt time.Time `gorm:"autoCreateTime"`  // 手動告訴 GORM：這是建立時間
    ModifiedAt time.Time `gorm:"autoUpdateTime"`  // 手動告訴 GORM：這是更新時間
}
```

### 能不能阻止自動更新？

有時候你想更新某些欄位但**不想**動 `updated_at`，可以用 `UpdateColumn`：

```go
// 正常更新 — updated_at 會自動更新
db.Model(&user).Update("name", "小華")
// SQL: UPDATE user SET name = '小華', updated_at = '...' WHERE id = '...'

// 跳過自動更新 — updated_at 不動
db.Model(&user).UpdateColumn("name", "小華")
// SQL: UPDATE user SET name = '小華' WHERE id = '...'
//      ↑ 沒有 updated_at
```

| 方法 | updated_at 自動更新 | 觸發 Hook |
|------|---------------------|----------|
| `Update()` | ✅ 會 | ✅ 會 |
| `Updates()` | ✅ 會 | ✅ 會 |
| `Save()` | ✅ 會 | ✅ 會 |
| `UpdateColumn()` | ❌ 不會 | ❌ 不會 |
| `UpdateColumns()` | ❌ 不會 | ❌ 不會 |

---

## 延伸閱讀

- [GORM 官方文件](https://gorm.io/docs/)
- [GORM GitHub](https://github.com/go-gorm/gorm)
