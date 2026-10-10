---
title: adopt-buffer-MIN_SIZE與TypedArray-Uint8-Uint32位元寬度
type: topic-note
source: Gemini
category: tech
tags:
  - javascript
  - TypedArray
  - Uint32Array
  - Buffer
  - css-tree
  - GC
sources:
  - https://gemini.google.com/app/0fa113dfd0ee9e71
  - https://gemini.google.com/app/94446417665b7298
updated: 2026-10-10
---
# adopt-buffer-MIN_SIZE與TypedArray-Uint8-Uint32位元寬度

## 本篇大綱

1. [[#這個檔案裡的 Buffer 到底是什麼]]
    1. [[#⬛ 退一步：這條 Uint32Array 底下是什麼 —— ArrayBuffer]]
    2. [[#🔑 這才是非用 32-bit 不可的真正原因（補強下面的 (k)）|這才是非用 32-bit 不可的真正原因]]
    3. [[#那「buffer」這個詞本身呢]]
2. [[#重點整理]] — (a)–(l) 共 12 點
3. [[#各對話來源（原文節錄）]]
    1. [[#程式碼中 MIN_SIZE 定義解析 — https://gemini.google.com/app/94446417665b7298|程式碼中 MIN_SIZE 定義解析]]
    2. [[#Vue.js 中的 v-model 雙向綁定 — https://gemini.google.com/app/0fa113dfd0ee9e71|Vue.js 中的 v-model 雙向綁定]]
4. [[#資料來源（含查證時間）]]

> 💡 本檔有虛線底線的名詞可滑鼠移上去看解釋，需先啟用 CSS 片段：**設定 → 外觀 → CSS 程式片段 → 重新整理 → 打開 `term-tooltip`**。完整互動版（含記憶體格子圖）請開同名 `.html`。

## 這個檔案裡的 Buffer 到底是什麼

**就是一條 `Uint32Array`** —— 一塊連續記憶體，每格固定 4 bytes，專門存 CSS tokenizer 掃描過程中產生的「純數字<span class="term" data-def="metadata：描述資料的資料。這裡存的不是 CSS 文字本身，而是「關於那段文字的資訊」—— 它從第幾個字元開始、到第幾個字元結束、是什麼型別、在第幾行第幾欄。就像書的目錄不是書的內容，但告訴你內容在哪裡。">中繼資料</span>」。

它不是檔案內容，也不是字串。原始 CSS 文字另外存在 `source` 裡；buffer 只存「第幾個字元到第幾個字元是一個 <span class="term" data-def="詞法單元：tokenizer 把一長串 CSS 文字切成的最小有意義單位，例如一個選擇器名稱、一個冒號、一個數值、一個分號。切完才輪到 parser 組成語法樹。">token</span>、它是什麼型別、在第幾行第幾欄」這類<span class="term" data-def="也就是「位置資訊」—— 第幾個字元、第幾行、第幾欄、第幾號型別，全部都是整數，所以才塞得進 Uint32Array。">座標與編號</span>。

### ⬛ 退一步：這條 Uint32Array 底下是什麼 —— ArrayBuffer

> 📌 完整版（含逐行註解、記憶體格子圖、滑鼠移上去看單字解釋）在同名 `.html`。這裡只留骨架。

```js
var buffer = new ArrayBuffer(8);     // 8 的單位是 byte 不是 bit → 8 bytes = 64 bits
                                     // 請 V8 幫你跟作業系統要一塊連續、固定長度的原始記憶體
                                     // 這塊在 V8 的 JS heap「外面」，JS 只拿到持有指標的包裝物件

buffer[0] = 5;                       // ⚠️ 只是在物件上掛普通屬性，底層 bytes 一個都沒動
new Uint8Array(buffer);              // [0,0,0,0,0,0,0,0] ← 證明沒寫進去

var z = new Uint8Array(buffer, 1, 4);
//                     buffer, byteOffset=1, length=4
//                     → 借用同一塊，從 byte 1 開始，蓋住 byte 1~4
z.buffer === buffer                  // true 沒有複製
```

三層關係：**`ArrayBuffer`（有記憶體、不能讀寫）→ 套上 `TypedArray` 視圖（沒記憶體、決定幾個 byte 算一個數字）→ 才有 `u32[0]` 這個可讀寫的數字。**

- **TypedArray 永遠只是視圖**，沒有「不是視圖的 TypedArray」。`new Uint32Array(8)` 沒給 buffer，是引擎偷偷幫你 new 一個 32 bytes 的 ArrayBuffer，用 `.buffer` 挖得出來。
- **`byteOffset` 要對齊**：`new Uint32Array(buffer, 1)` 會噴 `RangeError`，Uint32 的 offset 只能是 0、4、8…
- **ES2024 起「固定長度」不再絕對**：`new ArrayBuffer(8, { maxByteLength: 16 })` 可 `.resize()`；一般寫法的 `.resizable` 仍是 `false`。`.transfer()` 則會轉移所有權並讓原本那個 `.detached === true`，這是 Worker 零複製傳遞的基礎。

**css-tree v3.2.1 實際只有四個地方呼叫 `adoptBuffer`，就是這四條 buffer：**

| 呼叫處 | buffer | 長度 | 一格存什麼 |
| --- | --- | --- | --- |
| `TokenStream.js:56` | `offsetAndType` | `source.length + 1` | **一個 token 一格**：高 8 bits 放 token 型別，低 24 bits 放結束 offset |
| `TokenStream.js:57` | `balance` | `source.length + 1` | 括號／大括號的配對位置（哪個 index 跟哪個 index 成對） |
| `OffsetToLocation.js:12` | `lines` | `sourceLength` | **一個字元一格**：這個字元在第幾行 |
| `OffsetToLocation.js:13` | `columns` | `sourceLength` | 這個字元在第幾欄 |

**為什麼長度用 `source.length`？** 因為 token 數事先不知道，所以拿「最壞情況 ＝ 每個字元都自成一個 token」當上界先開好，寧可開大也不要中途擴容。

### 🔑 這才是非用 32-bit 不可的真正原因（補強下面的 (k)）

```js
const OFFSET_MASK = 0x00FFFFFF;   // 低 24 bits
const TYPE_SHIFT  = 24;
offsetAndType[index] = (type << TYPE_SHIFT) | end;   // 型別與 offset 打包進同一個數字
```

白話：**它把兩個資訊塞進同一個 32-bit 整數** —— 左移 24 位把 token 型別推到高 8 bits，再用 `|` 把結束 offset 填進低 24 bits。一格就同時回答「這是什麼 token」和「它到哪裡結束」，不必開兩條陣列。所以不是「32-bit 比較夠用」，是**結構上需要 24+8 這個切法**，Uint8Array 根本塞不下。

副作用：offset 只有 24 bits，上限 16,777,215 —— 也就是 css-tree 能處理的 CSS 原始碼**最大約 16 MB**。

### 那「buffer」這個詞本身呢

通用定義是「一塊事先配置好、大小固定的連續記憶體，用來暫存正在流動中的資料」，存在的理由是**兩端速度對不上**（例如讀檔、網路封包）。

但 **css-tree 用的是另一種意思**：它不是接資料流的桶子，而是**可重複使用的工作區（scratch space）**。同一個詞，這裡的重點在「重用」而不是「緩衝」—— 這也是 `adoptBuffer` 的 adopt（領養、沿用）這個字的由來。

> ⚠️ **別跟 cache 搞混**：buffer 解決「**速度／時機對不上**」或「**避免重複配置**」，cache 解決「**不想重算或重抓**」。兩者都是中間層，目的不同。

## 重點整理

- (a) <mark style="background: #ADCCFFA6;">adopt-buffer</mark> 是 css-tree（CSS parser 套件）內部的小工具函式：呼叫端傳入「既存的 Buffer（上一輪已配置好的 TypedArray）」與需要的 `size`，容量夠就原樣回傳重用，不夠才配置新的。
- (b) 目的是<mark style="background: #BBFABBA6;">減少記憶體配置與 <span class="term" data-def="Garbage Collection：引擎自動找出沒人再引用的物件並釋放記憶體。回收當下會短暫暫停 JS 執行，配置越頻繁就暫停越頻繁，表現出來就是卡頓。">GC（垃圾回收）</span>壓力</mark>：若每次解析都 `new Uint32Array(size)`，會頻繁配置並觸發 V8 垃圾回收，造成卡頓。
- (c) 這裡的 Buffer 就是「放資料的容器」：連續記憶體，裡面存 token 的起訖 offset、字元碼、換行位置等數字。
- (d) 可信的實作形狀（依我所知 css-tree 原始碼）：`const MIN_SIZE = 16 * 1024;`，容量不足時 `return new Uint32Array(Math.max(size + 1024, MIN_SIZE))`，足夠時 `return buffer`。
- (e) <mark style="background: #FFF3A3A6;">MIN_SIZE = 16 * 1024 是 16384 個「元素」，不是 16 KB</mark>；`Uint32Array` 每元素 4 Bytes，所以實際是 16384 × 4 = 65536 Bytes = 64 KB。
- (f) `Math.max(size + 1024, MIN_SIZE)`：需求小（例如 100）時取保底 16384；需求大（例如 20000）時取 `size + 1024 = 21024`，多預留 1024 個元素當緩衝。
- (g) `new Uint8Array(2)` 的 `2` 是「長度（元素個數）」，不是數值上限，總記憶體 = 2 × 1 Byte。
- (h) `uint8 = [1,2,3,...]` 沒有報錯，是因為這句是把變數 `uint8` <mark style="background: #FF5582A6;">重新賦值成一個普通 Array</mark>，原本的 Uint8Array 被丟棄，並不是改了 Uint8Array 的長度。
- (i) TypedArray 長度固定：`uint8[2] = 3` 寫入越界索引會被忽略，`uint8[2]` 仍是 `undefined`，`length` 仍為 2。
- (j) 8-bit 的限制在「元素值」：Uint8 範圍 0–255，存入 256 會 wrap（模 256）變 0，257 變 1。
- (k) Uint32Array 範圍 0–4,294,967,295，適合存索引與偏移量（offset），所以 css-tree 用 32-bit 而不是 8-bit。
- (l) 另一則對話順帶說明 Vue 的 <mark style="background: #ADCCFFA6;">v-model</mark>：它是 `:value` + `@input` 的語法糖，實現表單元素的雙向綁定；修飾符 `.lazy`（改在 change 事件同步）、`.number`（轉數字）、`.trim`（去頭尾空白）。

```js
var uint8 = new Uint8Array(2);
uint8[0] = 256; uint8[1] = 257;
console.log(uint8[0], uint8[1]);   // 0 1（wrap）
uint8[2] = 3;                      // 越界寫入被忽略
console.log(uint8.length, uint8[2]); // 2 undefined
```

```html
<input v-model="message">
<!-- 等同於 -->
<input :value="message" @input="message = $event.target.value">
```

| 型別 | 元素寬度 | 每元素 Bytes | 數值範圍 |
| --- | --- | --- | --- |
| Uint8Array | 8 bits | 1 | 0 – 255 |
| Uint32Array | 32 bits | 4 | 0 – 4,294,967,295 |

> ✅ **已查證結案（2026-10-10，實際下載 npm 套件 `css-tree@3.2.1` 讀原始碼 `lib/tokenizer/adopt-buffer.js`）**：真實實作就是下面這五行，**整段沒有任何複製舊資料的程式碼**，所以筆記原本懷疑的「第一版說法（`buffer.length * 2` 或 2048、會把舊資料複製過去）不可採信」**判斷正確**。另外也確認 `buffer.length < size` 比的是**元素個數**而不是 bytes，(e) 的說法成立。
>
> ```js
> const MIN_SIZE = 16 * 1024;
>
> export function adoptBuffer(buffer = null, size) {
>     if (buffer === null || buffer.length < size) {
>         return new Uint32Array(Math.max(size + 1024, MIN_SIZE));
>     }
>
>     return buffer;
> };
> ```
>
> 白話逐行：預設參數 `buffer = null` 代表第一次呼叫時根本還沒有 buffer；`buffer === null || buffer.length < size` 是「沒有、或現有的裝不下」兩種情況合在一起判斷；成立就配一條新的 `Uint32Array`，長度取「需求 +1024 緩衝」與「保底 16384」之中較大者；都不成立就 `return buffer` 把原本那條原封不動還回去。

相關筆記：[[CPU字長-TINYINT型別與OpenAPI資安雜記]]（位元寬度與數值範圍的基礎）、[[進位制-二進制-十六進制-Bytes與RGB]]。

## 各對話來源（原文節錄）

### 程式碼中 MIN_SIZE 定義解析 — https://gemini.google.com/app/94446417665b7298

使用者：所以他要第一次就拿到最少 16*1024 也就是 16KB 嗎……小於的話它是 return new Uint32Array 會將 size+1024？MIN_SIZE

Gemini：16 * 1024 不是 16 KB，是 16,384 個 32-bit 元素 = 64 KB；Math.max(size + 1024, MIN_SIZE) 小需求取保底，大需求再加 1024 緩衝。

使用者：`var uint8 = new Uint8Array(2);` 這邊 2 是什麼意思？`uint8 = [1,...,9]` 為何可以這樣寫？8 位的限制到底在哪？為何是 32-bit？

Gemini：2 是長度；重新賦值成普通 Array；8-bit 限制在元素值 0–255 溢位 wrap；32-bit 可存到約 42 億，適合索引與 offset。

### Vue.js 中的 v-model 雙向綁定 — https://gemini.google.com/app/0fa113dfd0ee9e71

使用者：v-model 是什麼意思

Gemini：v-model 是 Vue 指令，在表單元素或自訂組件上實現雙向資料綁定，本質是 v-bind 加 v-on 的語法糖，並介紹 .lazy / .number / .trim。

使用者：adopt buffer 是做什麼用的 → 既存的 buffer 是什麼意思，這邊的 buffer 是用來放東西的？

Gemini：adopt-buffer 是 css-tree 內用來重用記憶體 Buffer、減少 GC 壓力的函式；Buffer 就是放資料的容器，容量夠就重用，不夠才擴容。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
| --- | --- | --- |
| Gemini 對話（MIN_SIZE） | https://gemini.google.com/app/94446417665b7298 | 2026-10-07 擷取 |
| Gemini 對話（v-model / adopt-buffer） | https://gemini.google.com/app/0fa113dfd0ee9e71 | 2026-10-07 擷取 |
| MDN TypedArray | https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/TypedArray | 官方文件網址，未於本次逐條查證 |
| Vue 表單輸入綁定 | https://vuejs.org/guide/essentials/forms.html | 官方文件網址，未於本次逐條查證 |
| css-tree 原始碼 | https://github.com/csstree/csstree | **v3.2.1，2026-10-10 以 `npm pack css-tree` 下載套件實際讀取 `lib/tokenizer/adopt-buffer.js`、`TokenStream.js`、`OffsetToLocation.js` 核對完畢** |
