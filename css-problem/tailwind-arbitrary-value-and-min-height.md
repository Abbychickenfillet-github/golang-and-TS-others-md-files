# Tailwind 任意值語法 & min-h vs h

## 問題場景

Tab 元件用 `h-10`（固定高度 2.5rem = 40px），
4 個 Tab 在 iPhone SE（320px）英文文字溢出白色圓角範圍。

## 解法：`h-10` 改成 `min-h-[2.5rem]`

```
h-10          → height: 2.5rem        （固定，內容再多也不會變高）
min-h-[2.5rem] → min-height: 2.5rem   （最小 2.5rem，內容多時可以撐更高）
```

搭配移除 `whitespace-nowrap`，文字就能折行，Tab 高度跟著自動撐開。

---

## Tailwind 任意值語法（Arbitrary Values）

當 Tailwind 沒有內建的 class 時，用 `[]` 方括號直接寫 CSS 值：

```
min-h-[2.5rem]     → min-height: 2.5rem
w-[320px]          → width: 320px
bg-[#C8960C]       → background-color: #C8960C
text-[11px]        → font-size: 11px
top-[calc(50%-8px)] → top: calc(50% - 8px)
p-[3px_6px]        → padding: 3px 6px
```

### 什麼時候用？

| 情況 | 用法 |
|------|------|
| Tailwind 有對應 class | 直接用，如 `h-10`、`text-sm` |
| Tailwind 沒有對應 class | 用 `[]`，如 `min-h-[2.5rem]`、`text-[13px]` |
| 需要精確的設計稿數值 | 用 `[]`，如 `w-[375px]`、`gap-[18px]` |

### 注意

- 方括號內不能有空格（除了用底線 `_` 代替空格）
- 支援所有 CSS 單位：px、rem、em、%、vw、vh
- 也支援 CSS 函數：`calc()`、`var()`、`linear-gradient()`

---

## h vs min-h vs max-h 比較

```
h-10       → height: 2.5rem       固定高度，不會變
min-h-10   → min-height: 2.5rem   至少這麼高，可以更高
max-h-10   → max-height: 2.5rem   最多這麼高，超過會溢出或捲動
```

### RWD 常見搭配

```html
<!-- 手機版折行時自動撐高，桌面版維持一行 -->
<div class="min-h-[2.5rem] text-xs sm:text-sm">
  Booth Products
</div>
```

## 實際案例（tabs.tsx）

修改前：
```tsx
// TabsList - 固定高度，4 個 Tab 文字溢出
"inline-flex h-10 items-center ..."

// TabsTrigger - 不允許折行
"... whitespace-nowrap ..."
```

修改後：
```tsx
// TabsList - 最小高度，可撐開
"inline-flex min-h-[2.5rem] items-center ..."

// TabsTrigger - 移除 whitespace-nowrap，允許折行
"... items-center justify-center rounded-sm ..."
```
