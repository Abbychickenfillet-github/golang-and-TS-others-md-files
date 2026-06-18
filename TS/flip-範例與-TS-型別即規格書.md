---
title: flip() 範例與 TypeScript「型別即規格書」
type: topic-note
source: Gemini
category: 技術
tags: [gemini, typescript, javascript, 型別, 靜態檢查]
sources:
  - https://gemini.google.com/app/785a8d546b192a30
updated: 2026-06-11
---

# flip() 範例與 TypeScript「型別即規格書」

## 重點整理

### JavaScript 沒有 flip() 方法

- 原生 String/Array/Object 都沒有 `flip()`。TS 官方文件的 `x.flip()` 是**虛構範例**,用來說明「JS 執行前無法得知 x 有沒有 flip 能力」,引出靜態型別檢查的好處。
- 看到 flip() 的其他可能:Lodash `_.flip(func)`(翻轉函式參數順序)、舊 jQuery 外掛的卡片翻轉、Canvas/遊戲引擎的 flipX()/flipY()。
- 陣列前後反轉的內建方法是 `reverse()`。

### 為什麼錯誤訊息說 "does not exist on type ..."

```typescript
const user = { name: "Daniel", age: 26 };
user.location; // Property 'location' does not exist on type '{ name: string; age: number; }'.
```

- TS 會自動推導(Infer)物件的「形狀」= 隱含的規格書,這就是 **Type(型別)**。`user` 的型別是 `{ name: string; age: number; }`。
- 存取 `user.location` 時 TS 對照規格書發現沒有這個屬性 → 報錯。目的:在執行前抓出打錯字(如 locatoin)的 bug。

### 為什麼 TS 不「建議 location 該是 string」

- TS 不知道你「少寫了」location——在它眼裡你是「無中生有」一個不存在的屬性,反應是「你是不是打錯字?」而不是「幫你補型別」。它是防呆不是通靈。
- 要讓 TS 提供建議,得**先寫好型別定義**:

```typescript
type User = {
  name: string;
  age: number;
  location?: string; // ? = 選填
};

const user: User = { name: "Daniel", age: 26 };
// 之後 user.location 不報錯,賦值時編輯器會提示必須是 string
```

### JS vs TS 的哲學差異

- JS:存取不存在的屬性**不算錯誤、不會終止執行**,淡定回傳 `undefined`("Non-exception Failure",物件是動態的)。
- TS:把 Type 的定義昇華成「形狀(Shape)= 嚴格規格書」,你寫物件字面量等於現場發明一個獨一無二的規格;不符規格在編譯階段直接攔截。
- 對「type 被濫用」的直覺是對的——TS 用近乎規格綁架的方式把 JS 允許的行為定義成錯誤,逼你把 `location?: string` 老老實實寫清楚。

| 特性 | JavaScript(寬容) | TypeScript(嚴格) |
|---|---|---|
| 核心態度 | 能跑就行,runtime 再說 | 不符規格連編譯都別想過 |
| 存取不存在屬性 | 回傳 undefined 繼續跑 | 編譯階段攔截報錯 |
| Type 是什麼 | 基本資料種類 | 精準到每個屬性的規格書 |

## 各對話來源

### JavaScript 的 flip() 方法(2026-06)— https://gemini.google.com/app/785a8d546b192a30

使用者:javascript 有 flip() 方法嗎 → Gemini:沒有,是 TS 文件虛構範例;另介紹 Lodash _.flip、jQuery 翻轉外掛、Canvas flipX/flipY;陣列反轉用 reverse()。

使用者:(貼 TS 文件錯誤訊息)為何屬性被翻譯成 type → Gemini:這裡的 type 是「型別」;TS 自動推導物件形狀為隱含規格書,location 不在規格書上所以報錯,這就是靜態型別檢查。

使用者:可是你的規格書也沒有建議 location 應該搭配什麼 value 啊 → Gemini:TS 不知道你「少寫」,它認為你「捏造」不存在的屬性(防呆不是通靈);要提示就先定義 type User { location?: string } 並標注物件。

使用者:JS 存取不存在屬性回傳 undefined 不算錯誤吧?我覺得 TS 有點濫用 type 這個字 → Gemini:JS 確實不算錯誤、不終止執行(Non-exception Failure);TS 把 Type 定義成「形狀=嚴格規格書」,是兩種哲學的碰撞;附 JS 寬容 vs TS 嚴格對照表。
