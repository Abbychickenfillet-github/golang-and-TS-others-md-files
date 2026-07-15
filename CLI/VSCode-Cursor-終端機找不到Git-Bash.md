
> 現象：IDE 下方終端機的 `˅` 下拉選單裡只有 PowerShell（或 cmd），**沒有 Git Bash 可選**，但電腦明明裝了 Git。

### 📸 問題現象

![[終端機_沒有顯示Git_bash_2026-07-13 131906.png]]

### ✅ 最後解法（先看結論）

**`Ctrl + Shift + P` → `Terminal: Create New Terminal (With Profile)` → 選 Git Bash**

![[Create_New_Terminal(With Profile)_顯示出Git_bash_2026-07-14 111200.png]]

（右側終端機清單最下面出現 `bash` = 成功。詳細踩坑過程見下面各節。）

相關筆記：[[PowerShell-啟動venv與點斜線安全機制]]、[[PowerShell-多指令分隔與netsh防火牆規則]]、[[Unix-與類Unix系統介紹]]、[[where-vs-get-command]]

---

## 1. 先分辨：是「沒裝」還是「有裝但沒列出來」？

這兩件事的解法完全不同，先診斷再動手。

```powershell
# git 執行檔在哪
(Get-Command git).Source
得到# → C:\Program Files\Git\cmd\git.exe 會回傳物件

# Git Bash 的 shell 本體在不在（這才是終端機要跑的東西）
Test-Path "C:\Program Files\Git\bin\bash.exe"   # → True 代表有裝
```

`Test-Path` 回 `True` ⇒ **有裝，只是 IDE 沒把它列進選單**，屬於「設定問題」。

### ⚠️ 陷阱：PATH 上的 `bash` 不是 Git Bash

```powershell
Get-Command bash -All | Select-Object -ExpandProperty Source
```

在 Windows 上很常看到這個結果：

```
C:\Windows\System32\bash.exe                                   ← 這是 WSL 的入口，不是 Git Bash
C:\Users\User\AppData\Local\Microsoft\WindowsApps\bash.exe     ← 也是 WSL（Store 版 App Execution Alias）
```

Git 的 `bash.exe` 藏在 `C:\Program Files\Git\bin\`，**預設不在 PATH 上**（Git 安裝時只把 `cmd\` 加進 PATH，避免它的一堆 Unix 工具汙染系統）。所以「PATH 找得到 bash」不代表「Git Bash 可用」。

| 路徑 | 真身 |
|---|---|
| `C:\Windows\System32\bash.exe` | WSL（Linux 子系統） |
| `C:\Program Files\Git\bin\bash.exe` | **Git Bash**（MSYS2/MinGW 環境） |
| `C:\Program Files\Git\git-bash.exe` | Git Bash 的**視窗啟動器**（會自己開新視窗，不適合當 IDE 整合終端機的 shell） |

> IDE 的 terminal profile 要指的是 `bin\bash.exe`，不是 `git-bash.exe`。

---

## 2. 病根：`terminal.integrated.profiles.windows` 被自訂後蓋掉自動偵測

### 📖 先讀懂這個設定名稱在講什麼

VS Code 的設定用**點號分層**，像資料夾路徑一樣：

```
terminal . integrated . profiles . windows
    ↓          ↓            ↓          ↓
  終端機   「整合式」的      有哪些     給 Windows
           （內嵌在IDE裡）   可選組態    用的
```

| 片段 | 意思 |
|---|---|
| `terminal` | 這組設定跟終端機有關 |
| **`integrated`** | 指**「整合式終端機」**（Integrated Terminal）＝ **內嵌在 IDE 視窗裡**的那個面板。相對的是 **external terminal**（另外開一個 Windows Terminal / cmd 視窗）。<br>⚠️ **它不是「整合」了什麼東西，是在說「這個終端機是內建的」。** |
| `profiles` | **組態清單**。一個 profile ＝ 一組「用哪個執行檔 + 傳什麼參數 + 什麼圖示」 |
| `windows` | 只在 Windows 生效（另有 `.linux`、`.osx`） |

> 整句讀作：**「內嵌終端機在 Windows 上有哪些可選的 shell 組態」**。
> 而 `Terminal: Create New Terminal (With Profile)` 就是**去讀當前生效的 settings.json 裡的這份清單，列出來讓你挑**。

### ⚠️ 致命混淆：「profile」有**兩個**完全不同的意思！

| 哪個 profile | 中文 | 是什麼 |
|---|---|---|
| **Cursor / VS Code Profile** | **IDE 設定檔** | **一整包 IDE 設定 ＋ 擴充套件**，用來在不同專案間切換整套環境。就是 `User\profiles\35100128\` 那個 |
| **Terminal profile** | **終端機組態** | **下拉選單裡的一個 shell 選項**（Git Bash / PowerShell / cmd） |

**它們是包含關係——大的裡面裝小的：**

```
Cursor Profile「35100128」                      ← 大 profile：一整包環境
└── settings.json
    └── terminal.integrated.profiles.windows    ← 小 profile：終端機選項清單
        ├── Git Bash
        ├── PowerShell
        └── Command Prompt
```

> 🔥 **這次卡關的根本原因，就是這兩層搞混了**——把「小 profile」寫進了「沒在用的大 profile」裡，怎麼改都沒反應。詳見 §4.5。

---

VS Code / Cursor 原本會**自動偵測**（auto-detect）系統上的 shell，把 PowerShell、cmd、Git Bash 塞進下拉選單。

但只要你在 `settings.json` 手動寫了 `terminal.integrated.profiles.windows`，這份清單就**以你寫的為準**。像這樣：

```jsonc
// ❌ 只列了 cmd → Git Bash 被擠出選單
"terminal.integrated.profiles.windows": {
  "Command Prompt": {
    "path": "C:\\Windows\\System32\\cmd.exe",
    "args": []
  }
}
```

另一種情況是 Cursor 這類 VS Code 分支：**完全沒設定**，純靠自動偵測，而自動偵測本來就不太可靠（版本落差、Git 裝在非標準路徑都可能偵測失敗）。

**兩種情況的共通解法都一樣：不要靠自動偵測，直接用 `path` 寫死位置。**

---

## 3. 解法：在 settings.json 明確加一個 Git Bash profile

<mark style="background: #D2B3FFA6;">開啟設定檔（`Ctrl + Shift + P` → `Preferences: Open User Settings (JSON)`），加入：</mark>
最後是（`Ctrl + Shift + P` → `Terminal: Create New Profile (JSON)`）解決
![[Create_New_Terminal(With Profile)_顯示出Git_bash_2026-07-14 111200.png]]

```jsonc
"terminal.integrated.profiles.windows": {
  "Git Bash": {
    "path": "C:\\Program Files\\Git\\bin\\bash.exe",
    "args": ["-l"],
    "icon": "terminal-bash"
  },
  "PowerShell": {
    "source": "PowerShell",
    "icon": "terminal-powershell"
  },
  "Command Prompt": {
    "path": "C:\\Windows\\System32\\cmd.exe",
    "args": []
  }
}
```

### 逐項語法解釋

| 欄位 | 意思 |
|---|---|
| `"Git Bash"` | 下拉選單顯示的名字，隨你取 |
| `path` | shell 執行檔的絕對路徑。JSON 裡 `\\` 是**跳脫字元**，代表一個 `\`。所以 `C:\\Program Files\\...` 實際是 `C:\Program Files\...` |
| `args: ["-l"]` | `-l` = login shell，啟動時會載入 `~/.bash_profile`（你的 alias、`ssh-agent` 設定才會生效）。不加也能用，但環境會比較空 |
| `icon` | 分頁上的小圖示，純視覺 |
| `source: "PowerShell"` | 跟 `path` 二選一。`source` 是「交給 VS Code 自己去找」，只有 `PowerShell` 和 `Git Bash` 兩個值可用。既然自動偵測不可靠，Git Bash 就別用 `source`，直接寫 `path` |

### 「加進選單」≠「改成預設」——這是兩個不同的設定

| 設定 | 管什麼 |
|---|---|
| `terminal.integrated.profiles.windows` | 下拉選單裡**列出哪些** shell（＝我要的） |
| `terminal.integrated.defaultProfile.windows` | 按「＋」開新終端機時**自動用哪個** |

只想要「選單裡看得到 Git Bash」的話，**只改 profiles 就好，不要碰 defaultProfile**。

真的想讓 Git Bash 變預設再加這行，值要跟上面的 key 完全一樣：

```jsonc
"terminal.integrated.defaultProfile.windows": "Git Bash"
```

存檔後**不用重開 IDE**，直接開一個新終端機分頁就會看到。

---

### ⚠️ `-l` 是小寫 L，不是數字 1

```jsonc
"args": ["-l"]   // ✅ 小寫 L = login
"args": ["-1"]   // ❌ 數字一，bash 不認得
```

**`-l` = login shell**：bash 啟動時會先去讀 `~/.bash_profile`，把裡面的東西跑一遍再交給你。
（`~` 是家目錄，在 Windows 上就是 `C:\Users\<你>`。）

`~/.bash_profile` ＝「bash 的開機自動執行清單」，典型內容：

```bash
alias gs='git status'          # 打 gs 就等於打 git status
export PATH="$PATH:/c/tools"   # 把自訂工具加進 PATH
eval $(ssh-agent -s)           # 開機就啟動 ssh-agent，git push 不用一直打密碼
```

檢查自己有沒有這些檔案：

```powershell
@(".bash_profile",".bashrc",".profile") | ForEach-Object { "{0,-16} {1}" -f $_, (Test-Path "$env:USERPROFILE\$_") }
```

**如果三個都是 `False`，那 `-l` 目前是空轉、加不加都一樣。** 但還是建議留著：哪天你寫了 `.bash_profile`（設 alias、ssh-agent 免密碼）它會自動生效，不用回頭改設定。零成本的未來保險。

相關：[[SSH-RSA金鑰與ssh-agent-免密碼設定]]

---

### JSON 的 `\\` 跳脫字元

JSON 規定 `\` 是跳脫字元的開頭（`\n` 換行、`\t` tab、`\"` 引號），所以要表達「一個真正的反斜線」得寫兩個：

```
JSON 裡寫：  "C:\\Program Files\\Git\\bin\\bash.exe"
實際的值：    C:\Program Files\Git\bin\bash.exe
```

只寫一個 `\` 的話，解析器會以為你要跳脫下一個字，看到 `\P` 這種無效組合就報錯。

> 💡 偷懶法：Windows 路徑在 JSON 裡**也可以用正斜線** `"C:/Program Files/Git/bin/bash.exe"`，Windows API 兩種都吃，還不用跳脫。

---

## 4. 另一個坑：`automationProfile`

```jsonc
"terminal.integrated.automationProfile.windows": {
  "path": "C:\\Windows\\System32\\cmd.exe"
}
```

這條**跟你手動開的終端機無關**。它管的是 IDE 自動跑東西時用哪個 shell（VS Code Tasks、debug 的 preLaunchTask 等）。改它不會讓下拉選單多出 Git Bash，別搞混。

---
## 4.5 🔥 最大的坑：Cursor 啟用了 Profile，你改的 settings.json 根本沒生效

**症狀：明明照著改了 `User\settings.json`，重開 IDE 還是沒有 Git Bash。**

原因：VS Code / Cursor 有「**設定檔（Profile）**」功能，讓你在不同專案間切換整套設定＋擴充套件。**一旦啟用了某個 profile，IDE 就改讀 profile 專屬的 settings.json，`User\settings.json`（預設 profile 的）會被完全晾在一邊。**

於是機器上會同時存在兩份，你改到錯的那份就毫無反應：

```
%APPDATA%\Cursor\User\settings.json                     ← 預設 profile 的（可能沒在用）
%APPDATA%\Cursor\User\profiles\<一串數字>\settings.json  ← 啟用 profile 時，這份才生效 ✅
```

### 怎麼確認自己中了這個坑

```powershell
# 有沒有 profiles 資料夾？裡面的 settings.json 才是真正生效的那份
$p = "$env:APPDATA\Cursor\User\profiles"
if (Test-Path $p) {
  "有啟用 Profile！真正生效的設定在："
  Get-ChildItem $p -Recurse -Filter settings.json | Select-Object -ExpandProperty FullName
} else {
  "沒有 profiles → 讀的就是 User\settings.json"
}
```

> **最保險的做法：不要用手改檔案，改用 IDE 內建的入口。**
> `Ctrl + Shift + P` → `Preferences: Open User Settings (JSON)`
> 這樣 IDE 一定會幫你打開「當前 profile 實際在用的那一份」，不會改錯。

### 改完要重新載入視窗

Cursor 對 profile 底下的設定變更**不一定會即時熱更新**：

`Ctrl + Shift + P` → `Reload Window` → Enter

### 設定的優先順序（下面蓋上面）

```
預設值（VS Code 內建，含自動偵測到的 shell）
   ↓ 蓋掉
User settings（User\settings.json 或 profiles\<id>\settings.json）
   ↓ 蓋掉
Workspace settings（專案裡的 .vscode\settings.json）← 優先度最高
```

所以如果你的專案裡有 `.vscode\settings.json` 也寫了 `terminal.integrated.profiles.windows`，那**連 User 設定都會被它蓋掉**。排查時三層都要看。

---

## 4.6 改完之後，「那個下拉箭頭」到底在哪？

### ❌ 你很可能按錯按鈕了（實際踩坑）

**面板一窄，VS Code 就會把 `➕` 和 `˅` 收合進 `···`（More Actions）裡——而這個溢出選單「不會」列出 profile 清單：**

![[螢幕擷取畫面 2026-07-14 001357.png]]

☝️ 這是 `···` **更多動作**選單（New Terminal / Clear Terminal / Run Active File…），**裡面根本沒有 profile 選項**。在這裡怎麼點都點不出 Git Bash。

---

終端機面板右上角有**兩組**長得很像的箭頭，功能完全不同：

```
                    這個 ˅ 才是 profile 下拉（跟 ➕ 黏在一起）
                              ↓
   ┌────────────────────────────────────────────────┐
   │  問題   輸出   偵錯主控台   終端機    ➕  ˅   🗑   ⌃  ✕ │
   └────────────────────────────────────────────────┘
                                  ↑   ↑   ↑    ↑
                                  │   │   │    └─ ⌃ = 面板最大化／縮小 ← 你按到的是這個！
                                  │   │   └────── 垃圾桶 = 關閉這個終端機
                                  │   └────────── ˅ = 選 profile 開新終端機 ✅
                                  └────────────── ➕ = 用「預設 profile」開新終端機
```

- 按 **`➕`** → 直接用**預設** profile 開（你的預設是 PowerShell/cmd，所以當然跳出 PowerShell）。
- 按 **`➕` 右邊那個小 `˅`** → 才會**列出所有 profile 讓你選**。
- 最右邊的 `⌃` / `˅` 是**面板最大化/縮小**，跟終端機種類無關。

### ✅ 用鍵盤最保險（那個按鈕又小又難點）

```
Ctrl + Shift + P
→ 輸入：Terminal: Create New Terminal (With Profile)
→ Enter
→ 清單裡選 Git Bash
```

其他好用的命令面板指令：

| 指令 | 作用 |
|---|---|
| `Terminal: Create New Terminal (With Profile)` | **選 profile 開新終端機**（不改預設，只這次） |
| `Terminal: Select Default Profile` | 改預設 profile（**不想改預設就別碰**） |
| `Preferences: Open User Settings (JSON)` | 開「當前 profile 真正在用的」settings.json |
| `Developer: Reload Window` | 重新載入視窗，讓設定生效 |

### ⚠️ 清單裡如果還是沒有 Git Bash

代表**設定根本還沒被載入**，先重新載入視窗：

```
Ctrl + Shift + P  →  Reload Window  →  Enter
```

---

## 4.7 `"args": []` 為什麼是空的？

```jsonc
"Command Prompt": {
  "path": "C:\\Windows\\System32\\cmd.exe",
  "args": []          // ← 空陣列，不是「沒有值」
}
```

`args` ＝ **啟動這個程式時要附帶的命令列參數**，是一個**陣列**。

- `"args": []` → **空陣列 = 我不傳任何參數，用它的預設行為就好。** cmd 開起來本來就是我們要的樣子，不需要額外開關，所以留空。
- `"args": ["-l"]` → 傳一個參數 `-l` 給 bash（login shell）。

等同於在終端機打：

```cmd
cmd.exe              :: args: []      → 什麼都不加
bash.exe -l          :: args: ["-l"]  → 加一個 -l
bash.exe -l -i       :: args: ["-l", "-i"]  → 加兩個，陣列就有兩個元素
```

> **陣列有幾個元素，就是傳幾個參數。空陣列＝零個參數。** 不寫 `args` 這一行也可以，效果跟 `[]` 一樣，寫出來只是明確表態。

---

## 4.8 `C:\Windows` 底下沒有 `Users` 資料夾——它們是**平行**的兩棵樹

這是上面 `dir /s` 找不到檔案的根本原因。很多人會誤以為「Windows 資料夾裝了整個系統，所以什麼都在裡面」，**不是的**：

```
C:\                          ← 根目錄（C 槽最頂層）
│
├── Windows\                 ← 作業系統本體（系統檔案、驅動程式）
│   ├── System32\            ← 系統執行檔（cmd.exe、bash.exe(WSL入口)…）
│   ├── Fonts\
│   └── ...
│
├── Users\                   ← 使用者資料 ★ 跟 Windows 是「兄弟」，不是「子女」！
│   └── User\                ← 你的家目錄（~）
│       ├── Desktop\
│       ├── Documents\
│       └── AppData\         ← 隱藏資料夾！應用程式的設定都在這
│           ├── Roaming\     ← %APPDATA%  → Cursor、VS Code 的 settings.json 在這
│           └── Local\       ← %LOCALAPPDATA%
│
├── Program Files\           ← 安裝的軟體（Git 在這）
└── Program Files (x86)\
```

**`Windows\` 和 `Users\` 是同一層的兄弟，誰也不包含誰。**

所以：

```cmd
C:\Windows\System32> dir /s settings.json
找不到檔案                  ← /s 只往下翻 System32 這棵子樹，翻到天荒地老也到不了 C:\Users
```

> 🌲 **記住這個心智模型：檔案系統是一棵樹，`/s`（或 `-Recurse`）只能「往下」走，不能「往上」再繞到別的分支。**
> **起點站錯，遞迴再深也是白搭。**

---

## 4.9 `cd /d` 的 `/d` 是什麼？

### ⚠️ 先破除誤解：`/d` **不是**「D 槽」！

```cmd
cd /d C:\Users\User
   ↑↑
   這是「開關（旗標）」的名字，不是磁碟機代號
```

`/d` 的 `d` 取自 **d**rive，意思是「**允許順便切換磁碟機**」。可以把它讀成 `cd --allow-drive-change`。

**要去哪個磁碟機，完全由後面那個「路徑」決定：**

```cmd
cd /d C:\Users\User      :: 去 C 槽 ← 路徑寫 C: 就是 C 槽
cd /d D:\projects        :: 去 D 槽 ← 路徑寫 D: 才是 D 槽
cd /d E:\backup          :: 去 E 槽
```

> 😵 **`/d` 和 `D:` 撞名純屬巧合**，超容易混淆。旗標永遠是小寫的 `/d`，磁碟機是大寫加冒號的 `D:`。

### 那 `/d` 到底在解決什麼問題？

cmd 有個很反直覺的化石設計——**`cd` 預設不會切換磁碟機**。

cmd 有個很反直覺的化石設計——**`cd` 預設不會切換磁碟機**，它會替每個磁碟機各自「記住」當前位置：

```cmd
C:\Windows\System32> cd D:\projects
C:\Windows\System32>                  :: ？？？完全沒動！
                                      :: 它只是把「D 槽的當前位置」設成 projects，人還站在 C 槽
```

兩種正確做法：

```cmd
cd /d D:\projects        :: ✅ 一步到位：換磁碟機 + 換目錄
```

```cmd
D:                       :: 先換磁碟機（打磁碟機代號就是換槽）
cd \projects             :: 再換目錄
```

> **同一顆磁碟機內移動不加 `/d` 也行**（例如從 `C:\Windows` 到 `C:\Users`）。但養成加 `/d` 的習慣不會錯。
>
> **PowerShell 沒有這個毛病**，`cd` / `Set-Location` 直接跨槽，因為它不是 DOS 的後代。

---

## 5. 驗證改完沒把 JSON 弄壞

```powershell
Get-Content "$env:APPDATA\Code\User\settings.json" -Raw | ConvertFrom-Json
```

> 📖 **`-Raw` 和 `ConvertFrom-Json` 的完整解釋 → [[PowerShell-ConvertFrom-Json與Raw參數]]**
> 簡單說：`-Raw` 讓 `Get-Content` 吐出**一整個字串**（不加的話會變成**一行一行的陣列**），而 `ConvertFrom-Json` 必須吃**完整的 JSON** 才能解析——餵它切碎的行，它會逐行解析、每行都不合法而爆炸。

### ⚠️ 但這裡有個假警報

VS Code 的 `settings.json` 其實是 **JSONC**（JSON with Comments，允許 `//` 註解），而 PowerShell 的 `ConvertFrom-Json` 是**嚴格 JSON**，看到註解就會噴：

```
Invalid object passed in, ':' or '}' expected.
```

檔案根本沒壞，是驗證工具太嚴格。要驗的話先把註解濾掉：

```powershell
$raw = Get-Content "$env:APPDATA\Cursor\User\settings.json" -Raw
$stripped = ($raw -split "`n" | Where-Object { $_.TrimStart() -notlike '//*' }) -join "`n"
$stripped | ConvertFrom-Json    # 這樣才是真的在驗語法
```

> 記住這個分別：**JSON 不能有註解，JSONC 可以。** VS Code 家族的設定檔（`settings.json`、`launch.json`、`tsconfig.json`）都是 JSONC。

---

## 6. 設定檔位置速查

| IDE | User settings 路徑 |
|---|---|
| VS Code | `%APPDATA%\Code\User\settings.json` |
| Cursor | `%APPDATA%\Cursor\User\settings.json` |
| VS Code Insiders | `%APPDATA%\Code - Insiders\User\settings.json` |

（`%APPDATA%` 展開是 `C:\Users\<你>\AppData\Roaming`；PowerShell 裡寫 `$env:APPDATA`）

---

## 7. 順便釐清的觀念

### `bin` 是「桶子」還是「垃圾桶」？都不是

**`bin` = binary（二進位檔）的縮寫**，Unix 幾十年的傳統，意思是「這個資料夾放編譯好的可執行檔」。跟 recycle bin（垃圾桶）只是英文碰巧同字。

實際看 `C:\Program Files\Git\bin\` 裡面就三個東西，乾乾淨淨全是執行檔：

```
bash.exe
git.exe
sh.exe
```

同樣的慣例到處都是：`/usr/bin`、`node_modules/.bin`、Python venv 的 `Scripts/`（Windows 版把 bin 改叫 Scripts，見 [[PowerShell-啟動venv與點斜線安全機制]]）。

### 「我不記得裝過 bash 啊？」——它是 Git 的附贈品

你沒有單獨裝過 bash。

<mark style="background: #D2B3FFA6;">Git 的很多指令（`git rebase -i`、hooks…）底層是用 **shell script** 寫的，所以 Git for Windows 必須自己扛一套 Unix 環境（MSYS2）進來，bash 就是那套環境的殼。**裝 Git，順便就得到了 bash。**</mark>

### `.exe` 就是機器碼嗎？——幾乎是，但不只是

讀 `bash.exe` 的前兩個 byte：

```powershell
[System.IO.File]::ReadAllBytes("C:\Program Files\Git\bin\bash.exe")[0..1]
# → 0x4D 0x5A  →  字元 "MZ"
```

`MZ` 是 Windows 執行檔（**PE 格式**）的魔術數字（magic number），取自 MS-DOS 開發者 Mark Zbikowski 的名字縮寫。`.exe` 的結構是：

```
PE header      ← 告訴 Windows 怎麼載入我
import table   ← 我需要哪些 DLL
.text 區段     ← 這裡才是真正的 x86-64 機器碼
.data 區段     ← 常數、字串
```

有趣的是 `bash.exe` 只有 **46 KB**，對一個完整 shell 來說小得誇張——因為真正的邏輯在 `msys-2.0.dll` 裡，exe 本體只是薄薄的進入點。

> 所以「exe = 一包機器碼」是好用的心智模型，但嚴格說是「**機器碼 + 給作業系統看的說明書**」。

### WSL 是什麼？為什麼我沒裝它卻有？

**WSL = Windows Subsystem for Linux**，微軟做的，讓你在 Windows 上跑真正的 Linux 核心。

```powershell
wsl --list --quiet     # 列出已安裝的發行版
# → docker-desktop
```

如果只看到 `docker-desktop`，那**不是你手動裝的**——是 **Docker Desktop 自己裝的**。Docker 在 Windows 上要跑 Linux 容器就得有 Linux 核心，它借用 WSL2 當地基。裝 Docker ⇒ WSL 跟著進來。

| | Git Bash | WSL 的 bash |
|---|---|---|
| 執行檔 | `C:\Program Files\Git\bin\bash.exe` | `C:\Windows\System32\bash.exe` |
| 底層 | MSYS2（在 Windows 上**模擬** Unix） | **真的** Linux 核心 |
| 看到的 C 槽 | `/c/Users/...` | `/mnt/c/Users/...` |
| 誰裝的 | Git for Windows | Docker Desktop |

這就是「PATH 上找得到 `bash`」會騙人的原因——找到的是 WSL 那顆。

相關：[[Unix-與類Unix系統介紹]]、[[Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉]]

### 為什麼 `dir "settings.json"` 找不到檔案？

```
你站在：    C:\Users\User\
檔案在：    C:\Users\User\AppData\Roaming\Code\User\settings.json
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 中間隔了四層
```

**`dir` 預設只看當前這一層，不會往下遞迴。** 站在 `C:\Users\User` 叫它找，它只翻了那一層的檔案清單，當然找不到。

#### ⚠️ 更常見的錯：加了 `/s` 還是找不到，因為**起點站錯了**

```cmd
C:\Windows\System32>dir /s "settings.json"
找不到檔案
```

**`/s` 是「從我現在站的地方往下遞迴」，不是「搜尋整台電腦」。**

```
你站在：  C:\Windows\System32\      ← /s 只翻這棵子樹
檔案在：  C:\Users\User\AppData\...  ← 完全不同的一棵樹
```

起點錯了，遞迴再深也翻不到。要先 `cd` 到目標所在那棵樹的上游：

```cmd
cd /d C:\Users\User
dir /s /b settings.json        :: /b = bare，只印路徑不印一堆磁碟區資訊，好讀很多
```

其他寫法：

```cmd
dir "%APPDATA%\Code\User\settings.json"   :: 直接給完整路徑（最快，不用搜）
cd /d "%APPDATA%\Code\User" & dir         :: 先走過去再看
```

PowerShell 的等價寫法（不受起點限制，直接指定要從哪找）：

```powershell
Get-ChildItem -Path $env:APPDATA -Recurse -Filter settings.json -ErrorAction SilentlyContinue
```

三個補充：
- `%APPDATA%` 是 cmd 的環境變數語法，展開＝`C:\Users\<你>\AppData\Roaming`。PowerShell 裡同一個東西寫成 `$env:APPDATA`。
- `AppData` 是**隱藏資料夾**，檔案總管預設看不到，要開「顯示隱藏項目」。
- 想從整顆 C 槽找就 `cd /d C:\` 再 `dir /s /b`，但會很慢又噴一堆「拒絕存取」。**知道大概位置就別全碟搜。**

---

## 8. 執行檔到底是什麼做的？（byte / hex / PE / DLL / 區段）

### 1 byte = 8 bits，`0x` 前綴 = 16 進位

- **bit** 是 0 或 1，8 個 bit 排一起＝ **1 byte**。
- 1 byte 能表示 0～255（2⁸ = 256 種）。
- `0x4D` 的 **`0x` 前綴代表「後面是 16 進位」**（hexadecimal，簡稱 hex）。`0x4D` = 十進位 77。

**為什麼工程界愛用 16 進位？** 因為 **1 個 hex 數字剛好 = 4 個 bit**，兩個 hex 數字剛好 = 1 byte，完美對齊。十進位就沒這種漂亮對應。

```
0x4D  =  0100 1101  =  77  =  字元 'M'
0x5A  =  0101 1010  =  90  =  字元 'Z'
```

所以「讀前 2 個 byte 得到 `4D 5A`」＝「讀開頭 16 個 bit，翻成文字是 `MZ`」。

### PE 格式（不是皮衣 😅）

**PE = Portable Executable（可攜式可執行檔）**，是 **Windows 執行檔的「檔案格式規範」**——規定 `.exe` / `.dll` 內部該怎麼排版，作業系統才知道怎麼讀它。

> **「格式」＝「這包 byte 該怎麼解讀」的約定。**
> `.png` 有 PNG 格式（開頭固定 `‰PNG`）；`.exe` 有 PE 格式（開頭固定 `MZ`）。這種開頭的固定標記叫 **magic number（魔術數字）**。

各系統的執行檔格式：

| OS | 執行檔格式 | 動態函式庫副檔名 |
|---|---|---|
| Windows | **PE** | `.dll` |
| Linux | **ELF** | `.so` |
| macOS | **Mach-O** | `.dylib` |

這就是為什麼 Windows 的 `.exe` 不能直接在 Linux 上跑——**連檔案格式都不一樣，OS 根本看不懂**。

（`MZ` 是 MS-DOS 開發者 **M**ark **Z**bikowski 的名字縮寫，1980 年代的彩蛋，沿用至今。）

### DLL = Dynamic-Link Library（動態連結函式庫）

「二進位程式碼」的直覺對了一半，關鍵在 **Dynamic（動態）**：

| | 靜態連結 | **動態連結（DLL）** |
|---|---|---|
| 何時把函式庫合進來 | **編譯時**，複製一份塞進 exe | **執行時**，exe 啟動才去載入 |
| exe 大小 | 肥（全包在裡面） | 瘦（`bash.exe` 只有 46 KB） |
| 多個程式共用同一函式庫 | 每個 exe 各存一份，浪費 | 記憶體裡**只有一份**，大家共用 |
| 函式庫要更新 | 每個 exe 都得重編 | **換掉 DLL 檔就好** |

這就是 `bash.exe` 只有 46 KB 的原因——bash 的真正邏輯（好幾 MB）住在 `msys-2.0.dll` 裡，`bash.exe` 只是個開機引子。

#### ❓ 有「SLL」嗎？（Static Link Library）

**沒有這個詞。** 靜態函式庫不叫 SLL，副檔名長這樣：

| | Windows | Linux / macOS |
|---|---|---|
| **靜態**函式庫 | `.lib` | `.a`（**a**rchive 的縮寫，就是「一包 `.o` 目的檔的壓縮包」） |
| **動態**函式庫 | **`.dll`** (Dynamic-Link Library) | `.so` (shared object) / `.dylib` |

**為什麼只有 DLL 有專屬縮寫？**

> 因為 **DLL 在執行時是一個真實存在、需要被「找到」的獨立檔案**，所以它必須有名字、有身分。
> 而**靜態函式庫在編譯完成的瞬間就被融進 exe 裡、消失了**——它不需要在執行時被誰叫出來，自然也不需要一個對稱的縮寫。

#### ⚠️ 坑：Windows 的 `.lib` 有**兩種**，同副檔名但完全不同

| `.lib` 的兩種身分 | 裡面裝什麼 | 用途 |
|---|---|---|
| **靜態函式庫**（static library） | **真正的機器碼** | 編譯時整包複製進 exe，之後就不需要它了 |
| **匯入函式庫**（import library） | **只有一張對照表**：「`CreateFileW` 這個函式住在 `KERNEL32.dll` 裡」 | 編譯時用來產生 exe 的 [import table](#import-table匯入表--exe-的我需要哪些-dll-清單)，**執行時仍需要對應的 `.dll` 存在** |

也就是說，看到 `.lib` **不能**直接斷定「這是靜態連結」——它可能只是動態連結的**掛號單**。

```
靜態 .lib   →  [機器碼] ────整包複製───→ my.exe          （之後 .lib 可以刪）
匯入 .lib   →  [對照表] ────填 import table───→ my.exe  →  執行時去找 xxx.dll ← 少了就掛
```

（Linux 沒這個混淆——`.a` 一定是靜態，`.so` 一定是動態，一看副檔名就知道。）

#### 順帶一提：`.o` / `.obj` 是什麼

**編譯的中間產物**，叫「目的檔（object file）」：

```
你的原始碼        編譯 (compile)      連結 (link)
main.c      ──────────────→  main.o  ──────────────→  main.exe
utils.c     ──────────────→  utils.o  ↗              （連結器把 .o 們 + 函式庫
                                                       黏成一個可執行檔）
```

- `.o`（Linux）/ `.obj`（Windows）＝**單一原始碼檔編譯後的機器碼**，但**還不能執行**，因為它裡面呼叫別的檔案的函式時，位址還是空的。
- **連結器（linker）** 的工作就是把這些空位填好、把 `.o` 和函式庫黏成完整的 exe。**「靜態連結 vs 動態連結」講的就是連結器這一步要怎麼做。**
- `.a` 就是「一堆 `.o` 打包成一包」，方便一次餵給連結器。

> 📌 **副檔名速查（編譯產物家族）**
> | 副檔名 | 是什麼 | 能不能直接跑 |
> |---|---|---|
> | `.c` / `.cpp` | 原始碼（人寫的文字） | ❌ |
> | `.o` / `.obj` | 目的檔（單檔編譯後的機器碼，位址未填） | ❌ |
> | `.a` / `.lib` | 靜態函式庫（一包 `.o`） | ❌ |
> | `.so` / `.dll` | 動態函式庫（執行時載入） | ❌（不能單獨跑，但會被 exe 載入） |
> | （無）/ `.exe` | **可執行檔**（PE / ELF 格式，位址都填好了） | ✅ |

#### 🎯 「靜態連結」是不是就是我程式碼最上面寫的 `import`？

**方向對，但要分清楚是哪一層的事。**

- `import` / `require` 是**原始碼層級**的宣告：「我要用哪個模組」。
- 靜態／動態連結是**編譯後的二進位層級**：「這段機器碼要不要複製進我的執行檔」。

它們是**同一個問題在不同階段的表現**。而你其實**天天都在做一樣的決定**，只是名字不同——前端最貼切的類比：

| 二進位世界 | 你熟悉的前端世界 |
|---|---|
| **靜態連結**：編譯時把函式庫的機器碼**複製進 exe** | **打包 bundle**：Webpack/Vite 把 `node_modules` 的 lodash **複製進** `bundle.js` |
| **動態連結（DLL）**：執行時才去外面載入 `.dll` | **CDN `<script>`**：瀏覽器跑到那行才去**外部**抓 `react.min.js` |
| exe 變肥，但自帶一切、不怕缺檔 | bundle 變肥，但一個檔搞定、離線也能跑 |
| exe 很瘦，但**少一個 DLL 就掛掉** | HTML 很瘦，但**CDN 掛掉整站爆炸** |
| 多程式共用記憶體裡的同一份 DLL | 多網站共用瀏覽器快取裡的同一份 CDN 檔 |

> **本質問題永遠是同一個：**
> **「這段別人寫的程式碼，我要現在複製一份帶著走，還是等要用的時候再去外面拿？」**

而 import table 裡寫的東西，概念上就等於：

```js
import { CreateFileW, ReadFile } from 'KERNEL32.dll'
import { fork, pipe, malloc }   from 'msys-2.0.dll'
```

真的很像——只是這份「import 清單」是編譯器幫你寫進 exe 的二進位區塊，不是你手打的原始碼。

### import table（匯入表）＝ exe 的「我需要哪些 DLL」清單

既然真正的邏輯在別人的 DLL 裡，exe 就**必須帶一張清單告訴 Windows：我要哪些 DLL、要用裡面的哪些函式**。這張清單就是 import table：

```
import table:
  msys-2.0.dll  →  我要用 fork()、pipe()、malloc()...
  KERNEL32.dll  →  我要用 CreateFileW()、ReadFile()...
```

Windows 載入 exe 時會先讀這張表 → 把需要的 DLL 一一載進記憶體 → 把函式的實際位址填回去 → 才開始執行 `.text` 裡的機器碼。

> **DLL 少一個，程式直接啟動失敗**——那個經典的「找不到 xxx.dll」錯誤視窗，就是這張表上的東西沒找到。

### 區段（section）＝ exe 內部的分區

| 區段 | 放什麼 | 權限 |
|---|---|---|
| `.text` | **真正的機器碼**（CPU 要執行的指令） | 可讀、可執行、**不可寫** |
| `.data` | 可修改的全域變數 | 可讀可寫、**不可執行** |
| `.rdata` | 唯讀常數、字串字面值 | 唯讀 |

> 💡 「`.text` 不可寫、`.data` 不可執行」這個權限分離是**資安機制**（DEP / NX bit），防止攻擊者把惡意程式碼塞進資料區、再誘導 CPU 去執行它。

**x86-64** 是你 CPU 的**指令集架構（ISA）**，也就是 CPU 認得的機器語言方言。同一支程式編給 x86-64 和編給 ARM64（如 Apple M 系列晶片）的機器碼是完全不同的 bytes——這也是為什麼下載軟體要選對版本。

---

## 9. shell 是什麼？sh 和 bash 差在哪？

### shell ＝ 人類跟作業系統核心溝通的那層「殼」

```
   你（人類）
      ↓ 打指令
 ┌─────────────┐
 │    shell    │  ← 「殼」：把你的文字翻譯成系統呼叫
 └─────────────┘
      ↓
 ┌─────────────┐
 │   kernel    │  ← 「核」：真正管理 CPU、記憶體、硬碟
 └─────────────┘
```

名字就是這個比喻——**kernel 是果核，shell 是包在外面那層殼**，你摸得到殼，摸不到核。

### shell 不是 Unix 專屬！

| Shell | 出身 |
|---|---|
| `sh`、`bash`、`zsh`、`fish` | Unix / Linux |
| `cmd.exe` | Windows（DOS 血統） |
| **PowerShell** | Windows（微軟自己做的現代 shell，且跨平台） |

**PowerShell 也是不折不扣的 shell**，只是語法不同。最根本的差異：

> **bash 在管線裡傳的是「純文字」，PowerShell 傳的是「物件」。**
> 這就是為什麼 PowerShell 可以 `Get-ChildItem | Where-Object { $_.Length -gt 1MB }` 直接取屬性，而 bash 得靠 `awk`/`cut` 切字串。

會覺得 shell 跟 Unix 綁在一起，是因為 **shell script 的文化來自 Unix**。

### `sh.exe` vs `bash.exe`

`C:\Program Files\Git\bin\` 裡兩個都有，差別是：

| | `sh` | `bash` |
|---|---|---|
| 全名 | **Bourne shell** | **B**ourne **A**gain **SH**ell（雙關 "born again"，重生） |
| 誕生 | 1977，Stephen Bourne | 1989，GNU 專案 |
| 定位 | **最小、最標準** | sh 的**加強版** |
| 有什麼 | 基本語法 | ＋自動補全、命令歷史、陣列、更好的字串處理… |

**為什麼兩個都留？** 因為 shell script 開頭常寫 `#!/bin/sh`，代表「這支腳本只用最標準語法，任何 Unix 系統都能跑」。用 `sh` 執行能保證你沒不小心用到 bash 專屬語法（那叫 **bashism**）。

> 口訣：**寫給別人用的腳本用 `sh`，自己互動操作用 `bash`。**

### 所以 Git 為什麼要扛一套 bash 進來？

Git 的很多指令（`git rebase -i`、Git hooks…）**底層就是用 shell script 寫的**。Git 從 Unix 世界移植到 Windows 時，這些腳本總得有東西能跑，所以 Git for Windows 只好把整套 Unix 模擬環境（**MSYS2**）扛過來，bash 就是那套環境的殼。

**你裝 Git ⇒ 順便就得到了 bash。** 這不是你裝錯什麼，是必要的附贈品。

---

## TL;DR

1. `Test-Path "C:\Program Files\Git\bin\bash.exe"` → `True` 就代表有裝，是設定問題。
2. **改了 settings.json 卻沒反應？先查 `%APPDATA%\Cursor\User\profiles\` 有沒有東西**——啟用 Profile 時那份才生效。用 `Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)` 開才不會改錯檔，改完 `Reload Window`。
3. PATH 上的 `bash` 是 **WSL**（Docker 裝的），不是 Git Bash，別被騙。
4. 在 `terminal.integrated.profiles.windows` 明確補上 Git Bash 的 `path`，**不要依賴自動偵測**。
5. **只想「選單多一個選項」就只改 `profiles`**；`defaultProfile` 是另一個設定，不想改預設就別碰它。
6. `dir /s` 是**從當前位置往下**遞迴，站在 System32 當然找不到 AppData 裡的東西——**先 `cd` 到對的起點**。
7. `args: ["-l"]` 是小寫 L（login shell），不是數字 1。
8. `bin` = binary，不是垃圾桶。`DLL` = Dynamic-Link Library。`PE` = Portable Executable。
9. shell ＝ 包在 kernel（核）外面的那層「殼」，**不是 Unix 專屬**，PowerShell 也是 shell。

---

## 附錄：本次實際改動紀錄（2026-07-13 ～ 07-14）

> 從根目錄的 `除錯終端機無法選擇Git bash問題.md` 合併過來，保留原始除錯過程。

### 診斷結果

| 查什麼 | 結果 |
|---|---|
| Git 執行檔 | `C:\Program Files\Git\cmd\git.exe` |
| **Git Bash 本體** | `C:\Program Files\Git\bin\bash.exe` ✅ 存在（v5.2.26） |
| PATH 上的 `bash` | `C:\Windows\System32\bash.exe` ← **是 WSL 的，不是 Git Bash！**（WSL 是 Docker Desktop 裝的，發行版 `docker-desktop`） |
| `~/.bash_profile` | ❌ 不存在（所以 `args: ["-l"]` 目前空轉） |

### 改了哪三份檔案

**1️⃣ VS Code**（`%APPDATA%\Code\User\settings.json`）
原本 `profiles.windows` 只列了 Command Prompt，把 Git Bash 和 PowerShell 補回去：

```jsonc
"terminal.integrated.profiles.windows": {
  "Command Prompt": {
    "path": "C:\\Windows\\System32\\cmd.exe",
    "args": []
  },
  "Git Bash": {                                        // ← 新增
    "path": "C:\\Program Files\\Git\\bin\\bash.exe",
    "args": ["-l"],
    "icon": "terminal-bash"
  },
  "PowerShell": {                                      // ← 新增
    "source": "PowerShell",
    "icon": "terminal-powershell"
  }
}
```

**2️⃣ Cursor 預設 profile**（`%APPDATA%\Cursor\User\settings.json`）
原本完全沒設定，補上同樣一段。**⚠️ 但這份根本沒生效**——見下。

**3️⃣ Cursor 實際生效的 profile** ⭐ 真正解決問題的那份
（`%APPDATA%\Cursor\User\profiles\35100128\settings.json`）

**這是最大的坑**：Cursor 啟用了 Profile 功能，讀的是 `profiles\35100128\` 底下那份，前面兩份改了都沒反應。詳見 [[settings.json滿地都是-哪一份才是我的]]。

### 驗證

```powershell
# 1. JSON 沒被改壞？（注意：settings.json 是 JSONC，有 // 註解會誤報，要先濾掉）
Get-Content "$env:APPDATA\Cursor\User\profiles\35100128\settings.json" -Raw | ConvertFrom-Json

# 2. bash 真的能跑？
& "C:\Program Files\Git\bin\bash.exe" -lc 'echo OK: $BASH_VERSION'
# → OK: 5.2.26(1)-release
```

### 最後怎麼叫出來的

`Ctrl + Shift + P` → **`Terminal: Create New Terminal (With Profile)`** → 選 Git Bash ✅

**沒有改 `defaultProfile`**——只是讓 Git Bash 出現在選單裡，開新終端機的預設仍維持原本的。
