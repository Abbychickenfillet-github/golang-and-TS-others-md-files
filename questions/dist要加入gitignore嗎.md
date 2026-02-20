# dist/ 要加入 .gitignore 嗎？

## 問題
`frontend/dist/` 是每次跑 `npm run build` 會產生的檔案，應該要「刪除」還是「隱藏（加入 .gitignore）」？

CI/CD 每次 git push 都會重新生成，那是不是應該刪除但不能加入 .gitignore？

## 答案
**應該加入 .gitignore** ✓

## 原因

### 1. 為什麼要加入 .gitignore？
- `dist/` 是 build 產出的靜態檔案，不是原始碼
- 不應該 commit 到 git repository
- 每個人的 build 結果可能不同（環境變數、時間戳等）
- 會讓 repo 變得很大（每次 build 都會改變）

### 2. CI/CD 流程說明
```
本地開發                          CI/CD 伺服器
─────────                        ─────────────
git push ────────────────────→  拉取程式碼
                                     ↓
                                npm install
                                     ↓
                                npm run build
                                     ↓
                                產生新的 dist/（在伺服器上）
                                     ↓
                                部署到生產環境
```

**重點：CI/CD 是在伺服器上重新 build，產生的 `dist/` 是伺服器上的，跟本地的 `dist/` 完全無關。**

### 3. .gitignore 的作用

**.gitignore 只影響 git，不影響檔案的產生！**

```
.gitignore 的作用：
✗ 不會阻止檔案被建立
✗ 不會阻止程式執行
✓ 只是告訴 git「不要追蹤這個檔案」
```

所以即使 `dist/` 被 .gitignore 忽略：
- CI/CD 伺服器執行 `npm run build` 時，**依然可以產生 dist/**
- 這個動作跟 .gitignore 完全無關
- .gitignore 只管「不要把 dist/ 存進 git」，不管「能不能產生 dist/」

### 4. 追問：被隱藏了但部署當下還是可以跑嗎？

**可以！** 詳細流程：

```
1. CI/CD 伺服器從 git 拉取程式碼
   → dist/ 不在裡面（因為被 .gitignore 忽略，從未 commit）

2. 執行 npm install
   → 安裝所有依賴

3. 執行 npm run build
   → 在伺服器上「新建」一個 dist/ 資料夾 ✓
   → 這個動作跟 .gitignore 完全無關

4. 部署 dist/ 到生產環境
   → 完全正常運作 ✓
```

**結論：.gitignore 不會影響 CI/CD 的 build 和部署過程。**

## 結論

| 動作 | 說明 |
|------|------|
| `dist/` 加入 .gitignore | ✓ 正確，應該保留 |
| 本地 `dist/` 可以刪除 | ✓ 隨時可刪，只是本地預覽用 |
| CI/CD 不受影響 | ✓ 每次都會重新 build |

## 類似的目錄（都應該 .gitignore）
- `node_modules/` - npm 套件
- `dist/` - build 產出
- `.tanstack/` - TanStack Router 快取
- `.vite/` - Vite 快取
- `*.log` - log 檔案
