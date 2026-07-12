# 文檔結構說明

## 文檔組織原則

### 後端相關文檔 → `backend/backend-docs/`
所有後端相關的技術文檔都應該存放在 `backend/backend-docs/` 目錄中，包括：
- FastAPI 路由和 API 說明
- 資料庫相關文檔
- Docker Compose 配置說明
- 後端開發指南
- API 測試文檔

### 前端相關文檔 → `frontend_docs/`
前端相關的技術文檔存放在 `frontend_docs/` 目錄中。

### 項目通用文檔 → `docs/`
項目級別的通用文檔存放在 `docs/` 目錄中。

### 項目流程文檔 → `flow&docs/`
項目開發流程、階段總結、規劃文檔存放在 `flow&docs/` 目錄中。

### 配置和狀態文檔 → `docs&memory/`
開發過程中的配置狀態、環境變數說明等存放在 `docs&memory/` 目錄中。

## 文檔命名規範

- 使用描述性的文件名
- 使用 kebab-case 命名（例如：`routing-and-docker-explanation.md`）
- 日期格式的文檔使用 `YYYY-MM-DD_description.md` 格式

## 最近創建的文檔

- `backend/backend-docs/ROUTING_AND_DOCKER_EXPLANATION.md` - FastAPI APIRouter 和 Docker Compose 使用說明
