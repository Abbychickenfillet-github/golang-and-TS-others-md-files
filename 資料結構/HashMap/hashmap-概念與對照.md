# HashMap（雜湊表）— JavaScript 與 Python 對照

## 一句話

**HashMap = 用 Key 快速查 Value 的資料結構。**  
Java 有 `HashMap` 類別；**JavaScript 沒有同名內建類別**，但 **`Map` / `{}`** 就是；**Python 的 `dict`** 就是。

---

## JavaScript 有 HashMap 嗎？

| 寫法 | 是 HashMap 嗎？ | 說明 |
|------|----------------|------|
| `new Map()` | ✅ 最接近 Java HashMap | Key 可以是任意型別；有 `.size`、迭代順序依插入 |
| `{ key: value }` | ✅ 常用、語意像 dict | 物件；Key 實際上多是字串或 Symbol |
| `WeakMap` | 特殊用途 | Key 只能是物件；弱參考，不適合一般練習 |
| `HashMap` 類別 | ❌ 標準語言沒有 | 要自己實作或靠函式庫 |

```javascript
// Map — 面試、演算法題最常寫這個
const scores = new Map();
scores.set("alice", 100);
scores.get("alice"); // 100

// Object — 前端日常、JSON 友善
const user = { name: "Abby", age: 30 };
user.name; // "Abby"
```

**跟 Java HashMap 的差異（知道即可）**

- JS 引擎底層也有雜湊表，但你看不到 Bucket / 紅黑樹；那是 V8 等實作細節。
- `Map` 保證 Key 唯一；重複 `set` 同一 Key 會覆蓋 Value（跟 Java 一樣）。
- 一般 `{}` 的 Key 會被轉成字串（例如 `obj[1]` 和 `obj["1"]` 是同一格）。

---

## Python：就是 `dict`

```python
scores = {"alice": 100, "bob": 85}
scores["alice"]      # 100
scores.get("carol")  # None（安全取值）
```

| 特性 | Python `dict` | Java `HashMap` |
|------|---------------|----------------|
| Key 唯一 | ✅ | ✅ |
| 平均查詢 | O(1) | O(1) |
| 插入順序 | Python 3.7+ 有保留 | `HashMap` 無序；`LinkedHashMap` 有序 |
| 碰撞處理 | 內建（開放定址等） | 陣列 + 鏈結串列 / 紅黑樹 |

---

## 內層結構（你貼的 Java 版）— 用白話對到日常 API

1. **算位置**：`hash(key) % 陣列長度` → 決定放哪個 Bucket  
2. **碰撞**：同一 Bucket 多個節點 → 串起來（鏈結串列）  
3. **太長**：串列變樹（Java 8+ 紅黑樹）→ 避免退化成 O(n)

練習時：**用 `dict` / `Map` 就好**；想理解原理可跑同資料夾的 `簡易HashMap實作-練習.py`。

---

## 本資料夾練習檔

| 檔案 | 執行方式 |
|------|----------|
| `javascript-map-練習.mjs` | `node javascript-map-練習.mjs` |
| `python-dict-練習.py` | `python python-dict-練習.py` |
| `簡易HashMap實作-練習.py` | `python 簡易HashMap實作-練習.py` |

建議順序：先跑 **Python dict** → **JS Map** → **簡易實作**（看碰撞怎麼串在同一個 bucket）。

---

## 相關筆記

- [[Dict&Tuple&Class]] — Python dict 入門
- [[dict-get方法]] — 安全取值 `.get()`
- [[JavaScript-字串方法]] — 前端語法資料夾
