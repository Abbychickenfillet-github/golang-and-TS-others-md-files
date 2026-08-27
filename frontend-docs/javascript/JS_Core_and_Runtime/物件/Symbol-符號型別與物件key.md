
---

## 歸檔判準｜這段程式碼該放 Symbol 還是 Object 那邊（2026-08-20）

> [!question] 起因
> 這段程式碼同時碰到 `Symbol()`、`Symbol.for()` 與 `Object.getOwnPropertySymbols()`，不知道該歸哪邊：
> ```js
> const object1 = {};
> const a = Symbol('a');
> const b = Symbol.for('b');
> // object1[a] = 'async';
> object1[b] = 'await';
> console.log(Object.getOwnPropertySymbols(object1));
> ```

### 判準：問「這段在教什麼」，不是「這段用到什麼」

一段程式碼幾乎一定會用到好幾個 API，但它通常**只在教一件事**。歸檔看的是**主題**，不是出現過的名字。

| 這段在教 | 歸到 |
| --- | --- |
| Symbol 這個**型別**怎麼運作（唯一性、登錄表、當 key 的性質） | Symbol 這篇 |
| 哪個**列舉方法**撈得到 Symbol 鍵 | [[Object靜態方法速查]]／[[屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys]] |

### 那段程式碼的實際判定

**它其實在教 `Object.getOwnPropertySymbols`**，不是在教 Symbol。證據是：把 `Symbol.for('b')` 換成普通的 `Symbol('b')`，**輸出完全一樣** —— 那段沒有真的示範到 `Symbol()` 與 `Symbol.for()` 的差別，只是「碰巧用到」。

另外那段有兩個小狀況：

```js
// object1[a] = 'async';    ← 這行被註解掉了
objectSymbols.length        // 1，不是 2
object1[a]                  // undefined，因為根本沒放進去
```

### 結論：拆成兩份，各自歸家

| 檔案 | 位置 | 主題 |
| --- | --- | --- |
| `symbol-vs-symbol-for-demo.js` | 本篇同資料夾 | `Symbol()` vs `Symbol.for()`、`Symbol.keyFor`、跨模組共用、三個常見誤會 |
| `object-getOwnPropertySymbols-demo.js` | `JS_CheatSheet_and_APIs/物件/` | 四種 key × 八個方法的涵蓋範圍、半私有欄位、鍵的排序 |

> [!tip] 遇到「兩邊都像」的通用作法
> **拆開，各放各的，然後互相連結。** 不要把一份混合檔硬塞進其中一邊 ——
> 那樣未來從另一邊找就找不到，這正是當初把 plain object、物件陣列、Map 混在一起的老問題。

### 順便：`Symbol()` 與 `Symbol.for()` 真正的差別

```js
Symbol('key') === Symbol('key')           // false ← 每次都是全新的
Symbol.for('key') === Symbol.for('key')   // true  ← 查全域登錄表，有就拿舊的
Symbol('key') === Symbol.for('key')       // false ← 兩套系統不相通

Symbol.keyFor(Symbol.for('key'))          // "key"     ← 查得到
Symbol.keyFor(Symbol('key'))              // undefined ← 不在登錄表裡
```

**description 只是給人看的標籤，不是身分證。** 經驗法則：預設用 `Symbol()`，只有「不同檔案要拿到同一個 Symbol」時才用 `Symbol.for()`。

---

## MDN 那三行的教學重點是什麼（2026-08-21）

```js
const sym1 = Symbol();
const sym2 = Symbol("foo");
const sym3 = Symbol("foo");
```

> [!question] 疑問：這是在教「把 Symbol key 存成變數」嗎？
> **不是。** 這三行的重點是**唯一性 uniqueness**。它們是刻意這樣排的，因為 MDN 的下一行就是：
> ```js
> sym2 === sym3;   // false
> ```

### 三行各自的角色

| 變數 | 寫法 | `description` | 用來示範 |
| --- | --- | --- | --- |
| `sym1` | `Symbol()` | `undefined` | 描述**可以不給** |
| `sym2` | `Symbol("foo")` | `"foo"` | 給了描述 |
| `sym3` | `Symbol("foo")` | `"foo"` | **描述跟 sym2 一模一樣** |

安排 `sym2` 與 `sym3` 用同一個描述，就是為了讓 `sym2 === sym3` 是 `false` 這件事顯得突兀。
**`description` 只是給人看的標籤，不是身分證。**

```js
String(sym1);   // "Symbol()"     ← 括號裡是空的
String(sym2);   // "Symbol(foo)"
String(sym3);   // "Symbol(foo)"  ← 印出來跟 sym2 一模一樣，但不是同一個
```

### 但「要存進變數」這個直覺不算錯，它是唯一性的「後果」

因為每個 Symbol 都是全新的身分，**你沒辦法靠重打一次同樣的字把它找回來**：

```js
const obj = {};
obj[Symbol('id')] = 9453;      // 沒存進變數

obj[Symbol('id')];             // undefined ← 拿不回來了
Object.getOwnPropertySymbols(obj);   // [Symbol(id)] ← 值還在，但你沒有鑰匙
obj[Object.getOwnPropertySymbols(obj)[0]];   // 9453 ← 只能這樣硬撈
```

正確寫法是先存進變數：

```js
const id = Symbol('id');
const obj2 = {};
obj2[id] = 9453;
obj2[id];        // 9453 ✔
```

> [!note] 所以兩個說法的關係
> **「唯一性」是原因，「必須存進變數才拿得回來」是後果。**
> 教學重點是前者，實務注意事項是後者。

### 唯一的例外：`Symbol.for` 不用存變數

```js
const obj3 = {};
obj3[Symbol.for('id')] = 9453;
obj3[Symbol.for('id')];        // 9453 ✔ 因為查的是全域登錄表
```

這也剛好說明了 `Symbol.for` 存在的意義：**當你需要「不同地方寫同樣的字就能拿到同一個 Symbol」的時候。**
