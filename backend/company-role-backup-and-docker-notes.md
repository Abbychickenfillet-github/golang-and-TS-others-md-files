# Company Role 備份與 Docker 常用指令筆記

## 一、`mysqldump` 備份公司角色

### 單行 CMD（已驗證會產生含資料的檔案）
```cmd
cd /d C:\coding\template & set "fname=company_role_backup_%date:~0,4%%date:~5,2%%date:~8,2%.sql" & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -h tpe1.clusters.zeabur.com -P 24500 -u root -pVtDUhX4J9cpdb138iyeH5u0mE672FGoS future_sign company --no-create-db --no-create-info --where="1=1" --skip-lock-tables --compact --complete-insert > "sql\%fname%"
```

### 參數解釋
- `set "fname=..."`：設定檔名變數（依系統日期產生）。
- `--no-create-db`：不輸出 `CREATE DATABASE`。
- `--no-create-info`：不輸出 `CREATE TABLE`，只匯出資料。
- `--where="1=1"`：不做篩選，等同全表；若要篩選可改條件。
- `--skip-lock-tables`：跳過鎖表（避免阻塞，但可能在極少數情況讀到未提交變更）。
- `--compact`：精簡輸出（減少多餘註解）。
- `--complete-insert`：每筆 `INSERT` 都包含欄位名稱，降低欄位順序差異風險。

### 為什麼匯出到檔案且不會改資料庫？
指令僅「讀取」資料並導出到本機 `sql\*.sql`，沒有任何 `INSERT/UPDATE` 發送回資料庫。

### 目前檔案內容為何包含整張表？
`mysqldump` 在不指定欄位時會匯出表的所有欄位（即使 `--no-create-info` 也會輸出完整列資料）。如果只想備份 `id, role`，用下列方式：
```cmd
cd /d C:\coding\template & set "fname=company_role_id_role_%date:~0,4%%date:~5,2%%date:~8,2%.tsv" & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h tpe1.clusters.zeabur.com -P 24500 -u root -pVtDUhX4J9cpdb138iyeH5u0mE672FGoS -e "SELECT id, role FROM company" future_sign > "sql\%fname%"
```
- 這會產生 tab 分隔檔，只含 `id` 和 `role`。

## 二、Company `role` 欄位調整
- 目標：從 ENUM 改為 `VARCHAR(50)`，保留預設值 `vendor`。
- SQL 檔：`backend/sql/123_change_company_role_to_varchar.sql`
- 套用指令（示例，未執行）：
  `mysql -h tpe1.clusters.zeabur.com -P 24500 -u root -pVtDUhX4J9cpdb138iyeH5u0mE672FGoS future_sign < backend/sql/123_change_company_role_to_varchar.sql`

## 三、Docker 前後端常用指令與檢查
- 啟動全部服務（背景）：`docker compose up -d`
- 看後端日誌：`docker compose logs -f backend`
- 看前端日誌：`docker compose logs -f frontend`
- 查看埠佔用（例如 5003）：`netstat -ano | findstr :5003`
- 停止特定服務：`docker compose stop frontend`

## 四、Checklist（可貼到 HackMD 勾選）
- [ ] 已備份 company role（全表）到 `sql/company_role_backup_YYYYMMDD.sql`
- [ ] 已備份 company role（僅 id、role）到 `sql/company_role_id_role_YYYYMMDD.tsv`
- [ ] 已套用 `123_change_company_role_to_varchar.sql`（ENUM -> VARCHAR(50)）
- [ ] 需要時已檢查 5003/8003 埠佔用並釋放
- [ ] 需要時已查看後端/前端日誌（`docker compose logs -f backend|frontend`）
- [ ] 若切換前端為 Docker 模式，確認 `docker compose up -d frontend` 成功且無埠衝突



















