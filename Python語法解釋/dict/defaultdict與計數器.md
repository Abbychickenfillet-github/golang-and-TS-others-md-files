# `defaultdict` 與計數器寫法

## 來源情境

`Abby-notes/資料結構/HashMap/python-dict-練習.py` section 3、4 兩段：

```python
# section 3: 用一般 dict 做計數器
def count_chars(text: str) -> dict[str, int]:
    freq: dict[str, int] = {}
    for ch in text:
        freq[ch] = freq.get(ch, 0) + 1
    return freq

print(count_chars("abba"))   # {'a': 2, 'b': 2}

# section 4: 用 defaultdict 省略 .get(ch, 0)
from collections import defaultdict

tags: defaultdict[str, list] = defaultdict(list)
tags["go"].append("redis")
tags["go"].append("docker")
tags["py"].append("fastapi")
print(dict(tags))   # {'go': ['redis', 'docker'], 'py': ['fastapi']}
```

---

## 1. 計數器原理：`freq.get(ch, 0) + 1`

逐行拆解 `count_chars("abba")`：

| 第幾輪 | `ch` | `freq.get(ch, 0)` | 計算後 | freq 狀態 |
|--------|------|-------------------|--------|----------|
| 1 | `'a'` | 0（不存在 → 預設） | 0 + 1 = 1 | `{'a': 1}` |
| 2 | `'b'` | 0（不存在 → 預設） | 0 + 1 = 1 | `{'a': 1, 'b': 1}` |
| 3 | `'b'` | 1（已存在） | 1 + 1 = 2 | `{'a': 1, 'b': 2}` |
| 4 | `'a'` | 1（已存在） | 1 + 1 = 2 | `{'a': 2, 'b': 2}` |

### 為什麼一定要 `.get(ch, 0)` 不能直接 `freq[ch] + 1`？

```python
# ❌ 直接讀 freq[ch] 在第一輪會炸
freq = {}
freq["a"] = freq["a"] + 1
# KeyError: 'a'   ← 還沒寫入，怎麼讀？

# ✅ .get(ch, 0) 不存在時回傳 0，安全
freq = {}
freq["a"] = freq.get("a", 0) + 1
# {'a': 1}
```

詳見 [dict.get() 方法](../dict-get方法.md)。

---

## 2. `defaultdict` 是什麼？

`collections.defaultdict` 是 Python 標準庫提供的「**有預設值的 dict**」，**讀取不存在的 key 不會炸，而是自動建立預設值**。

```python
from collections import defaultdict

# 一般 dict
d = {}
d["new"]              # ❌ KeyError: 'new'

# defaultdict
d = defaultdict(list)
d["new"]              # ✅ 自動回傳 []，並寫入 dict
print(d)              # defaultdict(<class 'list'>, {'new': []})
```

### 關鍵：括號裡傳的是「工廠函式」（factory）

`defaultdict(list)` 的 `list` 是**函式本身**（不是 `list()`），不存在的 key 出現時，defaultdict 會**呼叫**這個函式產出預設值。

| 寫法 | 預設值 | 適用場景 |
|------|--------|---------|
| `defaultdict(int)` | `0` | 計數器 |
| `defaultdict(list)` | `[]` | 分組（按 key 收集多筆） |
| `defaultdict(set)` | `set()` | 分組去重 |
| `defaultdict(dict)` | `{}` | 巢狀結構 |
| `defaultdict(lambda: "預設")` | `"預設"` | 自訂字串/常數 |
| `defaultdict(lambda: [0, 0])` | `[0, 0]` | 自訂複雜結構 |

注意：`defaultdict(int)` 跟 `defaultdict(int())` **完全不一樣**：

```python
defaultdict(int)       # ✅ 傳「函式 int」，每次呼叫產生新的 0
defaultdict(int())     # ❌ 傳「值 0」，TypeError（0 不是 callable）
```

---

## 3. 用 `defaultdict` 改寫計數器

### 三種計數器寫法對比

```python
text = "abba"

# 寫法 1: 一般 dict + .get()
freq = {}
for ch in text:
    freq[ch] = freq.get(ch, 0) + 1

# 寫法 2: defaultdict(int)
from collections import defaultdict
freq = defaultdict(int)
for ch in text:
    freq[ch] += 1            # 不存在就先變 0，再 += 1

# 寫法 3: collections.Counter（最直接）
from collections import Counter
freq = Counter(text)         # 一行解決
# Counter({'a': 2, 'b': 2})
```

`Counter` 是 `dict` 的子類，專門設計來計數，內建 `.most_common(n)` 等方法：

```python
from collections import Counter

freq = Counter("abracadabra")
print(freq)                  # Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})
print(freq.most_common(2))   # [('a', 5), ('b', 2)]
```

---

## 4. `defaultdict(list)` 用來「分組」

練習檔 section 4 的用法：

```python
tags = defaultdict(list)
tags["go"].append("redis")
tags["go"].append("docker")
tags["py"].append("fastapi")

print(dict(tags))
# {'go': ['redis', 'docker'], 'py': ['fastapi']}
```

如果不用 defaultdict，每次 append 前都要檢查 key 存不存在：

```python
# ❌ 沒用 defaultdict
tags = {}
if "go" not in tags:
    tags["go"] = []
tags["go"].append("redis")

if "go" not in tags:
    tags["go"] = []
tags["go"].append("docker")
# ... 每次都要重複寫
```

```python
# ✅ 用 defaultdict
tags = defaultdict(list)
tags["go"].append("redis")     # 不存在就先建 []，再 append
tags["go"].append("docker")
```

實際應用：把資料**按某個欄位分組**。

```python
# 假設一堆員工要按部門分組
employees = [
    {"name": "Alice", "dept": "eng"},
    {"name": "Bob", "dept": "design"},
    {"name": "Carol", "dept": "eng"},
]

groups = defaultdict(list)
for e in employees:
    groups[e["dept"]].append(e["name"])

print(dict(groups))
# {'eng': ['Alice', 'Carol'], 'design': ['Bob']}
```

---

## 5. 分類的「魔法」在哪？`for` 不分類，**key** 才分類

初學常見盲點：以為是 `for ch in text` 把東西分類了。其實 **`for` 只負責逐一取出，分類效果來自 dict 的「同 key 同位置」特性**。

### 先釐清：`for x in y` 是什麼

Python 的 `for x in y` 只做一件事：**把 `y` 裡的東西一個一個取出來、命名為 `x`**，沒有任何分類邏輯。

```python
for ch in "abba":
    print(ch)
# a
# b
# b
# a
# ← 純粹逐一取出，沒分類
```

對照其他語言：

| 語言 | 寫法 |
|------|------|
| Python | `for ch in text:` |
| JS | `for (const ch of text) {}` |
| Java | `for (char ch : text.toCharArray()) {}` |
| Go | `for _, ch := range text {}` |

都是同樣概念：**iterate（迭代）**。`for` 本身不做分組、不做累加，只是負責「走過每一筆」。

### 那分類是誰做的？dict 的「同 key 同位置」

關鍵在這一行：

```python
freq[ch] = freq.get(ch, 0) + 1
#    ↑
#  用 ch 當 key，同樣的 ch 永遠寫到同一個格子
```

用 `"abba"` 跑一次，看 dict 怎麼被「自動分類」：

```text
第 1 輪 ch='a' → 寫到「a 格」 → freq = {a:1}
第 2 輪 ch='b' → 寫到「b 格」 → freq = {a:1, b:1}
第 3 輪 ch='b' → 還是「b 格」 → freq = {a:1, b:2}  ← 累積
第 4 輪 ch='a' → 還是「a 格」 → freq = {a:2, b:2}  ← 累積
```

**同樣的 key 永遠落在同樣的格子，所以累積在一起**。這是 dict 的天性，不是 for 的功勞。

### 員工分組看得更清楚

```python
employees = [
    {"name": "Alice", "dept": "eng"},
    {"name": "Bob",   "dept": "design"},
    {"name": "Carol", "dept": "eng"},
]

groups = defaultdict(list)
for e in employees:
    groups[e["dept"]].append(e["name"])
#         ↑
#    用「部門」當 key → 按部門分類
```

如果改用 `e["name"]` 當 key：

```python
groups[e["name"]].append(e["dept"])
# {"Alice": ["eng"], "Bob": ["design"], "Carol": ["eng"]}
# ← 變成「按名字分類」，每人自己一組，無分組效果
```

**選什麼當 key，就會按什麼分類。** 這才是分類的真正槓桿。

### 物理比喻：分郵件

```text
信箱：
┌─────────┐  ┌─────────┐  ┌─────────┐
│  Alice  │  │   Bob   │  │  Carol  │
└─────────┘  └─────────┘  └─────────┘

for letter in 信件堆:
    信箱[letter.收件人].append(letter)
              ↑
        這就是 key
```

- 迴圈：負責「**一封一封拿**」
- dict key：負責「**這封丟哪個信箱**」
- 同收件人的信 → 進同一個信箱 → 自動分類

### 沒有 for 也能分類

證明 `for` 不是分類關鍵：

```python
groups = defaultdict(list)
groups["eng"].append("Alice")      # Alice → eng 箱
groups["design"].append("Bob")     # Bob   → design 箱
groups["eng"].append("Carol")      # Carol → eng 箱（跟 Alice 同箱）

print(dict(groups))
# {'eng': ['Alice', 'Carol'], 'design': ['Bob']}
```

完全沒寫 `for`，照樣分類完成。**`for` 只是省去手寫三次**，自動跑完整堆資料而已。

### 一句話總結

| 元素 | 角色 |
|------|------|
| `for x in y` | 逐一取出 `y` 裡的東西命名為 `x`（**不分類**） |
| dict 的 key | 決定「東西丟哪個籃子」 |
| 同 key 寫入 | 自動累積到同一個籃子（**分類效果在這**） |

**分類的本質：選一個欄位當 key，所有資料按那個欄位自動歸類。**

---

## 6. 注意：「讀取」也會建立 key

defaultdict 的副作用要小心 —— **光是讀取不存在的 key 也會把它寫進 dict**：

```python
d = defaultdict(list)
print(d["new"])     # 印出 []，但同時 d 變成 {"new": []}
print(d)            # defaultdict(<class 'list'>, {'new': []})
```

如果只是想「檢查存不存在」，不要用 `d[key]`，要用 `in`：

```python
# ❌ 會意外建立 key
if d["maybe_exist"]:
    ...

# ✅ 只檢查，不會建立
if "maybe_exist" in d:
    ...
```

---

## 7. 轉回一般 dict

`defaultdict` 印出來會有 `defaultdict(...)` 包裝，想去掉用 `dict()`：

```python
tags = defaultdict(list)
tags["go"].append("redis")

print(tags)        # defaultdict(<class 'list'>, {'go': ['redis']})
print(dict(tags))  # {'go': ['redis']}
```

轉成一般 dict 後就沒有「自動建立預設值」的功能了，讀不存在的 key 一樣會炸 KeyError。

---

## 8. 三種計數寫法的選擇

| 寫法 | 適用 | 缺點 |
|------|------|------|
| `dict + .get(k, 0)` | 簡單、不用 import | 程式碼略冗長 |
| `defaultdict(int)` | 計數 + 想用 dict 介面 | 副作用：讀也會建 key |
| `Counter` | 純粹做計數統計 | 不適合存非數字 value |

實務上 FutureSign 後端，如果要做「商品銷量排行」、「會員活動頻率統計」這類**統計類** dict，用 `Counter` 最快、語意最清楚。如果是「按部門分組成員」這類**分組類** dict，用 `defaultdict(list)`。其他情況 `.get(k, 預設)` 就夠用。

---

## 相關筆記

- [dict.get() 方法](../dict-get方法.md)
- [dict 中括號存取寫法](中括號存取寫法.md)
- [dict 刪除方法](刪除方法.md)
- [dict.items() 方法](items方法.md)
