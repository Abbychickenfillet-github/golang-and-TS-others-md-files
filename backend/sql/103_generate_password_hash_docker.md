# 在 Docker 容器中生成密碼哈希

如果本地環境的 bcrypt 版本不兼容，可以在 Docker 容器中執行腳本。

## 方法 1：使用 Docker Compose（推薦）

```bash
docker compose exec backend python scripts/generate_password_hash.py
```

## 方法 2：使用後端 API 創建用戶（最簡單）

使用後端的用戶創建 API，後端會自動生成正確的密碼哈希：

```bash
curl -X POST "http://localhost:8003/api/v1/users/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123456",
    "full_name": "Test User",
    "is_active": true,
    "is_superuser": false
  }'
```

## 方法 3：使用 Python 交互式環境（在 Docker 容器中）

```bash
docker compose exec backend python
```

然後執行：

```python
from app.core.security import get_password_hash
password = "TestPass123456"
hash_value = get_password_hash(password)
print(hash_value)
```

## 方法 4：直接使用已知的正確哈希值

如果後端環境配置正確，可以使用以下預生成的哈希值（但建議重新生成以確保安全）：

```sql
UPDATE user
SET hashed_password = '$2b$12$YOUR_HASH_HERE'
WHERE email = 'testuser@example.com';
```



