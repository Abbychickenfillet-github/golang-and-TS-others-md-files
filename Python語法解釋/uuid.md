# Python UUID 模組

## UUID 是什麼？

UUID (Universally Unique Identifier) 是**通用唯一識別碼**，用來產生不重複的 ID。

```python
import uuid

# 產生一個 UUID
my_uuid = uuid.uuid4()
print(my_uuid)  # 550e8400-e29b-41d4-a716-446655440000
```

---

## UUID 版本比較

| 版本 | 函式 | 產生方式 | 常用程度 |
|------|------|----------|----------|
| UUID1 | `uuid.uuid1()` | 時間戳 + MAC 地址 | 較少用 |
| UUID3 | `uuid.uuid3()` | 名稱 + MD5 雜湊 | 少用 |
| UUID4 | `uuid.uuid4()` | 隨機產生 | ✅ 最常用 |
| UUID5 | `uuid.uuid5()` | 名稱 + SHA-1 雜湊 | 少用 |

```python
import uuid

# UUID4 - 隨機產生（最常用）
print(uuid.uuid4())  # 隨機的 UUID

# UUID1 - 包含時間和 MAC 地址
print(uuid.uuid1())  # 可追蹤產生時間和機器
```

---

## 🤔 為什麼 UUID1 要用 MAC 地址？

**目的：保證全世界不重複**

```
UUID1 = 時間戳 + MAC 地址
        │         │
        │         └─ 哪台電腦產生的（MAC 全球唯一）
        └─ 什麼時候產生的
```

這樣即使兩台電腦**同一時間**產生 UUID，也不會重複（因為 MAC 不同）。

### UUID1 vs UUID4 選擇

| 版本 | 組成 | 用途 |
|------|------|------|
| **UUID1** | 時間戳 + MAC | 可追蹤「誰」在「何時」產生 |
| **UUID4** | 純隨機 | 單純不重複就好 ✅ |

### 什麼時候用哪個？

| 情境 | 用哪個 |
|------|--------|
| 一般資料庫主鍵 | ✅ `uuid4()` |
| 不想洩漏機器資訊 | ✅ `uuid4()` |
| 需要追蹤來源機器 | `uuid1()` |
| 分散式系統、要排序 | `uuid1()` |

### 結論

```python
# 99% 情況用這個就好
id = str(uuid.uuid4())

# UUID1 + MAC 是早期設計，現在很少用
# 而且有隱私問題（可以知道你的網卡）
```

**簡單說：UUID1 用 MAC 是為了「絕對不重複」，但現在 UUID4 的隨機性已經夠用了。**

---

## 常用操作

### 產生 UUID

```python
import uuid

# 產生 UUID 物件
my_uuid = uuid.uuid4()
print(my_uuid)        # 550e8400-e29b-41d4-a716-446655440000
print(type(my_uuid))  # <class 'uuid.UUID'>

# 轉成字串
uuid_str = str(uuid.uuid4())
print(uuid_str)       # "550e8400-e29b-41d4-a716-446655440000"

# 不要橫線的格式
uuid_hex = uuid.uuid4().hex
print(uuid_hex)       # "550e8400e29b41d4a716446655440000"
```

### 字串轉 UUID

```python
import uuid

# 字串 → UUID 物件
uuid_str = "550e8400-e29b-41d4-a716-446655440000"
my_uuid = uuid.UUID(uuid_str)
print(type(my_uuid))  # <class 'uuid.UUID'>
```

---

## 在 SQLModel/資料庫中使用

```python
import uuid
from sqlmodel import Field, SQLModel

class Order(SQLModel, table=True):
    # 方法 1: 用 lambda
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        max_length=36
    )

    # 方法 2: 直接用 uuid.uuid4（需轉字串）
    # id: str = Field(default_factory=uuid.uuid4)  # 這會是 UUID 物件，要小心
```

---

## 用 UUID 取得 MAC 地址

`uuid.getnode()` 可以取得電腦的 MAC 地址（網路卡識別碼）。

```python
import uuid

# 取得 MAC 地址（整數）
mac_int = uuid.getnode()
print(mac_int)  # 123456789012（某個大整數）

# 轉成標準 MAC 格式
mac_hex = uuid.UUID(int=uuid.getnode()).hex[-12:]
print(mac_hex)  # "1a2b3c4d5e6f"

# 加上冒號分隔符
mac_formatted = ":".join(mac_hex[i:i+2] for i in range(0, 12, 2))
print(mac_formatted)  # "1a:2b:3c:4d:5e:6f"
```

### 完整函式

```python
import uuid

def get_mac_address():
    """取得電腦的 MAC 地址"""
    mac_hex = uuid.UUID(int=uuid.getnode()).hex[-12:]
    return ":".join(mac_hex[i:i+2] for i in range(0, 12, 2))

print(get_mac_address())  # "1a:2b:3c:4d:5e:6f"
```

### 注意事項

| 問題 | 說明 |
|------|------|
| 可能是虛擬 MAC | VM 或 Docker 可能回傳虛擬網卡的 MAC |
| 多網卡情況 | 可能回傳任意一張網卡的 MAC |
| 更精確方案 | 使用 `getmac` 套件 |

```python
# 使用 getmac 套件（更精確）
# pip install getmac
from getmac import get_mac_address

mac = get_mac_address()
print(mac)  # "1a:2b:3c:4d:5e:6f"
```

---

## UUID 屬性

```python
import uuid

my_uuid = uuid.uuid4()

print(my_uuid.hex)      # 無橫線字串 "550e8400e29b41d4a716446655440000"
print(my_uuid.int)      # 整數表示
print(my_uuid.bytes)    # 16 bytes
print(my_uuid.version)  # 版本號（4）
print(my_uuid.variant)  # 變體
```

---

## 實際應用場景

| 場景 | 用法 |
|------|------|
| 資料庫主鍵 | `id = str(uuid.uuid4())` |
| 檔案名稱 | `f"{uuid.uuid4()}.jpg"` |
| API Token | `token = uuid.uuid4().hex` |
| 追蹤 Request | `request_id = str(uuid.uuid4())` |

---

## 快速總結

| 問題 | 答案 |
|------|------|
| UUID 是什麼？ | 通用唯一識別碼，不會重複的 ID |
| 最常用哪個版本？ | `uuid.uuid4()`（隨機產生） |
| 怎麼轉字串？ | `str(uuid.uuid4())` |
| 怎麼取 MAC 地址？ | `uuid.getnode()` |
| 資料庫怎麼用？ | `default_factory=lambda: str(uuid.uuid4())` |

```python
import uuid

# 最常用的寫法
id = str(uuid.uuid4())  # "550e8400-e29b-41d4-a716-446655440000"
```
