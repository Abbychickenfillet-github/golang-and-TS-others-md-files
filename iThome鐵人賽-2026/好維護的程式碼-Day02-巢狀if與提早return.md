---
title: Day 2 縮排每深一層，讀的人就要多記一件事
type: article-draft
tags: [ithome, 鐵人賽, 好維護的程式碼, 重構, javascript, guard-clause, early-return]
updated: 2026-08-22
---

# Day 2｜縮排每深一層，讀的人就要多記一件事

> 純 Markdown，可直接貼到 iThome。

昨天講的是**迴圈的巢狀**，今天講**判斷的巢狀**。

這兩件事表面上不一樣，但要解決的是同一個問題：**讀程式碼的人，腦中同時要記住幾件事。**

---

## 一、重構前

需求：算出使用者的折扣。要先確認使用者存在、帳號啟用、有會員資格，再依等級給折扣。

```js
function getUserDiscount(user) {
  if (user) {
    if (user.isActive) {
      if (user.membership) {
        if (user.membership.level === 'gold') {
          return 0.2
        } else {
          return 0.1
        }
      } else {
        return 0
      }
    } else {
      return 0
    }
  } else {
    return 0
  }
}
```

這段程式碼**完全正確**，我實測過六種輸入全部正確。

但它有三個維護成本。

---

## 二、成本一：縮排深度就是「你腦中要同時記住的條件數」

讀到 `return 0.2` 那一行時，你必須同時記得：

1. `user` 存在
2. 而且 `user.isActive` 是 true
3. 而且 `user.membership` 存在
4. 而且 `level === 'gold'`

**四個條件，全部要壓在腦中同時成立。** 而且它們散落在四個不同的縮排層級，你的眼睛要往上跳四次才能重建整個脈絡。

實測這兩版的縮排深度：

| | 最深縮排 | 縮排層數 | 總行數 |
|---|---|---|---|
| 巢狀版 | 10 個空格 | **5 層** | 19 行 |
| 提早 return 版 | 2 個空格 | **1 層** | **7 行** |

而「回傳 0.2」那一行——也就是這個函式真正的重點——的縮排：

| | 快樂路徑的縮排 | 讀到那行時腦中要記住幾個條件 |
|---|---|---|
| 巢狀版 | 10 個空格 | **4 個** |
| 提早 return 版 | 2 個空格 | **1 個** |

**縮排不只是排版，它是「認知堆疊」的視覺化。** 每深一層，讀的人的心智堆疊就多推一格。

### 這不只是我的感覺，它是一個有工具在算的指標

上面「縮排深度＝認知堆疊」的說法，聽起來像個人偏好。但業界有一個專門量化這件事的指標叫 **Cognitive Complexity（認知複雜度）**，由 SonarSource 的 G. Ann Campbell 在 2016 年提出，白皮書目前是 1.7 版（2023-08-29）。

它跟大家比較熟的 Cyclomatic Complexity（循環複雜度）不一樣——後者算的是「有幾條執行路徑」，用來估測試案例數；**Cognitive Complexity 算的是「人讀起來有多難」**。

它的三條基本規則：

- a. 忽略那些「把多行縮成一行」的簡寫結構
- b. **每次打斷線性流程（`if`、`for`、`while`、`catch`…）就加 1**
- c. **當這些結構被巢狀包住時，額外依巢狀深度加分**

**這是罰分制，分數越高代表越難讀**，比較接近違規記點制度。所以第一條的「忽略」不是說那種寫法不好——**是它根本不算違規，不記你點。** 白皮書自己講了設計哲學：

> incent good coding practices.
> Ignore structures that allow multiple statements to be readably shorthanded into one.
>
> （獎勵好的寫法。能把多個語句清楚地濃縮成一句的結構，不計分。）

注意原文的 **readably（可讀地）**——被免除的是那些讓程式碼更好讀的簡寫，例如 `??` 空值合併運算子。白皮書甚至把「**把程式碼拆成命名清楚的函式**」也算在這一條裡，因為那同樣是「把多個語句濃縮成一次呼叫」。

> ⚠️ 一個容易踩的例外：**三元運算子 `? :` 是計分的**（+1）。它看起來也像簡寫，但白皮書在規則二把它列為條件分支。分界線是**有沒有「分支」語意**——`??` 是在補預設值，三元運算子是真的在做選擇。

第三條就是關鍵。白皮書的範例是這樣加的：

```
if      在最外層          +1
  for   巢狀在 if 裡       +2   ← 1（結構本身）+ 1（巢狀深度）
    while 巢狀在 for 裡    +3   ← 1（結構本身）+ 2（巢狀深度）
```

**巢狀不是線性成本，是遞增成本。**

而白皮書裡有一句話直接支持今天的做法：

> 因為提早返回往往能讓程式碼清楚很多，所以其他的跳躍與提早離開都不計分。

也就是說 **guard clause 的 `return` 在這個指標裡是「免費」的**。

用這套規則手算今天的兩個版本：

| | 計分過程 | 總分 |
|---|---|---|
| 巢狀版 | 4 個 `if`（+1、+2、+3、+4）＋ 4 個 `else`（各 +1） | **14** |
| Guard 版 | 3 個 `if`（各 +1）＋ 1 個三元運算子（+1） | **4** |

**同樣的行為，認知複雜度差 3.5 倍。**

> ⚠️ 這兩個分數是我依白皮書規則手算的，不是用工具實跑出來的。如果你電腦上有 SonarQube 或 SonarLint，可以把這兩個函式丟進去驗證——**我建議你真的跑一次**，因為手算容易漏掉邊角規則，而且工具給的數字在 code review 時比口頭說服有用得多。



---

## 三、成本二：快樂路徑被埋在最深處

**快樂路徑（Happy Path）指的是「一切正常時程式該做的事」**，也就是這個函式真正想做的那件事。

在巢狀版裡，快樂路徑 `return 0.2` **躲在第五層**，被四層防禦性檢查層層包住。

**這是本末倒置**：函式的重點是「算折扣」，但你要往下讀五層才看得到重點在哪。

而所有的 `return 0`（錯誤路徑）反而**佔據了視覺上最顯眼的位置**——它們塞滿了每一個 `else`。

**好維護的程式碼應該讓重點在最淺的地方。**

---

## 四、成本三：`else` 離它的 `if` 太遠

```js
    if (user.isActive) {
      // ... 中間隔了 8 行 ...
    } else {
      return 0
    }
```

當中間的區塊變長，你看到那個 `else` 時，**已經忘記它對應的是哪一個 `if`**。

現在只有 8 行，還撐得住。三個月後這個函式長到八十行，你會需要靠編輯器的括號配對高亮才能對上——**那就是可讀性已經失守的訊號。**

---

## 五、重構後：Guard Clause 衛述句

```js
function getUserDiscount(user) {
  if (!user) return 0
  if (!user.isActive) return 0
  if (!user.membership) return 0

  return user.membership.level === 'gold' ? 0.2 : 0.1
}
```

**Guard Clause（衛述句，也叫 Early Return 提早返回）的核心概念只有一句：**

> **不符合條件的，立刻請它離開，不要讓它繼續往下走。**

像門口的警衛——證件不對就當場擋下，不會讓人先進大廳再來慢慢查。

三件事同時發生了：

- a. **縮排從 4 層降到 1 層**，心智堆疊永遠只有一格。
- b. **快樂路徑浮到最上層**，而且在函式的最後一行——你一眼就看得到這個函式到底在幹嘛。
- c. **所有 `else` 消失了**。每個 `if` 都當場結束，不需要記住它對應誰。

### 讀法也變了

巢狀版要**由外往內鑽**：「如果有 user，那麼如果啟用，那麼如果有會員……」

Guard 版是**由上往下掃**：「沒有 user？走人。沒啟用？走人。沒會員？走人。好，剩下的都是合格的，算折扣。」

**第二種讀法可以邊讀邊丟掉已經處理完的情況，第一種不行。**

---

## 六、三個數字

我把兩個版本都跑過六種輸入，確認行為完全一致：

| 輸入 | 巢狀版 | Guard 版 | 一致 |
|---|---|---|---|
| `null` | 0 | 0 | ✅ |
| `undefined` | 0 | 0 | ✅ |
| `{ isActive: false }` | 0 | 0 | ✅ |
| `{ isActive: true }` | 0 | 0 | ✅ |
| `{ isActive: true, membership: { level: 'silver' } }` | 0.1 | 0.1 | ✅ |
| `{ isActive: true, membership: { level: 'gold' } }` | 0.2 | 0.2 | ✅ |

**重構的定義就是「行為不變、結構改善」。** 如果行為變了，那叫改需求不叫重構——這個區分在跟 PM 溝通時很重要。

---

## 七、跟 Day 1 串起來

昨天的 `every()` 和今天的 guard clause，看起來是兩個不相干的技巧，但它們解的是同一個問題。

| | Day 1 | Day 2 |
|---|---|---|
| 消除什麼 | 迴圈的中間狀態 | 判斷的巢狀層級 |
| 前 | `let flag` + `for` + `break` | 四層 `if` / `else` |
| 後 | `requests.every(isValid)` | 三行 guard + 一行結論 |
| 讀者省下的 | 不用追蹤變數怎麼變 | 不用同時記住四個條件 |

**共同的母題：減少「同時要記住的東西」的數量。**

這也是我這個系列的主軸——**好維護不是主觀感受，它可以被量化成「讀的人要在腦中維持幾個狀態」。**

---

## 八、什麼時候不該攤平

一樣，這個系列不打算變成傳教文。四種情況我不會改：

**a. 真正對等的分支，不是驗證**

```js
if (user.type === 'personal') {
  return calcPersonal(user)
} else {
  return calcBusiness(user)
}
```

這裡的 `if/else` 是**兩條地位相同的路**，不是「合格 vs 不合格」。硬要寫成 guard clause，反而暗示了「business 是例外情況」這個不存在的語意。

**判準：guard clause 適合「排除法」，不適合「分類法」。**

**b. 需要收尾清理**

```js
const conn = await db.connect()
if (!valid) return          // ← 連線沒關就跑掉了
```

這種情況要用 `try/finally` 或改寫成 `using` 語法，不能只是提早 return。

**c. Guard 太多，代表該拆函式了**

```js
function process(order) {
  if (!order) return
  if (!order.items) return
  if (!order.user) return
  if (!order.user.verified) return
  if (!order.payment) return
  if (!order.payment.confirmed) return
  if (!order.shipping) return
  // ... 還有八行
}
```

七個 guard 不是「攤得很好」，是**這個函式管太多事**。應該抽成 `validateOrder(order)` 回傳驗證結果，讓主函式只剩一個判斷。

**攤平是為了降低複雜度，不是為了把複雜度排成一列。**

**d. 團隊規範要求單一出口**

有些老專案沿用 C 時代的 single exit point 規範（一個函式只能有一個 `return`）。這個規範在有 GC 和例外處理的語言裡已經沒有必要，但**如果團隊 lint 規則寫死了，先照規矩來再提討論**，不要自己一個人寫另一種風格。

---

## 八點五、縮排深，就一定是困擾嗎？——決策性巢狀 vs 結構性巢狀

前面講的「縮排深度＝認知堆疊」，準確地說只適用在**決策性巢狀**：一層層 `if` 代表讀者要同時記住好幾個條件才懂最裡面那行在幹嘛。

但還有一種**結構性巢狀**，縮排一樣深，卻不是困擾：

```jsx
// JSX 條件渲染樹——縮排深，但不用同時記住任何條件
return (
  <div>
    {isLoggedIn && (
      <Dashboard>
        {hasNotifications && (
          <NotificationBadge count={count} />
        )}
      </Dashboard>
    )}
  </div>
)
```

```js
// 遞迴走訪樹狀資料——縮排深度反映的是資料本身的形狀
function renderTree(node) {
  return {
    label: node.label,
    children: node.children.map(child => renderTree(child)),
  }
}
```

這兩個例子縮排都不淺，但讀者不需要在腦中同時記住「a 成立、b 成立、c 成立」——**他們只是在看資料的樹狀形狀**，跟 Day02 開頭那段「四層 if 才能算出折扣」完全是兩件事。硬要把這種巢狀攤平，反而會讓資料的樹狀結構變得更難辨認。

**判斷方式跟前面的判準一致**：把游標放在最深那一行，問自己「要往上看幾次才能重建完整條件」。

- 答案是「要同時記住好幾個 if 才懂這行在幹嘛」→ 決策性巢狀，Day02 的判準適用，該攤平。
- 答案是「不用看，這裡的縮排只是在畫資料的樹狀圖」→ 結構性巢狀，深度本身不是問題。

---

## 九、今天的判斷標準

看到巢狀 `if` 時問自己：

> **「這些條件是在『排除不合格的』，還是在『分類成不同種類』？」**

| 意圖 | 適合的寫法 |
|---|---|
| 排除不合格的（驗證、防禦） | **Guard Clause** 提早 return |
| 分成幾種對等的類型 | `if / else if / else`，或改用查表 |
| 巢狀超過三層 | **先想想是不是該拆函式**，不是繼續攤 |

還有一個更快的檢查法：**把游標放在最深那一行，數一下要往上看幾次才能重建完整條件。超過兩次，就該重構了。**

---

## 明天預告

Day 3 講**命名**：為什麼 `isValid` 比 `check` 好，為什麼布林值命名要用 `is` / `has` / `can` 開頭，以及一個更難的問題——**什麼時候該把運算式抽成具名變數**。

---


---

## 完整可執行程式碼

存成 `day02-guard-clause.js`，終端機執行 `node day02-guard-clause.js` 就能重跑本文所有數字。

```js
/**
 * Day 2：巢狀 if 攤平成 Guard Clause 衛述句
 * 執行：node day02-guard-clause.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：四層巢狀 ────────────────────────────────────────
function discountNested(user) {
  if (user) {
    if (user.isActive) {
      if (user.membership) {
        if (user.membership.level === 'gold') {
          return 0.2;
        } else {
          return 0.1;
        }
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  } else {
    return 0;
  }
}

// ── 重構後：Guard Clause ───────────────────────────────────
function discountGuard(user) {
  if (!user) return 0;
  if (!user.isActive) return 0;
  if (!user.membership) return 0;

  return user.membership.level === 'gold' ? 0.2 : 0.1;
}

line('Part 1｜行為必須完全一致，這才叫重構');

const cases = [
  ['null',                    null],
  ['undefined',               undefined],
  ['停用的帳號',              { isActive: false }],
  ['啟用但沒有會員資格',      { isActive: true }],
  ['silver 會員',             { isActive: true, membership: { level: 'silver' } }],
  ['gold 會員',               { isActive: true, membership: { level: 'gold' } }],
];

let allSame = true;
console.log('  情境'.padEnd(24), '巢狀版'.padEnd(9), 'Guard版'.padEnd(9), '一致');
for (const [label, input] of cases) {
  const a = discountNested(input);
  const b = discountGuard(input);
  allSame = allSame && a === b;
  console.log('  ' + label.padEnd(22), String(a).padEnd(10), String(b).padEnd(10), a === b ? '✅' : '❌');
}
console.log('\n  全部一致 ?', allSame);
console.log('  → 行為不變、結構改善，這才叫重構。行為變了叫改需求。');

line('Part 2｜量化：縮排深度就是心智堆疊');

const stats = (fn) => {
  const lines = fn.toString().split('\n');
  const maxIndent = Math.max(...lines.map(l => l.match(/^\s*/)[0].length));
  return { lines: lines.length, indent: maxIndent, levels: maxIndent / 2 };
};
const a = stats(discountNested);
const b = stats(discountGuard);

console.log('              最深縮排   縮排層數   總行數');
console.log('  巢狀版      ', String(a.indent + ' 空格').padEnd(11), String(a.levels).padEnd(10), a.lines);
console.log('  Guard 版    ', String(b.indent + ' 空格').padEnd(11), String(b.levels).padEnd(10), b.lines);
console.log(`\n  縮排層數從 ${a.levels} 降到 ${b.levels}，行數少了 ${a.lines - b.lines} 行`);

line('Part 3｜快樂路徑在第幾行');

const happyIndent = (fn) => {
  const l = fn.toString().split('\n').find(x => x.includes('0.2'));
  return l.match(/^\s*/)[0].length;
};
console.log('  快樂路徑（回傳 0.2 那一行）的縮排：');
console.log('    巢狀版  ', happyIndent(discountNested), '空格 ← 被四層檢查包在最裡面');
console.log('    Guard 版', happyIndent(discountGuard), '空格 ← 跟函式本體同一層');
console.log('\n  讀到那一行時，腦中要同時記住幾個條件：');
console.log('    巢狀版   4 個（user 存在 + 啟用 + 有會員 + 是 gold）');
console.log('    Guard 版 1 個（前面都排除完了，只剩等級判斷）');
console.log('\n  快樂路徑（Happy Path）＝ 一切正常時程式該做的事');
console.log('  好維護的程式碼會讓它待在最淺、最顯眼的地方');

line('Part 4｜讀法的差別');

console.log(`
  巢狀版要「由外往內鑽」：
      如果有 user，那麼如果啟用，那麼如果有會員，那麼如果是 gold……
      → 讀到最後一層時，前面四個條件都還壓在腦裡

  Guard 版是「由上往下掃」：
      沒有 user？走人。
      沒啟用？走人。
      沒會員？走人。
      好，剩下的都合格了，算折扣。
      → 每排除一個就可以「忘掉」它，腦中永遠只有一件事
`);

line('Part 5｜什麼時候不該攤平');

console.log(`
  [a] 真正對等的分支，不是驗證
      if (user.type === 'personal') return calcPersonal(user)
      else                          return calcBusiness(user)
      → 兩條路地位相同，硬寫成 guard 會暗示「business 是例外」
      → 判準：guard 適合「排除法」，不適合「分類法」

  [b] 需要收尾清理
      const conn = await db.connect()
      if (!valid) return              // ← 連線沒關就跑掉了
      → 要用 try/finally

  [c] Guard 太多 → 該拆函式了
      七個 guard 不是攤得好，是這個函式管太多事
      → 抽成 validateOrder(order)，主函式只留一個判斷

  [d] 團隊 lint 規則要求單一出口
      → 先照規矩來再提討論，不要自己一個人寫另一種風格
`);

line('Part 6｜跟 Day 1 的關聯');

console.log(`
  Day 1 的 every()  消除的是「迴圈的中間狀態」
  Day 2 的 guard    消除的是「判斷的巢狀層級」

  看起來是兩個技巧，但解的是同一個問題：
      減少「讀的人同時要記住的東西」的數量。

  這就是「好維護」可以被量化的方式 ——
  不是主觀感受，是「腦中要維持幾個狀態」。
`);

console.log('Node 版本:', process.version, '\n');
```

## 參考來源與內容出處說明

為了讓讀者能自己判斷可信度，這裡把本文的內容分成三類標示。

**一、有正式出處的部分**

| 內容 | 出處 |
|---|---|
| 「Guard Clause 衛述句」這個重構手法的名稱與定義 | Martin Fowler, *Refactoring: Improving the Design of Existing Code*, 2nd ed.，重構目錄中的 Replace Nested Conditional with Guard Clauses |
| Cognitive Complexity 的三條規則、巢狀遞增機制、「提早返回不計分」 | G. Ann Campbell, *Cognitive Complexity: A new way of measuring understandability*, SonarSource，v1.7（2023-08-29），初版 2016：https://www.sonarsource.com/docs/CognitiveComplexity.pdf |
| Happy Path（快樂路徑）、Single Exit Point（單一出口）這兩個術語 | 軟體工程領域通用術語，非特定作者提出 |

**二、我實際跑出來的部分**

六種輸入的行為對照、縮排深度、縮排層數、行數，全部由 `day02-guard-clause.js` 實測產生，可以重跑驗證。實測環境 Node.js v22。

**三、我自己的整理與比喻（沒有外部出處）**

以下都是我讀完資料後的個人歸納，不是引用：

- 「縮排深度就是心智堆疊」這個說法（不過它跟 Cognitive Complexity 的巢狀遞增機制方向一致）
- 「像門口的警衛」這個比喻
- 「guard clause 適合排除法，不適合分類法」這個判準
- 「什麼時候不該攤平」那四種情況的分類方式
- 「把游標放在最深那一行，數要往上看幾次」這個檢查法
- 兩個版本的 Cognitive Complexity 分數（14 對 4）是我依規則手算，不是工具實跑

**四、其他**

- MDN, `return`：https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return

（查閱日期：2026-08-22。本文所有數字實測於 Node.js v22，可執行腳本見文末）

## 可執行範例

本文的兩個版本與所有量化數字，都可以用這支腳本重跑驗證：`day02-guard-clause.js`（六種輸入的行為對照、縮排深度統計、快樂路徑位置）。
