# 2>/dev/null 解釋

## 簡單說明

`2>/dev/null` 是用來**隱藏錯誤訊息**的。

## 拆解

| 符號 | 意思 |
|------|------|
| `2` | 標準錯誤輸出 (stderr) |
| `>` | 重新導向 |
| `/dev/null` | Linux/Unix 的「黑洞」，任何寫入的東西都會消失 |

## 三種輸出

```
0 = stdin  (標準輸入)
1 = stdout (標準輸出) - 正常訊息
2 = stderr (標準錯誤) - 錯誤訊息
```

## 範例

```bash
# 不隱藏錯誤
ls /不存在的資料夾
# 輸出: ls: cannot access '/不存在的資料夾': No such file or directory

# 隱藏錯誤
ls /不存在的資料夾 2>/dev/null
# 輸出: (什麼都沒有)
```

## 常見用法

```bash
# 只隱藏錯誤，保留正常輸出
command 2>/dev/null

# 隱藏所有輸出（正常 + 錯誤）
command > /dev/null 2>&1

# 簡寫版本（bash 4+）
command &>/dev/null
```

## 為什麼要用？

1. **腳本中**：不想讓使用者看到預期中的錯誤訊息
2. **檢查檔案是否存在**：`ls file 2>/dev/null && echo "exists"`
3. **避免畫面雜亂**：只關心指令是否成功，不關心錯誤細節
