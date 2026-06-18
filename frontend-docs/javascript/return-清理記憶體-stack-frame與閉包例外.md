# `return` 到底清掉了什麼？Stack Frame 自動清 vs 閉包例外

> 相關：[[記憶體模型-stack-heap-動態配置-GC]]、[[變數宣告-let-const-var]]、[[設計模式_function]]
> 起點問題：「return 會清理記憶體喔」→ 對，但只清 Stack，不一定清 Heap。
> 互動考試：`C:\coding\JavaScript-practicing\memory-model-quiz.html`

---

## 一句話
> **`return` 清掉的是 Stack 上那一層「呼叫框架(stack frame)」——區域變數、參數自動消失；但 Heap 上的物件要等 GC，而且被「閉包」抓住的變數不會被清。**

---

## 1. 正常情況：return → stack frame 自動清

```js
function add(a, b) {
  const sum = a + b;   // a, b, sum 都在這次呼叫的 stack frame
  return sum;
}
add(1, 2); // 一 return,這個 frame 整個 pop 掉,a/b/sum 立刻消失
```

每呼叫一次函式 → push 一個 frame；return → pop 掉。這是**自動、即時**的，不需要 GC，也是為什麼 stack「快」。

---

## 2. Heap 上的物件：return 不一定清，看「還有沒有人指著它」

```js
function make() {
  const obj = { big: "data" };  // obj 實體在 HEAP
  return obj;                   // 把「地址」回傳出去
}
const x = make();  // x 還指著那個 heap 物件 → 沒被清,還活著
```

`make` 的 stack frame 清掉了,但 heap 物件因為 `x` 還指著它 → **GC 不會回收**。
反過來,如果沒人接：

```js
function make() { const obj = { big: "data" }; return obj.big; }
make(); // 回傳字串後,沒人指 obj → 變垃圾 → 下次 GC 回收
```

---

## 3. ⭐ 閉包例外：return 一個函式,卻把變數「留住」

這是最反直覺、也最重要的：

```js
function counter() {
  let count = 0;              // 照理 return 後 count 該消失...
  return function () {        // ...但回傳的函式「抓住」了 count
    return ++count;
  };
}
const next = counter();  // counter 的 frame 結束了
next(); // 1
next(); // 2  ← count 還活著!沒有歸零、沒被清
```

**為什麼？** 因為回傳的內層函式仍然「引用」`count`,所以 `count` 被搬去 heap 保管(閉包環境),只要 `next` 還在,`count` 就不會被 GC 清。
→ 這就是 `closure_counter.html`、`closure_shop.html` 能持續記住狀態的原因。

---

## 4. 收尾對照表

| 東西 | 放哪 | return 後 | 何時真正釋放 |
|---|---|---|---|
| 參數、區域原始值 | Stack frame | **立即清** | return 當下 |
| 沒人指的物件 | Heap | frame 清，物件變垃圾 | 下次 GC |
| 有人接住的物件 | Heap | 不清 | 等到沒人指 + GC |
| 被閉包抓住的變數 | Heap（閉包環境） | **不清** | 閉包本身沒人用 + GC |

> 口訣：**Stack 靠 return 自動清，Heap 靠 GC，閉包是「故意不清」的設計。**
