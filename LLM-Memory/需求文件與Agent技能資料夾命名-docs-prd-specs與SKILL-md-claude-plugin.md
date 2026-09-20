---
title: 需求文件與 Agent 技能的資料夾命名 — docs/prd/specs 給人看，SKILL.md 與 .claude-plugin 給 Agent 看
type: topic-note
source: Gemini
category: 技術
tags: [gemini, claude-code, skill, agent, prd, requirements, plugin, 專案結構, 命名慣例]
aliases: [SKILL.md, .claude-plugin, docs/prd, 需求文件資料夾]
related:
  - "[[CLAUDE.md-vs-AGENTS.md]]"
  - "[[Model-Context-Protocol-MCP-協定定義與三大能力]]"
  - "[[Agent記憶框架安裝-pip-vs-clone與user-skill-memory檔案]]"
  - "[[ml-skill-tree-hierarchy]]"
sources:
  - https://gemini.google.com/app/c1c7bf0f94490513
updated: 2026-09-17
---

# 需求文件與 Agent 技能的資料夾命名 — docs/prd/specs 給人看，SKILL.md 與 .claude-plugin 給 Agent 看

> 本篇重點 a–i，共 9 個。
> 主軸圖：本頁 HTML 版的「專案根目錄分岔圖」（左枝＝給人讀的 `docs/`，右枝＝給 Agent 讀的 `.claude/`），之後同主題追問請指回左枝或右枝的某個節點。

---

## 🎯 速答區

| # | 問題 | 一句話速答 | 章節 |
|---|---|---|---|
| Q1 | 需求文件慣例上放哪 | `docs/` 底下再分 `requirements/`、`specs/`、`prd/` | §1 |
| Q2 | `SKILL.md` 是需求文件嗎 | 不是，它是寫給 AI Agent 的「操作指引與工具擴充選單」 | §2 |
| Q3 | `SKILL.md` 裡面要寫什麼 | 觸發條件、操作步驟、限制與規範，三段缺一不可 | §2 |
| Q4 | `.claude-plugin/` 是什麼 | 定義這個專案作為 Claude Plugin 時的元資料與發布資訊 | §3 |

---

## 1. 給「人」看的需求文件（a–c）

(a) <mark style="background: #ADCCFFA6;">常見資料夾命名</mark>：

| 路徑 | 放什麼 |
|---|---|
| `docs/` 或 `documentation/` | 最標準通用的根目錄資料夾，專案所有相關文件都放這裡 |
| `docs/requirements/` 或 `docs/reqs/` | 專門存放需求規格書 |
| `docs/specs/` 或 `docs/specifications/` | 詳細的功能規格說明（Functional Specifications） |
| `docs/prd/` | PRD（Product Requirement Document，產品需求文件） |
| `docs/architecture/` 或 `docs/design/` | 需求涉及系統架構或設計細節時放這裡 |
| `.plans/` 或 `plans/` | 部分開發框架（AI Agent 類工具或特定團隊）把規劃與需求文件放這裡 |

(b) <mark style="background: #ADCCFFA6;">常見檔名</mark>：`PRD.md`（產品需求文件）、`REQUIREMENTS.md`（專案總體需求說明）、`FUNCTIONAL_SPEC.md`（功能規格說明書）。

(c) <mark style="background: #FFF3A3A6;">判斷標準：這份文件的讀者是「人類決策者」還是「AI 執行者」</mark>。是人類決策者就走這一枝。

---

## 2. 給「Agent」看的技能定義：SKILL.md（d–g）

(d) <mark style="background: #ADCCFFA6;">`skills/` 資料夾與 `SKILL.md` 用來放給 AI Agent 讀取的自訂技能與功能擴充指令</mark>，它告知 AI 如何執行特定任務（例如發布套件、執行特定測試、呼叫 API、進行程式碼審查）。

(e) <mark style="background: #ADCCFFA6;">常見位置</mark>：專案根目錄的 `.claude/skills/`、`skills/`，或各個 AI 工具專屬的配置目錄中。

(f) <mark style="background: #BBFABBA6;">`SKILL.md` 的三段責任，缺一段 Agent 就會亂做</mark>：

| 段落 | 責任 | 寫法 |
|---|---|---|
| 觸發條件 Triggers / Description | 定義 AI 在什麼情境、收到什麼指令時應該載入該技能 | 寫在 frontmatter 的 `description`，要寫得像「使用者會怎麼講這件事」 |
| 操作步驟 Workflow / Steps | 寫明 AI 執行該技能時需遵循的具體步驟與 Bash 命令 | 有序清單，指令用 code block |
| 限制與規範 Rules / Constraints | 列出注意事項，例如安全檢查、禁止變更的檔案 | 用「切勿／必須」開頭的祈使句 |

(g) 結構範例：

```markdown
---
name: run-database-migration
description: 當需要執行資料庫遷移或新增表時使用此技能
---

# 資料庫遷移技能 (Database Migration Skill)

## 執行步驟
1. 檢查 `prisma/schema.prisma` 是否有語法錯誤。
2. 執行指令：`npx prisma migrate dev`
3. 驗證 migration 檔案是否成功產生於 `prisma/migrations/`。

## 注意事項
- 切勿在未通知用戶的情況下直接執行 `prisma migrate reset`。
```

---

## 3. `.claude-plugin/` 是什麼（h）

(h) <mark style="background: #ADCCFFA6;">`.claude-plugin/` 是專門給 Claude 生態（Claude Code CLI 與 Claude Desktop 外掛）所設計的設定與外掛目錄</mark>。

| 檔案 | 作用 |
|---|---|
| `plugin.json` | 定義這個工具作為 Claude Plugin 時的元資料、存取權限、相容版本 |
| `marketplace.json` | 定義發布資訊，讓 plugin 可以被列在 marketplace 裡被安裝 |

	當你在 Claude Code 中載入或安裝此 Plugin 時，Claude 會讀取這裡的設定，進而載入專案定義的 Commands、Agents、Tools 與 Skills。
	雖然資料夾名稱叫 `.claude-plugin`，但許多現代 AI Agent 框架（例如 GSD）為了兼顧生態系，會以 Claude 的 Plugin 規範為基準，讓其他支援相同協定的 AI 工具也能讀取使用。

---

## 4. 一張表分清楚三種檔案（i）

(i) <mark style="background: #FFF3A3A6;">三者的讀者完全不同，不要混在同一個資料夾</mark>：

| 檔案 | 讀者 | 內容性質 | 典型位置 |
|---|---|---|---|
| `PRD.md` / `REQUIREMENTS.md` | 人類（也可給 AI 參考） | 產品功能規格與需求，描述「要做成什麼樣」 | `docs/prd/`、`docs/requirements/` |
| `CLAUDE.md` / `AGENTS.md` | AI Agent | 專案級的長期規範與背景知識，描述「在這個 repo 裡做事的規矩」 | 專案根目錄 |
| `SKILL.md` | AI Agent | 單一任務的操作指引與工具擴充，描述「遇到 X 情境時照這幾步做」 | `.claude/skills/<技能名>/` |
| `plugin.json` / `marketplace.json` | Claude 的 Plugin 載入器 | 外掛元資料與發布資訊，描述「這包東西怎麼被安裝」 | `.claude-plugin/` |

	`CLAUDE.md` 與 `AGENTS.md` 的差異寫在 [[CLAUDE.md-vs-AGENTS.md]]，那篇是本篇這張表的第二列展開。

---

## 關聯筆記（附關聯原因）

- [[CLAUDE.md-vs-AGENTS.md]]
	**理由**：本篇 §4 的表格把 `CLAUDE.md` 跟 `SKILL.md` 放在同一個象限比較，那篇專講 `CLAUDE.md` 與 `AGENTS.md` 這兩份「專案級規範」的差別，是本篇的下一層。
- [[Model-Context-Protocol-MCP-協定定義與三大能力]]
	**理由**：`.claude-plugin/` 打包進去的 Tools 大多是 MCP server，那篇講 MCP 的三大能力（Tools／Resources／Prompts），是本篇 §3 的技術底層。
- [[Agent記憶框架安裝-pip-vs-clone與user-skill-memory檔案]]
	**理由**：那篇處理的是「user skill 與 memory 檔案裝在哪」，跟本篇 §2 的 `skills/` 位置問題是同一件事的兩個角度。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇 Gemini 對話 | https://gemini.google.com/app/c1c7bf0f94490513 | Gemini Flash，2026-09-17 擷取 |
| Anthropic Docs — Agent Skills（SKILL.md 格式與位置） | https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview | Anthropic 官方文件，2026-09-17 查證 |
| Anthropic Docs — Claude Code Plugins（plugin.json / marketplace.json） | https://docs.claude.com/en/docs/claude-code/plugins | Anthropic 官方文件，2026-09-17 查證 |
| Anthropic Docs — CLAUDE.md 記憶檔 | https://docs.claude.com/en/docs/claude-code/memory | Anthropic 官方文件，2026-09-17 查證 |

---

由 Gemini 對話自動整理 · 更新於 2026-09-17
