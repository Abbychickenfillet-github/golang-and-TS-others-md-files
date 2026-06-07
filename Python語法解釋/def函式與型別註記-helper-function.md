# `def` 函式定義、型別註記與 helper function 模式

## 來源情境

在 `Abby-notes/資料結構/HashMap/python-dict-練習.py` 看到這段：

```python
def section(title: str) -> None:
    print(f"\n=== {title} ===\n")


def main() -> None:
    section("1. 基本 CRUD")
    # ...
    section("2. 迭代與插入順序（3.7+ 保留插入順序）")
    # ...
    section("6. 跟 Java HashMap 對照表")
```

第一眼以為 `section` 沒用，其實它被呼叫了 6 次，每次印一條分隔線。這篇筆記拆解它的語法。

---

## 1. `def` 函式定義語法

Python 用 `def` 關鍵字定義函式，基本結構：

```python
def 函式名稱(參數1, 參數2):
    函式內容
    return 回傳值  # 可省略
```

| 部分 | 說明 |
|------|------|
| `def` | 關鍵字，宣告這是一個函式 |
| `函式名稱` | 命名慣例 `snake_case`（小寫底線） |
| `(...)` | 參數列表，沒參數就空括號 `()` |
| `:` | 結尾冒號**必須有**，宣告函式 body 開始 |
| 縮排 | body 一定要縮排（PEP 8 用 4 空格） |
| `return` | 沒寫就回傳 `None` |

### 對照 Java/Go

```java
// Java
public void section(String title) { ... }      // void = 沒回傳值
public String greet(String name) { return ... }
```

```go
// Go
func section(title string) { ... }
func greet(name string) string { return ... }
```

```python
# Python
def section(title): ...           # 沒寫型別也可以
def greet(name): return f"hi {name}"
```

Python 不寫型別也能跑（動態型別），但加上型別註記更好讀、IDE 也能幫你檢查。

---

## 2. 型別註記（Type Hints）

```python
def section(title: str) -> None:
    print(f"\n=== {title} ===\n")
```

### 參數型別：`參數名: 型別`

- `title: str` → `title` 應該是字串

### 回傳型別：`-> 型別`

- `-> None` → 這個函式不回傳值，只做 side effect（印東西、改資料庫等）
- `-> int` → 回傳整數
- `-> dict[str, int]` → 回傳 key 是 str、value 是 int 的字典

### 重點：Python 的型別註記只是「提示」

```python
def section(title: str) -> None:
    print(title)

section(123)  # ✅ 程式照跑，不會炸
```

Python **不會在執行期強制檢查型別**，這跟 Java、Go 不一樣。型別註記的用途是：

1. **IDE 自動補全**（VS Code、PyCharm 看到型別會幫你提示方法）
2. **靜態檢查工具**（mypy、pyright 在編譯前抓錯）
3. **可讀性**（看 signature 就知道怎麼用）

想真的執行期擋下來，要用 `pydantic` 或手動 `isinstance` 檢查。

### 常見型別寫法

```python
def func(
    name: str,                          # 字串
    age: int = 18,                      # 整數，預設值 18
    tags: list[str] = [],               # 字串 list（Python 3.9+）
    config: dict[str, int] | None = None,  # 字典或 None（Python 3.10+ 用 |）
) -> tuple[bool, str]:                  # 回傳 tuple
    return True, "ok"
```

舊版 Python（< 3.10）要從 `typing` import：

```python
from typing import Optional, List, Dict, Tuple

def func(name: Optional[str] = None) -> List[int]:
    ...
```

詳見 [typing-optional.md](typing-optional.md)。

---

## 3. f-string 字串格式化

```python
print(f"\n=== {title} ===\n")
```

- `f"..."` 開頭字串叫 **f-string**（formatted string literal，Python 3.6+）
- `{變數名}` 會被替換成變數的值
- `\n` 是換行符號

範例：

```python
name = "Abby"
age = 27
print(f"Hi {name}, you are {age} years old")
# 輸出：Hi Abby, you are 27 years old

# 也可以塞運算式
print(f"Next year: {age + 1}")
# 輸出：Next year: 28

# 也可以塞方法呼叫
print(f"Upper: {name.upper()}")
# 輸出：Upper: ABBY
```

對照舊寫法：

```python
# 舊：% 格式化
print("Hi %s, you are %d" % (name, age))

# 舊：.format()
print("Hi {}, you are {}".format(name, age))

# 新：f-string（推薦）
print(f"Hi {name}, you are {age}")
```

---

## 4. Helper Function 模式

`section()` 這種短小函式叫 **helper function（輔助函式）**，目的是把重複邏輯抽出來避免重複。

### 沒有 helper 的寫法（重複）

```python
def main():
    print("\n=== 1. 基本 CRUD ===\n")
    # ...

    print("\n=== 2. 迭代與插入順序 ===\n")
    # ...

    print("\n=== 3. 計數器 ===\n")
    # ...
```

問題：

- 6 個 section 就要寫 6 次 `print("\n=== ... ===\n")`
- 哪天想改格式（例如改成 `--- title ---`）要改 6 個地方

### 有 helper 的寫法（DRY）

```python
def section(title: str) -> None:
    print(f"\n=== {title} ===\n")

def main():
    section("1. 基本 CRUD")
    section("2. 迭代與插入順序")
    section("3. 計數器")
```

優點：

- 重複邏輯只寫一次
- 改格式只要改 `section` 一個地方
- `main()` 看起來像目錄，可讀性高

這叫 **DRY 原則**（Don't Repeat Yourself）。

---

## 5. 為什麼以為「section 沒用」

最容易誤解的兩個點：

### 誤解 1：以為函式定義 = 執行

```python
def section(title: str) -> None:
    print(f"\n=== {title} ===\n")
```

這段只是**定義函式**，沒有執行 `print`。要呼叫 `section("...")` 才會真的印。

### 誤解 2：沒實際跑檔案

光看 code 看不出輸出，要實際執行：

```bash
python python-dict-練習.py
```

才會看到：

```text

=== 1. 基本 CRUD ===

sku-001: {'name': '攤位 A', 'qty': 3}
sku-999 get: None
sku-999 get 預設: 無此商品
覆蓋後: {'name': '攤位 A（更新）', 'qty': 5}
刪除後 keys: ['sku-001']

=== 2. 迭代與插入順序（3.7+ 保留插入順序）===

  sku-001 → {'name': '攤位 A（更新）', 'qty': 5}

=== 3. 計數器（跟 JS Map 練習對照）===

abba: {'a': 2, 'b': 2}

...（以下省略）
```

---

## 6. `if __name__ == "__main__":` 是什麼

檔案最後這段：

```python
if __name__ == "__main__":
    main()
```

意思：「只有當這個檔案被直接執行（`python xxx.py`）時，才呼叫 `main()`」。

如果別人 `import` 這個檔案當模組用，不會自動執行 `main()`，避免污染。

詳見 [__init__.py解釋.md](__init__.py解釋.md)（雖然是講 `__init__.py`，但 `__name__` 變數的觀念類似）。

---

## TL;DR

| 語法 | 用途 |
|------|------|
| `def name(param):` | 定義函式 |
| `param: str` | 型別註記，告訴 IDE 和讀者參數應該是什麼型別（執行期不強制） |
| `-> None` | 回傳型別，`None` 表示不回傳值 |
| `f"... {var} ..."` | f-string，字串裡塞變數 |
| helper function | 把重複邏輯抽成短函式，遵循 DRY 原則 |

`section()` 在 `python-dict-練習.py` 裡就是個 helper function，每次呼叫印一條分隔線，讓輸出有目錄感。
