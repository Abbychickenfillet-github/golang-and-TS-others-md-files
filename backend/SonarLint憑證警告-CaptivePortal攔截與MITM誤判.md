---
title: SonarLint 憑證警告｜Captive Portal 攔截造成的 MITM 誤判
type: topic-note
source: Gemini
tags: [gemini, 資安, security, ssl, tls, mitm, captive-portal, sonarlint, 憑證, 網路]
sources:
  - https://gemini.google.com/app/25e4d23461e5b89f
updated: 2026-08-25
---

# SonarLint 憑證警告｜Captive Portal 攔截造成的 MITM 誤判

> [!info] 本篇重點 a–l，共 12 個
> 情境：在咖啡廳（路易莎）用 VS Code 寫扣，SonarLint 突然跳出「發現不可信的伺服器憑證」。<mark style="background: #FFF3A3A6;">這是真的攻擊還是誤會？答案是誤會，但誤會的原因跟真正的中間人攻擊在技術上一模一樣。</mark>
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[ClickFix社交工程攻擊-假驗證碼誘騙貼上PowerShell與網站被注入的處置]]</mark> 講的是<mark style="background: #FF5582A6;">真的</mark>攻擊，這篇講的是<mark style="background: #BBFABBA6;">誤判</mark>，兩篇對照著看才能練出「哪種警告該怕」的判斷力；<mark style="background: #ADCCFFA6;">[[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]]</mark> 講 TLS 握手在做什麼，這篇是那個握手被第三方插隊時會發生的事。

---

## 重點整理

### 一. 先把名詞定義清楚

(a) <mark style="background: #ADCCFFA6;">MITM（Man-In-The-Middle，中間人攻擊）</mark>：有人站在你和伺服器中間，攔截、竄改或偷看雙方的通訊。

(b) <mark style="background: #ADCCFFA6;">Captive Portal（強制網路門戶）</mark>：公共 Wi-Fi 那個「同意條款才能上網」的登入頁。中文有時翻成「強制入口網頁」。

(c) <mark style="background: #ADCCFFA6;">自簽憑證（Self-signed Certificate）</mark>：由自己簽發、而非由公信的憑證機構（CA，Certificate Authority）簽發的 SSL/TLS 憑證。瀏覽器與程式預設不信任。

(d) <mark style="background: #ADCCFFA6;">SonarLint</mark>：SonarSource 出的 IDE 靜態程式碼檢查外掛，會在背景連回 SonarQube / SonarCloud 伺服器抓規則。

### 二. 為什麼會跳警告

(e) <mark style="background: #FFF3A3A6;">關鍵：Captive Portal 為了強制你看到登入畫面，做的事情技術上就是中間人攻擊。</mark>

(f) 未登入前的流程：

1. 你的裝置連上 Wi-Fi，拿到 IP，但 AP（這台是 Ruckus 設備）還沒把你放行。
2. VS Code 的 SonarLint 在背景發 HTTPS 請求回它自己的伺服器。
3. <mark style="background: #FF5582A6;">Ruckus AP 把這個請求劫持（hijack）下來，回傳自己的自簽憑證（憑發者顯示為 Ruckus Wireless Inc.）</mark>，想把你導去登入頁。
4. SonarLint 一看：我要連的是 `sonarcloud.io`，拿到的憑證卻是 Ruckus 簽的——<mark style="background: #FF5582A6;">憑證跟網域對不上，這就是 MITM 的特徵</mark>，於是跳警告。

(g) 登入成功後的流程：

1. 你在瀏覽器完成 Captive Portal 登入。
2. <mark style="background: #BBFABBA6;">Ruckus 把你的 MAC 位址加進允許名單（Allowlist）。</mark>
3. 路由器停止劫持，流量直接放行到真正的網際網路。
4. SonarLint 拿到正確的憑證，警告自然消失。

(h) <mark style="background: #FFF3A3A6;">所以「登入之後就正常了」不是巧合，而是劫持行為結束了。</mark>

### 三. 該怎麼處理

(i) <mark style="background: #BBFABBA6;">正解：點「Don't trust」或「Cancel」，然後去瀏覽器把 Wi-Fi 登入流程走完。</mark>登入後警告就不會再出現。

(j) <mark style="background: #FF5582A6;">絕對不要在咖啡廳、機場、飯店這種外部網路點「Trust」。</mark>點下去等於把那張攔截憑證存進 SonarLint 的信任庫，之後這條連線上的所有流量對持有那把私鑰的人來說都是明文。

(k) 唯一可以考慮點 Trust 的情境：<mark style="background: #D2B3FFA6;">你在公司內部網路，而且確認公司 IT 政策就是用閘道器做 SSL 檢查（企業 TLS inspection）</mark>。這種情況下該憑證是公司自己的 CA。SonarLint 信任庫的預設密碼是 `sonarlint`。

(l) <mark style="background: #FFF3A3A6;">通用判斷法則，記這一條就好：</mark>

> 憑證警告 <mark style="background: #BBFABBA6;">在你完成 Wi-Fi 登入後就消失</mark> → 是 Captive Portal 造成的誤判，安全。
> 憑證警告 <mark style="background: #FF5582A6;">在網路完全正常的情況下還一直出現</mark> → 認真對待，換網路再試，還是有的話就要查了。

> [!tip] 補充：Gemini 沒提但值得知道的
> <mark style="background: #D2B3FFA6;">現代作業系統其實有偵測 Captive Portal 的機制</mark>（Windows 的 NCSI、Android 的 `connectivitycheck.gstatic.com`、Apple 的 `captive.apple.com`），它們會去打一個特定的 HTTP 網址看回應對不對，藉此判斷「是否被攔截」，然後自動跳出登入視窗。這也是為什麼手機常常一連上就自動彈登入頁，而 VS Code 這種背景程式沒有這套機制，只能靠憑證錯誤來反應。
> <mark style="background: #FFB8EBA6;">另外實用小技巧：連上公共 Wi-Fi 後先開瀏覽器完成登入，再開 IDE 或跑 `npm install`，可以避開一整批莫名其妙的連線錯誤。</mark>

---

## 練習題

網路與憑證沒有 LeetCode 對應題。若要理解憑證鏈的驗證邏輯（一層層往上找到可信根），概念上最接近的是：

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 1584 | [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) | 信任關係本質是圖，憑證鏈是其中一條路徑 |
| 990 | [Satisfiability of Equality Equations](https://leetcode.com/problems/satisfiability-of-equality-equations/) | Union-Find 判斷「這兩個東西可不可信為同一群」，跟信任根的概念相通 |

---

## 各對話來源（原文）

### SonarLint SSL 憑證警告解析（2026-08）— https://gemini.google.com/app/25e4d23461e5b89f

**使用者：**（附上 VS Code 憑證警告的截圖）這什麼問題

**Gemini：** 這個警告是 SonarQube / SonarLint 擴充功能偵測到網路連線被阻截或攔截（MITM）所跳出的 SSL 憑證信任提示。背景瀏覽器開著 Ruckus 的 Captive Portal（無線網路認證頁面），說明你目前連接的是公共或企業 Wi-Fi。SonarLint 在背景發送 HTTP/HTTPS 請求時，流量被 Ruckus AP 攔截，回傳了 Ruckus 設備本身的自簽憑證（Ruckus Wireless Inc.），導致 SonarLint 認為這是一個「不可信的伺服器憑證」。
解決方法與建議：直接點擊「Don't trust」或「Cancel」（這是最安全的做法，通常在你完成公共 Wi-Fi 的網頁登入後，網路恢復正常，警告就不會再出現）；完成 Wi-Fi 認證；如果連線正常但持續跳出，若你是在公司內部網路且公司確實使用 Ruckus 網關進行 SSL 通訊檢查，點擊 Trust 才會將該憑證存入 SonarLint 的信任庫（預設密碼為 `sonarlint`）。若在非信任的外部網路，請切勿點擊 Trust。

**使用者：** 為何登入以後就正常了，但我現在其實在路易莎欸

**Gemini：** 這是因為公共 Wi-Fi 的 Captive Portal（強制頁面門戶）運作機制。
未登入前的狀態（中間人攔截）：路易莎的 Wi-Fi 路由器（使用 Ruckus 設備）為了強制讓你看到登入畫面，會把你的所有網路請求強制劫持到他們的認證網頁。當 VS Code 的 SonarLint 插件嘗試連回伺服器時，請求被 Ruckus 攔截，Ruckus 回傳了自己的 SSL 憑證，而非 SonarLint 預期的憑證。SonarLint 發現憑證不對勁，以為遇到中間人攻擊，因此跳出警報。
登入成功後的狀態（放行流量）：當你在瀏覽器點擊同意並完成登入後，Ruckus 路由器會將你的 MAC 地址加入「允許名單（Allowlist）」，路由器停止劫持你的流量，直接將請求放行傳到真實的網際網路。SonarLint 終於能順利連到真正的伺服器、拿到正確的 SSL 憑證，警告自然就消失了。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/25e4d23461e5b89f | 2026-08，本次歸檔 2026-08-25 |
| RFC 6585（HTTP 511 Network Authentication Required，Captive Portal 專用狀態碼） | https://datatracker.ietf.org/doc/html/rfc6585#section-6 | 2012 發布，查證 2026-08-25 |
| RFC 8952（Captive Portal Architecture） | https://datatracker.ietf.org/doc/html/rfc8952 | 2020 發布，查證 2026-08-25 |
| MDN：Transport Layer Security | https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security | 查證 2026-08-25 |
| SonarQube for IDE（原 SonarLint）文件 | https://docs.sonarsource.com/sonarqube-for-ide/ | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 補充
> Gemini 的技術解釋正確，但<mark style="background: #FF5582A6;">沒有給出「什麼時候該怕、什麼時候不用怕」的判斷準則</mark>，只描述現象。(l) 那條法則是本篇補上的，是這篇最該記住的東西。
> 另外 Gemini <mark style="background: #FF5582A6;">沒有提到作業系統本身有 Captive Portal 偵測機制</mark>，也沒有提到「先登入 Wi-Fi 再開 IDE」這個實務習慣，這兩點在上方補充區塊補上。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
