---
title: Git Revert 與 Reset 混用—已 Push 後該選哪一個
type: topic-note
source: Gemini
tags: [gemini, git, revert, reset, version-control]
sources:
  - https://gemini.google.com/app/b07320f45ea92dfa
updated: 2026-07-18
---

# Git Revert 與 Reset 混用—已 Push 後該選哪一個

> 🔖 本篇重點索引：a–i，共 9 個。

## 重點整理

**(a)** <mark style="background: #ADCCFFA6;">兩者可以混用</mark>：`git revert` 與 `git reset` 是獨立操作，可以先 revert 再 reset（例如反悔了 revert 本身，或想回到更早的狀態），但因為兩者處理歷史的方式完全不同，混用時要特別注意「目前的提交狀態」與「是否已推送到遠端」。

**(b)** <mark style="background: #FFF3A3A6;">核心差異一句話</mark>：`git revert` 會<mark style="background: #BBFABBA6;">新增一筆提交</mark>來抵消改動，不破壞既有歷史；`git reset` 是<mark style="background: #FF5582A6;">直接移動 HEAD 指標</mark>，等於改寫／砍掉歷史。

**(c)** <mark style="background: #ADCCFFA6;">Reset 的生活比喻</mark>：`git reset` 就像單機遊戲的「讀檔（Load Game）」——覺得目前進度玩爛了，直接載入之前的存檔，假裝這段時間沒發生過。

**(d)** <mark style="background: #FFB8EBA6;">Reset 三種模式的破壞程度</mark>：

| 模式 | 破壞程度 | 程式碼會怎樣 | 適用情境 |
|---|---|---|---|
| `--soft` | 最安全 | 完全保留，只取消 Commit 紀錄，程式碼留在暫存區（Staging Area） | 想重寫 Commit 訊息、合併多個 Commit |
| `--mixed`（預設） | 中等 | 保留程式碼，但移出暫存區，回到剛寫完 code、還沒 `git add` 的狀態 | 不小心把不相關檔案一起 add，想重新整理 |
| `--hard` | 最危險 | 紀錄與程式碼都直接蒸發，完全回到過去那個時間點 | 徹底寫爛了，完全不想要這段改動 |

**(e)** <mark style="background: #FF5582A6;">Reset 的唯一鐵律</mark>：還沒 Push（只在自己電腦上）——隨便 reset，線圖乾淨；已經 Push（推上遠端了）——絕對不要用 reset，因為會讓自己的歷史紀錄跟別人的對不上，團隊協作時線圖會爆炸，這時要改用 `git revert`。

**(f)** <mark style="background: #ADCCFFA6;">已 Push 後為什麼非得用 revert 不可（圖解邏輯）</mark>：假設遠端與同事的紀錄都是 `A → B → C`（C 是你寫壞、已 push 的提交）。若用 `reset`：你把本地歷史砍成 `A → B`，但遠端與同事仍是 `A → B → C`；`git push` 會被拒絕（歷史衝突），必須 `git push -f` 強推洗掉遠端紀錄，同事下次 `pull` 可能因此錯亂，甚至又把壞掉的 C 融合同步回來。若用 `revert`：Git 產生一個新提交 D，內容是把 C 的改動整個反過來抵銷，歷史變成 `A → B → C → D`（撤銷 C 的提交）；這是正常的「向前推進」紀錄，直接 `git push` 就能送上伺服器，同事 pull 下去只會看到多一個新提交，專案不會打結。

**(g)** <mark style="background: #FFB8EBA6;">已 Push 後的救磚流程</mark>：

```bash
# 1. 找出想取消的那個 Commit ID
git log --oneline

# 2. 執行 Revert（會跳出編輯器讓你確認/修改 Commit 訊息，預設已幫你寫好 Revert "原訊息"）
git revert c123456

# 3. 安全推上遠端
git push origin <你的分支名稱>
```

**(h)** <mark style="background: #D2B3FFA6;">先 Revert、後 Reset 的實際情境舉例</mark>：Step 1 `git revert <commit_id>` 會計算出該提交的「相反改動」並自動建立新提交（如 `Revert "Add login feature"`），Commit History 增加一條紀錄。Step 2 若接著 `git reset --hard HEAD~1`，會直接抹除剛剛產生的 Revert 提交；若 `git reset --hard <更早的 Hash>`，則會跳過 Revert 狀態，直接回到更早的歷史點。

**(i)** <mark style="background: #FF5582A6;">協作中的大忌與更安全的替代做法</mark>：不要對已 Push 的分支使用 `reset`——如果你 revert 之後已經 push 到遠端，接著又在本地 `reset` 掉那個 revert，會導致本地分支落後於遠端，下次 push 會被拒絕（除非強推 `-f`，但會讓同事的線圖爆炸）。<mark style="background: #BBFABBA6;">單純想取消剛剛的 revert</mark>：更安全的做法是再 `revert` 一次那個「撤銷提交」，這樣歷史紀錄最清晰，不需要動用 reset。

## 各對話來源

### Git Revert 與 Reset 混用筆記（2026 年）— https://gemini.google.com/app/b07320f45ea92dfa

<mark style="background: #FFF3A3A6;">使用者：git reset 跟 git revert 我可以先用 git revert 之後又用 git reset 嗎？</mark>

Gemini：（見上方重點 a、h）可以混用，說明兩者本質差異，並舉例先 revert 後 reset 的兩種結果；附上核心差異對照表與「不要對已 push 分支用 reset」的協作警告（重點 i）。

使用者：Reset 是什麼意思？

Gemini：（見上方重點 b–e）用「讀檔」比喻解釋 reset，列出 `--soft`／`--mixed`／`--hard` 三種模式的破壞程度與適用情境，並強調已 push 後絕對不要用 reset 的鐵律。

使用者：所以已經 push 要用 revert 嗎？

Gemini：（見上方重點 f–g）確認並用圖解邏輯說明為什麼 push 後必須用 revert（避免歷史衝突與強推風險），附上已 push 後的實際救磚指令流程。

## 資料來源（含查證時間）

> 查證日期：2026-07-18（本篇為 Gemini 依 Git 官方行為原理生成的教學說明，核心指令與模式定義可對照 Git 官方文件核實）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| `git-reset` 官方文件（--soft/--mixed/--hard） | [Git — git-reset Documentation](https://git-scm.com/docs/git-reset) | 官方文件，持續更新 |
| `git-revert` 官方文件 | [Git — git-revert Documentation](https://git-scm.com/docs/git-revert) | 官方文件，持續更新 |
| Force push 風險說明 | [Git — git-push Documentation（--force 段落）](https://git-scm.com/docs/git-push) | 官方文件，持續更新 |

## 相關筆記

- Reset 三種模式的暫存區（Index）機制細節（既有筆記，未合併，因該篇無 Gemini 來源標記且格式不同）：[[git-reset-modes]]
- `--force` 與 `--force-with-lease` 的差異：[[--force-with-lease&--force]]
