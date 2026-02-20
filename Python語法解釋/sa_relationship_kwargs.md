# SQLModel sa_relationship_kwargs 解釋

## 一句話說明

`sa_relationship_kwargs` 是把**額外參數傳給 SQLAlchemy 的 relationship()**，用來設定進階關聯行為。

---

## 為什麼需要它？

SQLModel 的 `Relationship()` 是簡化版，參數較少。
當你需要 SQLAlchemy 的進階功能時，用 `sa_relationship_kwargs` 傳入。

```python
# SQLModel 的 Relationship - 參數有限
Relationship(back_populates="xxx")

# 需要更多功能？用 sa_relationship_kwargs
Relationship(
    back_populates="xxx",
    sa_relationship_kwargs={
        "cascade": "all, delete-orphan",  # SQLAlchemy 的參數
        "lazy": "selectin",               # SQLAlchemy 的參數
    }
)
```

---

## 常用參數

### 1. cascade - 連鎖操作

控制父物件操作時，子物件要跟著做什麼。

```python
order_items: list["OrderItem"] = Relationship(
    back_populates="order",
    sa_relationship_kwargs={"cascade": "all, delete-orphan"}
)
```

| cascade 值 | 意思 |
|------------|------|
| `"all"` | 所有操作都連鎖（save, merge, delete...） |
| `"delete"` | 刪除父物件時，刪除子物件 |
| `"delete-orphan"` | 子物件脫離父物件時，自動刪除 |
| `"all, delete-orphan"` | 最常用！完全連鎖 + 孤兒刪除 |

```python
# 實際效果
order = Order(...)
order.order_items = [item1, item2]

# 刪除 order 時
session.delete(order)
# cascade="all, delete-orphan" → item1, item2 也會被刪除
```

---

### 2. lazy - 載入策略

控制關聯資料**什麼時候從資料庫讀取**。

```python
orders: list["Order"] = Relationship(
    back_populates="event",
    sa_relationship_kwargs={"lazy": "selectin"}
)
```

| lazy 值 | 意思 | 適合場景 |
|---------|------|----------|
| `"select"` | 存取時才查（預設） | 不一定會用到關聯 |
| `"selectin"` | 用 IN 查詢一次撈完 | 會用到關聯，避免 N+1 |
| `"joined"` | JOIN 一起查 | 一定會用到關聯 |
| `"subquery"` | 子查詢 | 複雜關聯 |
| `"dynamic"` | 回傳 Query 物件 | 大量資料，需要再篩選 |

```python
# N+1 問題（lazy="select" 預設）
events = session.query(Event).all()  # 1 次查詢
for event in events:
    print(event.orders)  # 每個 event 又查一次！N 次查詢

# 解法：lazy="selectin"
# 只會查 2 次：1 次 events + 1 次所有 orders（用 IN）
```

---

### 3. uselist - 是否回傳 list

控制關聯是**單一物件**還是**列表**。

```python
# 一對一：uselist=False
invoice: Optional["OrderInvoice"] = Relationship(
    back_populates="order",
    sa_relationship_kwargs={"uselist": False}  # 回傳單一物件，不是 list
)

# 一對多：uselist=True（預設）
order_items: list["OrderItem"] = Relationship(
    back_populates="order"
    # uselist=True 是預設，不用寫
)
```

---

### 4. foreign_keys - 指定外鍵

當一個 Model 有**多個外鍵指向同一個表**時，要明確指定。

```python
class Order(SQLModel, table=True):
    buyer_company_id: str = Field(foreign_key="company.id")
    seller_company_id: str = Field(foreign_key="company.id")

    # 要指定用哪個外鍵！
    seller_company: Optional["Company"] = Relationship(
        back_populates="seller_orders",
        sa_relationship_kwargs={"foreign_keys": "[Order.seller_company_id]"}
    )
```

---

## 實際範例（本專案）

```python
# backend/app/models/order.py

class Order(OrderBase, table=True):
    # 一對一：一個 Order 只有一個 Invoice
    invoice: Optional["OrderInvoice"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",  # 刪 Order 連帶刪 Invoice
            "uselist": False                   # 回傳單一物件
        }
    )

    # 一對多：一個 Order 有多個 OrderItem
    order_items: list["OrderItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan"   # 刪 Order 連帶刪所有 Items
        }
    )

    # 多個外鍵指向同一表
    seller_company: Optional["Company"] = Relationship(
        back_populates="seller_orders",
        sa_relationship_kwargs={
            "foreign_keys": "[Order.seller_company_id]"  # 指定用哪個外鍵
        }
    )
```

---

## 完整參數列表

| 參數 | 用途 |
|------|------|
| `cascade` | 連鎖操作（delete, save 等） |
| `lazy` | 載入策略（select, selectin, joined） |
| `uselist` | 回傳 list 還是單一物件 |
| `foreign_keys` | 指定外鍵（多外鍵時） |
| `primaryjoin` | 自訂 JOIN 條件 |
| `order_by` | 關聯資料排序 |
| `passive_deletes` | 讓資料庫處理刪除 |

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `sa_relationship_kwargs` 是什麼？ | 傳額外參數給 SQLAlchemy relationship |
| 什麼時候用？ | 需要 cascade、lazy、uselist 等進階功能時 |
| 最常用的設定？ | `{"cascade": "all, delete-orphan"}` |
| 一對一怎麼設？ | `{"uselist": False}` |

```python
# 最常見的寫法
order_items: list["OrderItem"] = Relationship(
    back_populates="order",
    sa_relationship_kwargs={"cascade": "all, delete-orphan"}
)
```
