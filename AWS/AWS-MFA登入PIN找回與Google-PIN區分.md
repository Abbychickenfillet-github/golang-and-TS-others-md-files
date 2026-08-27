---
title: AWS 登入要求 MFA PIN 但找不到設定 — 排查與 Google PIN／備用碼區分
type: topic-note
source: Gemini
tags: [gemini, aws, mfa, google-account, security]
sources:
  - https://gemini.google.com/app/1c677e09518872e7
  - https://gemini.google.com/app/1d1ff7f44ff91b5d
updated: 2026-08-27
---

# AWS 登入要求 MFA PIN 但找不到設定 — 排查與 Google PIN／備用碼區分

本篇重點 a–j，共 10 個

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


### 追加 2026-08-27 — Passkey 與 TOTP 認錯的完整解法

d. <mark style="background: #ADCCFF;">TOTP（Time-based One-Time Password，時間型一次性密碼）</mark>就是手機驗證碼 App（Google Authenticator、Microsoft Authenticator、1Password）產生的那組 6 位數動態碼。AWS 文件若提到 TOTP token 不同步，代表系統認為這個帳號綁定的是「驗證器 App」這種 MFA。

e. <mark style="background: #FFF3A3;">AWS 預設不會自動開啟 MFA</mark>，不論 Root 帳號還是 IAM 使用者，剛建立時都是關閉的，一定是有人手動綁定過（自己、或當初建立 IAM 帳號的公司管理員）。沒有印象的三個常見原因：公司管理員用自己的裝置綁定、當初用的其實是瀏覽器內建 Passkey 而非獨立 App、換過手機而 Authenticator 資料沒備份移轉。

f. <mark style="background: #ADCCFF;">Passkey / FIDO2（通行密鑰）</mark>與 TOTP 是兩種不同的 MFA。<mark style="background: #FF5582;">最關鍵的辨識徵兆</mark>：掃 QR Code 之後手機只跳出「Google 密碼管理工具」而不給你選 Google Authenticator，就代表當初設定的是 <mark style="background: #FF5582;">Passkey 而不是 TOTP</mark>——瀏覽器遇到 Passkey 驗證會直接呼叫系統內建的密碼管理工具去找憑證，根本不會列出驗證碼 App。

g. <mark style="background: #FF5582;">「顯示找不到密碼」代表雲端根本沒有那把憑證</mark>。Passkey 是加密金鑰對，建立時會同步到 Google 密碼管理工具或 iCloud 鑰匙圈；既然雲端查無資料，換到舊手機登入同一個 Google 帳號結果也一樣。<mark style="background: #FF5582;">而且 Passkey 絕不會以一般檔案形式存在手機儲存空間或資料夾中，無法單獨複製或搬移</mark>，所以「翻舊手機找檔案」這條路不通。

h. <mark style="background: #BBFABB;">IAM 使用者被刪除時金鑰會怎樣</mark>：管理員若執行 Delete User，AWS 會自動註銷該帳號綁定的所有 MFA 裝置，手機 App 或硬體金鑰裡的資料就失效；若管理員只是拿掉登入權限而沒有點 Deactivate MFA，該金鑰在後台仍顯示「綁定」狀態，但因權限已廢除也無法用來登入。

i. <mark style="background: #BBFABB;">Passkey 與 SMS 都不通時的正解</mark>：不要再反覆嘗試登入，直接走 AWS 的免登入 MFA 支援表單申請人工重置。填 Root 帳號 Email，Inquiry type 選 MFA - Multi-Factor Authentication，Problem Type 選 Root account MFA reset，說明欄貼上英文陳述（憑證正確但無法完成 MFA、被要求 Passkey 但密碼管理工具無憑證、收不到 SMS、請求停用 MFA 以便驗證身分後重新取得存取權）。送出後 AWS 客服會以 Email 或電話聯繫驗證身分。

j. <mark style="background: #BBFABB;">想改用 TOTP 必須先能登入</mark>，順序是「先請客服重置現有 MFA → 只用 Email＋密碼登入 → 進 IAM 主控台的安全性憑證頁面 → 多因素驗證區塊點『指派 MFA 裝置』→ 選 Authenticator app → 用 Google Authenticator 掃 QR Code」。<mark style="background: #FF5582;">卡在登入畫面時是無法直接切換驗證方式的</mark>。

k. <mark style="background: #D2B3FF;">另一個容易誤判的點</mark>：登入頁看到的 "If your virtual MFA device or hardware TOTP token appears to be functioning properly..." 那段，是 AWS 官方說明文件的通用段落，<mark style="background: #FF5582;">不是針對你個人帳號狀態的警示</mark>，可以直接忽略、繼續走客服表單流程。

## 各對話來源(原文，節錄)

### AWS 登入的時候要求我輸入MFA 六個pin 但我不記得我有設定過我要去哪裡找 (2026-07-23) — https://gemini.google.com/app/1c677e09518872e7

**使用者:** AWS 登入的時候要求我輸入MFA 六個pin 但我不記得我有設定過我要去哪裡找

**Gemini:** 這是蠻常見的狀況……請照著幾個方向尋找這六位數的 PIN 碼(見重點 a、b)

**使用者:** 這個嗎 長度不同(附截圖)

**Gemini:** 這兩張圖顯示的內容與 AWS 登入要求的 MFA PIN 碼性質完全不同……(見重點 c，並提醒可能把 AWS Passkey 存進了 Google 帳戶)

**使用者:** 還是不是

**Gemini:** (延續排查建議，確認位數與來源後續追問)

### 設定 AWS 手機號碼指南（實際主題：Passkey vs TOTP 的 MFA 重置，2026-08-27）— https://gemini.google.com/app/1d1ff7f44ff91b5d

**使用者:** 文件說 TOTP token 可能與 AWS 失去同步，這個 TOTP token 會在哪？他要求我要用這個方式做 MFA 但是我完全沒有印象我的手機或平板裝置有設定過這個金鑰，我當初有一定設置過嗎

**Gemini:** TOTP Token 就是指您手機或平板驗證碼 App 裡面產生的 6 位數動態驗證碼。當初一定有設定過：AWS 帳號在剛建立時預設是沒有啟用 MFA 的，要開啟必須由持有帳號的人登入後進入安全性設定，用手機 App 掃描 QR Code 完成綁定。為什麼您完全沒有印象：可能是公司管理員幫您設定的；可能當初使用的是瀏覽器內建 Passkey 金鑰（如 Touch ID / Face ID）而不是獨立的驗證碼 App；也可能手機／平板更換過而舊資料沒有備份移轉。

**使用者:** 可是我如果被 IAM 移除的話我的金鑰還會在他那邊嗎？難道沒有解除綁定嗎

**Gemini:** 管理員刪除帳號時：如果執行的是 Delete User，AWS 會自動解鎖並強制註銷該 IAM 帳號綁定的所有 MFA 裝置，當初儲存在手機 App 或硬體金鑰裡的資料就會失效。管理員僅停用權限（未解除綁定）：該金鑰在 AWS 後台資料庫中仍會呈現「綁定」狀態，但因帳號權限已廢除，也無法再登入任何地方。另外，您畫面上看到的那段是 AWS 官方說明文件上的通用技術文件段落，並非針對您個人帳號狀態的警示。

**使用者:** 可是手機端我掃描那 QRCODE 以後他只有給我打開 GOOGLE 密碼管理工具的選擇，沒有讓我去選擇其他 Google Authenticator 等多要素驗證 app，並且打開 google 密碼管理工具以後是顯示找不到密碼

**Gemini:** 這個現象發生的原因，是因為您當初在 AWS 設定 MFA 時選擇的驗證方式是 Passkey（通行密鑰）/ FIDO2，而非一般的動態驗證碼 App（TOTP）。瀏覽器直接觸發密碼管理工具：當畫面上跳出 Passkey 驗證時，手機系統會預設開啟系統內建的密碼管理工具來尋找登入憑證，因此不會跳出選擇 Google Authenticator 等 App 的選項。顯示找不到密碼：代表該 Passkey 憑證當時只儲存在特定裝置中，並沒有同步到您目前的 Google 帳號裡。下一步：透過 AWS 免登入 MFA 表單尋求人工客服支援，填寫根帳號 Email，貼上英文說明（憑證正確但無法完成 MFA 驗證、被要求 Passkey 但 Google 密碼管理工具無任何憑證、收不到 SMS 驗證碼、請求停用 MFA 以便驗證身分並重新取得存取權）。

**使用者:** 那我打開我的舊手機的話找得到嗎？但都是存在 google 密碼管理工具嗎？還是手機本身檔案

**Gemini:** 找不到。因為畫面顯示「找不到密碼」，代表 Passkey 憑證並沒有成功建立或綁定在您的 Google 帳號中。Passkey 的儲存機制：Passkey 是加密的金鑰對，建立時會自動同步到雲端（Google 密碼管理工具、iCloud Keychain）。如果 Google 密碼管理工具顯示沒有，代表雲端資料庫裡根本沒有這個憑證，換到舊手機開啟相同的 Google 帳號結果也會是一樣的。是否會存在手機檔案裡：不會。現代智慧型手機基於安全性考量，Passkey 與安全性金鑰絕不會以一般檔案的形式存在手機儲存空間或資料夾中，無法單獨拉出或複製。

**使用者:** 那我現在可以改成用 TOTP 嗎

**Gemini:** 可以，但前提是必須先成功登入後才能修改。目前的狀況是：您現有的 MFA 驗證機制阻擋了您登入，所以無法直接切換為 TOTP。流程：（1）先重置目前的 MFA，透過 AWS MFA 客服支援表單送出申請，由客服專人幫您移除現有的 Passkey / SMS MFA 綁定；（2）MFA 被解除後，僅需輸入 Email 與密碼即可順利登入 AWS 主控台；（3）重新設定為 TOTP，登入後前往 AWS IAM 主控台的安全性憑證頁面，在「多因素驗證 (MFA)」區塊點擊「指派 MFA 裝置」，選擇 Authenticator app，使用手機的 Google Authenticator 掃描螢幕上的 QR Code 完成設定。


## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/1c677e09518872e7 | 2026-07-23 |
| MFA／Passkey 概念為業界通用安全機制 | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html | 以 AWS 官方 MFA 文件行為為準，查證於 2026-07-23 |
| Gemini 對話原文（Passkey vs TOTP 重置） | https://gemini.google.com/app/1d1ff7f44ff91b5d | 2026-08-27 擷取 |
| AWS 官方 — Recover a root user MFA device（含免登入支援流程） | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_lost-or-broken.html | 2026-08-27 查證 |
| AWS 官方 — Passkeys and security keys as MFA | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_fido.html | 2026-08-27 查證 |
| FIDO Alliance — Passkeys 概念與同步機制 | https://fidoalliance.org/passkeys/ | 2026-08-27 查證 |

---
由 Gemini 對話自動整理 · 更新於 2026-08-27
