# S3 Bucket 測試指南

本指南說明如何測試 AWS S3 bucket 連接和功能。

## 測試方法

### 方法 1: 使用完整測試腳本（推薦）

執行完整的 S3 功能測試，包括所有操作：

```bash
docker compose exec backend python scripts/test_s3_complete.py
```

**測試內容：**
1. ✅ S3 連接和配置
2. ✅ 列出所有 Bucket
3. ✅ 上傳文件到 S3
4. ✅ 讀取文件從 S3
5. ✅ 生成公共 URL
6. ✅ 生成預簽名 URL
7. ✅ 列出 Bucket 中的對象
8. ✅ 刪除文件從 S3

**輸出範例：**
```
======================================================================
  S3 Bucket 完整功能測試
======================================================================
  ℹ 開始時間: 2025-12-05 18:53:02

======================================================================
  測試 1: S3 連接和配置
======================================================================
  ✓ S3 客戶端創建成功

... (更多測試結果)

======================================================================
  測試總結
======================================================================
  ℹ 總測試數: 8
  ℹ 通過: 8
  ℹ 失敗: 0
  ✓ 所有測試通過！S3 bucket 功能完全正常
```

### 方法 2: 使用簡單測試腳本

快速測試基本連接和權限：

```bash
docker compose exec backend python scripts/test_s3_check.py
```

**測試內容：**
- 連接測試
- Bucket 存在性檢查
- 基本的上傳/讀取/刪除操作

### 方法 3: 使用 API 端點測試（需要管理員權限）

通過 HTTP API 測試 S3 功能：

```bash
# 首先獲取管理員 token
TOKEN=$(curl -X POST "http://localhost:8003/api/v1/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=你的管理員email&password=你的密碼" | jq -r '.access_token')

# 執行 S3 測試
curl -X POST "http://localhost:8003/api/v1/utils/test-s3/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**API 端點：** `POST /api/v1/utils/test-s3/`

**權限要求：** 需要超級管理員權限

**回應範例：**
```json
{
  "success": true,
  "bucket": "future-sign",
  "region": "ap-northeast-1",
  "tests": {
    "connection": true,
    "upload": true,
    "read": true,
    "public_url": true,
    "presigned_url": true,
    "list_objects": true,
    "delete": true
  },
  "test_file_key": "test/s3_api_test_20251205_185303.txt",
  "public_url": "https://future-sign.s3.ap-northeast-1.amazonaws.com/test/...",
  "presigned_url": "https://future-sign.s3.amazonaws.com/test/...?AWSAccessKeyId=..."
}
```

## 配置檢查

### 環境變數

確保以下環境變數已正確設置：

```bash
# 在容器中檢查
docker compose exec backend printenv | grep AWS

# 應該看到：
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=ap-northeast-1
# S3_BUCKET=future-sign
```

### 驗證配置

```bash
# 檢查當前使用的 bucket
docker compose exec backend printenv S3_BUCKET
# 應該輸出: future-sign
```

## 常見問題

### 問題 1: 測試失敗 - "Bucket 不存在"

**解決方法：**
1. 檢查 `.env` 檔案中的 `S3_BUCKET` 設定
2. 確認 bucket 名稱正確（區分大小寫）
3. 確認 bucket 在正確的 AWS 區域

### 問題 2: 測試失敗 - "上傳失敗: AccessDenied"

**解決方法：**
1. 檢查 IAM User 是否有上傳權限
2. 確認 Access Keys 是否正確
3. 檢查 bucket 政策是否允許操作

### 問題 3: 測試失敗 - "無法找到 AWS 憑證"

**解決方法：**
1. 檢查 `.env` 檔案中的 AWS 憑證
2. 確認 `docker-compose.yml` 中已設置環境變數
3. 重啟容器：`docker compose restart backend`

### 問題 4: 公共 URL 無法訪問

**原因：** Bucket 可能未設置為公開讀取

**解決方法：**
- 使用預簽名 URL（不需要公開 bucket）
- 或設置 bucket 政策允許公開讀取

## 測試文件清理

測試腳本會自動清理測試文件。如果測試中斷，可能需要手動清理：

```bash
# 在 AWS Console 中刪除 test/ 目錄下的文件
# 或使用 AWS CLI:
aws s3 rm s3://future-sign/test/ --recursive
```

## 相關文件

- S3 客戶端實作: `backend/app/utils/storage/s3_client.py`
- 存儲工具函數: `backend/app/utils/storage/storage_utils.py`
- 配置設定: `backend/app/core/config.py`
- Docker 配置: `docker-compose.yml`

## 注意事項

⚠️ **安全提醒：**
- 測試腳本會創建和刪除測試文件
- API 測試端點需要管理員權限
- 不要在生產環境中頻繁執行測試
- 測試文件會自動清理，但中斷時可能需要手動清理

✅ **最佳實踐：**
- 定期執行測試確保 S3 連接正常
- 在部署前執行完整測試
- 監控測試結果，及時發現問題
- 保持 AWS 憑證安全，定期輪換
