# Centralized Error/System Log 設計參考

> 從 [action-log-table-design.md](action-log-table-design.md) 獨立出來。
> 這篇是關於 **error log / system log**（系統錯誤與事件紀錄），不是業務操作紀錄（action log）。

---

## Microsoft Q&A — Best way to design centralize log table

**來源**：https://learn.microsoft.com/en-us/answers/questions/116029/sql-server-best-way-to-design-centralize-log-table

### 重點

社群建議使用 centralized log table，透過額外欄位區分 log 類型。MVP 建議用 identity column 作 PK，datetime2(3) 記時間。

### 典型的 system log 表結構

```sql
CREATE TABLE system_log (
    id          INT IDENTITY PRIMARY KEY,
    log_level   VARCHAR(20),    -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
    source      VARCHAR(100),   -- 來源模組/服務
    message     TEXT,           -- 錯誤訊息
    stack_trace TEXT,           -- 堆疊追蹤
    created_at  DATETIME2(3)    -- 精確到毫秒
);
```

### 跟 action_log 的差異

| | system_log（error log） | action_log（操作紀錄） |
|---|---|---|
| 記錄什麼 | 系統錯誤、異常、警告 | 使用者的業務操作（CRUD、審核） |
| 誰觸發 | 系統自動 | 使用者主動操作 |
| 用途 | debug、監控、告警 | 稽核、審核流程、操作追蹤 |
| 有狀態流轉嗎 | 沒有 | 有（pending → approved/rejected） |
| 通常存哪 | 檔案 / ELK / CloudWatch | 資料庫 |

### 我們需要嗎？

目前階段不需要獨立的 system log 表。我們的錯誤紀錄透過 Docker logs + AWS CloudWatch 處理。如果未來需要在資料庫記錯誤，可以參考這個結構。
