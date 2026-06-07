# `print()` 的三種字串拼接寫法

## 三種寫法總覽

```python
name = "Abby"
age = 27

# 1. f-string（推薦，Python 3.6+）
print(f"name: {name}, age: {age}")
# name: Abby, age: 27

# 2. 逗號分隔
print("name:", name, "age:", age)
# name: Abby age: 27

# 3. + 拼接
print("name: " + name + ", age: " + str(age))
# name: Abby, age: 27
```

## 重點對照表

| 寫法 | 接受的型別 | 自動加空格 | 推薦度 |
|------|-----------|-----------|--------|
| f-string `f"{a}{b}"` | 任何型別 | ❌ 不會 | ⭐⭐⭐ 最推薦 |
| 逗號 `print(a, b)` | 任何型別 | ✅ 會 | ⭐⭐ 快速 debug |
| `+` `print(a + b)` | 只能 str | ❌ 不會 | ⭐ 最容易炸 |

---

## 1. f-string（最推薦）

```python
name = "Abby"
age = 27

print(f"name: {name}, age: {age}")
```

- `f"..."` 開頭，字串內 `{變數}` 會自動替換
- **任何型別都能塞**，f-string 內部會自動 `str()`
- 可以塞運算式：`f"年齡 +1: {age + 1}"`
- 可以塞方法：`f"大寫: {name.upper()}"`
- 可以做格式化：`f"{age:03d}"` → `027`（補零到 3 位）

### 進階：格式化語法

```python
pi = 3.14159
print(f"{pi:.2f}")          # 3.14（小數 2 位）
print(f"{1234567:,}")       # 1,234,567（千分位）
print(f"{0.85:.0%}")        # 85%（百分比）
print(f"{name:>10}")        # 右對齊 10 格
print(f"{name:*^10}")       # 置中，用 * 填滿
```

---

## 2. 逗號分隔

```python
print("name:", name, "age:", age, "active:", True)
# name: Abby age: 27 active: True
```

### 重點：型別不限

逗號分隔的 `print` 可以塞**任何型別**，Python 會自動轉成字串：

```python
print("string:", "hello")
print("int:", 27)
print("bool:", True)
print("None:", None)
print("dict:", {"a": 1})
print("list:", [1, 2, 3])
# 全部都能印
```

### 自動加空格的原理

`print()` 預設用空格分隔每個參數，控制權在 `sep` 參數：

```python
print("a", "b", "c")            # a b c（預設空格）
print("a", "b", "c", sep="")    # abc（不加東西）
print("a", "b", "c", sep="-")   # a-b-c（用 - 分隔）
print("a", "b", "c", sep="\n")  # 每個一行
```

---

## 3. `+` 拼接（最容易炸）

```python
print("name: " + name + ", age: " + str(age))
```

### 為什麼必須 `str(age)`？

`+` 在 Python 是型別敏感的運算子，不會自動轉型：

```python
"a" + "b"      # ✅ 字串拼接 → "ab"
1 + 2          # ✅ 數字相加 → 3
[1] + [2]      # ✅ list 串接 → [1, 2]

"a" + 1        # ❌ TypeError: can only concatenate str (not "int") to str
```

Python 設計上「拒絕猜測」—— 不知道你要拼字串還是相加，乾脆報錯叫你明講。

### 必須手動轉型

```python
age = 27

# ❌ 直接 + 會炸
print("age: " + age)
# TypeError: can only concatenate str (not "int") to str

# ✅ 先 str() 再 +
print("age: " + str(age))

# ✅ 或者改用 f-string，根本不用 str()
print(f"age: {age}")
```

### 對照 JS（自動轉，常出 bug）

```javascript
"age: " + 27      // "age: 27"  ← 自動轉成字串
"5" + 3           // "53"        ← 數字被當字串
"5" - 3           // 2           ← 又當數字
```

JS 在 `+` 遇到任一邊是字串就全部轉字串，所以 `"5" + 3` 是 `"53"`，但 `"5" - 3` 又變成 `2`，混亂。Python 比較嚴格、坑少。

---

## 「字串」是指型別，不是「有沒有變數」

很容易誤解的點：

```python
name = "Abby"   # 變數，但裡面是 str
age = 27        # 變數，但裡面是 int
```

`+` 在乎的是**變數裡的型別**，不是「是不是變數」：

```python
# 兩個都是變數，但型別不同
print(name + " is " + age)       # ❌ 炸（age 是 int）
print(name + " is " + str(age))  # ✅ 把 age 轉成 str
```

---

## `print()` 的進階參數

```python
# end: 結尾要什麼（預設換行 \n）
print("no newline", end="")
print("same line")
# no newlinesame line

# sep: 參數之間用什麼分隔（預設空格）
print(2026, 5, 27, sep="-")
# 2026-5-27

# file: 印到哪（預設 stdout，可以改成檔案）
with open("log.txt", "w") as f:
    print("hello", file=f)
```

---

## 該選哪個？

- **一般用 f-string**：彈性最大、可讀性最好、不用 `str()`
- **快速 debug 用逗號**：懶得包 f-string，`print("x:", x, "y:", y)` 就解決
- **避免用 `+`**：必須手動轉型、容易炸、可讀性差

```python
# 同一件事的三種寫法
print(f"User {name} is {age} years old")        # 推薦
print("User", name, "is", age, "years old")     # OK
print("User " + name + " is " + str(age) + " years old")  # 不推薦
```

---

## 相關筆記

- [def 函式與型別註記](def函式與型別註記-helper-function.md) — f-string 在 `section()` 的用法
- [dict 中括號存取寫法](dict/中括號存取寫法.md)
