# 在 Git Bash 中執行設置腳本

## 方法 1: 直接在 Git Bash 中執行（推薦）

1. **打開 Git Bash**
   - 在 Windows 開始菜單搜索 "Git Bash"
   - 或右鍵點擊文件夾 → "Git Bash Here"

2. **導航到項目目錄**
   ```bash
   cd /c/coding/template
   ```

3. **給腳本添加執行權限**
   ```bash
   chmod +x scripts/setup-multi-clone.sh
   ```

4. **執行設置腳本**
   ```bash
   # 創建 feature 環境（使用不同的端口）
   bash scripts/setup-multi-clone.sh https://github.com/yutuo-tech/template.git /c/coding feature

   # 或者創建 main 環境
   bash scripts/setup-multi-clone.sh https://github.com/yutuo-tech/template.git /c/coding main
   ```

## 方法 2: 使用批處理文件

雙擊執行 `scripts/setup-multi-clone.bat`，或在命令提示符中執行：

```cmd
scripts\setup-multi-clone.bat https://github.com/yutuo-tech/template.git C:\coding feature
```

## 參數說明

- **repo-url**: Repository URL（必需）
  - 範例: `https://github.com/yutuo-tech/template.git`

- **base-dir**: 基礎目錄（可選，預設: `$HOME/coding` 或 `C:\coding`）
  - Windows: `C:\coding`
  - Git Bash: `/c/coding`

- **env-name**: 環境名稱（可選，預設: `feature`）
  - `main`: 主環境（端口 8003, 5003, 3000）
  - `feature`: 功能環境（端口 8004, 5004, 3001）
  - `test`: 測試環境（端口 8005, 5005, 3002）

## 執行範例

### 創建 feature 環境
```bash
bash scripts/setup-multi-clone.sh https://github.com/yutuo-tech/template.git /c/coding feature
```

這會：
- 在 `/c/coding/template-feature` 創建新的 clone
- 自動設置端口為 8004, 5004, 3001
- 配置環境變數文件

### 創建 main 環境
```bash
bash scripts/setup-multi-clone.sh https://github.com/yutuo-tech/template.git /c/coding main
```

這會：
- 在 `/c/coding/template-main` 創建新的 clone
- 自動設置端口為 8003, 5003, 3000
- 配置環境變數文件

## 執行後會發生什麼？

1. ✅ Clone repository 到指定目錄
2. ✅ 自動計算並設置端口（避免衝突）
3. ✅ 創建/更新 `.env` 文件
4. ✅ 設置 Next.js 環境變數（`offcial_webiste/.env`）
5. ✅ 顯示環境資訊和下一步指示

## 下一步

設置完成後：

1. **進入新環境目錄**
   ```bash
   cd /c/coding/template-feature
   ```

2. **檢查環境變數**
   ```bash
   cat .env
   cat offcial_webiste/.env
   ```

3. **安裝依賴並啟動**
   ```bash
   # Backend
   cd backend
   uv sync

   # Frontend/Website
   cd ../offcial_webiste
   pnpm install
   pnpm dev
   ```

## 常見問題

### Q: 提示 "權限被拒絕"
**A:** 執行 `chmod +x scripts/setup-multi-clone.sh`

### Q: 目錄已存在怎麼辦？
**A:** 腳本會詢問是否刪除並重新 clone，輸入 `y` 確認

### Q: 如何查看所有環境？
**A:** 執行 `bash scripts/list-envs.sh`

### Q: 如何切換環境？
**A:** 執行 `bash scripts/switch-env.sh feature`

