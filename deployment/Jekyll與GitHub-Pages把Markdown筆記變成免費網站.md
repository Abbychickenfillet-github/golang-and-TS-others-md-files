---
title: Jekyll 與 GitHub Pages——把 Markdown 筆記變成免費網站
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - deployment
  - github-pages
  - jekyll
  - static-site-generator
  - markdown
aliases: [Jekyll, GitHub Pages, 靜態網站產生器]
related:
  - "[[GitHub-Actions-CICD-ghcr與Docker映像檔]]"
  - "[[學習順序與免費部署作品集策略]]"
  - "[[Zeabur-主機遷移-DeepSeek-API與費用比較]]"
sources:
  - https://gemini.google.com/app/7fd6c5bc52ded55b
updated: 2026-08-09
---

# Jekyll 與 GitHub Pages：把 Markdown 筆記變成免費網站

> **本篇重點 a–m，共 13 個。**
> 起因：Abby 想把 `golang-and-TS-others-md-files` 這個滿是 `.md` 筆記的儲存庫變成公開網站，在 GitHub Pages 設定頁看到「Jekyll site」不知道是什麼。

---

## Jekyll 是什麼

(a) <mark style="background: #ADCCFFA6;">Jekyll 是一個用 Ruby 寫的靜態網站產生器（Static Site Generator，SSG）</mark>。你寫 Markdown，它幫你編譯成 HTML 靜態網頁。

(b) <mark style="background: #FFF3A3A6;">它是 GitHub Pages 的內建預設引擎</mark>——這就是為什麼 GitHub 的設定頁面會直接跟你提 Jekyll，而不是 Hugo 或 Astro。你不用自己安裝 Ruby，GitHub 在背景幫你跑。

(c) 適合的場景：<mark style="background: #BBFABBA6;">技術部落格、專案文件、履歷頁、筆記站</mark>。不適合的場景：需要登入、需要即時資料的應用（那要的是後端，不是 SSG）。

---

## 要錢嗎

(d) <mark style="background: #BBFABBA6;">公開儲存庫（Public Repository）完全免費</mark>。

| 項目 | 費用 |
|---|---|
| 網址 `https://<帳號>.github.io/<專案名>` | 免費 |
| 託管 | 免費 |
| GitHub Actions 建置時間（公開專案） | 免費 |
| 自訂網域（例如 `www.yourname.com`） | <mark style="background: #FFB8EBA6;">要錢，但錢是付給網域註冊商，不是付給 GitHub</mark> |

(e) <mark style="background: #FF5582A6;">⚠️ 存疑／更正</mark>：原對話說「GitHub Actions 對公開專案提供<mark style="background: #FF5582A6;">無限量</mark>的免費執行時間」。<mark style="background: #BBFABBA6;">正確說法是：使用 GitHub 託管執行器（GitHub-hosted runners）的公開儲存庫不計費</mark>，但仍受並行數與單次工作流程時間上限等使用限制，而且私有儲存庫是有免費額度上限的（超過要付費）。「不計費」和「無限量」不是同一件事，請以下方官方文件為準。

---

## 兩種部署來源（Source）二選一

(f) GitHub Pages 的 `Settings → Pages → Build and deployment → Source` 有兩個選項：

| 選項 | 意思 | 適合誰 |
|---|---|---|
| <mark style="background: #ADCCFFA6;">Deploy from a branch</mark> | 指定某個分支＋資料夾，GitHub 自動用內建 Jekyll 建置 | <mark style="background: #BBFABBA6;">純 Markdown 筆記站，最省事</mark> |
| <mark style="background: #ADCCFFA6;">GitHub Actions</mark> | 自己寫 workflow，想用什麼工具都行 | 要用 Hugo / Astro / Next.js，或需要自訂建置步驟 |

(g) 切回分支模式的實際步驟：

1. 進 `Settings` → 左側選 `Pages`
2. `Build and deployment` 區塊，`Source` 下拉選單改成 <mark style="background: #BBFABBA6;">`Deploy from a branch`</mark>
3. 下方出現 `Branch` 設定，選 <mark style="background: #BBFABBA6;">`main`</mark>
4. 資料夾選 <mark style="background: #BBFABBA6;">`/ (root)`</mark>（或把網頁內容集中在 `/docs` 就選 `/docs`）
5. 按 `Save`

![GitHub Pages 設定頁：Source 選 Deploy from a branch，Branch 選 main，資料夾選 root](../obsidian-attachment/螢幕擷取畫面%202026-08-09%20174405.png)

(h) <mark style="background: #FFB8EBA6;">同一頁往下還有兩個東西值得留意</mark>：`Custom domain`（自訂網域，留空就用預設的 `<帳號>.github.io`）與 `Enforce HTTPS`（用預設網域時會強制勾選且不能取消，這是好事）。

---

## 兩個一定會踩到的檔案

(i) <mark style="background: #FF5582A6;">`.nojekyll`</mark>：在儲存庫根目錄放一個空的 `.nojekyll` 檔，代表<mark style="background: #FF5582A6;">「完全跳過 Jekyll，把檔案原封不動當靜態檔送出」</mark>。<mark style="background: #BBFABBA6;">什麼時候需要</mark>：你的資料夾或檔名以底線 `_` 開頭時（Jekyll 預設會忽略底線開頭的目錄），或你根本不想要 Jekyll 處理任何東西。

(j) <mark style="background: #FF5582A6;">`_config.yml`</mark>：Jekyll 的設定檔。Abby 的設定是：

```yaml
defaults:
  - scope:
      path: ""
    values:
      render_with_liquid: false
```

![Obsidian 中的 _config.yml 與 .nojekyll](../obsidian-attachment/螢幕擷取畫面%202026-08-09%20180046.png)

{% raw %}(k) <mark style="background: #FFF3A3A6;">這段設定在解決一個很煩的問題</mark>：Jekyll 預設會用 Liquid 樣板引擎處理所有檔案，而 Liquid 把 <code>&#123;&#123; &#125;&#125;</code> 和 <code>&#123;% %&#125;</code> 當成語法。<mark style="background: #FF5582A6;">如果筆記裡有 Vue、Handlebars、Jinja 的雙大括號範例，或者 Obsidian 的 `{{date}}` 樣板，建置就會直接失敗或內容被吃掉</mark>。`render_with_liquid: false` 對所有路徑（`path: ""` 代表全站）關掉 Liquid 處理，Markdown 照樣會被轉成 HTML，但大括號會原樣保留。{% endraw %}

(l) <mark style="background: #D2B3FFA6;">`.nojekyll` 與 `render_with_liquid: false` 的差別</mark>：前者是「連 Markdown 都不轉了，全部當原始檔」；後者是「還是要 Jekyll 幫我轉 Markdown，只是不要碰我的大括號」。<mark style="background: #FF5582A6;">兩個同時放會互相矛盾</mark>——`.nojekyll` 一旦生效，`_config.yml` 就完全不會被讀。

(m) <mark style="background: #FFF3A3A6;">給 Abby 的實務建議</mark>：既然目標是「把 `.md` 筆記變成可閱讀的網頁」，<mark style="background: #BBFABBA6;">應該要留著 Jekyll（不要 `.nojekyll`），只用 `render_with_liquid: false` 避開大括號問題</mark>。如果放了 `.nojekyll`，網站上點開會是一堆 Markdown 原始碼而不是排版好的網頁。

---

## 關聯筆記與關聯原因

- [[學習順序與免費部署作品集策略]]：<mark style="background: #D2B3FFA6;">同一個目標的兩塊拼圖</mark>——那篇談「要放什麼上去給面試官看」，這篇談「怎麼零成本放上去」。
- [[GitHub-Actions-CICD-ghcr與Docker映像檔]]：<mark style="background: #D2B3FFA6;">本篇 (f) 的另一個選項就是它</mark>。Deploy from a branch 是 GitHub 幫你跑好的黑盒子，GitHub Actions 是自己掌控整條建置流水線，那篇是後者的完整版。
- [[Zeabur-主機遷移-DeepSeek-API與費用比較]]：<mark style="background: #D2B3FFA6;">同屬「部署與費用」主題</mark>。差別在於靜態站可以完全免費，有後端就得付主機錢，選型時先問「這個東西需不需要伺服器」。

---

## 各對話來源（原文）

### Jekyll 靜態網站產生器介紹（2026-08-09）— https://gemini.google.com/app/7fd6c5bc52ded55b

> **使用者：** Jekyll site 這啥
>
> **Gemini：** Jekyll 是一個用 Ruby 開發的靜態網站產生器（Static Site Generator）。在 GitHub Pages 中看到 Jekyll site，代表你可以透過寫 Markdown 檔案（.md）來直接產生網站，GitHub 會在背景自動將這些 Markdown 檔編譯成漂亮的 HTML 靜態網頁。主要特點與用途包含：寫 Markdown 變網頁、非常適合技術部落格與文件、與 GitHub Pages 深度整合。如果你目前的儲存庫（golang-and-TS-others-md-files）裡面主要都是 .md 筆記檔，選擇 GitHub Pages Jekyll 工作流（Workflow）就能直接把這些筆記轉換成公開的網頁網站。
>
> **使用者：** 那要錢嗎？
>
> **Gemini：** 不用錢，完全免費！GitHub Pages 以及 Jekyll 的編譯服務針對公開儲存庫（Public Repository）都是完全免費提供的：免費託管與網址（`https://<你的帳號>.github.io/<專案名稱>`）、免費自動化部署（GitHub Actions 對公開專案提供無限量的免費執行時間）、無隱藏費用（除非你需要自訂個人網域）。
>
> **使用者：** 我要怎麼選 main 這個分支
>
> **Gemini：** 要在目前 GitHub Pages 設定頁面選擇 main 分支部署，你需要將部署來源從 Actions 切換回分支模式。步驟如下：在 Build and deployment 區塊下，找到 Source 下拉選單（目前顯示為 GitHub Actions）。點擊該選單，改選為 Deploy from a branch。切換後下方會出現 Branch 的設定選項：選擇 main 分支，資料夾選擇 `/ (root)`（或依照你的需求選擇 `/docs`）。點擊 Save 儲存設定即可。

（`.nojekyll`、`_config.yml` 與 `render_with_liquid` 的說明為截圖對照後補充，原對話沒有談到。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/7fd6c5bc52ded55b | 2026-08-09（對話當下） |
| GitHub Docs：設定 GitHub Pages 的發佈來源 | https://docs.github.com/articles/configuring-a-publishing-source-for-github-pages | 查證於 2026-08-09（截圖中的狀態列連結） |
| GitHub Docs：Actions 計費（公開儲存庫使用 GitHub 託管執行器不計費） | https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions | 查證於 2026-08-09 |
| Jekyll 設定：`render_with_liquid` 與 front matter defaults | https://jekyllrb.com/docs/configuration/front-matter-defaults/ | 查證於 2026-08-09 |
| Abby 的實機截圖 | `obsidian-attachment/螢幕擷取畫面 2026-08-09 174405.png`、`螢幕擷取畫面 2026-08-09 180046.png` | 擷取於 2026-08-09 |

---

## 補充｜.js 這類靜態檔在 GitHub Pages 上會怎樣（2026-08-21）

### 結論：會被原封不動發布，瀏覽器顯示成一坨純文字

Jekyll 對「沒有 front matter 的檔案」的處理是**照抄到輸出目錄**，不做任何轉換。
所以 vault 裡的 `.js` 練習檔全部都會上站，網址就是它在 repo 裡的路徑。

點進去看到的是：**等寬字、沒有語法高亮、沒有導覽列、沒有主題樣式**，就是原始碼倒出來。
它**不會被執行**（沒有頁面載入它），也**不會被 render 成網頁**。

實測：`.../JS_Core_and_Runtime/lexical-scope-demo.js` 可以直接抓到完整原始碼。

### 三個選擇

| 做法 | 怎麼做 | 適合 |
| --- | --- | --- |
| **放著不管** | 什麼都不做 | 當「看原始碼」的連結用，讀者可以直接複製 |
| **內嵌到 .md**（推薦） | 在筆記裡用 ` ```js ` 圍籬把重點片段貼進去 | 有語法高亮、有主題樣式、讀起來舒服 |
| **從網站排除** | `_config.yml` 的 `exclude:` 加 `- "*.js"` | 不想讓練習檔公開 |

> [!tip] 我的建議：內嵌 ＋ 保留檔案
> **`.md` 是給人讀的，`.js` 是給你自己跑的。** 兩者各司其職：
> 筆記裡貼重點片段（有高亮），檔案留著給 `node` 執行，筆記末尾註明檔名。
> 這正是現在這些筆記的作法。

### 順帶檢查兩個設定

**a. `render_with_liquid: false` 是對的**

`_config.yml` 裡設了這個，代表 Jekyll **不會**用 Liquid 處理你的筆記。
沒有這行的話，筆記裡程式碼區塊中的 `{{ }}` 或 `{% %}` 會被 Jekyll 當成模板語法，輕則內容消失、重則整站建置失敗。

**b. `exclude:` 是唯一的隱私閘門**

> [!warning] 這條要記牢
> **即使 repo 是 private，GitHub Pages 網站是公開的。** 沒被 `exclude` 排除的檔案都會被發布出去。
> 目前排除的是 `private/`、`_to_delete/`、`系統維護-C槽清理/`、`Git/`、`*.sh`、`*.bak`。
> 新增資料夾時要順手想一下「這個能不能公開」。

