# Golang Gin 框架學習筆記

## 1. `gin.New()` vs `gin.Default()`

在 Gin 框架中，初始化一個路由引擎（Engine）通常有兩種方法：

### **`gin.New()`**
- **什麼是它？**
  這是一個最乾淨、最純粹的初始化函數。
- **特點**：
  - 它建立了一個完全空白的 Engine。
  - **沒有任何預設的中介軟體 (Middleware)**。
  - 如果發生 panic (程式崩潰)，整個伺服器會掛掉，因為沒有復原機制。
  - 通常用於需要高度客製化，不想被預設 logger 或 recovery 干擾的場景。
- **程式碼範例**：
  ```go
  r := gin.New()
  // 你必須自己手動添加想要的功能，例如：
  r.Use(gin.Logger())   // 記錄 Log
  r.Use(gin.Recovery()) // 防止 Panic 導致伺服器崩潰
  ```

### **`gin.Default()`**
- **什麼是它？**
  這是 `gin.New()` 的加強版，適合大多數開發場景。
- **特點**：
  - 它其實就是先呼叫了 `gin.New()`，然後**自動幫你加上了兩個最重要的中介軟體**：
    1. **Logger**：負責把請求記錄印在 Console 上。
    2. **Recovery**：如果程式哪裡寫錯發生 panic，它會幫你接住，伺服器不會因此停機，並回傳 500 錯誤。
- **原始碼長這樣**：
  ```go
  func Default() *Engine {
      engine := New()
      engine.Use(Logger(), Recovery()) // 自動幫你裝好這兩個
      return engine
  }
  ```

---

## 2. 關於專案架構中的角色分工

在 Go 的後端架構中，通常會這樣分工：

### **`internal/container` (容器)**
- **職責**：**組裝工廠** (Dependency Injection)。
- **內容**：這裡負責 `New` 所有的 Repository、Service 和 Handler。
- **為什麼要它？**
  為了讓 `main.go` 乾淨。不然 `main` 函數裡會有幾十行的 `NewXXX` 程式碼。它本身不處理業務邏輯，只負責把大家串起來。

### **`internal/router` (路由)**
- **職責**：**櫃台總機**。
- **內容**：定義 URL 路徑 (`/api/v1/users`) 對應到哪個 Handler (`userHandler.Login`)。
- **它放 Repo 嗎？**
  **不會**。Router 層只跟 **Handler** 打交道。
  - 流程是：`User` -> `Router` -> `Handler` -> `Service` -> `Repo` -> `Database`。
  - Router 知道有 Handler 就好，不需要知道背後的 Repo 是誰。

### **`internal/repository` (倉庫)**
- **職責**：**資料存取**。
- **內容**：直接對資料庫下 SQL 指令 (`SELECT`, `INSERT`)。

---

## 3. 簡單圖解

```
[請求 Request]
      ⬇
[Router (internal/router)]  <-- "您好，請問要找誰？" (路由分派)
      ⬇
[Handler (internal/handler)] <-- "我來處理 HTTP 格式，讀取參數"
      ⬇
[Service (internal/service)] <-- "我來處理業務邏輯 (例如算薪水、驗證規則)"
      ⬇
[Repo (internal/repository)] <-- "我去資料庫撈資料"
      ⬇
[Database]
```
