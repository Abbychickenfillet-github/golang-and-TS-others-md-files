# Event I18n 刪除策略分析

## 結論：event_i18n 應使用 Hard Delete

翻譯記錄是純粹的**從屬資料（dependent data）**，沒有獨立生命週期，應使用 hard delete。

---

## 現況問題

### 目前實作（軟刪除）
```
EventI18n Model → 有 DeletedAt gorm.DeletedAt 欄位
Repository.Delete() → 使用 GORM .Delete()（軟刪除）
```

### 三個問題

1. **活動被 hard delete 時，i18n 記錄變孤兒**
   - `event_service.go:780` hard delete 活動時只刪 tickets，沒刪 i18n
   - i18n 外鍵指向已不存在的 event_id → 孤兒資料

2. **軟刪除的 unique constraint 衝突**
   - `event_i18n` 有 `uniqueIndex:uk_event_locale` 在 `(event_id, locale)`
   - 軟刪除一筆 en 翻譯後，重建同語系翻譯會觸發 unique constraint 衝突
   - 因為軟刪除的記錄仍佔用 unique index
   - **Q: 可以直接移除 unique index 嗎？**
     - 技術上可以，但不建議
     - Unique index 是資料庫層保證「一個活動只有一筆某語系翻譯」的最後防線
     - 移除後，併發請求可能同時寫入兩筆 `(event_id=X, locale=en)` 的翻譯
     - 查詢結果回來多筆，需要 application code 額外處理「取哪一筆」
     - 等於用「失去資料完整性保護」換「軟刪除能運作」，代價更大

3. **無意義的資料膨脹**
   - 翻譯內容沒有審計需求，不需要保留歷史
   - 被刪除的翻譯沒有復原價值（重新翻譯即可）

---

## 業務邏輯分析

### 翻譯資料的本質

翻譯記錄 (`event_i18n`) 與活動 (`event`) 的關係：

| 特性 | event（活動） | event_i18n（翻譯） |
|------|-------------|-------------------|
| **獨立身份** | 有，是核心業務實體 | 無，完全依附於活動 |
| **被外部引用** | 被 ticket、booth、order 等引用 | 不被任何其他表引用 |
| **使用者操作** | 主辦方建立、管理員審核 | 主辦方自行填寫翻譯內容 |
| **刪除後果** | 影響訂單、票券、攤位等 | 僅影響該語系的顯示文字 |
| **復原需求** | 有，需保留資料供審計或恢復 | 無，重新輸入翻譯即可 |
| **法規審計** | 需要（財務、訂單相關） | 不需要（純顯示文字） |

### 使用情境

1. **主辦方刪除某個語系翻譯** → 該翻譯已無價值，hard delete 清理乾淨
2. **主辦方想重新建立同語系翻譯** → 若軟刪除，unique constraint `(event_id, locale)` 會擋住重建
3. **活動被 hard delete** → 翻譯應一起消失，不留孤兒
4. **活動被 soft delete** → 翻譯留著不影響（透過活動的 deleted_at 過濾即可）

### 若使用 Soft Delete 的做法

如果堅持使用軟刪除，需要處理：

1. **Unique constraint 改為 partial index**
   ```sql
   -- MySQL 不原生支援 partial unique index
   -- 需改用 composite unique index 包含 deleted_at，但 GORM 不直接支援
   -- 或移除 unique constraint 改為 application-level 檢查（犧牲資料庫層保護）
   ```

2. **手動級聯軟刪除**
   ```go
   // 活動軟刪除時，需手動軟刪除所有翻譯
   func (s *eventService) SoftDeleteEvent(eventID string) error {
       s.db.Where("event_id = ?", eventID).Delete(&models.EventI18n{})
       s.db.Delete(&models.Event{ID: eventID})
   }
   // 活動恢復時，也要手動恢復翻譯
   func (s *eventService) RestoreEvent(eventID string) error {
       s.db.Unscoped().Model(&models.EventI18n{}).
           Where("event_id = ?", eventID).
           Update("deleted_at", nil)
       // ...恢復活動
   }
   ```

3. **所有翻譯查詢都要過濾 deleted_at**
   - GORM 自動處理，但增加每次查詢的隱性成本
   - 漏掉 Unscoped 會造成「翻譯明明在卻查不到」的 bug

4. **活動 hard delete 時仍需清理**
   ```go
   // 軟刪除的翻譯在活動 hard delete 後變成永久孤兒
   // 還是需要 hard delete 翻譯
   s.db.Unscoped().Where("event_id = ?", eventID).Delete(&models.EventI18n{})
   ```

**結論：即使選擇軟刪除，最終還是需要 hard delete 的能力，而軟刪除本身帶來的復原價值對翻譯資料幾乎為零。**

---

## 文獻依據

### 1. 從屬資料不需要獨立軟刪除

> **"A child table is never something that you should look at without checking the parent table, so marking the parent table row as deleted is all you need to do."**
> — [SQLServerCentral - Soft Delete Child Records](https://www.sqlservercentral.com/forums/topic/data-modelling-how-do-you-handle-child-records-when-doing-a-soft-delete)

翻譯記錄永遠依附於活動，沒有獨立查詢場景。

### 2. 軟刪除對 Unique Constraint 的破壞

> **"If you soft-delete a record with a unique field, a new record cannot use that value unless you use partial unique indexes."**
> — [Jmix - To Delete or to Soft Delete](https://www.jmix.io/blog/to-delete-or-to-soft-delete-that-is-the-question/)

`(event_id, locale)` 的唯一約束 + 軟刪除 = 無法重建同語系翻譯。

### 3. Hard Delete + 從屬資料的最佳實踐

> **"Use database-native ON DELETE CASCADE for pure dependent data. This is the cleanest approach and is universally recommended."**
> — [DataCamp - SQL ON DELETE CASCADE](https://www.datacamp.com/tutorial/sql-on-delete-cascade)

### 4. GORM 不支援自動級聯軟刪除

> GORM 的 `.Delete()` 只影響單一 model，子關聯不會自動軟刪除。需手動實作級聯邏輯。
> — [GORM Issue #3702](https://github.com/go-gorm/gorm/issues/3702)

### 5. 軟刪除的真正適用場景

> **"Soft deletion is appropriate when: 1) Legal/audit compliance requires data retention, 2) Long-running business processes reference the data, 3) The record has independent identity."**
> — [brandur.org - Soft Deletion Probably Isn't Worth It](https://brandur.org/soft-deletion)

翻譯記錄不符合任何一項。

---

## 比較表

| 面向 | 軟刪除 | Hard Delete |
|------|--------|-------------|
| **可復原性** | 可復原但無實際價值 | 重新翻譯即可 |
| **查詢複雜度** | 每次查詢都要過濾 deleted_at | 查詢保持簡單 |
| **Unique constraint** | 衝突，無法重建同語系 | 正常運作 |
| **孤兒資料** | 活動 hard delete 後殘留 | 可用 CASCADE 自動清理 |
| **資料庫膨脹** | 累積無用記錄 | 保持乾淨 |
| **GORM 支援** | 級聯軟刪除需手動實作 | `Unscoped().Delete()` 簡單可靠 |
| **業界共識** | 僅適合有獨立生命週期的資料 | **推薦用於從屬資料** |

---

## 實作計畫

### 1. Model — 移除 DeletedAt 欄位
**檔案**: `internal/models/event_i18n.go`
```go
// 移除 DeletedAt gorm.DeletedAt
// 不需要軟刪除欄位
```

### 2. Repository — 改用 Hard Delete
**檔案**: `internal/repository/event_i18n_repository.go`
```go
// Delete 改用 Unscoped 永久刪除
func (r *eventI18nRepository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Unscoped().Where("id = ?", id).Delete(&models.EventI18n{}).Error
}

// 新增：根據活動 ID 刪除所有翻譯（供活動刪除時使用）
func (r *eventI18nRepository) HardDeleteByEventID(ctx context.Context, eventID string) error {
    return r.db.WithContext(ctx).Unscoped().Where("event_id = ?", eventID).Delete(&models.EventI18n{}).Error
}
```

### 3. Service — 活動 hard delete 時級聯刪除 i18n
**檔案**: `internal/service/event_service.go`

在 `RequestDeletion` 方法的 hard delete 分支加入：
```go
if eligibility.DeletionType == "hard" {
    // 刪除票券
    if s.ticketRepo != nil { ... }
    // 新增：刪除 i18n 翻譯
    if s.i18nRepo != nil {
        if err := s.i18nRepo.HardDeleteByEventID(ctx, eventID); err != nil {
            return nil, fmt.Errorf("永久刪除活動翻譯失敗: %w", err)
        }
    }
    // 刪除活動
    ...
}
```

### 4. 資料庫 — 清理已軟刪除的 i18n 記錄
```sql
-- 永久刪除所有已軟刪除的翻譯記錄
DELETE FROM event_i18n WHERE deleted_at IS NOT NULL;
-- 之後透過 migration 移除 deleted_at 欄位
```

### 修改檔案清單
| 檔案 | 修改 |
|------|------|
| `internal/models/event_i18n.go` | 移除 DeletedAt 欄位 |
| `internal/repository/event_i18n_repository.go` | Delete 改 hard delete、新增 HardDeleteByEventID |
| `internal/service/event_service.go` | hard delete 分支加入 i18n 級聯刪除 |
| `internal/service/event_i18n_service.go` | 確認 DeleteTranslation 不需改（repo 已改） |
