# MySQL Docker CLI 知識

> 建立日期：2026-01-23

---

## `mysql:8` 是什麼？

`mysql:8` 是 Docker Hub 上的官方 MySQL 映像標籤，代表 **MySQL 8.0 版本**。

```bash
docker run mysql:8    # 拉取並執行 MySQL 8.x 容器
```

---

## MySQL 版本歷史

| 版本 | 發布時間 | 支援結束 | 備註 |
|------|----------|----------|------|
| 5.7 | 2015-10 | 2023-10 | 舊版，已終止支援 |
| **8.0** | 2018-04 | **2026-04** | 長期支援版 (LTS) |
| 8.4 | 2024 | TBD | 新 LTS 版本 |
| 9.x | 2024+ | TBD | 最新版 |

---

## MySQL 8.0 vs 5.7 主要差異

| 特性 | MySQL 5.7 | MySQL 8.0 |
|------|-----------|-----------|
| 預設字元集 | `latin1` | `utf8mb4` |
| JSON 支援 | 基本 | 原生支援 |
| 窗口函數 (Window Functions) | 無 | 支援 |
| CTE (`WITH` 語法) | 無 | 支援 |
| 資料字典 | 檔案式 (.frm) | 交易式 (InnoDB) |
| 密碼驗證 | `mysql_native_password` | `caching_sha2_password` |
| 降級選項 | 可降級到 5.6 | **無法降級** |

---

## Docker 映像標籤說明

```bash
# 版本標籤範例
docker run mysql:8           # 8.x 最新版（推薦）
docker run mysql:8.0         # 8.0.x 最新版
docker run mysql:8.0.35      # 指定精確版本
docker run mysql:latest      # 最新版（可能是 9.x，不建議用於生產）
docker run mysql:5.7         # 舊版（已終止支援）
```

---

## 常用 Docker MySQL 指令

### 執行 SQL 查詢

```bash
# 基本查詢
docker run --rm mysql:8 mysql -h 主機 -P 埠號 -u 使用者 -p密碼 資料庫 -e "SELECT 1;"

# 使用 UTF-8 編碼
docker run --rm mysql:8 mysql \
  -h 主機 -P 埠號 -u root -p密碼 \
  --default-character-set=utf8mb4 \
  資料庫 -e "SELECT * FROM table;"
```

### 執行 SQL 檔案

```bash
# 方法 1: 使用 stdin 重導向（推薦）
docker run --rm -e LANG=C.UTF-8 -i mysql:8 mysql \
  -h 主機 -P 埠號 -u root -p密碼 \
  --default-character-set=utf8mb4 \
  資料庫 < file.sql

# 方法 2: 在 SQL 檔案開頭設定編碼
# file.sql:
# SET NAMES utf8mb4;
# INSERT INTO ...
```

### 常用參數說明

| 參數 | 說明 |
|------|------|
| `--rm` | 執行完自動刪除容器（Remove） |
| `-i` | 保持 stdin 開啟（用於導入檔案）|
| `-e LANG=C.UTF-8` | 設定容器 locale |
| `--default-character-set=utf8mb4` | MySQL 客戶端編碼 |
| `-e "SQL"` | 執行單行 SQL |

---

## `--rm` 參數詳解

`--rm` = **R**e**m**ove，容器執行完畢後**自動刪除**。

```bash
# 有 --rm：執行完自動刪除容器
docker run --rm mysql:8 mysql -e "SELECT 1"
# 執行完 → 容器消失

# 沒有 --rm：容器會留著
docker run mysql:8 mysql -e "SELECT 1"
# 執行完 → 容器還在（狀態 Exited）
```

**使用時機：**

| 情境 | 建議 |
|------|------|
| 一次性指令（查詢、執行 SQL） | 用 `--rm`，避免累積無用容器 |
| 需要保留容器（debug、查 logs） | 不用 `--rm` |

**清理殘留容器：**
```bash
docker ps -a              # 列出所有容器（含已停止）
docker container prune    # 清除所有已停止的容器
```

---

## 中文亂碼問題

### 問題原因

透過 `cat file.sql | docker run mysql` 插入資料時，UTF-8 可能被誤解為 Latin-1。

### 解決方案

```bash
# 正確寫法
docker run --rm -e LANG=C.UTF-8 -i mysql:8 mysql \
  -h 主機 -u root -p密碼 \
  --default-character-set=utf8mb4 \
  資料庫 < file.sql

# 或在 SQL 檔案開頭加入
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
```

---

## MySQL 條件註解語法

MySQL 支援條件註解，只有特定版本以上才執行：

```sql
/*!NNNNN SQL語句 */
```

**NNNNN 版本號計算**：`主版本*10000 + 次版本*100 + 修訂版`

| 版本號 | 對應版本 | 說明 |
|--------|----------|------|
| 50003 | 5.0.3 | `/*!50003 SET character_set_results = utf8mb4 */` |
| 50700 | 5.7.0 | MySQL 5.7 新功能 |
| 80000 | 8.0.0 | MySQL 8.0 新功能 |

**用途**：確保 SQL dump 檔案在不同版本 MySQL 間的相容性。

---

## 參考資料

- [MySQL 8.0 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/)
- [Docker Hub - MySQL](https://hub.docker.com/_/mysql)
- MySQL 8.0 官方支援至 2026 年 4 月結束
