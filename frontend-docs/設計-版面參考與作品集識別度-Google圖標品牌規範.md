---
title: 版面參考 vs 抄襲、作品集識別度與 Google 圖標品牌規範
type: topic-note
source: Gemini
tags: [gemini, 前端, 設計, ui, 作品集, 品牌規範, 配色]
sources:
  - https://gemini.google.com/app/5076aa7d34b49510
updated: 2026-06-15
---

# 版面參考 vs 抄襲、作品集識別度與 Google 圖標品牌規範

## 重點整理

### Google 圖標可以改成黑白嗎？

> [!warning] 官方品牌規範（Branding Guidelines）
> <mark style="background: #FF5582A6;">絕大多數情況不允許</mark>第三方網頁把四色「G」改成黑白／單色。常見的黑白 Google icon 多半是開發者用 CSS `filter: grayscale(100%)` 或換 SVG 顏色，嚴格來說違反規範。

合法看到單色 Google icon 的場景：暗黑模式／極簡單色設計站（Webflow、Framer、One Page Love 的作品集）、企業官網「Trusted by／合作夥伴」logo 牆（為視覺統一全調灰）、Google 官方 Partner Marketing Hub 提供的認證 monochrome／black mono 版本（單色印刷或暗底時核准使用）、Chrome 線上商店暗色主題的預覽圖。

### 照抄別人版面好嗎？區分「結構」與「風格」

- <mark style="background: #BBFABBA6;">可以參考／複製：版面結構與 UX 慣例</mark>。例如購物車在右上角、訂閱頁是三欄式定價卡片（Zeabur 訂閱頁就是經典 SaaS 定價版面）。符合使用者習慣（UI Pattern），不必重新發明輪子。
- <mark style="background: #FF5582A6;">不該盲抄：品牌靈魂與細節</mark>。連線條、間距、陰影、字體、插圖風格都一模一樣 → 點進來的人覺得「ㄟ？怎麼長一樣」，削弱品牌信任度與識別度。

### 個人作品集：勇敢放進自己的想法

每個專案都長得像公版或 Accupass，面試官會疲勞，覺得你是「照規格書代工」而非「有思考的開發者」。建立識別度的方法：

1. <mark style="background: #FFF3A3A6;">在 README／作品介紹寫出「設計共識」</mark>（為什麼這樣設計）= 極大加分項。範例：「訂閱頁參考 Zeabur 三欄式佈局符合直覺（UX），但視覺移除科技冷感、改用低飽和日系自然色調，並用微互動提升卡片點擊引導。」
2. 用前端技術展現美感：挑有風格的字體／排版（捨棄氾濫預設體、用襯線體或精緻日文字型）；動態細節（Hover 卡片升起、光影、按鈕點擊回饋，用 CSS／Framer Motion 寫）最能展現質感。
3. <mark style="background: #ADCCFFA6;">嚴格的色彩計畫＝60-30-10 法則</mark>（60% 主色/背景、30% 輔助色、10% 強調色，老闆說的「三色原則」即此）。遇到不能改的 Google 四色 icon，改用「按鈕加灰色外框＋背景留白」融入網頁，不違反規範。

> [!info] 職場省思
> 老闆「既要你當通才設計師、又用專業品牌規範檢視你」、要求「模仿 Accupass」又限「只能三色（含白色）」——把 icon 改黑白是合理應變；用 Google 官方規範反駁雖商務合規上沒錯，但他自己給的限制才是主因。這屬於內部缺乏討論與共識，不算硬要出錯。

## 各對話來源
### Google Icon 黑白使用情境（2026-06）— https://gemini.google.com/app/5076aa7d34b49510

使用者：有哪個網頁用到黑白色的 Google icon 嗎？ → Gemini：官方規範嚴格不允許改單色；常見於暗黑/極簡設計站、合作夥伴 logo 牆、官方 Partner Hub 認證版、Chrome 暗色主題預覽；網站上的黑白登入鈕多是開發者用 CSS grayscale 私改、違反規範。

使用者：（分享被老闆質疑配色、要求模仿 Accupass、只能三色的經歷）照抄版面好嗎？個人作品集可以維持自己想法吧？ → Gemini：理解委屈，是內部缺共識；區分可借鑑的「結構/UX 慣例」與不該盲抄的「品牌靈魂細節」；作品集要勇敢放想法，用 README 寫設計共識、字體/動態細節、60-30-10 配色建立識別度，遇 Google icon 用灰框留白融入。
