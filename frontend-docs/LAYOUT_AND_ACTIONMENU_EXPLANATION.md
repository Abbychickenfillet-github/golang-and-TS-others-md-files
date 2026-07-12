# _layout 路由和 ActionMenu 組件詳解

## 1. 為什麼 `_layout` 屬於 routes？

### TanStack Router 的佈局路由機制

在 TanStack Router 中，`_layout` 是一個**佈局路由（Layout Route）**，用於實現**嵌套路由**和**共享佈局**。

### 路由結構

```
routes/
├── __root.tsx          # 根路由（最外層）
├── _layout.tsx         # 佈局路由（Dashboard 佈局）
│   ├── _layout/
│   │   ├── orders.tsx  # 子路由：/orders
│   │   ├── members.tsx # 子路由：/members
│   │   ├── events.tsx  # 子路由：/events
│   │   └── ...
├── login.tsx           # 獨立路由（不在佈局內）
└── signup.tsx         # 獨立路由（不在佈局內）
```

### 工作原理

#### 1. `_layout.tsx` - 佈局組件
```tsx
// frontend/src/routes/_layout.tsx
function Layout() {
  return (
    <Flex>
      <Sidebar />        {/* 側邊欄 - 所有子路由共享 */}
      <Box>
        <Outlet />       {/* 子路由內容在這裡渲染 */}
      </Box>
      <UserMenu />       {/* 用戶菜單 - 所有子路由共享 */}
    </Flex>
  )
}
```

#### 2. `_layout/orders.tsx` - 子路由
```tsx
// frontend/src/routes/_layout/orders.tsx
export const Route = createFileRoute("/_layout/orders")({
  component: Orders,  // 這個組件會被渲染在 <Outlet /> 中
})
```

### 為什麼這樣設計？

1. **共享佈局**：所有 Dashboard 頁面（orders, members, events 等）都需要：
   - 側邊欄（Sidebar）
   - 用戶菜單（UserMenu）
   - 登錄驗證（beforeLoad）

2. **程式碼複用**：不需要在每個頁面重複寫佈局程式碼

3. **路由嵌套**：TanStack Router 自動處理路由嵌套
   - `/orders` → 渲染 `_layout.tsx` + `_layout/orders.tsx`
   - `/members` → 渲染 `_layout.tsx` + `_layout/members.tsx`

### 路由對比

| 路由類型 | 路徑 | 是否有佈局 | 用途 |
|---------|------|-----------|------|
| 佈局路由 | `/_layout` | 是（自己就是佈局） | Dashboard 主佈局 |
| 子路由 | `/_layout/orders` | 是（繼承父佈局） | 訂單管理頁面 |
| 獨立路由 | `/login` | 否 | 登錄頁面（不需要側邊欄） |

## 2. `showResetToNotCheckedIn` 的邏輯

### 狀態流轉圖

```
未報到 (not_checked_in)
    ↓ [入場登記]
已報到 (checked_in)
    ↓ [離場登記]
已離場 (left)
    ↓ [重設為未報到]
未報到 (not_checked_in)
```

### 程式碼邏輯

```tsx
// 當前狀態
const currentStatus = order.check_in_status || "not_checked_in"

// 根據狀態決定顯示哪些按鈕
const showCheckIn = canCheckIn && currentStatus !== "checked_in"
// 含義：如果狀態不是"已報到"，顯示"入場登記"按鈕
// 適用狀態：not_checked_in, left

const showCheckOut = canCheckIn && currentStatus === "checked_in"
// 含義：如果狀態是"已報到"，顯示"離場登記"按鈕
// 適用狀態：checked_in

const showResetToNotCheckedIn = canCheckIn && currentStatus === "left"
// 含義：如果狀態是"已離場"，顯示"重設為未報到"按鈕
// 適用狀態：left
```

### 按鈕顯示邏輯

```tsx
<ActionMenu
  canCheckIn={showCheckIn || showResetToNotCheckedIn}
  // 當 showCheckIn=true 或 showResetToNotCheckedIn=true 時，顯示"入場登記"按鈕

  canCheckOut={showCheckOut}
  // 當 showCheckOut=true 時，顯示"離場登記"按鈕

  onCheckIn={() =>
    onCheckInStatusChange(
      order.id,
      showResetToNotCheckedIn ? "not_checked_in" : "checked_in"
    )
  }
  // 如果 showResetToNotCheckedIn=true，點擊後設置為 "not_checked_in"
  // 否則設置為 "checked_in"

  checkInLabel={showResetToNotCheckedIn ? "重設為未報到" : "入場登記"}
  // 根據 showResetToNotCheckedIn 的值顯示不同的按鈕文字
/>
```

### 為什麼 `showResetToNotCheckedIn` 是 `false`？

如果按鈕顯示"入場登記"，說明 `showResetToNotCheckedIn = false`

**可能的原因：**
1. `currentStatus !== "left"`（當前狀態不是"已離場"）
2. `canCheckIn = false`（用戶沒有權限）

**當前狀態可能是：**
- `"not_checked_in"`（未報到）→ 顯示"入場登記"
- `"checked_in"`（已報到）→ 顯示"離場登記"
- `"left"`（已離場）→ 顯示"重設為未報到"

## 3. 為什麼 ActionMenu 這麼複雜？

### ActionMenu 的設計目標

ActionMenu 是一個**通用組件**，需要在多個場景下使用：

1. **訂單管理**：查看、入場登記、離場登記
2. **會員管理**：查看、編輯、刪除
3. **活動管理**：查看、編輯、刪除
4. **其他管理頁面**：不同的操作組合

### 複雜性來源

#### 1. 多種操作類型
```tsx
interface ActionMenuProps {
  onView?: () => void      // 查看
  onEdit?: () => void      // 編輯
  onDelete?: () => void    // 刪除
  onCheckIn?: () => void   // 入場登記
  onCheckOut?: () => void  // 離場登記
}
```

#### 2. 動態顯示控制
```tsx
canView?: boolean      // 是否顯示"查看"
canEdit?: boolean      // 是否顯示"編輯"
canCheckIn?: boolean   // 是否顯示"入場登記"
canCheckOut?: boolean  // 是否顯示"離場登記"
```

#### 3. 動態標籤文字
```tsx
checkInLabel?: string   // "入場登記" 或 "重設為未報到"
checkOutLabel?: string  // "離場登記"
```

#### 4. 權限控制
```tsx
// 在 orders.tsx 中
const canCheckIn = hasPermission("order.check-in")

// 根據權限和狀態決定顯示哪些按鈕
const showCheckIn = canCheckIn && currentStatus !== "checked_in"
const showCheckOut = canCheckIn && currentStatus === "checked_in"
const showResetToNotCheckedIn = canCheckIn && currentStatus === "left"
```

### 為什麼需要這麼複雜？

#### 場景 1：訂單管理
```tsx
<ActionMenu
  canView={true}
  canEdit={false}
  canDelete={false}
  canCheckIn={showCheckIn || showResetToNotCheckedIn}
  canCheckOut={showCheckOut}
  checkInLabel={showResetToNotCheckedIn ? "重設為未報到" : "入場登記"}
/>
```

#### 場景 2：會員管理
```tsx
<ActionMenu
  canView={true}
  canEdit={hasPermission("members.edit")}
  canDelete={hasPermission("members.delete")}
  canCheckIn={false}
  canCheckOut={false}
/>
```

#### 場景 3：活動管理
```tsx
<ActionMenu
  canView={true}
  canEdit={hasPermission("events.edit")}
  canDelete={hasPermission("events.delete")}
  canCheckIn={false}
  canCheckOut={false}
/>
```

### 簡化方案（如果只用於訂單）

如果 ActionMenu 只用於訂單管理，可以簡化為：

```tsx
// 簡化版本（僅用於訂單）
function OrderActionMenu({ order, onCheckIn, onCheckOut }) {
  const currentStatus = order.check_in_status || "not_checked_in"

  return (
    <Menu>
      <MenuButton>...</MenuButton>
      <MenuList>
        {currentStatus === "not_checked_in" && (
          <MenuItem onClick={() => onCheckIn("checked_in")}>
            入場登記
          </MenuItem>
        )}
        {currentStatus === "checked_in" && (
          <MenuItem onClick={() => onCheckOut("left")}>
            離場登記
          </MenuItem>
        )}
        {currentStatus === "left" && (
          <MenuItem onClick={() => onCheckIn("not_checked_in")}>
            重設為未報到
          </MenuItem>
        )}
      </MenuList>
    </Menu>
  )
}
```

**但這樣做的缺點：**
- 無法在其他頁面複用
- 每個頁面都需要寫自己的 ActionMenu
- 程式碼重複

## 總結

1. **`_layout` 是佈局路由**：用於實現 Dashboard 的共享佈局（側邊欄、用戶菜單等）
2. **`showResetToNotCheckedIn`**：當狀態為 `"left"` 時為 `true`，按鈕文字變為"重設為未報到"
3. **ActionMenu 複雜的原因**：需要支持多種場景、權限控制、動態顯示，是一個通用組件
