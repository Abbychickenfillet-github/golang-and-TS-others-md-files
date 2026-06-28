---
title: React Context（Provider/Consumer）、AuthProvider 與路由保護
type: topic-note
source: ChatGPT
tags: [chatgpt, react, context, hooks, auth, nextjs, 狀態管理, 反樣式]
sources:
  - https://chatgpt.com/c/react-context-best-practices
updated: 2026-06-27
---

# React Context（Provider/Consumer）、AuthProvider 與路由保護

> 互動考題版：[[React-Context-Provider消費者-AuthProvider與路由保護.html|點我做題（填空／是非／申論）]]
> 相關筆記：[[useMemo-return]]、[[樂觀更新-Optimistic-Update]]、[[Cookie-與-Session]]、[[JWT_TOKEN_EXPLANATION]]、[[GOOGLE_OAUTH_SETUP]]

## 重點整理

- **Provider / Consumer 關係**：祖先元件用 `<Context.Provider value={...}>` 供應狀態，後代用 `useContext()`（或舊式 `Consumer`）取用。<mark style="background: #ADCCFFA6;">關係「不近」</mark>——可以**跨好幾層直接跳傳**，不必像 props 一層層傳。
- **解決的痛點是 Props Drilling（鑽孔取探）**：把同一份 props 一路硬傳給多層子元件，冗長難維護，是<mark style="background: #FF5582A6;">反樣式（anti-pattern）</mark>。Context 就是來消掉這個。
- **但 Context ≠ 狀態管理**：<mark style="background: #FFF3A3A6;">Context 是「狀態容器」</mark>（放東西的地方），<mark style="background: #BBFABBA6;">狀態管理是「狀態的流動／更新／存取」</mark>。Context 沒內建全域更新、非同步處理那些，要自己寫或搭工具。
- **過度使用 Context 的代價**：value 一變，<mark style="background: #FF5582A6;">所有消費它的元件都會重渲染</mark>→ 效能問題。所以「整站狀態全塞一個 Context」不是好主意（這也是「網路上很多人教錯」的點）。複雜場景考慮 `useReducer` 或 Redux。
- **常見反樣式雷區**：① 給狀態時<mark style="background: #FFB8EBA6;">沒給初始值</mark>（之後渲染容易 undefined）；② `map` 時<mark style="background: #FFB8EBA6;">沒給 `key`</mark>。

## 兩個 Abby 踩過的真實 bug

### 1. ASI 陷阱：`return` 換行後 JSX 被吃掉

```jsx
// ❌ 壞的：return 自己換行
return
  <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>
```

JavaScript 的<mark style="background: #FFF3A3A6;">自動分號插入（ASI）</mark>會在 `return` 後補一個 `;`，等於 `return;`，後面那段 JSX <mark style="background: #FF5582A6;">永遠不會被回傳</mark>。修法：JSX 跟 `return` 同一行，或用小括號包起來：

```jsx
// ✅ 用小括號讓它是「同一個語句」
return (
  <AuthContext.Provider value={{ auth, login, logout }}>
    {children}
  </AuthContext.Provider>
);
```

### 2. 大寫 `Children` vs 小寫 `children`

```
Error: Objects are not valid as a React child
(found: object with keys {map, forEach, count, toArray, only})
```

- <mark style="background: #ADCCFFA6;">小寫 `children`</mark>＝被包住的子元件（要渲染的就是它）。
- <mark style="background: #FF5582A6;">大寫 `Children`</mark>＝React 提供的工具 API（`React.Children.map/forEach/count/toArray/only`），<mark style="background: #FF5582A6;">不能直接當內容渲染</mark>。把 `{Children}` 寫成 `{children}` 就好。看到錯誤訊息列出 `{map, forEach, count, toArray, only}` 就是這支 API 被誤渲染。

## AuthProvider 模式（登入狀態）

把登入狀態做成一個 `AuthProvider`，在 Next.js 的 `_app.js` 包住全站：

```jsx
// pages/_app.js（整個 App 只能有一個 _app.js）
import { AuthProvider } from "@/hooks/use-auth";

export default function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page);
  return <AuthProvider>{getLayout(<Component {...pageProps} />)}</AuthProvider>;
}
```

- `_app.js` 是<mark style="background: #D2B3FFA6;">唯一入口</mark>，頁面切換時不卸載，適合放全站 Provider 與全域 CSS。
- 全域 CSS（global / 會影響全站的 scss）<mark style="background: #FFF3A3A6;">只能在這裡 import</mark>。

## 路由保護（Protected Routes）

```jsx
const router = useRouter();
const loginRoute = "/user/login";
const protectedRoutes = ["/"];

useEffect(() => {
  if (router.isReady) {            // 確保 router 準備好再判斷
    if (!user && protectedRoutes.includes(router.pathname)) {
      router.push(loginRoute);     // 沒登入又踩到受保護路由 → 踢去登入頁
    }
  }
}, [router.isReady, user, router.pathname]);
```

重點：要等 `router.isReady` 才判斷（否則 `pathname` 可能還沒就緒）；`user` 初始值設 `null` 代表「還沒登入／未知」。

## 🔁 對照與補遺（跟既有筆記交叉比對）

- **這份是「前端登入」，剛好接上你 vault 的「後端登入」**：`AuthProvider` 管的是瀏覽器端的登入狀態，而真正驗證身分在後端——對照 [[GOOGLE_OAUTH_SETUP]]（後端 OAuth 發 JWT）、[[Cookie-與-Session]]、[[JWT_TOKEN_EXPLANATION]]。前端 Context 存的多半是「後端發回來的 token / 使用者資訊」。
- **安全補充（既有筆記與本對話都沒強調）**：對話裡用 `localStorage` 存 auth 來「模擬伺服器」。要注意 <mark style="background: #FF5582A6;">localStorage 可被 XSS 讀取</mark>，正式環境的敏感 token 較建議放 <mark style="background: #ADCCFFA6;">`HttpOnly` cookie</mark>（JS 讀不到）——見 [[Cookie-與-Session]] 的 Cookie 安全旗標。
- **效能對照**：Context value 變動造成的重渲染，跟 [[useMemo-return]]（memo 化避免重算）是同一條效能線；常見解法是把 value 用 `useMemo` 包、或拆分多個小 Context。
- **Context vs useReducer vs Redux**：

  | | Context | useReducer | Redux |
  |---|---|---|---|
  | 角色 | 傳遞狀態（容器） | 在地的複雜狀態邏輯 | 全域狀態管理框架 |
  | 何時用 | 跨層共享少量狀態（主題、登入） | 一個元件內多分支狀態轉移 | 大型 App、多人協作、需中介軟體/除錯工具 |
  | 常見組合 | Context + useReducer 取代輕量 Redux | — | Redux Toolkit |

## 各對話來源

### React Context 使用與最佳實踐 — Provider/Consumer、反樣式、AuthProvider、ASI 與 Children bug

**使用者：** 問 Context 祖先/後代關係、Provider/Consumer、狀態容器 vs 狀態管理、props drilling、初始值與 key 反樣式；實作 `AuthProvider` 時踩到 `return` 換行（ASI）與大寫 `Children` 渲染錯誤；`_app.js` 是否只能一個。

**ChatGPT：** 說明 Context 跨層供應/消費、過度使用造成重渲染、Context 非狀態管理工具；ASI 用小括號包 JSX 解決；`Children`（API）改 `children`；`_app.js` 為唯一入口可包全站 Provider。

### React Context 路由保護 — protectedRoutes + useRouter

**使用者：** 用 `AuthContext` + `useRouter` 做路由保護，未登入踩受保護路由就導去登入頁。

**ChatGPT：** 解析 `createContext(null)`、`AuthProvider` 狀態（`token` 初始 `undefined`、`user` 初始 `null`）、`router.isReady` 後再判斷 `protectedRoutes` 並 `router.push` 導向登入。
