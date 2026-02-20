# Go 語法筆記

## Method Receiver（方法接收者）

```go
func (s *EventCouponService) ClaimCoupon(...) {
//    s  → receiver 變數名，代表這個 struct 自己（類似其他語言的 this/self）
//    *  → pointer，表示傳的是記憶體位置（不是複製一份）
//    EventCouponService → struct 型別
    s.memberRepo  // 存取自己身上的屬性
}
```

### 重點
- `s` 是 `*EventCouponService` 的實例，既是 struct 也是 service（struct 在業務上扮演 service）
- `*T` = pointer to T（指向 T 的指標），修改 s 的屬性會影響原本的資料
- `T`（不加 `*`）= value receiver，會複製一份，修改不影響原本的

### Receiver 命名慣例
| 名稱 | 通常代表 |
|------|---------|
| `s`  | service |
| `r`  | repository |
| `h`  | handler |
| `c`  | controller / client |

> Go 沒有 class，所有方法都透過 struct + receiver 實現

## Pointer 與傳值

### 基本概念
```go
// value（複製一份）
func doSomething(user User) {
    user.Name = "changed"  // ❌ 只改副本，外面不受影響
}

// pointer（傳記憶體位置）
func doSomething(user *User) {
    user.Name = "changed"  // ✅ 改到原本的
}
```

### `&` 和 `*` 的差別 — 方向相反的一對
```
& = 取得記憶體位置（把房子的地址寫在紙上）
* = 宣告/使用記憶體位置（拿著紙上的地址去找到那間房子）
```

```go
user := User{Name: "Abby"}     // 建立一個 User（一間房子）
ptr  := &user                   // & 取得 user 的地址，ptr 型別是 *User
fmt.Println(ptr.Name)           // 用地址找到房子，拿裡面的 Name
```

| 符號 | 意思 | 方向 | 例子 |
|------|------|------|------|
| `&` | 取得記憶體位置 | 東西 → 地址 | `&user` → 拿到 user 的地址 |
| `*` | 宣告 pointer 型別 | 在型別前面用 | `*User` → 「指向 User 的地址」型別 |

#### 在建構函式裡的實際用法
```go
func NewEventCouponRepository(db *gorm.DB) EventCouponRepository {
//                                 ^  * 用在型別宣告 — 「我需要一個地址」
    return &eventCouponRepository{db: db}
//          ^  & 用在建立時 — 「給我這個東西的地址」
}
```

#### `{db: db}` — 建立 struct 並賦值
```go
&eventCouponRepository{db: db}
//                      ↑   ↑
//                    欄位  值（從參數傳進來的）
// 等同於 JavaScript 的 { db: db } 或簡寫 { db }
```

> JavaScript 預設就是傳 reference（地址），不需要 `&` 和 `*`。
> Go 預設是「複製」，所以需要這兩個符號明確說「我要用地址」。

### `db *gorm.DB` — 為什麼 db 用 pointer
- `db` 不是整個資料庫的資料，是「連線物件」（連線資訊 + 連線池 + 方法）
- 就像「通往 future_sign_prod_Go 的那條路」，不是資料庫本身
- 用 pointer 因為：連線只有一個要共用、物件大不適合複製

### 跨語言比較：Mutable vs Immutable

| 語言/框架 | 改原本的？ | 原因 |
|-----------|-----------|------|
| **Go `*pointer`** | 是 | 效能、共用同一份資料 |
| **Go `value`** | 否（複製） | 安全、不怕被別人改 |
| **Node.js / Python** | 預設是（reference） | 語言設計，物件預設傳 reference |
| **React** | 故意不要（immutable） | 複製才能觸發 re-render（React 用 === 比較 reference） |

### Node.js vs React 範例
```javascript
// Node.js — 預設改原本的（跟 Python 一樣）
function changeName(user) { user.name = "changed" }
const obj = { name: "original" }
changeName(obj)
// obj.name === "changed" ← 被改了

// React — 故意複製，才能觸發 re-render
setUsers(users.map(u => ({ ...u, name: "changed" })))
```

> React 的 immutable 不是語言限制，是框架要求

## `type` 關鍵字 — Go 的型別定義

### `type` 是用來定義型別的關鍵字，可以定義多種東西
```go
type User struct { ... }              // struct 型別（最常見，像 class）
type UserRepository interface { ... } // interface 型別（合約）
type UserID uint                      // 基本型別的別名
type Handler func(ctx context.Context) // 函式型別
```

### Go 沒有 class，用 struct + interface 取代
```
其他語言                          Go
──────────────────────────────────────────
abstract class / interface  →   interface（合約，定義能做什麼）
class                       →   struct（資料） + methods（方法）
class implements interface  →   struct 實作 interface 的方法（自動判定）
```

## Interface vs Struct

### Interface =「合約」，只定義能做什麼（大寫 = public，給外部用）
```go
type EventCouponRepository interface {
    GetByID(id uint) (*EventCoupon, error)
    Create(coupon *EventCoupon) error
}
```

### Struct =「實作」，真正寫邏輯的地方（小寫 = private，內部細節）
```go
type eventCouponRepository struct {
    db *gorm.DB
}

func (r *eventCouponRepository) GetByID(id uint) (*EventCoupon, error) {
    // 真正去資料庫查資料的程式碼
}
```

### 為什麼 interface 大寫、struct 小寫？
- **interface 大寫** → 外部套件需要引用這個合約（handler、service 都要用）
- **struct 小寫** → 內部實作細節，外部不需要知道怎麼實作的

### 跨語言對比
```typescript
// TypeScript — 需要寫 implements
interface EventCouponRepository { getByID(id: number): Promise<EventCoupon> }
class Impl implements EventCouponRepository { getByID(id) { /*...*/ } }
```
```python
# Python — 用 ABC 或 Protocol
class EventCouponRepository(ABC):
    @abstractmethod
    def get_by_id(self, id: int) -> EventCoupon: ...

class EventCouponRepositoryImpl(EventCouponRepository):
    def get_by_id(self, id: int) -> EventCoupon: ...
```
```javascript
// Node.js — 沒有 interface，通常靠 JSDoc 或不用
class EventCouponRepository {
    getByID(id) { /*...*/ }
}
```
> Go 不用寫 `implements`，只要 struct 實作了 interface 定義的所有方法，就自動算實作了
> interface 和 struct 都是用 `type` 定義的，是同一個 level 的東西

## 大小寫規則（Public / Private）

### `user *User` — 為什麼有兩個大小寫不同的名字
```go
func doSomething(user *User) {
//                ^^^^  ^^^^
//                變數名  型別名（就像 TypeScript 的 user: User）
}
```

等同於：
```typescript
// TypeScript
function doSomething(user: User) { }
```
```python
# Python
def do_something(user: User): ...
```

### 大小寫 = Public / Private（Go 獨有）
| | 大寫開頭 | 小寫開頭 |
|---|---|---|
| **型別名** | `User` → public（exported，外部套件能用） | `eventCouponRepository` → private |
| **欄位名** | `Name string` → public | `email string` → private |
| **變數名** | 通常不這樣用 | `user`, `db` → 正常變數名 |

```go
type User struct {
    Name  string   // 大寫 → public，JSON 序列化看得到
    email string   // 小寫 → private，只有同套件能存取
}
```

> TypeScript/Python 用 `export`/`public`/`_` 前綴來區分，Go 直接用首字母大小寫

### 套件（Package）到底是什麼？大小寫控制的是「跨資料夾」的存取

Go 的「套件」不是 go.mod（那個叫 module），**package = 一個資料夾**。

#### 三層架構對比
```
Go                            Node.js
────────────────────────────────────────────
module（go.mod）            =  package（package.json）
  → 整個專案                  → 整個專案

package（每個資料夾）        =  每個資料夾（import 的路徑）
  → 大小寫控制的就是這層        → 用 export 控制

file（.go 檔案）             =  每個 .js 檔案
```

#### 在 futuresign 專案裡的實際結構
```
futuresign/                          ← module（go.mod 定義的）
├── go.mod                           ← 類似 package.json
├── internal/
│   ├── models/                      ← package models
│   │   ├── user.go                  ← package models
│   │   └── event_coupon.go          ← package models（同資料夾 = 同 package）
│   ├── service/                     ← package service
│   │   └── event_coupon_service.go  ← package service
│   └── repository/                  ← package repository
│       └── event_coupon_repository.go ← package repository
```

每個 .go 檔案開頭都會宣告自己屬於哪個 package：
```go
// internal/models/user.go
package models          // ← 我屬於 models 這個 package
```

#### 大小寫控制的就是「跨 package（跨資料夾）」的存取
```go
// internal/models/user.go
package models

type User struct {
    Name  string        // 大寫 → service、handler 等其他 package 能用
    email string        // 小寫 → 只有 models 資料夾內的 .go 檔能用
}
```

```go
// internal/service/user_service.go
package service                          // ← 不同的 package

import "futuresign/internal/models"

func (s *userService) DoSomething() {
    user := models.User{}
    user.Name = "ok"    // ✅ 大寫，跨 package 可以存取
    user.email = "x"    // ❌ 編譯錯誤！小寫，只有 models 內部能用
}
```

#### 跨語言 public/private 對比
| 語言 | public | private |
|------|--------|---------|
| **Go** | 大寫開頭 `Name` | 小寫開頭 `email` |
| **TypeScript** | `export class` / `public` | 不 export / `private` / `#` |
| **Node.js** | `module.exports` / `export` | 不 export / `#` |
| **Python** | 正常命名 `name` | `_name`（慣例）或 `__name`（name mangling） |

## db 連線物件補充

### pointer 改連線物件 ≠ 改資料庫資料
```
┌─────────────────────────────┐
│  db (*gorm.DB) 連線物件       │  ← pointer 改的是這裡（連線設定）
│  ├── host: "xxx"            │
│  ├── timeout: 30            │
│  └── pool: [conn1, conn2]   │
└─────────────────────────────┘
         │
         │  db.Find(&users)   ← 這才是透過連線去查資料庫的資料
         ▼
┌─────────────────────────────┐
│  future_sign_prod_Go 資料庫   │  ← 實際的資料在這裡
└─────────────────────────────┘
```

- `db.Config.Timeout = 30` → 改的是連線物件的設定
- `db.Find(&users)` → 透過連線去查資料庫的資料
- 因為 db 用 pointer，所有用到這個 db 的地方共用同一個連線

## DI（Dependency Injection，依賴注入）

### Go 用建構函式把依賴「注入」進去
```go
// 建構函式：從外面傳入依賴，而不是自己在裡面建立
func NewEventCouponService(
    couponRepo repository.EventCouponRepository,  // 注入 repository
    memberRepo repository.MemberRepository,        // 注入 repository
) EventCouponService {
    return &eventCouponService{
        couponRepo: couponRepo,
        memberRepo: memberRepo,
    }
}
```

### 跨語言 DI 對比
```javascript
// Node.js ❌ 不用 DI — 自己 import，耦合高(比較不好)
class EventCouponService {
    constructor() {
        this.repo = new EventCouponRepository(db)  // 自己建立，綁死了
    }
}

// Node.js ✅ 用 DI — 從外面傳進來
class EventCouponService {
    constructor(repo) {  // 從外面注入，可以換成 mock
        this.repo = repo
    }
}
```
```python
# Python DI
class EventCouponService:
    def __init__(self, repo: EventCouponRepository):  # 注入
        self.repo = repo
```

### DI 的好處
- 測試時可以傳 mock，不用連真的資料庫
- 各層之間解耦，換實作不用改 service 程式碼
- 這也是為什麼要有 interface：service 依賴 interface（合約），不依賴具體的 struct（實作）

### Mock 是什麼？= 假的替身，用來測試

```
正式環境：service → repository → 真的資料庫（要連線、很慢）
測試環境：service → mock repository → 假的，直接回傳寫死的資料（不用連線、快）
```

```go
// 真的 repository — 連資料庫查資料
func (r *eventCouponRepository) GetByID(id uint) (*EventCoupon, error) {
    var coupon EventCoupon
    r.db.First(&coupon, id)  // 真的去資料庫查
    return &coupon, nil
}

// Mock repository — 直接回傳假資料，不連資料庫
func (m *mockEventCouponRepository) GetByID(id uint) (*EventCoupon, error) {
    return &EventCoupon{ID: 1, Name: "測試優惠券"}, nil  // 寫死的假資料
}
```

用 React 類比：
```javascript
// 就像開發時用假的 API 資料，不用等後端做好
const mockUsers = [{ id: 1, name: "測試用戶" }]

// 正式環境 → 打真的 API
const users = await fetch("/api/users")
// 測試環境 → 用假資料
const users = mockUsers
```

> 真的和假的都符合同一個 interface（合約），所以 service 不用改任何程式碼

---

## 學習總結

### 核心概念回顧
1. **package** = 每個資料夾，每個 .go 檔開頭宣告 `package xxx` 表示自己屬於哪一層。大寫 = 可以給別的 package 用（public），小寫 = 只有同 package 能用（private）
2. **`*` 和 `&`** = 一對相反的符號。`*` 宣告 pointer 型別（地址），`&` 取得記憶體位置（拿地址）。Go 預設複製，需要這兩個符號才能用 reference
3. **DI（依賴注入）** = 把依賴從外面傳進來，而不是自己建立。Go 用建構函式 + interface 實現
4. **Mock** = 假的替身，符合同一個 interface，用寫死的假資料取代真的資料庫連線，讓測試不依賴外部環境
5. **`gorm.DB`** = 連線物件（連線資訊 + 連線池 + 方法），不是資料庫裡的資料本身
6. **Go 沒有 class** — 用 struct（資料+方法）取代 class，用 interface（合約）定義能做什麼
7. **`type`** = 定義型別的關鍵字，可以定義 struct、interface、別名、函式型別，它們都是同一個 level
8. **`{db: db}`** = 建立 struct 並賦值，左邊是欄位名，右邊是值，就像 JavaScript 的 `{ db: db }`
