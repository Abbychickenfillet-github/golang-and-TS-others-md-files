# json_encoders 與序列化 (Serialization)

## 什麼是序列化？

**序列化（Serialization）** 是把電腦程式中的物件或資料結構轉換成一連串可儲存或傳輸的位元組（byte stream）格式（如 JSON、XML 或二進位），以便能存入檔案、資料庫，或透過網路傳送，讓其他程式在不同時間、地點能將其還原回原始的物件狀態。

**反序列化（Deserialization）** 則是相反的過程：把位元組還原成物件。

```
┌─────────────┐    序列化     ┌─────────────┐
│ Python 物件 │  ─────────►  │ JSON 字串   │
│ Order(...)  │              │ {"id":...}  │
└─────────────┘  ◄─────────  └─────────────┘
                  反序列化
```

---

## JSON 序列化跟 JSON 套件有關係嗎？

**有關係，但不是同一個東西！**

```python
# Python 標準庫的 json 套件
import json
json.dumps({"name": "Alice"})  # 把 dict 轉成 JSON 字串

# SQLAlchemy 的 JSON 欄位型別
from sqlalchemy import JSON
metadata = Column(JSON)  # 資料庫欄位存 JSON

# Pydantic 的 json_encoders
class Config:
    json_encoders = {...}  # 告訴 Pydantic 如何序列化特殊型別
```

| 名稱 | 來源 | 用途 |
|------|------|------|
| `json` (小寫) | Python 標準庫 | 把 dict/list 轉成 JSON 字串 |
| `JSON` (大寫) | SQLAlchemy | 資料庫欄位型別，存 JSON 資料 |
| `json_encoders` | Pydantic 內建 | 定義物件 → JSON 的轉換規則 |

**`json_encoders` 不需要 import 任何東西！它是 Pydantic Model 內建的設定。**

---

## json_encoders 做什麼？

JSON 標準**只支援**這些型別：
- string（字串）
- number（數字）
- boolean（布林）
- null
- array（陣列）
- object（物件）

但 Python 有很多 JSON 不認識的型別：

```python
order = Order(
    created_at=datetime(2024, 1, 15, 10, 30),  # ❌ JSON 不認識 datetime！
    total_amount=Decimal("99.99"),              # ❌ JSON 不認識 Decimal！
    id=UUID("550e8400-e29b-41d4...")            # ❌ JSON 不認識 UUID！
)
```

**json_encoders 告訴 Pydantic 如何轉換這些型別：**

```python
class Config:
    json_encoders = {
        datetime: lambda v: v.isoformat(),  # datetime → ISO 格式字串
        uuid.UUID: str,                      # UUID → 字串
        Decimal: str,                        # Decimal → 字串
    }
```

轉換結果：

```python
# 轉換前（Python 物件）          # 轉換後（JSON 相容字串）
datetime(2024, 1, 15, 10, 30)  →  "2024-01-15T10:30:00"
Decimal("99.99")               →  "99.99"
UUID("550e8400-e29b...")       →  "550e8400-e29b..."
```

---

## json_encoders 語法拆解

```python
class Config:
    json_encoders = {
        datetime: lambda v: v.isoformat(),
        #   │          │  │      │
        #   │          │  │      └── 呼叫 isoformat() 方法
        #   │          │  └───────── v 是傳入的 datetime 物件
        #   │          └──────────── 匿名函數（見 lambda匿名函數.md）
        #   └─────────────────────── 當遇到 datetime 型別時，用這個函數轉換

        uuid.UUID: str,
        #    │      │
        #    │      └── 直接用 str() 函數轉換
        #    └───────── 當遇到 UUID 型別時

        Decimal: str,
        #   │     │
        #   │     └── 直接用 str() 函數轉換
        #   └──────── 當遇到 Decimal 型別時
    }
```

---

## class Config 是什麼？

`class Config` 是 **Pydantic 的設定類別**，放在 Model 內部，用來自訂 Model 的行為。

```python
class Order(SQLModel, table=True):
    # ↓ 這裡是資料欄位（會對應資料庫）
    id: str
    status: str
    created_at: datetime

    # ↓ 這裡是設定（不會變成資料欄位）
    class Config:
        json_encoders = {...}  # 序列化設定
        orm_mode = True        # 允許從 ORM 物件建立
```

**class Config 的內容不會變成資料庫欄位，只是設定！**

---

## 實際流程圖

```
API 請求回傳時：

┌────────────────────┐
│ Order 物件 (Python) │
│ created_at=datetime│
│ total=Decimal      │
└─────────┬──────────┘
          │
          ▼ Pydantic 檢查 json_encoders
          │
┌─────────┴──────────┐
│ 發現 datetime 型別  │
│ → 呼叫 lambda v:    │
│   v.isoformat()    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ JSON 字串          │
│ "created_at":      │
│ "2024-01-15T10:30" │
└────────────────────┘
```

---

## 總結

| 概念 | 說明 |
|------|------|
| 序列化 | 物件 → 可傳輸格式（如 JSON 字串） |
| 反序列化 | 可傳輸格式 → 物件 |
| `json_encoders` | Pydantic 設定，定義特殊型別如何序列化 |
| `class Config` | Pydantic Model 的設定區塊 |

**重點：`json_encoders` 是 Pydantic 內建功能，不需要 import JSON！**
