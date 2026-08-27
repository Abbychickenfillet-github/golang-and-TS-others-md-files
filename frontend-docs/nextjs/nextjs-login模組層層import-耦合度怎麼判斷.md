---
title: login 模組層層 import，到底是不是壞味道
tags: [nextjs, 架構, 耦合, 模組化, 好維護的程式碼]
updated: 2026-08-24
---

# login 模組層層 import，到底是不是壞味道

本篇重點 a–e，共 5 個。

起因：`next-one-main` 這個專案裡，光是 login 一個功能就 import 了層層堆疊的模組，想確認這樣算不算不好維護。

---

## 結論先講

**層數本身不是問題，方向和抽象有沒有洩漏才是。**

一個乾淨的分層（頁面 → hook → service → api client → util）本來就會有好幾層 import，這是正常的關注點分離，不是壞味道。真正該檢查的是下面五件事。

---

## (a) 方向性：單向依賴 vs 循環依賴

正常的分層是**單向**的：上層認識下層，下層不認識上層。

```
LoginPage → useLogin() → authService → apiClient → fetch
```

真正的問題是**循環依賴**——如果 `apiClient` 又反過來 import 了 `LoginPage` 或 `authService` 裡的東西，那才是壞味道。層數多但方向乾淨，不算問題。

## (b) 抽象有沒有洩漏

上層有沒有**跳過中間層**、直接碰到最底層的實作細節？

| 情況 | 判斷 |
|---|---|
| `LoginPage` 呼叫 `authService.login()` | ✅ 只認識下一層的介面 |
| `LoginPage` 直接讀 `document.cookie` 或組 JWT 字串 | ❌ 跳過了 service 層，直接碰實作細節 |
| `LoginPage` 直接 `process.env.API_URL` | ❌ 設定值應該被封裝在一層裡，不該散落在每個用到的地方 |

每一層只認識**下一層的介面**，不認識**下下層的實作**，層數再多也不會互相拖累。

## (c) 波及範圍：改一個不相關的模組，login 會不會壞

這是耦合度最實際的檢驗方式：**改動一個看起來跟 login 無關的模組，login 會不會跟著壞掉？**

會的話，問題不是「import 層數多」，是「層與層之間的界線沒畫清楚」——某一層知道了不該知道的細節，或是共用了不該共用的狀態。

## (d) 一個很常見的假象：barrel file

Next.js／TS 專案常見在資料夾底下放一個 `index.ts` 把整包 re-export：

```ts
// lib/index.ts
export * from './auth'
export * from './session'
export * from './cookies'
export * from './config'
```

這樣寫，`import { login } from '@/lib'` 看起來只有一行、很乾淨，**但實際上把整包模組都拉進來了**。

這時候「import 層層堆疊」常常是這個造成的**錯覺**，不是架構真的複雜——login 明明只需要 `auth` 那一個檔案，卻因為 barrel file 把 `session`、`cookies`、`config` 全部一起載入。

副作用：這也會拖累 tree-shaking，讓最終 bundle 變大。**值得檢查一下 next-one-main 的 `lib/index.ts` 或類似的 barrel file，看 login 是不是被這樣拖進了不相關的模組。**

## (e) 判準口訣

> **每一層能不能被單獨看懂、單獨測試、換掉不影響別人？**

能，層數再多也沒關係，那是清楚的分層。
不能，才是真正的耦合度問題，跟 import 有幾層沒有直接關係。

---

## 實際去 next-one-main 追了一遍之後的發現

追蹤路徑：`app/user/login/page.js` → `useAuth()`（`hooks/use-auth.js`）→ `axios`（`lib/line-pay-axios`）打 `/api/auth/local/login`（`route.js`）→ `services/auth.service.js` → `lib/prisma.js` / `lib/otp.js` / `lib/jwt-session.js` → `config/server.config.js`。

**API 路由這條線其實是乾淨的**：route → service → prisma/otp/jwt-session，全部單向、沒有循環，符合 (a)(b) 的判準。真正的問題不在這條線上。

**問題出在 `hooks/use-auth.js`（460 行）**，這是一個典型的「god hook」：

| 職責 | 該不該是 useAuth 的事 |
|---|---|
| 管理 `isAuth` / `userData` 狀態 | ✅ 這是它的本業 |
| 呼叫 login / logout API | ✅ 本業 |
| 路由守衛（`protectedRoutes`、`loggedInBlockedRoutes` 硬寫死的陣列 + `router.push`） | ⚠️ 這其實是 middleware 或路由層的事，混進 hook 裡 |
| 登出時清空 `useTimeLogStore`、`useTrialTimeLogStore`（TimeLog 功能的 Zustand store） | ❌ 認證模組不該認識另一個功能模組的 store |
| 直接用 `document.cookie.includes('ACCESS_TOKEN')` 字串比對，散落在 5+ 個地方 | ❌ 沒有封裝成一個函式，每次都重寫一次判斷邏輯 |
| 滿版 `console.log` debug 訊息 | ⚠️ 沒有用 `isDev` 包起來（`services/auth.service.js` 反而有做這件事） |

**這正好呼應 (c) 的判準**：如果 `useTimeLogStore` 的程式碼壞掉，`use-auth.js` 會直接爆掉，連帶讓整個 App 的登入/登出都壞掉——**改一個看似不相關的模組，login 真的會壞**。這是**高耦合**的活教材——示範的是低耦合原則被違反時會發生什麼事，不是低耦合本身的例子。先留給 Day19（低耦合）當反例（後來 Day19 已經用這個案例寫成文章，並示範了用 event bus／控制反轉解耦的修法）。

另外還撿到一個命名問題：`use-auth.js` 引入的 axios 實例叫 `@/lib/line-pay-axios`，但拿來打所有 API（包含一般帳密登入），命名跟實際用途對不上，讀的人會誤以為這條線只跟 LINE Pay 有關。

**還有一個註解騙了自己的真 bug**，在 `lib/jwt-session.js`：

```js
// createSession()
cookieStore.set(cookieName, session, {
  httpOnly: true, // 讓前端 JavaScript 可以讀取（最鬆散）  ← 註解寫反了，httpOnly:true 代表前端讀不到
  ...
})

// updateSession()
cookieStore.set(cookieName, session, {
  httpOnly: false, // 讓前端 JavaScript 可以讀取（最鬆散）  ← 這句才對，因為這裡是 false
  ...
})
```

`createSession()`（登入當下）的 cookie 有 `httpOnly` 保護，前端 JS 讀不到；但 `updateSession()`（session 更新）把 `httpOnly` 拿掉了，前端反而讀得到。如果這不是刻意設計，那就是**複製貼上註解時沒有跟著改**，而且這個註解的內容剛好跟旁邊的程式碼相反，比沒寫註解更危險——讀的人會相信註解，不會去重新驗證程式碼。留給 Day8（註解）當真實案例。

**這不只是註解寫錯，`httpOnly` 的值本身也被降級了，是可以實際被利用的安全問題：**

httpOnly 的作用是擋掉「瀏覽器端 JavaScript 讀 `document.cookie`」，防的是 XSS 之後攻擊者偷走 token 冒充登入；伺服器端不受影響，Cookie header 照樣會送。`createSession()` 設 `true` 是對的。但如果 `updateSession()`（滑動式過期常見會在使用者活躍時定期呼叫）把它設回 `false`，代表**登入當下安全，但 session 一更新，token 就變成前端 JS 讀得到的狀態**——等於自己把 `createSession()` 想擋住的 XSS 偷 token 破口重新打開。建議做法：`updateSession()` 的 httpOnly 應該跟 `createSession()` 保持一致（都設 `true`），除非有特別理由需要前端讀到 token（更常見的做法是後端額外發一個非 httpOnly 的旗標 cookie，而不是把 token 本身開放）。

## 關聯

這個判準會在系列文章裡展開成三篇：

- [[好維護的程式碼-Day18-高內聚]]（尚未寫）——「這一層該不該負責這件事」
- [[好維護的程式碼-Day19-低耦合]]（尚未寫）——今天這篇問題的正式版本
- [[好維護的程式碼-Day20-模組化]]（尚未寫）——多個模組怎麼組成一個可控的系統

寫到那幾天時，可以直接回來拿 next-one-main 的 login 當實例對照。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 高內聚 High Cohesion | https://www.explainthis.io/zh-hant/swe/high-cohesion | 查證於 2026-08-24 |
| 低耦合 Low Coupling | https://www.explainthis.io/zh-hant/swe/low-coupling | 查證於 2026-08-24 |
| 寫出好維護的程式碼（上）課程大綱 | https://www.explainthis.io/zh-hant/courses/maintainable-code-part1 | 查證於 2026-08-24 |
