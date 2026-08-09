# Chakra UI Spacing 單位換算 & Heading 對齊計算

## Chakra UI 的數字間距系統

Chakra UI 的 `p`、`pt`、`m`、`mt`、`gap` 等屬性接受**數字**時，
實際輸出的 CSS 單位是 **rem**（不是 px）。

換算公式：

```
Chakra 數字 × 0.25rem = 實際 CSS 值
```

因為瀏覽器預設 `1rem = 16px`，所以等效：

```
Chakra 數字 × 4 = 對應的 px 值
```

### 常用對照表

| Chakra 數字 | rem 值    | px 等效值 |
|-------------|-----------|-----------|
| 1           | 0.25rem   | 4px       |
| 2           | 0.5rem    | 8px       |
| 3           | 0.75rem   | 12px      |
| 4           | 1rem      | 16px      |
| 5           | 1.25rem   | 20px      |
| 6           | 1.5rem    | 24px      |
| 7           | 1.75rem   | 28px      |
| 8           | 2rem      | 32px      |
| 10          | 2.5rem    | 40px      |
| 12          | 3rem      | 48px      |

> **注意**：如果使用者改過瀏覽器的根字體大小（非 16px），rem 和 px 的對應會改變。
> 但一般開發中可以安全地用 `數字 × 4 = px` 來計算。

---

## Heading 與 Sidebar Logo 對齊的計算過程

### 目標

讓每個頁面的 `<Heading>` 上緣，與 Sidebar 中的 FutureSign Logo（`<Image>`）上緣水平切齊。

### Step 1：算出 Sidebar Logo 的上緣位置

實際程式碼在 `src/components/Common/Sidebar.tsx`，結構如下：

```tsx
{/* Desktop Sidebar（line 120~168）*/}
<Box                                    {/* ← 第一層：外層 Box */}
  p={isCollapsed ? 1 : 3}              {/* ← 展開時 p=3 → 3×4 = 12px（上下左右都是 12px）*/}
  h="100vh"
  position="sticky"
  top="0"
>
  <Flex ...>                            {/* ← 內容容器（不影響 padding 計算）*/}
    <Box                                {/* ← 第二層：Logo 區域 Box */}
      flexShrink={0}
      p={{ md: 2, lg: 4 }}             {/* ← md 時 p=2 → 2×4 = 8px */}
    >                                   {/*   lg 時 p=4 → 4×4 = 16px */}
      <Flex justify="center" mb={4}>    {/* ← mb=4 是 Logo「下方」間距，不影響上緣 */}
        <Image                          {/* ← 這是我們要對齊的目標！ */}
          src="/sidebar-logo.svg"
        />
      </Flex>
    </Box>
  </Flex>
</Box>
```

Logo `<Image>` 的上緣距離視窗頂部 = 第一層 padding-top + 第二層 padding-top：

```
md 斷點：第一層 p=3 (12px) + 第二層 p=2 (8px)  = Chakra 3+2 = 5 → 5×4 = 20px
lg 斷點：第一層 p=3 (12px) + 第二層 p=4 (16px) = Chakra 3+4 = 7 → 7×4 = 28px
```

> **常見混淆**：`<Flex justify="center" mb={4}>` 的 `mb={4}` 是 Logo 與下方選單的間距（margin-bottom），
> 跟 Logo 上緣位置完全無關，不要搞混了！

### Step 2：讓 Heading 的 padding-top 匹配這個距離

```tsx
<Heading pt={{ base: 8, md: 5, lg: 7 }}>
```

換算：

| 斷點   | Chakra 數字 | 計算         | px 值  | Logo 位置 | 是否對齊 |
|--------|-------------|-------------|--------|-----------|----------|
| base   | 8           | 8 × 4       | 32px   | （手機沒有 sidebar）| 手機獨立間距 |
| md     | 5           | 5 × 4       | 20px   | 20px      | 對齊     |
| lg     | 7           | 7 × 4       | 28px   | 28px      | 對齊     |

### Step 3：注意 Navbar 的位置

有些頁面在 `<Heading>` 上方有 `<Navbar>` 元件（麵包屑導航），
如果 Navbar 在 Heading 之前，會把 Heading 往下推，導致不對齊。

**解法**：把 `<Navbar>` 移到 `<Heading>` 的下方。

```tsx
{/* 正確寫法 */}
<Container maxW="full" pb={4}>
  <Flex pt={{ base: 8, md: 5, lg: 7 }} mb={4}>
    <Heading>頁面標題</Heading>
  </Flex>
  <Navbar type="xxx" />       {/* Navbar 放在 Heading 下面 */}
  {/* ...其他內容 */}
</Container>

{/* 錯誤寫法（Navbar 在上面會推擠 Heading） */}
<Container maxW="full" pt={{ md: 5, lg: 7 }} pb={4}>
  <Navbar type="xxx" />       {/* Navbar 在 Heading 上面，Heading 被推下去 */}
  <Heading>頁面標題</Heading>
</Container>
```

---

## 總結

1. **Chakra 數字 × 4 = px**（前提：瀏覽器根字體 = 16px）
2. **實際 CSS 單位是 rem**，不是 px
3. Sidebar Logo 上緣位置：md = 20px, lg = 28px
4. Heading 用 `pt={{ base: 8, md: 5, lg: 7 }}` 來匹配
5. `<Navbar>` 必須放在 `<Heading>` 下方，避免推擠
