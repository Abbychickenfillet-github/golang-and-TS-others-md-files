---
title: Day 19 認證模組認識了購物車，這就是耦合
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, 低耦合, 耦合, 控制反轉]
updated: 2026-08-24
source: ExplainThis 軟體工程白話聊
---

# Day 19｜認證模組認識了購物車，這就是耦合

> 純 Markdown，可直接貼到 iThome。

Day 18 講的高內聚，問的是「這個模組裡面放的東西，彼此相關嗎」——那是模組**內部**的問題。

今天講的低耦合，問的是另一半：「這個模組跟**外面**其他模組的關係，夠鬆嗎」。

這兩個是同一個銅板的兩面，但今天用一個真的踩過的例子講——因為這種耦合太容易被誤認成「正常的功能整合」而寫進程式碼裡，沒人覺得哪裡怪。

---

## 一、重構前

情境：一個負責登入狀態的 `useAuth`，登出的時候要把跟這個帳號有關的東西一起清乾淨。

```js
// hooks/use-auth.js
import { useCartStore } from '@/stores/useCartStore'
import { useWishlistStore } from '@/stores/useWishlistStore'

export function useAuth() {
  const logout = async () => {
    clearAuthState()

    // 登出時，把跟這個帳號有關的其他 store 也清掉
    // 避免下一個用戶登入時看到上一個用戶的購物車/收藏清單
    useCartStore.getState().reset()
    useWishlistStore.getState().reset()

    await api.post('/auth/logout')
    router.replace('/login')
  }

  return { logout /* ...其他認證邏輯 */ }
}
```

這段程式碼**完全正確**，登出時購物車跟收藏清單真的會被清空，需求做到了。

但它把「認證」跟「購物車」、「收藏清單」焊在一起了。

---

## 二、成本一：改動範圍不可預期

`useCartStore` 的開發者某天把內部方法從 `reset()` 改名成 `clear()`——這是購物車團隊自己的重構，理論上不該影響任何人。

但它會讓 `use-auth.js` 直接報錯：

```
TypeError: cartStore.reset is not a function
```

**一個叫 `useAuth` 的檔案，因為購物車模組的內部重構而壞掉。** 讀 `use-auth.js` 的人不會想到自己還要對購物車的 API 負責。

## 三、成本二：模組數量增加時，認證模組要跟著長大

今天是 2 個 store，明天產品加了「最近瀏覽」、「通知」、「推薦清單」，登出時也都要清——`use-auth.js` 會一直被回來改。

實測三種情境，數 `use-auth.js` 因此要新增幾行：

| 情境 | 要 import + 呼叫的行數 |
|---|---|
| 只有 Cart | 2 |
| Cart + Wishlist | 4 |
| Cart + Wishlist + Notification + Recommendation + Recent | **10** |

**`use-auth.js` 的改動量隨著「別的功能」數量線性成長。** 但它明明只是一個認證模組，卻變成了「登出清理」的中央調度站——這違反了 Day 18 的高內聚（它現在管的事跟「認證」無關），也是耦合的直接後果。

## 四、成本三：測試認證邏輯，被迫牽扯進購物車模組

要幫 `useAuth` 寫單元測試，就得 mock `useCartStore`、`useWishlistStore`。如果購物車 store 需要連 API 或有複雜的初始化，認證模組的測試會被拖著一起變複雜——**明明在測認證，卻要理解購物車的內部結構**。

---

## 五、重構後：把依賴方向倒過來

核心想法：**`useAuth` 不需要知道有誰在乎「登出」這件事，它只要負責昭告天下「我登出了」。**

```js
// lib/auth-events.js
const listeners = {}
export function emitAuthEvent(event) {
  ;(listeners[event] || []).forEach((fn) => fn())
}
export function subscribeAuthEvent(event, fn) {
  listeners[event] = listeners[event] || []
  listeners[event].push(fn)
}
```

```js
// hooks/use-auth.js（重構後）
import { emitAuthEvent } from '@/lib/auth-events'

export function useAuth() {
  const logout = async () => {
    clearAuthState()
    emitAuthEvent('logout')   // 不 import 任何 store，只發一個事件

    await api.post('/auth/logout')
    router.replace('/login')
  }

  return { logout }
}
```

```js
// stores/useCartStore.js（購物車自己決定要不要在意登出）
import { subscribeAuthEvent } from '@/lib/auth-events'

export const useCartStore = create((set) => ({
  items: [],
  reset: () => set({ items: [] }),
}))

subscribeAuthEvent('logout', () => useCartStore.getState().reset())
```

現在加第三個、第四個要清空的 store，**`use-auth.js` 完全不用改**，新 store 只要自己訂閱 `'logout'` 事件就好。

實測：把 `buildAuthModule_before/after` 兩種寫法丟進 3 種情境（1 個、2 個、5 個 store）：

| 情境 | 重構前要改的行數 | 重構後要改的行數 |
|---|---|---|
| 只有 Cart | 2 | 2 |
| Cart + Wishlist | 4 | **2** |
| Cart + Wishlist + Notification + Recommendation + Recent | 10 | **2** |

重構後那一行數字**永遠是 2，不會再變**——因為 `use-auth.js` 的內容已經跟「有幾個功能在乎登出」這件事脫鉤了。

---

## 六、我一開始想錯的地方

### 疑問一：這樣不就只是把 import 換成 event，本質上還是耦合，只是換個名字？

**這句話對了一半。耦合沒有真的消失，但耦合的「對象」變了，這才是重點。**

實測把 `CartStore` 的 `reset()` 改名成 `clear()`，看兩種寫法誰會壞：

```
情境：CartStore 把 reset() 改名成 clear()（純內部重構，不是刻意搞破壞）

重構前（直接呼叫 reset）： ❌ 壞掉 —— cartStore.reset is not a function
重構後（emit 事件，CartStore 自己訂閱）： ✅ 正常 —— getItems() = []
```

- 重構前，`useAuth` 認識的是 `CartStore` 的**實作**——`reset` 這個方法名稱、回傳值型別。方法名一改，`useAuth` 就壞。
- 重構後，`useAuth` 只認識一個**事件名稱的契約**——`'logout'`。`CartStore` 內部要叫 `reset`、`clear`、還是換成完全不同的邏輯，都是它自己的事，跟 `useAuth` 無關。

這就是**依賴方向倒過來（Inversion of Control，控制反轉）**：原本是「核心模組（Auth）認識邊緣模組（Cart）」，現在是「邊緣模組（Cart）主動訂閱核心模組（Auth）發的事件」。**低耦合不是『沒有關聯』，是『依賴方向從認識實作，變成只認識契約』。**

### 疑問二：event bus 會不會變成另一種全域耦合，大家都訂閱同一個東西？

這是合理的疑慮，值得認真回答，不是隨口帶過。

| | 重構前 | 重構後 |
|---|---|---|
| 耦合的對象 | `CartStore` 的**實作**（`reset` 這個函式名稱、參數、回傳值） | 一個**事件名稱字串**（`'logout'`） |
| 耦合的表面積 | 整個 store 的公開 API | 一個字串 + 「登出時會發生」這件事 |
| 誰知道誰 | Auth 知道 Cart 存在 | Cart 知道 Auth 會發 `'logout'`，Auth 不知道 Cart 存在 |

事件名稱本身也是一種契約，需要謹慎管理——如果每個模組都隨意 emit 自訂事件、訂閱端一多，一樣會變成新的「隱式耦合」，只是換了一種難以追蹤的形式（call stack 斷開，出事時不容易反查是誰觸發的）。**低耦合換來的乾淨，是用「事件契約要維護好」換來的，不是免費的。**

### 疑問三：只有兩個 store，值得為此加一層 event bus 嗎？

不值得。這個問題直接帶到下一段。

---

## 七、什麼時候不該這樣做

**a. 依賴本來就是同一個 domain 的一部分**

`useAuth` 直接依賴 `useAuthStore`（存放 token、使用者資料的 store）不是耦合問題，那是同一個模組的內部依賴，不需要事件化。**低耦合談的是模組跟「不相關」模組的關係，不是要求模組什麼都不依賴。**

**b. 依賴只有 1-2 個、關係穩定**

如果永遠只有 Cart 需要在登出時清空，直接呼叫不會造成太大負擔。為兩個依賴多蓋一層事件系統，是用複雜度換一個不存在的問題——這是過度設計，Day 14 會展開講。

**c. 團隊還沒有足夠的除錯工具**

事件驅動架構把 call stack 斷開了——出問題時，「登出後購物車沒清空」要去猜是不是有人忘記訂閱事件，比直接看 `use-auth.js` 裡有沒有呼叫 `reset()` 更難追。沒有 logging／devtools 支援事件追蹤之前，先別急著上。

**d. 效能敏感的高頻路徑**

事件系統有一層額外的間接開銷。對每秒觸發上萬次的熱路徑（例如每次 render 都 emit），直接呼叫比事件系統划算。

---

## 八、今天的判斷標準

下次看到一個模組 import 了另一個看起來不相關的模組，問自己：

> **「如果我把這個依賴的模組整個刪掉，我的模組會不會壞掉，或是需要跟著改？」**

會的話，就是耦合。該往上一層做解耦，讓依賴方向倒過來——由「在意這件事的模組」自己去訂閱，而不是讓被依賴的模組去認識所有在意它的人。

| 依賴的對象是 | 定位 |
|---|---|
| 同一個 domain 內部的東西 | 正常依賴，不需要處理 |
| 別的 domain 的**實作細節**（具體方法名、內部結構） | 耦合，考慮倒轉依賴方向 |
| 別的 domain 的**穩定契約**（事件、公開介面） | 可接受的耦合，表面積小 |

---

## 九、跟前面 Day 串起來

| | Day 18 高內聚 | Day 19 低耦合 |
|---|---|---|
| 問的問題 | 這個模組裡面放的東西，彼此相關嗎 | 這個模組跟外面的關係，夠鬆嗎 |
| 看的方向 | 模組內部 | 模組之間 |
| 今天的例子 | — | `useAuth` 認識了 `CartStore` 的實作細節 |
| 判準 | 模組裡的東西是不是「因為同一個原因而改變」 | 刪掉依賴的模組，這個模組會不會壞 |

高內聚讓模組**知道自己該做什麼**，低耦合讓模組**不去管不該管的事**——兩者一起，才是「一個模組只對一件事負責，也只需要知道跟這件事有關的東西」。

---

## 明天預告

Day 20 講**模組化**：高內聚、低耦合是評分「切得好不好」的標準，模組化是「怎麼把一個龐大系統切成模組」的具體做法——切到多小才算模組化，切太細又會怎樣。

---

## 參考來源與內容出處說明

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 低耦合 / 鬆散耦合的定義與價值 | ExplainThis, 〈軟體設計上，低耦合是什麼意思? 為什麼要鬆散耦合?〉：https://www.explainthis.io/zh-hant/swe/loosely-coupled |
| 控制反轉 Inversion of Control 的概念 | 軟體工程領域通用術語，最早由 Michael Mattsson 等人在 1996 年的論文中系統化討論，後由 Martin Fowler 在 2004 年〈Inversion of Control Containers and the Dependency Injection pattern〉一文中普及 |

**二、我實際跑出來的部分**

三種情境下 `use-auth.js` 的改動行數對照、方法改名後兩種寫法的行為差異，全部由 `day19-low-coupling.js` 實測產生，可重跑驗證。實測環境 Node.js v24。

**三、我自己的整理與比喻（沒有外部出處）**

- 「認證模組認識了購物車」這個具體案例，改寫自真實踩過的案例，已去識別化（原案例是一個 460 行的認證 hook，直接 import 了另一個功能模組的 Zustand store，只為了登出時 reset 它）
- 「耦合沒有消失，只是耦合的對象變了」這個判準
- 高內聚 vs 低耦合的對照表

**四、其他**

- MDN, `CustomEvent`（瀏覽器原生事件機制，與本文的 event bus 概念相通）：https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent

（查閱日期：2026-08-24。本文所有數字實測於 Node.js v24，可執行腳本見文末）

## 可執行範例

本文的兩種寫法與所有量化數字，都可以用 `day19-low-coupling.js` 重跑驗證（改動行數對照、方法改名後的行為對照）。
