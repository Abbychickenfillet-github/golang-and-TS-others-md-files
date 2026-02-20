# SQLAlchemy Relationship 與 Cascade 解釋

## 基本語法

```python
vendor_payment_methods: list["VendorPaymentMethod"] = Relationship(
    back_populates="event",
    sa_relationship_kwargs={"cascade": "all, delete-orphan"},
)
```

---

## 逐行解釋

### 1. `vendor_payment_methods: list["VendorPaymentMethod"]`

```python
vendor_payment_methods: list["VendorPaymentMethod"]
```

| 部分 | 說明 |
|------|------|
| `vendor_payment_methods` | 屬性名稱 |
| `:` | Python 型別提示 |
| `list["VendorPaymentMethod"]` | 這是一個列表，裡面裝的是 VendorPaymentMethod 物件 |
| `"VendorPaymentMethod"` | 用字串是因為這個 class 可能還沒定義（前向引用） |

**白話文**：這個活動(Event)可以有多個廠商支付方式

---

### 2. `Relationship(...)`

```python
Relationship(...)
```

SQLModel/SQLAlchemy 用來定義**兩個資料表之間的關聯**。

類似 Excel 的「關聯查詢」：
- Event 表 ← 關聯 → VendorPaymentMethod 表
- 透過 `event_id` 欄位連接

---

### 3. `back_populates="event"`

```python
back_populates="event"
```

**雙向關聯**：讓兩邊都能互相訪問對方。

```python
# Event model
vendor_payment_methods: list["VendorPaymentMethod"] = Relationship(
    back_populates="event"  # 指向 VendorPaymentMethod 的 "event" 屬性
)

# VendorPaymentMethod model
event: "Event" = Relationship(
    back_populates="vendor_payment_methods"  # 指向 Event 的屬性
)
```

**使用效果**：
```python
# 從活動找支付方式
event.vendor_payment_methods  # → [支付方式1, 支付方式2, ...]

# 從支付方式找活動
payment_method.event  # → 活動物件
```

---

### 4. `sa_relationship_kwargs={"cascade": "all, delete-orphan"}`

```python
sa_relationship_kwargs={"cascade": "all, delete-orphan"}
```

| 部分 | 說明 |
|------|------|
| `sa_relationship_kwargs` | 傳給 SQLAlchemy 原生 relationship 的參數 |
| `cascade` | 連動操作設定 |

---

## Cascade 選項詳解

### 什麼是 Cascade？

**Cascade = 連鎖反應**

當你對「父物件」做操作時，「子物件」要不要跟著一起處理？

---

### 所有 Cascade 選項

| 選項 | 說明 | 比喻 |
|------|------|------|
| `save-update` | 父儲存時，子也儲存 | 存檔時，附件也存 |
| `merge` | 父合併時，子也合併 | 更新時，附件也更新 |
| `delete` | 父刪除時，子也刪除 | 刪活動，支付方式也刪 |
| `delete-orphan` | 子失去父時，子自動刪除 | 支付方式沒有活動了，就刪掉 |
| `expunge` | 父從 session 移除時，子也移除 | 技術用途 |
| `refresh-expire` | 父刷新時，子也刷新 | 技術用途 |
| `all` | = save-update + merge + delete + expunge + refresh-expire | 常用捷徑 |

---

### 常見組合

#### `"all, delete-orphan"` （最常用）

```python
sa_relationship_kwargs={"cascade": "all, delete-orphan"}
```

效果：
1. ✅ 新增活動時，支付方式也一起存
2. ✅ 刪除活動時，支付方式也一起刪
3. ✅ 支付方式從活動移除時，支付方式自動刪除

適用：子物件不能獨立存在的情況（如：活動圖片、訂單明細）

---

#### `"all"` （不刪孤兒）

```python
sa_relationship_kwargs={"cascade": "all"}
```

效果：
1. ✅ 刪除活動時，支付方式也刪
2. ❌ 但支付方式可以脫離活動獨立存在

---

#### `"save-update, merge"` （不連動刪除）

```python
sa_relationship_kwargs={"cascade": "save-update, merge"}
```

效果：
1. ✅ 新增/更新會同步
2. ❌ 刪除父時，子不會被刪

適用：多對多關係、需要保留歷史記錄

---

## 圖解

```
┌─────────────────────────────────────────────────────────┐
│                        Event                             │
│  id: "event-001"                                         │
│  name: "亞洲香水節"                                       │
│                                                          │
│  vendor_payment_methods: [                               │
│    VendorPaymentMethod(id="vpm-001", event_id="event-001")│
│    VendorPaymentMethod(id="vpm-002", event_id="event-001")│
│  ]                                                       │
└─────────────────────────────────────────────────────────┘
                           │
                           │ cascade="all, delete-orphan"
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  刪除 Event("event-001")                                 │
│                    ↓                                     │
│  自動刪除 VendorPaymentMethod("vpm-001")                 │
│  自動刪除 VendorPaymentMethod("vpm-002")                 │
└─────────────────────────────────────────────────────────┘
```

---

## 實際程式碼範例

```python
# models/event.py
class Event(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str

    # 一對多關聯：一個活動有多個支付方式
    vendor_payment_methods: list["VendorPaymentMethod"] = Relationship(
        back_populates="event",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )

# models/vendor_payment_method.py
class VendorPaymentMethod(SQLModel, table=True):
    id: str = Field(primary_key=True)
    event_id: str = Field(foreign_key="event.id")  # 外鍵

    # 多對一關聯：多個支付方式屬於一個活動
    event: "Event" = Relationship(back_populates="vendor_payment_methods")
```

---

## 常見錯誤

### 錯誤 1：忘記設 cascade，刪除父時子變孤兒

```python
# 沒設 cascade
vendor_payment_methods: list["VendorPaymentMethod"] = Relationship(
    back_populates="event"
)

# 刪除活動
session.delete(event)
session.commit()

# 結果：VendorPaymentMethod 還在，但 event_id 指向的活動已不存在
# → 資料庫有髒資料！
```

### 錯誤 2：不需要 delete-orphan 卻設了

```python
# 會員與公司的關聯（會員可以離開公司但不應該被刪除）
member: "Member" = Relationship(
    back_populates="company",
    sa_relationship_kwargs={"cascade": "all, delete-orphan"},  # 錯！
)

# 會員離開公司時，會員會被刪除！不合理
```
