# Martin Fowler — Audit Log Pattern 翻譯與解析

> 原文：https://martinfowler.com/eaaDev/AuditLog.html
> 發表日期：2004 年 3 月 7 日
> 相關文件：[action-log-table-design.md](action-log-table-design.md)

---

## 原文翻譯

### 運作方式（How it Works）

Audit Log 是追蹤時間相關資訊**最簡單、但也最有效**的方式之一。每次發生重要的事情，你就寫一筆紀錄，記下**發生了什麼**和**什麼時候發生的**。

實體儲存的方式有很多種：檔案很常用，資料庫表格也可以。如果用檔案，ASCII 格式有助於人類直接閱讀，不需要特殊軟體。如果是簡單的表格結構，tab 分隔的文字格式就夠了。更複雜的結構可以用 XML 格式。

（關於 ASCII 格式的解釋見[下方](#ascii-格式是什麼意思為什麼好讀)）

隨著 log 越來越大，閱讀會變困難。一開始可以手動看，但重複性的工作需要寫腳本自動化。如果存在資料庫裡，可以用 SQL 查詢。

這個模式強調要**同時記錄兩個日期**：
- **actual date**（實際日期）：事情真正發生的時間
- **record date**（紀錄日期）：寫入紀錄的時間（通常是 `now()`）

這兩個日期 99% 的情況是一樣的。但捕捉兩個日期對那剩下 1% 的情況非常有價值。

### 什麼時候用（When to Use It）

Audit Log 最大的優勢是**簡單**。相比其他追蹤歷史的模式（如 Temporal Property、Temporal Object），它不會增加 object model 的複雜度。

缺點是**處理困難**。如果你需要大量組合歷史資料（例如每週帳單計算），分析 log 的程式碼會變得很龐大且難維護。

> 整合越緊密（跟核心業務邏輯綁得越深），Audit Log 就越不適用。

這個模式允許混合使用：你可以在某些部分用 Audit Log，在其他部分用更複雜的時間追蹤模式。

### 程式碼範例（Java）

```java
class Customer {

    private String phone;

    public String getPhone() {
        return (phone == null) ? "none" : phone;
    }

    // 設定電話 + 自動寫 log
    public void setPhone(String arg, MfDate changeDate) {
        log(changeDate, this, "change of phone", phone, arg);  // 先寫 log
        phone = arg;  // 再改值
    }

    public void setPhone(String arg) {
        setPhone(arg, MfDate.today());  // 預設用今天的日期
    }

    // 寫入 log 的方法
    private static void log(MfDate validDate, Customer customer,
                            String description, Object oldValue, Object newValue) {
        try {
            // 用 tab 分隔，寫入檔案
            logfile().write(
                validDate.toString() + "\t" +
                customer.name() + "\t" +
                description + "\t" +
                oldValue + "\t" +
                newValue + "\t" +
                MfDate.today() + "\n"   // record date（紀錄時間）
            );
            logfile().flush();
        } catch (IOException e) {
            throw new ApplicationException("Unable to write to log");
        }
    }
}
```

這段程式碼做了：
1. 每次改電話號碼之前，先寫一筆 log
2. Log 內容用 tab（`\t`）分隔，包含：改動日期、客戶名稱、描述、舊值、新值、紀錄時間
3. 同時記錄了 `validDate`（實際日期）和 `MfDate.today()`（紀錄日期）

---

## ASCII 格式是什麼意思？為什麼好讀？

Martin Fowler 說的「ASCII 格式」不是什麼特殊技術，就是**純文字檔**（.txt / .log / .csv）。

### 對比：純文字 vs 二進制 vs 資料庫

**純文字（ASCII）— 用記事本就能打開：**
```
2025-02-22	張三	change of phone	0912345678	0987654321	2025-02-22
2025-02-22	李四	change of email	old@mail.com	new@mail.com	2025-02-22
2025-02-22	王五	change of phone	0911111111	0922222222	2025-02-22
```
→ 用記事本、VS Code、`cat` 命令就能直接看，不需要任何工具

**二進制格式 — 需要專門軟體：**
```
00 1A 3F 7C 82 A0 FF 00 4E 61 6D 65 3A 20 E5 BC ...
```
→ 打開來是亂碼，需要專門的 parser 才能讀

**資料庫 — 需要連線工具：**
```sql
-- 要先連上資料庫，再下 SQL
SELECT * FROM audit_log WHERE customer_name = '張三';
```
→ 需要 MySQL client、DBeaver 等工具

### Fowler 提到的三種文字格式

| 格式 | 適合什麼 | 範例 |
|------|---------|------|
| **Tab 分隔**（TSV） | 簡單的表格資料 | `日期\t姓名\t操作\t舊值\t新值` |
| **XML** | 複雜巢狀結構 | `<change><customer>張三</customer><field>phone</field>...</change>` |
| **（現代會用 JSON）** | Fowler 寫這篇是 2004 年，當時 JSON 還沒流行 | `{"customer": "張三", "field": "phone", ...}` |

Tab 分隔就是上面 Java 程式碼裡用 `\t` 分隔的那個格式 — 每個欄位之間用 tab 隔開，一行一筆紀錄。

### 為什麼 Fowler 強調這個？

2004 年他寫這篇的時候，很多系統的 log 是用二進制格式或專有格式存的（例如 Windows Event Log），要用特定工具才能讀。他的建議是：**用人類看得懂的純文字存**，這樣任何人拿到檔案用記事本就能看，不需要裝軟體。

對我們來說這點不太相關 — 我們直接存資料庫，用 SQL 查就好。

---

## 跟我們 action_log 設計的關係

| Fowler 的概念 | 我們的對應 |
|---|---|
| 「每次發生重要的事就寫一筆」 | 每個 action 都是一筆 INSERT |
| 「寫完不再修改」（append-only） | 我們也是 append-only，不 UPDATE |
| actual date + record date | 我們用 `created_at` 同時當兩者（因為 log 都是即時寫入的） |
| 用檔案存 + ASCII 格式 | 我們用資料庫存，用 SQL 查 |
| 「資料量大後處理困難」 | 我們的 `NOT EXISTS` 子查詢就是這個代價，但以我們的規模（< 100 萬筆）不是問題 |
| 「跟核心業務邏輯保持鬆耦合」 | action_log 是獨立的表，不影響 event/order 等主表的結構 |

Fowler 這篇是 2004 年的文章，很多實作建議已經過時（檔案 vs DB、XML vs JSON），但核心設計理念——**「發生什麼就記什麼，寫完不動」**——到現在還是 audit log 的標準做法，也是我們 action_log 的設計基礎。
