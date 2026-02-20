# Python `if not` 語法解釋

## 基本概念

`if not` 是「如果不是」的意思，用來檢查條件是否為「假」（False）。

## 語法

```python
if not 條件:
    # 條件為 False 時執行
```

## 什麼值會被視為 False？

| 值 | 布林結果 | 說明 |
|----|----------|------|
| `False` | False | 布林值 False |
| `None` | False | 空值 |
| `0` | False | 數字零 |
| `""` | False | 空字串 |
| `[]` | False | 空列表 |
| `{}` | False | 空字典 |
| `()` | False | 空元組 |

其他所有值都被視為 `True`。

## 範例

### 範例 1：檢查變數是否為空
```python
name = ""

if not name:
    print("名字是空的")
else:
    print(f"名字是 {name}")

# 輸出：名字是空的
```

### 範例 2：檢查是否包含已刪除項目
```python
include_deleted = False

if not include_deleted:
    # 不包含已刪除 → 篩選掉已刪除的
    print("只顯示未刪除的資料")
else:
    # 包含已刪除 → 顯示全部
    print("顯示全部資料（含已刪除）")

# 輸出：只顯示未刪除的資料
```

### 範例 3：專案中的實際應用
```python
# 來自 order_electricity CRUD
def get_multi_with_filters(
    include_deleted: bool = False,  # 預設不包含已刪除
    payment_status: str | None = None,  # 預設不過濾付款狀態
):
    # 軟刪除篩選
    if not include_deleted:
        # include_deleted = False 時進入這裡
        # 表示「不包含已刪除」→ 只查詢 deleted_at 為 None 的記錄
        statement = statement.where(OrderElectricity.deleted_at.is_(None))

    # 付款狀態篩選
    if payment_status:
        # payment_status 有值時進入這裡
        # 表示「有指定付款狀態」→ 篩選該狀態
        statement = statement.where(Order.payment_status == payment_status)
```

## `if not` vs `if` 對照

```python
x = None

# 這兩個是相反的
if x:
    print("x 有值")  # x 為 True 時執行

if not x:
    print("x 沒有值")  # x 為 False 時執行
```

## 常見用法

### 1. 檢查空值
```python
if not user:
    raise Exception("用戶不存在")
```

### 2. 設定預設值
```python
if not name:
    name = "匿名"
```

### 3. 條件過濾
```python
if not include_deleted:
    # 不包含已刪除的
    query = query.where(deleted_at.is_(None))
```

## 注意事項

### `if not x` vs `if x is None`

```python
x = 0

if not x:
    print("這會執行，因為 0 被視為 False")

if x is None:
    print("這不會執行，因為 0 不是 None")
```

如果需要精確檢查 `None`，應該用 `if x is None`。
