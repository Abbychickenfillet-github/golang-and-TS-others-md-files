# .gitignore 筆記

## 語法說明

| 語法 | 意思 |
|------|------|
| `**/folder/` | 忽略任何位置的 folder 資料夾及其內容 |
| `**/folder/**` | 同上，但多餘（`/` 結尾已表示資料夾） |
| `folder/` | 只忽略根目錄的 folder |
| `*.log` | 忽略所有 .log 檔案 |
| `**/*.log` | 忽略任何位置的 .log 檔案 |

## 個人筆記資料夾設定

在 `.gitignore` 加入：
```
# personal notes
**/Abby-Notes/
```

這樣可以在專案任何位置建立 `Abby-Notes/` 資料夾，都不會被 git 追蹤。
