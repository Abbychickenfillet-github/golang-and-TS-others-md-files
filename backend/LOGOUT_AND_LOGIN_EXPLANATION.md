# 登出後能否正常登入？詳細解釋

## 問題：登出時將 jti 存入黑名單表，下次還能正常登入嗎？

### ✅ 答案：**可以！** 下次登入完全正常

---

## 📋 黑名單 Token 機制觸發時機

### 1. **加入黑名單的時機（Token 被撤銷）**

#### 1.1 用戶主動登出
- **API 端點**：`POST /api/v1/users/logout`
- **觸發條件**：後台管理員點擊登出按鈕
- **動作**：將當前 token 的 `jti` 加入黑名單
- **原因**：`BlacklistReason.logout`
- **影響範圍**：只撤銷當前這個 token

#### 1.2 會員主動登出
- **API 端點**：`POST /api/v1/members/logout`
- **觸發條件**：前台會員點擊登出按鈕
- **動作**：將當前 token 的 `jti` 加入黑名單
- **原因**：`BlacklistReason.logout`
- **影響範圍**：只撤銷當前這個 token

#### 1.3 登出所有裝置（後台管理員）
- **API 端點**：`POST /api/v1/users/logout-all`
- **觸發條件**：後台管理員選擇"登出所有裝置"
- **動作**：將當前 token 的 `jti` 加入黑名單
- **原因**：`BlacklistReason.logout_all`
- **影響範圍**：只撤銷當前這個 token（注意：其他裝置的 token 仍有效直到過期）

#### 1.4 登出所有裝置（前台會員）
- **API 端點**：`POST /api/v1/members/logout-all`
- **觸發條件**：前台會員選擇"登出所有裝置"
- **動作**：將當前 token 的 `jti` 加入黑名單
- **原因**：`BlacklistReason.logout_all`
- **影響範圍**：只撤銷當前這個 token（注意：其他裝置的 token 仍有效直到過期）

#### 1.5 手動撤銷（未來擴展）
- **原因**：`BlacklistReason.revoked`
- **用途**：管理員手動撤銷特定 token（例如：發現 token 洩露）

### 2. **檢查黑名單的時機（驗證 Token 是否有效）**

#### 2.1 所有需要認證的 API 請求
- **觸發位置**：`get_current_user()` 和 `get_current_member()` 函數
- **觸發時機**：每次有需要認證的 API 端點被調用時
- **檢查邏輯**：
  ```python
  # 在 backend/app/api/deps.py
  def get_current_user(session, token):
      # 1. 解碼 token
      payload = jwt.decode(token, ...)
      token_jti = payload.get("jti")

      # 2. ⭐ 檢查是否在黑名單中
      if token_jti and blacklisted_token_crud.is_blacklisted(session, token_jti):
          raise HTTPException(401, "Token has been revoked")

      # 3. 繼續驗證用戶...
  ```

#### 2.2 具體觸發的 API 端點
所有使用以下依賴的端點都會觸發黑名單檢查：
- `CurrentUser` - 後台管理員認證
- `CurrentMember` - 前台會員認證
- `get_current_active_superuser` - 超級管理員認證

**例如**：
- `GET /api/v1/users/me` - 獲取當前用戶資訊
- `GET /api/v1/members/me` - 獲取當前會員資訊
- `POST /api/v1/events/` - 創建活動（需要認證）
- `GET /api/v1/members/` - 獲取會員列表（需要超級管理員）
- 等等...所有需要認證的端點

### 3. **黑名單檢查流程圖**

```
用戶發送 API 請求
    ↓
攜帶 JWT Token（Authorization: Bearer <token>）
    ↓
FastAPI 自動提取 token（通過 TokenDep）
    ↓
調用 get_current_user() 或 get_current_member()
    ↓
解碼 token，提取 jti
    ↓
檢查 jti 是否在黑名單表中
    ↓
┌─────────────────┬─────────────────┐
│   在黑名單中     │   不在黑名單中   │
│   ❌ 拒絕請求    │   ✅ 繼續驗證    │
│   返回 401      │   檢查用戶狀態   │
│   "Token        │   返回用戶資訊   │
│   revoked"      │                 │
└─────────────────┴─────────────────┘
```

### 4. **黑名單機制的作用範圍**

| 操作 | 影響的 Token | 其他 Token |
|------|-------------|-----------|
| 登出（單一裝置） | 當前 token 被撤銷 | 其他裝置的 token 仍有效 |
| 登出所有裝置 | 當前 token 被撤銷 | 其他裝置的 token 仍有效（直到過期） |
| Token 過期 | 自動失效 | - |
| 重新登入 | 生成新 token | 舊 token 仍被撤銷（如果已登出） |

### 5. **注意事項**

#### ⚠️ JWT 無狀態特性限制
- JWT 是無狀態的，服務器無法主動撤銷其他裝置的 token
- `logout-all` 只能撤銷當前 token，其他裝置的 token 會繼續有效直到過期
- 如果需要真正撤銷所有 token，建議：
  1. 使用較短的 token 有效期
  2. 實作 refresh token 機制
  3. 在用戶資料中加入 token 版本號

#### ✅ 最佳實踐
- 定期清理過期的黑名單記錄（使用 `cleanup_expired()` 方法）
- 監控黑名單表的大小，避免無限增長
- 考慮設置自動清理任務（例如：每天清理一次）

---

## 流程說明

### 1. 第一次登入
```
用戶登入 → 生成新 token
Token A: {
  sub: "user-123",
  jti: "uuid-1",  ← 新的 UUID
  exp: 1234567890
}
```

### 2. 登出
```
用戶登出 → 將 jti 存入黑名單
黑名單表：
  token_jti: "uuid-1"  ← 只有這個 token 被撤銷
  user_id: "user-123"
```

### 3. 第二次登入（重新登入）
```
用戶再次登入 → 生成**全新的** token
Token B: {
  sub: "user-123",     ← 相同的用戶 ID
  jti: "uuid-2",        ← ⭐ 全新的 UUID！
  exp: 1234567900
}
```

### 4. 驗證新 Token
```
請求使用 Token B → 檢查黑名單
黑名單中只有 "uuid-1"
Token B 的 jti 是 "uuid-2"  ← 不在黑名單中
✅ 驗證通過，可以正常使用
```

## 關鍵點

### 為什麼可以正常登入？

1. **每次登入都生成新的 jti**
   - 第一次登入：`jti = uuid-1`
   - 第二次登入：`jti = uuid-2`（完全不同！）

2. **黑名單只記錄舊的 jti**
   - 黑名單中只有 `uuid-1`
   - 新的 token 的 `jti` 是 `uuid-2`
   - `uuid-2` 不在黑名單中，所以可以正常使用

3. **黑名單不會阻止新登入**
   - 黑名單只會阻止**已經被撤銷的 token**
   - 不會阻止用戶重新登入獲取新 token

## 實際代碼流程

### 登入時（生成新 token）
```python
# 每次調用 create_access_token() 都會生成新的 jti
def create_access_token(subject, expires_delta):
    to_encode = {
        "sub": str(subject),
        "jti": str(uuid.uuid4()),  # ← 每次都是新的 UUID
        "exp": expire,
    }
    return jwt.encode(to_encode, ...)
```

### 登出時（撤銷舊 token）
```python
def logout(token):
    # 從舊 token 中提取 jti
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")  # 例如：uuid-1

    # 將舊的 jti 存入黑名單
    blacklisted_token_crud.add_to_blacklist(
        token_jti=token_jti  # 只撤銷這個特定的 token
    )
```

### 驗證時（檢查黑名單）
```python
def get_current_user(token):
    payload = jwt.decode(token, ...)
    token_jti = payload.get("jti")  # 例如：uuid-2（新 token）

    # 檢查這個 jti 是否在黑名單中
    if blacklisted_token_crud.is_blacklisted(token_jti):
        raise HTTPException(401, "Token revoked")

    # uuid-2 不在黑名單中，驗證通過 ✅
```

## 類比說明

想像一下：

1. **第一次登入** = 發給你一張門卡（Token A，編號：001）
2. **登出** = 將門卡 001 加入黑名單（這張卡不能再用了）
3. **第二次登入** = 發給你一張**新的**門卡（Token B，編號：002）
4. **使用新門卡** = 檢查黑名單，發現 002 不在黑名單中，可以正常使用 ✅

## 總結

| 操作 | Token | jti | 黑名單 | 結果 |
|------|-------|-----|--------|------|
| 第一次登入 | Token A | uuid-1 | 空 | ✅ 可以使用 |
| 登出 | Token A | uuid-1 | uuid-1 | ❌ 被撤銷 |
| 第二次登入 | Token B | uuid-2 | uuid-1 | ✅ 可以使用（新的 jti）|
| 使用 Token A | Token A | uuid-1 | uuid-1 | ❌ 被拒絕（在黑名單中）|
| 使用 Token B | Token B | uuid-2 | uuid-1 | ✅ 可以使用（不在黑名單中）|

**結論：登出後，用戶可以正常重新登入，會獲得全新的 token，舊的 token 被撤銷，新的 token 可以正常使用。**
