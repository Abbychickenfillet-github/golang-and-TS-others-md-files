---
title: CSRF 與 Antiforgery Cookie（.AspNetCore.Antiforgery）
type: topic-note
source: Gemini
tags: [gemini, backend, 資安, cookie, CSRF]
sources:
  - https://gemini.google.com/app/fe3d731199365110
updated: 2026-06-20
---

# CSRF 與 Antiforgery Cookie（.AspNetCore.Antiforgery）

## 重點整理

- `.AspNetCore.Antiforgery` 這支 cookie 的用途是<mark style="background: #ADCCFFA6;">防止跨站請求偽造攻擊（CSRF, Cross-Site Request Forgery）</mark>，用來驗證表單送出時的安全性。
- <mark style="background: #FF5582A6;">它跟「帳戶被鎖定」沒有關係，刪掉它也不會解鎖帳戶。</mark>帳戶鎖定通常是後端的登入失敗次數 / 安全策略造成的。
- <mark style="background: #BBFABBA6;">正解：</mark>系統顯示「用戶帳戶被鎖定」時，應直接聯絡該網站客服處理，而不是自己刪 cookie。

### 除錯小技巧（這次情境學到的）
- 送出請求後若 DevTool 的 Network 沒有出現 `200` 成功回應，代表該動作<mark style="background: #FFF3A3A6;">沒有真的串到 API</mark>（前端表單可能根本沒打到後端）。這是判斷「重置密碼到底有沒有生效」的好線索。
- 查 cookie 用途：F12 → Application → Cookies，看 cookie 的 `name` 與 domain。看到 `Antiforgery`、`XSRF-TOKEN`、`csrf` 這類字眼，多半就是 CSRF 防護 token，不是身分驗證或鎖定相關。

> 相關筆記：[[Cookie-與-Session]]、[[剪貼簿劫持攻擊-ClickFix與網站惡意注入排查]]

## 各對話來源

### Cookie 疑惑與帳戶鎖定（2026-06）— https://gemini.google.com/app/fe3d731199365110

**使用者：** 在某網站註冊，重置密碼時 DevTool 右側沒看到 200 成功；之後登入顯示「用戶帳戶被鎖定」。看了 Application cookies，有一支 name 是 `.AspNetCore.Antiforgery`，猜是防仿冒、應該跟鎖定有關，是不是刪掉就可以了？

**Gemini：** `.AspNetCore.Antiforgery` 是用來防止 CSRF 攻擊、驗證表單送出安全性的，跟帳戶鎖定無關，刪掉問題也不會解決。既然系統顯示帳戶被鎖定，建議直接聯絡網站客服協助。
