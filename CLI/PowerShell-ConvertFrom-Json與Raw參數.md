---
title: "PowerShell-ConvertFrom-Json與Raw參數"
---

# PowerShell：`ConvertFrom-Json` 與 `-Raw` 參數

> 為什麼 `Get-Content 檔案 -Raw | ConvertFrom-Json` 一定要加 `-Raw`？

相關筆記：[[VSCode-Cursor-終端機找不到Git-Bash]]、[[settings.json滿地都是-哪一份才是我的]]、[[PowerShell-多指令分隔與netsh防火牆規則]]

---

## 1. 一句話總結

```powershell
Get-Content settings.json -Raw | ConvertFrom-Json
        ↑                  ↑    ↑        ↑
     讀檔案            讀成「一整   管線    把 JSON 字串
                       個字串」    餵過去   解析成物件
```

**「把檔案完整讀成一個字串 → 交給 JSON 解析器 → 變成可以用 `.` 取屬性的物件」**

---

## 2. `-Raw` 到底在做什麼？

**PowerShell 的 `Get-Content` 預設會「按行切開」，回傳一個字串陣列。**

假設 `x.json` 內容是：

```json
{
  "name": "Abby",
  "age": 18
}
```

### ❌ 不加 `-Raw`（預設行為）

```powershell
Get-Content x.json
```

回傳的是**陣列**，每一行是一個元素：

```powershell
[
  '{',
  '  "name": "Abby",',
  '  "age": 18',
  '}'
]
```

### ✅ 加了 `-Raw`

```powershell
Get-Content x.json -Raw
```

回傳的是**一整個字串**（含換行字元）：

```powershell
'{\n  "name": "Abby",\n  "age": 18\n}'
```

> 💡 **`-Raw` = 「給我原始的、未經切割的完整內容」。**

---

## 3. 為什麼 `ConvertFrom-Json` 非要 `-Raw` 不可？

因為 **`ConvertFrom-Json` 要吃「一份完整的 JSON 文字」**才能解析。

**如果你餵它一個「一行一行的陣列」**，PowerShell 的管線會**逐一**把每個元素送過去，於是它會試圖把**每一行單獨當成一個 JSON** 來解析：

```
沒有 -Raw：
  '{'                  →  ConvertFrom-Json  →  💥 不合法（只有一個左括號）
  '  "name": "Abby",'  →  ConvertFrom-Json  →  💥 不合法（殘缺片段）
  '  "age": 18'        →  ConvertFrom-Json  →  💥 不合法
  '}'                  →  ConvertFrom-Json  →  💥 不合法

有 -Raw：
  '{ "name":"Abby", "age":18 }'  →  ConvertFrom-Json  →  ✅ 得到物件
```

> 🔑 **一份 JSON 是「一個整體」，切開就不是 JSON 了。** 所以必須用 `-Raw` 保持完整。

---

## 4. `|`（管線 pipeline）是什麼

**把左邊指令的輸出，當作右邊指令的輸入。**

```powershell
Get-Content x.json -Raw  |  ConvertFrom-Json
└────── 輸出字串 ──────┘ ↓ └── 拿字串當輸入 ──┘
                      餵過去
```

### ⚠️ PowerShell 的管線傳的是「物件」，不是「純文字」

這是 PowerShell 跟 bash 最根本的差異：

| | 管線裡流的是什麼 |
|---|---|
| **bash** | **純文字**（所以要用 `awk`、`cut`、`sed` 切字串） |
| **PowerShell** | **物件**（可以直接 `.` 取屬性） |

```powershell
# PowerShell：直接取屬性，不用切字串
Get-ChildItem | Where-Object { $_.Length -gt 1MB } | Select-Object Name, Length
```

```bash
# bash：只能對文字下手
ls -l | awk '$5 > 1048576 { print $9, $5 }'
```

---

## 5. 解析完之後怎麼用？

`ConvertFrom-Json` 回傳的是 **PSCustomObject**，用 `.` 一層層取值：

```powershell
$o = Get-Content settings.json -Raw | ConvertFrom-Json

$o.'terminal.integrated.profiles.windows'.'Git Bash'.path
# → C:\Program Files\Git\bin\bash.exe
```

> **為什麼屬性名要加引號 `'...'`？**
> 因為 `terminal.integrated.profiles.windows` 這個 key **本身就含有點號**。不加引號的話，PowerShell 會把點號當成「取下一層屬性」的運算子，就找錯地方了。
> 加上引號 = 「這一整串是一個 key 的名字，別拆」。

### 列出所有 key

```powershell
$o.'terminal.integrated.profiles.windows'.PSObject.Properties.Name
# → Git Bash, PowerShell, Command Prompt
```

`.PSObject.Properties.Name` 是 PowerShell 的內省（reflection）語法，用來問「這個物件身上有哪些屬性？」

---

## 6. 🚨 陷阱：VS Code 的 settings.json 是 **JSONC**，`ConvertFrom-Json` 會誤報！

```powershell
Get-Content "$env:APPDATA\Cursor\User\settings.json" -Raw | ConvertFrom-Json
# → Invalid object passed in, ':' or '}' expected.   ← 檔案根本沒壞！
```

**原因：**

| | 能不能有 `//` 註解 |
|---|---|
| **JSON**（嚴格標準） | ❌ **不行** |
| **JSONC**（JSON with Comments） | ✅ **可以** |

**VS Code 家族的設定檔（`settings.json`、`launch.json`、`tsconfig.json`）都是 JSONC**，裡面可以寫註解。但 PowerShell 的 `ConvertFrom-Json` 是**嚴格 JSON 解析器**，看到 `//` 就報錯。

### 解法：先把註解濾掉再解析

```powershell
$raw = Get-Content "$env:APPDATA\Cursor\User\settings.json" -Raw
$stripped = ($raw -split "`n" | Where-Object { $_.TrimStart() -notlike '//*' }) -join "`n"
$stripped | ConvertFrom-Json     # ← 這樣才是真的在驗語法
```

逐句拆解：

| 片段 | 意思 |
|---|---|
| `-split "`n"` | 用換行字元把整個字串**切成一行一行**（`` `n `` 是 PowerShell 的換行跳脫字元） |
| `Where-Object { ... }` | 過濾器，只留下符合條件的行 |
| `$_` | 「當前這一行」（管線裡的當前物件） |
| `.TrimStart()` | 去掉行首的空白（因為註解可能有縮排） |
| `-notlike '//*'` | **不是**以 `//` 開頭的（`*` 是萬用字元） |
| `-join "`n"` | 把剩下的行**重新黏回一整個字串** |

> ⚠️ 這個做法只濾掉「整行都是註解」的行，**行尾註解**（`"a": 1, // 備註`）濾不掉。要完整處理得用 regex，但驗語法用這招通常夠了。

---

## TL;DR

1. **`-Raw`** = 「檔案讀成**一整個字串**」，不加的話會變成**一行一行的陣列**。
2. **`ConvertFrom-Json` 必須吃完整的 JSON**，餵它切碎的行會逐行解析 → 每行都不合法 → 爆炸。所以**一定要 `-Raw`**。
3. **`|` 管線**：左邊的輸出餵給右邊。PowerShell 管線傳的是**物件**（bash 傳純文字）。
4. 解析結果是 **PSCustomObject**，用 `.` 取值；**key 裡有點號時要用 `'...'` 包起來**。
5. 🚨 **VS Code 的 settings.json 是 JSONC（可以有註解），`ConvertFrom-Json` 會誤報語法錯誤**——先濾掉 `//` 開頭的行再驗。
