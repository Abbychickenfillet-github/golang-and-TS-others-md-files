# Radix UI Tooltip — DOM 元素生成分析

> 來源：直接閱讀 `@radix-ui/react-tooltip` 和 `@radix-ui/react-popper` 原始碼
> 版本：`@radix-ui/react-tooltip@1.1.6`
> 日期：2026-02-28

## 結論

| 元件 | 是否生成 DOM 節點 | 實際渲染 |
|------|:-:|---|
| `TooltipProvider` | **否** | 純 React Context Provider，只傳遞 `children` |
| `Tooltip`（Root） | **否** | 包兩層 Context（`PopperProvider` + `TooltipContextProvider`），都不產生 DOM |
| `TooltipTrigger` | **視 asChild** | 預設渲染 `<button>`；加 `asChild` 則用 Slot 合併 props 到子元素，**不額外產生 DOM** |
| `TooltipContent` | **是** | 透過 Portal 渲染到 `<body>` 外，包含 `<div>` 定位容器 |
| `TooltipPortal` | **否** | 只是 `createPortal` 包裝，不產生自己的 DOM |
official_website pre_order commit: bbf65b75222e47ef4800fa2663f8b570d6b3e7cf
## 原始碼佐證

### TooltipProvider（不產生 DOM）

```js
// node_modules/@radix-ui/react-tooltip/dist/index.mjs
var TooltipProvider = (props) => {
  const { children, delayDuration, skipDelayDuration, ... } = props;
  // ...state management...
  return jsx(TooltipProviderContextProvider, { ..., children });
  //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //         這是 React.createContext 的 Provider，不渲染 DOM
};
```

### Tooltip / Root（不產生 DOM）

```js
var Tooltip = (props) => {
  const { children, open, defaultOpen, ... } = props;
  // ...state management...
  return jsx(PopperPrimitive.Root, { ...popperScope,
    children: jsx(TooltipContextProvider, { ..., children })
  });
};

// PopperPrimitive.Root 也不產生 DOM：
var Popper = (props) => {
  const { children } = props;
  const [anchor, setAnchor] = React.useState(null);
  return jsx(PopperProvider, { ..., children });
  //         ^^^^^^^^^^^^^^
  //         又是 React Context Provider
};
```

**兩層 Context（Popper + Tooltip），零個 DOM 節點。**

### TooltipTrigger（有條件產生 DOM）

```js
var TooltipTrigger = React.forwardRef((props, forwardedRef) => {
  return jsx(PopperPrimitive.Anchor, { asChild: true, ...popperScope,
    children: jsx(Primitive.button, {    // ← 預設渲染 <button>
      "aria-describedby": ...,
      "data-state": context.stateAttribute,
      ...triggerProps,                   // ← 如果外層傳 asChild，Primitive 會用 Slot
      ref: composedRefs,
      onPointerMove: ...,
      onPointerLeave: ...,
      ...
    })
  });
});
```

- **無 `asChild`**：渲染 `<button>` 元素（會影響佈局！）
- **有 `asChild`**：使用 Radix `Slot` 機制，把所有 props（事件、aria、data-state、ref）合併到子元素，**不額外產生 DOM**
- `PopperPrimitive.Anchor` 也有 `asChild: true`，所以它也不會產生額外 DOM

### TooltipContent（產生 DOM，但透過 Portal）

內容渲染到 `document.body`（Portal），不在原始 DOM 樹中，所以**不影響父容器佈局**。

## 對佈局的影響

### 會影響佈局的情況
- `TooltipTrigger` **沒加 `asChild`** → 生成額外 `<button>`，改變 DOM 結構
- 額外的 `<button>` 可能破壞 `position: absolute` 的父子關係

### 不會影響佈局的情況（正確用法）
```tsx
<TooltipProvider>        {/* 不產生 DOM */}
  <Tooltip>              {/* 不產生 DOM */}
    <TooltipTrigger asChild>  {/* 不產生 DOM，props 合併到子元素 */}
      <div className="absolute ...">  {/* 原本的元素，保持不變 */}
        {booth.name}
      </div>
    </TooltipTrigger>
    <TooltipContent>     {/* 產生 DOM，但在 Portal 裡，不影響原位置 */}
      tooltip text
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**這個結構 = 零個額外 DOM 節點在原容器內**，所以不會影響 `absolute` 定位、Flex 佈局、地圖比例等。

## 實際驗證

在 FutureSign 攤位地圖（`EventBoothMapSection.tsx`）中，將 `title` 原生 tooltip 替換為 Radix `<Tooltip>` + `<TooltipTrigger asChild>` 後，經實測**不影響攤位地圖的比例與佈局**。

## 參考

- [Radix Tooltip 官方文件](https://www.radix-ui.com/primitives/docs/components/tooltip)
- [Radix Composition 指南（asChild 說明）](https://www.radix-ui.com/primitives/docs/guides/composition)
- 原始碼路徑：`node_modules/@radix-ui/react-tooltip/dist/index.mjs`
