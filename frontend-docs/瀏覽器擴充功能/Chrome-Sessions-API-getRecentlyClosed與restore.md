---
title: "Chrome Sessions API：列出與復原剛關閉的分頁與視窗"
type: topic-note
source: Gemini
category: 技術
tags: [gemini, chrome-extension, sessions-api, webextension]
sources:
  - https://gemini.google.com/app/bf264d8a92267196
updated: 2026-10-30
---

# Chrome Sessions API：列出與復原剛關閉的分頁與視窗

> 本篇重點 a–e ，共 5 個。
> 關聯：瀏覽器端的「Session」與後端的 [[3-Session與JWT-有狀態與無狀態驗證-過期機制與Base64url]] 完全是兩回事。這裡的 session 指「瀏覽器這次執行期間的分頁／視窗紀錄」，不是登入狀態。

## 重點整理

**a.** <mark style="background: #ADCCFFA6;">Sessions API 是給擴充功能（Extension）用的</mark>，功能是查詢並復原「瀏覽器還在執行時被關掉的分頁與視窗」，像瀏覽器的時光機。

**b.** `sessions.getRecentlyClosed()` 回傳一個陣列，每個元素代表一個被關閉的單元，可能是分頁或視窗，分別用 `tabs.Tab` 與 `windows.Window` 描述。
1. `tabs.Tab` ：被關閉的單一分頁，含 url 、 title 、 id 等。
2. `windows.Window` ：被關閉的整個視窗，含視窗屬性與它底下的分頁列表。

**c.** `sessions.restore()` 復原時連同分頁的瀏覽歷史（上一頁／下一頁）一起還原，不只是重開網址。

**d.** ⚠️ 補充：MDN 的精確說法是回傳 `sessions.Session` 物件陣列，每個 Session 物件內含 `tab` 或 `window` 其中一個屬性。Gemini 的描述是簡化版，寫程式時要先判斷是哪一個屬性存在。（依個人記憶整理，請對照下方 MDN 確認。）

**e.** 「瀏覽器完全關閉重啟」後這份紀錄就不保證還在，所以它不是持久化儲存。

## 各對話來源（原文摘錄）

### Chrome Sessions API 解析（2026-10）— https://gemini.google.com/app/bf264d8a92267196

使用者：session 到底是做什麼的？ sessions.getRecentlyClosed() 回傳的 tabs.Tab 與 windows.Window 是什麼物件？

Gemini：Sessions API 用來管理、列出與恢復執行期間被關閉的分頁與視窗（整合進 a～c ）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 原始對話 | https://gemini.google.com/app/bf264d8a92267196 | 擷取於 2026-10-30 |
| MDN sessions API | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sessions | 本次未重新抓取，請以 MDN 為準 |
| Chrome sessions API | https://developer.chrome.com/docs/extensions/reference/api/sessions | 本次未重新抓取 |
