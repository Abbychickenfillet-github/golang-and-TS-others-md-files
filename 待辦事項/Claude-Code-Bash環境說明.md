# Claude Code 的 Bash 環境說明

## 問題現象

在 Claude Code 中執行指令時出現：

```
/usr/bin/bash: line 1: Start-Sleep: command not found
/usr/bin/bash: line 1: Get-Content: command not found
/usr/bin/bash: line 1: $env:ENVIRONMENT=staging: command not found
```

---

## 原因

### Claude Code 使用的是 Unix Bash，不是 PowerShell

即使你在 **Windows** 上使用 Claude Code，它的 Bash 工具實際上是透過 **WSL (Windows Subsystem for Linux)** 或類似的 Unix-like 環境執行。

```
你的電腦: Windows
     ↓
Claude Code Bash 工具
     ↓
實際執行環境: /usr/bin/bash (Linux/Unix shell)
     ↓
不認得 PowerShell 指令！
```

---

## PowerShell vs Bash 指令對照

| 功能 | PowerShell | Bash (Unix) |
|------|------------|-------------|
| 設定環境變數 | `$env:VAR="value"` | `export VAR="value"` 或 `VAR="value"` |
| 等待/睡眠 | `Start-Sleep -Seconds 5` | `sleep 5` |
| 讀取檔案 | `Get-Content file.txt` | `cat file.txt` |
| 讀取檔案尾部 | `Get-Content file.txt -Tail 10` | `tail -10 file.txt` |
| 列出檔案 | `Get-ChildItem` 或 `dir` | `ls` |
| 搜尋字串 | `Select-String` | `grep` |

---

## 解決方案

### 在 Claude Code 中使用 Bash 語法

```bash
# ❌ PowerShell 語法（會失敗）
$env:ENVIRONMENT="staging"; docker compose watch

# ✅ Bash 語法
ENVIRONMENT=staging docker compose watch
```

### 需要 PowerShell 時，在你自己的終端機執行

Claude Code 的 Bash 工具**無法**執行 PowerShell 指令。如果需要 PowerShell：

1. 開啟你自己的 PowerShell 終端機
2. 手動執行指令

```powershell
# 在你的 PowerShell 終端機中執行
$env:ENVIRONMENT="staging"; docker compose watch
```

---

## 為什麼 Claude Code 使用 Bash？

1. **跨平台相容性** - Bash 指令在 Windows (WSL)、macOS、Linux 都能執行
2. **Unix 工具生態** - `grep`、`sed`、`awk` 等工具更強大
3. **標準化** - 大多數開發文件和教學都使用 Bash 語法

---

## 實用技巧

### 檢查 Claude Code 使用的 shell

```bash
echo $SHELL
# 輸出: /usr/bin/bash 或類似路徑
```

### 在 Bash 中設定環境變數並執行指令

```bash
# 方法 1: 單行（只對該指令生效）
ENVIRONMENT=staging docker compose up

# 方法 2: export（對整個 session 生效）
export ENVIRONMENT=staging
docker compose up
```

---

## 總結

| 環境 | Shell | 路徑 |
|------|-------|------|
| 你的 Windows 終端機 | PowerShell | `pwsh.exe` 或 `powershell.exe` |
| Claude Code Bash 工具 | Bash (Unix) | `/usr/bin/bash` (透過 WSL) |
| macOS 終端機 | Bash 或 Zsh | `/bin/bash` 或 `/bin/zsh` |
| Linux 終端機 | Bash | `/bin/bash` |

**記住**：在 Claude Code 中執行指令時，使用 **Bash 語法**，不是 PowerShell 語法！
