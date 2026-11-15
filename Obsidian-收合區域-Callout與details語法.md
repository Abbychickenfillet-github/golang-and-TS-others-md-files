---
title: Obsidian 收合（Toggle）區域 — Callout 折疊與 details 兩種寫法
type: topic-note
source: Gemini
tags: [gemini, obsidian, markdown]
sources:
  - https://gemini.google.com/app/5b06de02048edd6e
updated: 2026-11-11
---

# Obsidian 收合（Toggle）區域

> 本篇重點 a–d，共 4 個。

## 重點整理

(a) <mark style="background: #FFF3A3A6;">Obsidian 做收合區有兩種寫法</mark>：[Callout](https://help.obsidian.md/callouts) 折疊語法，或 HTML 的 [`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) 標籤。

| 寫法 | 語法 | 預設狀態 | 特色 |
|---|---|---|---|
| Callout 折疊 | `> [!note]- 標題` | `-` 收合、`+` 展開 | Obsidian 原生，有圖示與配色 |
| details | `<details><summary>標題</summary>…</details>` | 收合 | 標題文字完全自訂，內容可寫 Markdown |

(b) Callout 的類型字可換成 `faq`、`summary`、`todo` 等，圖示與顏色會跟著變。

(c) 寫法範例：

```markdown
> [!note]- 點擊展開
> 被收合的內容，每一行都要以 `> ` 開頭。
```

```html
<details>
<summary>點了會展開的標題</summary>

這裡的內容支援 **Markdown**（summary 與內容之間要空一行）。

</details>
```

(d) 與本 vault 的關聯：互動 HTML 筆記裡的「點一下隱藏重點」功能是用 JS 的 mark 切換，而 Obsidian 內原生要折疊就用本篇語法；HTML Reader 預設模式會移除 script，見 [[CLAUDE]] 的說明。

### ⚠️ 存疑／更正

(e) Gemini 說「Callout 內容要空一行再按 Tab 縮排」是錯的：Callout 內容每一行都必須以 `>` 開頭，中間若空一行（沒有 `>`）會讓 Callout 在該處結束。

## 各對話來源（原文摘要）

### Obsidian 收合區域教學（2026-11-11 抓取）— https://gemini.google.com/app/5b06de02048edd6e

使用者：所以 obsidian format 要裝 toggle 區域怎麼用

Gemini：建議用 Callout `> [!note]-` 或 `<details>`，後面加減號預設收合。（內容已整合於上方）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話 | https://gemini.google.com/app/5b06de02048edd6e | 2026-11-11 抓取 |
| Obsidian Callouts | https://help.obsidian.md/callouts | 官方說明，2026-11-11 引用，未逐頁核對版本 |
| details 元素 | https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details | MDN，2026-11-11 引用 |
