---
title: index.ts-intro
type: concept
tags: [typescript, module, barrel-export, 模組解析, JS_Core_and_Runtime]
aliases: [index.ts-intro, barrel-file, 桶狀匯出檔]
related:
  - "[[main.tsx進入點-與globals-css的關係]]"
  - "[[10-傳值vs傳址-賦值與記憶體空間]]"
updated: 2026-08-06
---

# `index.ts` 為什麼每個資料夾都能有一個，不是整個專案只有一個

> [!info]- 📍 跟`main.tsx`／`index.html`是完全不同的兩件事，容易搞混
> 「整個專案只有一個進入點」這個直覺是對的，但那個進入點是`index.html`→`main.tsx`（見[[main.tsx進入點-與globals-css的關係]]），是瀏覽器實際開始執行程式的地方。這篇講的`index.ts`是完全不同的機制：**任何一個資料夾都可以有自己的一個`index.ts`**，跟「全站進入點只有一個」不衝突，因為它們解決的是不同層次的問題。

## (a) 先用實測資料打破「每個資料夾都有」的假設

<mark style="background: #FF5582A6;">妳觀察到的前提要先修正一下：不是「每個資料夾都有」，`futuresign.official_website`這個專案的`src/`底下，實測（2026-08-06）只有4個資料夾有`index.ts`：</mark>

```
src/client/index.ts
src/components/electricity/index.ts
src/components/tickets/index.ts
src/lib/i18n/index.ts
```

而`src/components/`底下其實還有`booth`、`dashboard`、`ui`這幾個資料夾，以及一堆直接放在`components/`層級的`.tsx`檔案（`event-card.tsx`、`hero-banner.tsx`……），這些**完全沒有**`index.ts`。所以正確的心智模型不是「每個資料夾都要有」，而是「**有需要的資料夾才會加一個**」——這是一個可選的慣例，不是強制規則。

## (b) `index.ts`真正在做的事：幫資料夾建立一個「對外窗口」

用妳貼的這份`src/components/tickets/index.ts`當例子：

```typescript
export { TicketCard } from './TicketCard'
export { TicketCategoryManager } from './TicketCategoryManager'
export type { Ticket, TicketEditForm, TicketCreateForm } from './types'
export { INITIAL_CREATE_FORM } from './types'
```

這個檔案自己**完全沒有任何邏輯**，它做的唯一一件事是把資料夾裡幾個檔案裡的東西重新`export`出來一次——這種寫法有個專門的名字叫<mark style="background: #ADCCFFA6;">「桶狀匯出檔」（Barrel File）</mark>，因為它像個桶子，把散落在各處的水（各個檔案匯出的東西）收攏到同一個出水口。

實測`tickets/`資料夾裡其實有4個檔案：`BoothCheckinTab.tsx`、`TicketCard.tsx`、`TicketCategoryManager.tsx`、`types.ts`，但`index.ts`只重新匯出了`TicketCard`、`TicketCategoryManager`跟幾個型別，**`BoothCheckinTab`完全沒有被匯出**。這代表`BoothCheckinTab`是這個資料夾的「內部實作細節」，外部程式碼理論上不該直接伸手進資料夾裡`import`它，只能透過`index.ts`這個對外窗口拿到官方允許匯出的東西。

## (c) 為什麼用`index.ts`帶來的好處：import路徑變乾淨

有這個桶狀匯出檔之後，別的檔案要用`TicketCard`，可以寫：

```typescript
import { TicketCard } from '../components/tickets'
```

而不用寫：

```typescript
import { TicketCard } from '../components/tickets/TicketCard'
```

差別看起來很小，但資料夾內部檔案要拆分、重新命名、合併的時候，只要`index.ts`裡重新匯出的名字沒變，**外部所有`import '../components/tickets'`的地方完全不用改**，資料夾內部結構變成一個可以自由重構的「黑盒子」。

## (d) 為什麼一定要叫`index`，不能取別的名字——模組解析（Module Resolution）的規則

<mark style="background: #FF5582A6;">這才是回答「為什麼是index.ts不是index.js」跟「為什麼可以每個資料夾都有一個」的技術根源。</mark>

當程式碼寫`import xxx from './tickets'`——注意這裡指向的是一個**資料夾路徑**，不是一個檔案——JavaScript／TypeScript的模組解析器（在瀏覽器打包工具如Vite、webpack裡，或Node.js的`require`機制裡）看到這種情況，會照一套慣例規則去找：「這個資料夾裡有沒有一個檔案叫`index`？如果有，就預設載入它」。這個規則源自Node.js最早的CommonJS模組系統，後來被幾乎所有JS/TS打包工具沿用，變成業界的共同慣例。

<mark style="background: #ADCCFFA6;">`index`不是隨便取的名字，它是模組解析器認得的「保留字等級的預設檔名」</mark>——正因為這個規則是「每個資料夾各自查找」，而不是「全專案查找一次」，所以每個資料夾理論上都可以各自擁有自己的`index.ts`，彼此互不影響，這就是為什麼可以每個資料夾都有一個，而不會衝突。

## (e) 為什麼會覺得「應該只有一個」——兩個容易混淆的來源

a. <mark style="background: #FFF3A3A6;">跟應用程式進入點搞混</mark>——`index.html`是瀏覽器真正開始執行程式的地方（全站只有一個，在專案根目錄），它載入的是`src/main.tsx`（也是全站只有一個，見[[main.tsx進入點-與globals-css的關係]]）。這兩個確實是「全專案唯一」，但它們的檔名是`main.tsx`不是`index.ts`，跟這篇講的資料夾桶狀匯出檔完全是兩件事，只是剛好都很常出現在「進入點」的討論裡，容易被歸類成同一種東西。
b. <mark style="background: #FFF3A3A6;">跟npm套件的`main`欄位搞混</mark>——如果是一個要被發布出去給別人`npm install`的套件（library），`package.json`裡確實常常會有一個`"main": "index.js"`欄位，指定這個套件唯一的對外進入點，這種情況下「一個套件一個index.js」的直覺是對的。但`futuresign.official_website`不是要發布的套件，它是一個用Vite打包、直接跑在瀏覽器裡的網站應用程式，`package.json`裡只有`"type": "module"`，沒有`main`欄位——這種專案形態本來就不適用「一個進入點」的套件慣例。

## (f) 這個專案裡實際存在的兩種`index.ts`用法

<mark style="background: #ADCCFFA6;">再補充一點：不是所有`index.ts`都只是單純的桶狀匯出檔，(b)講的`tickets/index.ts`、`electricity/index.ts`、`client/index.ts`是純桶子（自己不寫邏輯），但`src/lib/i18n/index.ts`不一樣——它裡面直接寫了`translations`物件跟`getTranslation()`函式本體，`index.ts`本身就是這個模組的主要邏輯所在，只是剛好也取名`index`，這樣消費端才能寫`import { getTranslation } from '../lib/i18n'`而不用寫`'../lib/i18n/index'`。兩種用法的共同點都是利用(d)講的「資料夾預設載入`index`」這條規則，差別只在於`index.ts`裡面裝的是純轉發，還是真正的實作內容。</mark>

一句話：<mark style="background: #FF5582A6;">`index.ts`能每個資料夾各自擁有一個，是因為模組解析規則是逐資料夾查找、彼此獨立的；「全專案只有一個進入點」講的其實是`index.html`+`main.tsx`這條完全不同的啟動鏈，兩者名字都帶「index」的既視感容易讓人以為是同一種規則，但範圍跟用途都不一樣。</mark>

---

## 原本這篇筆記記錄的那個具體案例：`client/models/index.ts`

`frontend/src/client/models/`底下有很多檔案，例如`member.ts`、`company.ts`、`product.ts`，每個檔案都描述後端API回傳／接收資料的欄位（屬於「型別宣告」）。`index.ts`把這些型別統一`export *`，方便其他地方只寫`import { MemberPublic } from "../../client/models"`就能拿到所有型別，是(b)講的純桶狀匯出檔的另一個實例——開發流程是後端先定義資料結構→產生OpenAPI→前端依照API schema建型別，這些`.ts`只存在於編譯階段，瀏覽器不會看到它們，也不會傳到後端。新增/刪除某個model檔案後，記得在`index.ts`重新export，讓所有型別保持同步。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 專案原始碼實測（`src/`底下index.ts分布） | `futuresign.official_website` codebase | 2026-08-06 |
| `tickets/index.ts`、`electricity/index.ts`、`client/index.ts`、`lib/i18n/index.ts`內容比對 | 同上 | 2026-08-06 |
