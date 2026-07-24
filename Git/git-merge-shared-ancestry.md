---
tags: [Git]
---

# merge commit 與共同祖先的 DAG 結構

本篇重點 a–b，共 2 個。

練習情境：test1 的 commitB 和 test2 的 commitF 是同一個 commit（曾經 merge 過），test1 之後又自己推進到 commitG，test2 沒有繼續動。

## (a) 該 test1 merge test2，還是 test2 merge test1？

**建議 test1 merge test2**——因為情境裡「merge 之後還繼續 commit 到 G」的是 test1，代表 test1 才是 merge 完還會繼續發展的主線；如果反過來，應該是 test2 推進到 G 才符合邏輯。

```bash
git checkout test1
git merge test2   # 產生 merge commit，兩個 parent 分別是 test1 舊 tip 和 test2 tip
```

merge 完 test1 的 tip 會變成這個新的 merge commit。若要讓 test2 的 tip 也變成同一個 commit（讓 B 真的等於 F），要另外對 test2 做一次 fast-forward：
```bash
git checkout test2
git merge test1   # 因為 test1 已完整包含 test2 的歷史，這裡會是 fast-forward，不會產生新 commit
```

## (b) merge 點之前的歷史為什麼「必然」相同

畫成圖：

```
              A（共同祖先）
             / \
   test1: A-T1x-T1y      test2: A-T2x-T2y
             \             /
              \           /
               M  ← 這就是 B = F（test1 merge test2 的 merge commit，
                    test2 fast-forward 過來後兩邊 tip 才會是同一個 SHA）
               |
              G（只有 test1 繼續往前，test2 停在 M）
```

Git 的 commit 是 **Merkle DAG** 節點：一個 commit 的 SHA 是「快照內容 + parent 的 SHA」一起算出來的，parent 的身分被永久烤進自己的 hash。所以只要兩個分支上有**同一個 SHA**，它們的整條祖先鏈就**必然完全一致**——不可能中途分岔又剛好在後面走回同一個點，這不是巧合，是 hash 結構保證的。

## 相關筆記
- [[git-ref-vs-branch-vs-head]]
- [[repoint-company-repo-to-personal-account]]
