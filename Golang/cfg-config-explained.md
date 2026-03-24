# cfg 是什麼？

## 一句話解釋

`cfg` 是 `*config.Config` 的實例，代表整個應用程式的設定值。它從環境變數載入所有配置，讓各元件可以存取資料庫連線、JWT 密鑰、Redis 位址等設定。

## 來源

定義在 `internal/config/config.go`：

```go
cfg, err := config.Load()  // 從環境變數載入所有設定
```

`config.Load()` 會讀取環境變數（搭配預設值），回傳一個 `*Config` 指標。

## Config struct 包含什麼

```go
type Config struct {
    Database        DatabaseConfig        // MySQL 連線設定
    Server          ServerConfig          // Port、環境、GinMode、LogLevel
    Migration       MigrationConfig       // AutoMigrate 開關
    JWT             JWTConfig             // Secret、過期時間
    Redis           RedisConfig           // Redis 連線設定
    GoogleOAuth     GoogleOAuthConfig     // Google 登入
    GoogleRecaptcha GoogleRecaptchaConfig // reCAPTCHA 防機器人
    ECPay           ECPayConfig           // 綠界金流 + 電子發票
    AWS             AWSConfig             // S3 圖片上傳
    Email           EmailConfig           // Mailgun 寄信
    Auth            AuthConfig            // 驗證碼過期、重試次數
    CORS            CORSConfig            // 跨域設定
    Order           OrderConfig           // 訂單限制（如每人最多購票數）
}
```

## 常見用法

```go
// 啟動時載入
cfg, err := config.Load()

// 存取子設定
cfg.Database.Host          // MySQL 主機
cfg.JWT.Secret             // JWT 簽章金鑰
cfg.Redis.Host             // Redis 主機
cfg.Server.Port            // 伺服器 Port
cfg.ECPay.MerchantID       // 綠界商店代號
cfg.AWS.S3Bucket            // S3 Bucket 名稱
cfg.Email.MailgunAPIKey    // Mailgun API Key
cfg.Order.MaxTicketsPerMemberPerEvent  // 單一活動最多購票數
```

## 環境變數對應

每個欄位都對應一個環境變數，用 `getEnv("KEY", "default")` 讀取：

| 欄位 | 環境變數 | 預設值 |
|------|----------|--------|
| `Database.Host` | `MYSQL_HOST` | `localhost` |
| `Database.Port` | `MYSQL_PORT` | `3306` |
| `Server.Port` | `SERVER_PORT` | `8080` |
| `JWT.Secret` | `JWT_SECRET` | `change-this-secret-key-in-production` |
| `Redis.Host` | `REDIS_HOST` | `localhost` |
| `Migration.Enabled` | `AUTO_MIGRATE_ENABLED` | `true` |

完整對應請直接看 `internal/config/config.go` 的 `Load()` 函數。

## 在 main.go 中的角色

```go
func main() {
    godotenv.Load()              // 1. 讀 .env 檔
    cfg, err := config.Load()    // 2. 環境變數 → cfg struct
    database.ConnectWithRetry()  // 3. 用 cfg.Database 連 MySQL
    database.ConnectRedis()      // 4. 用 cfg.Redis 連 Redis
    // ... 把 cfg 傳給各 service/handler
}
```

`cfg` 在啟動時建立一次，然後透過依賴注入傳遞給需要的元件。
