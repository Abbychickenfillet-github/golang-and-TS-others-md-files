# Python 檔案操作（Command Line 中使用）

## 基本介紹

Python 可以在命令列中直接執行程式碼，用於複雜的文字替換（比 sed 更強大）。

## 與 sed 的比較

| 特性 | sed | Python |
|------|-----|--------|
| 適用場景 | 簡單替換 | 複雜多行替換 |
| 語法難度 | 較難記憶 | 較直覺 |
| 跨平台 | Linux/Mac 原生，Windows 需安裝 | 需安裝 Python |
| 正則表達式 | 支援 | 支援（更強大） |
| 多行處理 | 較麻煩 | 容易 |

## 命令列執行 Python

### 方式 1：單行命令（-c 參數）
```bash
python3 -c "print('Hello World')"
```

### 方式 2：多行命令（Here Document）
```bash
python3 << 'PYTHON_SCRIPT'
# Python 程式碼
print('Hello')
print('World')
PYTHON_SCRIPT
```

## 檔案讀寫語法

### 讀取檔案
```python
with open('檔案路徑', 'r', encoding='utf-8') as f:
    content = f.read()
```

#### 參數說明
| 參數 | 說明 |
|------|------|
| `'檔案路徑'` | 要開啟的檔案路徑 |
| `'r'` | 讀取模式（read），只能讀不能寫 |
| `encoding='utf-8'` | 指定編碼為 UTF-8（支援中文） |
| `as f` | 將開啟的檔案物件命名為 `f` |
| `f.read()` | 讀取檔案全部內容，返回字串 |

### 寫入檔案
```python
with open('檔案路徑', 'w', encoding='utf-8') as f:
    f.write(content)
```

#### 參數說明
| 參數 | 說明 |
|------|------|
| `'w'` | 寫入模式（write），會覆蓋原檔案 |
| `f.write(content)` | 將字串寫入檔案 |

### 其他模式
| 模式 | 說明 |
|------|------|
| `'r'` | 讀取（預設） |
| `'w'` | 寫入（覆蓋） |
| `'a'` | 附加（不覆蓋，加在後面） |
| `'r+'` | 讀寫 |
| `'rb'` | 二進位讀取（圖片等） |
| `'wb'` | 二進位寫入 |

## with 語法的好處

使用 `with` 會自動關閉檔案，即使發生錯誤也會正確關閉：

```python
# 推薦寫法（自動關閉）
with open('file.txt', 'r') as f:
    content = f.read()
# 離開 with 區塊後，檔案自動關閉

# 傳統寫法（需手動關閉）
f = open('file.txt', 'r')
content = f.read()
f.close()  # 容易忘記
```

## 實際範例：讀取 → 替換 → 寫回

```python
# 1. 讀取檔案
with open('frontend/src/routes/_layout/booths.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 2. 字串替換（比 sed 更直覺）
old_text = 'w="100px"'
new_text = 'w="130px"'
content = content.replace(old_text, new_text)

# 3. 寫回檔案
with open('frontend/src/routes/_layout/booths.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
```

## 命令列完整範例

```bash
cd C:/coding/template && python3 << 'PYTHON_SCRIPT'
# 讀取檔案
with open('frontend/src/routes/_layout/booths.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 替換文字
content = content.replace('舊文字', '新文字')

# 寫回檔案
with open('frontend/src/routes/_layout/booths.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
PYTHON_SCRIPT
```

## 常見問題

### Q: 為什麼要用 `encoding='utf-8'`？
A: Windows 預設編碼不是 UTF-8，如果檔案有中文會出錯。

### Q: `'PYTHON_SCRIPT'` 加單引號是什麼意思？
A: 防止 shell 解析變數。如果用 `PYTHON_SCRIPT`（無引號），`$` 符號會被 shell 當成變數。

### Q: 什麼時候用 Python 而不是 sed？
A:
- 多行替換 → 用 Python
- 複雜邏輯（if/else）→ 用 Python
- 簡單單行替換 → 用 sed 更快
