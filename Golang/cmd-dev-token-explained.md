# cmd/dev-token/main.go 解釋

## 這是什麼？

這**不是測試**。這是一個**開發用的小工具腳本**，用途是快速產生開發環境需要的假資料和 JWT Token，讓你不用手動去資料庫建資料、不用透過 API 註冊登入，就能直接拿到 token 測 API。

## 執行方式

```bash
cd backend-go
go run ./cmd/dev-token
```

## 它做了什麼？（逐步解釋）

### 第 1 步：連線到資料庫和 Redis

```go
godotenv.Load()              // 讀取 .env 設定
cfg, err := config.Load()    // 載入設定
cfg.Redis.Host = "localhost"  // 強制用本機 Redis
database.ConnectWithRetry(...)  // 連線 MySQL
database.ConnectRedis(...)      // 連線 Redis
```

### 第 2 步：建立假 Member（如果不存在）

```go
email := "dev_member@test.com"
database.DB.Where("email = ?", email).First(&member)
// 找不到就建一個：
//   名字: Dev Member
//   Email: dev_member@test.com
//   身份: Consumer（消費者）
//   狀態: Active
```

- 如果 DB 裡已經有 `dev_member@test.com` 就不會重複建

### 第 3 步：產生 JWT Token（重點！）

```go
token, err := utils.GenerateToken(member.ID, member.Email, tokenVersion, cfg.JWT.Secret, 24*30)
fmt.Println("MEMBER_TOKEN=" + token)
```

- 用專案自己的 `utils.GenerateToken` 產生真正可用的 JWT
- 有效期 **30 天**（`24*30` 小時）
- 印出 `MEMBER_TOKEN=eyJhbGci...`，你複製這串就能拿去打 API

### 第 4 步：建立假 Event（如果不存在）

```go
event = models.Event{
    Name:   "Dev Event",
    Status: EventStatusActive,
    ...
}
```

### 第 5 步：建立假 Order（如果不存在）

```go
order = models.Order{
    Status:    "DRAFT",
    OrderType: "b2c_ticket",
    TotalAmount: 1000,
    ...
}
```

## 整體流程圖

```
執行 go run ./cmd/dev-token
        │
        ├── 連線 DB + Redis
        │
        ├── 查找/建立 dev_member@test.com
        │
        ├── 產生 JWT Token（30天有效）
        │   └── 印出 MEMBER_TOKEN=xxx  ← 你要的東西
        │
        ├── 查找/建立 Dev Event
        │
        └── 查找/建立 Dev Order（DRAFT 狀態）
```

## 使用場景

| 場景 | 怎麼用 |
|------|--------|
| 要測某個需要登入的 API | 跑一次拿 token，貼到 Postman 的 Authorization header |
| 新組員加入，本地 DB 是空的 | 跑一次自動建好 member + event + order |
| Token 過期了 | 再跑一次就有新的 |

## 注意事項

- 這個工具**寫入資料庫**，不要在 production 環境跑
- 它強制 Redis 連 `localhost`，所以只能在本機用
- 如果 DB 裡沒有對應的 company（外鍵限制），建立 Event 可能會失敗
