# Go 開發工具安裝指南

## 1. 安裝 Go

### Windows 安裝步驟

#### 下載 Go

**官方下載頁面**：https://go.dev/dl/

選擇適合 Windows 的版本：
- `go1.25.x.windows-amd64.msi`（推薦使用最新穩定版）

#### 安裝步驟

1. 下載 `.msi` 安裝檔
2. 雙擊執行安裝程式
3. 按照安裝精靈指示完成安裝（通常安裝到 `C:\Program Files\Go`）
4. **重新開啟 PowerShell/終端機**（讓環境變數生效）

#### 驗證安裝

```powershell
# 檢查版本
go version
# 應顯示：go version go1.25.x windows/amd64

# 檢查環境變數
go env GOPATH
# 應顯示：C:\Users\<你的用戶名>\go

go env GOROOT
# 應顯示：C:\Program Files\Go
```

---

## 2. 安裝 Air（Go 熱重載工具）

### 什麼是 Air？

Air 是 Go 的熱重載工具，類似於：
- Node.js 的 `nodemon`
- Python 的 `watchdog`

當你修改 `.go` 檔案時，Air 會自動：
1. 重新編譯程式
2. 重啟伺服器
3. 顯示即時日誌

### 安裝指令

```powershell
go install github.com/air-verse/air@latest
```

### 驗證安裝

```powershell
air -v
# 應顯示：air version v1.x.x
```

**如果顯示「找不到 air」**：

```powershell
# 檢查 GOPATH/bin 是否在 PATH 中
$env:Path -split ';' | Select-String -Pattern 'go'

# 手動添加到 PATH（暫時）
$env:Path += ";C:\Users\$env:USERNAME\go\bin"

# 或永久添加（需要系統管理員權限）
[System.Environment]::SetEnvironmentVariable(
    "Path",
    [System.Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Users\$env:USERNAME\go\bin",
    "User"
)
```

---

## 3. 其他 Go 開發工具

### golangci-lint（程式碼檢查工具）

```powershell
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### gosec（安全性掃描工具）

```powershell
go install github.com/securego/gosec/v2/cmd/gosec@latest
```

### swag（Swagger 文件產生器）

```powershell
go install github.com/swaggo/swag/cmd/swag@latest
```

### 一次安裝全部（本專案需要的工具）

```powershell
cd C:\coding\template\backend-go
make install-tools
```

這會安裝：
- `golangci-lint`
- `gosec`
- `air`
- `swag`

---

## 4. 設定編輯器

### VS Code 推薦擴充套件

1. **Go**（官方擴充套件）
   - 作者：Go Team at Google
   - 功能：語法高亮、自動完成、除錯

2. **Go Test Explorer**
   - 功能：在側邊欄顯示測試

3. **Error Lens**
   - 功能：即時顯示錯誤

### VS Code 設定

在 `.vscode/settings.json` 加入：

```json
{
  "go.useLanguageServer": true,
  "go.lintTool": "golangci-lint",
  "go.lintOnSave": "workspace",
  "go.formatTool": "goimports",
  "editor.formatOnSave": true
}
```

---

## 5. 常見問題

### Q: 安裝後找不到 `go` 指令

**A: 需要重新開啟終端機讓環境變數生效**

1. 關閉當前 PowerShell
2. 重新開啟（以**系統管理員身分執行**）
3. 再試一次 `go version`

---

### Q: `air` 安裝後找不到指令

**A: GOPATH/bin 不在 PATH 中**

```powershell
# 檢查 Go bin 目錄
go env GOPATH
# 假設顯示：C:\Users\User\go

# 檢查 air.exe 是否存在
Test-Path "C:\Users\User\go\bin\air.exe"
# 應該返回 True

# 手動執行（完整路徑）
C:\Users\User\go\bin\air.exe -v

# 永久解決：添加到 PATH
# 設定 → 系統 → 進階系統設定 → 環境變數
# 在「使用者變數」的 Path 中新增：
# C:\Users\User\go\bin
```

---

### Q: `go install` 很慢

**A: 設定 Go Proxy（中國大陸用戶）**

```powershell
# 設定 GOPROXY
go env -w GOPROXY=https://goproxy.cn,direct

# 或使用七牛雲
go env -w GOPROXY=https://goproxy.io,direct
```

---

## 6. 本專案 Go 版本要求

根據 `backend-go/go.mod`：

```
go 1.24.0
toolchain go1.24.11
```

**建議**：安裝 **Go 1.24.0 或以上**版本（目前 1.25.6 完全沒問題）

---

## 7. 檢查清單

安裝完成後，確認以下指令都能正常執行：

```powershell
# ✅ Go 安裝
go version

# ✅ 環境變數
go env GOPATH
go env GOROOT

# ✅ Air 熱重載工具
air -v

# ✅ golangci-lint（選用）
golangci-lint --version

# ✅ swag（選用）
swag -v

# ✅ 測試編譯
cd C:\coding\template\backend-go
go build ./cmd/server/main.go
# 應該在當前目錄產生 main.exe
```

---

## 8. 啟動本專案後端

```powershell
# 方法 1：使用 air（開發模式，熱重載）
cd C:\coding\template\backend-go
air

# 方法 2：使用 make（需要安裝 make 工具）
make dev

# 方法 3：直接編譯執行
go build -o bin/server.exe ./cmd/server/main.go
./bin/server.exe
```

---

## 參考資源

- **Go 官方文件**：https://go.dev/doc/
- **Go 安裝指南**：https://go.dev/doc/install
- **Air GitHub**：https://github.com/air-verse/air
- **本專案開發規範**：`backend-go/docs/AI_CODING_AGENT_BEST_PRACTICES.md`
