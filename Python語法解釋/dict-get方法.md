# Python `dict.get()` 方法

## 一句話說明

`字典.get(鍵, 預設值)` 是 dict **內建的「安全取值」方法**:key 存在就回傳它的值,
**key 不存在也不會報錯**(回傳 `None` 或你指定的預設值)。

```python
args = {"command": "ls", "timeout": 30}

args.get("command")    # "ls"
args.get("file_path")  # None  ← 沒這個 key,也不會爆
```

> `.get()` 是 Python 內建的(dict 型別自帶),不用 import。
> `args` 只是個變數名(裝著一個 dict),`.get` 是 dict 本身的方法。

---

## 跟 `字典[鍵]` 的差別(重點!)

差別在「**key 不存在時會怎樣**」:

```python
args = {"command": "ls"}

args["file_path"]      # ❌ KeyError 直接爆掉
args.get("file_path")  # ✅ 回傳 None,安全
```

| 寫法 | key 存在 | key 不存在 |
|------|----------|-----------|
| `args["x"]` | 回傳值 | **KeyError 爆掉** |
| `args.get("x")` | 回傳值 | 回傳 `None` |
| `args.get("x", 預設)` | 回傳值 | 回傳「預設」 |

---

## 第二參數 = 找不到時的預設值

```python
config = {"theme": "dark"}

config.get("theme", "light")   # "dark"  ← 有就用有的
config.get("lang", "zh-TW")    # "zh-TW" ← 沒有就用預設
```

常用來「給一個 fallback」,不用先寫 `if "key" in dict` 判斷。

---

## 什麼時候用哪個?

- **確定 key 一定存在**(例如自己剛建的、必填欄位)→ 用 `args["key"]`(取不到代表有 bug,讓它爆比較好抓)
- **key 可能不存在**(外部資料、選填欄位)→ 用 `args.get("key")`(安全,不中斷程式)

---

## 本專案範例(claude_log.py 的 summarize_tool)

不同工具的參數 dict 欄位都不一樣(有的有 `command`、有的有 `pattern`),
所以用 `.get()` 取,就算欄位不存在也不會讓整支腳本掛掉:

```python
if name == "Bash":
    return f"`Bash`: {first_line(args.get('command'))}"   # 沒有 command → None,安全
if name == "Grep":
    return f"`Grep`: {first_line(args.get('pattern'), 60)}"

# 巢狀也常見:先 get 外層,再 get 內層
content = obj.get("message", {}).get("content")
#         ↑ 沒有 message 就回傳空 dict {},接著再 .get 也不會爆
```

> 小技巧:`obj.get("message", {})` 把預設值設成空 dict `{}`,
> 這樣後面接著 `.get("content")` 也安全 —— 這在處理 JSON 資料時超常用。

---

## 快速總結

| 問題 | 答案 |
|------|------|
| `.get()` 是內建的嗎? | 是,dict 型別自帶的方法 |
| 它做什麼? | 從字典安全取值,key 不存在不報錯 |
| 跟 `dict[key]` 差在哪? | `[key]` 找不到會 KeyError;`.get()` 回傳 None |
| 怎麼給預設值? | 第二參數:`dict.get(key, 預設值)` |
| 何時用 `[key]`? | 確定 key 一定存在時(取不到代表有 bug) |
