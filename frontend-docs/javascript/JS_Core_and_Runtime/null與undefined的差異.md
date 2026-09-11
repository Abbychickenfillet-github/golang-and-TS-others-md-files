---
title: "null 與 undefined 的差異（已併入 JS 基本型別總覽 §6）"
type: redirect-note
tags: [javascript, null, undefined, 型別, redirect]
related:
  - "[[JavaScript資料型別總覽-原始型別與物件]]"
  - "[[15-ReferenceError-vs-undefined-值與錯誤的分界]]"
updated: 2026-09-09
---

# null 與 undefined 的差異 → 已合併

依 Abby 指示「放同一篇、別另開」，本主題已**併入 JS 基本型別總覽**：

- **null vs undefined 完整對照（含 typeof／JSON／`==`/`===`／`Number()`／預設參數／`??`、記憶體格）**：見 [[JavaScript資料型別總覽-原始型別與物件]] 的 **§6 null 與 undefined**。
- **undefined vs 沒宣告（ReferenceError）／TDZ／var-let-const 排列組合**：見 [[15-ReferenceError-vs-undefined-值與錯誤的分界]]。

一句話：**undefined＝引擎說的空（未賦值/沒 return/沒有的屬性/少傳參數）；null＝你手動賦的空。系統從不自動給 null。**
