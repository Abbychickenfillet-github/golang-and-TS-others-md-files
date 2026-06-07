# dict.items() — 同時取出 key 和 value

## 用法

`inventory` 是一個 dict（字典），`.items()` 是 dict 的內建方法，回傳所有 **(key, value) 配對**，用來在 for 迴圈裡同時拿到 key 跟 value。

```python
inventory = {"A001": "蘋果", "B002": "香蕉"}

for sku, item in inventory.items():
    print(f"{sku}->{item}")
# 輸出：
# A001->蘋果
# B002->香蕉
```

每次迴圈會解包一個 tuple `(sku, item)`：

- `sku` ← key（例如 `"A001"`）
- `item` ← value（例如 `"蘋果"`）

## 對照其他兩個方法

| 方法 | 回傳 | 用途 |
|---|---|---|
| `inventory.keys()` | 只有 key | 只想要編號 |
| `inventory.values()` | 只有 value | 只想要內容 |
| `inventory.items()` | (key, value) tuple | 兩個都要 |

## 注意：回傳的是 view object（動態視圖）

`.items()` 回傳的不是 list，而是 **view object**。如果之後改了原本的 dict，這個 view 也會跟著變，不是當下複製一份。

```python
inventory = {"A001": "蘋果"}
view = inventory.items()

inventory["B002"] = "香蕉"
print(list(view))
# 輸出：[('A001', '蘋果'), ('B002', '香蕉')]  ← view 自動更新
```

如果需要快照（凍結當下狀態），用 `list(inventory.items())` 轉成 list。

## 常見搭配

### 用 dict comprehension 反轉 key/value

```python
inventory = {"A001": "蘋果", "B002": "香蕉"}
reversed_dict = {v: k for k, v in inventory.items()}
# {'蘋果': 'A001', '香蕉': 'B002'}
```

### 用 sorted() 排序

```python
# 按 key 排序
for sku, item in sorted(inventory.items()):
    print(f"{sku}->{item}")

# 按 value 排序
for sku, item in sorted(inventory.items(), key=lambda x: x[1]):
    print(f"{sku}->{item}")
```
