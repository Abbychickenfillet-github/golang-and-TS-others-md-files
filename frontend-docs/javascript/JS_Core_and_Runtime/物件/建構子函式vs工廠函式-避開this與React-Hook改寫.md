---
title: 建構子函式 vs 工廠函式 — 避開 this 的另一種物件模板，以及 React Hook 改寫
type: topic-note
source: Gemini
tags: [gemini, javascript, 物件, factory-function, constructor, closure, this, react, custom-hook]
sources:
  - https://gemini.google.com/app/f8c8f75864a839a1
updated: 2026-08-27
---

# 建構子函式 vs 工廠函式 — 避開 this 的另一種物件模板，以及 React Hook 改寫

> <mark style="background: #D2B3FF;">歸檔備註</mark>：這則對話在 Gemini 側欄被自動命名為「JavaScript 日期格式解析」，但實際內容跟日期完全無關，主題是「建構子函式、工廠函式與 React 改寫」，因此歸到物件章節而非日期章節。

本篇重點 a–k，共 11 個

## 重點整理

### 一、兩種「物件模板」的本質

a. <mark style="background: #ADCCFF;">模板（Template）</mark>在這裡指的是一種設計概念與架構，不是某種特定語法。<mark style="background: #FFF3A3;">建構子函式與工廠函式都是模板</mark>，兩者的作用都是「批量生產具有相同屬性與方法的物件」的藍圖，差別只在底層機制與語法風格。

b. <mark style="background: #ADCCFF;">建構子函式（Constructor Function）</mark>：用 `this` 指向新建立的物件，而且<mark style="background: #FF5582;">必須搭配 `new` 呼叫</mark>；方法通常掛在 `prototype` 上，透過原型鏈（Prototype Chain）共享，因此相對省記憶體。

c. <mark style="background: #ADCCFF;">工廠函式（Factory Function）</mark>：就是一個普通函式，內部直接 `return` 一個新物件；<mark style="background: #BBFABB;">不需要 `this`、也不需要 `new`</mark>；靠閉包（Closure）鎖住外層傳進來的變數。

```javascript
function createHotel(name, rooms, booked) {
  return {
    name,
    rooms,
    booked,
    checkAvailability() {
      return rooms - booked;
    }
  };
}

// 使用方式：不需要 new
const quayHotel = createHotel('Quay', 40, 25);
console.log(quayHotel.checkAvailability()); // 15
```

d. 工廠函式的三個優點：
   - <mark style="background: #BBFABB;">完全不需要 `this`</mark>，不會有 `this` 指向改變或作用域丟失的問題（例如把方法當 callback 傳出去就壞掉）。
   - 呼叫更簡單，忘記寫 `new` 也不會出事。
   - 利用閉包，函式內部可以直接存取傳入的 `rooms` 與 `booked`。

e. <mark style="background: #FF5582;">⚠️ 補充更正（Gemini 沒講到的陷阱）</mark>：上面那個 `checkAvailability` 讀的是<mark style="background: #FF5582;">閉包裡的參數 `rooms`、`booked`，不是物件上的屬性</mark>。所以之後寫 `quayHotel.booked = 30` 再呼叫 `checkAvailability()`，答案仍然是 15 而不是 10。若希望方法跟著物件屬性走，要改寫成先把物件存進變數再參照，例如：

```javascript
function createHotel(name, rooms, booked) {
  const hotel = {
    name,
    rooms,
    booked,
    checkAvailability() {
      return hotel.rooms - hotel.booked;   // 讀物件屬性，不是讀參數
    }
  };
  return hotel;
}
```

f. <mark style="background: #FFB8EB;">記憶體取捨</mark>：工廠函式每次呼叫都會替每個實例各建一份方法（除非把方法抽到外層共用），建構子＋prototype 則是所有實例共用同一份函式物件。實例數量很大時，這個差異才會有感。

### 二、同一個模板改寫成 React

g. React 的對應寫法是把「狀態＋操作狀態的方法」封裝成 <mark style="background: #ADCCFF;">Custom Hook（自訂鉤子）</mark>，等於用 `useState` 取代物件屬性、用回傳的函式取代物件方法。

```typescript
import { useState } from 'react';

interface HotelInfo {
  name: string;
  rooms: number;
  booked: number;
}

export function useHotel(initialHotel: HotelInfo) {
  const [hotel, setHotel] = useState<HotelInfo>(initialHotel);

  // 相當於原本的 checkAvailability 方法
  const checkAvailability = () => hotel.rooms - hotel.booked;

  const bookRoom = (count: number = 1) => {
    setHotel((prev) => ({
      ...prev,
      booked: prev.booked + count,
    }));
  };

  return { hotel, checkAvailability, bookRoom };
}
```

h. <mark style="background: #FFF3A3;">`setHotel((prev) => ({ ...prev, booked: prev.booked + count }))` 這行有兩個重點</mark>：用函式型更新（functional update）拿到最新的 `prev`，避免連續呼叫時讀到舊值；用展開運算子產生「新物件」而不是就地修改，因為 React 是靠參考位址比較來決定要不要重繪。

i. 在元件中使用：

```tsx
import { useHotel } from './useHotel';

export default function HotelCard() {
  const { hotel, checkAvailability, bookRoom } = useHotel({
    name: 'Quay', rooms: 40, booked: 25,
  });

  return (
    <div className="p-4 border rounded-lg max-w-sm">
      <h2 className="text-xl font-bold">{hotel.name} Hotel</h2>
      <p>總房間數：{hotel.rooms}</p>
      <p>已預訂數：{hotel.booked}</p>
      <p className="text-green-600 font-semibold">剩餘空房：{checkAvailability()} 間</p>
      <button onClick={() => bookRoom(1)} className="mt-3 px-4 py-2 bg-blue-500 text-white rounded">
        預約 1 間房
      </button>
    </div>
  );
}
```

j. <mark style="background: #D2B3FF;">觀念對照表</mark>：

| 概念 | 建構子函式 | 工廠函式 | React Custom Hook |
| --- | --- | --- | --- |
| 建立實例 | `new Hotel(...)` | `createHotel(...)` | `useHotel(...)` |
| 資料存放 | `this.xxx` | 閉包變數／回傳物件屬性 | `useState` |
| 方法共享 | `prototype` | 每個實例各一份 | 每次 render 重建（可用 `useCallback` 穩定） |
| 是否需要 `this` | 需要 | 不需要 | 不需要 |

k. <mark style="background: #D2B3FF;">面試可以這樣答</mark>：「工廠函式與建構子函式都是產生物件的模板，前者靠閉包封裝、後者靠原型鏈共享；React 的 Custom Hook 本質上就是工廠函式思維在 UI 狀態上的延伸。」

## 練習題（LeetCode／NeetCode 對應）

- LeetCode 2620 — Counter：https://leetcode.com/problems/counter/ 　最小的工廠函式＋閉包題，直接對應 (c)(d)。
- LeetCode 2665 — Counter II：https://leetcode.com/problems/counter-ii/ 　回傳一個含多個方法的物件，就是本篇 `createHotel` 的骨架。
- LeetCode 2721 — Execute Asynchronous Functions in Parallel：https://leetcode.com/problems/execute-asynchronous-functions-in-parallel/ 　閉包保存中間狀態的進階練習。
- LeetCode 2694 — Event Emitter：https://leetcode.com/problems/event-emitter/ 　可用建構子（class）或工廠函式兩種寫法各做一次，親手比較 (j) 那張表。

## 關聯筆記（附關聯原因）

- [[Constructor-與-Prototype-關係]] — 那篇是本篇 (b) 建構子路線的完整原理，本篇補上「不用 this 的另一條路」。
- [[函式的兩條線-prototype屬性與Prototype原型]] — 解釋為什麼建構子能靠原型鏈省記憶體，正是本篇 (f) 取捨的依據。
- [[13-閉包-Closure-私有變數與傳址陷阱]] — 本篇 (c)(e) 的工廠函式完全建立在閉包上，那篇的傳址陷阱正好說明 (e) 為什麼會踩雷。
- [[高階函式與函數式範式-取代OOP三大設計模式]] — 那篇把 Factory 模式改寫成高階函式，跟本篇是同一個 Factory 概念的兩種切入角度。
- [[useMemo-and-render-optimization]] — 本篇 (j) 提到 Custom Hook 每次 render 重建方法，那篇說明何時該用 `useMemo` / `useCallback` 穩定參考。

## 各對話來源（原文）

### JavaScript 日期格式解析（實際主題：建構子與工廠函式，2026-08-27）— https://gemini.google.com/app/f8c8f75864a839a1

使用者：幫我把這段用 react 改寫

Gemini：將原圖中的傳統建構子函式 Hotel 改寫為 React 規範的寫法如下。1. Custom Hook 寫法（推薦用於封裝邏輯）：定義 `interface HotelInfo { name: string; rooms: number; booked: number; }`，`export function useHotel(initialHotel: HotelInfo)` 內用 `const [hotel, setHotel] = useState<HotelInfo>(initialHotel)`，`checkAvailability` 回傳 `hotel.rooms - hotel.booked`，`bookRoom(count = 1)` 用 `setHotel((prev) => ({ ...prev, booked: prev.booked + count }))`，最後 `return { hotel, checkAvailability, bookRoom }`。2. 在 React 元件中的實際使用範例：`HotelCard` 解構出三者，畫面顯示總房間數、已預訂數、剩餘空房，按鈕 `onClick={() => bookRoom(1)}`。

使用者：原本的寫法可以不用 this 嗎

Gemini：可以不用 this。在純 JavaScript 中，如果想避免使用建構子與 this 關鍵字，最直接的方式是使用工廠函式（Factory Function）。工廠函式只是一個普通函式，它直接傳回一個包含屬性與方法的全新物件：`function createHotel(name, rooms, booked) { return { name, rooms, booked, checkAvailability() { return rooms - booked; } }; }`，使用方式不需要用 new，`const quayHotel = createHotel('Quay', 40, 25); console.log(quayHotel.checkAvailability()); // 15`。工廠函式的優點：完全不需要 this，不會有 this 指向改變或丟失作用域的問題；呼叫更簡單，不用加 new 關鍵字；利用閉包（Closure），checkAvailability 可以直接存取傳入的 rooms 與 booked 變數。

使用者：剛剛的工廠函式不是模板嗎

Gemini：是的，工廠函式同樣是模板。「模板」指的是一種程式設計的概念與架構，而不是某種特定語法。不論是建構子函式還是工廠函式，它們的作用都是作為產生新物件的藍圖。建構子函式：使用 this 指向新物件，並強制搭配 new 關鍵字呼叫；透過原型鏈（Prototype Chain）分享方法，相對節省記憶體。工廠函式：不使用 this，也不需要 new，直接在函式內部回傳一個新物件；利用閉包（Closure）鎖住變數，每次呼叫都會回傳全新結構的物件。兩者本質上都是用來「批量生產具有相同屬性與方法之物件」的模板，只是底層運作機制與語法風格不同。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
| --- | --- | --- |
| 本篇 Gemini 對話 | https://gemini.google.com/app/f8c8f75864a839a1 | 2026-08-27 擷取 |
| MDN — Object prototypes（建構子與原型鏈） | https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Advanced_JavaScript_objects/Object_prototypes | 2026-08-27 查證 |
| MDN — Closures | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures | 2026-08-27 查證 |
| React 官方文件 — Reusing Logic with Custom Hooks | https://react.dev/learn/reusing-logic-with-custom-hooks | 2026-08-27 查證 |
| React 官方文件 — useState（函式型更新 updater function） | https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state | 2026-08-27 查證 |
