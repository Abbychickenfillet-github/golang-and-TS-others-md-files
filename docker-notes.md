# Docker 筆記

## 常用指令

```bash
# 啟動開發環境
docker compose watch

# 只啟動 backend
docker compose up -d --wait backend

# 停止並清除
docker compose down -v

# 查看 logs
docker logs template-backend-1

# 進入容器
docker compose exec backend bash

# 重啟容器
docker restart template-backend-1
```

---

## Build 前端

```bash
# 用 Docker 跑 frontend build
docker compose exec frontend npm run build

# 或直接在本地
cd frontend && npm run build
```

---

## 待補充...
