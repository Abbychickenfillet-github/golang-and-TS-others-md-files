---
title: "TypeScript any 與 unknown｜型別逃生艙口與斷言時機"
type: topic-note
source: Gemini
tags: [gemini, typescript, any, unknown, type-assertion, 型別系統, 逃生艙口]
sources:
  - https://gemini.google.com/app/f00083e09ec02fa5
updated: 2026-08-27
---

# TypeScript any 與 unknown｜型別逃生艙口與斷言時機

> [!info] 本篇重點 a–n 共 14 個
> 一條線走完：<mark style="background: #FFF3A3A6;">any 是什麼</mark> → <mark style="background: #FFF3A3A6;">為什麼不直接寫 string 就好</mark> → <mark style="background: #FFF3A3A6;">unknown 憑什麼比較安全</mark>。

> [!info] 與其他筆記的關聯（附理由）
> **a.** 承接 [[typescript-type-casting-and-hooks]]：那篇在講「怎麼把型別轉過去」，本篇補上前一步的「為什麼會需要轉」——因為手上拿到的是 `any` 或 `unknown`，編譯器不知道它是什麼，你才需要簽切結書。
> **b.** 呼應 [[ts-ignore]] 與 [[typeof-vs-ts-ignore]]：`@ts-ignore` 是「這一行不要檢查」，`any` 是「這個變數一輩子不要檢查」，兩者都是關閉保護的手段，差別只在作用範圍，可以放在一起理解「TypeScript 有哪幾種投降方式」。
> **c.** 呼應 [[import-type-vs-interface]]：本篇結論是「能定義結構就別用 any」，那篇正好給你定義結構的工具（`interface` 與 `type`）。
> **d.** 呼應 [[build-and-compilation/編輯器與執行環境-VSCode是Electron與Toolchain]]：同一場 Gemini 對話的後半段，從「TS 型別」聊到「TS 誰來編譯、誰來執行」，是本篇的下游。

---

## 重點整理

### 一、any 到底是什麼（e–g）

**e.** <mark style="background: #ADCCFFA6;">`any` 是 TypeScript 的「逃生艙口（Escape Hatch）」</mark>。當你把一個變數標註成 `any`，你等於在跟編譯器說：「這個變數以後別檢查了，我要像寫純 JavaScript 一樣自由。」

一行一行拆解這句經典範例：

```ts
let someValue: any = "this is a string";
```

| 片段 | 意思 |
|---|---|
| `let` | 宣告一個「可重新賦值」的變數（block scope，跟 `var` 的 function scope 不同） |
| `someValue` | 變數名稱，你自己取的 |
| `: any` | 型別註解（Type Annotation）。冒號後面那個字就是「這個變數被允許裝什麼」。寫 `any` 代表「什麼都行，而且不要檢查」 |
| `= "this is a string"` | 初始值。此刻它「執行期的真實型別」是 string，但「編譯期的靜態型別」被你釘死成 any |

**f.** 這代表下面這些明顯會爆炸的寫法，<mark style="background: #FF5582A6;">TypeScript 一句話都不會唸你</mark>：

```ts
let someValue: any = "this is a string";

someValue.toFixed();  // 執行時 TypeError（字串沒有 toFixed），但編譯時 TS 覺得 OK
someValue = 123;      // 型別隨意漂移也 OK
someValue.abc.def();  // 存取不存在的巢狀屬性也 OK
```

`toFixed` 是 `Number.prototype` 上的方法（把數字轉成固定小數位的字串），字串身上沒有這個方法，所以執行期一定丟 `TypeError`。但因為靜態型別是 `any`，型別檢查器整個放行。

**g.** <mark style="background: #FF5582A6;">滿滿 `any` 的專案，本質上就是「只是換了副檔名的 JavaScript」</mark>。你會一次失去三樣東西：

| 失去的東西 | 為什麼會失去 |
|---|---|
| 自動完成（IntelliSense） | 編輯器不知道這變數是什麼，當然沒東西可提示 |
| 重構安全性 | 改了欄位名稱，被標成 any 的地方不會報錯，錯誤延到執行期才炸 |
| 程式碼即文件 | 三個月後的你看不出這變數該裝什麼 |

---

### 二、那為什麼不直接把 any 換成 string 就好（h–j）

這是這場對話裡最好的一個追問。<mark style="background: #BBFABBA6;">答案是：能直接寫 `string` 就一定要直接寫 `string`</mark>。會出現「先 any 再斷言」，是因為遇到了「你控制不了的資料」。

**h.** <mark style="background: #ADCCFFA6;">資料來自外部世界（API 或 JSON）</mark>。

```ts
const data: any = JSON.parse(userInput);
const name = data as string;
```

`JSON.parse` 在 TypeScript 內建型別定義裡的回傳型別就是 `any`，因為一段 JSON 字串解出來可能是物件、陣列、數字、布林、null 或字串——編譯期根本不可能知道。所以你不能在宣告的當下就寫 `const data: string`，只能在「你自己確認過」之後用斷言告訴編譯器。

**i.** <mark style="background: #ADCCFFA6;">第三方套件的限制</mark>。老舊或寫得不嚴謹的 JavaScript 套件，回傳值本身就標 `any`。你改不動別人的原始碼，只能在接到結果後自己斷言回你要的型別。

**j.** <mark style="background: #ADCCFFA6;">型別收窄（Narrowing）的中繼站</mark>。一個變數可能是 `string` 也可能是 `null`，你得先經過判斷才能收窄。

決策速查：

| 情境 | 該怎麼寫 | 理由 |
|---|---|---|
| 變數是你自己定義、自己賦值 | `let name: string = "Tom"` | 從一開始就上鎖，裝錯編譯器立刻罵人 |
| 變數來自 API、檔案、資料庫、無型別的舊 JS | 先 `any` 或 `unknown`，再斷言或收窄 | 編譯期不可能預知，只能事後補償 |
| 只是懶得寫 interface | 不要用 any | 這是藉口，不是理由 |

> [!tip] 兩者的心智模型
> **直接寫 `string`** ＝ 打預防針。一開始就規定只能裝字串。
> **用 `as string`** ＝ 簽切結書。資料已經進來了，你簽字保證「我負責，這傢伙就是字串」。

---

### 三、unknown：更安全的那個選擇（k–n）

**k.** <mark style="background: #BBFABBA6;">現代 TypeScript 遇到「真的不知道型別」時，官方推薦 `unknown` 而不是 `any`</mark>。官方 Handbook 的說法是：`unknown` 是 `any` 的「type-safe counterpart（型別安全的對應物）」。

**l.** 兩者的差別只有一句話：<mark style="background: #FFF3A3A6;">什麼都能塞進去這點兩者相同，但 `unknown` 不能被拿去做任何事，`any` 可以</mark>。

| 特性 | `any`（危險） | `unknown`（安全） |
|---|---|---|
| 允許被賦予任何值 | ✅ | ✅ |
| 允許直接存取屬性或方法 | ✅ 完全不檢查 | ❌ 必須先收窄型別 |
| 可以被賦值給其他型別 | ✅ 全部都行 | ❌ 只能給 `unknown` 與 `any` |
| 心智定位 | 放棄型別檢查 | 「我還不知道是什麼，等我檢查完再說」 |

**m.** 實際差別長這樣：

```ts
let a: any = getSomething();
a.toUpperCase();          // 編譯過，執行期可能爆

let u: unknown = getSomething();
u.toUpperCase();          // ❌ 編譯就擋下來：Object is of type 'unknown'

if (typeof u === "string") {
  u.toUpperCase();        // ✅ 收窄成 string 之後才准用
}
```

`typeof u === "string"` 這行叫 <mark style="background: #ADCCFFA6;">型別守衛（Type Guard）</mark>。TypeScript 看得懂 `typeof` 的比較結果，會在 `if` 區塊裡把 `u` 的型別從 `unknown` 自動收窄成 `string`，這叫「控制流分析（Control Flow Analysis）」。

**n.** 所以 <mark style="background: #BBFABBA6;">`JSON.parse` 的回傳你可以自己收成 `unknown`</mark>，強迫自己在用之前先驗證：

```ts
const data: unknown = JSON.parse(userInput);

function isUser(v: unknown): v is { name: string } {
  return typeof v === "object" && v !== null && typeof (v as any).name === "string";
}

if (isUser(data)) {
  console.log(data.name);   // ✅ 這裡 data 已經是 { name: string }
}
```

`v is { name: string }` 是 <mark style="background: #ADCCFFA6;">型別謂詞（Type Predicate）</mark>——回傳 `true` 的時候，請把參數 `v` 當成那個型別。這是自訂型別守衛的寫法。

---

## ⚠️ 存疑／更正

| Gemini 說法 | 查證後 | 說明 |
|---|---|---|
| 「大家常說 Avoid any at all costs」 | 基本正確但要補一句 | 官方 Do's and Don'ts 的原文比較精準：除非你正在把 JavaScript 專案遷移成 TypeScript，否則不要用 `any`。編譯器對 `any` 的處理等同「請關掉這東西的型別檢查」 |
| 只列了 `any` 與 `unknown` | 少了一半 | 對話裡沒有提到 `unknown` 之所以安全的關鍵機制——**型別收窄**與**型別守衛**。沒有這兩個工具，`unknown` 只會讓人覺得「什麼都不能做很煩」就換回 `any`。本篇 m、n 兩節補上 |

---

## 練習題（延伸）

`any` 與 `unknown` 屬於型別系統議題，LeetCode 與 NeetCode 沒有對應題目（它們考演算法）。想練這一塊，社群公認的題庫是 **type-challenges**：

- type-challenges 題庫 — <https://github.com/type-challenges/type-challenges>
- 建議從 warm-up 與 easy 的 `Pick`、`Readonly`、`Tuple to Object` 開始，這幾題會逼你放棄 `any`、改用泛型與 `keyof`。

---

## 各對話來源（原文重點）

### 〈Laptop Architecture Detection Guide〉（2026 年，前半段）— <https://gemini.google.com/app/f00083e09ec02fa5>

**使用者：** `let someValue: any = "this is a string";` 這邊的 any 是？
**Gemini：** 在 TypeScript 的世界裡，any 被稱為「逃生艙口（Escape Hatch）」⋯⋯你是在告訴編譯器「放棄對這個變數進行任何型別檢查」。（後接 any 的本質、使用場景、any vs unknown 對照表）

**使用者：** 那為什麼不直接把 any 換成 string 就好
**Gemini：** 如果能直接用 string，當然應該直接用。之所以會出現「先用 any 再用斷言」，通常是因為遇到了無法預知或被迫接受的資料——資料來自外部世界（API 或 JSON）、第三方套件的限制、邏輯上的型別收窄。

> 註：這場對話的標題是「Laptop Architecture Detection Guide」，但內容其實橫跨三個主題。後半段的「VS Code 為什麼不用另外裝 runtime」已另立為 [[build-and-compilation/編輯器與執行環境-VSCode是Electron與Toolchain]]，架構偵測的部分見 [[計算機基礎/CPU架構偵測-x64與ARM64]]。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 原始對話（Gemini） | https://gemini.google.com/app/f00083e09ec02fa5 | 2026-08-27 讀取 |
| TypeScript Handbook — Everyday Types（any 的定義與 noImplicitAny） | https://www.typescriptlang.org/docs/handbook/2/everyday-types.html | 2026-08-27 查證 |
| TypeScript 3.0 Release Notes — unknown 型別的正式定義 | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html | 2026-08-27 查證 |
| TypeScript Do's and Don'ts — 不要用 any 的官方說法 | https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html | 2026-08-27 查證 |
| TypeScript Playground — Unknown and Never 範例 | https://www.typescriptlang.org/play/typescript/primitives/unknown-and-never.ts.html | 2026-08-27 查證 |
| type-challenges 型別練習題庫 | https://github.com/type-challenges/type-challenges | 2026-08-27 查證 |
