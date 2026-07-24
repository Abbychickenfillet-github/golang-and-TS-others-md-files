---
tags: [Git]
---

# ref、branch、HEAD 的關係

本篇重點 a–i，共 9 個。

## (a) ref 是大分類，branch/tag/HEAD 是底下的成員

`ref`（reference）指「存在 `.git/refs/` 底下、指向某個 commit SHA 的名字」，是最上層概念，不是跟 branch/HEAD 並列的另一個選項：

| 種類 | 存放路徑 | 特性 |
|---|---|---|
| branch | `refs/heads/<name>` | 隨 commit 自動往前移動 |
| tag | `refs/tags/<name>` | 通常釘死指向某 commit，不會自動移動 |
| remote-tracking branch | `refs/remotes/<name>/<branch>` | 本地記錄的「上次看到的遠端分支狀態」，fetch 時才更新 |
| HEAD | `.git/HEAD`（特殊檔案） | 一個指向其他 ref 的 ref（symbolic ref），代表目前所在分支：`HEAD → refs/heads/main → commit SHA` |

`git push` 的 `<refspec>`（[[repoint-company-repo-to-personal-account]] 有詳解）兩邊填的通常是 branch，但技術上任何 ref（含 tag）都能填。

## (b) ref 的唯一性 + HEAD 到底是誰在動

- 同一個 ref 名字（如 `refs/heads/main`）任何時刻只指向**一個** commit SHA。
- 是 **branch 這個 ref 在動**：每 commit 一次，`refs/heads/<branch>` 檔案內容就換成新 SHA。
- **HEAD 只是指著目前的 branch**（`.git/HEAD` 內容是 `ref: refs/heads/main` 這種指示，不是直接存 SHA），所以是 HEAD 跟著 branch 走，不是 branch 跟著 HEAD 走。
- 例外是 **detached HEAD**（例如 checkout 到某個舊 commit）：這時 `.git/HEAD` 會直接寫死一個 SHA，不再指向任何 branch，HEAD 自己獨立移動。

## (c) refspec 的 `<src>` 可以直接填 commit SHA，不一定要是 branch 名

```bash
# 把某個特定 commit 推上去，變成遠端 main 的新 tip
git push origin <commit-sha>:refs/heads/main

# 若遠端 main 目前指的 commit 不是這個 SHA 的祖先（等於改寫歷史/回退），要加 + 強制
git push origin +<commit-sha>:refs/heads/main
```

被覆蓋的是 `<dst>` 那個 ref 名字**原本**指到的 commit——git 只認 ref 名字，覆蓋掉的自然是那個名字之前指的東西，不需要另外指定「要蓋掉哪個 commit」。

## (d) `git branch -M main`：把 `master` 改名成 `main`

`-M`（大寫，強制 rename）：新建 `refs/heads/main` 指向同一個 commit → 砍掉 `refs/heads/master` → `HEAD` 改指向 `refs/heads/main`。用大寫是因為就算目的地名字已存在也會強制覆蓋；小寫 `-m` 遇到同名會拒絕執行。

## (e) push 誰蓋過誰，看的是「能不能 fast-forward」，不是 commit 數量

- 不加 `--force`：只有當「遠端目前指的 commit」是「要推的 commit 的祖先」才准許（fast-forward）。兩個 0 相似度的歷史永遠不是祖先關係，**不管誰的 commit 多，一律直接被拒絕**：`! [rejected] main -> main (non-fast-forward)`
- 加 `--force` / `+`：**誰按下去誰贏**，跟資料多寡完全無關，就算對方有 1000 個 commit 也照樣覆蓋
- 不同分支名字互推完全不衝突，可以和平共存在同一個 remote repo；只有「兩邊搶同一個 ref 名字」才會有覆蓋問題

## (f) 空資料夾（沒有任何 commit）根本推不動

`git init` 完但還沒 `git add` + `git commit` 之前，`refs/heads/<branch>` 這個 ref 檔案還不存在（unborn branch）。這時候 `git push` 會直接報錯：
```
error: src refspec main does not match any
```
沒有 commit 就沒有東西可以比較，更不會發生「空的蓋掉有內容的」。

## (g) commit 是 DAG（有向無環圖）上的節點

- **有向**：每個 commit 都有指向 parent 的指標，方向固定
- **無環**：不可能繞回自己
- **圖**：一般 commit 只有一個 parent（一條線），**merge commit 有兩個 parent**，所以整體是圖不是線

Git 的 DAG 更精確說是 **Merkle DAG**（Merkle 是發明這種結構的人名，不是縮寫）。核心規則：**每個節點的 hash = 自己的內容 + 它連結的節點的 hash 一起算出來的**。套到 commit 上：`commit SHA = hash(快照內容 + parent 的 SHA + metadata)`。因為 parent 的 hash 被吃進自己的 hash 裡，這件事會一路遞迴回創世 commit，帶來兩個效果：
- **竄改必被發現**：歷史任何地方被改，那個 commit 的 hash 就變，往後所有子孫 commit 的 hash 也會跟著全變
- **相同就是同一份物件**：兩條分支只要走到同一個 SHA，git 不會存兩份，就是同一個物件被共用

**兩個「0 相似度」的資料夾，就是兩條完全沒有交集的 DAG**——這正是它們無法 fast-forward 的根本原因。（跟一般驗證用的 Merkle Tree 差在：Merkle DAG 允許多 parent，是從多個 tip 往回指共同的根，不是單一 root 往下長。）

圖解：[Merkle DAG 圖解](https://claude.ai/code/artifact/d0b2f6ad-a36e-416c-a6f9-cb2872387d35)（含 Merkle Tree vs Merkle DAG 方向對照）

推論：只要兩個分支上有**同一個 SHA 的 commit**，它們的整條祖先鏈**必然完全相同**（不可能中途分岔又剛好走回同一點），因為 parent 身分是被烤進 hash 裡的，不是巧合相等。

## (h) 練 refspec 不需要真的多開一個 local branch

`git push origin main:main` 這行本身就已經是在用 refspec 了（只是剛好 src=dst 同名）。要練 src≠dst，只要改 `<dst>` 的名字即可：
```bash
git push origin main:main-copy   # 遠端多一個 main-copy 分支，local 不用多開分支
```

## (i) `origin` 不是保留字，只是慣例——而且跟 `remote add` 的自動命名是兩回事

`origin` 對 git 沒有任何特殊意義。精確講法要分開兩種情況，不能混為一談：

| | `git clone <url>` | `git remote add <name> <url>` |
|---|---|---|
| 名字從哪來 | git **自動預設**取名叫 `origin`（`git clone` 內建行為，可用 `--origin 別名` 覆蓋） | `<name>` 是**必填位置參數**，完全沒有預設值，一定要你自己打 |
| 你打別的字會怎樣 | 要加 flag 才能改 | 打 `git remote add banana <url>`，這個 remote 就真的叫 banana，git 不會擅自改成 origin |

所以 `git remote add origin <url>` 裡的 `origin`，不是 git 幫你決定的，是你自己選擇沿用跟 `git clone` 一樣的慣例字串打出來的。可以改名（`git remote rename origin foo`）效果完全一樣。技術上甚至能建一個叫 `origin` 的 local branch，git 不會混淆，因為 `git push [<repository>] [<refspec>...]` 這個語法**用位置**決定誰是 repository、誰是 refspec，跟名字本身無關。

### push 輸出的 `..` vs `...`：怎麼分辨這次是 fast-forward 還是強制覆蓋

```
5c92d3a..a74438e  feature/experiment -> main     # 兩個點、沒有 +，是 fast-forward
+5c92d3a...a74438e  feature/experiment -> main   # 三個點、開頭有 +，是強制覆蓋（non-fast-forward）
```
就算指令有加 `--force`，只要 git 判斷本來就能 fast-forward，還是會照 fast-forward 處理、輸出兩個點——`--force` 只在真的需要覆蓋時才會發揮作用。

### 常見報錯：寫了 refspec 卻沒有先填 repository

synopsis 其實是巢狀的 `[<repository> [<refspec>…​]]`——`<refspec>` 包在 `<repository>` 的括號**裡面**，代表 `<repository>` 只有在「同時不寫 `<refspec>`」時才能省略；一旦要寫 `<refspec>`，`<repository>` 這個位置就必須先填。這不是「慣例上大家都寫」，是**位置式參數解析**的硬性規則：git 從左到右讀，第一個非 flag 參數永遠被讀成 `<repository>`。

```
git push feature/experiment:main
# fatal: 'feature/experiment:main' does not appear to be a git repository
```
沒填 `<repository>`，git 就把你打算當 refspec 的那串字整個誤讀成 repository 名字去找，當然找不到。要寫成：
```bash
git push origin feature/experiment:main
```

## 相關筆記
- [[repoint-company-repo-to-personal-account]]
- [[git-merge-shared-ancestry]]
