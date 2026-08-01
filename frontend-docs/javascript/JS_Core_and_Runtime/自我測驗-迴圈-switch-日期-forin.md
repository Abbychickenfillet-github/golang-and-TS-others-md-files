# 自我測驗：迴圈 / switch / 日期 / for...in

> 出題範圍：`JavaScript-practicing/while-loop.html` 練習中我搞混過的點
> 相關：[[loops-and-increment-operators]]、[[new-Date-日期物件重點]]、[[字串組合-樣板字面值vs加號串接]]、[[for...in]]
> 建議：先遮住最下面的「解答」，全部寫完再對。

---

## 一、選擇 / 判斷

**Q1.** 在 `<script>` 裡，下面哪一個是「正確的 JavaScript 註解」？
- (A) `<!-- 註解 -->`
- (B) `// 註解`
- (C) `# 註解`

**Q2.** `New Date()`（大寫 N）會出錯。波浪線通常標在哪個字上？為什麼？

**Q3.** SonarQube / SonarLint 是「靜態分析」。下列何者正確？
- (A) 一定要先編譯完才會跑出錯誤
- (B) 要實際執行程式才知道有沒有錯
- (C) 不執行、不編譯，直接讀原始碼，所以打字時就能即時提示

**Q4.** `Date()`（沒有 `new`）回傳的是______；`new Date()` 回傳的是______。哪一個能用 `.getDay()`？

---

## 二、為什麼

**Q5.** `new Date().getDay()` 的 `switch`，為什麼 `case` 要從 `0` 開始而不是 `1`？用一句能記住的話回答。

**Q6.** 這段 `do...while` 結束時 `a` 是多少？為什麼不是 9？
```js
let a = 3, b = 2
do { a++; b++ } while (a < 10)
```

**Q7.** `do...while` 最適合用在哪兩種情境？（提示：和「至少先做一次」有關）

---

## 三、觀念區分

**Q8.** 下面 `day = "Sunday"` 是「宣告一個新變數」還是「賦值給舊變數」？怎麼一眼分辨？
```js
let day
switch (n) { case 0: day = "Sunday"; break }
```

**Q9.** `"Sunday"`、`"Monday"` 這些英文，是 `getDay()` 自動產生的，還是人寫死的？

**Q10.** 這兩種寫法「等價」嗎？輸出會一樣嗎？
```js
A: objName + "." + i + " = " + obj[i] + "\n"
B: `${i}:${Joe[i]}`
```

**Q11.** 把「組字串的技術等價」翻成英文。（注意：等價、組字串 各該用哪個字？）

---

## 四、for...in 抓蟲

**Q12.** 為什麼這行會 `ReferenceError`？怎麼改？
```js
for (const i in Joe) { console.log(`${key}${value}`) }
```

**Q13.** 取值時 `Joe[i]` 和 `Joe.i` 有什麼不同？哪個對？

**Q14.** 下面函式有兩個問題，各是什麼？
```js
function showProps(obj, objName) {
  for (const i in Joe) {        // ←(a)
    result += objName + "." + i + " = " + obj[i] + "\n"
  }
  return result
  console.log(result)           // ←(b)
}
```

**Q15.** 「我寫了 for 迴圈，它怎麼沒自己跑？」——一句話說出真正原因。

---

---

## ✅ 解答（先自己寫完再看）

**A1.** (B)。`<!-- -->` 是 HTML 註解，在 `<script>` 內要用 `//` 或 `/* */`。

**A2.** 標在 **`Date`** 上。解析器把 `New` 當成合法變數名先收下，看到下一個 `Date` 才卡住報錯 → **報錯位置 ≠ 報錯原因，真兇是大寫的 `New`**。

**A3.** (C)。「靜態」的相反是「動態（執行時）」，不是「編譯後」；不執行不編譯所以能即時提示。

**A4.** `Date()` → **字串**；`new Date()` → **Date 物件**。只有 `new Date()` 能用 `.getDay()`。

**A5.** `getDay()` 從 `0` 開始（0＝星期日），`case` 要對齊它。記憶：**電腦從 0 數、西方週從星期日開始，合起來星期日＝0**。

**A6.** `a = 10`。`do...while` 先做事後檢查；a=9 時 `9<10` 還成立 → 再跑一輪 → `a++` 把它推到 10，這時 `10<10` 才 false。**結束值＝讓條件第一次變 false 的數**。

**A7.** ① 輸入驗證 / 重複詢問（先問才有得檢查）；② 重試 retry（先試才知失敗）。（選單迴圈也算）

**A8.** **賦值給舊變數**。`day` 早在 `let day` 宣告了；case 裡沒有 `let`/`const`，只有 `=`。口訣：**有 `let`/`const`＝出生（宣告）；只有 `=`＝換衣服（賦值）**。

**A9.** **人寫死的**字串字面值。`getDay()` 只給數字 0~6，文字翻譯是人決定的，可換成「星期日」。

**A10.** **不等價、輸出不一樣**。A 有 `Joe.` 前綴、` = `、`\n`；B 只有 `:`、無前綴無換行。技術（兩種組字串寫法）等價 ≠ 內容相等。

**A11.** **The string-building techniques are equivalent.**（等價＝equivalent 不是 equal；組字串＝string building 不是 concatenation）。

**A12.** `for...in` 只給一個變數（這裡是 `i`），`key`、`value` 沒宣告 → ReferenceError。改成 `` `${i}: ${Joe[i]}` ``。

**A13.** `Joe[i]`＝用變數 `i` 的內容（如 "name"）當 key，✅正確；`Joe.i`＝找名叫 "i" 的屬性，不存在 → `undefined`，❌。key 在變數裡一定用中括號。

**A14.** (a) 寫死 `Joe`，應改成參數 `obj`，否則函式只能處理 Joe；(b) `return` 之後的 `console.log` 是死碼，永遠不執行。

**A15.** 因為它包在 **function 裡**，函式內的程式碼要**被呼叫**才會跑（最外層的碼才會自己跑）。
