---
title: "Dict&Tuple&Class"
---

# Python Dict (字典)

## Dict 是什麼？

Dict 是 Python 的**內建資料型別 (built-in data type)**，用 key-value 形式儲存資料。

```python
# 基本用法
person = {
    "name": "Alice",
    "age": 25,
    "city": "Taipei"
}

print(person["name"])  # Alice
```

---

## 如何宣告 Dict？

Python 是**動態型別**，不需要事先宣告，直接賦值即可：

```python
# 直接建立 - 最常用
my_dict = {"name": "Alice", "age": 25}

# 空 dict
empty_dict = {}

# 用 dict() 建構
another_dict = dict(name="Alice", age=25)
```

### Type Hints（可選，只是提示）

```python
# 基本 type hint
my_dict: dict = {"name": "Alice"}

# 更精確的 type hint（指定 key 和 value 型別）
from typing import Dict
user: Dict[str, str] = {"name": "Alice", "city": "Taipei"}

# Python 3.9+ 可以直接寫
user: dict[str, str] = {"name": "Alice", "city": "Taipei"}
```

### 對比 JavaScript / TypeScript

| 語言 | 宣告方式 | 強制型別？ |
|------|----------|-----------|
| JavaScript | `let obj = {name: "Alice"}` | ❌ 動態 |
| TypeScript | `let obj: {name: string} = {name: "Alice"}` | ✅ 編譯檢查 |
| Python | `obj = {"name": "Alice"}` | ❌ 動態 |
| Python + hints | `obj: dict[str, str] = {"name": "Alice"}` | ❌ 只是提示 |

**重點：Python 的 type hints 不會報錯，只是給 IDE 和開發者看的提示。**

---

## 如何判斷型別？

```python
my_dict = {"name": "Alice"}

# 方法 1: type() - 查看型別
print(type(my_dict))              # <class 'dict'>

# 方法 2: isinstance() - 檢查是否為特定型別
print(isinstance(my_dict, dict))  # True
```

### Python 靠「值的形狀」判斷型別

```python
d = {"a": 1}        # { key: value } → dict
s = {1, 2, 3}       # { value } → set（沒有 key）
l = [1, 2, 3]       # [ ] → list
t = (1, 2, 3)       # ( ) → tuple
st = "hello"        # " " → str
n = 42              # 整數 → int
f = 3.14            # 小數 → float
```

### 快速記憶表

| 符號 | 型別 |
|------|------|
| `{ key: value }` | dict |
| `{ value }` | set |
| `[ ]` | list |
| `( )` | tuple |
| `" "` 或 `' '` | str |

---

## 🤔 疑問：大括號是 dict，可是物件也是大括號？

**答案：在 Python 裡，大括號 `{}` 就是 dict，沒有另外的「物件字面量」。**

```python
# Python - 大括號永遠是 dict
data = {"name": "Alice"}
print(type(data))  # <class 'dict'>

# 要建立「物件」必須先定義 class
class Person:
    def __init__(self, name):
        self.name = name

person = Person("Alice")
print(type(person))  # <class 'Person'>
```

**對比 JavaScript：**
```javascript
// JavaScript - 大括號是 object（本質上就是 dict）
const data = { name: "Alice" };
console.log(typeof data);  // "object"

// JS 的 object 同時扮演 dict 的角色，沒有分開
```

### 結論

| 語言 | `{ }` 是什麼 | 要物件怎麼辦 |
|------|-------------|-------------|
| JavaScript | object（同時也當 dict 用） | 直接 `{ }` |
| Python | dict（純資料） | 必須用 `class` |

**簡單說：Python 把「資料容器」和「物件」分得很清楚。**

---

## 物件 vs Dict vs 陣列 比較

| 特性 | Object/Class | Dict | Array/List |
|------|-------------|------|------------|
| 結構 | 有方法、有屬性、有繼承 | 純 key-value 儲存 | 有序集合，用 index 存取 |
| 適合場景 | 複雜邏輯 | 輕量、彈性高 | 同類型資料 |
| 存取方式 | `obj.name` | `dict["name"]` | `arr[0]` |

---

## Dict 有繼承嗎？

### Dict 實例之間：❌ 沒有繼承

```python
# ❌ Dict 不能這樣繼承
parent_dict = {"name": "Alice"}
child_dict = parent_dict  # 這只是引用 (reference)，不是繼承
```

### Dict 類別可以被繼承：✅

```python
# ✅ 你可以繼承 dict 類別來擴充功能
class MyDict(dict):
    def get_upper(self, key):
        return self[key].upper()

d = MyDict({"name": "alice"})
print(d.get_upper("name"))  # ALICE
```

---

## Object vs Dict 詳細比較

| 特性 | Object/Class | Dict |
|------|-------------|------|
| 實例繼承 | ✅ 子類別繼承父類別 | ❌ 沒有 |
| 類別可被繼承 | ✅ | ✅ (可以 `class X(dict)`) |
| 自訂方法 | ✅ | ❌ 只有內建方法 |
| 結構固定 | ✅ 定義好屬性 | ❌ 隨時加 key |
| 型別檢查 | ✅ 可用 type hints | ⚠️ 較難驗證 |

---

## 什麼時候用哪個？

**用 Dict：**
- 資料結構簡單
- key 不固定、動態變化
- 快速傳遞資料 (如 API response)

**用 Class：**
- 需要自訂方法
- 需要資料驗證
- 需要繼承
- 複雜業務邏輯

---

## Python 內建資料型別一覽

```
數值型別：int, float, complex
序列型別：str, list, tuple
映射型別：dict  ← 這個
集合型別：set, frozenset
布林型別：bool
二進位型別：bytes, bytearray, memoryview
```

---

## Tuple（元組）詳解

### Tuple 是什麼？

Tuple 是**不可變的有序集合**，用小括號 `()` 表示。

```python
# 建立 tuple
point = (10, 20)
person = ("Alice", 25, "Taipei")

# 存取元素（跟 list 一樣用 index）
print(point[0])   # 10
print(person[1])  # 25
```

---

### 小括號 `()` vs 中括號 `[]`：為什麼型別提示用中括號？

```python
# 建立 tuple（實際資料）→ 用小括號 ()
my_tuple = (1, 2, 3)

# 型別提示（Type Hint）→ 用中括號 []
def func() -> tuple[int, str]:
    return (1, "hello")
```

**這是兩種不同的語法！**

| 用途 | 語法 | 範例 |
|------|------|------|
| 建立 tuple 資料 | `()` 小括號 | `point = (10, 20)` |
| 型別提示 | `[]` 中括號 | `-> tuple[int, str]` |

中括號 `[]` 在型別提示中叫做 **泛型語法 (Generic)**，用來指定「裡面裝什麼型別」：

```python
list[int]           # 裝 int 的 list
dict[str, int]      # key 是 str，value 是 int 的 dict
tuple[int, str]     # 第一個是 int，第二個是 str 的 tuple
Optional[Order]     # Order 或 None
```

---

### 冒號 `:` 是什麼意思？

```python
def revoke_cancellation_request(
    self,
    session: Session,
    *,
    order_id: str,
    revoked_by: str,
) -> tuple[Order | None, str]:    # ← 這個冒號
    """函數的程式碼從這裡開始"""
    ...
```

**冒號 = 「接下來是程式碼區塊」**

Python 用冒號開始新的程式碼區塊：

```python
# 函數定義
def my_func():      # ← 冒號
    print("hello")  # ← 函數內容

# if 判斷
if x > 0:           # ← 冒號
    print("正數")   # ← if 區塊內容

# for 迴圈
for i in range(3):  # ← 冒號
    print(i)        # ← 迴圈內容

# class 定義
class Dog:          # ← 冒號
    def bark(self): # ← 冒號
        print("汪") # ← 方法內容
```

#### 完整函數簽名拆解

```python
def revoke_cancellation_request(
    self,                          # 類別方法的 self
    session: Session,              # 參數 session，型別是 Session
    *,                             # 之後的參數必須用 keyword 傳入
    order_id: str,                 # 參數 order_id，型別是 str
    revoked_by: str,               # 參數 revoked_by，型別是 str
) -> tuple[Order | None, str]:    # 回傳值型別
    """這是 docstring 說明"""      # ← 冒號後面就是函數內容
    ...
```

---

### Tuple vs List vs Dict 比較

| 特性 | Tuple | List | Dict |
|------|-------|------|------|
| 符號 | `( )` | `[ ]` | `{ key: value }` |
| 可變性 | ❌ 不可變 | ✅ 可變 | ✅ 可變 |
| 順序 | ✅ 有序 | ✅ 有序 | ✅ (Python 3.7+) |
| 存取方式 | `t[0]` | `l[0]` | `d["key"]` |
| 適合場景 | 固定結構回傳值 | 動態集合 | 鍵值對應 |
| 可當 dict 的 key | ✅ 可以 | ❌ 不行 | - |

```python
# 不可變的意思
my_tuple = (1, 2, 3)
my_tuple[0] = 10  # ❌ TypeError: tuple 不支援修改

my_list = [1, 2, 3]
my_list[0] = 10   # ✅ 可以修改，變成 [10, 2, 3]
```

---

### 解構（Destructuring）是什麼？

**解構 = 把集合裡的值「拆開」分別賦值給多個變數**

```python
# 傳統寫法（麻煩）
point = (10, 20)
x = point[0]  # 10
y = point[1]  # 20

# 解構寫法（簡潔）
point = (10, 20)
x, y = point  # x=10, y=20 ← 一行搞定！
```

#### 更多解構範例

```python
# 解構 tuple
name, age, city = ("Alice", 25, "Taipei")
print(name)  # Alice
print(age)   # 25

# 解構 list（也可以）
a, b, c = [1, 2, 3]

# 解構函數回傳值（最常見用法）
def get_user():
    return ("Alice", 25)

name, age = get_user()  # 直接拆開！

# 忽略不需要的值
name, _ = get_user()  # 用 _ 表示不需要這個值
```

#### 對比 JavaScript 的解構

```javascript
// JavaScript 解構
const point = [10, 20];
const [x, y] = point;  // 陣列解構用 []

const person = { name: "Alice", age: 25 };
const { name, age } = person;  // 物件解構用 {}
```

```python
# Python 解構
point = (10, 20)
x, y = point  # 不需要額外符號，直接寫

person = {"name": "Alice", "age": 25}
name, age = person.values()  # dict 要用 .values()
```

---

### Type Hint：`tuple[Order | None, str]` 是什麼意思？

這是 Python 的**型別提示**，讓我們拆解：

```python
def cancel_order(...) -> tuple[Order | None, str]:
```

#### 樹狀圖拆解

```
tuple[Order | None, str]
  │      │    │    │
  │      │    │    └── 第二個元素：字串（訊息）
  │      │    │
  │      │    └─────── | 是「或」的意思
  │      │
  │      └──────────── 第一個元素：Order 物件 或 None
  │
  └─────────────────── 回傳值是 tuple 型別
```

| 部分 | 意思 |
|------|------|
| `->` | 函數回傳值的型別 |
| `tuple[...]` | 回傳一個 tuple |
| `Order \| None` | 第一個元素是 Order 物件 **或** None |
| `str` | 第二個元素是字串 |
| `\|` | 「或」的意思（Python 3.10+ 語法） |

#### 白話文解釋

```python
def cancel_order(...) -> tuple[Order | None, str]:
    # 成功時回傳：(Order物件, "成功訊息")
    # 失敗時回傳：(None, "錯誤訊息")
```

這個函數**永遠回傳 2 個值**：
1. 第一個：Order 物件（成功）或 None（失敗）
2. 第二個：訊息字串

#### Order 是什麼？通常是 Model！

**Order 是 Model（資料模型）**，對應資料庫的 `order` 資料表。

```python
# backend/app/models/order.py
class Order(SQLModel, table=True):
    __tablename__ = "order"

    id: str
    order_number: str
    status: str
    payment_status: str
    total_amount: Decimal
    # ... 其他欄位
```

在這個專案中：
- `Order` = SQLModel 定義的資料模型
- 對應資料庫的 `order` 表
- 包含訂單的所有欄位（id, status, total_amount 等）

#### 舊版寫法對照

```python
# Python 3.10+ 新語法
def func() -> tuple[Order | None, str]: ...

# Python 3.9 以下要這樣寫
from typing import Tuple, Optional, Union
def func() -> Tuple[Optional[Order], str]: ...
# 或
def func() -> Tuple[Union[Order, None], str]: ...
```

---

### 實際案例：cancel_order 函數

```python
# 定義
def cancel_order(
    self,
    session: Session,
    *,
    order_id: str,
    cancelled_by: str,
) -> tuple[Order | None, str]:  # 回傳 (資料, 訊息)
    """取消訂單"""

    order = order_crud.get(session, order_id)
    if not order:
        return None, "訂單不存在"  # 失敗：(None, 錯誤訊息)

    if order.status == OrderStatus.CANCELLED.value:
        return None, "訂單已被取消"  # 失敗：(None, 錯誤訊息)

    # ... 處理邏輯 ...

    return order, "訂單已取消"  # 成功：(Order, 成功訊息)
```

```python
# 呼叫端（使用解構）
order, msg = order_service.cancel_order(
    session,
    order_id="xxx",
    cancelled_by="user123"
)

if order is None:
    # 失敗，msg 是錯誤訊息
    raise HTTPException(status_code=400, detail=msg)

# 成功，order 是 Order 物件，msg 是成功訊息
print(f"取消成功：{msg}")
return {"success": True, "order_id": order.id}
```

---

### 為什麼用 Tuple 而不是 Dict？

```python
# 方案 A：用 Tuple（推薦）
def cancel_order() -> tuple[Order | None, str]:
    return order, "訂單已取消"
    return None, "訂單不存在"

# 呼叫
order, msg = cancel_order()  # 簡潔！

# ---

# 方案 B：用 Dict
def cancel_order() -> dict:
    return {"order": order, "message": "訂單已取消"}
    return {"order": None, "message": "訂單不存在"}

# 呼叫
result = cancel_order()
order = result["order"]   # 麻煩
msg = result["message"]   # 還要記 key 名稱
```

**Tuple 優點：**
1. **固定數量** - 永遠 2 個值，不會多不會少
2. **順序明確** - 第一個是資料，第二個是訊息
3. **解構方便** - 一行搞定 `order, msg = func()`
4. **不可變** - 回傳後不會被意外修改
5. **效能較好** - Tuple 比 Dict 輕量

#### Tuple vs Dict 比較總結

| 比較項目 | Tuple | Dict |
|----------|-------|------|
| **取值方式** | `order, msg = func()` | `result["order"]` |
| **程式碼行數** | 1 行解構 | 需要多行 |
| **需要記住** | 順序（第1個、第2個） | key 名稱 |
| **可變性** | ❌ 不可變（安全） | ✅ 可變（可能被改） |
| **效能** | 較快、較輕量 | 較慢、較重 |
| **適合場景** | 固定數量的回傳值 | 動態/複雜結構 |

**結論：函數回傳固定數量的值時，用 Tuple！**

---

### 這是常見的錯誤處理模式

類似其他語言：

| 語言 | 錯誤處理方式 |
|------|-------------|
| **Python** | `value, error = func()` |
| **Go** | `value, err := someFunction()` |
| **Rust** | `Result<T, E>` |

```go
// Go 語言的類似模式
value, err := someFunction()
if err != nil {
    // 處理錯誤
}
```

```python
# Python 的類似模式
value, error_msg = some_function()
if value is None:
    # 處理錯誤
```
