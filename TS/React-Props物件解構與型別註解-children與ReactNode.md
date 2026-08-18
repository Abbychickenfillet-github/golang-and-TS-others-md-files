---
title: React Props 物件解構與型別註解：children 與 React.ReactNode
type: topic-note
source: Gemini
tags: [gemini, typescript, react, nextjs, 解構, 型別註解, children, react-node, props]
aliases: [children是什麼, ReactNode型別, RootLayout解構語法]
related:
  - "[[TYPESCRIPT_PARAMETERS_GUIDE]]"
  - "[[import-type-vs-interface]]"
  - "[[多重賦值]]"
sources:
  - https://gemini.google.com/app/3cdb9f6f5886409e
updated: 2026-08-14
---

# React Props 物件解構與型別註解：children 與 React.ReactNode

> 與 [[TYPESCRIPT_PARAMETERS_GUIDE]] 相關的原因：那篇整理 TypeScript 函式參數的一般規則，這篇是它在 React 元件上最高頻的具體應用場景（props 解構加行內型別註解）。
> 與 [[import-type-vs-interface]] 相關的原因：這篇提到把行內型別抽成 `interface RootLayoutProps` 的寫法，那篇則說明 `type` 與 `interface` 該怎麼選與怎麼匯入。
> 與 [[多重賦值]] 相關的原因：JS／TS 的解構賦值與 Python 的多重賦值是同一個「一次拆開多個值」的思路，跨語言對照著看比較不會混淆。

**本篇重點 a–i，共 9 個。**

## 重點整理

### 一、把一行語法拆成三段來看

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Script src="https://example.com/script.js" />
    </html>
  )
}
```

(a) <mark style="background: #FFF3A3A6;">`{ children }`（參數與解構）</mark>：React 元件收到的參數統稱 <mark style="background: #ADCCFFA6;">props（一個物件）</mark>。這裡用的是 JavaScript 的<mark style="background: #ADCCFFA6;">物件解構（Object Destructuring）</mark>，意思是「直接從傳入的 props 物件中取出 `children` 這個屬性」。

```jsx
// 等價於這樣寫
function RootLayout(props) {
  const children = props.children;
  // ...
}
```

(b) <mark style="background: #FFF3A3A6;">`:`（型別分隔號）</mark>：冒號後面接的是 TypeScript 的型別定義，用來規範傳入的 props 物件該長什麼樣子。

(c) <mark style="background: #FFF3A3A6;">`{ children: React.ReactNode }`（型別註解）</mark>：指定 props 物件必須有一個叫 `children` 的 key，其值型別是 `React.ReactNode`。

> [!tip] 不寫成一行的版本（推薦，可讀性較好）
> ```tsx
> import Script from 'next/script'
>
> // 1. 先把 Props 型別單獨定義出來
> interface RootLayoutProps {
>   children: React.ReactNode;
> }
>
> // 2. 在函數參數中使用該型別
> export default function RootLayout({ children }: RootLayoutProps) {
>   return (
>     <html lang="en">
>       <body>{children}</body>
>       <Script src="https://example.com/script.js" />
>     </html>
>   )
> }
> ```

### 二、`children` 到底代表什麼

(d) `children` 是 React 的<mark style="background: #ADCCFFA6;">特殊 prop</mark>，本質是「<mark style="background: #FFF3A3A6;">被包在元件標籤內部的任何內容</mark>」，<mark style="background: #FF5582A6;">不一定是頁面</mark>。

(e) 在 Next.js App Router 的 `RootLayout` / `layout.tsx` 中，傳進來的 `children` <mark style="background: #BBFABBA6;">通常</mark>是當前路由對應的 `page.tsx` 或下一層的子佈局。

(f) 在一般元件（Button、Card、Modal）中，`children` 可以是字串、圖片、甚至另一個元件：

```tsx
// Card 元件內部接收 children
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card-box">{children}</div>
}

// 使用時，裡面的 <h2> 和 <p> 就是 children
<Card>
  <h2>標題</h2>
  <p>這是卡片內容</p>
</Card>
```

(g) 這個概念<mark style="background: #BBFABBA6;">直接沿用自 HTML 的 DOM 樹狀結構</mark>：在 `<div class="box"><span>Hello</span></div>` 中，`<span>` 就是 `<div>` 的 child。React 只是把「嵌套在標籤裡面的元素」統一命名為 `children` prop 傳入。

### 三、這是 Next.js 專屬寫法嗎

> [!important] 結論
> <mark style="background: #FF5582A6;">跟 Next 或 Vite 完全無關</mark>。這是 <mark style="background: #BBFABBA6;">React 本身的核心機制</mark>，語法則是 <mark style="background: #BBFABBA6;">TypeScript 的標準語法</mark>。

(h) 不論用 Vite、Next.js、Remix 還是 Create React App，只要寫的是 React ＋ TypeScript，定義子元件 props 的寫法<mark style="background: #FFF3A3A6;">完全一模一樣</mark>：

```tsx
// 在 Vite + React + TS 專案裡也是這樣寫
function MyContainer({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
```

<mark style="background: #D2B3FFA6;">打包工具（Vite / Next / CRA）決定的是「怎麼編譯與打包」，不是「元件怎麼寫」</mark>，這兩件事要分開理解。

### 四、`React.ReactNode` 是什麼

(i) 它是 React 官方型別庫 <mark style="background: #ADCCFFA6;">`@types/react`</mark> 所定義的 TypeScript 型別，代表<mark style="background: #FFF3A3A6;">「任何可以被 React 渲染出來的內容」</mark>，是 React 中<mark style="background: #BBFABBA6;">範圍最廣</mark>的 UI 型別。

它涵蓋：

- JSX 元素（`<div />`、`<MyComponent />`）
- 字串 `string` 與數字 `number`
- 陣列或片段（`React.ReactFragment`）
- `null` 或 `undefined`（代表不渲染任何東西）
- 布林值 `boolean`（React 會自動忽略不渲染）

| 型別 | 範圍 | 典型用途 |
|---|---|---|
| <mark style="background: #ADCCFFA6;">`React.ReactNode`</mark> | 最廣，含字串、數字、陣列、null | <mark style="background: #BBFABBA6;">最常用，`children` 的預設選擇</mark> |
| `React.ReactElement` | <mark style="background: #FFB8EBA6;">較窄</mark>，只代表單一 JSX 元素 | 需要確保傳進來的一定是元件而非純文字時 |

> [!warning] 選型提醒
> 如果你把 `children` 標成 `React.ReactElement`，那麼 `<Card>純文字</Card>` 這種用法就<mark style="background: #FF5582A6;">會被 TypeScript 擋下來</mark>。除非你真的要限制只能傳元件，否則 `children` 一律用 `React.ReactNode` 最安全。

## 自我測驗

### 填空（點擊顯示答案）

1. `function RootLayout({ children }: { children: React.ReactNode })` 中，第一個大括號是 ||物件解構（取出 props 裡的 children）||，第二個大括號是 ||TypeScript 型別註解（規範 props 的形狀）||。
2. React 元件接收到的參數統稱為 ||props||。
3. `React.ReactNode` 定義在哪個套件中？ ||`@types/react`（React 官方型別庫）||。
4. 範圍比 `ReactNode` 窄、只代表單一 JSX 元素的型別是 ||`React.ReactElement`||。
5. `children` 這個概念直接沿用自 ||HTML 的 DOM 樹狀結構（父子節點關係）||。

### 是非題

1. `children` 一定是指其他頁面。 → ||✗ 錯。在 Next.js layout 中通常是頁面沒錯，但在一般元件裡 children 可以是字串、圖片或任何嵌套內容。||
2. 這種 props 解構加型別註解的寫法是 Next.js 專屬的。 → ||✗ 錯。這是 React 核心機制加 TypeScript 標準語法，Vite、Remix、CRA 寫法完全相同。||
3. `React.ReactNode` 允許值為 `null` 或 `undefined`。 → ||✓ 對。代表「不渲染任何東西」，這也是它範圍最廣的原因之一。||
4. 把 `children` 型別標成 `React.ReactElement` 比 `React.ReactNode` 更嚴謹，所以應該優先使用。 → ||✗ 錯。它會擋掉 `<Card>純文字</Card>` 這類合法用法，除非真的要限制只收元件，否則 `children` 應該用 `ReactNode`。||

### 申論題

1. 為什麼說「打包工具決定的是怎麼編譯打包，不是元件怎麼寫」？請以本篇的 `children` 寫法為例，說明把「框架 / 函式庫」與「建置工具」混為一談會造成什麼學習上的困擾。
2. 假設你要寫一個 `<Modal>` 元件，需要分別接收「標題區」與「內容區」兩塊 JSX。請說明為什麼單靠 `children` 不夠用，以及有哪些常見解法（多個 props、具名 slot、Compound Component）。

## 各對話來源（原文摘要）

### TypeScript 解構與型別註解（2026-08）— https://gemini.google.com/app/3cdb9f6f5886409e

使用者：貼上 Next.js `RootLayout` 的程式碼，問「`children,` 是傳入參數嗎？我忘記 TS 的 SYNTAX 了跟我介紹一下」。

Gemini：確認 `{ children }` 就是傳入的參數，並把語法拆成解構、型別分隔號、型別註解三部分，附上等價的 `props.children` 寫法與抽出 `interface` 的清晰版本，最後說明 `children` 在 React 中的意義。整合進上方 (a)～(c) 與第二節。

使用者：這邊的 CHILDREN 指的都是其他頁面嗎？只有 next 這樣寫還是連 vite 都這樣寫？還是其實跟框架無關？`React.ReactNode` 是 react 官方定義的語法？

Gemini：分三點回答——children 不限於頁面（附 Card 元件範例並連結到 HTML DOM 的 child 概念）；寫法與打包工具完全無關，是 React 核心機制加 TS 標準語法；`React.ReactNode` 出自 `@types/react`，並列出它涵蓋的所有型別以及與 `React.ReactElement` 的範圍差異。整合進上方 (d)～(i)。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/3cdb9f6f5886409e | 對話日期 2026-08、整理日 2026-08-14 |
| React 官方：以 JSX 傳遞 children | https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children | 查證日 2026-08-14 |
| React TypeScript 官方指引（含 ReactNode 使用建議） | https://react.dev/learn/typescript | 查證日 2026-08-14 |
| Next.js App Router Layout（`children` 為必填 prop） | https://nextjs.org/docs/app/api-reference/file-conventions/layout | 查證日 2026-08-14 |
| `@types/react` 型別定義原始碼 | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react | 查證日 2026-08-14 |

> [!check] 查核結果
> 本篇 Gemini 的說明經對照 React 與 Next.js 官方文件，內容<mark style="background: #BBFABBA6;">正確無誤</mark>，未發現錯誤或過時之處。

> [!warning] ⚠️ 小提醒
> `React.ReactFragment` 這個型別名稱在較新版本的 `@types/react`（React 18 之後的型別整理）中已被淡化，官方多半直接說 ReactNode 涵蓋 <mark style="background: #FFB8EBA6;">`Iterable<ReactNode>`</mark>。概念不變，但若在程式碼中直接引用 `React.ReactFragment` 可能會遇到棄用提示。

---

由 Gemini 對話自動整理 · 更新於 2026-08-14
