---
title: ITCSS實戰盤點-official-website全域檔
type: project-audit
updated: 2026-07-20
tags:
  - css
  - itcss
  - tailwind
  - 專案盤點
---

# ITCSS 實戰盤點：official_website 的全域樣式檔

> 本篇重點 a–k，共 11 個
> 相關：[[04-1-CSS方法論與權重-OOCSS-BEM-SMACSS-ITCSS]]（ITCSS 七層理論）、[[03-1-樣式階層表變數定義帶編譯解釋]]（Settings 層的變數）、[[tailwind-arbitrary-value-and-min-height]]（任意值語法）、[[main-tsx進入點-與globals-css的關係]]（為什麼 globals.css 要靠 main.tsx 才生效）
> 盤點對象：`C:\coding\futuresign\futuresign.official_website`　盤點日期：2026-07-20
> 技術棧：Tailwind v4 + shadcn/ui。**沒有 SCSS**，分層靠 `@layer` / `@theme` / `@utility`。

---

## 一‧先找出「真正生效」的全域檔

**(a)** 專案裡有兩個 `globals.css`，只有一個被載入：

| 路徑 | 行數 | 是否被 import | 判定 |
|---|---|---|---|
| `src/styles/globals.css` | 145 | `src/main.tsx:7` | ✅ 唯一生效，ITCSS 的施力點 |
| `styles/globals.css` | 131 | 無任何檔案 import | ❌ 死檔（搬家留下的孤兒） |

**(b)** 找法不要用猜的，用 **import 反查**：
```bash
grep -rn "globals.css" --include=*.tsx --include=*.ts --include=*.html . \
  --exclude-dir=node_modules --exclude-dir=dist
```

**(c)** 觀念：**「檔案存在」≠「檔案生效」**。改了半天樣式沒反應，最常見原因就是改到死檔。

---

## 二‧現況對照 ITCSS 七層

ITCSS 倒三角原則：越上層越通用、特異性越低、影響範圍越廣，詳見 [[04-1-CSS方法論與權重-OOCSS-BEM-SMACSS-ITCSS]]。

**(d)** 生效檔 `src/styles/globals.css` 的分層對照：

| ITCSS 層 | 目前落在哪 | 狀態 |
|---|---|---|
| Settings（變數） | `:root` + `.dark`，L9–82 | 有，74 個變數平鋪無分組 |
| Tools（mixin） | 無 | Tailwind v4 已取代，不需要 |
| Generic（reset） | `@import "tailwindcss"` 內含 preflight | 有 |
| Elements（裸標籤） | `@layer base` 的 `*`、`body`，L124–131 | 只有 2 條，`h1~h6`、`a` 未定義 |
| Objects（版面骨架） | 無 | 完全空白 |
| Components | `src/components/ui/*`（shadcn） | 有，在 TSX 裡 |
| Utilities（Trumps） | `@utility bg-brand` 等，L133–145 | 只有 4 條 |

**(e)** 這個專案不是「沒有 ITCSS」，而是**七層全部擠在一個檔案、且沒有分層註解**，加上 Objects 層缺席。

---

## 三‧可改善點一：兩份 globals.css 已經漂移

**(f)** 死檔沒被 import，卻和生效檔內容約 90% 重複，而且**各自長出了對方沒有的東西**：

| 內容 | `src/styles/globals.css`（生效） | `styles/globals.css`（死檔） |
|---|---|---|
| `--font-sans: 'Geist'` | 無 | 有 |
| `html { overflow-x: hidden }` | 無 | 有 |
| `body { width:100%; position:relative }` | 無 | 有 |
| `--color-brand`（品牌金 #D4AF37） | 有 | 無 |
| `@plugin typography / animate` | 有 | 無 |

**(g)** 這是 ITCSS 最忌諱的「**單一真相來源破裂**」：Settings 層有兩份，改哪份都可能是白工。
處理方式：確認死檔的字型／overflow 設定要不要保留 → 要的話合併進生效檔 → **刪掉根目錄那份**。

---

## 四‧可改善點二：Settings 層形同虛設

**(h)** 生效檔明明定義了品牌色：
```css
--color-brand: #D4AF37;       /* 金沙金 */
--color-brand-dark: #B8960C;
```
但實測硬編碼的量：

| 量測項目 | 指令 | 結果 |
|---|---|---|
| 品牌色硬編碼次數 | `grep -rn "D4AF37\|B8960C" src --include=*.tsx --include=*.ts \| wc -l` | 397 次 |
| 散落檔案數 | `grep -rl "D4AF37\|B8960C" src --include=*.tsx --include=*.ts \| wc -l` | 42 個檔 |
| Tailwind 任意值 `[#xxxxxx]` | `grep -rno "\[#[0-9A-Fa-f]\{3,8\}\]" src --include=*.tsx \| wc -l` | 669 處 |

**(i)** 這是 ITCSS 最常見的失敗模式：**三角形頂端存在，但下層 397 次直接跳過它**。
變數定義了卻沒人用 → 要換品牌色得動 42 個檔案，等於 Settings 層完全沒發揮作用。
修法：顏色掛進 `@theme` 產出 `text-brand` / `bg-brand`，再逐步把 `[#D4AF37]` 換掉。

---

## 五‧可改善點三：Objects 層空白 + inline style

{% raw %}**(j)** `grep -rn "style={{" src --include=*.tsx | wc -l` → **61 處**。{% endraw %}

{% raw %}版面（容器最大寬、區塊垂直間距）沒有抽象層，各元件自己刻。而 inline `style={{}}` 的**特異性最高（1000）**，{% endraw %}
直接繞過整個倒三角，之後想用 class 覆蓋只能靠 `!important` —— 這正是 ITCSS 要避免的死亡螺旋。

---

## 六‧好消息：現在動手成本最低

**(k)** `grep -rn "!important" src --include=*.tsx --include=*.css | wc -l` → **0 次**。

`!important` 零次代表特異性**還沒失控**，問題只是「分層鬆散」而不是「已經爛掉」。
趁還沒有人靠 `!important` 打補丁時整理，是最划算的時機點。

---

## 七‧一句話總結

- 先用 **import 反查**找出真正生效的全域檔，別對死檔動手。
- ITCSS 的價值不在檔案分成幾個，在於**下層不准跳過上層**。
- 這個專案的問題不是「沒有 Settings」，是「**有 Settings 但被繞過 397 次**」。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 專案原始碼盤點（本機） | `C:\coding\futuresign\futuresign.official_website` | 實測於 2026-07-20 |
| ITCSS 七層理論 | 見同資料夾 `04-1-CSS方法論與權重-OOCSS-BEM-SMACSS-ITCSS.md` | 既有筆記 |
