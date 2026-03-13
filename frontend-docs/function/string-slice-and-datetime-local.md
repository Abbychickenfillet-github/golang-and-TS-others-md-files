# String.slice() 與 datetime-local 輸入框

## `.slice(0, 16)` 是什麼？

`String.prototype.slice(start, end)` 是 JS 內建字串方法，擷取從 `start` 到 `end`（不含）的子字串。

### 在 datetime-local 的用法

`<input type="datetime-local">` 只接受 `YYYY-MM-DDTHH:mm` 格式（剛好 16 個字元），不能有秒數、毫秒、時區。

但 API 回傳的 ISO8601 時間字串比較長：

```
"2026-04-11T09:00:00.000Z"    ← API 回傳（有秒、毫秒、時區）
 0123456789012345
                ↑ 第 16 個字元

.slice(0, 16) →

"2026-04-11T09:00"            ← datetime-local 要的格式
```

### 程式碼範例

```tsx
// 從 API 回傳的資料填入表單
const available_from = program.available_from
  ? program.available_from.slice(0, 16)  // "2026-04-11T09:00:00.000Z" → "2026-04-11T09:00"
  : ''

// 從表單送出到 API
const payload = {
  available_from: formData.available_from
    ? new Date(formData.available_from).toISOString()  // "2026-04-11T09:00" → "2026-04-11T01:00:00.000Z"（UTC）
    : null,
}
```

## `.slice()` vs 其他字串方法

| 方法 | 語法 | 說明 |
|------|------|------|
| `.slice(start, end)` | `"hello".slice(1, 3)` → `"el"` | 擷取子字串，支援負數索引 |
| `.substring(start, end)` | `"hello".substring(1, 3)` → `"el"` | 類似 slice，但不支援負數 |
| `.substr(start, length)` | `"hello".substr(1, 3)` → `"ell"` | 第二個參數是長度，已被 deprecated |

### 負數索引

```js
"hello".slice(-3)      // "llo" ← 從倒數第 3 個開始
"hello".slice(0, -1)   // "hell" ← 去掉最後 1 個字元
```

## 注意事項

- `datetime-local` 沒有時區概念，顯示的是瀏覽器本地時間
- `.toISOString()` 會轉成 UTC（比台灣時間少 8 小時）
- 後端收到 ISO8601 字串後用 `time.Parse(time.RFC3339, ...)` 解析
