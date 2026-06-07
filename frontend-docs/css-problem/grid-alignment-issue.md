# Grid 表頭與內容列對齊問題分析

## 問題描述

`companies.tsx` 中，「審核狀態」和「角色」兩欄的**內容列**相對於**表頭**有約 4 個空白字元的縮排偏移。

### 症狀
- 內容列的 Badge 起始位置比表頭的 Text 更靠右
- 縮小視窗後問題減輕
- 加上 `ml={0}`、`pl={0}` 無效

---

## 結構比較

### 表頭結構（正常）
```tsx
<Grid templateColumns="...">
  {/* 直接使用 Text，沒有 GridItem 包裝 */}
  <Text px={1}>審核狀態</Text>
  <Text px={1}>角色</Text>
  <Text px={1}>國家</Text>
  <Text px={1}>統編</Text>
</Grid>
```

### 內容列結構（有問題的欄位）
```tsx
<Grid templateColumns="...">
  {/* 審核狀態：多層包裝 */}
  <GridItem>
    <Box onClick={...}>
      <Menu>
        <MenuButton as={Badge} px={1} ml={0}>
          已核可 ▼
        </MenuButton>
      </Menu>
    </Box>
  </GridItem>

  {/* 角色：單層包裝 */}
  <GridItem ml={0} pl={0}>
    <Badge px={1} ml={0}>品牌方</Badge>
  </GridItem>
</Grid>
```

### 內容列結構（正常的欄位）
```tsx
<Grid templateColumns="...">
  {/* 國家：使用 HStack */}
  <GridItem>
    <HStack spacing={1}>
      <Icon />
      <Text>台灣</Text>
    </HStack>
  </GridItem>

  {/* 統編：使用 HStack */}
  <GridItem>
    <HStack spacing={1}>
      <Icon />
      <Text>12345678</Text>
    </HStack>
  </GridItem>
</Grid>
```

---

## 關鍵差異

| 特性 | 表頭 | 內容（有問題） | 內容（正常） |
|------|------|----------------|--------------|
| 包裝層 | 無 GridItem | 有 GridItem | 有 GridItem |
| 元件類型 | Text | Badge | HStack + Text |
| display | inline | inline-block | flex |

---

## 可能原因

### 1. Badge 的 `display: inline-block`
- Badge 預設是 `display: inline-block`
- Text 預設是 `display: inline`
- `inline-block` 元素有不同的對齊基線行為

### 2. Badge 的內部 padding
Chakra UI Badge 原始碼：
```css
.chakra-badge {
  display: inline-block;
  padding-inline-start: var(--chakra-space-1);
  padding-inline-end: var(--chakra-space-1);
  /* ... */
}
```
即使設定 `px={1}`，可能無法完全覆蓋 `padding-inline-start`。

### 3. GridItem vs 直接 Grid 子元素
- 表頭：Text 是 Grid 的直接子元素
- 內容：Badge 在 GridItem 內部
- GridItem 可能有預設 padding 或不同的對齊行為

### 4. Box 包裝層（僅審核狀態）
- Box 元件可能有預設 padding
- Menu 元件可能影響子元素定位

---

## 為什麼「國家」「統編」正常？

這兩欄使用 `HStack`：
```tsx
<HStack spacing={1}>  {/* display: flex */}
  <Icon />
  <Text />
</HStack>
```

- `HStack` 是 `display: flex`，有明確的對齊控制
- 使用 `Text` 而非 `Badge`
- `spacing={1}` 在 flex 容器中行為更可預測

---

## 建議解決方案

### 方案 A：統一使用 HStack（推薦）
將有問題的欄位改用 HStack 包裝：
```tsx
{/* 角色 */}
<GridItem>
  <HStack spacing={0}>
    <Badge px={1}>品牌方</Badge>
  </HStack>
</GridItem>
```

### 方案 B：設定 Badge 為 display: flex
```tsx
<Badge display="flex" alignItems="center" px={1}>
  品牌方
</Badge>
```

### 方案 C：使用 textIndent 負值微調
```tsx
<Badge textIndent="-2px" px={1}>
  品牌方
</Badge>
```

### 方案 D：表頭改用 GridItem 統一結構
```tsx
{/* 表頭 */}
<GridItem>
  <Text px={1}>角色</Text>
</GridItem>
```

---

## 調試工具

在 F12 DevTools 中檢查：
1. 選取 Badge 元素
2. 查看 Computed 頁籤
3. 檢查 `padding-left`、`padding-inline-start`、`margin-left`
4. 比較表頭 Text 和內容 Badge 的 box model

---

## 相關檔案
- `frontend/src/routes/_layout/companies.tsx`

## 日期
2025-01-08
