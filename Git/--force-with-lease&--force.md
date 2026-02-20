# Git Push --force vs --force-with-lease

## 比較表

| 指令 | 行為 | 安全性 |
|------|------|--------|
| `git push --force` | 直接覆蓋遠端，不管別人有沒有新 commit | ❌ 危險 |
| `git push --force-with-lease` | 先檢查遠端有沒有別人的新 commit，有的話拒絕推送 | ✓ 安全 |

---

## 什麼時候需要強制推送？

當本地分支和遠端分支歷史不同時，普通 `push` 會被拒絕：

```
遠端: A → B → C
本地: A → B → D  ← 做了 reset 或 rebase 後
```

這時候必須用 `--force` 才能推送。

---

## --force 的風險

```bash
git push --force
```

直接覆蓋遠端，**不檢查**是否有人在你之後推了新 commit。

**危險情境**：
```
你的本地:  A → B → D
遠端:      A → B → C → E  ← 同事剛推了 E
推送後:    A → B → D      ← 同事的 E 被覆蓋消失了！
```

---

## --force-with-lease 的保護

```bash
git push --force-with-lease
```

推送前會**檢查**遠端是否有變動：

**安全情境**：
```
你的本地:  A → B → D
遠端:      A → B → C → E  ← 同事剛推了 E

執行 --force-with-lease:
錯誤！遠端有新的 commit，拒絕推送。
```

這樣你就知道要先 `git fetch` 看看發生什麼事。

---

## 使用建議

| 情境 | 建議指令 |
|------|----------|
| 自己的 feature branch，確定沒人用 | `--force-with-lease`（仍建議用這個） |
| 多人協作的分支 | `--force-with-lease`（必須） |
| 永遠不要用 | `--force` 在共享分支上 |

---

## 簡單記法

- `--force` = 我不管，直接覆蓋
- `--force-with-lease` = 覆蓋前先確認沒人動過（**推薦**）
