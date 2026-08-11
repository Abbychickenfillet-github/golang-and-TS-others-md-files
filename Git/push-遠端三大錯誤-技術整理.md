---
title: "push-遠端三大錯誤-技術整理"
---

# push 到遠端的三大錯誤（技術整理）

> 這是 [[Claude對於push到遠端是會出錯的啊]]（你的個人踩雷心得／過程紀錄）的**技術整理版**：
> 那篇記「發生什麼事＋心得」，這篇記「為什麼會錯＋怎麼修」。
>
> 2026-07 把本地筆記推上 GitHub 時，連環踩了三個坑。

---

## 坑 1：`commit` ≠ `push`，而且 origin 指到錯的 repo

- **現象**：明明本地一直有 commit，GitHub 上卻停在 2 個月前。
- **原因 A**：`git commit` 只把變更存到**本地**版本庫，要 `git push` 才會上傳到遠端。
- **原因 B（更根本）**：這台的 `origin` 竟指向**別人／錯誤帳號**的 repo
  （`ssh://…/abbyfuturesign/Abby-notes.git`），根本不是自己的。

```bash
git remote -v                 # 看 origin 指到哪裡（先確認！）
git remote remove origin      # 移除錯誤的
git remote add origin https://github.com/<你的帳號>/<repo>.git
```

> 💡 **教訓**：Claude 這次**沒先 `git fetch` 確認**、只憑本地快取就斷定「帳號錯了、分岔了」，差點誤導。動遠端前務必先 `git remote -v` 對照帳號、`git fetch` 拿真實狀態，別憑當下理解下結論。

---

## 坑 2：本地與遠端「分岔」(diverged)

- **現象**：`git status` 出現 `ahead 204, behind 132`。
- **意思**：本地領先 204 個 commit（沒 push），但遠端也有 132 個本地沒有的 commit
  → 兩邊從某個「分岔點」後各走各的。
- **後果**：**不能直接 `git push`**（會被拒 non-fast-forward）。
- **選擇**：
  - 合併：`git pull`（保留兩邊，但同檔不同版會有一堆衝突要解）
  - 以本地為準覆蓋：`git push --force-with-lease`（**先備份**！被覆蓋的東西才救得回）

> ⚠️ 覆蓋前一定要備份：分支備份 `git branch backup/xxx`＋整包 `git bundle create x.bundle <ref>`。

---

## 坑 3：GitHub Secret Scanning 擋 push（最容易嚇到）

- **現象**：push 被拒，remote 訊息說偵測到 API key，給一個
  `.../security/secret-scanning/unblock-secret/<id>` 網址。
- **原因**：某個 commit 裡有憑證（我這次是 4/30 對話裡不小心貼的一把 Google 憑證）。

### ❓ 那個 unblock URL 是 SSH 才會回傳的嗎？→ 不是！
- 它是 **GitHub 伺服器端功能**，跟你用 **SSH 或 HTTPS 無關**，兩種都會回傳。這次就是走 HTTPS 收到的。
- **未登入點進去會 404**：GitHub 對「沒權限的人」假裝該頁不存在（安全設計），不是網址壞掉。登入且是 repo 擁有者才看得到。

### 兩種解法
1. **清除**（最乾淨）：把 key 從**整個歷史**換掉再推
   ```bash
   pip install git-filter-repo
   git filter-repo --replace-text rules.txt --force   # rules.txt: 金鑰==>[REDACTED]
   ```
   ⚠️ `filter-repo` 要求工作區乾淨，且在非互動環境要加 `--force`（否則會卡在確認、EOF 中止）。
2. **允許**：登入 GitHub 點那個 unblock URL → 選原因 → 允許，再 push 即可。
   （缺點：key 會留在 GitHub 歷史。所以不管哪種，**都應該去把那把 key 撤銷／rotate**。）

---

## 附帶學到：工作區 / 暫存區 / 版本庫 三個區

| 區域 | 白話 | 怎麼進去 |
|------|------|----------|
| **工作區** working tree | 你正在編輯的檔案本體 | 用編輯器改檔 |
| **暫存區** staging / index | 「準備 commit」的清單 | `git add` |
| **版本庫** repository | 已定版的歷史 | `git commit` |

- 為了跑 filter-repo，需要**乾淨工作區**，所以先把未 commit 的改動「拍照存底」再退回：
  ```bash
  git diff --binary HEAD > wip.patch   # 先把工作區改動存成 patch
  git checkout -- .                    # 把工作區退回 HEAD（清乾淨）
  # …做完事…
  git apply wip.patch                  # 把改動還原回「工作區」
  ```
- **重點**：`git apply` 是還原回**工作區**（仍未 `git add`），**不是**放進暫存區。
  動到工作區的是 `checkout -- .` 和 `apply`；要進暫存區才是 `git add`。

---

## 這次最後怎麼收尾

```bash
git remote add origin https://github.com/<我的帳號>/<repo>.git
git ls-remote origin                 # 先探測遠端有沒有內容
git push -u --force-with-lease=main:<遠端目前commit> origin main
git status -sb                        # ## main...origin/main（無 ahead/behind = 同步）
```

## 排錯：`git fetch` 失敗 `Host key verification failed`

- **意思**：用 **SSH** 連 GitHub 時，本機 `~/.ssh/known_hosts` 沒有 GitHub 的主機金鑰，SSH 不敢連。
- **後果**：fetch 不到最新遠端 → 只能靠本地快取分析（**容易誤判**，見坑 1 的教訓）。
- **修**：
  ```bash
  ssh-keyscan github.com >> ~/.ssh/known_hosts   # 加入 GitHub 主機金鑰
  # 或乾脆改用 HTTPS remote，避開 SSH 金鑰問題
  ```

---

## 🧠 這次最大的教訓（當成規矩）

> **動 push／remote 前，先「確認上游在哪」，不要用當下 prompt 的理解就覆蓋。**

- 這次 Claude 沒先 fetch、沒先 `git remote -v` 對照就認定帳號、分析分岔 → 差點把 204 個 commit 推錯地方。
- 正確順序：`git remote -v`（帳號對不對）→ `git fetch`（拿真實遠端）→ `git status -sb`（看 ahead/behind 與上游）→ **才動手**。
- 覆蓋一律 `--force-with-lease`（不是裸 `-f`）＋ 事前備份（分支 + bundle）。

---

## 🔗 從這裡延伸出去（抽象層 / bash）

為了「用 git 指令檢查上游」，才發現連 **Git Bash 終端機都叫不出來** → 延伸出一串更底層的問題：

- Git Bash 是什麼？什麼時候被裝進來的？路徑在哪？
- 怎麼手寫指令？怎麼找到 profile？參數 `-l`（login shell）是什麼意思？
- `.dll` 是什麼？
- → 詳見 [[比較Git bash 與Docker WSL bash]]

---

## 相關筆記
- [[git-追蹤上游分支-set-upstream]]（上游 / tracking branch）
- [[git-split-commit-and-diverged]]
- [[git-line-endings-notes]]（LF/CRLF）
