# PowerShell vs Bash 指令差異

## 為什麼同一個指令在不同地方結果不同？

Windows 有多個命令列環境，語法不同：

| 環境 | 識別方式 | 風格 |
|------|----------|------|
| **PowerShell** | 提示符是 `PS C:\...>` | Windows 風格 |
| **Git Bash** | 提示符是 `User@PC MINGW64 ...` | Linux 風格 |
| **CMD** | 提示符是 `C:\...>` | 古老 DOS 風格 |

---

## 常見指令對照表

### 刪除檔案/資料夾

| 動作 | Bash | PowerShell |
|------|------|------------|
| 刪除檔案 | `rm file.txt` | `rm file.txt` |
| 刪除資料夾（遞迴+強制） | `rm -rf folder/` | `rm -Recurse -Force folder/` |
| 簡寫 | `rm -rf` | `rm -r -fo` |

### 建立資料夾

| 動作 | Bash | PowerShell |
|------|------|------------|
| 建立資料夾 | `mkdir folder` | `mkdir folder` |
| 建立多層資料夾 | `mkdir -p a/b/c` | `mkdir -Force a/b/c` |

### 其他常用

| 動作 | Bash | PowerShell |
|------|------|------------|
| 印出文字 | `echo "hello"` | `echo "hello"` 或 `Write-Host "hello"` |
| 查看檔案內容 | `cat file.txt` | `cat file.txt` 或 `Get-Content file.txt` |
| 清除畫面 | `clear` | `clear` 或 `cls` |

---

## PowerShell 常見陷阱

### 1. `-rf` 不是有效參數

```powershell
# ❌ 錯誤（Bash 語法）
rm -rf folder/

# ✅ 正確（PowerShell 語法）
rm -Recurse -Force folder/
```

### 2. 特殊字元開頭的檔案/資料夾

PowerShell 會把 `-` 開頭解讀為參數：

```powershell
# ❌ 錯誤（-archive 被當成參數）
rm -Recurse -Force -archive

# ✅ 正確（加上 .\ 前綴）
rm -Recurse -Force .\_archive

# ✅ 正確（用引號）
rm -Recurse -Force ".\_archive"
```

### 3. 路徑斜線

```powershell
# 兩種都可以
cd C:\coding\project
cd C:/coding/project
```

---

## 如何判斷我在哪個環境？

看提示符：

```
# PowerShell
PS C:\Users\User>

# Git Bash
User@PC MINGW64 /c/Users/User

# CMD
C:\Users\User>
```

---

## 建議

- **Git 操作** → 用 Git Bash（語法和網路教學一致）
- **Windows 系統管理** → 用 PowerShell
- **Claude Code** → 預設用 Git Bash 風格

---

## 快速記憶

| 我要... | Bash | PowerShell |
|---------|------|------------|
| 強制刪除資料夾 | `-rf` | `-Recurse -Force` |
| 刪除特殊名稱 | 直接打名字 | 加 `.\` 前綴 |
