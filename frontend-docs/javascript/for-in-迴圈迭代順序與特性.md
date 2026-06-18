---
title: for...in 迴圈迭代順序與特性
type: topic-note
source: Gemini
category: 技術
tags: [gemini, javascript, for-in, 迴圈, 物件, MDN]
sources:
  - https://gemini.google.com/app/545f2ab763a70138
updated: 2026-06-11
---

# for...in 迴圈迭代順序與特性

## 重點整理

### for...in 不保證照「程式碼撰寫順序」迭代

雖然現代引擎看起來常常「照順序」,但背後是 ECMAScript 的排序規則,不是看誰先寫:

1. **整數屬性會自動插隊**:鍵名是正整數(或像整數的字串)會被拉到最前面、由小到大排序。

```javascript
const myObj = { "z": "最後寫的字母", "2": "第二個寫的數字", "a": "第一個寫的字母", "1": "第一個寫的數字" };
for (let key in myObj) console.log(key);
// 輸出:"1" → "2" → "z" → "a"
// 數字鍵被提早且升序;非數字鍵才大致照撰寫順序
```

2. **歷史包袱**:早期規範對 for...in 順序完全沒定義,各瀏覽器自行其是。ES6 之後對 `Reflect.ownKeys()` 等有嚴格規定(正整數索引升序 → 字串鍵照加入順序 → Symbol 鍵照加入順序),**但 for...in 仍是特例**——它會爬原型鏈,自身屬性與繼承屬性的交叉順序留給引擎實作,所以 MDN 強調它是 "arbitrary order"(任意順序)。

3. **需要嚴格順序時**:
   - 陣列 → 用 `for...of`、`forEach()` 或傳統 `for`,不要用 `for...in`。
   - 物件且順序重要 → 改用 `Map`(嚴格保證插入順序)。

### for...in vs 傳統 for 迴圈

| 特性 | `for (const x in obj)` | 傳統 `for (let i = 0; ...)` |
|---|---|---|
| 遍歷對象 | 物件的**屬性名稱(key,字串)** | 數字計數器,常用於陣列索引 |
| 原型鏈 | **會**爬原型鏈,連繼承屬性一起抓 | 不會,由數字邊界決定 |
| 順序 | 不保證 | 絕對保證 0,1,2... |
| 控制彈性 | 低(掃全部,除非 break) | 高(可 i--、i+=2、自訂條件) |

傳統 for 無法直接遍歷物件(物件沒有 `.length` 與數字索引),要先 `Object.keys(obj)` 轉成陣列。

### MDN 範例的 showProps 不是內建函式

- `show_props(obj, objName)` 是 MDN 為了示範自己寫的自訂函式。
- 函式**無法**自動得知傳入變數在外部的名稱;範例是呼叫端手動把名稱硬寫成字串傳進去:`show_props(o, "o")`,函式內再用字串拼接 `objName + "." + prop + " = " + obj[prop]`。改傳 `"myAwesomeObject"` 輸出就變 `myAwesomeObject.a = 1`。

### Mozilla 是什麼

- 全球性開源社群 + 非營利組織(Mozilla 基金會與 Mozilla 公司),旗艦產品 Firefox(少數不用 Chromium 核心的瀏覽器)。
- **MDN Web Docs** 就是 Mozilla 維護的,前端最權威的 HTML/CSS/JS 文件。其他產品:Thunderbird、Pocket。
- 起源:Netscape(網景)被 IE 打敗前把瀏覽器程式碼開源,成立 Mozilla 管理。名字 = Mosaic Killer + Godzilla。
- 非營利:收入(主要來自 Firefox 預設搜尋引擎權利金)投入網路隱私、開源研發。

## 各對話來源

### For...in 迴圈迭代順序解析(2026-06)— https://gemini.google.com/app/545f2ab763a70138

使用者:如果 for...in loop 是用任意順序來迭代可列舉屬性,那他不會順著程式碼被撰寫的順序嗎?

Gemini:沒錯,它真的不會保證順著你寫程式碼的順序!雖然現代 JavaScript 引擎有時看起來「乖乖照順序」輸出,但背後是 ECMAScript 規範的複雜排序規則:(1) 整數屬性會被自動排序並插隊——鍵名是正整數(或像整數的字串)會被拉到最前面並由小到大排序;(2) 歷史包袱——最早期規範對 for...in 順序完全沒定義,不同瀏覽器各自實作。ES6 起對物件屬性走訪順序(如 Reflect.ownKeys())有嚴格規定:正整數索引按數值升序、一般字串鍵按加入順序、Symbol 鍵按加入順序。但 for...in 依然是特例,因為它會爬原型鏈抓繼承屬性,自身與繼承屬性的交叉順序留給引擎實作,所以 MDN 強調它是 "arbitrary order"。結論:陣列絕對不要用 for...in,請用 for...of、forEach() 或傳統 for;物件且順序重要建議改用 Map,Map 嚴格保證「怎麼塞進去就怎麼拿出來」。

使用者:mozilla 是什麼

Gemini:Mozilla 是全球性的開源社群與非營利組織(由 Mozilla 基金會及其全資子公司 Mozilla 公司組成),最著名的產品是 Firefox。核心精神:「打造一個開放、自由、人人都能安全造訪且不受財團壟斷的網路世界。」主要產品:Firefox(少數不依賴 Chromium 核心的獨立瀏覽器,注重隱私與開源)、MDN Web Docs(前端工程師公認最權威的 HTML/CSS/JS 文件)、Thunderbird(開源郵件客戶端)、Pocket(稍後閱讀服務)。歷史:1990 年代瀏覽器霸主 Netscape Navigator 被微軟 IE 擊敗,Netscape 把瀏覽器程式碼開源並成立 Mozilla 團隊管理。Mozilla = Mosaic Killer + Godzilla 的混血字,最初吉祥物是紅色哥吉拉恐龍。Mozilla 基金會是非營利組織,收入(多來自 Firefox 預設搜尋引擎權利金)重新投入網路隱私權推廣、開源技術研發與網路平權運動。

使用者:showProps 是 javascript 內建的 function 嗎? else how does this function knows objName argument is the identifier

Gemini:不是,showProps 不是內建函式,是 MDN 介紹 for...in 時自己寫的範例自訂函式。它其實「不知道」變數名稱——是呼叫的人手動硬寫成字串傳進去的。範例:`var o = { a:1, b:2, c:3 }; alert(show_props(o, "o"));`,第一個參數傳物件本身供迴圈迭代,第二個參數傳普通字串 "o"。函式內部用字串拼接 `result += objName + "." + prop + " = " + obj[prop] + "\n"`。若改成 `show_props(o, "myAwesomeObject")`,輸出就變成 `myAwesomeObject.a = 1`。函式沒有超能力偵測外部變數名稱。

使用者:這個 for(const x in Leo) 的 loop 跟一般的 for loop 差在哪?功能上

Gemini:三大核心差異:(1) 遍歷對象不同——for...in 專門遍歷物件的屬性名稱(key,字串型態);傳統 for 是數字計數器,常用來存取陣列索引。(2) 運作機制——for...in 自動抓物件所有可列舉(Enumerable)屬性;傳統 for 無法直接遍歷物件(物件沒有 .length 和數字索引),要先 `Object.keys(Leo)` 轉陣列再用索引。(3) 特性與陷阱——for...in 會爬原型鏈(連原型上的自訂屬性一起抓)、不保證順序、控制彈性低;傳統 for 不爬原型鏈、絕對保證順序、彈性極高(可倒數、跳著數)。總結:想掃描物件所有屬性用 for...in 最方便;需要精確控制次數、順序或操作陣列,用傳統 for(或 for...of)。
