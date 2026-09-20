# Day 18：實戰 150+ commits 的三大編譯陷阱 — TypeScript 編譯錯誤、環境變數管理、React 記憶體洩漏

## 你的三個提問

1. 為什麼 TypeScript 編譯會莫名其妙失敗？
2. 環境變數改一個 port，為什麼前端有 100 個地方都要改？
3. React 應用為什麼會越跑越慢，記憶體永遠不放？

---

## 這篇文章的背景

我分析了一個活動售票系統的 **150+ commits 前端改動**，發現開發團隊反覆遇到同樣的三大陷阱。這不是理論，而是真實開發中的血淚史。

---

## 陷阱一：TypeScript 編譯錯誤 — 差一個型別定義就全崩潰

### 症狀

```bash
✖ build error solve (ts)
✖ fix: 修復 TypeScript 編譯錯誤與 UI 調整
✖ build error fixed
```

你會看到三四個 commit 在重複修「同一種類型」的編譯錯誤。

### 根本原因：四個常見場景

#### 1. 缺少 `@types` 型別定義

一開始只裝了 `jspdf` 和 `xlsx`，但沒裝型別定義：

```bash
# ❌ 錯誤：只裝了套件
npm install jspdf xlsx

# 編譯時炸裂
# Property 'jsPDF' does not exist on type 'Window & typeof globalThis'
# Cannot find module 'xlsx'

# ✅ 正確：一定要裝型別定義
npm install jspdf xlsx
npm install --save-dev @types/jspdf @types/xlsx
```

一個 commit 就在修這個：

```
fe410179 build: Add `@types/jspdf` and `@types/xlsx` dependencies
```

**教訓**：每次 `npm install 套件` 之前，先問自己：「這個套件有沒有官方型別定義？」

#### 2. 回傳型別沒有跟上 API 變更

你的後端改了 API response 的結構，但前端的 DTO 沒更新：

```typescript
// ❌ 舊 API response
interface OrderResponse {
  id: string;
  total_amount: number;  // ← 欄位名稱改了
}

// ✅ 新 API response（後端改過了）
interface OrderResponse {
  id: string;
  total: number;         // ← 欄位名稱改了
}
```

編譯時 TypeScript 會卡在 `Property 'total_amount' does not exist` 的地獄。

一堆 commit 在改這個：

```
2008cb50 fix(payment): 修復 V4 重構後遺留的 deleted_at 引用問題
11be4891 fix: 修復 TypeScript 編譯錯誤與 UI 調整
```

#### 3. React 元件型別推論錯誤

特別是 Chakra UI 的使用。Chakra v2 vs v3 版本不相容：

```typescript
// ❌ Chakra v2 style
<Box spacing={2}>  {/* ← spacing 是 v2 的屬性 */}

// ✅ Chakra v3 style
<Box gap={2}>      {/* ← gap 是 v3 的屬性 */}
```

commit 提到專案有同時依賴兩個版本的 Chakra，所以一直在改：

```
53c3de45 refactor: 使用 Common 元件替換活動與公司篩選器
```

#### 4. useCallback 和 useMemo 的型別 generic 沒傳對

```typescript
// ❌ 型別推論不足
const memoizedT = useMemo(() => {
  return (key: string) => t(key);
}, [t]);  // TypeScript 不知道你在做什麼

// ✅ 明確指定型別
const memoizedT = useCallback((key: string): string => {
  return t(key);
}, [t]);
```

這個 commit 在修這個：

```
c3f81b7a refactor: memoize the `t` function returned by `useTranslation` 
          using `useCallback` to improve performance.
```

### 解決方案

**建立一個「型別檢查 CI 步驟」，不要靠開發者手動檢查：**

```bash
# package.json 的 scripts
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "npm run type-check && vite build",
    "dev": "tsc --noEmit && vite"
  }
}
```

**每次開發前先跑 `npm run type-check`，編譯錯誤立刻看到。**

---

## 陷阱二：環境變數管理 — 一個 port 改動引發 100 個檔案級聯修正

### 症狀

```
ddcb9c38 fix: update API base URL from port 8003 to 8080 across 
          multiple components
```

一個 commit，改了一個 port，結果涉及 20+ 個檔案。

### 根本原因：API URL 硬寫在各地

你的前端到處都有這樣的程式碼：

```typescript
// ❌ components/EventList.tsx
const res = await fetch('http://localhost:8003/api/v1/events');

// ❌ hooks/useOrder.ts
const res = await fetch('http://localhost:8003/api/v1/orders');

// ❌ utils/api.ts
const BASE_URL = 'http://localhost:8003';

// ❌ services/UserService.ts
const BASE_URL = 'http://localhost:8003';
```

後端改了 port 從 8003 → 8080，你要一個一個改。而且當你有「開發」、「測試」、「正式」三個環境，每個都要另外改一遍。

### 級聯失敗的例子

光是這個改動，就牽動：

1. **API client 層** - 所有 fetch 呼叫
2. **Service 層** - 所有 API 端點定義
3. **環境設定** - `.env.development` vs `.env.production`
4. **Docker Compose** - 容器間的通訊 port
5. **Chakra UI 主題** - 可能也用到了 API prefix
6. **測試 mock** - Jest 的 mock server

結果一個改動變成 20 個檔案的蝴蝶效應。

### 解決方案

**第一步：建立一個集中的 API 配置檔**

```typescript
// src/config/api.ts
const API_CONFIG = {
  development: {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
    TIMEOUT: 10000,
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'https://api.example.com',
    TIMEOUT: 15000,
  },
};

export const getApiConfig = () => {
  const env = process.env.NODE_ENV as 'development' | 'production';
  return API_CONFIG[env];
};

export const API_BASE_URL = getApiConfig().BASE_URL;
```

**第二步：所有 API 呼叫都從同一個地方拿**

```typescript
// ✅ hooks/useOrder.ts
import { API_BASE_URL } from '@/config/api';

export const useOrder = () => {
  const fetchOrder = async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/orders/${id}`);
    // ...
  };
  return { fetchOrder };
};
```

**第三步：.env 檔定義環境變數**

```env
# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.futuresign.example.com
```

Vite 會自動把 `VITE_` 開頭的變數注入到 `import.meta.env` 裡：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL;
```

這樣改一個環境變數，全部地方都跟著改。

---

## 陷阱三：React 記憶體洩漏 — 應用越跑越慢，chrome memory 圖表永遠往上走

### 症狀

```
e3d1c362 perf: 為 Tabs 元件加上 isLazy 避免不必要渲染
945f8126 perf(events): 修復活動頁面記憶體問題
e3d56c0e perf(invoices): 優化發票統編查詢效能（N+1 → 1 次請求）
```

一堆 commit 在修「記憶體問題」和「無用渲染」。

### 根本原因一：useEffect 沒有正確清理副作用

最常見的洩漏場景：

```typescript
// ❌ 記憶體洩漏：subscribe 沒有 unsubscribe
useEffect(() => {
  const subscription = eventBus.subscribe('order-updated', handleUpdate);
  // ❌ 沒有在 unmount 時取消訂閱
}, []);

// ✅ 正確做法：return cleanup 函式
useEffect(() => {
  const subscription = eventBus.subscribe('order-updated', handleUpdate);
  
  return () => {
    subscription.unsubscribe();  // cleanup
  };
}, []);
```

另一個常見的：

```typescript
// ❌ 定時器沒清理
useEffect(() => {
  const timer = setInterval(() => {
    setOrderStatus(getStatus());
  }, 5000);
  // ❌ 沒有 clearInterval
}, []);

// ✅ 正確做法
useEffect(() => {
  const timer = setInterval(() => {
    setOrderStatus(getStatus());
  }, 5000);
  
  return () => clearInterval(timer);
}, []);
```

### 根本原因二：useEffect 依賴陣列寫錯了

```typescript
// ❌ 依賴陣列永遠為空，但內部用了 orderId
useEffect(() => {
  const timer = setTimeout(() => {
    fetch(`/api/orders/${orderId}`);  // orderId 是外部的
  }, 1000);
}, []);  // ❌ 依賴陣列漏了 orderId

// 結果：
// - 第一次 render：orderId = "123"，timer 用 "123"
// - orderId 變成 "456"：timer 還是用 "123"（bug）
// - timer 一直跑著，佔著記憶體

// ✅ 正確做法
useEffect(() => {
  const timer = setTimeout(() => {
    fetch(`/api/orders/${orderId}`);
  }, 1000);
  
  return () => clearTimeout(timer);
}, [orderId]);  // ✅ 加入 orderId
```

commit 提到：

```
78e3f494 refactor: adjust `useEffect` dependencies in `MyEventsPage` 
         to exclude `router` and suppress exhaustive-deps linting.
```

但更常見的是反向的陷阱：**該加到依賴陣列但沒加**。

### 根本原因三：Chakra UI 的 Tabs 沒有用 isLazy

```typescript
// ❌ 所有 TabPanels 都會 render，即使沒有被看到
<Tabs>
  <TabList>
    <Tab>訂單</Tab>
    <Tab>發票</Tab>
    <Tab>退款</Tab>
  </TabList>
  <TabPanels>
    <TabPanel><OrderTable data={orders} /></TabPanel>  {/* render */}
    <TabPanel><InvoiceTable data={invoices} /></TabPanel>  {/* render */}
    <TabPanel><RefundTable data={refunds} /></TabPanel>  {/* render */}
  </TabPanels>
</Tabs>

// ✅ 加上 isLazy，只有 active tab 才會 render
<Tabs isLazy>
  {/* ... */}
</Tabs>
```

這個 commit 就在修這個：

```
e3d1c362 perf: 為 Tabs 元件加上 isLazy 避免不必要渲染
```

### 根本原因四：API 層次的 N+1 查詢

前端沒有直接的 N+1（那是後端的問題），但前端可能會**觸發** N+1：

```typescript
// ❌ 頁面加載時做的請求鏈
const orders = await fetch('/api/orders');  // 1 次
orders.forEach(async (order) => {
  const items = await fetch(`/api/orders/${order.id}/items`);  // N 次
  const vendor = await fetch(`/api/vendors/${order.vendor_id}`);  // N 次
});
// 結果：1 + 2N 次請求

// ✅ 讓後端 preload + 單一請求
const data = await fetch('/api/orders?include=items,vendor');
// 結果：1 次請求，後端用 GORM Preload 或 SQL JOIN 搞定
```

commit 提到：

```
e3d56c0e perf(invoices): 優化發票統編查詢效能（N+1 → 1 次請求）
6636a786 perf: GetBatchOrderSummary 用 Preload 一次撈完，消除 N+1
```

### 解決方案

#### 1. 安裝 ESLint 外掛強制檢查依賴陣列

```bash
npm install --save-dev eslint-plugin-react-hooks
```

```javascript
// .eslintrc.js
{
  "extends": ["plugin:react-hooks/recommended"],
  "rules": {
    "react-hooks/exhaustive-deps": "error",  // 強制
  }
}
```

這樣寫錯依賴陣列，ESLint 就會叫你修。

#### 2. 建立一個 custom hook 統一管理副作用清理

```typescript
// hooks/useAsync.ts
export const useAsync = <T,>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList
) => {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;  // 防止 unmount 後的 setState

    (async () => {
      try {
        const data = await asyncFn();
        if (isMounted) setState(data);
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;  // cleanup：標記 component 已 unmount
    };
  }, dependencies);

  return { state, loading, error };
};
```

用的時候：

```typescript
const { state: orders, loading } = useAsync(
  () => fetch('/api/orders').then(r => r.json()),
  []  // 一次加載，空依賴陣列
);
```

#### 3. 用 React DevTools Profiler 量化

Chrome 有 React DevTools extension，可以看到：

- 每個 component 的 render 次數
- Render 花多久時間
- Render 原因（props 改、state 改）

打開 Profiler，跑一遍頁面，看哪個 component render 次數最多，那就是你的洩漏點。

---

## 總結：三個陷阱的共同點

| 陷阱 | 根本原因 | 預防方式 |
|---|---|---|
| **TypeScript 編譯** | 型別定義分散、缺少 @types | CI type-check、自動化檢查 |
| **環境變數** | API URL 硬寫在各地 | 集中配置、環境變數注入 |
| **記憶體洩漏** | 副作用沒清理、useEffect 依賴寫錯 | ESLint + custom hooks + DevTools Profiler |

**共同模式**：都是因為「散亂」而不是「無知」。

- 型別散亂 → 集中在 config 檔
- URL 散亂 → 集中在環境變數
- 副作用散亂 → 集中在 custom hooks

---

## 下一篇預告

Day 19：「別被無限循環 hooks 牽著走 — 從 dependency array 到 zustand 狀態管理」

你會看到當應用大到一定程度，useEffect 和 useState 的組合開始變得脆弱，該怎麼換一個思路。
