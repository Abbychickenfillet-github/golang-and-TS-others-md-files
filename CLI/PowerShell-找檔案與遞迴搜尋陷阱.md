---
title: "PowerShell-找檔案與遞迴搜尋陷阱"
---

# PowerShell 找檔案 & 遞迴搜尋的陷阱

> 情境：想在硬碟裡找一個檔案，用 CMD 的 `dir /s /b` 找不到；也想搞懂 `(Get-Command git).Source` 為什麼拿得到路徑。

---

## 一、`(Get-Command git).Source` 為什麼會有路徑？

```powershell
PS C:\coding\futuresign\Abby-notes> (Get-Command git).Source
C:\Program Files\Git\cmd\git.exe
```

**因為 PowerShell 管線裡跑的是「物件」，不是文字。** 這是它跟 CMD / Bash 最根本的差異。

- `Get-Command git` 回傳的不是一行字串，而是一個 **`ApplicationInfo` 物件**。
- 這個物件身上掛著一堆屬性：`Name`、`CommandType`、`Version`、`Source`、`Path`…
- 外層小括號 `( )` = 「先把裡面執行完，結果視為一個物件」，再用 `.Source` 讀出「執行檔完整路徑」這個屬性。

```powershell
Get-Command git | Format-List *     # 看它身上到底有哪些屬性
(Get-Command git).Source            # 只取路徑
(Get-Command git).Version           # 順便還能拿版本號
```

### ⚠️ `.Source` 的陷阱：不一定是路徑

`.Source` 的內容取決於 `CommandType`：

| CommandType | `.Source` 是什麼 | 例子 |
|---|---|---|
| `Application`（外部 exe） | ✅ 執行檔完整路徑 | `git`, `node`, `python` |
| `ExternalScript`（.ps1） | ✅ 腳本完整路徑 | `claude.ps1` |
| `Cmdlet` | ❌ **模組名稱**，不是路徑 | `Get-ChildItem` → `Microsoft.PowerShell.Management` |
| `Alias` | ❌ 要再用 `.ResolvedCommand` 追下去 | `dir` → `Get-ChildItem` |

```powershell
(Get-Command dir).CommandType        # Alias
(Get-Command dir).ResolvedCommand    # Get-ChildItem  ← 追到真身
```

> 這也是 [[CLAUDE.md 疑難排解]] 裡那則「`claude` 殼有了但跑不起來」會看到 `ExternalScript claude.ps1` 的原因：
> npm 全域安裝在 Windows 上會放 `claude`、`claude.cmd`、`claude.ps1` 三個殼。

### 為什麼上面 `Get-ChildItem` 這一列，`.Source` 給的是模組名不是路徑？

先扣回本篇主題：**你是在用 `.Source` 找「這個指令住在哪」**。它找不找得到位置，取決於這個指令背後**有沒有一個實體檔案**——這跟第三節「用 `Get-ChildItem` 找檔案在哪」是同一種「定位」動作。而巧的是，**第三節那個 `Get-ChildItem`，它本身就是個 cmdlet**，正好是這裡的反例。

**cmdlet（唸 command-let）= PowerShell 內建的指令**，像 `Get-ChildItem`、`Get-Command`、`Select-Object` 這些「動詞-名詞」格式的都是。它不是硬碟上一個你能單獨執行的檔案，而是**寫在某個模組（DLL）裡、只活在 PowerShell 內部的一段 .NET 程式碼**——所以它根本沒有「路徑」可以給你。

| 對照 | `git`（Application，有實體檔） | `Get-ChildItem`（Cmdlet，沒實體檔） |
|---|---|---|
| 本體是什麼 | 硬碟上一個獨立的 `.exe` 檔 | 一個 .NET 類別，包在 DLL 模組裡 |
| 誰執行它 | 作業系統另開一個新行程 | PowerShell 行程內部直接呼叫 |
| 離開 PowerShell 還能跑嗎 | ✅ CMD 裡打 `git` 一樣動 | ❌ 只活在 PowerShell 裡 |
| `.Source` 回什麼 | ✅ 路徑（找得到「住哪」） | ❌ 模組名（沒實體檔，只能說住哪個模組） |
| 像什麼 | 街上獨立店面，報得出門牌 | 美食街裡的櫃位，沒門牌，只能說在哪家百貨 |

```powershell
(Get-Command Get-ChildItem).Source
# Microsoft.PowerShell.Management   ← 模組名，不是路徑！
```

**為什麼標「陷阱」：** 你本來是想用 `.Source` 定位指令、期待拿到一條路徑；但這句語法對 cmdlet 完全合法、不報錯，卻回你一個「模組名稱」。**以為有路徑，結果給模組名**，最容易誤會壞掉。（`.Source` 沒壞，它回的是「出身來源」——exe 的出身是檔案，cmdlet 的出身是模組。）

→ 這條規則同時解釋了本篇兩件事：**找指令**時 `.Source` 對 cmdlet／alias 沒有路徑可給；**找檔案**時你用的 `Get-ChildItem`（見第三節）正是這樣一個「沒有 exe 的 cmdlet」。

---

## 二、為什麼 `dir /s /b` 找不到檔案？（最常踩的雷）

```cmd
C:\Users\User> dir /s /b "Claude對於push到遠端是會出錯的啊.md"
找不到檔案
```

但檔案明明在 `C:\coding\futuresign\Abby-notes\claude CLI\Claude對於push到遠端是會出錯的啊.md`，**同一顆 C 槽啊？**

### 🔑 病根：`/s` 是「從目前目錄往下遞迴」，不是「掃整顆磁碟」

```
C:\                          ← 根
├── Users\
│   └── User\                ← 你人在這裡（cwd）
│       └── ...              ← /s 只掃這棵子樹
└── coding\                  ← 檔案在這裡
    └── futuresign\
        └── Abby-notes\
            └── claude CLI\
                └── Claude對於push到遠端是會出錯的啊.md   ← 掃不到！
```

`C:\Users\User` 和 `C:\coding` 只是**兄弟**，共同掛在 `C:\` 底下。
**同一顆磁碟 ≠ 同一棵子樹。**

### ✅ 解法：把搜尋起點拉到根目錄

```cmd
dir /s /b "C:\*push到遠端*"
```
（會很慢，因為要掃整顆 C 槽。已知大概位置就縮小範圍。）

---

## 三、PowerShell 裡正確的找檔案方式

### ❌ 不要在 PowerShell 打 `dir /s /b`

PowerShell 的 `dir` 是 `Get-ChildItem` 的**別名**，它不吃 `/s` `/b` 這種 CMD 斜線參數 —— 會把 `/s` 當成一個「路徑」去解析然後報錯。

### ✅ 標準寫法

```powershell
Get-ChildItem -Path C:\coding -Recurse -Filter "*push到遠端*" -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName
```

輸出：
```
C:\coding\futuresign\Abby-notes\claude CLI\Claude對於push到遠端是會出錯的啊.md
```

### 三個必記重點

| 參數 | 為什麼要 |
|---|---|
| `-Recurse` | 才會往子資料夾鑽（等同 CMD 的 `/s`） |
| `-Filter "*關鍵字*"` | **由檔案系統底層過濾，比 `-Include` 快很多**，找檔名優先用它 |
| `-ErrorAction SilentlyContinue` | 掃到沒權限的資料夾（如 `C:\Windows\System32\Config`）會噴紅字，用這個吞掉 |

**起點盡量縮小。** `-Path C:\` 會慢到想關視窗；已知在 `C:\coding` 就從那裡開始。

### 縮寫版（互動時打字用）

```powershell
gci C:\coding -r -fi "*push到遠端*" -ea 0 | % FullName
```
- `gci` = Get-ChildItem，`-r` = -Recurse，`-fi` = -Filter，`-ea 0` = -ErrorAction SilentlyContinue
- `%` = ForEach-Object

### 想搜「檔案內容」而不是檔名？

```powershell
Select-String -Path "C:\coding\futuresign\Abby-notes\*.md" -Pattern "push到遠端" -Recurse
```
（`Select-String` ≈ PowerShell 版的 `grep`，見 [[grep-options]]）

---

## 四、`where.exe`：Windows 內建的遞迴找檔

```cmd
where /r C:\coding *push到遠端*
```

⚠️ **在 PowerShell 裡要寫 `where.exe`**（加副檔名），因為裸 `where` 被 `Where-Object` 的別名佔走了：

```powershell
where.exe /r C:\coding *push到遠端*    # ✅
where /r C:\coding *push到遠端*        # ❌ 被當成 Where-Object，語法錯
```

---

## 五、快速對照表

| 我要做的事 | CMD | PowerShell |
|---|---|---|
| 找「指令」裝在哪 | `where git` | `(Get-Command git).Source` |
| 找「檔案」在哪（遞迴） | `dir /s /b "C:\*關鍵字*"` | `gci C:\ -r -fi "*關鍵字*" -ea 0` |
| 找「檔案內容」 | `findstr /s /i "關鍵字" *.md` | `Select-String -Pattern "關鍵字" -Path *.md -Recurse` |
| 遞迴起點 | **目前所在目錄**（易踩雷） | `-Path` 明確指定（不易踩雷） |

---

## 相關筆記
- [[where-vs-get-command]] —— `Get-Command` vs `where` 的完整比較、批次檔 `%%` 陷阱
- [[powershell-vs-bash]]
- [[Bash-vs-PowerShell設計哲學差異md]] —— 「傳物件 vs 傳文字」的哲學根源
- [[grep-options]]
- [[ls-options]]
- [[glob-pattern-guide]] —— `*` `?` 萬用字元怎麼寫
