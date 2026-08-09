---
title: Test Harness 傳統測試框架與 AI Harness 差異
type: topic-note
source: Gemini
tags: [gemini, test-harness, ai-harness, agent, guardrails, testcontainers, evaluation]
sources:
  - https://gemini.google.com/app/fcf19c3919e8aeb7
updated: 2026-08-01
---

# Test Harness 傳統測試框架與 AI Harness 差異

本篇重點 a–n，共 14 個

## 重點整理

a. <mark class="b">Test Harness（測試框架/測試底層環境）定義：</mark>在單元測試或整合測試中，用來自動化執行測試、準備環境、注入依賴與模擬（Mock）輸入輸出的底層環境；在外部層級（API/服務整合測試/微服務）架設，目的是把被測系統（SUT）當黑盒，完全從外圍模擬真實相依服務。

b. 外層 Harness 核心架構：Test Runner 透過 HTTP/RPC 呼叫 SUT，SUT 對外的呼叫則導向 Mock/WireMock/LocalStack/Testcontainers 等模擬服務層，讓 SUT 收到的外部回應完全可控可預測。

c. <mark class="y">架設步驟：</mark>① 隔離外部依賴——REST API 用 WireMock/MSW 搭 Stub Server，資料庫/MQ/Redis 用 Testcontainers 或 Docker Compose 拉起乾淨隔離實例；② 設計 Harness 模組三個生命週期 `setup()`(啟動模擬容器)、`reset()`(每筆測試前清理狀態)、`teardown()`(釋放資源)；③ 測試案例透過統一 Harness 介面（`beforeAll`/`afterEach`/`afterAll`）專注在測試邏輯與斷言。

d. <mark class="g">最佳實踐：</mark>環境變數注入（SUT 需支援用環境變數覆寫外部服務 URL，否則 Harness 無法導流到 Mock）、共享容器策略降低重建成本（每次測試前 TRUNCATE 或 reset 狀態）、Deterministic State（測試間絕不互相干擾，所有外部回應與資料庫狀態每次測試開頭重新設定）。

e. <mark class="b">AI Harness 定義：</mark>包在 LLM 外層的一套控制與評測系統。因為 LLM 本質上是黑盒且具隨機性（non-deterministic），AI Harness 負責輸入處理（Prompt 模板/RAG/Guardrails）、流程控制與 Tool Call、輸出結構化與校正（JSON Schema 驗證/修復）、評估與監控（回答品質評分/Token 消耗/延遲）。

f. AI Harness 架構：使用者輸入先經 Input Guardrails（安全檢查/防注入）與 Context/RAG Builder，進入 Harness Engine 與 LLM 模型（Gemini/Claude）往返，再經 Tool Call Manager（執行工具/重試）與 Output Parser（校正 JSON/Schema）、最後由 Evaluator & Logger 記錄品質與 Token，才輸出最終結構化結果。

g. <mark class="y">AI Harness 三大類型：</mark>① Agent Runtime Harness——控管 Agent 行動邏輯，限制思考輪數避免死迴圈、捕捉 tool_call 去執行實際 API/DB、JSON 格式錯誤時自動請 AI 修正；② Evaluation Harness（如 `lm-evaluation-harness`）——丟入 MMLU/GSM8K 等 Benchmark 題集自動計分，統計正確率與幻覺率；③ Guardrails & Governance Harness——輸入過濾（Prompt Injection/PII）、輸出過濾（違規內容/JSON Schema 合規）。

h. 傳統 Test Harness vs AI Harness 對照：主要對象「傳統程式碼/微服務(SUT)」vs「LLM/AI Agent」；核心挑戰「控制外部服務依賴與模擬環境」vs「控制不確定性(non-determinism)與幻覺」；主要任務「Setup DB、Mock API、執行 Assertion」vs「Guardrails、Prompt 注入、Tool 執行、格式校正、Eval 評分」。

i. <mark class="g">正解：不需要為 AI 系統寫兩套業務邏輯——</mark>核心業務邏輯（結帳流程/計算折扣/抓資料庫）只寫在應用程式（Backend/API）裡；AI 負責思考、理解語言、決策與調用工具；AI Harness 是 AI 與原本系統之間的「守門員與接線生」，不是把 AI 思考邏輯重寫一遍。比喻：LLM 像能力強但偶爾犯錯的高薪顧問，AI Harness 像資深秘書——整理資料交給顧問（RAG/Context）、提醒顧問照公司格式講話（Output Validation）、顧問要做事時秘書幫忙操作內部系統（Tool Call）；業務系統才是公司真正的核心系統。

j. Harness 程式碼實際在寫什麼（通常只有幾百行，或直接調用 LangChain/LlamaIndex/Vercel AI SDK）：① 結構化約束（Schema Enforcement，JSON 格式不符自動加警語重送）；② 安全防護門（Guardrails，攔截敏感詞/Prompt Injection 不送給 AI）；③ 工具橋接器（Tool Executor，AI 要呼叫某函式時 Harness 代為呼叫後端 Service，結果轉文字餵回 AI）。

k. <mark class="p">業界常見 AI Harness 工具：</mark>評測類——`EleutherAI/lm-evaluation-harness`（`git clone` + `pip install -e .`，Hugging Face 排行榜背後的評測底層）、Promptfoo（`npx promptfoo@latest init`，CI/CD 用的 Prompt/RAG 測試工具）；Agent 控制類——LangChain/LangGraph（`npm install langchain @langchain/core` 或 `pip install langchain`）、Letta（前身 MemGPT，`pip install letta`，長期記憶 Agent 控制框架）；防護類——Guardrails AI（`pip install guardrails-ai`）。<mark class="r">AI Harness 不是單一叫這個名字的下載軟體，而是一種軟體設計架構/工具套件的統稱，沒有單一官網下載頁。</mark>

l. <mark class="r">Harness 沒有、也不可能達到 100% 準確率，</mark>原因：① LLM 底層是機率預測下一個 token，非確定性邏輯，即使 Temperature=0 仍可能在複雜語境產生幻覺或邏輯謬誤；② Prompt Injection 是無限博弈，攻擊者持續發明新越獄語法，Guardrail 規則不可能預測所有未知攻擊模式；③ 人類語言本身有歧義，語意不明時 Harness 難以 100% 判斷 AI 回答是否真正符合使用者意圖。

m. 加上良好 Harness 後的量化改善（相對「無 Harness 純 LLM 直連」）：JSON 格式合法率從約 70~85% 提升到約 99.9%（自動重試修復）；幻覺控制（RAG 情境）從容易憑空捏造降至約 2~5% 以下（限定只依參考資料回答）；工具調用成功率提升到 95% 以上（型別檢查+Fallback 重試）；Prompt 攻擊防禦率可達 90~98% 以上。

n. <mark class="v">業界因應「無法 100% 準確」的策略：</mark>Human-in-the-loop（高風險操作如轉帳/發正式信/改權限，Harness 只輸出「待確認動作」由人工點擊確認）、Graceful Degrade（重試 3 次仍失敗或低信心度時，直接切回傳統固定程式碼或回覆「系統繁忙」，不把壞答案丟給使用者）、持續監控與評測（用 Promptfoo/LangSmith 等每天跑幾千個邊界案例，確保更新 Prompt 或模型後準確率不下滑）。

## 各對話來源

### 外層 Test Harness 架設指南（2026-08-01 擷取）— https://gemini.google.com/app/fcf19c3919e8aeb7

**使用者：** 如何在外層架harness

**Gemini：** 在單元測試（Unit Test）或整合測試（Integration Test）中，Test Harness（測試架框/harness）指的是一種用來自動化執行測試、準備環境、注入依賴與模擬（Mock）輸入輸出的測試底層環境。在外部層級（例如 API、服務整合測試、或微服務架構）架設 Harness，通常是為了達成「把被測系統（SUT）當作黑盒，完全從外圍模擬真實相依服務」的目的。（架構圖、隔離外部依賴、`ExternalTestHarness` 的 `setup/resetState/teardown` TypeScript 範例、`describe/beforeAll/afterEach/afterAll` 測試案例範例，詳見「重點整理」a–d，程式碼略。）

**使用者：** Ai harness感覺跟你上面說的不太一樣

**Gemini：** 你說得完全沒錯！如果是「AI Harness」（例如 LLM Agent Harness、Evaluations Harness、或控制 LLM 輸出／行為的執行框架），概念跟傳統軟體測試的 Test Harness 確實大不相同。AI Harness 的重點不再只是「模擬外部 API」，而是為不可預測的 AI 模型建立一個「安全防護牆、輸入輸出管道與評價機制」。（架構圖、三大類型、`AiHarness.runWithSchema` 自我修正程式碼範例、傳統 vs AI Harness 對照表，詳見「重點整理」e–h，程式碼略。）

**使用者：** AI harness也是程式碼嗎？這樣不就要寫兩套？

**Gemini：** 是的，AI Harness 完全也是程式碼。至於「是不是要寫兩套」，簡短的答案是：不用寫兩套完全相同的商業邏輯，因為這兩者的角色完全不同。（角色分工說明、主管與秘書比喻，詳見「重點整理」i–j。）

**使用者：** 給我Ai harness的下載連結

**Gemini：** 理解你的困惑了！當大家在討論 AI Harness 時，它其實不是指某一個特定叫「AI Harness」的桌面軟體（所以沒有一個像 Chrome 那樣點擊下方的按鈕就能下載安裝檔的官網）。在科技界，「AI Harness」是指一種軟體設計架構（Scaffolding），或是用來包裝、評測、約束 LLM 的工具套件／開發框架（Frameworks & SDKs）。（工具清單與安裝指令詳見「重點整理」k。）

**使用者：** Harness 已有100%準確率了嗎

**Gemini：** 沒有，目前完全沒有任何 AI Harness 可以達到 100% 的準確率，而且在理論與實務上都不可能達到 100%。這也是為什麼業界現在主流的說法是「降低風險（Mitigation）」，而不是「完全消除風險」。（三個不可能達 100% 的原因、量化改善對照表、業界因應策略，詳見「重點整理」l–n。）

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
| --- | --- | --- |
| 外層 Test Harness 架設指南對話 | https://gemini.google.com/app/fcf19c3919e8aeb7 | Gemini 對話，擷取存檔於 2026-08-01 |
| lm-evaluation-harness | https://github.com/EleutherAI/lm-evaluation-harness | GitHub 專案（Gemini 對話中提及，未逐一查證最新版本號） |
| Promptfoo | https://www.promptfoo.dev/ | 官方工具（Gemini 對話中提及） |
| Letta（前身 MemGPT） | https://github.com/letta-ai/letta | GitHub 專案（Gemini 對話中提及） |
| Guardrails AI | https://www.guardrailsai.com/ | 官方工具（Gemini 對話中提及） |

⚠️ 存疑/更正：Gemini 提到的量化數字（JSON 合法率 70~85%→99.9%、幻覺率 2~5%、工具調用成功率 95%+、Prompt 攻擊防禦率 90~98%）為業界概略經驗值，Gemini 未附出處，屬於「聽起來合理但沒有具體 benchmark 來源」的說法，Abby 若要引用建議自行查證原始研究或 vendor 文件，不宜直接當作精確數據引用。
