# FastAPI 依賴注入和基礎概念說明

**日期**: 2025-11-20
**主題**: FastAPI 依賴注入、Session/Engine、JWT 認證、Annotated 語法

---

## 目錄

1. [deps.py 的作用](#1-depspy-的作用)
2. [Session(engine) 和 engine 的關係](#2-sessionengine-和-engine-的關係)
3. [Session 型別說明](#3-session-型別說明)
4. [CurrentUser 和 JWT 的關係](#4-currentuser-和-jwt-的關係)
5. [Annotated 語法說明](#5-annotated-語法說明)
6. [泛型語法說明](#6-泛型語法說明)
7. [程式碼重構：提取常數](#7-程式碼重構提取常數)

---

## 1. deps.py 的作用

### 問題
- `deps.py` 這一張資料表到底是幹嘛用的？
- `app/api/deps.py`：存放共用的依賴注入函數，還是聽不太懂

### 回答

**`deps.py` 不是資料表，而是一個「自動準備工具」的檔案。**

#### 給五歲小孩的解釋
想像你要玩玩具：
- 每次都要自己拿玩具箱 → 很麻煩
- 如果有一個「自動拿玩具箱的機器人」 → 你只要說「我要玩」，它就會把玩具箱拿給你

`deps.py` 就是這個「自動準備工具」的檔案：
- `SessionDep` = 自動準備「資料庫連線」（像自動拿玩具箱）
- `CurrentUser` = 自動準備「現在是誰在使用」（像自動知道你是誰）

#### 給國中生的解釋

`deps.py` 是一個「共用工具庫」，裡面放的是「自動準備常用東西的函數」。

**實際例子：**

想像你在寫很多個 API 函數，每個都需要：
1. 資料庫連線（用來查資料）
2. 知道現在是誰在使用（用來檢查權限）

如果每個函數都要自己寫這些程式碼，會：
- 重複寫很多次
- 改一個地方要改很多地方
- 容易出錯

**解決方法：依賴注入（Dependency Injection）**

`deps.py` 把這些「準備工作」寫成函數，然後 FastAPI 會自動幫你執行：

```python
# 在 deps.py 裡定義：
def get_db():  # 自動準備資料庫連線
    with Session(engine) as session:
        yield session

def get_current_user():  # 自動檢查誰在使用
    # 檢查 token、驗證身份...
    return user

# 在 API 函數裡，你只需要這樣寫：
def create_member_company(
    session: SessionDep,      # ← FastAPI 自動幫你準備好資料庫連線
    current_user: CurrentUser  # ← FastAPI 自動幫你準備好當前用戶
):
    # 直接用 session 和 current_user，不用自己準備！
    ...
```

**三個主要工具：**

1. **`SessionDep`（資料庫連線）**
   - 每次 API 被呼叫時，自動建立資料庫連線
   - 用完後自動關閉

2. **`CurrentUser`（當前用戶）**
   - 自動檢查 token
   - 自動找出是誰在使用
   - 如果沒登入或 token 無效，自動拒絕

3. **`get_current_active_superuser`（超級管理員檢查）**
   - 檢查是否為超級管理員
   - 不是就拒絕

**為什麼要這樣做？**
- ✅ 不用重複寫：每個 API 函數不用自己寫檢查登入的程式碼
- ✅ 統一管理：改檢查邏輯時，只改一個地方
- ✅ 自動執行：FastAPI 會在呼叫你的函數前，自動執行這些準備工作

**簡單總結：**
`deps.py` = 一個「自動準備工具」的檔案，讓你在寫 API 時不用每次都自己準備資料庫連線和檢查用戶身份，FastAPI 會自動幫你做好這些事。

---

## 2. Session(engine) 和 engine 的關係

### 問題
- `Session(engine) as session` 是什麼意思？
- 為什麼包住 engine？這個 engine 是什麼？

### 回答

#### 簡單比喻

想像資料庫是一個圖書館：
- `engine` = 圖書館的「總管理員」（知道圖書館在哪、怎麼連線）
- `Session(engine)` = 用總管理員建立一個「借書窗口」
- `as session` = 把這個窗口叫做 `session`
- `with ... as` = 自動管理：用完後自動關閉窗口

#### 詳細解釋

```python
# 在 app/core/db.py 裡：
engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
# ↑ 這行建立一個「資料庫連線引擎」
# engine 知道：資料庫在哪裡、帳號密碼、連線方式等

# 在 app/api/deps.py 裡：
def get_db():
    with Session(engine) as session:
        # ↑ 用 engine 建立一個「資料庫會話（Session）」
        # session 是實際用來查詢、新增、修改資料的工具
        yield session
        # ↑ 把 session 交給使用的人
        # 當函數結束時，with 會自動關閉 session（關閉連線）
```

#### 為什麼要包住 engine？

- `engine` 是「連線設定」，不是實際連線
- `Session(engine)` 用 engine 的設定建立實際連線
- 就像：engine = 電話號碼，Session = 實際撥電話

#### `with ... as` 的作用

```python
with Session(engine) as session:
    # 使用 session 查資料...
    pass
# 這裡自動執行：session.close() - 自動關閉連線
```

**好處：**
- ✅ 自動關閉連線（不會忘記關）
- ✅ 即使出錯也會關閉（安全）

---

## 3. Session 型別說明

### 問題
- `session` 型別又是什麼？

### 回答

**`Session` 是 SQLModel/SQLAlchemy 提供的一個類別（Class），用來管理資料庫連線和操作。**

#### 簡單比喻

想像資料庫是一個圖書館：
- `engine` = 圖書館的「總管理員」（知道圖書館在哪、怎麼連線）
- `Session` = 「借書窗口」的類型（定義了窗口應該有什麼功能）
- `session` = 實際建立的「借書窗口」物件（你可以用它來借書、還書）

#### 詳細解釋

```python
from sqlmodel import Session  # ← 從 SQLModel 導入 Session 類別

# Session 是一個類別，定義了：
# - 如何連線資料庫
# - 如何查詢資料
# - 如何新增、修改、刪除資料
# - 如何提交變更
# - 如何關閉連線

# 使用 Session：
def get_db():
    with Session(engine) as session:
        # ↑ Session(engine) 建立一個 Session 物件
        # session 是這個物件的實例（instance）
        yield session
```

#### Session 是什麼？

`Session` 是 SQLModel（基於 SQLAlchemy）提供的一個類別，用來：

1. **管理資料庫連線**
   ```python
   session = Session(engine)  # 建立連線
   ```

2. **執行查詢**
   ```python
   user = session.get(User, user_id)  # 查詢單筆資料
   users = session.exec(select(User)).all()  # 查詢多筆資料
   ```

3. **新增資料**
   ```python
   new_user = User(email="test@example.com")
   session.add(new_user)  # 加入新資料
   session.commit()  # 提交到資料庫
   ```

4. **修改資料**
   ```python
   user.email = "new@example.com"
   session.add(user)  # 標記為修改
   session.commit()  # 提交變更
   ```

5. **刪除資料**
   ```python
   session.delete(user)  # 標記為刪除
   session.commit()  # 提交變更
   ```

#### 型別提示的作用

```python
def create_user(session: Session, user_data: dict):
    # ↑ session: Session 表示：
    #   「這個參數必須是 Session 類別的實例」
    #   這樣 IDE 和型別檢查工具就知道 session 有什麼方法可以用
    pass
```

**好處：**
- ✅ IDE 自動完成：輸入 `session.` 時會顯示可用方法
- ✅ 型別檢查：如果傳錯型別，會提前發現錯誤
- ✅ 程式碼可讀性：一看就知道需要什麼型別的參數

#### Session vs session

```python
Session  # ← 這是「類別」（Class），定義了 Session 應該有什麼功能
session  # ← 這是「物件」（Object/Instance），是 Session 類別的實際實例

# 就像：
list     # ← 這是「類別」，定義了列表應該有什麼功能
my_list  # ← 這是「物件」，是 list 類別的實際實例

my_list = list([1, 2, 3])  # 用 list 類別建立一個列表物件
session = Session(engine)   # 用 Session 類別建立一個 session 物件
```

#### 簡單總結

- `Session` = 一個類別，定義了如何操作資料庫
- `session` = Session 類別的實例，實際用來操作資料庫的物件
- `session: Session` = 型別提示，告訴 Python「這個變數是 Session 型別」

---

## 4. CurrentUser 和 JWT 的關係

### 問題
- `CurrentUser` = 自動準備「現在是誰在使用」（像自動知道你是誰）這個是指前端的類似 JWT 嗎？

### 回答

**是的，`CurrentUser` 就是從 JWT token 解析出來的。**

#### 流程圖

```
前端 (Frontend)
  ↓ 發送請求時帶上 JWT token
  ↓ (在 HTTP Header: Authorization: Bearer <token>)
後端 API (Backend)
  ↓ FastAPI 自動呼叫 get_current_user()
  ↓ 從 token 解析出用戶 ID
  ↓ 用 session 從資料庫查詢用戶資料
  ↓ 返回 User 物件
你的 API 函數
  ↓ 收到 current_user 參數
  ↓ 可以直接用 current_user.id, current_user.email 等
```

#### 程式碼流程

```python
# 1. 前端發送請求時，會在 Header 帶上：
#    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. FastAPI 看到你的函數有 current_user: CurrentUser
#    自動呼叫 get_current_user()：

def get_current_user(session: SessionDep, token: TokenDep) -> User:
    # token 是從 Header 自動提取的 JWT token
    payload = jwt.decode(token, settings.SECRET_KEY, ...)
    # ↑ 解碼 JWT token，得到用戶 ID 等資訊

    token_data = TokenPayload(**payload)
    # ↑ 把解碼結果轉成 TokenPayload 物件

    user = session.get(User, token_data.sub)
    # ↑ 用用戶 ID (token_data.sub) 從資料庫查詢用戶資料

    return user  # ← 返回完整的 User 物件

# 3. 你的 API 函數收到 current_user：
def create_member_company(
    current_user: CurrentUser  # ← 這裡已經是一個完整的 User 物件了！
):
    print(current_user.id)      # 可以直接用
    print(current_user.email)   # 可以直接用
    print(current_user.is_superuser)  # 可以直接用
```

#### 重點

- ✅ JWT token 是前端帶來的（登入時後端發給前端）
- ✅ `get_current_user()` 負責：
  1. 從 Header 提取 token
  2. 解碼 token（驗證是否有效）
  3. 從資料庫查詢用戶資料
  4. 返回 User 物件
- ✅ `CurrentUser` 是 FastAPI 的依賴注入，自動執行上述流程
- ✅ 你的 API 函數直接收到 `User` 物件，不用自己處理 token

#### 簡單總結

```
前端 JWT Token → FastAPI 自動提取 → get_current_user() 解碼並查詢 →
返回 User 物件 → 你的函數收到 current_user
```

所以 `CurrentUser` 不是 JWT，而是「從 JWT 解析出來的用戶資料物件」。

---

## 5. Annotated 語法說明

### 問題
- `Annotated[Session, Depends(get_db)]` 是什麼？
- 為什麼有中括號？

### 回答

#### 中括號 `[]` 是什麼？

這是 Python 的**泛型（Generic）**語法，用來指定型別參數。

```python
# 就像這樣：
list[int]        # 表示「整數的列表」
dict[str, int]   # 表示「鍵是字串，值是整數的字典」
Annotated[Session, Depends(get_db)]  # 表示「Session 型別，但帶有額外資訊」
```

#### `Annotated` 是什麼？

`Annotated` 是 Python 3.9+ 的型別提示功能，用來「在型別上附加額外資訊」。

```python
Annotated[實際型別, 額外資訊1, 額外資訊2, ...]
```

#### 拆解 `Annotated[Session, Depends(get_db)]`

```python
SessionDep = Annotated[Session, Depends(get_db)]
```

**意思是：**
- 實際型別是 `Session`（資料庫會話）
- 額外資訊是 `Depends(get_db)`（告訴 FastAPI：這個參數要透過 `get_db()` 函數自動準備）

#### 為什麼要這樣寫？

在 FastAPI 中，有兩種方式指定依賴注入：

**方式 1：舊寫法（Python 3.8 以前）**

```python
def my_api(session: Session = Depends(get_db)):
    # 每次都要寫 Depends(get_db)
    pass
```

**方式 2：新寫法（Python 3.9+，用 Annotated）**

```python
SessionDep = Annotated[Session, Depends(get_db)]

def my_api(session: SessionDep):
    # 只要寫 SessionDep，更簡潔！
    pass
```

#### 實際運作方式

```python
# 定義：
SessionDep = Annotated[Session, Depends(get_db)]
# ↑ 這是一個「型別別名」，告訴 Python 和 FastAPI：
#   「當你看到 SessionDep 時，它實際上是 Session 型別，
#    但 FastAPI 要自動呼叫 get_db() 來準備這個參數」

# 使用：
def create_member_company(session: SessionDep):
    # FastAPI 看到 SessionDep，會自動：
    # 1. 呼叫 get_db() 函數
    # 2. 把返回的 session 傳給這個參數
    # 3. 你的函數可以直接用 session 了！
    pass
```

#### 完整流程圖

```
你的函數定義：
def create_member_company(session: SessionDep):
    ...

FastAPI 看到 SessionDep：
  ↓
檢查 Annotated[Session, Depends(get_db)]
  ↓
發現有 Depends(get_db)
  ↓
自動執行：get_db()
  ↓
get_db() 返回 session
  ↓
把 session 傳給你的函數參數
  ↓
你的函數開始執行，session 已經準備好了！
```

#### 類比

想像你在餐廳點餐：

```python
# 舊方式：每次都要說「我要一份套餐，套餐包含主餐和飲料」
def order_meal(meal: Meal = Depends(get_meal), drink: Drink = Depends(get_drink)):
    pass

# 新方式：定義一個「套餐」型別
MealSet = Annotated[Meal, Depends(get_meal)]
DrinkSet = Annotated[Drink, Depends(get_drink)]

# 現在只要說「我要套餐」就好
def order_meal(meal: MealSet, drink: DrinkSet):
    pass
```

#### 重點總結

1. `[]` 是泛型語法，用來指定型別參數
2. `Annotated[型別, 額外資訊]` 在型別上附加額外資訊
3. `Depends(get_db)` 告訴 FastAPI 要自動呼叫 `get_db()` 來準備參數
4. `SessionDep` 是一個型別別名，讓程式碼更簡潔

#### 為什麼這樣設計？

- ✅ 更簡潔：不用每次都寫 `= Depends(...)`
- ✅ 更清楚：型別和依賴注入綁在一起
- ✅ 更現代：使用 Python 3.9+ 的新語法

所以 `Annotated[Session, Depends(get_db)]` 的意思是：「這是一個 `Session` 型別，但 FastAPI 要自動用 `get_db()` 來準備它」。

---

## 6. 泛型語法說明

### 問題
- 何謂泛型語法？

### 回答

**泛型（Generic）語法讓你可以定義「可以適用於多種型別的程式碼」，而不需要為每種型別都寫一次。**

#### 簡單比喻

想像你要做一個「盒子」：
- **沒有泛型**：需要為每種東西做不同的盒子（整數盒子、字串盒子、用戶盒子...）
- **有泛型**：做一個「通用盒子」，可以裝任何東西

```python
# 沒有泛型：每種型別都要寫一次
def get_int_box() -> int:
    return 1

def get_str_box() -> str:
    return "hello"

def get_user_box() -> User:
    return user

# 有泛型：一個函數適用所有型別
def get_box[T]() -> T:  # T 是「型別變數」，可以是任何型別
    ...
```

#### 中括號 `[]` 的作用

在 Python 中，中括號 `[]` 用來指定「型別參數」：

```python
# 基本型別
list[int]           # 表示「整數的列表」
list[str]           # 表示「字串的列表」
dict[str, int]      # 表示「鍵是字串，值是整數的字典」

# 泛型類別
Optional[int]       # 表示「可能是整數，也可能是 None」
Annotated[Session, Depends(get_db)]  # 表示「Session 型別，但帶有額外資訊」
```

#### 實際例子

**1. 列表的泛型**

```python
# 舊寫法（Python 3.8 以前）
from typing import List
numbers: List[int] = [1, 2, 3]  # 告訴 Python：這是整數的列表

# 新寫法（Python 3.9+）
numbers: list[int] = [1, 2, 3]  # 直接用內建的 list[int]
```

**2. 字典的泛型**

```python
# 鍵是字串，值是整數的字典
scores: dict[str, int] = {
    "Alice": 95,
    "Bob": 87
}
```

**3. 可選型別（Optional）**

```python
from typing import Optional

# 可能是整數，也可能是 None
age: Optional[int] = None
age = 25  # 也可以賦值為整數
```

**4. Annotated 的泛型**

```python
from typing import Annotated

# Session 型別，但帶有 Depends(get_db) 的額外資訊
SessionDep = Annotated[Session, Depends(get_db)]
# ↑ 這表示：
#   - 實際型別是 Session
#   - 但附帶了 Depends(get_db) 這個「元數據」
```

#### 為什麼需要泛型？

**沒有泛型的話：**

```python
# 每種型別都要寫一次
def get_first_int(items: list[int]) -> int:
    return items[0]

def get_first_str(items: list[str]) -> str:
    return items[0]

def get_first_user(items: list[User]) -> User:
    return items[0]
```

**有泛型的話：**

```python
# 一個函數適用所有型別
def get_first[T](items: list[T]) -> T:
    return items[0]

# 使用時自動推斷型別
numbers = [1, 2, 3]
first_number = get_first(numbers)  # Python 知道 T = int

names = ["Alice", "Bob"]
first_name = get_first(names)  # Python 知道 T = str
```

#### 泛型的優勢

1. **程式碼重用**：一個函數適用多種型別
2. **型別安全**：編譯時就能發現型別錯誤
3. **自動完成**：IDE 知道變數的型別，提供更好的自動完成
4. **文件清晰**：一看就知道函數接受什麼型別，返回什麼型別

#### 常見的泛型語法

```python
# 1. 列表
list[int]           # 整數列表
list[str]           # 字串列表
list[User]          # User 物件列表

# 2. 字典
dict[str, int]      # 鍵是字串，值是整數
dict[int, User]     # 鍵是整數，值是 User

# 3. 可選型別
Optional[int]       # int | None
Optional[str]       # str | None

# 4. 聯合型別（Python 3.10+）
int | str           # 可能是 int 或 str
User | None         # 可能是 User 或 None

# 5. Annotated（帶元數據的型別）
Annotated[Session, Depends(get_db)]
Annotated[str, Query(description="名稱")]
```

#### 簡單總結

- **泛型** = 可以適用於多種型別的程式碼
- **中括號 `[]`** = 用來指定型別參數
- **好處** = 程式碼重用、型別安全、更好的 IDE 支援

**類比：**
- 沒有泛型 = 每種東西都要做專用的盒子
- 有泛型 = 做一個通用盒子，可以裝任何東西，但標籤上會寫清楚裝的是什麼

---

## 7. 程式碼重構：提取常數

### 問題
- `description` 要用變數接住，請幫我定義不同的變數
- 還有 Ln 231, Col 53 的地方

### 實作

在 `backend/app/api/routes/member_companies.py` 中，將重複的 `description` 和 `detail` 字串提取為常數：

```python
# Query 參數描述常數
DESC_SKIP = "跳過的記錄數"
DESC_LIMIT = "限制返回的記錄數"
DESC_INCLUDE_DELETED = "是否包含已刪除的關聯"
DESC_STATUS = "啟用狀態"
DESC_ROLE = "新的角色"

# HTTP 錯誤訊息常數
MSG_RELATION_NOT_FOUND = "會員-公司關聯不存在"
MSG_RELATION_NOT_FOUND_OR_NOT_DELETED = "會員-公司關聯不存在或未被刪除"
```

**替換的位置：**
- 所有 `Query(..., description="跳過的記錄數")` → `Query(..., description=DESC_SKIP)`
- 所有 `Query(..., description="限制返回的記錄數")` → `Query(..., description=DESC_LIMIT)`
- 所有 `Query(..., description="是否包含已刪除的關聯")` → `Query(..., description=DESC_INCLUDE_DELETED)`
- 所有 `Query(..., description="啟用狀態")` → `Query(..., description=DESC_STATUS)`
- 所有 `Query(..., description="新的角色")` → `Query(..., description=DESC_ROLE)`
- 所有 `HTTPException(..., detail="會員-公司關聯不存在")` → `HTTPException(..., detail=MSG_RELATION_NOT_FOUND)`
- 所有 `HTTPException(..., detail="會員-公司關聯不存在或未被刪除")` → `HTTPException(..., detail=MSG_RELATION_NOT_FOUND_OR_NOT_DELETED)`

**好處：**
- ✅ 統一管理：所有描述文字集中在檔案開頭
- ✅ 易於維護：修改時只需改一個地方
- ✅ 避免拼寫錯誤：使用常數而非字串字面值

---

## 相關檔案

- `backend/app/api/deps.py` - 依賴注入定義
- `backend/app/core/db.py` - 資料庫引擎和連線設定
- `backend/app/api/routes/member_companies.py` - 會員公司關聯 API 路由

---

## 參考資料

- [FastAPI 依賴注入文件](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Python Annotated 型別提示](https://docs.python.org/3/library/typing.html#typing.Annotated)
- [SQLModel Session 文件](https://sqlmodel.tiangolo.com/tutorial/fastapi/sessions/)
