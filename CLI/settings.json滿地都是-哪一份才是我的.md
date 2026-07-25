# `settings.json` 滿地都是——哪一份才是「我的」？

> 起因：`dir /s /b settings.json` 從家目錄往下找，**噴出 37 份**。到底哪一份才是 IDE 真正在讀的？

相關筆記：[[VSCode-Cursor-終端機找不到Git-Bash]]

---

## 結論先講

**37 份裡真正屬於「你的設定」的只有 4 份，其餘全是雜訊。**

`settings.json` 是一個**超級通用的檔名**——任何用 JSON 存設定的程式都可能這樣命名。它們彼此之間**毫無關係**，只是碰巧同名。

---

## 🟢 第一類：IDE 的個人設定（**只有這些是你的**）

路徑格式一律是 **`%APPDATA%\<IDE名>\User\settings.json`**。

| 路徑 | 用途 |
|---|---|
| `AppData\Roaming\Cursor\User\profiles\<id>\settings.json` | **Cursor 啟用 Profile 時，實際生效的那份** ⭐ |
| `AppData\Roaming\Cursor\User\settings.json` | Cursor **預設 profile** 的（切到別的 profile 後就被晾著） |
| `AppData\Roaming\Code\User\settings.json` | **VS Code** |
| `AppData\Roaming\Antigravity\User\settings.json` | **Antigravity**（Google 的 IDE，也是 VS Code 分支） |

> ⚠️ Cursor 有兩份！**改錯那份會完全沒反應。** 詳見 [[VSCode-Cursor-終端機找不到Git-Bash]] §4.5。
> **最保險：`Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`**，IDE 會幫你開對的那一份。

---

## 🔵 第二類：專案層設定（跟著 git repo 走）

```
<專案資料夾>\.vscode\settings.json
```

| 特性 | 說明 |
|---|---|
| 誰的 | **這個專案的**，通常會 commit 進 git 讓團隊共用 |
| 優先度 | **比個人設定高**（會蓋掉 User settings） |
| 常見內容 | formatter、tab 寬度、要排除的資料夾、lint 規則 |

> 💡 **「我明明設定了卻沒生效」的常見兇手就是它。** 排查時記得看專案根目錄有沒有 `.vscode\settings.json`。
> 注意：monorepo 可能每個子專案各一份（如 `backend\.vscode\`、`frontend\.vscode\`）。

---

## ⚫ 第三類：別人套件裡自帶的（**純雜訊，佔了一半以上**）

這是清單暴增的元兇：

```
.cursor\extensions\<套件>\.vscode\settings.json           ← 擴充套件作者的
.vscode\extensions\<套件>\.vscode\settings.json           ← 同上
...\node_modules\bcryptjs\.vscode\settings.json           ← npm 套件作者的
...\node_modules\react-spinners\.vscode\settings.json     ← 同上
go\pkg\mod\dario.cat\mergo@v1.0.2\.vscode\settings.json   ← Go 套件作者的
```

**這些是套件作者在他自己電腦上開發時的設定，跟著原始碼一起發佈了。你的 IDE 根本不會讀它們。**

> 🚫 **看到路徑裡有 `node_modules\` 或 `extensions\` → 直接跳過，不用看。**

---

## 🟣 第四類：Claude Code 的設定（不是 IDE 的）

| 路徑 | 用途 |
|---|---|
| `C:\Users\User\.claude\settings.json` | **Claude Code 全域設定**：權限 allowlist、hooks、環境變數 |
| `<專案>\.claude\settings.json` | 專案層的 Claude Code 設定 |

**注意它在 `.claude\` 不是 `.vscode\`——同名不同家。**
（清單裡那幾個 `prettier-vscode\.claude\settings.json` 一樣是套件作者夾帶的雜訊。）

---

## 🟠 第五類：完全無關的軟體，只是碰巧也叫 settings.json

| 路徑 | 是誰的 |
|---|---|
| `AppData\Local\Packages\Microsoft.WindowsTerminal_*\LocalState\settings.json` | **Windows Terminal** ← 想在 WT 加 Git Bash 分頁就是改這份 |
| `AppData\Roaming\discord\settings.json` | Discord |
| `AppData\Roaming\Postman\storage\settings.json` | Postman |
| `AppData\Local\GitKrakenCLI\settings.json` | GitKraken CLI |
| `AppData\Local\Microsoft\Windows\TaskManager\settings.json` | Windows 工作管理員 |
| `AppData\Local\AudioRelay\settings.json` | AudioRelay |
| `AppData\Roaming\Adobe\...\settings.json` | Adobe Creative Cloud |

---

## 💡 怎麼一眼過濾掉雜訊

### cmd

```cmd
dir /s /b settings.json | findstr /v "node_modules extensions"
```

`findstr /v` = 反向過濾（**v**erbose 的相反，就是 exclude），把含這些字的行剔掉。

### PowerShell

```powershell
Get-ChildItem $env:APPDATA -Recurse -Filter settings.json -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch 'node_modules|extensions' } |
  Select-Object -ExpandProperty FullName
```

---

## 🧭 判斷口訣

| 路徑特徵 | 判斷 |
|---|---|
| 有 `node_modules\` 或 `extensions\` | ❌ **別人的，跳過** |
| `AppData\Roaming\<IDE>\User\` | ✅ **你的個人設定** |
| `AppData\Roaming\<IDE>\User\profiles\<id>\` | ✅ **啟用 Profile 時，這份才生效** |
| `<專案>\.vscode\` | ✅ **專案設定**（優先度比個人設定高） |
| `.claude\` | 🟣 Claude Code 的，不是 IDE 的 |
| 其他 `AppData` 下的軟體資料夾 | 🟠 那個軟體自己的，無關 |

---

## 📌 設定優先順序（下面蓋上面）

```
IDE 內建預設值
   ↓ 蓋掉
User settings        （AppData\Roaming\<IDE>\User\[profiles\<id>\]settings.json）
   ↓ 蓋掉
Workspace settings   （<專案>\.vscode\settings.json）  ← 優先度最高
```

**排查「設定沒生效」時，三層都要看。**
