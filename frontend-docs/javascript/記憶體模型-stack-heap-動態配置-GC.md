# JavaScript 記憶體模型：Stack / Heap / 動態配置 / 垃圾回收

> 相關：[[變數宣告-let-const-var]]、[[loops-and-increment-operators]]、[[設計模式_function]]（閉包）、[[執行緒-非同步-延遲的差異]]
> 起點問題：「let 每次迴圈會不會建立新空間？物件地址在 stack、內容在 heap？何謂動態配置？為何要 GC？」
> 練習檔：`C:\coding\JavaScript-practicing\closure_counter.html`、`var_let_memory_scope.html`

---

## 一句話總結
> **原始值與「地址」放在 Stack（快、固定、自動清）；物件/陣列/函式的實體放在 Heap（大、動態、要 GC 清）。**

---

## 1. `let` 每輪迴圈 = 一個全新綁定（per-iteration binding）

`for (let i ...)` 每一輪迭代都會產生**全新的 `i` 綁定**（規範每輪複製值到新的詞法環境），所以迴圈內的閉包各自記住不同的值。
`var` 全程只有**一個**函式作用域的綁定，所有閉包共用 → 最後都看到結束值。

```js
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 0,1,2 ✅
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3,3,3 ❌
```

這是 [[設計模式_function]] 閉包計數器能各自記值的原理。

---

## 2. Stack vs Heap（概念模型）

```
變數 user ─┐  STACK：user = 0x7A3   ← 只存「地址 reference」
           └────────────► HEAP：0x7A3 → { name:"Abby", age:25 }
```

- **原始型別**（number, string, boolean, null, undefined, symbol, bigint）→ 值直接存。
- **物件 / 陣列 / 函式** → 變數只存**地址（指標）**，實體在 Heap。

```js
const a = { n: 1 };
const b = a;      // 複製「地址」不是內容
b.n = 99;
a.n;              // 99 — a、b 指向 heap 同一物件
```

> ⚠️ 這是**心智模型**，用來理解 100% 正確。但 V8 實際會最佳化（SMI 小整數內聯、escape analysis 把不外洩物件放 stack…），別當逐字實作。

---

## 3. 何謂「動態配置」(dynamic allocation)

關鍵 = **執行時(runtime)才決定大小與生命週期**。

| | Stack（靜態/自動） | Heap（動態） |
|---|---|---|
| 大小 | 編譯期已知、固定 | 執行時才知、可變 |
| 生命週期 | 函式 return 就自動清 | 不確定，等到「沒人用」 |
| 速度 | 快（移指標） | 慢（找空間、要管理） |
| 放什麼 | 原始值、地址、呼叫框架 | 物件、陣列、函式、閉包 |

「動態」= 寫程式時**無法預知**多大、活多久（`arr.push()` 會長大、閉包可能活很久）→ 只能 on demand 在 heap 配置。

---

## 4. 為何需要垃圾回收 (Garbage Collection)

Heap 的物件「何時沒人用」**無法靜態預測**（不像 stack return 就自動釋放），所以需要 GC：

> **mark-and-sweep**：從「根 roots」（全域、目前呼叫堆疊上的變數）出發，能走到的物件 = 還在用（mark），走不到的 = 垃圾（sweep 回收）。

「以前怎麼不知道」→ 因為 **JS/Python 全自動 GC**，從不用手動釋放。**C 語言**要自己 `malloc()` / `free()`，忘了 free 就記憶體洩漏 —— 對照 C 系背景的人問記憶體最有感。
