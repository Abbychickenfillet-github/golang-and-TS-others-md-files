# SQLAlchemy back_populates 解釋

## 一句話說明

`back_populates` 是讓**兩個 Model 互相知道對方的關聯**，雙向同步。

---

## 問題：為什麼需要 back_populates？

假設有 `Order` 和 `Event` 兩個表：

```python
# ❌ 沒有 back_populates - 單向關聯
class Order(SQLModel, table=True):
    event_id: str = Field(foreign_key="event.id")
    event: "Event" = Relationship()  # Order 知道 Event

class Event(SQLModel, table=True):
    orders: list["Order"] = Relationship()  # Event 知道 Orders

# 問題：兩邊不同步！
order.event = some_event
print(some_event.orders)  # 可能不包含這個 order！
```

```python
# ✅ 有 back_populates - 雙向關聯
class Order(SQLModel, table=True):
    event_id: str = Field(foreign_key="event.id")
    event: "Event" = Relationship(back_populates="orders")

class Event(SQLModel, table=True):
    orders: list["Order"] = Relationship(back_populates="event")

# 現在兩邊同步！
order.event = some_event
print(some_event.orders)  # ✅ 自動包含這個 order
```

---

## 圖解

```
┌─────────────┐                    ┌─────────────┐
│    Order    │                    │    Event    │
├─────────────┤                    ├─────────────┤
│ event_id    │───foreign_key────→│ id          │
│ event       │←──back_populates──│ orders      │
└─────────────┘                    └─────────────┘

Order.event ←────同步────→ Event.orders
```

---

## 命名規則

`back_populates` 的值 = **對方的屬性名稱**

```python
class Order(SQLModel, table=True):
    event: "Event" = Relationship(back_populates="orders")
    #                                            ↑
    #                              Event 類別中的屬性名稱

class Event(SQLModel, table=True):
    orders: list["Order"] = Relationship(back_populates="event")
    #                                                    ↑
    #                                     Order 類別中的屬性名稱
```

---

## 實際範例（本專案）

```python
# backend/app/models/order.py
class Order(OrderBase, table=True):
    # 多對一：多個 Order 屬於一個 Event
    event: Optional["Event"] = Relationship(back_populates="orders")

    # 一對多：一個 Order 有多個 OrderItem
    order_items: list["OrderItem"] = Relationship(back_populates="order")

# backend/app/models/event.py
class Event(EventBase, table=True):
    # 一對多：一個 Event 有多個 Order
    orders: list["Order"] = Relationship(back_populates="event")

# backend/app/models/order_item.py
class OrderItem(OrderItemBase, table=True):
    # 多對一：多個 OrderItem 屬於一個 Order
    order: Optional["Order"] = Relationship(back_populates="order_items")
```

---

## 關聯類型對照

| 關聯類型 | A 這邊 | B 這邊 |
|----------|--------|--------|
| 一對多 | `list["B"]` | `Optional["A"]` |
| 多對一 | `Optional["B"]` | `list["A"]` |
| 一對一 | `Optional["B"]` | `Optional["A"]` |
| 多對多 | `list["B"]` | `list["A"]` |

```python
# 一對多範例：一個 Event 有多個 Order
class Event(SQLModel, table=True):
    orders: list["Order"] = Relationship(back_populates="event")  # 一對「多」

class Order(SQLModel, table=True):
    event: Optional["Event"] = Relationship(back_populates="orders")  # 「多」對一
```

---

## back_populates vs backref

| 方式 | 寫法 | 特點 |
|------|------|------|
| `back_populates` | 兩邊都要寫 | 明確、推薦 |
| `backref` | 只寫一邊 | 自動產生另一邊，但較隱晦 |

```python
# back_populates - 兩邊都寫（推薦）
class Order(SQLModel, table=True):
    event: "Event" = Relationship(back_populates="orders")

class Event(SQLModel, table=True):
    orders: list["Order"] = Relationship(back_populates="event")

# backref - 只寫一邊（不推薦，SQLModel 中較少用）
class Order(SQLModel, table=True):
    event: "Event" = Relationship(backref="orders")
# Event 會自動有 orders 屬性，但看不到定義
```

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `back_populates` 是什麼？ | 讓兩個 Model 的關聯雙向同步 |
| 值要填什麼？ | 對方類別中的屬性名稱 |
| 一定要寫嗎？ | 建議寫，確保雙向同步 |
| 兩邊都要寫嗎？ | 是，A 寫 B 的名稱，B 寫 A 的名稱 |
