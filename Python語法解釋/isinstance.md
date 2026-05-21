# Python `isinstance()` 函式

## 一句話說明

`isinstance(物件, 型別)` 用來檢查「**這個物件是不是某個型別**」,
**回傳 `True` / `False`(布林值)** —— 注意:它**不是**回傳實例!

```python
isinstance("hello", str)   # True  → "hello" 是字串
isinstance(123, str)       # False → 123 不是字串
```

> 🔑 名字拆開看:**is + instance** = 「**是不是**(某型別的)**實例**?」
> 問句的答案當然是 **是/否(True/False)**,不是回傳一個實例。

---

## 基本語法

```python
isinstance(要檢查的物件, 型別)
```

| 寫法 | 回傳 | 意思 |
|------|------|------|
| `isinstance(5, int)` | `True` | 5 是整數 |
| `isinstance(5, str)` | `False` | 5 不是字串 |
| `isinstance([1,2], list)` | `True` | 是 list |
| `isinstance({}, dict)` | `True` | 是字典 |

---

## 它的作用是什麼?(為什麼需要它)

**在「處理之前,先確認型別對不對」**,避免對錯型別做了會出錯的操作。

```python
def show(x):
    if isinstance(x, list):
        print("這是清單,長度:", len(x))
    elif isinstance(x, str):
        print("這是字串:", x.upper())
    else:
        print("其他型別")

show([1, 2, 3])   # 這是清單,長度: 3
show("hi")        # 這是字串: HI
```

---

## 一次檢查多種型別

第二個參數可以放一個 **tuple**,代表「是其中任何一種就算 True」:

```python
isinstance(5, (int, float))     # True → 是 int 或 float 都可以
isinstance(5.0, (int, float))   # True
isinstance("5", (int, float))   # False
```

---

## `isinstance()` vs `type()`

兩個都能判型別,但 `isinstance()` 比較好,因為它**認得「繼承」**:

```python
class Animal: pass
class Dog(Animal): pass   # Dog 繼承 Animal

d = Dog()

isinstance(d, Animal)     # True  ✅ Dog 也算是一種 Animal
type(d) == Animal         # False ❌ type() 只認「剛好就是」Animal,不認子類別
```

| | `isinstance(d, Animal)` | `type(d) == Animal` |
|---|---|---|
| 子類別也算 | ✅ 算 | ❌ 不算 |
| 一般情況建議 | ✅ 用這個 | 少用 |

---

## 本專案範例(claude_log.py 的 extract_parts)

```python
def extract_parts(content):
    texts, tools = [], []
    if isinstance(content, str):        # content 是「純字串」嗎?
        texts.append(content)
    elif isinstance(content, list):     # content 是「陣列」嗎?
        for c in content:
            if not isinstance(c, dict):  # 這個元素不是 dict 就跳過
                continue
            ...
```

這裡用 `isinstance` 的原因:一則訊息的 `content` 有時是字串、有時是陣列,
**先判斷型別,才知道要用哪種方式處理**,不然對字串做 `for ... in` 跑出來的會是一個個字元,就錯了。

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `isinstance()` 回傳什麼? | `True` / `False`(布林值),**不是實例** |
| 它在做什麼? | 檢查「物件是不是某型別」 |
| 怎麼一次查多型別? | 第二參數放 tuple:`isinstance(x, (int, float))` |
| 跟 `type()` 差在哪? | `isinstance` 認子類別(繼承),`type() ==` 不認 |
| 名字怎麼記? | is + instance = 「是不是某型別的實例?」 |
