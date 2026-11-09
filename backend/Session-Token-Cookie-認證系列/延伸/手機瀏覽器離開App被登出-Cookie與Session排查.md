---
title: 手機瀏覽器離開 App 後被登出的排查
type: topic-note
source: Gemini
tags: [gemini, cookie, session, mobile, nextjs]
sources:
  - https://gemini.google.com/app/36594d35946c4d3b
updated: 2026-11-03
---

# 手機瀏覽器離開 App 後被登出的排查

症狀：手機瀏覽器離開 App（沒關分頁）就被登出，網站宣稱「登入狀態維持 3 天」。手機瀏覽器本身支援 Cookie，要從以下三條線排查。相關：[[1-Cookie-與-Session]]、[[2-Cookie隔離邊界與跨站請求安全-Origin-SameSite-CSRF-Token與Bearer]]。

## 重點整理

本篇重點 a–f，共 6 個

(a) <mark style="background: #FF5582A6;">無痕模式</mark>：關閉或離開 App 後 Cookie、Session、IndexedDB 全部清除。先確認分頁不是無痕。

(b) <mark style="background: #FFF3A3A6;">Session Cookie vs 持久 Cookie</mark>：沒設 `Expires`／`Max-Age` 的 Cookie 是 Session Cookie，瀏覽器被系統回收就消失。要撐 3 天需明確設定 `Max-Age=259200`。

(c) `SameSite`／`Secure` 設定不當：內嵌瀏覽器（WebView）或第三方 Cookie 限制下，需要 `SameSite=None; Secure`，否則 Cookie 可能不被保存或不被送出。

(d) 前端把登入狀態只放在記憶體或 `localStorage`：手機瀏覽器為省記憶體會凍結或重載背景分頁，狀態就遺失。

(e) 驗證方式：F12 → Application → Cookies，看 Expires／Max-Age 是否顯示 3 天後。

(f) <mark style="background: #BBFABBA6;">建議</mark>：由伺服器發 `HttpOnly` 且有長效期與正確跨站屬性的 Cookie，而非只靠記憶體狀態。

> ⚠️ 存疑/更正：Gemini 建議「改用 localStorage 配合 Token」，但 localStorage 可被 XSS 讀取，安全性通常不如 HttpOnly Cookie，這點與它同一回答的最後一點有張力，建議以 HttpOnly Cookie 為主。

## 自我測驗（點開看答案）

> [!question]- Session Cookie 與持久 Cookie 的差別？
> 有無 Expires／Max-Age。沒有的在瀏覽器關閉或被回收時消失。

> [!question]- 是非題：手機瀏覽器不支援 Cookie。
> 錯，支援，問題通常在無痕、屬性設定或前端狀態存放位置。

## 各對話來源
（Gemini 回答為節錄，使用者提問為原文）

### 手機登入失效排查（2026-11-03）— https://gemini.google.com/app/36594d35946c4d3b

**使用者：** 為什麼手機版的瀏覽器沒有cookie嗎？離開應用程式並沒有關閉結果就登出了

**Gemini：** （節錄）支援 Cookie；可能是無痕、Cookie 過期與 SameSite 屬性、前端狀態被重置；建議檢查 Max-Age=259200 並用 HttpOnly Cookie。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Cookie Max-Age／SameSite | https://developer.mozilla.org/zh-TW/docs/Web/HTTP/Cookies | MDN，本次未重新抓取全文（2026-11-03） |
