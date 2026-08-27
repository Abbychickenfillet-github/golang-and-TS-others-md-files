---
title: Day 3 好名字讓人不用打開檔案就能做決定
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 命名, javascript, naming, boolean]
updated: 2026-08-23
---

# Day 3｜好名字讓人不用打開檔案就能做決定

> 純 Markdown，可直接貼到 iThome。

前兩天談的是結構——把迴圈的中間狀態拿掉、把巢狀的判斷攤平。今天談的東西沒有結構可以改，但它決定了讀者要不要「打開你的檔案」。

命名很難量化，所以多數文章只能給你一堆規則。這篇想用一個具體的問題來測它：

> **看到這個名字，你能不能在不讀實作的情況下，決定要不要用它？**

---

## 一、重構前

```js
function check(d) {
  const x = d.filter(i => i.s === 1 && i.t > Date.now())
  if (x.length > 0) {
    return true
  }
  return false
}
```

這段程式碼**完全正確**。但你現在能回答這三個問題嗎？

| 問題 | 你答得出來嗎 |
|---|---|
| 它在檢查什麼？ | ❌ |
| 它回傳什麼型別？ | ❌ |
| 呼叫它會不會有副作用？ | ❌ |

**三題全部答不出來，所以你必須打開它、讀完它、才能決定要不要用。** 這就是壞名字的實際成本——不是「不好看」，是**強迫每一個讀到它的人多做一次跳轉**。

---

## 二、重構後

```js
const STATUS = { ACTIVE: 1, CANCELLED: 0 }

function hasActiveSubscription(subscriptions) {
  const isActive = (sub) => sub.status === STATUS.ACTIVE && sub.expiresAt > Date.now()
  return subscriptions.some(isActive)
}
```

行為完全一致（我跑過驗證）。但現在那三個問題**不用打開檔案就能回答**：

| 名字的哪一段 | 回答了什麼 |
|---|---|
| `has...` | 回傳布林值 |
| `...Active...` | 在問「有沒有生效中的」 |
| `...Subscription` | 對象是訂閱 |

**順帶一提，`1` 變成 `STATUS.ACTIVE` 也是同一件事**——`i.s === 1` 裡的那個 `1` 是所謂的魔術數字（Magic Number），只有寫的人知道它代表什麼。

---

## 三、名字測驗：不看實作，你能答對幾題

我把常見的命名放在一起比較：

| 名字 | 回傳型別 | 有副作用嗎 | 猜得出來嗎 |
|---|---|---|---|
| `check` | ? | ? | ❌ |
| `data` | ? | — | ❌ |
| `handleIt` | ? | ? | ❌ |
| `isActive` | boolean | 無 | ✅ |
| `hasActiveSubscription` | boolean | 無 | ✅ |
| `canEditPost` | boolean | 無 | ✅ |
| `getUserById` | User | 無 | ✅ |
| `fetchUserById` | Promise | **有網路請求** | ✅ |
| `saveDraft` | void / Promise | **有寫入** | ✅ |

**注意 `get` 和 `fetch` 的差別**——這是社群長年形成的默契：

- `get` 開頭 → 同步、便宜、沒有副作用
- `fetch` 開頭 → 非同步、會發請求、可能失敗

**光是選對動詞，就等於在名字裡標注了「這個呼叫貴不貴」。** 這是為什麼命名可以省下真實的時間：讀的人不用進去看有沒有 `await`。

---

## 四、布林值的四個前綴

```
is___      這個東西「是不是」某狀態      isActive, isEmpty, isLoading
has___     這個東西「有沒有」某東西      hasPermission, hasError, hasChildren
can___     「能不能」做某件事            canEdit, canDelete, canRetry
should___  「該不該」做某件事            shouldUpdate, shouldRetry
```

**這四個前綴等於在名字裡宣告「我回傳 boolean」。**

而且它防的不只是可讀性，還有一類真實的 bug：

```js
const user = {
  permission: { level: 'admin' },   // 是物件
  hasPermission: true,              // 是布林
}

if (user.permission)     // ⚠️ 永遠成立，因為物件是 truthy
if (user.hasPermission)  // ✅ 名字保證了型別
```

**`if (user.permission)` 這種寫法在物件情況下永遠為真**，而且它「看起來完全正常」，是 code review 最容易漏掉的一種 bug。**如果那個屬性當初就叫 `hasPermission`，你根本不會寫錯。**

---

## 五、什麼時候該把運算式抽成具名變數

```js
// 抽之前
if (account.age >= 18 && account.country === 'TW' && !account.banned && account.verifiedAt !== null) {
  // ...
}
```

```js
// 抽之後
const isAdult          = account.age >= 18
const isLocalUser      = account.country === 'TW'
const isInGoodStanding = !account.banned && account.verifiedAt !== null
const canOpenAccount   = isAdult && isLocalUser && isInGoodStanding

if (canOpenAccount) {
  // ...
}
```

**三個「該抽」的訊號：**

- a. 條件式裡有**兩個以上的 `&&` 或 `||`**
- b. 同一段運算式在檔案裡**出現兩次以上**
- c. **你想在上面加一行註解**

第三點是最實用的判準：

```js
// 檢查是不是成年的本國合格用戶        ← 你想寫這行註解
if (account.age >= 18 && ...) {

const canOpenAccount = ...             ← 那就讓名字取代註解
if (canOpenAccount) {
```

**註解會過期，名字不會**——因為改邏輯時你一定會看到那一行，但註解常常被忘記更新。**能用名字講的，就不要用註解講。**

---

## 六、什麼時候不該抽、不該改

一樣，這系列不打算變成傳教文。五種情況我不會動：

**a. 名字沒有增加資訊**

```js
const userName = user.name    // 多一個變數，零資訊
```

直接用 `user.name` 就好。

**b. 迴圈索引 `i` / `j`**

`for (let i = 0; ...)` 是全世界通用的慣例。改成 `index` 沒有比較好懂，只是比較長。

**這裡有個更普遍的原則：名字的長度應該跟它的作用域大小成正比。** 活三行的變數可以叫 `i`，活在整個模組的變數就該叫完整的名字。

**c. 領域內大家都懂的縮寫**

`id`、`url`、`api`、`db`、`req`、`res` 不用展開。但 `usr`、`cfg`、`tmp`、`mgr` 就該展開——**判準是「新人第一天看得懂嗎」。**

**d. 還在探索階段的程式碼**

名字要等你想清楚它是什麼才取得準。**過早命名會把錯的心智模型固定下來**，而且之後改名的心理阻力比一開始不命名還大。

**e. 名字裡不要寫型別**

```js
userArray  →  users      // 複數本身就是型別資訊
strName    →  name
```

這是匈牙利命名法的遺產。**有 TypeScript 之後更沒必要**，型別讓編譯器管就好。

---

## 七、跟前兩天串起來

| | 消除什麼 |
|---|---|
| Day 1 `every()` | 迴圈的中間狀態 |
| Day 2 guard clause | 判斷的巢狀層級 |
| **Day 3 命名** | **「必須去讀實作」這個動作** |

**三天都在做同一件事：把讀者的認知成本往下壓。**

而且今天的例子剛好把三天串在一起：

```js
return subscriptions.some(isActive)
//                  ~~~~~ Day 1 的高階函式
//                        ~~~~~~~~ Day 3 的具名條件
```

**好的命名讓 Day 1 的重構真正發揮效果。** `some(isActive)` 讀起來像英文句子；`some(fn)` 或 `some(x => x.s === 1 && x.t > Date.now())` 就不會——**高階函式的可讀性紅利，有一半是命名給的。**

---

## 八、今天的判斷標準

取名字時問自己：

> **「別人看到這個名字，能不能不打開檔案就決定要不要用它？」**

具體檢查三件事：

| 檢查 | 怎麼做到 |
|---|---|
| 看得出**回傳型別**嗎 | 布林用 `is`/`has`/`can`/`should`；集合用複數 |
| 看得出**貴不貴**嗎 | 同步便宜用 `get`；非同步有請求用 `fetch`/`load` |
| 看得出**會不會改東西**嗎 | 純查詢用 `get`/`find`；有寫入用 `save`/`update`/`set` |

**三個都答得出來，那個名字就夠好了。**

---

## 明天預告

Day 4 講**函式該切多細**：單一職責原則聽起來很對，但「一個函式只做一件事」的「一件事」到底怎麼定義？我會給一個比原則更好用的判準。

---

## 可執行範例

本文的對照與測驗都可以重跑驗證：`day03-naming.js`（命名前後行為對照、名字測驗表、布林前綴的 bug 示範、抽變數的判準）。


---

## 完整可執行程式碼

存成 `day03-naming.js`，終端機執行 `node day03-naming.js` 就能重跑本文所有數字。

```js
/**
 * Day 3：命名——名字要能讓人不看實作就猜對
 * 執行：node day03-naming.js
 */
const line = (t) => console.log('\n' + '─'.repeat(60) + '\n' + t + '\n' + '─'.repeat(60));

const now = Date.now();
const DAY = 86400000;

const data = [
  { s: 1, t: now + DAY },      // 有效
  { s: 0, t: now + DAY },      // 狀態不對
  { s: 1, t: now - DAY },      // 過期
];

line('Part 1｜同樣的功能，兩種命名');

// ── 重構前 ──────────────────────────────────────────────
function check(d) {
  const x = d.filter(i => i.s === 1 && i.t > Date.now());
  if (x.length > 0) {
    return true;
  }
  return false;
}

// ── 重構後 ──────────────────────────────────────────────
const STATUS = { ACTIVE: 1, CANCELLED: 0 };

function hasActiveSubscription(subscriptions) {
  const isActive = (sub) => sub.status === STATUS.ACTIVE && sub.expiresAt > Date.now();
  return subscriptions.some(isActive);
}

const subscriptions = data.map(d => ({ status: d.s, expiresAt: d.t }));

console.log('  check(data)                          →', check(data));
console.log('  hasActiveSubscription(subscriptions) →', hasActiveSubscription(subscriptions));
console.log('  行為一致 ?', check(data) === hasActiveSubscription(subscriptions));

console.log(`
  重構前的名字沒有回答任何問題：
    check   → 檢查什麼？回傳什麼？
    d x i s t → 完全是謎，只能去讀實作

  重構後的名字自己回答了三個問題：
    has...  → 回傳布林值
    ...Active... → 在問「有沒有生效中的」
    ...Subscription → 對象是訂閱
`);

line('Part 2｜名字測驗：不看實作，你能答對幾題？');

const quiz = [
  { name: 'check',                 type: '?',    side: '?',   guessable: false },
  { name: 'data',                  type: '?',    side: '-',   guessable: false },
  { name: 'handleIt',              type: '?',    side: '?',   guessable: false },
  { name: 'isActive',              type: 'boolean', side: '無', guessable: true },
  { name: 'hasActiveSubscription', type: 'boolean', side: '無', guessable: true },
  { name: 'canEditPost',           type: 'boolean', side: '無', guessable: true },
  { name: 'getUserById',           type: 'User',    side: '無', guessable: true },
  { name: 'fetchUserById',         type: 'Promise', side: '有網路請求', guessable: true },
  { name: 'saveDraft',             type: 'void/Promise', side: '有寫入', guessable: true },
];

console.log('  名字'.padEnd(26), '回傳型別'.padEnd(16), '有副作用嗎'.padEnd(14), '猜得出來嗎');
for (const q of quiz) {
  console.log('  ' + q.name.padEnd(24), q.type.padEnd(18), q.side.padEnd(16), q.guessable ? '✅' : '❌');
}
console.log('\n  → 好名字讓你不用打開檔案就能做決定，這就是它省下的成本');

line('Part 3｜布林值的四個前綴');

console.log(`
  is___    這個東西「是不是」某狀態      isActive, isEmpty, isLoading
  has___   這個東西「有沒有」某東西      hasPermission, hasError, hasChildren
  can___   「能不能」做某件事            canEdit, canDelete, canRetry
  should__ 「該不該」做某件事            shouldUpdate, shouldRetry

  為什麼重要：這四個前綴等於在名字裡宣告「我回傳 boolean」。
  對照沒有前綴的寫法：

      if (user.permission)     ← permission 是布林？物件？陣列？字串？
      if (user.hasPermission)  ← 一定是布林
`);

const user = { hasPermission: true, permission: { level: 'admin' } };
console.log('  user.permission    →', JSON.stringify(user.permission), ' ← 是物件，if 判斷永遠為真！');
console.log('  user.hasPermission →', user.hasPermission, ' ← 名字保證了型別');
console.log('\n  ⚠️ if (user.permission) 這種寫法在物件情況下永遠成立，是很常見的 bug');

line('Part 4｜什麼時候該把運算式抽成具名變數');

const account = { age: 20, country: 'TW', banned: false, verifiedAt: now - DAY };

// 抽之前
const before = account.age >= 18 && account.country === 'TW' && !account.banned && account.verifiedAt !== null;

// 抽之後
const isAdult          = account.age >= 18;
const isLocalUser      = account.country === 'TW';
const isInGoodStanding = !account.banned && account.verifiedAt !== null;
const canOpenAccount   = isAdult && isLocalUser && isInGoodStanding;

console.log('  抽之前的條件式長度:', String(before).length === 0 ? 0 : 'age >= 18 && country === TW && !banned && verifiedAt !== null'.length, '個字元');
console.log('  結果:', before, '／抽之後:', canOpenAccount, '／一致:', before === canOpenAccount);

console.log(`
  三個「該抽」的訊號：
    a. 條件式裡有兩個以上的 && 或 ||
    b. 同一段運算式在檔案裡出現兩次以上
    c. 你想在上面加註解 → 那句註解就該變成變數名

  第三點是最實用的判準：
      // 檢查是不是成年的本國合格用戶     ← 想寫這行註解
      if (a.age >= 18 && ...) {

      const canOpenAccount = ...          ← 直接讓名字取代註解
      if (canOpenAccount) {
`);

line('Part 5｜什麼時候不該抽');

console.log(`
  [a] 名字沒有增加資訊
      const userName = user.name        ← 多一個變數，零資訊
      直接用 user.name 就好

  [b] 迴圈索引 i / j
      for (let i = 0; ...)              ← 這是全世界通用的慣例
      改成 index 沒有比較好懂，只是比較長

  [c] 領域內大家都懂的縮寫
      id, url, api, db, req, res        ← 這些不用展開
      但 usr, cfg, tmp, mgr 就該展開

  [d] 還在探索階段的程式碼
      名字要等你想清楚它是什麼才取得準
      過早命名會把錯的心智模型固定下來

  [e] 名字裡不要寫型別
      userArray → users                 ← 複數本身就是型別資訊
      strName   → name
      這是匈牙利命名法的遺產，現代有 TypeScript 就不需要了
`);

line('Part 6｜跟 Day 1、Day 2 的關聯');

console.log(`
  Day 1  every()      消除「迴圈的中間狀態」
  Day 2  guard clause 消除「判斷的巢狀層級」
  Day 3  命名          消除「必須去讀實作才懂」這個動作

  三天都在做同一件事：把讀者的認知成本往下壓。

  而且今天的例子剛好用到前兩天的東西：
      return subscriptions.some(isActive)
                          ~~~~~ Day 1 的高階函式
                                ~~~~~~~~ Day 3 的具名條件
  好的命名讓 Day 1 的重構真正發揮效果 ——
  some(isActive) 讀起來像英文句子，some(fn) 就不會。
`);

console.log('Node 版本:', process.version, '\n');
```

## 參考來源

- Martin Fowler, *Refactoring*, 2nd ed.，Rename Variable / Extract Variable：https://refactoring.com/catalog/extractVariable.html
- MDN, JavaScript 命名慣例（Guidelines）：https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide/JavaScript

（查閱日期：2026-08-23。本文程式碼實測於 Node.js v22）
