# SQLModel/SQLAlchemy 的 session.commit() 說明

## 這是什麼語言？

**Python** - 使用 **SQLModel** 套件（底層是 **SQLAlchemy** ORM）

## 基本概念

SQLModel 使用「交易」(Transaction) 模式來操作資料庫：

```
[開始] → [add/修改] → [add/修改] → [commit] → [結束]
                                      ↑
                              一次性寫入資料庫
```

## 核心方法

### `session.add(obj)`
將物件加入「暫存區」，**尚未寫入資料庫**

```python
order = Order(id="123", status="PENDING")
session.add(order)  # 只是標記要新增，還沒真的寫入
```

### `session.commit()`
將所有暫存區的變更**一次性寫入資料庫**

```python
session.commit()  # 這時才真正執行 INSERT/UPDATE/DELETE
```

### `session.rollback()`
放棄所有暫存區的變更，**不寫入資料庫**

```python
try:
    session.add(order1)
    session.add(order2)
    session.commit()
except Exception:
    session.rollback()  # 出錯時全部撤銷
```

### `session.refresh(obj)`
從資料庫重新讀取物件的最新值（用於取得自動產生的欄位）

```python
session.add(order)
session.commit()
session.refresh(order)  # 取得資料庫產生的 created_at 等欄位
```

## 為什麼要分開 add 和 commit？

### 1. 批次處理效能
```python
# 好：一次 commit 多筆
for item in items:
    session.add(item)
session.commit()  # 只發送一次 SQL

# 差：每筆都 commit
for item in items:
    session.add(item)
    session.commit()  # 發送 N 次 SQL，效能差
```

### 2. 交易原子性 (Atomicity)
```python
# 全部成功或全部失敗
try:
    order.status = "CANCELLED"
    session.add(order)

    booth.booking_status = "available"
    session.add(booth)

    log = OrderLog(order_id=order.id, action="CANCEL")
    session.add(log)

    session.commit()  # 三個操作一起成功
except Exception:
    session.rollback()  # 三個操作一起撤銷
```

## 實際範例：worker.py 的過期訂單處理

```python
with Session(engine) as session:
    for order in expired_orders:
        # 1. 取消訂單
        order.status = OrderStatus.CANCELLED.value
        session.add(order)

        # 2. 記錄日誌
        log = OrderLog(order_id=order.id, action="CANCEL")
        session.add(log)

        # 3. 釋放攤位
        booth.booking_status = "available"
        session.add(booth)

    # 最後一次性 commit 所有變更
    session.commit()
```

## 常見錯誤

### 錯誤 1：在迴圈中 commit
```python
# 錯誤：效能差且無法 rollback
for order in orders:
    order.status = "CANCELLED"
    session.add(order)
    session.commit()  # 每次迴圈都 commit
```

### 錯誤 2：忘記 commit
```python
order.status = "CANCELLED"
session.add(order)
# 忘記 session.commit()
# 結果：資料庫沒有任何改變！
```

### 錯誤 3：service 內部 commit 導致外部無法 rollback
```python
# order_log_service.py
def log_cancel(self, session, order_id):
    log = OrderLog(order_id=order_id)
    session.add(log)
    session.commit()  # 這裡 commit 了

# 外部呼叫
try:
    order.status = "CANCELLED"
    session.add(order)
    order_log_service.log_cancel(session, order.id)  # 這裡已經 commit
    raise Exception("Something wrong")
except:
    session.rollback()  # 無法撤銷 log_cancel 的變更！
```

## 對應的 SQL

| SQLModel 方法 | 對應 SQL |
|---------------|----------|
| `session.add(new_obj)` | `INSERT INTO ...` |
| `session.add(existing_obj)` | `UPDATE ... SET ...` |
| `session.delete(obj)` | `DELETE FROM ...` |
| `session.commit()` | `COMMIT` |
| `session.rollback()` | `ROLLBACK` |

## 參考資料

- [SQLModel 官方文件](https://sqlmodel.tiangolo.com/)
- [SQLAlchemy Session 基礎](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
