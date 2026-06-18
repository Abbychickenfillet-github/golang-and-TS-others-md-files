# docstring 與 `__doc__` 是什麼？（從零講起）

> 接續筆記：[[三引號字串-vs-docstring]]。這篇專門把 docstring 跟 `__doc__` 講清楚。

## 一、先記一句話

- **docstring** = 寫在「模組 / 函式 / 類別」**最開頭**的一段字串，用來「說明這個東西在做什麼」。
- **`__doc__`** = Python 自動幫你把那段 docstring **存起來的地方**（一個屬性／變數）。

你「寫」docstring，Python 就「存」進 `__doc__`，之後 `help()`、IDE 滑鼠提示、文件工具都去 `__doc__` 讀。

---

## 二、什麼是 docstring？（document string，文件字串）

就是「給人看的說明文字」，但寫法很特別：**直接放一段字串在開頭，不用 `#`、不用指派給變數**。

```python
def add(a, b):
    """把兩個數字相加並回傳。"""   # ← 這就是 docstring（函式的第一行）
    return a + b
```

```python
class Dog:
    """代表一隻狗。"""            # ← class 的 docstring
    pass
```

```python
# 檔案最上面：
"""這個檔案負責處理使用者登入。"""   # ← module（整個檔）的 docstring
import os
```

**條件只有一個：它必須是該區塊的「第一個敘述」。** 位置對了就是 docstring，跟用幾個引號無關
（單引號 `"x"`、三引號 `"""x"""` 都可以，但習慣用三引號因為能跨多行）。

---

## 三、`__doc__` 是什麼？

`__doc__` 是 Python 給每個模組／函式／類別自動準備的一個**內建屬性**，
裡面就放著「你寫的那段 docstring」。前後各兩條底線的名字（`__xxx__`）叫
**dunder（double underscore）**，代表「Python 內部特殊用途」的東西。

直接印出來看看：

```python
def add(a, b):
    """把兩個數字相加並回傳。"""
    return a + b

print(add.__doc__)
# 把兩個數字相加並回傳。
```

如果**沒寫** docstring，`__doc__` 就是 `None`：

```python
def foo():
    return 1

print(foo.__doc__)   # None
```

---

## 四、docstring 有什麼用？（為什麼不直接用 `#` 註解就好）

| | `#` 註解 | docstring |
|---|----------|-----------|
| 存在哪 | 只存在原始碼，執行時消失 | 被存進 `__doc__`，程式跑起來還能讀 |
| 誰看得到 | 只有看原始碼的人 | `help()`、IDE 提示、`pydoc`、自動文件工具都讀得到 |
| 用途 | 解釋「某一行」在幹嘛 | 說明「這個函式/類別/檔」整體是做什麼、怎麼用 |

實際好處 1：`help()` 會直接秀出來

```python
help(add)
# Help on function add in module __main__:
#
# add(a, b)
#     把兩個數字相加並回傳。
```

實際好處 2：在 VS Code / PyCharm 把滑鼠移到 `add(` 上面，
跳出來的提示框內容就是來自 docstring。

---

## 五、回到你專案裡的例子

`scripts/ask.py` 最上面：

```python
"""Ask a question over the Abby-notes RAG corpus (retrieval + LLM generation).
...
"""
```

這段在**檔案最開頭、第一個敘述** → 它是**模組 docstring**，會進 `ask.py` 的 `__doc__`。

但是：

```python
SYSTEM_PROMPT = """你是 Abby 的個人筆記問答助理。..."""
```

這段**被指派給變數 `SYSTEM_PROMPT`** → **不是** docstring（只是普通多行字串），
不會進任何 `__doc__`，而是當成 prompt 文字拿去用。

```python
import ask                  # 假設能 import
print(ask.__doc__)          # 會印出最上面那段 "Ask a question over..."
print(ask.SYSTEM_PROMPT)    # 印出 prompt 文字，但它不是 docstring
```

---

## 六、三個位置的 docstring 怎麼取

```python
import mymodule

mymodule.__doc__            # 模組 docstring
mymodule.add.__doc__        # 函式 docstring
mymodule.Dog.__doc__        # 類別 docstring
```

---

## 七、一句話總結

**docstring 是「你寫在開頭的說明字串」，`__doc__` 是「Python 自動把它存起來的格子」。**
寫對位置（第一個敘述）→ Python 存進 `__doc__` → `help()` 和 IDE 就能秀給你看。
這就是它比 `#` 註解強的地方：**說明文字在程式執行時依然存在、可被讀取。**
