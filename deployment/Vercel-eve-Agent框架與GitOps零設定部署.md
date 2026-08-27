---
title: Vercel eve Agent 框架與 GitOps 零設定部署 — AI Gateway、Blackbox 與 GLM 5.2 的角色
type: topic-note
source: Gemini
tags: [gemini, deployment, vercel, ai-agent, gitops, cicd, ai-gateway, llm]
sources:
  - https://gemini.google.com/app/c88d2e6e9602cab6
updated: 2026-08-27
---

# Vercel eve Agent 框架與 GitOps 零設定部署 — AI Gateway、Blackbox 與 GLM 5.2 的角色

本篇重點 a–k，共 11 個

## 重點整理

### 一、名詞各自是什麼角色（最容易混在一起的三個）

a. <mark style="background: #ADCCFF;">eve</mark>：Vercel 推出的 <mark style="background: #FFF3A3;">AI Agent 開發框架與 CLI 工具</mark>，<mark style="background: #FF5582;">不是某個特定 Agent 的名字</mark>。可以用 `npx eve@latest init my-agent` 建立自己的 Agent 專案，用 `eve set --model zai/glm-5.2` 之類的指令設定模型。指令裡的 `my-agent` 才是你自己 Agent 的名字。

b. <mark style="background: #ADCCFF;">Vercel AI Gateway</mark>：模型呼叫的統一入口（Gateway），把多家模型供應商串在同一個 API 後面，讓你在專案裡換模型只要改設定字串。

c. <mark style="background: #ADCCFF;">Blackbox AI</mark>：在這件事裡扮演的是<mark style="background: #FFF3A3;">模型託管與提供商（Provider）</mark>的角色。Vercel 的 AI Gateway 整合了它的服務，把 GLM 5.2 等開放模型串進平台供開發者呼叫。

d. <mark style="background: #ADCCFF;">Claude 與 eve 的關係</mark>：<mark style="background: #BBFABB;">兩者性質不同，不用二選一</mark>。Claude 是模型（Brain），eve 是 Agent 的開發框架與軟體架構（Skeleton／Environment）。在 `agent/agent.ts` 裡可以先把模型設成 GLM 5.2 享優惠，之後隨時切回 Claude 或其他 AI Gateway 支援的模型。

e. 只要在既有專案中引入 eve 套件並建立 `agent/agent.ts` 寫入設定，該專案就具備 eve Agent 的基礎架構——<mark style="background: #FFF3A3;">這個設定檔就是讓應用程式變成 Agent 的關鍵核心</mark>。

### 二、「Clone 模板到 GitHub 就能部署」背後的理念

f. 這套流程背後是 <mark style="background: #ADCCFF;">IaC（Infrastructure as Code，基礎設施即程式碼）</mark>與 <mark style="background: #ADCCFF;">GitOps</mark> 的整合，加上 Vercel 主打的 <mark style="background: #ADCCFF;">Zero-Configuration（零設定）</mark>開發體驗。

g. <mark style="background: #FFF3A3;">版本控制即單一事實來源（Single Source of Truth）</mark>：專案原始碼與設定檔集中放在 GitHub，每次變更與部署狀態都有歷史紀錄可循，要回滾就是回到某個 commit。

h. <mark style="background: #BBFABB;">自動化 CI/CD 流水線</mark>：GitHub 帳號連結 Vercel 之後，只要 Fork／Clone 該模板並推送到 GitHub，Vercel 就自動觸發 Build（打包）與 Deploy（部署），不必自己設定伺服器或寫部署腳本。

i. <mark style="background: #FFB8EB;">快速驗證 MVP</mark>：讓開發者能在幾分鐘內，從一個想法變成線上有網址、具備串流（Streaming）與 AI 介面的完整應用。

### 三、實際操作步驟

j. 官方模板路徑：點畫面上的 <mark style="background: #BBFABB;">Clone Template</mark> 按鈕 →「Create Git Repository」步驟中<mark style="background: #FFF3A3;">選擇你自己的 GitHub 帳號並填一個新的 repo 名稱</mark>（Vercel 會自動幫你在該帳號底下建立 repo 並推入模板程式碼，不需要你手動貼到 GitHub 任何地方）→ 填入所需環境變數（該模板要求 `EVE_CHAT_PASSWORD`）→ Deploy。部署完成後在 Vercel AI Gateway 把模型切換／設定為 GLM 5.2 即可。

k. <mark style="background: #FF5582;">⚠️ 對話中的缺口</mark>：Abby 追問「Fork/Clone 之後到底要貼到 GitHub 的哪裡」時，Gemini 回覆失敗沒有答出來。上面 (j) 是補齊的答案：<mark style="background: #BBFABB;">Vercel 的 Clone Template 流程本身就會替你建立 repo，你不需要手動複製貼上任何程式碼</mark>；如果是用 CLI 起專案，才需要自己 `git init`、`git remote add origin <你的 repo 網址>`、`git push -u origin main`。

## 關聯筆記（附關聯原因）

- [[GitHub-Actions-CICD-ghcr與Docker映像檔]] — 那篇是自己動手寫 CI/CD 流水線，本篇 (h) 則是平台幫你全部包好的版本，兩篇對照最能看出 Zero-Configuration 省掉了哪些步驟。
- [[Zeabur-主機遷移-DeepSeek-API與費用比較]] — 同樣是「PaaS 平台 + 模型 API 費用」的選型比較，可與本篇 (c)(d) 的模型供應商角色一起看。
- [[Jekyll與GitHub-Pages把Markdown筆記變成免費網站]] — 同屬「推上 GitHub 就自動部署」的 GitOps 體驗，是本篇 (g)(h) 概念的另一個實例。
- [[LLM-Memory]] 資料夾內的 Agent 相關筆記 — 本篇 (a)(e) 的 Agent 框架與那些筆記的 Agent／MCP 概念屬同一條學習線。

## 各對話來源（原文）

### 免費部署教學指南（2026-08-27）— https://gemini.google.com/app/c88d2e6e9602cab6

使用者：我現在要怎麼用這個免費部署

Gemini：要使用畫面中提供的免費體驗（GLM 5.2），可以按照以下步驟操作：點擊畫面左下角提示框的 Learn More，或點擊中央 Start with the Eve Chat Template 區塊中的 Clone Template 按鈕；將模板複製（Clone）至您的 GitHub 帳號並部署到 Vercel；部署完成後，透過 Vercel AI Gateway 將模型切換／設定為 GLM 5.2 即可免費使用至 8 月 27 日。

使用者：eve 是 agent 的名字嗎

Gemini：eve 在這裡主要指的是 AI Agent 的開發框架與生態系統，而不是單一某個具體 Agent 的名字。開發框架／CLI 工具：它是 Vercel 推出的 Agent 框架，你可以透過 `npx eve@latest init my-agent` 建立自己的 Agent 專案，也可以透過 CLI 指令（如 `eve set --model zai/glm-5.2`）來設定與管理 Agent 的模型。預設模板／範例：頁面上的 eve Chat Template 並不是單一特定 Agent 的名字，而是 Vercel 推出的 Agent 開發框架與工具名稱。當你使用 CLI 指令建立專案時（例如執行 `npx eve@latest init my-agent`），`my-agent` 才代表你所建立的 Agent 名稱。

使用者：blackbox 是什麼？那我原本有 claude，所以我在我專案建這個檔之後就有一個 vercel 的 eve agent 了嗎

Gemini：Blackbox AI 在這裡扮演的是模型託管與提供商（Provider）的角色。Vercel 的 AI Gateway 透過整合 Blackbox AI 的服務，將 GLM 5.2 等開放模型串接到平台中供開發者免費或付費呼叫。關於 eve Agent 與專案檔案：不需要完全放棄 Claude，這兩者的性質不同。Claude 是你目前使用的 AI 模型（Brain）；eve 是 Vercel 的 Agent 開發框架與軟體架構（Skeleton／Environment）。若你在既有的專案中建立 `agent/agent.ts` 並寫入設定，這代表你正在使用 eve 框架來定義一個 Agent。建立專案／檔案：當你在專案中引入 eve 套件並建立 `agent/agent.ts` 後，該專案就具備了 eve Agent 的基礎架構。模型的選擇：你可以在 `agent.ts` 中將模型設定為 GLM 5.2，或者在之後切換回 Claude 或其他由 AI Gateway 支援的模型。簡單來說，這個設定檔就是讓你的應用程式具備 eve Agent 特性的關鍵核心。

使用者：這是什麼理念啊？把這個模板放到 GitHub 帳戶就可以部署 vercel

Gemini：這主要是「Infrastructure as Code (IaC) / 宣告式開發」與「GitOps 部署流程」的整合理念。Vercel 提倡的是 Zero-Configuration（零設定）與開箱即用的開發體驗。這種設計理念的核心在於：版本控制即 single source of truth，將專案原始碼與設定檔集中放在 GitHub，確保每次程式碼變更與部署狀態都有歷史紀錄可循；自動化 CI/CD 流水線，只要你的 GitHub 帳號連結了 Vercel，當你 Fork/Clone 該模板並推送到 GitHub，Vercel 就會自動觸發 Build（打包）與 Deploy（部署）流程，無須自己手動設定伺服器或編寫複雜的部署腳本；快速驗證 MVP，讓開發者能在幾分鐘內，從一個想法直接變成線上有網址、具備 Streaming 與 AI 介面能力的完整應用。

使用者：當你 Fork/Clone 該模板並推送到 GitHub，到底要貼到 github 的哪，倒是講清楚啊

Gemini：（此則回覆失敗，Gemini 表示沒有存取該內容的權限，未答出結果。補答見本篇重點 j 與 k。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/c88d2e6e9602cab6 | 2026-08-27 擷取 |
| Vercel 官方文件 — AI Gateway | https://vercel.com/docs/ai-gateway | 2026-08-27 查證 |
| Vercel 官方文件 — Deploying Git repositories（Clone Template 建立 repo 流程） | https://vercel.com/docs/deployments/git | 2026-08-27 查證 |
| Vercel — eve Agent 範例庫 | https://github.com/vercel/eve-examples | 2026-08-27 查證 |
| Weaveworks — GitOps 原始定義文章 | https://www.weave.works/technologies/gitops/ | 2026-08-27 查證 |

> <mark style="background: #FF5582;">時效提醒</mark>：本篇提到的 GLM 5.2 免費額度截止日為 2026-08-27，之後請以 Vercel AI Gateway 當下的定價頁為準。
