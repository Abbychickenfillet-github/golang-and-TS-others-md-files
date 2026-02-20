# Lambda 匿名函數

## 什麼是 Lambda？

**Lambda** 是一種**匿名函數（Anonymous Function）**，意思是「沒有名字的函數」。它可以在一行內定義簡單的函數邏輯。

```python
# 一般函數
def add_one(x):
    return x + 1

# Lambda 函數（做同樣的事）
add_one = lambda x: x + 1
```

---

## Lambda 語法拆解

```python
lambda v: v.isoformat()
   │   │  │     │
   │   │  │     └── 呼叫 v 的 isoformat() 方法
   │   │  └──────── 這是函數的回傳值（不需要寫 return）
   │   └─────────── 參數名稱（可以是任何名字）
   └─────────────── lambda 關鍵字，表示這是匿名函數
```

等同於：

```python
def 匿名函數(v):
    return v.isoformat()
```

---

## Lambda 不是 Python 特有的！

Lambda/匿名函數是**很多程式語言都有的概念**，只是語法不同：

| 語言 | Lambda 語法 | 範例 |
|------|-------------|------|
| **Python** | `lambda x: x + 1` | `lambda x: x * 2` |
| **JavaScript** | `(x) => x + 1` | `(x) => x * 2` |
| **TypeScript** | `(x: number) => x + 1` | `(x: number) => x * 2` |
| **Java** | `x -> x + 1` | `x -> x * 2` |
| **C#** | `x => x + 1` | `x => x * 2` |
| **Go** | `func(x int) int { return x + 1 }` | 較冗長 |

**JavaScript/TypeScript 中叫做「箭頭函數（Arrow Function）」**，本質上是同一個概念！

```javascript
// JavaScript 箭頭函數
const addOne = (x) => x + 1;

// Python Lambda
add_one = lambda x: x + 1
```

---

## 為什麼用 Lambda？

### 1. 簡潔：一行搞定

```python
# 不用 lambda - 需要 3 行
def to_iso(v):
    return v.isoformat()

json_encoders = {datetime: to_iso}

# 用 lambda - 只要 1 行
json_encoders = {datetime: lambda v: v.isoformat()}
```

### 2. 用完即丟：不需要命名

當函數只用一次時，不需要特別取名字：

```python
# 排序時用 lambda
students = [{"name": "Alice", "score": 85}, {"name": "Bob", "score": 90}]
students.sort(key=lambda x: x["score"])  # 按分數排序
```

### 3. 作為參數傳遞

```python
# map() 需要一個函數作為參數
numbers = [1, 2, 3, 4]
doubled = list(map(lambda x: x * 2, numbers))  # [2, 4, 6, 8]
```

---

## 專案中的實際範例

### json_encoders 中的 Lambda

```python
# backend/app/models/order.py
class Config:
    json_encoders = {
        datetime: lambda v: v.isoformat(),  # datetime → ISO 格式字串
        #            │   │  │
        #            │   │  └── 回傳值
        #            │   └───── 參數
        #            └───────── lambda 關鍵字

        uuid.UUID: str,  # 這裡直接用 str 函數，不需要 lambda
        Decimal: str,
    }
```

**為什麼 datetime 用 lambda，但 UUID 直接用 str？**

```python
# datetime 需要呼叫方法
datetime(2024, 1, 15).isoformat()  # "2024-01-15T00:00:00"
# 需要 lambda v: v.isoformat() 來呼叫方法

# UUID 直接用 str() 就可以
str(UUID("550e8400..."))  # "550e8400..."
# 不需要 lambda，直接寫 str 即可
```

---

## Lambda 的限制

Lambda 只能寫**一行表達式**，不能寫：
- 多行程式碼
- if-else 語句塊（但可以用三元運算子）
- 迴圈

```python
# ✅ 可以：三元運算子
lambda x: "正數" if x > 0 else "非正數"

# ❌ 不行：多行程式碼
lambda x:
    if x > 0:
        return "正數"
    else:
        return "非正數"
```

如果邏輯複雜，就該用一般函數：

```python
def check_number(x):
    if x > 0:
        return "正數"
    elif x < 0:
        return "負數"
    else:
        return "零"
```

---

## 總結

| 概念 | 說明 |
|------|------|
| Lambda | 匿名函數，沒有名字的函數 |
| 語法 | `lambda 參數: 回傳值` |
| 是否 Python 特有 | **不是！** 很多語言都有（JS 叫箭頭函數） |
| 何時使用 | 簡單邏輯、用完即丟、作為參數傳遞 |
| 限制 | 只能一行，不能寫複雜邏輯 |
