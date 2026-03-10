# `as const` — 叫 TypeScript 別偷懶，照原樣記

## 一句話解釋

`as const` 告訴 TypeScript：「不要幫我合併型別，照我寫的順序和型別記住」。

## 沒有 `as const`

TypeScript 會「偷懶」，把陣列裡所有元素的型別合併在一起：

```ts
const arr = [1, 'hello']
// TS 推斷：(string | number)[]
// 意思：每個位置都可能是 string 或 number，TS 分不清
```

## 有 `as const`

TypeScript 照你寫的原樣記住：

```ts
const arr = [1, 'hello'] as const
// TS 推斷：readonly [1, 'hello']
// 意思：第一個一定是 1（number），第二個一定是 'hello'（string）
```

## 實際影響

```ts
// 沒有 as const
const [a, b] = [1, 'hello']
// a: string | number  ← 不確定
// b: string | number  ← 不確定

// 有 as const
const [a, b] = [1, 'hello'] as const
// a: 1      ← 確定是 number
// b: 'hello' ← 確定是 string
```

## 為什麼 Custom Hook 需要它

```ts
function useMyHook() {
  const [count, setCount] = useState(0)

  // 沒有 as const
  return [count, setCount]
  // 型別：(number | SetStateAction<number>)[]
  // 用的時候：
  // const [c, s] = useMyHook()
  // c 可能是 number 也可能是 function ← 有問題

  // 有 as const
  return [count, setCount] as const
  // 型別：readonly [number, SetStateAction<number>]
  // 用的時候：
  // const [c, s] = useMyHook()
  // c 一定是 number，s 一定是 function ← 正確
}
```

## 用在物件上

`as const` 也可以用在物件，讓所有屬性變成 readonly + literal type：

```ts
// 沒有 as const
const config = { api: '/users', method: 'GET' }
// 型別：{ api: string, method: string }
// config.method 可以被改成任何 string

// 有 as const
const config = { api: '/users', method: 'GET' } as const
// 型別：{ readonly api: '/users', readonly method: 'GET' }
// config.method 只能是 'GET'，不能改
```

## 重點

- `as const` 不是 cast 成某個型別，是叫 TS 用最精確的型別
- 陣列：保留每個位置的型別（tuple）
- 物件：所有屬性變 readonly + literal
- 最常見用途：Custom Hook 的 `return [value, setter] as const`
