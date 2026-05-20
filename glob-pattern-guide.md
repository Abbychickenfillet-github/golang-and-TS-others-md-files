---
name: Glob Pattern 速查
description: VS Code / shell 搜尋的 glob pattern 對照（* vs **）
type: reference
originSessionId: b454dba8-3834-4785-9ed0-bbaa9f8f0358
---
# Glob Pattern 速查

## `*` vs `**`

- `*` = 單一層（不含 `/`）
- `**` = 任意層級子資料夾

## 對照表

| Pattern | 匹配到 |
|---|---|
| `Abby-notes/*.md` | 只搜當層（`todo.md`） |
| `Abby-notes/*/*.md` | 剛好一層子目錄（`待辦事項/plan.md`） |
| `Abby-notes/**/*.md` | 鎖定 Abby-notes + 遞迴所有子目錄（全部 4 個 .md） |
| `Abby-notes/**` | Abby-notes 下所有檔案/資料夾 |
| `**/*.md` | 全專案遞迴所有 .md |

## 拆解 `Abby-notes/**/*.md`

```
Abby-notes/  ← 起點
**/          ← 0 層或無限多層子資料夾
*.md         ← 任何 .md 檔名
```
