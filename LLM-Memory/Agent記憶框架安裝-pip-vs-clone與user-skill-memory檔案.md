---
title: Agent 記憶框架安裝（pip vs clone）與 user.md / skill.md / memory.md 差異
type: topic-note
source: Gemini
tags: [gemini, llm, agent, memory, letta, mem0, pip, git-clone]
sources:
  - https://gemini.google.com/app/4dbb54723c5e97e4
updated: 2026-06-28
---

# Agent 記憶框架安裝與核心配置檔解析

## 重點整理

### 1. Agent 記憶框架（Letta / MemGPT、Mem0）怎麼裝？
- <mark style="background: #BBFABBA6;">90% 場景直接 `pip install`</mark>：只是要在自己專案裡調用記憶功能、要穩定發佈版、方便在 `requirements.txt` 記版本。
- <mark style="background: #FFF3A3A6;">只有這些情況才 `git clone`</mark>：想貢獻程式碼修 bug／發 PR、需要改框架核心邏輯（底層 memory 管理）、想跑 `tests`／`examples`（pip 包通常不含）。

```bash
# Mem0
pip install mem0ai
# Letta（原 MemGPT）
pip install letta
```

> [!warning] 開發提醒
> 這些框架通常要<mark style="background: #FFB8EBA6;">搭配資料庫（PostgreSQL）或向量資料庫</mark>；本地開發前先確認 <mark style="background: #FF5582A6;">環境變數（API Keys）已正確配置</mark>。

### 2. `pip install` vs `git clone` 核心差異 ⭐
> 比喻：<mark style="background: #FFF3A3A6;">`pip install` 像從 App Store 下載 App（直接用）；`git clone` 是把原始碼整包搬回家（看怎麼寫、甚至改寫）。</mark>

| 特性 | `pip install [package]` | `git clone [url]` |
|---|---|---|
| 對象 | 已發布的<mark style="background: #ADCCFFA6;">成品</mark>（Wheel/Source Dist） | 原始<mark style="background: #ADCCFFA6;">程式碼倉庫</mark>（Repository） |
| 存放位置 | Python 的 `site-packages` | 你指定的工作目錄 |
| 修改權限 | 不易修改，只當 Library 調用 | 隨意改、可自行 commit |
| 版本控制 | 用 pip 升降版本 | 用 git 切分支／回溯 |
| 包含內容 | 僅執行所需檔案 | 含開發文件、測試、Git 歷程 |

- 進階技巧：clone 後若想在專案中使用又能即時生效，用 <mark style="background: #BBFABBA6;">`pip install -e .`（可編輯模式）</mark>，改了 clone 的 code 專案會同步生效。
- 對 Letta／Mem0 的建議：<mark style="background: #BBFABBA6;">先 `pip install` 跑通功能</mark>，要深入研究向量資料庫底層邏輯時再 clone。

### 3. `user.md` / `skill.md` / `memory.md` 差在哪 ⭐
> 一句話：<mark style="background: #FFF3A3A6;">user.md 是關於「你」，skill.md 是關於「能力」，memory.md 是關於「過去」。</mark>
> 把 AI 想成新助理：user.md＝對老闆的觀察筆記、skill.md＝隨身工作手冊、memory.md＝發生過什麼事的日誌。

| 檔案 | 核心問題 | 變動頻率 | 範例 |
|---|---|---|---|
| <mark style="background: #ADCCFFA6;">user.md</mark>（用戶畫像） | 你是誰？喜歡什麼？ | <mark style="background: #BBFABBA6;">低</mark>（換工作/改習慣才動） | 「全端工程師」「元件用 PascalCase」 |
| <mark style="background: #ADCCFFA6;">skill.md</mark>（能力清單/SOP） | 怎麼做這件事？ | 中（有新技術/流程優化） | 「部署 Next.js 步驟」「串 LINE Pay 流程」 |
| <mark style="background: #ADCCFFA6;">memory.md</mark>（長期記憶/日誌） | 發生了什麼事？ | <mark style="background: #FF5582A6;">高</mark>（隨對話自動更新） | 「專案 DB 已從 MySQL 換成 PostgreSQL」 |

- 作用對照：user.md 讓 AI 講話<mark style="background: #FFF3A3A6;">合你胃口、不必每次自我介紹</mark>；skill.md 讓 AI 面對複雜任務<mark style="background: #FFF3A3A6;">翻手冊照 SOP 走、不胡搞</mark>；memory.md <mark style="background: #FFF3A3A6;">解決 LLM「健忘」</mark>、避免重複問已講過的事。
- 結合 Obsidian 習慣：user.md＝個人 Readme；skill.md＝你正在建的「程式問答筆記」；memory.md＝你的「開發日誌 Daily Logs」。

## 自我測驗

<details class="quiz">
<summary>是非題：要在自己的專案裡呼叫 Mem0 的記憶功能，最推薦的方式是 <code>git clone</code> 整個倉庫。</summary>
<div class="ans">

<strong>✗ 錯。</strong> 只是調用功能應該 <mark style="background: #BBFABBA6;">`pip install`</mark>（穩定發佈版、好管版本）。`git clone` 留給要改核心、發 PR、或跑 examples/tests 的情況。

</div>
</details>

<details class="quiz">
<summary>填空：clone 下原始碼又想在專案即時生效，可用 <code>pip install ____</code> 進入可編輯模式。</summary>
<div class="ans">

`pip install <mark style="background: #BBFABBA6;">-e .</mark>`（editable mode），改 clone 的 code 專案會同步生效。

</div>
</details>

<details class="quiz">
<summary>申論題：「上次提到專案 DB 已從 MySQL 換成 PostgreSQL」這條資訊應該寫進哪個檔案？為什麼？</summary>
<div class="ans">

寫進 <mark style="background: #ADCCFFA6;">memory.md</mark>。它是<mark style="background: #FF5582A6;">隨對話動態更新</mark>的長期記憶/日誌，記錄過去發生的事與重要結論，解決 LLM 健忘問題；user.md（固定偏好）與 skill.md（SOP）變動頻率低，不適合放這種動態進度。

</div>
</details>

## 各對話來源

### Agent 記憶框架安裝指南（2026-06）— https://gemini.google.com/app/4dbb54723c5e97e4

<div class="srcline"><span class="u">使用者：</span>（貼框架截圖）這個框架通常用下載的還是 clone？</div>
<div class="srcline"><span class="g">Gemini：</span>Letta(MemGPT)/Mem0 這類記憶框架 90% 建議 `pip install`（快速集成、穩定發佈版、好記版本）；只有要貢獻程式碼、深度改核心、跑 examples/tests 才 clone。附 `pip install mem0ai` / `pip install letta`，並提醒需搭配 DB／向量庫與設定 API Keys。</div>
<div class="srcline"><span class="u">使用者：</span>所以 pip install 跟 clone 有什麼差異？</div>
<div class="srcline"><span class="g">Gemini：</span>pip install＝下載成品直接用（進 site-packages、不易改、pip 控版本、僅執行檔）；git clone＝整包原始碼搬回（任意目錄、可改可 commit、git 控分支、含文件測試歷程）。進階用 `pip install -e .` 可編輯模式。建議先 pip 跑通，要研究底層再 clone。</div>
<div class="srcline"><span class="u">使用者：</span>你知道 user.md skill.md memory.md 差在哪嗎？</div>
<div class="srcline"><span class="g">Gemini：</span>user.md＝用戶畫像（你是誰/偏好，變動低）；skill.md＝能力清單/SOP（怎麼做，變動中）；memory.md＝長期記憶/日誌（發生什麼事，變動高、隨對話更新，解決 LLM 健忘）。並對照 Obsidian：user.md＝個人 Readme、skill.md＝程式問答筆記、memory.md＝開發日誌。</div>
