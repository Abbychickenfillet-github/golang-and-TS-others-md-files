# 檢查指令是否存在：PowerShell vs CMD

> 情境：想知道某個指令（python / pip / conda…）有沒有裝、裝在哪個路徑。

## PowerShell：`Get-Command`

```powershell
foreach ($c in 'python','python3','pip','conda') {
    $g = Get-Command $c -ErrorAction SilentlyContinue
    if ($g) { "{0} -> {1}" -f $c, $g.Source }
}
```
- `Get-Command` 找不到時會報錯，用 `-ErrorAction SilentlyContinue` 吞掉。
- `.Source` 是執行檔完整路徑。
- 同名指令只回**第一個**（PATH 中最先命中的）。

## CMD：`where`

CMD 沒有 `Get-Command`，對應工具是 `where`（功能類似 Linux 的 `which`）。

### ① 直接在 CMD 視窗貼（單一 `%`）
```cmd
for %c in (python python3 pip conda) do @where %c 2>nul
```

### ② 存成 .bat 批次檔（必須雙 `%%`）
```bat
@echo off
for %%c in (python python3 pip conda) do (
    for /f "delims=" %%p in ('where %%c 2^>nul') do echo %%c -^> %%p
)
pause
```

## 兩者差異重點

| 項目 | PowerShell `Get-Command` | CMD `where` |
|------|--------------------------|-------------|
| 找不到時 | 報錯（需 `-ErrorAction SilentlyContinue`） | 印到 stderr（用 `2>nul` 吞） |
| 變數寫法 | `$c` | 視窗 `%c`／批次檔 `%%c` |
| 回傳數量 | 只回第一個命中 | **全部**命中路徑都列（較囉嗦） |
| 特殊符號跳脫 | 不需要 | `>` `&` 要用 `^` 跳脫（`2^>nul`、`-^>`） |

## 為什麼批次檔要 `%%` 不是 `%`
CMD 在「批次檔」裡會把單一 `%` 當成參數展開符號，所以迴圈變數要寫成 `%%`；但在「互動式 CMD 視窗」直接打指令時則用單一 `%`。這是新手最常踩的雷。

## 相關
- 語音工具盤點時用到此技巧，見 [[我的電腦語音輸入工具盤點]]
