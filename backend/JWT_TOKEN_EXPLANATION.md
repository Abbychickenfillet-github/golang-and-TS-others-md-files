# JWT Token 和黑名单机制解释

## 1. 代码解释

### `response_model=LogoutResponse`
- **作用**：FastAPI 的响应模型定义
- **说明**：指定 API 返回的数据结构，用于自动生成 API 文档和验证响应格式

### `token: TokenDep`
- **作用**：从请求头中自动提取 JWT token
- **定义**：`TokenDep = Annotated[str, Depends(reusable_oauth2)]`
- **说明**：`reusable_oauth2` 是一个 OAuth2 依赖，会自动从请求头的 `Authorization: Bearer <token>` 中提取 token

## 2. 关键问题：每次生成的 token 都一样吗？

### ❌ 错误理解
很多人以为：同一个用户每次登录，生成的 token 内容都一样。

### ✅ 实际情况
**每次生成的 token 都是不同的！**

### 原因：JTI (JWT ID)

查看 `backend/app/core/security.py`：

```python
def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "exp": expire,
        "sub": str(subject),  # 用户 ID（相同）
        "jti": str(uuid.uuid4()),  # ⭐ 每次都是新的 UUID！
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

**关键点**：
- `sub` (subject)：用户 ID，**相同**
- `jti` (JWT ID)：**每次都是新的 UUID**，使用 `uuid.uuid4()` 生成
- `exp` (expiration)：过期时间，**可能不同**

## 3. Token 结构示例

### 第一次登录
```json
{
  "sub": "user-123",
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // UUID 1
  "exp": 1234567890
}
```

### 第二次登录（同一用户）
```json
{
  "sub": "user-123",  // 相同
  "jti": "x9y8z7w6-v5u4-3210-tsrq-ponmlkjihgfe",  // ⭐ 不同的 UUID！
  "exp": 1234567900  // 可能不同
}
```

## 4. 黑名单机制如何工作

### 流程

1. **用户登录** → 生成新 token，包含唯一的 `jti`
2. **用户登出** → 将 `jti` 存入黑名单表
3. **后续请求** → 检查 `jti` 是否在黑名单中

### 代码流程

```python
# 1. 登出时，提取 jti 并加入黑名单
def logout(token: TokenDep):
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")  # 获取这个 token 的唯一 ID

    # 将 jti 存入数据库黑名单
    blacklisted_token_crud.add_to_blacklist(
        session,
        token_jti=token_jti,  # ⭐ 只撤销这个特定的 token
        ...
    )

# 2. 每次请求时，检查 token 是否在黑名单中
def get_current_user(token: TokenDep):
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")

    # ⭐ 检查这个特定的 jti 是否在黑名单中
    if blacklisted_token_crud.is_blacklisted(session, token_jti=token_jti):
        raise HTTPException(401, "Token has been revoked")
```
<!--  -->
## 5. 为什么这样设计？

### 场景 1：多设备登录
- 用户在手机登录 → token A (jti: uuid-1)
- 用户在电脑登录 → token B (jti: uuid-2)
- 用户在手机登出 → 只撤销 token A
- 电脑的 token B 仍然有效 ✅

### 场景 2：Token 泄露
- 如果 token 被泄露，可以立即撤销
- 用户重新登录后，旧 token 失效，新 token 有效

## 6. 数据库黑名单表

```sql
CREATE TABLE blacklisted_token (
    id VARCHAR(36) PRIMARY KEY,
    token_jti VARCHAR(255) NOT NULL,  -- ⭐ 存储被撤销的 jti
    user_type ENUM('user', 'member'),
    user_id VARCHAR(36),
    expires_at TIMESTAMP,  -- token 原本的过期时间
    created_at TIMESTAMP
);
```

## 7. 总结

| 项目 | 说明 |
|------|------|
| **每次登录** | 生成**新的** token，包含**新的** jti |
| **黑名单机制** | 通过 `jti` 识别和撤销**特定的** token |
| **多设备支持** | 每个设备的 token 独立，可以单独撤销 |
| **安全性** | 即使 token 泄露，也可以立即撤销 |

## 8. 黑名單機制觸發時機

### 8.1 加入黑名單的時機（Token 被撤銷）

#### 用戶/會員主動登出
- **後台管理員登出**：`POST /api/v1/users/logout`
- **前台會員登出**：`POST /api/v1/members/logout`
- **動作**：將當前 token 的 `jti` 加入黑名單表
- **原因**：`BlacklistReason.logout`

#### 登出所有裝置
- **後台管理員**：`POST /api/v1/users/logout-all`
- **前台會員**：`POST /api/v1/members/logout-all`
- **動作**：將當前 token 的 `jti` 加入黑名單表
- **原因**：`BlacklistReason.logout_all`
- **注意**：由於 JWT 無狀態特性，只能撤銷當前 token，其他裝置的 token 仍有效直到過期

### 8.2 檢查黑名單的時機（驗證 Token）

#### 所有需要認證的 API 請求
- **觸發位置**：`get_current_user()` 和 `get_current_member()` 函數
- **觸發時機**：每次調用需要認證的 API 端點時
- **檢查邏輯**：
  ```python
  # backend/app/api/deps.py
  def get_current_user(session, token):
      payload = jwt.decode(token, ...)
      token_jti = payload.get("jti")

      # ⭐ 檢查是否在黑名單中
      if token_jti and blacklisted_token_crud.is_blacklisted(session, token_jti):
          raise HTTPException(401, "Token has been revoked")
  ```

#### 具體觸發的端點
所有使用以下依賴的端點都會自動檢查黑名單：
- `CurrentUser` - 後台管理員認證
- `CurrentMember` - 前台會員認證
- `get_current_active_superuser` - 超級管理員認證

**例如**：
- `GET /api/v1/users/me` - 獲取當前用戶資訊
- `GET /api/v1/members/me` - 獲取當前會員資訊
- `POST /api/v1/events/` - 創建活動
- `GET /api/v1/members/` - 獲取會員列表（需要超級管理員）
- 等等...所有需要認證的端點

### 8.3 黑名單檢查流程

```
API 請求
  ↓
攜帶 JWT Token
  ↓
FastAPI 提取 token
  ↓
調用認證函數（get_current_user/get_current_member）
  ↓
解碼 token → 提取 jti
  ↓
查詢黑名單表：SELECT * FROM blacklisted_token WHERE token_jti = ?
  ↓
┌──────────────┬──────────────┐
│ 找到記錄     │ 沒找到記錄    │
│ ❌ 拒絕請求  │ ✅ 繼續驗證   │
│ 返回 401     │ 返回用戶資訊  │
└──────────────┴──────────────┘
```

## 9. 驗證方法

可以在代碼中添加日誌來驗證：

```python
def create_access_token(subject: str, expires_delta: timedelta) -> str:
    jti = str(uuid.uuid4())
    print(f"生成新 token - 用戶: {subject}, jti: {jti}")  # 每次都會不同
    # ...
```
