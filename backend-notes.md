# 後端筆記

## 專案架構

建立新資料表需要的檔案：
1. `backend/sql/XXX_create_table.sql` - SQL 遷移腳本
2. `backend/app/models/xxx.py` - Python 模型
3. `backend/app/crud/xxx.py` - CRUD 層
4. `backend/app/services/xxx_service.py` - Service 層
5. `backend/app/api/routes/xxx.py` - API Routes 層

Debug 時反方向：Routes → Service → CRUD → Model → SQL

---

## 資料表說明

| 資料表 | 說明 |
|--------|------|
| `user` | 後台系統管理員 |
| `member` | 前台註冊用戶（主辦單位/攤販/消費者）|

---

## 常用指令

```bash
# 進入 backend container
docker compose exec backend bash

# 執行 SQL
docker exec template-backend-1 python -c "..."
```

---

## 待補充...
