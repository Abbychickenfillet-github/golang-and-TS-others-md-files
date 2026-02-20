# sed - 文字流編輯器（Stream Editor）

## 基本介紹

`sed` 是 Linux/Unix 的命令列工具，用於對文字進行搜尋、替換、刪除等操作。

## 替換語法

```bash
sed 's/舊字串/新字串/' 檔案名
```

### 語法分解
  `sed -i 's/專區 - 固定寬度/專區 - 加寬不截斷/' 檔案.tsx`
| 部分 | 說明 |
|------|------|
| `s` | substitute（替換）指令 |
| `/` | 分隔符號（也可以用 `#` 或 `|`） |
| `舊字串` | 要找的文字（支援正則表達式） |
| `新字串` | 替換成的文字 |

## 常用參數
` sed 's/舊字串/新字串/'`

| 參數 | 說明 | 範例 |
|------|------|------|
| `-i` | in-place，直接修改原檔案 | `sed -i 's/a/b/' file.txt` |
| `-n` | 只輸出被處理的行 | `sed -n 's/a/b/p' file.txt` |
| `g` | global，替換所有匹配（加在最後） | `sed 's/a/b/g' file.txt` |

## 實際範例

### 1. 替換檔案中的文字
```bash
# 將 "100px" 替換為 "130px"
sed -i 's/w="100px"/w="130px"/' file.tsx
```

### 2. 替換多個檔案
```bash
# 替換所有 .tsx 檔案中的文字
sed -i 's/舊文字/新文字/g' *.tsx
```

### 3. 只顯示不實際修改（測試用）
```bash
# 移除 -i 參數，只輸出結果不修改檔案
sed 's/舊文字/新文字/' file.txt
```

### 4. 刪除特定文字
```bash
# 將 "isTruncated" 替換為空（等於刪除）
sed -i 's/isTruncated//' file.tsx
```

### 5. 使用不同的分隔符
```bash
# 當字串包含 / 時，用 # 或 | 當分隔符
sed -i 's#/old/path#/new/path#g' file.txt
```

## 注意事項

- Windows 上需要安裝 Git Bash 或 WSL 才能使用 sed
- `-i` 參數在 macOS 上需要加空字串：`sed -i '' 's/a/b/' file.txt`
- 正則表達式中的特殊字元需要跳脫：`. * [ ] ^ $ \`

---

# 相關前端知識

## isTruncated（Chakra UI）

### 用途
當文字超過容器寬度時，自動截斷並顯示省略號 `...`

### 語法
```tsx
<Text isTruncated>
  這是一段很長很長很長的文字會被截斷...
</Text>
```

### 效果對比

| 屬性 | 顯示效果 |
|------|----------|
| 無 isTruncated | `這是一段很長很長很長的文字會換行或溢出` |
| 有 isTruncated | `這是一段很長很長...` |

### 原理
`isTruncated` 會自動加上這些 CSS：
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

### 使用時機
- 表格欄位寬度固定，文字可能超長
- 卡片標題需要單行顯示
- 列表項目需要整齊對齊

### 移除 isTruncated
如果不想要省略號，想完整顯示文字，就把 `isTruncated` 移除：
```tsx
// 移除前（會截斷）
<Text isTruncated>{booth.area}</Text>

// 移除後（完整顯示）
<Text>{booth.area}</Text>
```
