# TypeScript 型別檢查：typeof vs @ts-expect-error

## 問題場景

```typescript
// 瀏覽器專案中使用 Node.js 的 Buffer
try {
    return btoa(str);        // 瀏覽器 API
} catch (err) {
    // @ts-expect-error Buffer may not exist in browser
    return Buffer.from(str).toString('base64');  // Node.js API
}
```

**問題**：`Buffer` 是 Node.js 全域物件，瀏覽器沒有，TypeScript 會報錯。

---

## 偷吃步做法（不推薦）

```typescript
// @ts-expect-error
return Buffer.from(str).toString('base64');
```

**缺點**：
- 繞過型別檢查，不安全
- 如果 Buffer 真的不存在，runtime 會爆炸
- 程式碼品質不好看

---

## 正確做法：使用 typeof 檢查

```typescript
export const base64 = (str: string): string => {
    // 瀏覽器環境：使用 btoa
    if (typeof btoa !== 'undefined') {
        try {
            return btoa(str);
        } catch {
            // btoa 不支援某些字元，fallback 到下面
        }
    }

    // Node.js 環境：使用 Buffer
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str).toString('base64');
    }

    // 都沒有就報錯
    throw new Error('No base64 encoding method available');
};
```

**優點**：
- 不需要 `@ts-expect-error`
- Runtime 安全，不會爆炸
- TypeScript 能正確推斷型別
- 程式碼邏輯清楚

---

## typeof 檢查的原理

```typescript
// typeof 檢查未定義的變數不會報錯
if (typeof Buffer !== 'undefined') {
    // TypeScript 知道這裡 Buffer 存在
    Buffer.from(str)  // OK，有型別提示
}

// 直接用會報錯
if (Buffer) {  // Error: Cannot find name 'Buffer'
    Buffer.from(str)
}
```

**關鍵**：`typeof` 可以安全檢查不存在的變數，不會拋出 ReferenceError。

---

## 其他常見 typeof 用法

```typescript
// 檢查 window（SSR 環境）
if (typeof window !== 'undefined') {
    window.localStorage.setItem('key', 'value');
}

// 檢查 document
if (typeof document !== 'undefined') {
    document.getElementById('app');
}

// 檢查 process（Node.js）
if (typeof process !== 'undefined' && process.env) {
    console.log(process.env.NODE_ENV);
}
```

---

## 總結

| 方式 | 推薦 | 說明 |
|------|------|------|
| `@ts-expect-error` | ❌ | 偷吃步，繞過檢查 |
| `@ts-ignore` | ❌ | 更糟，永久忽略 |
| `typeof !== 'undefined'` | ✅ | 正確做法，安全又有型別 |
| 安裝 `@types/node` | ⚠️ | 會污染全域型別，看情況用 |
