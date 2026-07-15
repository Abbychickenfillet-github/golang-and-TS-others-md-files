---
title: TypeScript 進階型別操作指南（7 大核心）
type: topic-note
source: Gemini
tags: [gemini, typescript, 型別, generics, mapped-types]
sources:
  - https://gemini.google.com/app/240e7ae7bc28a2fa
updated: 2026-06-19
---

# TypeScript 進階型別操作指南（7 大核心）

## 重點整理

### 1. Generics 泛型
型別世界的「參數」，讓函式／元件可重用又保留型別精準度。

```typescript
function identity<T>(arg: T): T { return arg; }
let a = identity<string>("Hello"); // a: string
let b = identity<number>(100);     // b: number
```

### 2. `keyof` Type Operator
從物件型別萃取所有 key 組成<mark style="background: #ADCCFFA6;">聯合型別</mark>。

```typescript
type Point = { x: number; y: number };
type P = keyof Point; // "x" | "y"
const axis: P = "x";  // OK；"z" 會報錯
```

### 3. `typeof` Type Operator
把現成 JS 變數/物件的結構「偷來」當型別。

```typescript
const config = { host: "localhost", port: 8080 };
type ConfigType = typeof config; // { host: string; port: number }
```

> [!question] 既然 newConfig 還是要重寫 host/port，為何用 typeof？
> 重點不是少寫程式，而是<mark style="background: #FFF3A3A6;">自動建立合約（防呆）＋避免重工</mark>：
> - **防呆/自動補全**：打錯 `hoost` 或把 `port` 寫成字串，TS 立刻噴紅字；純 JS 不會報錯，會等到線上崩潰。
> - **100 個屬性時**：`type ConfigType = typeof config` 一秒收工，原始 config 新增欄位時型別<mark style="background: #BBFABBA6;">自動同步</mark>，不必手寫 100 個屬性。
> - **結構一致**：config 是預設值、newConfig 是正式環境，值可不同但「結構/型別」被強制一模一樣。
> 比喻：JS 關心「值」（localhost→127.0.0.1），TS 的 typeof 關心「尺寸與剪裁」——衣服可換人穿，但尺寸必須合身。

### 4. Indexed Access Types 索引訪問型別
用 `Type['key']` 抽取某屬性的型別。

```typescript
type Person = { age: number; name: string; alive: boolean };
type Age = Person["age"];              // number
type All = Person[keyof Person];       // number | string | boolean
```

### 5. Conditional Types 條件型別
型別層的 if/else：`X extends Y ? A : B`。

```typescript
interface Animal { live(): void; }
interface Dog extends Animal { woof(): void; }
type E1 = Dog extends Animal ? number : string;    // number
type E2 = RegExp extends Animal ? number : string; // string
```

### 6. Mapped Types 映射型別
型別世界的 `map()`，巡覽舊型別每個 key 建立新型別（批量改 readonly／optional／轉型）。

```typescript
type FeatureFlags = { darkMode: () => void; newUserProfile: () => void };
type OptionsFlags<T> = { [P in keyof T]: boolean };
type FeatureOptions = OptionsFlags<FeatureFlags>;
// { darkMode: boolean; newUserProfile: boolean }
```

### 7. Template Literal Types 樣板字面量型別
用樣板字串組合字面量型別。

```typescript
type Event = "change" | "click";
type OnEvent = `on${Capitalize<Event>}`; // "onChange" | "onClick"
const handler: OnEvent = "onClick"; // OK；"onHover" 報錯
```

## 各對話來源

### TypeScript 進階型別操作指南（2026-06）— https://gemini.google.com/app/240e7ae7bc28a2fa

使用者：請一個一個展示這每個要怎麼用（附 image.png，7 個概念）

Gemini：以投影片風格逐一示範 Generics、keyof、typeof、Indexed Access Types、Conditional Types、Mapped Types、Template Literal Types，各附程式碼範例（如上）。

使用者：還是看不懂為何要這樣寫 `type ConfigType = typeof config`，最後還是重寫了 host/port 啊

Gemini：重點不是少寫程式，而是自動建立合約（防呆）與避免重工：①防呆/自動補全（打錯字或型別錯立刻報錯）；②屬性很多時一行搞定、會自動同步；③強制 newConfig 結構與 config 完全一致。比喻：JS 關心值、TS 的 typeof 關心尺寸剪裁，衣服可換人穿但尺寸要合身。
