# React Hooks 規則：useMemo 不能放在 conditional return 之後

## 規則

React Hooks（`useState`、`useEffect`、`useMemo`、`useCallback` 等）**必須在元件的最頂層呼叫**，不能放在：
- `if / else` 區塊內
- `for` 迴圈內
- conditional return（提前 return）之後

## 錯誤範例（會造成白屏 crash）

```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')

  // 提前 return
  if (loading) {
    return <Loader />   // <-- 這裡 return 了
  }

  if (items.length === 0) {
    return null          // <-- 這裡也 return 了
  }

  // useMemo 放在 return 之後 = React 有時執行、有時不執行這個 hook
  // React 會報錯：Rendered fewer hooks than expected
  const filtered = useMemo(() => {
    return items.filter(i => i.name.includes(search))
  }, [items, search])

  return <div>...</div>
}
```

## 正確寫法

```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')

  // useMemo 放在所有 conditional return 之前
  const filtered = useMemo(() => {
    return items.filter(i => i.name.includes(search))
  }, [items, search])

  if (loading) {
    return <Loader />
  }

  if (items.length === 0) {
    return null
  }

  return <div>...</div>
}
```

## 為什麼會白屏

React 在每次 render 時會用固定順序追蹤 hooks。如果某次 render 因為提前 return 跳過了一個 hook，React 的 hooks 計數就會錯亂，導致：

1. Console 報錯：`Rendered fewer hooks than expected`
2. 整個元件 crash
3. 如果沒有 Error Boundary，上層元件也跟著掛掉 → **整頁白屏**

## 實際案例

`EventBoothProductsSection.tsx` 加搜尋功能時，`useMemo` 被放在 `if (loading) return` 之後，導致攤位商品頁面完全空白。

修復 commit: `cc622b5`
