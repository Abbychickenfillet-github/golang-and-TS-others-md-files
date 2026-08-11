---
title: "2025-12-31-http-header-chinese-encoding"
---

# HTTP Header 中文編碼問題

**日期：2025-12-31**

## 遇到的問題

匯出 Excel 時，檔名包含中文（如「廠商支付_亞洲香水節.xlsx」），結果報錯：

```
UnicodeEncodeError: 'latin-1' codec can't encode characters in position 36-40: ordinal not in range(256)
```

---

## Latin-1 是什麼？為什麼不支援中文？

### Latin-1 (ISO-8859-1) 簡介

Latin-1 是一種**單字節編碼**，只能表示 256 個字元（0-255）。

| 範圍 | 內容 |
|------|------|
| 0-127 | ASCII（英文、數字、標點）|
| 128-255 | 西歐語言特殊字元 |

### Latin-1 支援的字元範例

```
✅ 支援：A-Z, a-z, 0-9, !@#$%
✅ 支援：é, ñ, ü, ß, ø, å （西歐語言）
✅ 支援：£, €, ©, ® （符號）

❌ 不支援：中文（需要 2-4 bytes）
❌ 不支援：日文、韓文
❌ 不支援：俄文、希臘文
❌ 不支援：emoji 😀
```

### 為什麼 HTTP Header 用 Latin-1？

HTTP/1.1 規範（RFC 2616）規定 Header 值只能用 ISO-8859-1（Latin-1）編碼。
這是 1999 年的規範，當時國際化需求不高。

```python
# 這會爆炸，因為「廠商」超出 Latin-1 範圍
headers = {"Content-Disposition": "attachment; filename=廠商支付.xlsx"}
```

---

## RFC 5987 是什麼？

RFC 5987 是 2010 年發布的標準，專門解決 HTTP Header 的非 ASCII 字元問題。

### 格式說明

```
filename*=編碼格式'語言標籤'URL編碼的檔名
```

| 部分 | 說明 | 範例 |
|------|------|------|
| `filename*` | 表示使用擴展格式（注意星號 `*`）|  |
| `UTF-8` | 編碼格式 | UTF-8 |
| `''` | 語言標籤（可選，通常留空）| 空 |
| `URL編碼` | 把中文轉成 %XX 格式 | %E5%BB%A0%E5%95%86 |

### 實際範例

```python
from urllib.parse import quote

filename = "廠商支付_亞洲香水節.xlsx"
encoded = quote(filename, safe="")
# encoded = "%E5%BB%A0%E5%95%86%E6%94%AF%E4%BB%98_%E4%BA%9E%E6%B4%B2%E9%A6%99%E6%B0%B4%E7%AF%80.xlsx"

# 最終 Header
headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"
}
```

### URL 編碼對照表

| 中文 | UTF-8 Bytes | URL 編碼 |
|------|-------------|----------|
| 廠 | E5 BB A0 | %E5%BB%A0 |
| 商 | E5 95 86 | %E5%95%86 |
| 支 | E6 94 AF | %E6%94%AF |
| 付 | E4 BB 98 | %E4%BB%98 |

---

## UTF-8 和 RFC 5987 如何搭配？

```
1. 中文 "廠商"
      ↓
2. UTF-8 編碼：E5 BB A0 E5 95 86（6 bytes）
      ↓
3. URL 編碼：%E5%BB%A0%E5%95%86（純 ASCII）
      ↓
4. 放入 Header：filename*=UTF-8''%E5%BB%A0%E5%95%86
      ↓
5. 瀏覽器收到後，知道是 UTF-8 編碼，自動解碼還原
      ↓
6. 下載時顯示：廠商
```

### 為什麼這樣可以？

URL 編碼後的結果（如 `%E5%BB%A0`）全部都是 ASCII 字元：
- `%` = 37
- `E` = 69
- `5` = 53
- ...

全部都在 Latin-1 範圍內（0-255），所以不會報錯！

---

## 程式碼修正

```python
# 修正前（會爆炸）
return StreamingResponse(
    excel_file,
    headers={"Content-Disposition": f"attachment; filename={filename}"},
)

# 修正後（正確）
from urllib.parse import quote

encoded_filename = quote(filename, safe="")
return StreamingResponse(
    excel_file,
    headers={
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
    },
)
```

---

## 瀏覽器支援度

| 瀏覽器 | 支援 RFC 5987 |
|--------|---------------|
| Chrome | ✅ 支援 |
| Firefox | ✅ 支援 |
| Safari | ✅ 支援 |
| Edge | ✅ 支援 |
| IE 11 | ⚠️ 部分支援 |

現代瀏覽器都完整支援，可以放心使用。

---

## 相關檔案
- `backend/app/api/routes/vendor_payment_methods.py`
