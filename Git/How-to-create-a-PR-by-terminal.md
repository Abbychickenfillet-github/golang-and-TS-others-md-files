# How to Create a PR by Terminal

## 基本指令

```bash
gh pr create --base main --head stage --title "PR 標題"
```

| 參數 | 說明 |
|------|------|
| `--base` | 目標分支（要合併**進去**的分支） |
| `--head` | 來源分支（你要合併**出去**的分支） |
| `--title` | PR 標題 |
| `--body` | PR 內文（選填） |

## --body 的寫法

### 1. 直接寫（短內容）

```bash
gh pr create --base main --head stage --title "Merge stage to main" --body "測試完成，合併到 main"
```

### 2. 多行用 heredoc（Git Bash）

```bash
gh pr create --base main --head stage --title "Merge stage to main" --body "$(cat <<'EOF'
## Summary
- fix: 某個修復

測試完成，合併 stage 至 main。
EOF
)"
```

### 3. 多行（PowerShell）

```powershell
gh pr create --base main --head stage --title "Merge stage to main" --body @"
## Summary
- fix: 某個修復

測試完成，合併 stage 至 main。
"@
```

> **注意：** PowerShell 的 `@"..."@` 結尾的 `"@` 必須在**行首**，前面不能有空格。

### 4. 不寫 --body，互動模式

```bash
gh pr create --base main --head stage --title "Merge stage to main"
```

不加 `--body` 時，`gh` 會問你要不要用編輯器寫，或直接 Submit 留空。

### 5. 從檔案讀內容

```bash
gh pr create --base main --head stage --title "Merge stage to main" --body-file pr_description.md
```

## PowerShell vs Git Bash 差異

| | Git Bash | PowerShell |
|---|---|---|
| 多行字串 | heredoc `$(cat <<'EOF' ... EOF)` | here-string `@"..."@` |
| 路徑分隔 | `/c/coding/...`（正斜線） | `C:\coding\...`（反斜線） |
| 跳脫字元 | `\`（反斜線） | `` ` ``（反引號） |
| 環境變數 | `$VAR` | `$env:VAR` |
| gh 指令本身 | 完全一樣 | 完全一樣 |

**結論：`gh` 指令本身兩邊一模一樣，唯一差別在多行字串的語法。** 如果 body 很短直接用 `--body "一行內容"` 就好，兩邊都通用。

## 其他常用選項

```bash
# 指定 reviewer
gh pr create --base main --head stage --title "..." --reviewer username1,username2

# 加 label
gh pr create --base main --head stage --title "..." --label bug,urgent

# 建立 draft PR
gh pr create --base main --head stage --title "..." --draft
```
