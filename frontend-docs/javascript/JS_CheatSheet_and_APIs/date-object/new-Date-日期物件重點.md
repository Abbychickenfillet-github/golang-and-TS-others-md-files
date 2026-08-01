# 日期物件 `new Date()` 重點

> 來源練習：`JavaScript-practicing/while-loop.html`
> 相關：[[loops-and-increment-operators]]（迴圈與 switch）、[[TIME_UTILS_EXPLANATION]]（時間工具）

## 一句話

建立日期物件要用 **`new Date()`**（小寫 `new`）；少了 `new`、或大小寫打錯，都會出問題。

---

## 1. `new` 不能少、也不能大寫

JavaScript **大小寫敏感（case-sensitive）**。`new` 是關鍵字，必須全小寫。

```js
new Date()   // ✅ 日期物件，有「現在」的年月日時分秒
Date()       // ⚠️ 回傳的是「字串」，不是物件（所以 .getDay() 之類會壞）
New Date()   // ❌ 語法錯誤：New 被當成一個變數名，不是關鍵字
```

### 提醒自己：報錯位置 ≠ 報錯原因

寫成 `New Date()` 時，波浪線會標在 **`Date`** 上，不是 `New` 上：

```
New Date()
└┬┘ └─┬─┘
 │    └─ 解析器在這裡卡住、報錯（波浪線在這）
 └─ 解析器先把 New 當成合法的變數名「收下」了
```

> 看到錯誤時，往**前一個 token** 找真正的原因。這裡真兇是大寫的 `New`。

---

## 2. `Date()` vs `new Date()`

| 寫法 | 回傳 | 能不能用 `.getDay()` 等方法 |
|------|------|--------------------------|
| `new Date()` | Date **物件** | ✅ 可以 |
| `Date()` | **字串** | ❌ 字串沒有這些方法，會 TypeError |

> 沒有 `.today()` 這個 API。`Date().today()` 一定壞。

---

## 3. `getDay()` 回傳星期幾（0=星期日）

`new Date().getDay()` 回傳 **0~6** 的數字：

| 回傳值 | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|--------|---|---|---|---|---|---|---|
| 星期 | 日 | 一 | 二 | 三 | 四 | 五 | 六 |

W3Schools 動態傳值範例（正確）：

```js
let day;
switch (new Date().getDay()) {   // 只求值一次，拿這個值去比對每個 case
  case 0: day = "Sunday"; break;
  case 1: day = "Monday"; break;
  case 2: day = "Tuesday"; break;
  case 3: day = "Wednesday"; break;
  case 4: day = "Thursday"; break;
  case 5: day = "Friday"; break;
  case 6: day = "Saturday";
}
```

- switch 運算式 **只求值一次**，再拿那個值用 `===`（嚴格相等）逐一比對每個 case。
- 比對是嚴格相等：`getDay()` 回傳數字 `0~6`，所以 case 也要寫數字（不能寫 `"0"` 字串）。

### 為什麼 case 從 0 開始，不是 1？

因為 `case` 的數字要**對齊 `getDay()` 會吐出來的值**，而它從 `0` 開始（0 = 星期日）。

> **記憶：** 電腦數數從 **0** 開始，西方一週從 **星期日** 開始，兩個「開頭」對在一起 → **星期日 = 0**。

### `day = "Sunday"` 不是 getDay() 的結果！（重要觀念）

`getDay()` 的結果是**數字**，只負責決定跳進哪個 case；`day` 是**另一個你自己宣告的變數**，值是你在 case 裡手動寫死的字串。

```text
new Date().getDay()  →  得到數字 4   (getDay 的結果，只當「選擇依據」)
        │
        ▼
   switch 拿 4 比對  →  跳進 case 4
        │
        ▼
   執行 day = "Thursday"  →  變數 day 現在 = "Thursday"
```

- 數字 `4` **不會自己變成** `"Thursday"`，是 `switch` 幫你「翻譯」過去的。
- **W3Schools 這樣寫的用途**：`getDay()` 只給數字 `0~6`，沒法直接給人看；這個 switch 就是一台「**數字 → 星期名稱**」的翻譯機，結果存進 `day`。

### case 裡的 `day = "Sunday"` 是「賦值」，不是「新變數」

分辨關鍵：**有沒有 `let` / `const`**。

```js
let day;              // 宣告(出生)：創造 day 這個變數，此時是空的
switch (...) {
  case 0:
    day = "Sunday";   // 賦值(換衣服)：塞值進「已存在」的 day，沒有 let → 不是新變數
    break;
}
```

- `let day;` 在 switch 外面、上面，變數早就建好了。
- 7 個 case 用的是**同一個** `day`，只是依跳進哪個 case 塞進不同字串。
- 口訣：**有 `let`/`const` = 出生（宣告）；只有 `=` = 換衣服（賦值）。**

### 那些英文 `"Sunday"` 是「人寫死的」，不是電腦產生的

- `getDay()` 只吐**數字** `0~6`，它**不知道**什麼叫 "Sunday"。
- `"Sunday"`、`"Monday"`… 是作者**手動打進去的字串字面值（string literal）**，被 `" "` 包起來＝「原封不動照存這串字」。
- 想換成中文完全可以：`case 0: day = "星期日"; break;`
- 一句話：**數字是電腦算的；星期名稱是人寫死的翻譯。switch 把兩者接起來。**

---

## 4. 靜態分析為何「邊打字就跳出來」

- **靜態分析 = 不執行程式、直接讀原始碼找問題。** 「靜態」的相反是「動態（執行時）」，**不是**「編譯後」。
- 因為不用執行、不用編譯，所以能在打字當下即時分析。
- JavaScript 本來就不是傳統「先編譯再跑」的語言（直譯 / JIT），沒有編譯步驟可等。
- 編輯器裡即時的波浪線：通常是 **SonarLint**（SonarQube 的 IDE 即時外掛）或編輯器內建語言服務。
- **SonarQube 伺服器版**才是在 CI / 提交程式碼時跑。

---

## 一句話記憶

- 建物件 → **小寫 `new Date()`**。
- 報錯位置常在「卡住的下一個 token」，真兇要往前找。
- 靜態分析不用編譯也不用執行，所以即時出現很正常。
