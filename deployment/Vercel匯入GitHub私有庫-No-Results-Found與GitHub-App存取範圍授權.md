---
title: Vercel 匯入 GitHub 私有庫 — No Results Found 的成因與 GitHub App 存取範圍授權
type: topic-note
source: Gemini
category: 技術
tags: [gemini, vercel, github, deployment, github-app, private-repo, oauth]
aliases: [Vercel No Results Found, Vercel 找不到 repo, Vercel 私有庫]
related:
  - "[[Vercel-eve-Agent框架與GitOps零設定部署]]"
  - "[[GitHub-Actions-CICD-ghcr與Docker映像檔]]"
  - "[[repoint-company-repo-to-personal-account]]"
  - "[[SSH-RSA金鑰與ssh-agent-免密碼設定]]"
sources:
  - https://gemini.google.com/app/dc1e1986b81b62f9
updated: 2026-09-17
---

# Vercel 匯入 GitHub 私有庫 — No Results Found 的成因與 GitHub App 存取範圍授權

> 本篇重點 a–h，共 8 個。
> 主軸圖：本頁 HTML 版的「三方授權流程圖」（Vercel → GitHub App → Repository access → 回到 Vercel Refresh），之後同主題追問請指回這張圖的某個節點。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | repo 一定要改成 public 才能給 Vercel 用嗎 | 不用，Private 儲存庫完全可以匯入 Vercel | §1 |
| Q2 | 那為什麼搜尋不到，顯示 No Results Found | Vercel GitHub App 沒有拿到那個私有庫的存取權限 | §1 |
| Q3 | 直接貼完整 GitHub 網址可以嗎 | 不行，那個欄位是「名稱搜尋」不是「讀取網址」 | §2 |
| Q4 | 怎麼修 | 去 GitHub App 的 Repository access 加白名單，存檔後回 Vercel 按 Refresh，再用「專案名稱」搜尋 | §3 |

---

## 1. 兩個真正的原因（a–c）

(a) <mark style="background: #BBFABBA6;">Private（私有）儲存庫完全可以匯入 Vercel</mark>，不需要為了部署把 GitHub 儲存庫改成 Public。把私有庫改公開只會把原始碼與 `.env` 的歷史紀錄暴露出去，不是解法。

(b) <mark style="background: #FF5582A6;">原因一：Vercel GitHub App 未獲取該儲存庫的存取權限</mark>。
	Vercel 是透過一支安裝在你 GitHub 帳號底下的 GitHub App 去列出 repo 清單的。
	這支 App 安裝時如果你選了「Only select repositories」，它就只看得到當初勾選的那幾個 repo，後來新建的專案不會自動被包含，於是 Vercel 的搜尋結果就是空的（No Results Found）。

(c) <mark style="background: #FF5582A6;">原因二：網址貼錯位置</mark>。
	在「Import from GitHub」下方那個搜尋框輸入完整的 URL 時，系統會把整串網址當成「名稱關鍵字」去比對 repo 名稱，而不是去解析網址並直接讀取那個 repo，所以一定搜不到。

---

## 2. 三方是怎麼拋接的（d）

(d) 把角色與動作寫成完整的一句話，比較不會記混：

> 你在 Vercel 的 Import 頁面送出搜尋 → Vercel 用「已安裝的 GitHub App」的 token 去問 GitHub「這個帳號授權給我哪些 repo」 → GitHub 只回傳 Repository access 白名單裡的那幾個 → Vercel 拿這份清單在前端做名稱比對 → 比對不到就顯示 No Results Found。

	所以問題出在「GitHub 回傳的清單」這一段，不是出在你的 repo 是不是 public，也不是出在 Vercel 壞掉。

---

## 3. 修法三步驟（e–g）

| 步驟 | 動詞—受詞—產物 | 大約耗時 |
|---|---|---|
| 1 | 你在 Vercel 搜尋框下方點擊 `Vercel GitHub App` 連結，瀏覽器跳轉到 GitHub 的應用程式授權頁面 | 1 分鐘 |
| 2 | 你在 `Repository access` 設定中選擇 `All repositories`，或選 `Only select repositories` 並把目標 repo（例：`next-one-time-tracker`）加進允許清單 | 1 分鐘 |
| 3 | 你點 `Save` 存檔，回到 Vercel 頁面點 `Refresh`，Vercel 重新向 GitHub 要一次清單，專案就會出現 | 30 秒 |

(e) <mark style="background: #FFF3A3A6;">第 3 步之後，搜尋請改用「專案名稱」而不是完整 URL</mark>，例如直接輸入 `next-one-time-tracker`，找到後點 `Import`。

(f) <mark style="background: #ADCCFFA6;">`All repositories` 與 `Only select repositories` 的取捨</mark>：

| 選項 | 好處 | 代價 |
|---|---|---|
| All repositories | 以後新建的 repo 自動看得到，不用再回來改設定 | Vercel 對你所有私有庫都有讀取權 |
| Only select repositories | 權限最小化，符合 least privilege | 每開一個新專案就要回來加白名單一次 |

(g) <mark style="background: #BBFABBA6;">建議：個人練習專案選 All repositories 省事，接案或公司帳號選 Only select repositories</mark>，這是權限最小化原則的實際應用。

---

## 4. 排查順序（h）

(h) 下次再遇到 Vercel 找不到 repo，照這個順序問自己就好：

```text
Vercel 搜尋不到 repo
  ↓
① 我是用「名稱」搜尋還是貼了整串 URL ?
  ├─ 貼 URL ──→ 改打名稱，重試
  └─ 用名稱
       ↓
② GitHub → Settings → Applications → Vercel → Repository access
   這個 repo 在白名單裡嗎 ?
  ├─ 不在 ──→ 加進去 → Save → 回 Vercel 按 Refresh
  └─ 在
       ↓
③ 我登入 Vercel 的 GitHub 帳號，跟 repo 擁有者是同一個帳號嗎 ?
   （個人帳號 vs Organization 是兩套獨立的 App 安裝）
  ├─ 不是 ──→ 切換帳號，或請 Org owner 安裝 Vercel App
  └─ 是 ──→ 登出重登 Vercel，重新授權一次
```

---

## 關聯筆記（附關聯原因）

- [[Vercel-eve-Agent框架與GitOps零設定部署]]
	**理由**：那篇講的是「Vercel 綁定 repo 之後，push 就自動部署」的 GitOps 流程，本篇是那個流程的第 0 步——先讓 Vercel 看得到 repo。
- [[GitHub-Actions-CICD-ghcr與Docker映像檔]]
	**理由**：同樣是「第三方服務要拿到 GitHub 資源的授權」問題，那篇是用 token 推映像檔到 ghcr，本篇是用 GitHub App 讀 repo，兩種授權模型對照著看比較清楚。
- [[repoint-company-repo-to-personal-account]]
	**理由**：本篇排查第 ③ 步（個人帳號 vs Organization 是兩套 App 安裝）在那篇有帳號搬遷的實際操作。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 | https://gemini.google.com/app/dc1e1986b81b62f9 | Gemini Flash，2026-09-17 擷取 |
| Vercel Docs — Git Integrations / GitHub | https://vercel.com/docs/git/vercel-for-github | Vercel 官方文件，2026-09-17 查證 |
| GitHub Docs — Managing a GitHub App's repository access | https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps | GitHub 官方文件，2026-09-17 查證 |
| GitHub Docs — Differences between GitHub Apps and OAuth apps | https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps | GitHub 官方文件，2026-09-17 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-17
