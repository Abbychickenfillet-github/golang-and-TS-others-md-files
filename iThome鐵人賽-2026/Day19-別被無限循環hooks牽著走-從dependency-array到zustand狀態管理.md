# Day 19：別被無限循環 hooks 牽著走 — 從 dependency array 到 zustand 狀態管理

## 你的三個提問

1. 為什麼 useEffect 一直重複執行？我明明寫對依賴陣列了啊
2. 在 React 應用裡傳資料為什麼這麼困難？Prop drilling 地獄什麼時候才能終結？
3. Redux 太複雜、Context API 又會觸發過度渲染，有沒有更簡潔的狀態管理方案？

---

## 寫在前面：為什麼 hooks 會讓你陷入地獄

React hooks（2019 年推出）讓函式式元件擁有了狀態和生命週期。但它帶來的不只是自由，還有陷阱。

**陷阱清單：**
- useEffect 無限循環
- 依賴陣列的「我以為」vs「實際」
- Prop drilling（從父層一層層傳屬性給子層）
- Stale closure（useCallback 困境）
- 全局狀態該怎麼管

你以為只要寫對括號就行，實際上你在玩一個很細微的遊戲：**閉包、依賴追蹤、渲染時序**。

---

## 第一部分：useEffect 無限循環的四個死法

### 死法一：依賴陣列中的物件每次都「不等於」

```typescript
// ❌ 無限循環
const MyComponent = ({ user }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch(`/api/profiles/${user.id}`)
      .then(r => r.json())
      .then(setProfile);
  }, [user]);  // ← 危險！user 是物件參考
};

// 為什麼會無限循環？根本原因是「物件參考」
// 
// 一句話解釋：
// user 是物件（參考型別），每次 render 都會新建一個物件，
// 即使內容相同（都是 { id: "123" }），但它們佔用不同的記憶體位址。
// useEffect 的依賴陣列會淺比較 user，比較的是「記憶體地址是否相同」，不是「內容是否相同」。
// 因為地址不同，useEffect 認為 user「改變了」，於是重新執行。
//
// 詳細流程：
// 1. 第一次 render：MyComponent 被呼叫 → 新建 user 物件（記憶體地址 0x1234）
// 2. useEffect 執行 → fetch 資料 → setProfile
// 3. setProfile 觸發 re-render → MyComponent 再次被呼叫
// 4. 第二次 render：新建新的 user 物件（記憶體地址 0x5678）← 地址改了！
// 5. useEffect 淺比較：舊的 user (0x1234) ≠ 新的 user (0x5678)
// 6. useEffect 認為 user 改變了，重新執行
// 7. 無限迴圈...

// ✅ 修正：用 user.id 而不是 user
useEffect(() => {
  fetch(`/api/profiles/${user.id}`)
    .then(r => r.json())
    .then(setProfile);
}, [user.id]);  
// ← 基本型別（string/number），比較的是「值」而不是「記憶體地址」
//   user.id = "123" 每次都是同一個值，所以 useEffect 認為沒改變
```

### 死法二：setState 觸發的新物件

```typescript
// ❌ 無限循環
const MyComponent = () => {
  const [config, setConfig] = useState({ apiUrl: 'http://localhost:8080' });

  useEffect(() => {
    const newConfig = { ...config, retries: 3 };
    // 這裡修改了 config，但 config 本身也在依賴陣列裡...
    setConfig(newConfig);
  }, [config]);  // ← 自己改自己，無限迴圈
};

// ✅ 修正：分離關切點
const MyComponent = () => {
  const [apiUrl, setApiUrl] = useState('http://localhost:8080');
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    // 初始化邏輯，只執行一次
  }, []);  // ← 空依賴陣列
};
```

### 死法三：useCallback 又新增了 setState

```typescript
// ❌ 無限循環
const MyComponent = () => {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount(count + 1);  // ← 閉包陷阱：count 被凍結在這裡
  }, [count]);  // ← 要加 count 才能看到最新值

  useEffect(() => {
    const timer = setInterval(increment, 1000);
    return () => clearInterval(timer);
  }, [increment]);  // ← increment 每次都改（因為 count 改）→ useEffect 重新執行
};

// ✅ 修正：用函式形式的 setState
const MyComponent = () => {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount(prev => prev + 1);  // ← 不需要依賴 count
  }, []);  // ← 依賴陣列永遠是空的

  useEffect(() => {
    const timer = setInterval(increment, 1000);
    return () => clearInterval(timer);
  }, [increment]);  // ← increment 永遠不變
};
```

### 死法四：外部庫的物件被迫加入依賴陣列

```typescript
// ❌ 無限循環
const MyComponent = () => {
  const router = useRouter();  // ← router 物件每次都新建
  const theme = useTheme();    // ← theme 物件每次都新建

  useEffect(() => {
    // 做什麼事...
  }, [router, theme]);  // ← 外部物件，永遠「改變」
};

// ✅ 修正一：只依賴你真正需要的部分
useEffect(() => {
  // ...
}, [router.pathname, theme.colors.primary]);

// ✅ 修正二：把外部物件包在自己的 hook 裡
export const useRouterPath = () => {
  const router = useRouter();
  const [path, setPath] = useState(router.pathname);

  useEffect(() => {
    setPath(router.pathname);
  }, [router.pathname]);

  return path;
};
```

---

## 第二部分：Prop Drilling 地獄 — 為什麼層層傳資料這麼痛

假設你有這樣的元件結構：

```
App
  ├─ Dashboard
  │   ├─ Sidebar
  │   │   ├─ UserCard
  │   │   │   └─ UserAvatar ← 只有這裡需要 user 資料
  │   └─ MainContent
  └─ Header
```

你想讓 UserAvatar 拿到用戶資料，結果：

```typescript
// ❌ Prop drilling 地獄
const App = () => {
  const [user, setUser] = useState(null);

  return (
    <Dashboard user={user}>
      <Sidebar user={user}>
        <UserCard user={user}>
          <UserAvatar user={user} />
        </UserCard>
      </Sidebar>
    </Dashboard>
  );
};

const Dashboard = ({ user, children }) => <div>{children}</div>;
const Sidebar = ({ user, children }) => <div>{children}</div>;
const UserCard = ({ user, children }) => <div>{children}</div>;
const UserAvatar = ({ user }) => <img src={user.avatar} />;

// 問題：
// 1. user 要經過 4 層元件才能到達 UserAvatar
// 2. Dashboard, Sidebar, UserCard 都要宣告 user prop，但根本不用它
// 3. 中間層如果 re-render，UserAvatar 也會跟著 re-render（即使 user 沒改）
```

### 傳統方案一：Context API

```typescript
// ✅ 解決 prop drilling，但可能觸發過度渲染
const UserContext = createContext();

const App = () => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={user}>
      <Dashboard>
        <Sidebar>
          <UserCard>
            <UserAvatar />
          </UserCard>
        </Sidebar>
      </Dashboard>
    </UserContext.Provider>
  );
};

const UserAvatar = () => {
  const user = useContext(UserContext);
  return <img src={user.avatar} />;
};

// 問題：
// - UserContext.Provider 的 value={user} 是物件參考
// - user 一改，所有訂閱 UserContext 的元件都會 re-render
// - 即使只改了 user.email，訂閱 user.avatar 的元件也會重新算一遍
// - 這就是 Context API 的「過度渲染問題」
```

### 傳統方案二：Redux

```typescript
// ✅ 完全解決，但程式碼量是 Context API 的 3 倍
import { createSlice, configureStore } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: null,
  reducers: {
    setUser: (state, action) => {
      return action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    user: userSlice.reducer,
  },
});

// 元件裡
const UserAvatar = () => {
  const user = useSelector(state => state.user);
  return <img src={user.avatar} />;
};

// Redux 優勢：
// 1. useSelector 做了「記憶化」：只要回傳值沒變，就不會觸發元件 re-render
// 2. DevTools 可以追蹤每個 action，時間旅行 debug
// 3. 中間層不用知道 user 的存在

// Redux 劣勢：
// - reducer / action / selector 的 boilerplate 太多
// - 初學者會被 dispatch + thunk 搞暈
```

---

## 第三部分：現代解決方案 — Zustand

Zustand（德文「狀態」）是一個輕量級的狀態管理庫。相比 Redux，它：
- 少 10 倍的程式碼
- 沒有 boilerplate
- 天然支援「按需選取狀態」（自動記憶化）
- DevTools 也有
- TypeScript 友好

### 基本用法

```typescript
import { create } from 'zustand';

// ✅ 建立 store
const useUserStore = create((set) => ({
  user: null,
  setUser: (newUser) => set({ user: newUser }),
  updateEmail: (email) => set((state) => ({
    user: { ...state.user, email },
  })),
  logout: () => set({ user: null }),
}));

// 元件裡
const UserAvatar = () => {
  // 寫法一：整個 store
  const store = useUserStore();
  
  // 寫法二：選取需要的部分（自動記憶化）
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  
  return <img src={user?.avatar} />;
};
```

### 記憶化對比

```typescript
// Redux
const user = useSelector(state => state.user);
// useSelector 內部會檢查回傳值是否改變，沒改就不 re-render

// Zustand
const user = useUserStore(state => state.user);
// 同樣的機制：selector function 回傳的值沒改，就不 re-render
```

兩者在這點上原理相同。差別是：

```typescript
// Redux：要寫 action
const dispatch = useDispatch();
// 之後在 component 裡
dispatch(setUser(newUser));

// Zustand：直接呼叫 function
const setUser = useUserStore(state => state.setUser);
setUser(newUser);
```

### 進階：useShallow 避免不必要的 re-render

```typescript
// 假設 user 是個大物件
// user = { id, name, email, avatar, role, preferences, ... }

// ❌ 有問題：只要 user 物件改變，就會 re-render，即使 avatar 沒改
const user = useUserStore(state => state.user);

// ✅ 只比較淺層屬性
import { useShallow } from 'zustand/react';

const user = useUserStore(
  useShallow(state => ({
    avatar: state.user.avatar,
    name: state.user.name,
  }))
);

// useShallow 會檢查 avatar 和 name 有沒有改
// 只要兩個都沒改，就不會觸發這個元件的 re-render
```

### 實戰例子：訂單管理系統

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useOrderStore = create(
  devtools(
    persist(
      (set, get) => ({
        // 狀態
        orders: [],
        selectedOrder: null,
        filters: { status: 'all', vendor: null },
        
        // Actions
        fetchOrders: async (eventId) => {
          const res = await fetch(`/api/events/${eventId}/orders`);
          const data = await res.json();
          set({ orders: data });
        },
        
        selectOrder: (orderId) => {
          const order = get().orders.find(o => o.id === orderId);
          set({ selectedOrder: order });
        },
        
        updateOrderStatus: async (orderId, status) => {
          // 樂觀更新（先改本地，再問後端）
          set(state => ({
            orders: state.orders.map(o =>
              o.id === orderId ? { ...o, status } : o
            ),
          }));
          
          // 發送到後端
          await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          });
        },
        
        setFilter: (filterKey, value) => set(state => ({
          filters: { ...state.filters, [filterKey]: value },
        })),
        
        // Computed：可以用 get() 組合出新資料
        filteredOrders: () => {
          const { orders, filters } = get();
          return orders.filter(o => {
            if (filters.status !== 'all' && o.status !== filters.status) {
              return false;
            }
            if (filters.vendor && o.vendor_id !== filters.vendor) {
              return false;
            }
            return true;
          });
        },
        
        getOrderStats: () => {
          const { orders } = get();
          return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            completed: orders.filter(o => o.status === 'completed').length,
          };
        },
      }),
      {
        name: 'order-store',  // localStorage key
      }
    ),
    { name: 'OrderStore' }  // DevTools 名稱
  )
);

// 元件使用
const OrderList = () => {
  // 按需選取，自動記憶化
  const orders = useOrderStore(state => state.filteredOrders());
  const filters = useOrderStore(state => state.filters);
  const setFilter = useOrderStore(state => state.setFilter);

  return (
    <div>
      <Filter value={filters.status} onChange={(v) => setFilter('status', v)} />
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

const OrderStats = () => {
  // 只依賴 stats，orders 改但 stats 沒改就不會 re-render
  const stats = useOrderStore(state => state.getOrderStats());
  
  return (
    <div>
      <p>Total: {stats.total}</p>
      <p>Pending: {stats.pending}</p>
      <p>Completed: {stats.completed}</p>
    </div>
  );
};
```

---

## 第四部分：什麼時候該用什麼

| 情況 | 推薦方案 |
|------|--------|
| **小型應用，狀態少於 3 個** | useState 就夠了 |
| **多層元件需要共享狀態，但不太複雜** | Context API（如果不怕 re-render 問題） |
| **複雜應用，需要追蹤每個動作，有時間旅行 debug 需求** | Redux + Redux DevTools |
| **複雜應用，但討厭 Redux 的 boilerplate** | **Zustand**（推薦） |
| **SSR / Server Components 時代** | Server-side state（useServer 之類） |
| **實時協作應用（多人同時編輯）** | Yjs / CRDT + Zustand |

---

## 第五部分：React 19 時代的狀態管理走向

React 19（預計 2025 年正式發布）帶來了：

### 1. use() 函式 — 在元件頂層用 await

```typescript
// ✅ React 19
const UserProfile = ({ userPromise }) => {
  const user = use(userPromise);  // 可以在頂層 await Promise
  return <div>{user.name}</div>;
};
```

這簡化了「fetch 資料然後顯示」的流程。

### 2. Server Components — 狀態在後端管理

```typescript
// ✅ Server Component（預設）
export default async function OrderList() {
  const orders = await db.orders.findMany();  // 在伺服器上 fetch
  return <div>{orders.map(...)}</div>;
}

// ❌ 需要互動時才用 Client Component
'use client';
import { useOrderStore } from '@/store';

const OrderFilters = () => {
  const filters = useOrderStore(state => state.filters);
  // ...
};
```

Server Components 讓狀態更接近資料源（資料庫），而不是往上推到全局狀態。

### 3. Actions — Server Mutations

```typescript
// ✅ Server Action
async function updateOrderStatus(orderId: string, status: string) {
  'use server';
  await db.orders.update(orderId, { status });
}

// Client Component 使用
'use client';
const OrderRow = ({ order }) => {
  const [pending, setPending] = useState(false);

  const handleStatusChange = async (status) => {
    setPending(true);
    await updateOrderStatus(order.id, status);  // 直接呼叫伺服器函式
    setPending(false);
  };

  return <button onClick={() => handleStatusChange('completed')}>完成</button>;
};
```

這消除了「fetch -> JSON 往返 -> dispatch」的冗長流程。

---

## 總結：三個層級的狀態管理演進

```
Layer 1（本地）：useState
  ↓
Layer 2（跨元件）：Context API / Zustand
  ↓
Layer 3（全球應用）：Redux（複雜場景）/ Server State（現代）
```

**現在最務實的選擇：**

1. **小應用**：useState + Context API
2. **中等應用**：Zustand（簡潔、好用）
3. **大型應用**：Zustand + Server Components（React 19+）
4. **複雜業務邏輯**：考慮 Redux（但先試試 Zustand）

**下一篇預告**

Day 20：「API 呼叫永遠在賽跑 — React Query / TanStack Query 怎麼管理遠端資料狀態」

你會看到為什麼說「遠端資料狀態 ≠ 應用狀態」，以及 React Query 怎麼替你省去 loading / error / cache 的重複程式碼。
