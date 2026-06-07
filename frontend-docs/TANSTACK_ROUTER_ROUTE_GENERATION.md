# TanStack Router 路由生成問題紀錄

## 問題描述

新增 `frontend/src/routes/_layout/countries.tsx` 頁面後，訪問 `/countries` 顯示 404，後來修正後出現以下錯誤：

```
routeTree.gen.ts:216 Uncaught TypeError: LayoutEventsRoute._addFileChildren is not a function
```

## 問題原因

專案使用 `@tanstack/react-router@1.19.1`，但執行 `npx @tanstack/router-cli generate` 時自動安裝了最新版 `@tanstack/router-cli@1.144.0`，導致生成的 `routeTree.gen.ts` 使用了新版 API（如 `_addFileChildren`），與舊版 router 不相容。

## 解決方法

### 方法一：手動編輯 routeTree.gen.ts（推薦）

1. **還原原本的 routeTree.gen.ts**
```bash
git checkout HEAD~1 -- frontend/src/routeTree.gen.ts
```

2. **手動加入新路由**，需要修改 4 個地方：

```typescript
// 1. Import 區塊加入
import { Route as LayoutCountriesImport } from './routes/_layout/countries'

// 2. Create/Update Routes 區塊加入
const LayoutCountriesRoute = LayoutCountriesImport.update({
  path: '/countries',
  getParentRoute: () => LayoutRoute,
} as any)

// 3. FileRoutesByPath interface 加入
'/_layout/countries': {
  preLoaderRoute: typeof LayoutCountriesImport
  parentRoute: typeof LayoutImport
}

// 4. routeTree addChildren 陣列加入
LayoutCountriesRoute,
```

### 方法二：安裝對應版本的 CLI

```bash
# 查看目前安裝的 router 版本
npm ls @tanstack/react-router

# 安裝對應版本的 CLI（需要查對應表）
npm install -D @tanstack/router-cli@1.19.1

# 生成路由
npx tsr generate
```

## 常用指令

```bash
# 查看 TanStack Router 版本
npm ls @tanstack/react-router @tanstack/router-cli

# 生成路由（使用專案內的 CLI）
npx tsr generate

# 或使用完整路徑（會自動安裝最新版，可能不相容！）
npx @tanstack/router-cli generate

# 檢查 TypeScript 編譯
npx tsc --noEmit
```

## 注意事項

1. **不要隨意使用 `npx @tanstack/router-cli generate`**，這會安裝最新版 CLI，可能與專案版本不相容
2. 如果需要新增路由，優先考慮**手動編輯** `routeTree.gen.ts`
3. 升級 TanStack Router 時，需要同時升級 `@tanstack/react-router` 和 `@tanstack/router-cli`

## 相關 Commits

- `c2fd44d` - feat(overseas-company): 支援海外公司註冊與國家管理頁面
- `8388d4b` - chore: regenerate route tree for countries page（手動修復版本）
