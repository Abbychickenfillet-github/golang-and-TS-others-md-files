# Python SQLModel 的 Session 是什麼？

## 簡單比喻

**Session = 資料庫的「對話窗口」**

就像你跟銀行櫃員對話：
1. 開始對話（開啟 Session）
2. 說要做什麼（add, delete, query）
3. 確認執行（commit）或取消（rollback）
4. 結束對話（關閉 Session）

---

## Session 的生命週期

```
with Session(engine) as session:    # 1. 開啟對話
    order = session.get(Order, id)  # 2. 查詢資料
    order.status = "CANCELLED"      # 3. 修改資料
    session.add(order)              # 4. 標記要更新
    session.commit()                # 5. 確認執行
# 離開 with 區塊時自動關閉 Session   # 6. 結束對話
```

---

## Session vs Engine vs Connection

| 概念 | 比喻 | 說明 |
|------|------|------|
| **Engine** | 銀行大樓 | 資料庫連線設定，整個應用程式只需一個 |
| **Connection** | 銀行櫃檯 | 實際的網路連線 |
| **Session** | 對話窗口 | 一次交易的工作單元，管理物件狀態 |

```python
# Engine: 應用程式啟動時建立一次
from app.core.db import engine

# Session: 每次請求/操作建立新的
with Session(engine) as session:
    ...
```

---

## Session 在 FastAPI 中的用法

### 方式 1：依賴注入（推薦）

```python
# app/api/deps.py
def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]

# app/api/routes/orders.py
@router.get("/{order_id}")
def get_order(session: SessionDep, order_id: str):
    return session.get(Order, order_id)
```

每個 HTTP 請求自動獲得獨立的 Session，請求結束自動關閉。

### 方式 2：手動建立（背景任務用）

```python
# app/worker.py
def check_expired_orders():
    with Session(engine) as session:
        orders = session.exec(select(Order)).all()
        ...
        session.commit()
```

---

## Session 的狀態管理

Session 會追蹤物件的狀態：

| 狀態 | 說明 |
|------|------|
| **Transient** | 新建立的物件，還沒加入 Session |
| **Pending** | 已 add()，等待 commit |
| **Persistent** | 已 commit，與資料庫同步 |
| **Detached** | Session 關閉後的物件 |

```python
order = Order(id="123")          # Transient
session.add(order)               # Pending
session.commit()                 # Persistent
# 離開 with 區塊後                # Detached
```

---

## 常見問題

### Q1: 為什麼要用 `with Session(engine) as session`？

**自動資源管理**：確保 Session 一定會被關閉，即使發生錯誤。

```python
# 好：自動關閉
with Session(engine) as session:
    ...  # 即使這裡出錯，Session 也會被關閉

# 差：可能忘記關閉
session = Session(engine)
...  # 如果這裡出錯
session.close()  # 這行不會執行，造成資源洩漏
```

### Q2: 可以跨函數傳遞 Session 嗎？

**可以**，但要注意：
- 同一個請求內可以傳遞
- 不要跨請求/跨執行緒共用

```python
def update_order(session: Session, order_id: str):
    order = session.get(Order, order_id)
    order.status = "CANCELLED"
    session.add(order)
    # 不要在這裡 commit，讓呼叫者決定

def cancel_order(session: Session, order_id: str):
    update_order(session, order_id)
    log_action(session, order_id)
    session.commit()  # 統一在這裡 commit
```

### Q3: Session 和 Transaction 的關係？

Session 內部管理 Transaction：
- `session.begin()` - 開始交易（通常自動）
- `session.commit()` - 提交交易
- `session.rollback()` - 回滾交易

---

## 對應的原生 SQL

| SQLModel | 原生 SQL |
|----------|----------|
| `Session(engine)` | `BEGIN TRANSACTION` |
| `session.get(Order, id)` | `SELECT * FROM order WHERE id = ?` |
| `session.add(order)` | （準備 INSERT/UPDATE） |
| `session.commit()` | `COMMIT` |
| `session.rollback()` | `ROLLBACK` |
| Session 關閉 | 連線歸還連線池 |

---

## 參考資料

- [SQLModel Session 文件](https://sqlmodel.tiangolo.com/tutorial/select/)
- [SQLAlchemy Session 基礎](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
