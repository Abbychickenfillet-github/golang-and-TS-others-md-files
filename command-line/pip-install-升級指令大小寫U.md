---
title: pip install 升級指令大小寫（-U 不是 -u）
type: topic-note
source: Gemini
tags: [gemini, pip, python, command-line, 套件管理]
sources:
  - https://gemini.google.com/app/328e8c00c60c288a
updated: 2026-06-15
---

# pip install 升級指令大小寫（-U 不是 -u）

## 重點整理

pip 的升級參數是<mark style="background: #FFF3A3A6;">大寫 `-U`</mark>（或完整 `--upgrade`）。終端機指令<mark style="background: #FF5582A6;">大小寫敏感</mark>，輸入小寫 `-u` 會直接報錯且不執行：

```bash
pip install -u sentence-transformers
# no such option: -u   ← 完全沒安裝
```

正確寫法：

```bash
# 升級套件（大寫 U）
pip install -U sentence-transformers
# 或完整名稱
pip install --upgrade sentence-transformers
```

> [!info] 「報錯卻又執行了」的誤會
> 不是 pip 忽略錯誤自動執行，而是<mark style="background: #ADCCFFA6;">連續下了兩行指令</mark>：第一行 `-u` 報錯沒執行，下一行是乾淨的 `pip install sentence-transformers`（無升級參數）才正常安裝（連同 transformers、torch、scikit-learn 等相依套件）。

## 各對話來源
### Pip 指令大小寫誤會釐清（2026-06）— https://gemini.google.com/app/328e8c00c60c288a

使用者：這個一開始說 no such option 結果還是執行了欸？ → Gemini：誤會啦，是輸入了兩次指令。第一行 `pip install -u ...` 因為升級參數要大寫 `-U`、終端機大小寫敏感，所以報 `no such option: -u` 沒執行；下一行 `pip install sentence-transformers`（無參數）才正常安裝。升級請用 `-U` 或 `--upgrade`。
