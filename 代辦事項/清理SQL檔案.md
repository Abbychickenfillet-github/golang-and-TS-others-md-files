# 清理 SQL 檔案待辦

## 待辦事項

### 1. 刪除未使用的 SQL 檔案
清理根目錄中臨時產生的 SQL 檔案：

```
company_final.sql
company_records.txt
company_records_fixed.txt
company_restore.sql
company_restore_final.sql
company_restore_final2.sql
company_restore_final3.sql
company_restore_fixed.sql
company_restore_multi.sql
company_restore_v2.sql
```

### 2. 備份最新 Schema
產生最新的資料庫 schema dump：

```bash
# 匯出 future_sign_stage schema（不含資料）
docker run --rm mysql:8 mysqldump -h hnd1.clusters.zeabur.com -P 32195 -uroot -p<MYSQL_PASSWORD> --no-data future_sign_stage > future_sign_schema_$(date +%Y%m%d).sql

# 匯出 future_sign_prod 完整備份（含資料）
docker run --rm mysql:8 mysqldump -h hnd1.clusters.zeabur.com -P 32195 -uroot -p<MYSQL_PASSWORD> future_sign_prod > future_sign_backup_$(date +%Y%m%d).sql
```

### 3. 整理 backend/sql 資料夾
檢查 `backend/sql/` 中的 migration 檔案，移除已過時或不再需要的 SQL 腳本。

## 清理指令

```bash
# 刪除根目錄的臨時 SQL 檔案
rm -f company_*.sql company_*.txt

# 保留的備份檔案
# - future_sign_backup_20251222.sql（重要備份，暫時保留）
# - future_sign_backup_20251222_clean.sql
```

## 狀態
- [ ] 刪除臨時 SQL 檔案
- [ ] 產生最新 schema dump
- [ ] 整理 backend/sql 資料夾
