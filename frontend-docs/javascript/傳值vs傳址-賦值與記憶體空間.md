---
title: JS 傳值 vs 傳址、賦值與記憶體空間
type: topic-note
source: Gemini
tags: [gemini, javascript, 記憶體, 面試考點, TypeScript]
sources:
  - https://gemini.google.com/app/cdde71fb17e6c546
updated: 2026-06-20
---

# JS 傳值 vs 傳址、賦值與記憶體空間

## 重點整理

### 1. 基本型別「傳值」(Pass by Value)
把基本型別（Number、String、Boolean…）賦給新變數時，JS 會<mark style="background: #BBFABBA6;">開闢一塊全新、獨立的記憶體空間，把值複製一份過去</mark>。

```js
let a = 10;
let b = a;   // 傳值（複製）
b = 20;
// a 仍是 10，b 是 20 → 兩者各自獨立
```

<mark style="background: #ADCCFFA6;">傳值</mark>＝「複製一份全新的自己送到新家」，彼此在記憶體中各過各的。

### 2. 物件型別「傳址」(Pass by Reference)
物件（Object、Array、Function）賦值時複製的是<mark style="background: #ADCCFFA6;">記憶體參考地址（指標）</mark>，不是內容本身。

```js
let obj1 = { name: "Alice" };
let obj2 = obj1;        // 傳址（複製地址）
obj2.name = "Bob";
// obj1.name 也變成 "Bob" → 兩者指向同一個 Heap 物件
```

<mark style="background: #FFB8EBA6;">補充：</mark>即使是傳址，`obj2` 這個變數本身在 Stack 仍有自己的微小空間存放「地址」，只是它們指向的 Heap 實體是同一個。

### 3. 賦值(Assignment) ≠ 傳值(Pass by Value)
這是最容易混淆的點：

| 觀念 | 賦值 (Assignment) | 傳值 (Pass by Value) |
|---|---|---|
| 定義 | 程式語法中的「動作」（使用 `=` 運算子） | JS 底層的「記憶體行為」 |
| 關注點 | 變數現在要綁定哪一個資料？ | 傳過去時是複製獨立副本，還是共用地址？ |
| 反例 | 沒有反例，用 `=` 就是賦值 | 對比的是傳址；物件賦值時底層跑傳址，不產生新副本 |

一句話：<mark style="background: #FFF3A3A6;">「賦值」是你寫程式時的動作（把東西塞給變數）；「傳值」是 JS 在底層默默執行的複製機制。</mark>

> 💡 影印機比喻（解釋給同事聽）：賦值＝「在筆記本上寫字」這個動作；傳值＝執行 `b = a` 時，底層影印機把 a 的內容影印一份全新的貼到 b。因為是影印本，之後在 b 亂塗，a 完全不受影響。

### 4. 重新賦值會切斷舊指標 + 觸發 GC
不論 `d` 一開始是 `undefined` 還是空物件 `{}`，只要執行 `d = c`，結果相同：

```js
var c = { hello: '安安' };
var d = {};   // d 原本指向獨立空物件 B
d = c;        // d 指標斷開 B，改指向 c 的物件 A
c.hello = '你好';
console.log(c); // { hello: '你好' }
console.log(d); // { hello: '你好' }
```

原本那個空物件 `{}` 沒有任何變數引用，會被<mark style="background: #ADCCFFA6;">垃圾回收（Garbage Collection）</mark>自動清除釋放。

### 5. TypeScript 的差異：靜態型別檢查擋下來
若 `d` 先被推導為 `string`，再 `d = c`（物件），TS 編譯期就會報錯：

```ts
var d = '我是字串';  // TS 推導 d: string
d = c;               // ❌ Type '{ hello: string }' is not assignable to type 'string'
```

<mark style="background: #FF5582A6;">差別在編譯期，不在執行期：</mark>若強行編譯成 JS 執行，記憶體覆蓋邏輯跟前面完全一樣（型別限制在 JS 世界已消失）。要允許彈性，用 `any` 或聯合型別：

```ts
var d: any = '我是字串';  // 告訴 TS：什麼都可以裝
d = c;                    // ✅ 不報錯
```

## 各對話來源

### JavaScript 傳值與記憶體空間（2026-06）— https://gemini.google.com/app/cdde71fb17e6c546

**使用者：** JavaScript 傳值不同變數，他們會各在記憶體中創造不一樣的記憶體空間嗎？（我的說法）vs Joe 說「傳值是不是不會創造新的記憶體空間」，誰對？

**Gemini：** 你是對的，Joe 不準確。基本型別傳值會在記憶體開新空間並複製值（`let a=10; let b=a;` → b 改 20 不影響 a）。Joe 可能把基本型別的傳值跟物件的傳址搞混：物件 `let obj2=obj1` 指向同一空間，改 obj2 會連動 obj1，但 obj2 變數本身在 Stack 仍有自己的指標空間。

**使用者：** 要怎麼解釋給 Joe 聽「賦值跟傳值不同」？

**Gemini：** 用影印機比喻。賦值＝寫字/貼標籤的動作（只要用 `=`）；傳值＝底層影印機把值複製一份的記憶體機制（基本型別特有）。附對比表與對話範本。

**使用者：** `var c={hello:'安安'}; var d; d=c; c.hello='你好'`，如果先宣告 `var d={}` 結果會不同嗎？

**Gemini：** 完全相同。`d=c` 是重新賦值，d 指標斷開原本空物件改指向 A，原空物件被 GC 回收。兩者最後都印 `{hello:'你好'}`。

**使用者：** 那如果 TypeScript 一開始 `var d = 一個字串` 呢？

**Gemini：** 編譯期會報錯（型別不符），但強行轉 JS 執行結果相同。要允許用 `any` 或 Union Types。
