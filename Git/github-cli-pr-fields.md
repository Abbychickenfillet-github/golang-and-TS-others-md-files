# GitHub CLI PR 查詢欄位筆記

## 指令格式

```bash
gh pr view <PR號碼> --repo <owner/repo> --json <欄位1>,<欄位2>,...
```

`--json` 後面接的是你要查詢的欄位名稱，多個欄位用逗號分隔。

---

## 常用欄位說明

| 欄位名稱 | 中文意思 | 說明 |
|----------|---------|------|
| `title` | PR 標題 | Pull Request 的標題文字 |
| `body` | PR 內文 | Pull Request 的描述內容（Markdown） |
| `headRefName` | 來源分支 | PR 是從哪個分支發出的（head = 頭 = 來源） |
| `baseRefName` | 目標分支 | PR 要合併到哪個分支（base = 基底 = 目標，通常是 `main`） |
| `state` | PR 狀態 | `OPEN`（開啟中）、`CLOSED`（已關閉）、`MERGED`（已合併） |
| `statusCheckRollup` | CI 檢查結果 | 所有 CI/CD 檢查的摘要（成功、失敗等） |

### headRefName vs baseRefName 圖解

```
headRefName (來源分支)          baseRefName (目標分支)
fix-booth-setting       →→→     main
   你的修改                      要合到這裡
```

---

## 其他常用欄位

| 欄位名稱 | 中文意思 |
|----------|---------|
| `number` | PR 編號 |
| `author` | PR 作者 |
| `url` | PR 網址 |
| `createdAt` | 建立時間 |
| `mergedAt` | 合併時間 |
| `additions` | 新增行數 |
| `deletions` | 刪除行數 |
| `files` | 變更的檔案列表 |
| `reviewDecision` | 審查決定（APPROVED / CHANGES_REQUESTED / REVIEW_REQUIRED） |
| `labels` | 標籤列表 |
| `assignees` | 指派的人 |

---

## 實際範例

```bash
# 查看 PR #278 的基本資訊
gh pr view 278 --repo yutuo-tech/futuresign_backend --json title,headRefName,baseRefName,state

# 查看 PR 的 CI 檢查狀態
gh pr checks 278 --repo yutuo-tech/futuresign_backend

# 查看 PR 變更了哪些檔案
gh pr view 278 --repo yutuo-tech/futuresign_backend --json files --jq '.files[].path'

# 查看 PR 的所有可用欄位（列出所有欄位名）
gh pr view 278 --repo yutuo-tech/futuresign_backend --json
```

### `gh pr checks` 指令

```bash
gh pr checks <PR號碼> --repo <owner/repo>
```

這個指令會顯示 PR 關聯的所有 CI 檢查結果，包括：
- 檢查名稱（如 `Build and Test`）
- 狀態（`pass` / `fail` / `pending`）
- 執行時間
- 詳細連結

---

## `--jq` 參數

`--jq` 可以用 jq 語法過濾 JSON 輸出：

```bash
# 只取 CI 失敗的檢查名稱
gh pr view 278 --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion == "FAILURE") | .name'

# 取得所有變更檔案的路徑
gh api repos/owner/repo/pulls/278/files --jq '.[].filename'
```
