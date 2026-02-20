# CLAUDE.md
每次修改前請先解釋使用什麼語法
user資料表是後台系統方的管理員名單，member資料表才是真正註冊的主辦單位|攤販|消費者
我們這次專案中是official_website是前台的前端系統，frontend是後台的前端畫面系統。backend是統一的
請勿在協助COMMIT的時候直接把自己當成CO-AUTHOR，如："
🤖 Generated with Claude Code
- 如果要查詢資料庫就直接用docker exec db的方式查詢就好，我們是使用ZEABUR線上的DB Connection string在根目錄的.env中DATABASE_URL=mysql+pymysql://root:<MYSQL_PASSWORD>@hnd1.clusters.zeabur.com:32195/future_sign_prod

## commit
commit前請先npm run lint + docker compose up --build確認無編譯錯誤以及lint風格問題

TEST:
Commit以及PR前保持良好習慣前後端皆須建立單元測試
前端用Vitest
- [ ] Added or updated unit tests for all changes
- [ ] Added or updated documentation for all changes
- [ ] Successfully built and ran all unit tests or manual tests locally
- [ ] PR title follows "[title]: Brief Description" format (if related to an issue) eg. `[fix] flaky e2e test w/ relaxation`

Co-Authored-By: Claude Opus 4.5 noreply@anthropic.com
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository."

## Project Architecture

This is a multi-component full-stack application with three main parts:
- **Frontend**: React TypeScript app using Chakra UI, TanStack Query/Router (port 5173)是後臺系統的前端畫面
- **Backend**: FastAPI Python application with SQLModel/PostgreSQL
- **Official Website**: Standalone React TypeScript marketing site using Chakra UI v3 (port 5174)
這邊是前台系統(售票給消費者B to C)的前端畫面

### Technology Stack
- **Frontend**: Vite + React + TypeScript + TanStack Query + TanStack Router + Chakra UI v2
- **Backend**: FastAPI + SQLModel + PostgreSQL + Alembic + uv package manager
- **Official Website**: Vite + React + TypeScript + Chakra UI v3 + i18next

## Development Commands

### Frontend (main application)
```bash
cd frontend
npm install
npm run dev                    # Start dev server on port 5173
npm run build                  # Build production
npm run lint                   # Run Biome linter
npm run generate-client        # Generate API client from OpenAPI
npm run preview                # Preview production build
```

### Backend (FastAPI)
```bash
cd backend
uv sync                        # Install dependencies
source .venv/bin/activate      # Activate virtual environment
# For tests:
bash ./scripts/test.sh                           # Run all tests
docker compose exec backend bash scripts/tests-start.sh  # Run tests in container
# For database:
alembic revision --autogenerate -m "message"    # Create migration
alembic upgrade head                             # Apply migrations
```

### Official Website
```bash
cd official_website
npm install
npm run dev        # Start dev server on port 5174
npm run build      # Build with TypeScript check
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Docker Development
```bash
docker compose watch           # Start development environment with live reload
docker compose up -d --wait backend  # Start only backend for testing
docker compose down -v         # Stop and clean volumes
```

## Code Architecture

### Frontend Structure
- Uses TanStack Router for file-based routing in `src/routes/`
- API client generated from backend OpenAPI spec in `src/client/`
- Chakra UI v2 components with custom theme in `theme.tsx`
- TanStack Query for server state management
- React Hook Form + Zod for form handling

### Backend Structure
- FastAPI app in `app/main.py` with modular API routes in `app/api/`
- SQLModel models in `app/models.py` with Alembic migrations
- CRUD operations and utilities in `app/crud.py`
- Authentication using JWT tokens
- Background tasks and email templates support

### Official Website
- Standalone React app with internationalization (i18n)
- Chakra UI v3 with updated syntax (`gap` instead of `spacing`)
- Google Analytics integration with custom hooks
- Multi-language support (English/Chinese Traditional)

## Important Notes

### API Client Generation
The frontend uses generated API clients from the backend's OpenAPI schema:
1. Start backend to expose OpenAPI at `/api/v1/openapi.json`
2. Run `npm run generate-client` in frontend directory
3. Generated client appears in `frontend/src/client/`

### Database Migrations
This project does not use Alembic migrations. Always provide direct SQL commands for database schema changes instead of migration scripts. When creating new tables or modifying existing ones, generate the raw SQL statements that can be executed directly on the database.

All SQL scripts are stored in `backend/sql/` directory with numbered naming convention (e.g., `001_create_member_table.sql`). Include detailed comments and follow the established patterns in existing scripts.

### Chakra UI Versions
- Frontend uses Chakra UI v2 (spacing prop)
- Official website uses Chakra UI v3 (gap prop)

### Testing
- Frontend: Playwright E2E tests (`npx playwright test`)
- Backend: Pytest with coverage (`bash ./scripts/test.sh`)
- Both require Docker stack running for full integration tests

### Environment Variables
- Frontend: Uses `VITE_` prefixed variables
- Official Website: Uses `VITE_GA_TRACKING_ID` for Google Analytics
- Backend: Configured via `.env` files with different environments

### Package Managers
- Frontend & Official Website: npm
- Backend: uv (Python package manager)

### memo for Claude
## 建立欄位到API的順序
當我說幫我建立某一個資料表的模型也就是要有
SQL 遷移腳本
Python 模型 app/models
CRUD 層 app/crud
Service 層 app/service
API Routes 層

當debug的時候則是反方向回來
當解釋困難的或是我問你套件的意思是什麼盡量簡單化

9.486 src/components/Events/EditEvent.tsx(96,5): error TS6133: 'reset' is declared but its value is never read.
9.486 src/components/Events/EditEvent.tsx(485,15): error TS2322: Type 'boolean | null | undefined' is not assignable to type 'boolean | undefined'.
9.486   Type 'null' is not assignable to type 'boolean | undefined'.
切勿使用undefined做型別定義也不要宣告變數之後又不用它
或者寫了TODO但沒有DO
英文存進資料庫都要小寫喔!
