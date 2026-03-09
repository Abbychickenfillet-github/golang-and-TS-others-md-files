# TypeScript 型別轉換 (Type Casting) & Custom Hooks 筆記

## 什麼是 Cast 型別？

Cast（型別轉換/斷言）就是「告訴 TypeScript：我知道這個東西是什麼型別，你相信我」。

### 語法

```ts
// 方法一：as 語法（推薦）
const value = someVariable as string

// 方法二：角括號語法（不能在 JSX 中用）
const value = <string>someVariable
```

### 什麼時候會用到？

```ts
// 1. TypeScript 推斷不出正確型別
const input = document.getElementById('myInput') as HTMLInputElement
input.value = 'hello'  // 沒有 cast 的話 TypeScript 不知道有 .value

// 2. API 回傳的資料型別不確定
const data = await response.json() as User

// 3. 聯合型別需要縮窄
const result: string | number = getValue()
const str = result as string  // 我確定它是 string
```

### 常見的 cast 方式

| 方式 | 說明 | 範例 |
|------|------|------|
| `as T` | 告訴 TS 這是 T 型別 | `data as User` |
| `as const` | 把值變成 readonly + literal type | `[1, 'hello'] as const` |
| `as unknown as T` | 強制轉換（兩個型別完全不相關時） | `str as unknown as number` |

---

## `as const` 是什麼？

`as const` 不是 cast 成某個型別，而是告訴 TypeScript「這個值不會變，請用最精確的型別」。

### 沒有 `as const`

```ts
const arr = [1, 'hello']
// TypeScript 推斷：(string | number)[]
// arr[0] 可能是 string 也可能是 number，TS 不確定
```

### 有 `as const`

```ts
const arr = [1, 'hello'] as const
// TypeScript 推斷：readonly [1, 'hello']
// arr[0] 一定是 number (1)
// arr[1] 一定是 string ('hello')
```

### 實際應用：Custom Hook 回傳值

```ts
// 沒有 as const
function useMyHook() {
  return [state, setState]
  // 型別：(State | SetStateFunction)[]
  // 解構時 state 和 setState 都是 State | SetStateFunction，要自己 cast
}

// 有 as const
function useMyHook() {
  return [state, setState] as const
  // 型別：readonly [State, SetStateFunction]
  // 解構時 state 是 State，setState 是 SetStateFunction，完美！
}
```

這就是為什麼 `useSessionState` 最後要寫 `return [state, setSessionState] as const`。

---

## useSessionState Hook 完整解析

```ts
export function useSessionState<T>(key: string, initialValue: T) {

  // 第一段：useState — 管理 React state
  // 初始化時會嘗試從 sessionStorage 讀取上次的值
  const [state, setState] = useState<T>(() => {
    const saved = sessionStorage.getItem(key)
    if (saved !== null) {
      return JSON.parse(saved) as T  // ← 這裡用了 cast：把 JSON.parse 的結果當作 T
    }
    return initialValue
  })

  // 第二段：useCallback — 包裝 setState，加上 sessionStorage 同步
  // 為什麼不直接用 setState？
  // 因為 setState 只會更新 React state，不會寫 sessionStorage
  // 所以要包一層，做兩件事：1. 更新 state  2. 寫入 sessionStorage
  const setSessionState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = value instanceof Function ? value(prev) : value
        sessionStorage.setItem(key, JSON.stringify(next))
        return next
      })
    },
    [key],
  )

  // as const 讓 TypeScript 知道：
  // 第一個元素是 T（值），第二個元素是 function（setter）
  return [state, setSessionState] as const
}
```

### 使用方式（跟 useState 一模一樣）

```ts
// 直接賦值
const [step, setStep] = useSessionState('step', 1)
setStep(3)

// 用 function 更新
setStep((prev) => prev + 1)

// 物件
const [form, setForm] = useSessionState('form', { name: '', email: '' })
setForm((prev) => ({ ...prev, name: 'Abby' }))
```

---

## 泛型 `<T>` 是什麼？

`T` 是佔位符，代表「用的時候再決定什麼型別」。

```ts
function useSessionState<T>(key: string, initialValue: T)
//                      ^ 宣告泛型

// 使用時 T 自動推斷：
useSessionState('step', 1)            // T = number
useSessionState('form', { name: '' }) // T = { name: string }
useSessionState<string[]>('tags', []) // 手動指定 T = string[]
```

### `(value: T | ((prev: T) => T))` 的意思

跟 `useState` 的 setter 一樣，支援兩種呼叫方式：

```ts
// 方式一：直接傳值（T）
setStep(3)

// 方式二：傳函式（(prev: T) => T）
setStep((prev) => prev + 1)
```

`T | ((prev: T) => T)` 就是說參數可以是值或函式。

---

## 相關概念對照表

| 概念 | 說明 | 範例 |
|------|------|------|
| Type Casting / 型別斷言 | 告訴 TS 變數的型別 | `data as User` |
| `as const` | 鎖定為 literal + readonly | `[1, 'a'] as const` |
| 泛型 `<T>` | 型別佔位符，使用時決定 | `useState<number>(0)` |
| `useState` | React state 管理 | `const [v, setV] = useState(0)` |
| `useCallback` | 快取函式，避免不必要的重建 | `useCallback(() => {}, [dep])` |
| `JSON.stringify` | 物件 → 字串（序列化） | `JSON.stringify({a:1})` → `'{"a":1}'` |
| `JSON.parse` | 字串 → 物件（反序列化） | `JSON.parse('{"a":1}')` → `{a:1}` |
| `sessionStorage` | 瀏覽器暫存，關分頁就清除 | `sessionStorage.setItem('k','v')` |
| `localStorage` | 瀏覽器永久存，手動才清除 | `localStorage.setItem('k','v')` |

---

## `import.meta.env.DEV` 環境判斷

Vite 內建的環境變數，不需要自己設定：

```ts
import.meta.env.DEV   // true = 開發環境 (npm run dev)
import.meta.env.PROD  // true = 正式環境 (npm run build)
import.meta.env.MODE  // 'development' | 'production'
```

用法：只在開發環境印 log

```ts
const isDev = import.meta.env.DEV

if (isDev) console.warn('debug info')     // dev 才印
if (isDev) console.error('error detail')   // dev 才印
```
