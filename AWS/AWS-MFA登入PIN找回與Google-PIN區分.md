---
title: AWS 登入要求 MFA PIN 但找不到設定 — 排查與 Google PIN／備用碼區分
type: topic-note
source: Gemini
tags: [gemini, aws, mfa, google-account, security]
sources:
  - https://gemini.google.com/app/1c677e09518872e7
updated: 2026-07-23
---

# AWS 登入要求 MFA PIN 但找不到設定 — 排查與 Google PIN／備用碼區分

本篇重點 a–c，共 3 個

## 重點整理

a. <mark style="background: #ADCCFF;">MFA(Multi-Factor Authentication，多因子驗證)</mark> 是在密碼之外要求第二種驗證因素的安全機制；即使自己不記得主動設定過，也可能是當初建立帳號(尤其是 Root 帳號)時順手開啟建議設定，或是公司 IAM 政策強制要求。

b. <mark style="background: #BBFABB;">找回 AWS 6 位數 MFA PIN 的排查順序</mark>：①先檢查手機上的驗證 App(Google Authenticator、Microsoft Authenticator、Authy、Duo Mobile)，搜尋是否有 "AWS" 或 "Amazon Web Services" 項目；②檢查是否有實體金鑰(如 YubiKey)或密碼管理員(1Password、Bitwarden、iCloud 密碼)是否內建自動產生 TOTP 動態碼；③若都找不到且無法登入，在輸入 MFA 頁面找 "Troubleshoot MFA" 連結，Root 使用者可透過驗證電子郵件＋註冊電話暫時跳過 MFA；IAM 使用者則需聯繫帳號管理員從後台重設。

c. <mark style="background: #FF5582;">容易搞混的三種「代碼」，位數與用途都不同</mark>，找 PIN 時務必分清楚:

| 代碼類型 | 位數 | 用途 |
|---|---|---|
| Google 備用驗證碼 | 8 位(固定) | 無法收簡訊或沒有驗證 App 時，登入 Google 帳號的最後手段 |
| Google 密碼管理工具 PIN | 自訂(4–6 位) | 解鎖儲存在 Google 的密碼或 Passkey |
| AWS MFA PIN | 6 位(每 30 秒動態變動) | AWS 登入驗證，非固定值 |

⚠️ 若在 Chrome 密碼管理工具看到「輸入 PIN 解鎖」畫面，代表 AWS 的 MFA 金鑰(Passkey)很可能被存進了 Google 帳戶，此時應輸入平常用於 Windows／Android／Chrome 的自訂 PIN 來解鎖，而不是去找一組「6 位數固定密碼」。

## 各對話來源(原文，節錄)

### AWS 登入的時候要求我輸入MFA 六個pin 但我不記得我有設定過我要去哪裡找 (2026-07-23) — https://gemini.google.com/app/1c677e09518872e7

**使用者:** AWS 登入的時候要求我輸入MFA 六個pin 但我不記得我有設定過我要去哪裡找

**Gemini:** 這是蠻常見的狀況……請照著幾個方向尋找這六位數的 PIN 碼(見重點 a、b)

**使用者:** 這個嗎 長度不同(附截圖)

**Gemini:** 這兩張圖顯示的內容與 AWS 登入要求的 MFA PIN 碼性質完全不同……(見重點 c，並提醒可能把 AWS Passkey 存進了 Google 帳戶)

**使用者:** 還是不是

**Gemini:** (延續排查建議，確認位數與來源後續追問)

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/1c677e09518872e7 | 2026-07-23 |
| MFA／Passkey 概念為業界通用安全機制 | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html | 以 AWS 官方 MFA 文件行為為準，查證於 2026-07-23 |

---
由 Gemini 對話自動整理 · 更新於 2026-07-23
