# @ts-ignore

## 是什麼？

`@ts-ignore` 是 TypeScript 的特殊註解，用來告訴編譯器**忽略下一行的型別錯誤**。

## 語法

```typescript
// @ts-ignore
這一行的型別錯誤會被忽略
```

## 使用情境

### 1. 型別定義與實際使用不一致

```typescript
// form 的型別定義說 valid 是 boolean
type FormValues = {
  valid: boolean
}

// 但 Select 元件需要字串 "true" / "false"
// @ts-ignore - Select 需要字串值
valid: "true"
```

### 2. 第三方套件型別不完整

```typescript
// @ts-ignore - 套件缺少這個屬性的型別定義
someLibrary.undocumentedMethod()
```

### 3. 暫時繞過型別檢查

當你知道程式碼是正確的，但 TypeScript 無法推斷時。

## 注意事項

- 盡量少用，因為會失去型別安全保護
- 加上註解說明為什麼要忽略
- 更好的做法是修正型別定義，而不是忽略錯誤

## 相關指令

| 指令 | 作用 |
|------|------|
| `// @ts-ignore` | 忽略下一行錯誤 |
| `// @ts-expect-error` | 預期下一行有錯誤（如果沒錯誤反而會報錯） |
| `// @ts-nocheck` | 忽略整個檔案的型別檢查 |

## 實際案例（今天遇到的）

```typescript
// EditEventModal 中，valid 型別是 boolean
// 但 <Select> 的 value 需要字串 "true" / "false"

// @ts-ignore - Select 需要字串值
valid: event.valid !== false ? "true" : "false"
```

因為修改型別定義會影響太多地方，所以用 `@ts-ignore` 暫時繞過。
