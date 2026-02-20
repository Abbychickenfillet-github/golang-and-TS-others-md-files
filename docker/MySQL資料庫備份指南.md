# MySQL 資料庫備份指南

本文件說明如何備份 MySQL 資料庫，包含 Docker 方式和本地安裝方式。

---

## 方法一：使用 Docker（推薦）

不需要安裝任何額外軟體，只要有 Docker 即可。

### 備份指令

```bash
# 基本格式
docker run --rm mysql:8 mysqldump -h <主機> -P <端口> -u <使用者> -p<密碼> <資料庫名> > 備份檔案.sql

# 實際範例：備份 Production 資料庫
docker run --rm mysql:8 mysqldump \
  -h hnd1.clusters.zeabur.com \
  -P 32195 \
  -u root \
  -p<MYSQL_PASSWORD> \
  future_sign_prod \
  --single-transaction \
  --quick \
  2>/dev/null > sql/future_sign_prod_backup_$(date +%Y%m%d).sql
```

### 參數說明

| 參數 | 說明 |
|------|------|
| `--rm` | 執行完自動刪除容器 |
| `-h` | MySQL 主機位址 |
| `-P` | MySQL 端口（注意是大寫 P） |
| `-u` | 使用者名稱 |
| `-p` | 密碼（注意：-p 和密碼之間**沒有空格**） |
| `--single-transaction` | 確保備份一致性（InnoDB） |
| `--quick` | 大型資料庫優化，逐行讀取 |
| `2>/dev/null` | 隱藏警告訊息 |

### 還原指令

```bash
# 還原到本地 Docker MySQL
docker compose -f docker-compose.infra.yml exec -T mysql \
  mysql -u root -ppassword futuresign_dev < sql/future_sign_prod_backup_20260130.sql
```

---

## 方法二：本地安裝 MySQL Client（Windows）

如果沒有 Docker，可以在本地安裝 MySQL 工具。

### 選項 A：MySQL Shell（輕量）

1. 前往 [MySQL Shell 下載頁面](https://dev.mysql.com/downloads/shell/)
2. 選擇 **Windows (x86, 64-bit), MSI Installer**
3. 下載並安裝
4. 安裝完成後，使用 `mysqlsh` 指令

```bash
# 使用 MySQL Shell 備份
mysqlsh -h hnd1.clusters.zeabur.com -P 32195 -u root -p \
  --sql -e "SELECT * FROM future_sign_prod.member" > backup.sql
```

### 選項 B：MySQL Workbench（圖形介面）

1. 前往 [MySQL Workbench 下載頁面](https://dev.mysql.com/downloads/workbench/)
2. 選擇 **Windows (x86, 64-bit), MSI Installer**
3. 下載並安裝

#### 使用 Workbench 備份步驟：

1. 開啟 MySQL Workbench
2. 點擊 **+** 新增連線
3. 輸入連線資訊：
   - **Hostname**: `hnd1.clusters.zeabur.com`
   - **Port**: `32195`
   - **Username**: `root`
   - **Password**: 點擊 "Store in Vault" 儲存密碼
4. 連線成功後，選擇 **Server > Data Export**
5. 選擇要備份的資料庫和資料表
6. 選擇匯出路徑，點擊 **Start Export**

### 選項 C：只安裝 MySQL Client（命令列）

1. 前往 [MySQL Installer 下載頁面](https://dev.mysql.com/downloads/installer/)
2. 下載 **mysql-installer-web-community**
3. 安裝時只選擇 **MySQL Server** 下的 **MySQL Client**
4. 安裝完成後可使用 `mysqldump` 指令

```bash
# 使用本地 mysqldump
mysqldump -h hnd1.clusters.zeabur.com -P 32195 -u root -p future_sign_prod > backup.sql
```

---

## 環境連線資訊

### Production（正式環境）

```
MYSQL_HOST=hnd1.clusters.zeabur.com
MYSQL_PORT=32195
MYSQL_USER=root
MYSQL_PASSWORD=<MYSQL_PASSWORD>
MYSQL_DATABASE=future_sign_prod
```

### Stage（測試環境）

```
MYSQL_HOST=hnd1.clusters.zeabur.com
MYSQL_PORT=32195
MYSQL_USER=root
MYSQL_PASSWORD=<MYSQL_PASSWORD>
MYSQL_DATABASE=future_sign_stage_Go
```

### Local（本地開發）

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=futuresign_dev
```

---

## 備份檔案存放位置

所有備份檔案統一放在 `sql/` 目錄：

```
sql/
├── future_sign_prod_backup_20260130.sql    # Production 備份
├── futuresign_dev_dump.sql                  # 開發環境 dump
└── ...
```

---

## 常用備份腳本

### PowerShell（Windows）

```powershell
# backup-prod.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$filename = "sql/future_sign_prod_backup_$date.sql"

docker run --rm mysql:8 mysqldump `
  -h hnd1.clusters.zeabur.com `
  -P 32195 `
  -u root `
  -p<MYSQL_PASSWORD> `
  future_sign_prod `
  --single-transaction `
  --quick 2>$null > $filename

Write-Host "備份完成: $filename"
```

### Bash（macOS/Linux）

```bash
#!/bin/bash
# backup-prod.sh

FILENAME="sql/future_sign_prod_backup_$(date +%Y%m%d_%H%M%S).sql"

docker run --rm mysql:8 mysqldump \
  -h hnd1.clusters.zeabur.com \
  -P 32195 \
  -u root \
  -p<MYSQL_PASSWORD> \
  future_sign_prod \
  --single-transaction \
  --quick \
  2>/dev/null > "$FILENAME"

echo "備份完成: $FILENAME"
```

---

## 注意事項

1. **密碼安全**：不要將包含密碼的腳本提交到 Git
2. **備份頻率**：建議每週至少備份一次 Production
3. **備份驗證**：定期測試還原備份檔案確保可用
4. **檔案大小**：大型資料庫備份可能需要較長時間，建議使用 `--quick` 參數
