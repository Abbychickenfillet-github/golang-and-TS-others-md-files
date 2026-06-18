---
title: CLAUDE.md vs AGENTS.md（AI 專案上下文設定）
type: topic-note
source: Gemini
tags: [gemini, llm, agent, claude-code, agents-md, 專案設定]
sources:
  - https://gemini.google.com/app/7dbb3b03f33bc0c9
updated: 2026-06-14
---

# CLAUDE.md vs AGENTS.md

## 重點整理

兩者都是<mark style="background: #FFF3A3A6;">寫給 AI 代理工具（Claude Code、Codex、Cursor 等）閱讀的專案說明文件</mark>，像專案的「說明書／導遊手冊」，讓 AI 進入專案目錄就理解架構、開發規範與常用指令，避免瞎猜或寫出不符風格的程式碼。

### 字數差異

<mark style="background: #BBFABBA6;">兩者字數沒有本質硬性差異</mark>，長短取決於專案複雜度。社群習慣的側重差異：

| 比較項目 | CLAUDE.md | AGENTS.md |
| :--- | :--- | :--- |
| 主要對象 | 專為 Anthropic 的 Claude Code / Cowork | 泛指所有 AI Agents（Claude、Codex、Cursor）的通用規範 |
| 字數篇幅 | 精簡聚焦（約 500–1500 字），<mark style="background: #FFB8EBA6;">過長會浪費 Token 或失焦</mark> | 可長可短，視多工具相容需求 |
| 核心內容 | 技術實務：編譯/測試指令、程式碼風格限制 | 角色定義：AI 角色、工作流程、跨工具協作規範 |

### 怎麼理解 AGENTS.md

把它理解為 <mark style="background: #FFF3A3A6;">「給 AI 員工的 Onboarding（新人入職）指南」</mark>。人類工程師加入看 README.md 建環境；AI 代理進專案不需要裝環境，它需要知道「該遵守什麼規矩」。

為什麼需要：① 防止 AI 亂下指令（只能用 `npm run test`，別自己發明 `jest`）② 統一程式碼風格（一律 TypeScript、禁用 `any`）③ 記憶專案特例（某 Legacy 資料表要特別注意），減少重複提醒。

### 標準 AGENTS.md 範例結構

```markdown
# AGENTS.md

## 角色與目標
你是精通 React 與 Node.js 的高階全端工程師，目標是維護此專案並確保高品質與可擴展性。

## 常用指令
- 安裝依賴：`npm install`
- 啟動開發：`npm run dev`
- 執行測試：`npm run test`
- 建置專案：`npm run build`

## 程式碼規範
- 必須使用 TypeScript，嚴格禁止 `any`。
- 語系檔放 `src/locales/`，新增功能須同步更新 zh-TW。
- 變數 camelCase、元件 PascalCase。

## 注意事項與地雷
- 身份驗證採 Firebase Auth，修改 `src/auth/` 請小心。
- 完成修改後必須自動執行測試確保沒有 Breakage。
```

<mark style="background: #ABF7F7A6;">自動化趨勢：專案變大後手動更新 AGENTS.md 很繁瑣。社群（如 Martin Alderson 分享）流行讓 AI 自己讀對話紀錄（JSONL logs），抓出你重複糾正/生氣的地方，自動回來更新 AGENTS.md，達成自我優化。</mark>

## 各對話來源
### AI 專案上下文設定指南（2026-06）— https://gemini.google.com/app/7dbb3b03f33bc0c9

使用者：CLAUDE.md 跟 AGENTS.md 的字數差異，我對於 AGENTS.md 還是沒有很清楚 → Gemini：兩者都是寫給 AI 代理工具讀的專案說明文件。字數沒本質差異、取決於複雜度；習慣上 CLAUDE.md 精簡聚焦（約 500-1500 字，過長浪費 Token）、偏技術實務，AGENTS.md 可長可短、偏角色定義與跨工具規範。理解 AGENTS.md＝給 AI 員工的入職指南：防止亂下指令、統一風格、記憶專案特例。附標準範例結構（角色目標／常用指令／程式碼規範／注意事項地雷）。自動化趨勢：讓 AI 讀 JSONL 對話紀錄自動更新 AGENTS.md 自我優化。
