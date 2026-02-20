# _layout 路由和 ActionMenu 组件详解

## 1. 为什么 `_layout` 属于 routes？

### TanStack Router 的布局路由机制

在 TanStack Router 中，`_layout` 是一个**布局路由（Layout Route）**，用于实现**嵌套路由**和**共享布局**。

### 路由结构

```
routes/
├── __root.tsx          # 根路由（最外层）
├── _layout.tsx         # 布局路由（Dashboard 布局）
│   ├── _layout/
│   │   ├── orders.tsx  # 子路由：/orders
│   │   ├── members.tsx # 子路由：/members
│   │   ├── events.tsx  # 子路由：/events
│   │   └── ...
├── login.tsx           # 独立路由（不在布局内）
└── signup.tsx         # 独立路由（不在布局内）
```

### 工作原理

#### 1. `_layout.tsx` - 布局组件
```tsx
// frontend/src/routes/_layout.tsx
function Layout() {
  return (
    <Flex>
      <Sidebar />        {/* 侧边栏 - 所有子路由共享 */}
      <Box>
        <Outlet />       {/* 子路由内容在这里渲染 */}
      </Box>
      <UserMenu />       {/* 用户菜单 - 所有子路由共享 */}
    </Flex>
  )
}
```

#### 2. `_layout/orders.tsx` - 子路由
```tsx
// frontend/src/routes/_layout/orders.tsx
export const Route = createFileRoute("/_layout/orders")({
  component: Orders,  // 这个组件会被渲染在 <Outlet /> 中
})
```

### 为什么这样设计？

1. **共享布局**：所有 Dashboard 页面（orders, members, events 等）都需要：
   - 侧边栏（Sidebar）
   - 用户菜单（UserMenu）
   - 登录验证（beforeLoad）

2. **代码复用**：不需要在每个页面重复写布局代码

3. **路由嵌套**：TanStack Router 自动处理路由嵌套
   - `/orders` → 渲染 `_layout.tsx` + `_layout/orders.tsx`
   - `/members` → 渲染 `_layout.tsx` + `_layout/members.tsx`

### 路由对比

| 路由类型 | 路径 | 是否有布局 | 用途 |
|---------|------|-----------|------|
| 布局路由 | `/_layout` | 是（自己就是布局） | Dashboard 主布局 |
| 子路由 | `/_layout/orders` | 是（继承父布局） | 订单管理页面 |
| 独立路由 | `/login` | 否 | 登录页面（不需要侧边栏） |

## 2. `showResetToNotCheckedIn` 的逻辑

### 状态流转图

```
未報到 (not_checked_in)
    ↓ [入場登記]
已報到 (checked_in)
    ↓ [離場登記]
已離場 (left)
    ↓ [重設為未報到]
未報到 (not_checked_in)
```

### 代码逻辑

```tsx
// 当前状态
const currentStatus = order.check_in_status || "not_checked_in"

// 根据状态决定显示哪些按钮
const showCheckIn = canCheckIn && currentStatus !== "checked_in"
// 含义：如果状态不是"已報到"，显示"入場登記"按钮
// 适用状态：not_checked_in, left

const showCheckOut = canCheckIn && currentStatus === "checked_in"
// 含义：如果状态是"已報到"，显示"離場登記"按钮
// 适用状态：checked_in

const showResetToNotCheckedIn = canCheckIn && currentStatus === "left"
// 含义：如果状态是"已離場"，显示"重設為未報到"按钮
// 适用状态：left
```

### 按钮显示逻辑

```tsx
<ActionMenu
  canCheckIn={showCheckIn || showResetToNotCheckedIn}
  // 当 showCheckIn=true 或 showResetToNotCheckedIn=true 时，显示"入場登記"按钮

  canCheckOut={showCheckOut}
  // 当 showCheckOut=true 时，显示"離場登記"按钮

  onCheckIn={() =>
    onCheckInStatusChange(
      order.id,
      showResetToNotCheckedIn ? "not_checked_in" : "checked_in"
    )
  }
  // 如果 showResetToNotCheckedIn=true，点击后设置为 "not_checked_in"
  // 否则设置为 "checked_in"

  checkInLabel={showResetToNotCheckedIn ? "重設為未報到" : "入場登記"}
  // 根据 showResetToNotCheckedIn 的值显示不同的按钮文字
/>
```

### 为什么 `showResetToNotCheckedIn` 是 `false`？

如果按钮显示"入場登記"，说明 `showResetToNotCheckedIn = false`

**可能的原因：**
1. `currentStatus !== "left"`（当前状态不是"已離場"）
2. `canCheckIn = false`（用户没有权限）

**当前状态可能是：**
- `"not_checked_in"`（未報到）→ 显示"入場登記"
- `"checked_in"`（已報到）→ 显示"離場登記"
- `"left"`（已離場）→ 显示"重設為未報到"

## 3. 为什么 ActionMenu 这么复杂？

### ActionMenu 的设计目标

ActionMenu 是一个**通用组件**，需要在多个场景下使用：

1. **订单管理**：查看、入場登記、離場登記
2. **会员管理**：查看、編輯、刪除
3. **活动管理**：查看、編輯、刪除
4. **其他管理页面**：不同的操作组合

### 复杂性来源

#### 1. 多种操作类型
```tsx
interface ActionMenuProps {
  onView?: () => void      // 查看
  onEdit?: () => void      // 編輯
  onDelete?: () => void    // 刪除
  onCheckIn?: () => void   // 入場登記
  onCheckOut?: () => void  // 離場登記
}
```

#### 2. 动态显示控制
```tsx
canView?: boolean      // 是否显示"查看"
canEdit?: boolean      // 是否显示"編輯"
canCheckIn?: boolean   // 是否显示"入場登記"
canCheckOut?: boolean  // 是否显示"離場登記"
```

#### 3. 动态标签文字
```tsx
checkInLabel?: string   // "入場登記" 或 "重設為未報到"
checkOutLabel?: string  // "離場登記"
```

#### 4. 权限控制
```tsx
// 在 orders.tsx 中
const canCheckIn = hasPermission("order.check-in")

// 根据权限和状态决定显示哪些按钮
const showCheckIn = canCheckIn && currentStatus !== "checked_in"
const showCheckOut = canCheckIn && currentStatus === "checked_in"
const showResetToNotCheckedIn = canCheckIn && currentStatus === "left"
```

### 为什么需要这么复杂？

#### 场景 1：订单管理
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

#### 场景 2：会员管理
```tsx
<ActionMenu
  canView={true}
  canEdit={hasPermission("members.edit")}
  canDelete={hasPermission("members.delete")}
  canCheckIn={false}
  canCheckOut={false}
/>
```

#### 场景 3：活动管理
```tsx
<ActionMenu
  canView={true}
  canEdit={hasPermission("events.edit")}
  canDelete={hasPermission("events.delete")}
  canCheckIn={false}
  canCheckOut={false}
/>
```

### 简化方案（如果只用于订单）

如果 ActionMenu 只用于订单管理，可以简化为：

```tsx
// 简化版本（仅用于订单）
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

**但这样做的缺点：**
- 无法在其他页面复用
- 每个页面都需要写自己的 ActionMenu
- 代码重复

## 总结

1. **`_layout` 是布局路由**：用于实现 Dashboard 的共享布局（侧边栏、用户菜单等）
2. **`showResetToNotCheckedIn`**：当状态为 `"left"` 时为 `true`，按钮文字变为"重設為未報到"
3. **ActionMenu 复杂的原因**：需要支持多种场景、权限控制、动态显示，是一个通用组件
