# Base Struct 與 Struct Embedding

## Base 不是 Go 語言自動的，是專案自己定義的

`Base` 是在 `backend-go/internal/models/base.go` 裡面手寫的一個 struct：

```go
type Base struct {
    ID        string         `gorm:"type:varchar(36);primaryKey;column:id" json:"id"`
    CreatedAt time.Time      `gorm:"not null;column:created_at" json:"created_at"`
    UpdatedAt time.Time      `gorm:"not null;column:updated_at" json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"deleted_at,omitempty"`
}
```

## Go 的 Struct Embedding（結構體嵌入）

Go 語言本身沒有「繼承」，但有 **struct embedding**（結構體嵌入）。當你寫：

```go
type TicketCategory struct {
    Base          // ← 嵌入 Base
    Name string
    ...
}
```

就等同於把 `Base` 的 `ID`, `CreatedAt`, `UpdatedAt`, `DeletedAt` 全部「展開」放進 `TicketCategory` 裡。

## GORM 自動管理時間欄位

GORM（ORM 框架）會自動：
- `CreatedAt` → 建立時自動填入時間
- `UpdatedAt` → 每次更新自動刷新時間
- `DeletedAt` → 呼叫 `Delete()` 時自動填入時間（軟刪除）

## 分工整理

| 誰負責 | 做什麼 |
|--------|--------|
| **Go 語言** | 提供 struct embedding 語法 |
| **專案的 `Base`** | 定義共用欄位（ID, CreatedAt, UpdatedAt, DeletedAt） |
| **GORM** | 自動管理 CreatedAt / UpdatedAt / DeletedAt 的值 |

## 實際範例：`models/ticket_category.go`

```go
package models

import "gorm.io/gorm"

// TicketCategory 票券分類資料表
// 每個活動可以有多個票券分類（如「入場券」「體驗券」）
type TicketCategory struct {
    Base  // ← 嵌入 Base，自動擁有 ID, CreatedAt, UpdatedAt, DeletedAt

    EventID     string  `gorm:"type:varchar(36);not null;index:idx_ticket_category_event;comment:活動 ID" json:"event_id"`
    Name        string  `gorm:"type:varchar(100);not null;comment:分類名稱" json:"name"`
    Description *string `gorm:"type:text;comment:分類描述" json:"description,omitempty"`
    SortOrder   int     `gorm:"column:sort_order;default:0;comment:排序順序" json:"sort_order"`

    // 關聯
    Event   *Event   `gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE" json:"event,omitempty"`
    Tickets []Ticket `gorm:"foreignKey:CategoryID" json:"tickets,omitempty"`
}

// TableName 指定資料表名稱
func (TicketCategory) TableName() string {
    return "ticket_category"
}

// BeforeCreate GORM Hook - 建立前自動生成 UUID
func (tc *TicketCategory) BeforeCreate(tx *gorm.DB) error {
    return tc.Base.BeforeCreate(tx)
}
```

### 這個 model 對應到的資料庫欄位

| 欄位 | 來源 | 說明 |
|------|------|------|
| `id` | `Base` | UUID 主鍵，BeforeCreate 自動產生 |
| `created_at` | `Base` | GORM 建立時自動填入 |
| `updated_at` | `Base` | GORM 更新時自動刷新 |
| `deleted_at` | `Base` | GORM Delete() 時填入（軟刪除） |
| `event_id` | `TicketCategory` | 外鍵，指向 event 表 |
| `name` | `TicketCategory` | 分類名稱 |
| `description` | `TicketCategory` | 分類描述（可為 null） |
| `sort_order` | `TicketCategory` | 排序順序 |

### 關聯欄位不會變成資料庫欄位

```go
Event   *Event   `gorm:"foreignKey:EventID;constraint:OnDelete:CASCADE"`
Tickets []Ticket `gorm:"foreignKey:CategoryID"`
```

這兩行是告訴 GORM「關聯怎麼查」，不會在 `ticket_category` 表新增欄位。
- `Event` → 透過 `EventID` 去 join `event` 表
- `Tickets` → 透過 `ticket.category_id` 反查屬於此分類的票券

## 另一個範例：沒有軟刪除的 Base

如果某些表不需要軟刪除，用 `BaseWithoutSoftDelete`：

```go
type BaseWithoutSoftDelete struct {
    ID        string    `gorm:"type:varchar(36);primaryKey;column:id" json:"id"`
    CreatedAt time.Time `gorm:"not null;column:created_at" json:"created_at"`
    UpdatedAt time.Time `gorm:"not null;column:updated_at" json:"updated_at"`
    // 沒有 DeletedAt → 呼叫 Delete() 會真的刪除 row
}
```
