# 黑名單 Token 管理指南

## 問題：後台管理員如何操作黑名單？

### ❓ 常見問題

**Q1: 後台管理員如何選擇"登出所有裝置"？**

**A:** 目前前端**沒有**"登出所有裝置"的 UI 按鈕。可以通過以下方式：

1. **通過 API**（推薦）：
   ```bash
   curl -X POST "http://localhost:8003/api/v1/users/logout-all" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

2. **前端需要添加 UI**（建議實現）：
   - 在個人設置頁面添加"登出所有裝置"按鈕
   - 調用 `POST /api/v1/users/logout-all` API

**Q2: 如何增加某一個 token 到黑名單？**

**A:** 有三種方式：

1. **通過 Python 腳本**（最簡單，推薦）：
   ```bash
   docker compose exec backend python scripts/blacklist_token.py --token "token-string-here"
   ```

2. **直接操作數據庫**（需要知道 jti）：
   ```sql
   INSERT INTO blacklisted_token (id, token_jti, user_type, user_id, reason, expires_at, created_at)
   VALUES (UUID(), 'jti-here', 'user', 'user-id', 'revoked', '2025-12-31 23:59:59', NOW());
   ```

3. **通過 API**（需要前端實現 UI）

**Q3: 是不是加入數據庫數據就可以了？**

**A:** ✅ **是的！** 但需要注意：

- ✅ 直接插入數據庫記錄**可以**讓 token 失效
- ⚠️ 但需要提供**正確的數據**：
  - `token_jti`：token 的 jti（必須正確）
  - `user_type`：'user' 或 'member'
  - `user_id`：用戶 ID（token 中的 sub）
  - `expires_at`：token 的過期時間
  - `reason`：'logout', 'logout_all', 或 'revoked'

- ⚠️ **不建議**直接操作數據庫，因為：
  - 容易出錯（需要手動計算時間、查找 jti 等）
  - 沒有驗證和錯誤處理
  - 生產環境風險較高

- ✅ **推薦**使用 Python 腳本，會自動處理所有細節

### 1. 登出所有裝置

#### 方法 A：通過 API（推薦）

**API 端點**：
- 後台管理員：`POST /api/v1/users/logout-all`
- 前台會員：`POST /api/v1/members/logout-all`

**使用方式**：

```bash
# 使用 curl
curl -X POST "http://localhost:8003/api/v1/users/logout-all" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**前端調用**（如果前端有實現）：
```typescript
// 在 frontend/src/hooks/useAuth.ts 中添加
const logoutAll = async () => {
  try {
    await request(OpenAPI, {
      method: "POST",
      url: "/api/v1/users/logout-all",
    })
    localStorage.removeItem("access_token")
    queryClient.clear()
    navigate({ to: "/login" })
  } catch (error) {
    console.error("Logout all error:", error)
  }
}
```

#### 方法 B：直接操作數據庫（緊急情況）

如果 API 不可用或需要批量操作，可以直接操作數據庫：

```sql
-- 1. 先查看用戶的所有 token（需要從日誌或其他方式獲取 jti）
SELECT * FROM blacklisted_token WHERE user_id = 'user-id-here';

-- 2. 手動添加 token 到黑名單
INSERT INTO blacklisted_token (
    id,
    token_jti,
    user_type,
    user_id,
    reason,
    expires_at,
    created_at
) VALUES (
    UUID(),  -- 或使用具體的 UUID
    'token-jti-here',  -- ⚠️ 需要知道 token 的 jti
    'user',  -- 或 'member'
    'user-id-here',
    'revoked',  -- 或 'logout', 'logout_all'
    '2025-12-31 23:59:59',  -- token 的過期時間
    NOW()
);
```

**⚠️ 注意**：需要知道 token 的 `jti`，這需要：
1. 解碼 JWT token 獲取 `jti`
2. 或從日誌中查找
3. 或使用工具解析 token

### 2. 手動添加特定 Token 到黑名單

#### 方法 A：通過 Python 腳本（推薦）

創建腳本 `backend/scripts/blacklist_token.py`：

```python
"""
手動將 token 加入黑名單
"""
import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session
from app.core.db import engine
from app.crud.blacklisted_token import blacklisted_token_crud
from app.models.blacklisted_token import UserType, BlacklistReason
from datetime import datetime, timezone
import jwt
from app.core.config import settings
from app.core import security

def blacklist_token_by_jti(token_jti: str, user_type: str, user_id: str, expires_at: datetime):
    """通過 jti 將 token 加入黑名單"""
    with Session(engine) as session:
        blacklisted_token_crud.add_to_blacklist(
            session,
            token_jti=token_jti,
            user_type=UserType(user_type),
            user_id=user_id,
            expires_at=expires_at,
            reason=BlacklistReason.revoked,
        )
        print(f"✅ 已將 token (jti: {token_jti}) 加入黑名單")

def blacklist_token_by_token_string(token_string: str):
    """通過完整的 token 字串將 token 加入黑名單"""
    try:
        # 解碼 token 獲取 jti 和過期時間
        payload = jwt.decode(
            token_string,
            settings.SECRET_KEY,
            algorithms=[security.ALGORITHM]
        )
        token_jti = payload.get("jti")
        token_exp = payload.get("exp")
        user_id = payload.get("sub")

        if not token_jti:
            print("❌ 此 token 沒有 jti，無法加入黑名單")
            return

        expires_at = datetime.fromtimestamp(token_exp, tz=timezone.utc)

        # 判斷是 user 還是 member（需要查詢數據庫確認）
        # 這裡假設是 user，實際使用時需要確認
        with Session(engine) as session:
            blacklisted_token_crud.add_to_blacklist(
                session,
                token_jti=token_jti,
                user_type=UserType.user,  # 或 UserType.member
                user_id=user_id,
                expires_at=expires_at,
                reason=BlacklistReason.revoked,
            )
            print(f"✅ 已將 token 加入黑名單")
            print(f"   jti: {token_jti}")
            print(f"   user_id: {user_id}")
            print(f"   expires_at: {expires_at}")
    except jwt.InvalidTokenError:
        print("❌ 無效的 token")
    except Exception as e:
        print(f"❌ 錯誤: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="將 token 加入黑名單")
    parser.add_argument("--token", type=str, help="完整的 JWT token 字串")
    parser.add_argument("--jti", type=str, help="Token 的 jti")
    parser.add_argument("--user-type", type=str, choices=["user", "member"], help="用戶類型")
    parser.add_argument("--user-id", type=str, help="用戶 ID")
    parser.add_argument("--expires-at", type=str, help="Token 過期時間 (ISO 格式)")

    args = parser.parse_args()

    if args.token:
        blacklist_token_by_token_string(args.token)
    elif args.jti and args.user_type and args.user_id and args.expires_at:
        expires_at = datetime.fromisoformat(args.expires_at.replace('Z', '+00:00'))
        blacklist_token_by_jti(args.jti, args.user_type, args.user_id, expires_at)
    else:
        print("請提供 --token 或 --jti, --user-type, --user-id, --expires-at")
```

**使用方式**：
```bash
# 方式 1：通過完整的 token 字串
docker compose exec backend python scripts/blacklist_token.py --token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 方式 2：通過 jti（需要知道其他資訊）
docker compose exec backend python scripts/blacklist_token.py \
  --jti "uuid-here" \
  --user-type "user" \
  --user-id "user-id-here" \
  --expires-at "2025-12-31T23:59:59Z"
```

#### 方法 B：直接操作數據庫

**步驟 1：獲取 token 的 jti**

可以使用 Python 解碼 token：
```python
import jwt
token = "your-token-string"
payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
jti = payload.get("jti")
exp = payload.get("exp")
print(f"jti: {jti}")
print(f"exp: {exp}")
```

**步驟 2：插入數據庫**

```sql
INSERT INTO blacklisted_token (
    id,
    token_jti,
    user_type,
    user_id,
    reason,
    expires_at,
    created_at
) VALUES (
    UUID(),
    'jti-from-step-1',  -- 從步驟 1 獲取的 jti
    'user',  -- 或 'member'
    'user-id-from-token-sub',  -- token 中的 sub 欄位
    'revoked',
    FROM_UNIXTIME(exp-from-step-1),  -- 從步驟 1 獲取的 exp（Unix 時間戳）
    NOW()
);
```

### 3. 查看黑名單記錄

```sql
-- 查看所有黑名單記錄
SELECT * FROM blacklisted_token ORDER BY created_at DESC;

-- 查看特定用戶的黑名單記錄
SELECT * FROM blacklisted_token
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;

-- 查看已過期的黑名單記錄（可以清理）
SELECT * FROM blacklisted_token
WHERE expires_at < NOW();
```

### 4. 清理過期的黑名單記錄

```python
# 使用 CRUD 方法
from app.crud.blacklisted_token import blacklisted_token_crud
from sqlmodel import Session
from app.core.db import engine

with Session(engine) as session:
    count = blacklisted_token_crud.cleanup_expired(session)
    print(f"清理了 {count} 筆過期記錄")
```

或直接使用 SQL：
```sql
DELETE FROM blacklisted_token WHERE expires_at < NOW();
```

## 總結

### ✅ 推薦方式

1. **登出所有裝置**：使用 API `POST /api/v1/users/logout-all`
2. **手動撤銷 token**：使用 Python 腳本 `backend/scripts/blacklist_token.py`
3. **查看記錄**：使用腳本 `--list` 選項或直接查詢數據庫

### 📝 快速操作指南

#### 1. 登出所有裝置（通過 API）
```bash
curl -X POST "http://localhost:8003/api/v1/users/logout-all" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### 2. 手動撤銷特定 Token（通過腳本）
```bash
# 方式 1：通過完整的 token 字串（最簡單）
docker compose exec backend python scripts/blacklist_token.py \
  --token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 方式 2：通過 jti（需要知道其他資訊）
docker compose exec backend python scripts/blacklist_token.py \
  --jti "uuid-here" \
  --user-type "user" \
  --user-id "user-id-here" \
  --expires-at "2025-12-31T23:59:59Z"
```

#### 3. 查看黑名單記錄
```bash
# 查看所有記錄
docker compose exec backend python scripts/blacklist_token.py --list

# 查看特定用戶的記錄
docker compose exec backend python scripts/blacklist_token.py --list --user-id "user-id-here"
```

#### 4. 直接操作數據庫（緊急情況）
```sql
-- 插入黑名單記錄
INSERT INTO blacklisted_token (
    id, token_jti, user_type, user_id, reason, expires_at, created_at
) VALUES (
    UUID(),
    'token-jti-here',  -- ⚠️ 需要知道 token 的 jti
    'user',  -- 或 'member'
    'user-id-here',
    'revoked',
    '2025-12-31 23:59:59',
    NOW()
);
```

### ⚠️ 注意事項

1. **直接操作數據庫**：
   - ✅ 可以，但需要知道 `jti`、`user_id`、`expires_at` 等資訊
   - ⚠️ 需要手動計算和輸入，容易出錯
   - ⚠️ 不建議在生產環境直接操作

2. **通過 API**：
   - ✅ 更安全，有驗證和錯誤處理
   - ✅ 自動處理所有必要欄位
   - ⚠️ 需要前端實現 UI（目前可能沒有）

3. **通過腳本**：
   - ✅ 適合批量操作
   - ✅ 可以自動解碼 token
   - ✅ 適合管理員使用

### 📝 建議

1. **前端實現登出所有裝置的 UI**（如果還沒有）
2. **創建管理後台頁面**來查看和管理黑名單
3. **設置定期清理任務**自動清理過期記錄
