# Context Engineering vs Prompt Engineering

> 日期：2026-04-29
> 來源：LangChain Deep Agents 文件

## 一句話定義

**Context engineering 是用正確的格式，把正確的資訊與工具提供給 deep agent，讓它能可靠地完成任務。**

> Context engineering is providing the right information and tools in the right format so your deep agent can accomplish tasks reliably.

## 核心差異

| 維度 | Prompt Engineering | Context Engineering |
|------|--------------------|---------------------|
| **層級** | 戰術（單一 prompt） | 系統（整個 agent 運作） |
| **關注** | 字句、措辭、few-shot 範例 | 資訊來源、工具、記憶、子任務 |
| **目標** | 讓 LLM 這一次給出好回應 | 讓 agent 跨多輪、多工具地穩定完成任務 |
| **常見於** | LLM 使用技巧教學 | LLM 運作原理、Agent 架構文件 |
| **失敗時的徵兆** | 回答跑題、格式錯誤 | Agent 忘記目標、工具誤用、上下文爆炸 |

> ⚠️ 兩者都以 "engineering" 結尾，但 context engineering 是更上層、更系統化的概念。

## Deep Agent 能存取的上下文來源

Deep agent 可以存取**多種上下文**，依「進入時機」分兩類：

### 1. 啟動時提供（startup-time）
- System prompt
- 預先註冊的 tools 定義
- 預載的知識庫 / RAG retriever
- 子代理（sub-agent）配置

### 2. 執行時取得（runtime-available）
- 使用者輸入（user input）
- Tool 執行結果
- 檢索到的文件 / RAG 結果
- 子代理回傳的中介結果

## Input Context（輸入上下文）

> **原文**：Input context is information provided to your deep agent at startup that becomes part of its system prompt. The final prompt consists of several sources:

**翻譯**：Input context 是在 deep agent **啟動時**提供給它、並會**成為其 system prompt 一部分**的資訊。最終的 prompt 由數個來源組成：

### Input Context 的四個來源（LangChain 官方）

| 來源 | 原文說明 | 中文說明 | 對應到 Claude Code |
|------|---------|---------|-------------------|
| **System prompt** | Custom instructions you provide plus built-in agent guidance. | 你提供的自訂指令 + 內建的 agent 指導 | 系統內建 + CLAUDE.md 開頭 |
| **Memory** | Persistent AGENTS.md files always loaded when configured. | 設定後**永遠載入**的 persistent AGENTS.md 檔案 | CLAUDE.md / MEMORY.md |
| **Skills** | On-demand capabilities loaded when relevant (progressive disclosure). | **按需載入**的能力，相關時才載入（漸進式揭露） | `superpowers:*` skills |
| **Tool prompts** | Instructions for using built-in tools or custom tools. | 使用內建工具或自訂工具的指令 | Read/Edit/Bash 等工具的描述 |

### 兩種載入策略：Always vs On-demand

這四個來源其實分兩派：

```
Always loaded（一律載入）           On-demand（按需載入）
─────────────────────              ────────────────────
System prompt                      Skills（progressive disclosure）
Memory（AGENTS.md / CLAUDE.md）
Tool prompts
```

**Progressive disclosure（漸進式揭露）**是關鍵設計：
- Skills 不會全部塞進 system prompt（會爆 context）
- 只在 agent 判斷需要某 skill 時才把它的內容載入
- 這就是為什麼 Claude Code 的 skills 是「用 Skill tool 觸發」而不是預載

### 關鍵理解

「Input context 在啟動時就拼進 system prompt」這句話的含意：
- **不是執行時動態插入**（user input、tool result 那種），是 agent 一啟動就固定下來的「身份與工具書」
- 想改 input context = 要重啟 agent / 重新組 prompt
- 這也解釋了為什麼 deep agent 的 system prompt 會那麼長（Claude Code 那種上千行）——它把 agent 完成任務需要的**所有靜態資訊**（系統指令 + 持久記憶 + 工具說明）全部塞進 input context 裡

### 你正在用的就是這個架構

對照一下，你跟我（Claude Code）對話時 input context 長這樣：
- **System prompt**：Anthropic 的 Claude Code 系統提示（不可見）
- **Memory**：`CLAUDE.md` + `MEMORY.md`（你看得到的那份 auto memory）
- **Skills**：`superpowers:*` 系列（用到才載入）
- **Tool prompts**：Read/Edit/Bash/Grep 等工具的 schema 說明

這就是為什麼你的 CLAUDE.md / MEMORY.md 那麼重要——它**永久注入** input context，每次新對話都會帶。

## 易混淆：Context Window ≠ Terminal Window

「Window」這個詞在資訊領域被太多概念共用，初學者很容易混淆。

### 「Window」在不同領域的意思

| 領域 | Window 指什麼 | 單位 |
|------|--------------|------|
| **Terminal** | 顯示視窗（UI 介面） | 欄 × 列（cols × rows） |
| **LLM Context Window** | 模型一次能處理的 token 上限 | tokens |
| **TCP Window** | 流量控制的緩衝區大小 | bytes |
| **Sliding Window**（演算法） | 滑動範圍 | 元素數量 |
| **SQL Window Function** | 分組計算的範圍 | rows |
| **Browser Window** | 瀏覽器視窗 | UI 視窗 |

### Terminal Window vs LLM Context Window 的根本差異

```
Terminal Window（顯示用）
┌──────────────────────────────────┐
│ $ echo hello                     │ ← 這是「畫面」
│ hello                            │
│ $ _                              │
└──────────────────────────────────┘
   寬 × 高 = 物理顯示尺寸（COLUMNS × LINES）
   你看不到的內容還在 scrollback buffer 裡，沒消失


LLM Context Window（記憶用）
┌──────────────────────────────────┐
│ system prompt + history + ...    │ ← 這是「腦容量」
└──────────────────────────────────┘
   tokens = 模型「能看見」的範圍
   超出範圍的內容對模型而言「不存在」，不是看不到而已
```

### 關鍵差異對照

| | Terminal Window | LLM Context Window |
|--|----------------|---------------------|
| **看不到的內容** | 還在 buffer 裡，往上捲就看到 | **真的消失了**（除非塞回 prompt） |
| **變大需要** | 拉視窗、改 `tput`、調終端設定 | **換模型**（Claude Sonnet 1M、GPT-4 128k） |
| **影響成本** | 不影響 | **直接影響 token 計費** |
| **超出時行為** | 自動換行或截斷顯示 | **truncate / 報錯 / 忘記** |

### 中文翻譯造成的混淆

「Context window」常見譯法比較：
- ❌ **上下文視窗**（直譯，但「視窗」聽起來像 UI）
- ⚠️ **上下文窗口**（中國譯法，較中性）
- ✅ **上下文長度** / **context window**（保留原文最不會誤解）

工程師討論時很多人**直接講英文** "context window"，就是怕跟其他「視窗」搞混。

### 記憶口訣

> **Terminal window = 你看得到多少（顯示）**
> **Context window = LLM 看得到多少（記憶）**

或更直接：

> Terminal window 是給**人**看的，Context window 是給**模型**看的。

### 為什麼這個區分重要

理解 context window 是「容器」、不是「視窗」，才能理解 context engineering 為什麼存在：
- Context window 會爆 → 需要 summarization、RAG、sub-agent 來省空間
- Context window 影響成本 → token 計費直接相關
- Context window 影響 prompt cache → 5 分鐘 TTL 失效後成本暴漲

## Long-running session 的內建機制

Deep agent **內建管理機制，能在長時運行的會話中維護上下文**（managing context across long-running sessions）。

> 注意：原文是 managing **context**，不是 managing **conversations**。
> - 對話管理 = 管使用者講過什麼話
> - **上下文管理 = 管 agent 腦子裡所有東西**（含 tools 狀態、檔案、子任務記憶、scratch pad 等）

常見的 context 管理機制：
- **Summarization**：對話太長時自動總結舊內容
- **Memory layer**：把跨會話的事實寫到外部記憶（mem0、Letta、自建 SQLite）
- **Scratch pad / TODO list**：agent 自己記錄中間思考與待辦
- **Sub-agent 隔離**：把長任務切給子 agent，主 agent 只看摘要

## 原文與翻譯對照

> Context engineering is providing the right information and tools in the right format so your deep agent can accomplish tasks reliably.

**翻譯**：Context engineering 是以正確的格式提供正確的資訊與工具，讓 deep agent 能可靠地完成任務。

> Deep agents have access to several kinds of context. Some sources are provided to the agent at startup; others become available during runtime, such as user input.

**翻譯**：Deep agent 可存取多種上下文。部分來源在啟動時即提供給 agent，其他則在執行時才可取得，例如使用者輸入。

> Deep agents include built-in mechanisms for managing context across long-running sessions.

**翻譯**：Deep agent 內建管理機制，能在長時運行的會話中維護上下文。

## 為什麼這個概念重要（對 AI 工程師職缺）

招聘需求裡會看到：
- 「設計 agent 的 context window 管理策略」
- 「優化 RAG retrieval 的 chunk 與 reranking」
- 「處理 multi-turn 對話的 token 成本」

這些都屬於 **context engineering**，不是調 prompt 字句的 prompt engineering。理解這個分野，才知道 LangGraph 為什麼要設計 state、checkpoint、interrupt 這些機制——它們都是上下文工程的工具。

## 相關筆記
- [2026-04-28-AI工程師職缺評估與學習計畫](2026-04-28-AI工程師職缺評估與學習計畫.md)
- [LLM-Memory/llm-caching-layers.md](../LLM-Memory/llm-caching-layers.md)
- [LLM-Memory/rag-vs-memory-comparison.md](../LLM-Memory/rag-vs-memory-comparison.md)
