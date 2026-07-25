---
title: YAML Frontmatter、SSG 概念與 Foreword/Preface/Introduction 辨析
type: topic-note
source: Gemini
tags: [gemini, frontmatter, yaml, ssg, markdown, 英文詞彙]
sources:
  - https://gemini.google.com/app/325a079bd35b874b
updated: 2026-07-23
---

# YAML Frontmatter、SSG 概念與 Foreword/Preface/Introduction 辨析

本篇重點 a–e，共 5 個

## 重點整理

a. <mark style="background: #ADCCFF;">SSG</mark>（Static Site Generation，靜態網站生成）指「先把 Markdown／CMS 資料 + 前端模板在 Build 階段編譯成純 HTML/CSS/JS，再部署到 CDN 或伺服器」的架構。流程為：

```
[Markdown 檔案 / CMS 資料] + [前端模板 (React/Vue/HTML)]
                      ↓ (Build 構建階段)
               [純 HTML / CSS / JS 檔案]
                      ↓ (部署)
                [CDN / 伺服器]
```

b. <mark style="background: #BBFABB;">SSG 的三大優勢</mark>:速度極快（伺服器不用即時運算，直接吐現成 HTML，搭配 CDN 幾乎秒開）、安全性高（沒有後端伺服器與資料庫，減少 SQL 注入等攻擊面）、成本低廉(靜態檔案託管如 GitHub Pages、Cloudflare Pages、Vercel 通常免費或極便宜)。代表工具:Next.js(`output:'export'` 或 `getStaticProps`)、Astro、Hugo、Gatsby。

c. <mark style="background: #ADCCFF;">Foreword / Preface / Introduction 辨析</mark>(容易搞混的書籍前置頁面用詞):

| 詞彙 | 中文譯名 | 主要撰寫者 | 核心內容與目的 |
|---|---|---|---|
| Foreword | 推薦序 | 第三方專家／名人 | 替作者背書、推薦這本書、說明重要性 |
| Preface | 自序／前言 | 作者本人 | 說明為何寫這本書、寫作過程與致謝 |
| Introduction | 導論／引言 | 作者／編者 | 介紹書籍核心內容、背景知識，幫助讀者理解正文 |

一秒記憶法:Foreword→他人寫的推薦序;Preface→作者自己的自序;Introduction→進入正文前的導讀。

d. <mark style="background: #FF5582;">YAML frontmatter 常見錯誤</mark>:

- frontmatter 區塊必須放在檔案「最上方」,並用 `---` 包覆(開頭與結尾各一行三個減號),否則系統(如 Obsidian、SSG 工具)無法正確解析。
- 一般欄位(如 `tags`)直接寫成 `key: value` 形式,`:` 後面留一個空格;`-` 開頭的減號語法是用來表示「清單(list)中的項目」,不是每個欄位都要加減號 —— 誤把 `-` 加在單一欄位前面會造成解析錯誤。

e. <mark style="background: #FFB8EB;">Highlightr 螢光筆規則的一致性判斷</mark>:遇到「這算不算警告(紅色)還是補充(粉色)」的邊界案例時,依「規則本身在說什麼」判斷而非望文生義 —— 例如人眼視網膜對藍光敏感的機制說明,雖帶有「否定/限制」語氣,但本質是背景知識補充而非「不要做」的警告,因此仍應歸類為粉色(數據/補充),以維持個人筆記色碼系統的一致性。

## 各對話來源(原文，節錄)

### Frontmatter 的由來與演變 (2026-07-23) — https://gemini.google.com/app/325a079bd35b874b

**使用者:** 你說了「SSG是static site generation嗎?」

**Gemini:** 是的，完全正確！SSG 就是 Static Site Generation...(見重點 a、b)

**使用者:** 你說了「"Foreword" 解釋」

**Gemini:** Foreword 指的是書籍或著作開頭的「推薦序」或「序言」...(見重點 c)

**使用者:** 你說了「帮我检查这边的front matter有没有问题?」

**Gemini:** 標籤設定寫成了 dash 接著中括號外層，開頭多了一個減號...(見重點 d)

**使用者:** 你說了「穿笔记应该用什么颜色的荧光笔...」(詢問人眼視網膜抗藍光理論該標紅色警告還是粉色補充)

**Gemini:** 我看到您在筆記規則中把粉色定義為數據與補充，所以...使用粉紅色是最合適的，這樣就能夠維持規則的一致性。

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/325a079bd35b874b | 2026-07-23(對話發生於本機使用當下) |
| SSG/Foreword/YAML 為通用技術與出版慣例知識 | — | 無單一權威來源,內容經 Claude 覆核與 Gemini 回答一致,查證於 2026-07-23 |

---
由 Gemini 對話自動整理 · 更新於 2026-07-23
