# Git 換行符（Line Ending）說明

## 問題：LF vs CRLF

### 什麼是 LF 和 CRLF？

| 換行符 | 全名 | 符號 | 使用系統 |
|--------|------|------|----------|
| **LF** | Line Feed | `\n` | Linux、macOS、Unix |
| **CRLF** | Carriage Return + Line Feed | `\r\n` | Windows |

### 為什麼會有這個問題？

不同操作系統使用不同的換行符：
- **Windows** 使用 `CRLF` (`\r\n`)
- **Linux/macOS** 使用 `LF` (`\n`)

當 Windows 用戶和 Linux 用戶協作時，Git 會自動轉換換行符，但這可能造成問題。

## `git config core.autocrlf` 是什麼？

這是 Git 的**自動換行符轉換**設定，控制 Git 如何處理換行符。

### 設定值

| 設定值 | 說明 | 適用場景 |
|--------|------|----------|
| `true` | **提交時**：CRLF → LF<br>**檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時**：LF → CRLF | Windows 用戶（推薦） |
| `false` | 不自動轉換，保持原樣 | Linux/macOS 用戶 |
| `input` | **提交時**：CRLF → LF<br>**檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時**：不轉換 | 跨平台團隊（推薦） |

### 檢查當前設定

```bash
# 查看當前設定
git config core.autocrlf

# 查看所有相關設定
git config --list | grep -i crlf
```

## 問題場景

### 你遇到的問題

```
LF will be replaced by CRLF the next time Git touches it
```

**原因**：
- 你的 Windows 系統預設 `core.autocrlf = true`
- 檔案在 Git 中是 LF（因為同事用 Linux）
- Git 警告：下次檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時會轉換成 CRLF

### 同事會遇到什麼？

如果他們用 Linux：
- 他們的 `core.autocrlf = false`（Linux 預設）
- 檔案在 Git 中是 LF
- **不會有問題** ✅

## 解決方案

### 方案 1：統一使用 LF（推薦）

**適用於**：跨平台團隊（Windows + Linux/macOS）

#### 步驟 1：設定 Git 配置

```bash
# Windows 用戶設定（你）
git config core.autocrlf input

# 這樣設定：
# - 提交時：CRLF → LF（統一為 LF）
# - 檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時：不轉換（保持 LF）
```

#### 步驟 2：建立 `.gitattributes` 檔案

在專案根目錄建立 `.gitattributes`：

```gitattributes
# 強制所有文字檔案使用 LF
* text=auto eol=lf

# 特定檔案類型
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.json text eol=lf
*.md text eol=lf
*.py text eol=lf
*.sql text eol=lf

# 二進位檔案不處理
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
```

#### 步驟 3：重新規範化現有檔案

```bash
# 移除 Git 快取
git rm --cached -r .

# 重新加入所有檔案（會根據 .gitattributes 轉換）
git add .

# 提交變更
git commit -m "Normalize line endings to LF"
```

### 方案 2：使用 Biome 的換行符設定

在 `biome.json` 中設定：

```json
{
  "formatter": {
    "indentStyle": "space",
    "lineEnding": "lf"  // ⭐ 強制使用 LF
  }
}
```

然後執行：

```bash
npm run lint  # Biome 會自動修正為 LF
```

### 方案 3：只設定個人 Git 配置（不推薦）

如果你不想影響整個專案，只設定個人配置：

```bash
# 只影響你的本地設定
git config core.autocrlf input
```

**缺點**：
- 每個人都要自己設定
- 容易忘記
- 沒有強制性

## 推薦做法

### 最佳實踐

1. **建立 `.gitattributes` 檔案**（方案 1）
   - 強制所有檔案使用 LF
   - 確保團隊一致性
   - 一次設定，永久有效

2. **設定 `core.autocrlf`**（依作業系統）
   - **Windows 用戶**：`git config core.autocrlf true`
     - 提交時 CRLF → LF
     - 檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時 LF → CRLF（自動轉回 Windows 格式）
   - **Linux/Mac 用戶**：`git config core.autocrlf input`
   - 這是 Linux/Mac 用戶要打的指令。
     - 提交時 CRLF → LF
     - 檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時保持 LF
     - checkout時

3. **在 Biome 中設定 `lineEnding: "lf"`**
   - 確保格式化工具也使用 LF
   - 與 Git 設定一致

## 常見問題

### Q: 如果改成 LF，同事會需要再轉一次嗎？

**A: 不會！** 原因：

1. **Linux 同事**：
   - 他們本來就用 LF
   - 檔案在 Git 中也是 LF
   - **完全沒問題** ✅

2. **你（Windows）**：
   - 設定 `core.autocrlf = input` 後
   - 提交時：CRLF → LF（統一）
   - 檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時：保持 LF（不轉換）
   - **也沒問題** ✅

3. **結果**：
   - 所有檔案在 Git 中都是 LF
   - 所有人檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)後都是 LF
   - **不需要再轉換** ✅

### Q: 為什麼 Git 會警告 "LF will be replaced by CRLF"？

**A:** 因為你的 `core.autocrlf = true`（Windows 預設）

- Git 看到檔案是 LF
- 但設定說檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)時要轉成 CRLF
- 所以警告你：下次檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)會轉換

**解決**：改成 `input` 或 `false`，就不會轉換了。

### Q: 已經有 CRLF 的檔案怎麼辦？

**A:** 使用方案 1 的步驟 3，重新規範化：

```bash
git rm --cached -r .
git add .
git commit -m "Normalize line endings to LF"
```

## 檢查換行符

### 在 Windows 上檢查

```bash
# 使用 PowerShell
Get-Content file.txt -Raw | Select-String -Pattern "`r`n"  # 檢查是否有 CRLF

# 或使用 Git
git ls-files --eol  # 顯示所有檔案的換行符狀態
```

### 在 Linux/macOS 上檢查

```bash
# 檢查檔案換行符
file file.txt

# 或使用
cat -A file.txt  # 顯示所有字符（$ 表示 LF，^M$ 表示 CRLF）
```

## 總結

1. **問題**：Windows 用 CRLF，Linux 用 LF，造成不一致
2. **解決**：統一使用 LF（透過 `.gitattributes` + `core.autocrlf = input`）
3. **結果**：所有人檢出(Checkout, clone, pull, switch, restore -從repo取出檔案到本地)後都是 LF，不需要再轉換
4. **設定**：一次設定，永久有效

---

## 補充：git switch vs git checkout

### 為什麼有兩個指令？

`git checkout` 功能太多，容易混淆，所以 Git 2.23 (2019) 拆分成兩個專門指令：

| 指令 | 用途 | 取代 checkout 的哪個功能 |
|------|------|-------------------------|
| `git switch` | **切換分支** | `git checkout <branch>` |
| `git restore` | **還原檔案** | `git checkout -- <file>` |

### 比較表

| 功能 | checkout（舊） | switch/restore（新） |
|------|---------------|---------------------|
| 切換分支 | `git checkout main` | `git switch main` |
| 建立並切換 | `git checkout -b new-branch` | `git switch -c new-branch` |
| 還原單一檔案 | `git checkout -- file.txt` | `git restore file.txt` |
| 還原所有檔案 | `git checkout -- .` | `git restore .` |
| 從特定 commit 還原 | `git checkout abc123 -- file.txt` | `git restore --source=abc123 file.txt` |

### 結論

- **checkout** 功能強大但複雜（切換分支 + 還原檔案 + 其他）
- **switch** 專門切換分支，語意更清楚
- **restore** 專門還原檔案，更安全

**建議**：新手用 `switch` + `restore`，更不容易出錯。`checkout` 仍然可用，向後相容。






