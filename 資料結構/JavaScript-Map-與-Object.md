---
title: JavaScript Map 與 Object(插入順序、原型、效能、底層)
type: topic-note
source: Gemini
tags: [gemini, javascript, map, object, prototype, 資料結構]
sources:
  - https://gemini.google.com/app/075744bf24b3326c
  - https://gemini.google.com/app/ac76adbcb6229b71
updated: 2026-06-10
---

# JavaScript Map 與 Object

> 本篇由兩段 Gemini 對話統整而成:〈JavaScript Map 保持插入順序〉與〈Map vs Object Performance〉。

## 重點整理

### Map 的順序與取值
- **Map 保證順序**:依「第一次用 `set()` 加入鍵值對」的先後順序記住;之後更新某鍵的值,位置不變。
- **有順序但「沒有 index」**:不能用 `myMap[0]` 取第一個(會是 `undefined`)。順序是透過「迭代」表達——用迴圈讀時保證照進場順序吐出。
  - `forEach` 傳入參數是 `(value, key)`,沒有 index。
  - `for...of` 跑的是內部 `entries` 迭代器,依序回傳 `[key, value]`。
  - 真的要 index → 用展開運算子轉成陣列:`const arr = [...myMap]; arr[0] // ["first","第一名"]`。

```javascript
const myMap = new Map([["first","第一名"],["second","第二名"]]);
myMap.forEach((value, key) => console.log(`${key}: ${value}`));
for (const [key, value] of myMap) console.log(key, value);
const arr = [...myMap]; // 轉陣列後才有 0,1,2 索引
```

### `map.size`
- 回傳 Map 裡的鍵值對數量,專業講法是 **entries count**。

### Map vs Object 核心差異

| 特性 | 一般物件 Object `{}` | Map 物件 `new Map()` |
| :-- | :-- | :-- |
| 預設原型 | `Object.prototype` | `Map.prototype` |
| 鍵的型別 | 只能 String 或 Symbol | 任何型別(物件、函式、各種 primitive) |
| 順序性 | 不保證依插入順序(整數鍵會被排到前面) | 嚴格保證插入順序 |
| 效能 | 頻繁新增/刪除較差(`delete` 破壞 V8 優化) | 針對頻繁增刪做過底層優化 |
| 遍歷 | 預設不可迭代,需 `for...in` 或 `Object.keys()` | 預設可迭代,可直接 `for...of` |

- 註:字串本身就是一種 primitive;說「Map 的鍵可以是 primitive」是強調它「任何型別都行」,不像 Object 只能 string/Symbol。

### console 裡的 `[[Entries]]` 與 `[[Prototype]]`
- `console.log(map)` 會看到 `[[Entries]]`(裡頭的鍵值對)和 `[[Prototype]]: Map`。
- `[[Entries]]` 只有集合類(Map / Set)才有;`[[Prototype]]` 幾乎所有物件都有(展示它繼承的對象)。
- `[[Prototype]]: Map` **不是廢話**:代表這物件能存取 `Map.prototype` 上的 `set / get / has / delete` 等方法。一般 `{}` 的原型是 `Object.prototype`,只有 `toString()`、`hasOwnProperty()` 等基本功能。

### 三大常見混淆
1. **語法**:把 Map 當普通物件賦值 `myMap.name = "Alice"` 不會報錯,但只是塞了個普通屬性,沒進 `[[Entries]]`,`myMap.get("name")` 抓不到。正確要用 `myMap.set("name","Alice")`。
2. **萬物皆物件**:`typeof myMap === "object"`,所以 Map/Set/Array 常被混稱物件;看 `[[Prototype]]` 才能分辨真實身份。
3. **本質差異**:見上面對比表。

### 底層:為什麼 Map 存取是「次線性 Sublinear / 接近 O(1)」
- **Sublinear**:資料變多時,存取時間不會跟元素數量成正比上升;百萬筆 key 查找仍很快。
- Map ≈ **Hash Table**:`key →(hash function)→ 整數 →(取模 % buckets 數)→ index`;buckets 是陣列,可用 index 在 O(1) 直達。
- **雜湊碰撞**:不同 key 取模後落到同一 bucket → 用 **鏈結法 Chaining**(linked list 掛在後面)。
- 理想 O(1)(每桶一筆);最壞 O(n)(全擠同一桶,退化成逐一比對);現代實作用均勻雜湊 + 資料過多時動態增加 buckets 重新分配,平均遠低於線性。

### 延伸概念
- **JS 是「基於原型、函式先行」的語言**(MDN 定義 prototype-based, first-class functions)。
- **一等函式**:函式能做一般值能做的事——存進變數/物件屬性、當參數傳(callback)、被回傳(closure);且函式本質也是物件,身上預放了 `prototype` 屬性。
- **`prototype` 屬性(建構函式專屬)** vs **`__proto__` 隱式原型(所有物件都有,等同 `Object.getPrototypeOf(obj)`)**:`new` 出來的實體的 `__proto__` 指回建構函式的 `prototype`。呼叫 `userRoles.get()` 時,先在實體找,找不到就沿原型鏈爬到 `Map.prototype` 找到並執行。
- **`class` 是語法糖**:底層仍是 prototype + 一等函式;`typeof Pokemon === "function"`(即使用 `class` 宣告)。好處是降低心智負擔(`extends` 取代繁瑣的 `Object.create()`)、吸引 Java/C++ 背景開發者。
- **immutability(React)**:資料建立後不直接改,要更新就建新版本、保留原本不動;React 靠「比較新舊 state 的參考(reference)」判斷有無變更來決定 re-render,快又避免就地 mutate 的 bug。移除陣列元素用 `filter()` 回傳新陣列。
- **`for...in`**:遍歷物件的「可列舉屬性」,包含「繼承來的」(來自 prototype 這個藍圖物件,prototype 與物件本身是不同的東西)。

## 各對話來源

### JavaScript Map 保持插入順序 — https://gemini.google.com/app/075744bf24b3326c

**使用者:** 那他返回順序的表達方式就是 index 嗎?是 0 1 2 3 4 5 這樣子?

**Gemini:** 不是。Map 返回順序「不是」像陣列那樣的 index。Map 會記得順序,但本質沒有索引值概念,不能 `myMap[0]`(會 undefined)。它透過「迭代」讓你拿到順序:用迴圈讀時保證照進場順序一個個吐出。① `forEach` 傳入 `(value, key)`,沒有 index;② `for...of` 跑內部 entries 迭代器,依序回傳 `[key, value]`。若真要像陣列用 0,1,2,要先用展開運算子 `[...myMap]` 轉成陣列才有 index。總結:陣列用 index 表位置;物件不保證順序(整數鍵會被排到最前);Map 保證先來後到,但表達順序的方式是「迭代時嚴格按加入時間輸出」,而非貼 0,1,2 標籤。

**使用者:** 請解釋 JavaScript 是一門基於原型函式先行的語言。延伸說明 prototype 與一等函式。

**Gemini:** MDN 定義 JS 是「基於原型(Prototype-based)、函式先行(First-class functions)」。① 一等函式:函式是「一等公民」,凡是一般值/物件能做的(存進變數或物件屬性、當參數傳=callback、被回傳=closure)函式都能做;因為是一等公民,函式本質也是物件,能擁有屬性,JS 在每個函式身上預放了 `prototype` 屬性。② 原型:JS 發明時沒有 Class(現代 `class` 只是語法糖),創造物件靠「複製與繼承現有物件」,被當範本的現成物件叫原型。要分清:`prototype` 屬性(建構函式專屬,指向一個存放「未來 new 出的實體可共享的方法/屬性」的物件)vs `__proto__` 隱式原型(所有物件都有,`new` 後回頭指向建構函式的 `prototype`)。③ 串連:`const userRoles = new Map(...)`;`userRoles.get()` 能用是因為 Map 是內建建構函式,`.get/.set/.has` 都寫在 `Map.prototype`;呼叫時先在實體找,找不到沿 `__proto__` 爬到 `Map.prototype` 找到執行(原型鏈)。此架構讓所有實體共享同一原型倉庫的方法,極省記憶體。

**使用者:** 怎麼說現代的 class 關鍵字其實只是語法糖?

**Gemini:** ES6 的 `class` 在底層沒創造任何新「類別」機制,只是把複雜的原型鏈語法包裝成像 Java/C++ 的糖衣。瀏覽器執行時會把 `class` 翻譯回 prototype + 一等函式。對比:`class Pokemon { constructor(name){this.name=name} attack(){...} }` 底層等於 `function Pokemon(name){this.name=name}` + `Pokemon.prototype.attack = function(){...}`。`typeof Pokemon` 仍是 `"function"`。需要語法糖的原因:降低處理繼承的心智負擔(`extends` 取代繁瑣的 `Object.create()` 與手動指回 constructor)、吸引 Java/C# 背景開發者無痛上手。語法糖=對功能沒影響、但更好寫好讀的語法。骨子裡 JS 仍是基於原型與一等函式,所以前端圈常說「JS 沒有真正的 class」。

**使用者:** `map.size` 印出是什麼?可以用比較專業的講法說 size 是什麼嗎?是幾對的意思?

**Gemini:** `map.size` 回傳 Map 中的鍵值對數量,專業術語是 **entries count**。

**使用者:**(延伸)map 是 key value pairs 的 collection,可以再多描述嗎?

**Gemini:** 在 JS 中由鍵值對組成的集合,就是建立索引與資料的對應關係,提供 key 就能快速找到對應 value。Map 讓這種映射更靈活,因為 key 可以是任何型態,且嚴格按存入順序排列,巡訪/操作更直觀。

**使用者:** 規格要求 map 的平均存取時間 sublinear on the number of elements,請解釋 sublinear。

**Gemini:** 「Sublinear on the number of elements」指 map 變大時,存取一個項目的時間不會跟元素數量成正比/直線上升。實務上即使有上百萬個 key,查找仍極快,因為通常用 hash table,多數查找是常數時間 O(1)。

**使用者:** 請畫出 hash table 給我看。

**Gemini:**(附 hash table 圖解)核心流程 key→index:① 輸入 key(JS Map 的 key 可以是任何東西);② **Hash Function**(靈魂):接收 key 算出一個整數;③ **取模 %**:把可能很大的整數限制在 buckets 數量內(如 8 桶就 `hash % 8` 得 0~7 的 index)。儲存結構:**Buckets** 是陣列(可用 index 在 O(1) 直達),每桶存真正的 `[key,value]`。**雜湊碰撞**:不同 key 取模後對到同一 index → 用 **鏈結法 Chaining**,新 `[key,value]` 像掛車廂用 linked list 掛在舊資料後面,不覆蓋。為什麼是 Sublinear:理想每桶最多一筆=O(1),一次到位與總量無關;最壞所有 key 擠同桶=沿 linked list 逐一比對=O(n);現代 JS Map 用均勻分配的雜湊 + 資料過大時自動增加 buckets 重新分配,平均存取時間遠低於線性,絕大多數接近 O(1)。

### Map vs Object Performance — https://gemini.google.com/app/ac76adbcb6229b71

**使用者:** 用什麼 function 移除項目?

**Gemini:** 移除項目通常用 `filter()`。它建立一個只含符合條件項目的全新陣列,等於排除掉你要移除的那個而不動到原始資料,能讓 state 保持可預測。

**使用者:** 可以解釋 immutability 嗎?React 裡的 immutability。

**Gemini:** Immutability 指資料一旦建立就不直接改;要更新就建立一個帶有變更的全新版本,原始的保持不動。在 React 很重要,因為它幫 React 偵測 state 是否變化——React 不必深入物件內部比對,只要比較新舊 state 的「參考(reference)」;參考不同就知道有更新、需要 re-render。保持應用快速,並避免就地 mutate 造成的 bug。

**使用者:** 物件是不可迭代的,那它可以「便利(遍歷)物件」的原因是什麼?是因為會把繼承來的可列舉屬性也跑進去嗎?繼承來的是什麼意思?原本物件就是一個 prototype 嗎?物件跟 prototype 是不相等的東西嗎?

**Gemini:** 物件不被視為可迭代,因為它們沒實作 iteration protocol;但 `for...in` 專門設計來走訪物件的「可列舉屬性」。講「繼承屬性」是指物件從它的 prototype(像藍圖的物件,不是物件本身)得到的屬性。兩者確實是不同的東西;每個物件都連到一個 prototype,除非你顯式建立一個沒有原型的物件。

**使用者:** 解釋 blueprint。

**Gemini:** 把 prototype 想成一張母版設計/藍圖,是一個定義「其他物件可繼承的初始屬性與方法」的物件,可視為共享模板,避免為相似物件重複寫程式碼。

**使用者:** 我今天要複習 JavaScript 的 map 物件跟 object 物件。

**Gemini:** Map 和 Object 都存鍵值對,但運作有明顯差異,尤其在 key 型別、迭代、特定情境的效能。例如 Object 的 key 只能是字串或 Symbol,Map 的 key 可以是任何型別(函式、物件、甚至 primitive);Map 也保留 key 的原始插入順序,Object 不保證。

**使用者:** even primitive values 怎麼說?字串原本就是 primitive 的一種不是嗎?

**Gemini:** 沒錯,字串確實是 JS 的一種 primitive value。提到 Map 可用 primitive 當鍵,主要是強調 Map 的鍵可以是任何型別,不像物件只能用字串或 Symbol,這種彈性讓資料儲存有更多選擇。

**使用者:** 我這樣寫助理對嗎?我寫說 console.log 一個 Map 物件的 identifier(user roles)會顯示 entries 跟 prototype,但 entries 跟 prototype 會在什麼時候出現?只有 console.log 一個單純物件時會嗎?object 呢?

**Gemini:** 基本上正確。在控制台印出 Map 物件確實會看到內部的 entries 和 prototype。但時機不同:`[[Entries]]` 通常只出現在集合物件(Map、Set),顯示其鍵值對;`[[Prototype]]` 則幾乎所有 JS 物件都有,展示繼承對象。若是 plain object,控制台會列出它的鍵值對和繼承自 `Object.prototype` 的原型。

**使用者:** new map 物件的 prototype 是 Map,這是在講廢話嗎?

**Gemini:** 不是廢話。顯示 `[[Prototype]]: Map` 意味這個 Map 物件能存取 `Map.prototype` 上的屬性與方法(`set`、`get`、`has` 等),對了解繼承關係與用法非常關鍵。

**使用者:** 講 map object 有時候是不是會跟 object 產生混淆?

**Gemini:** 你點出核心問題:「既然是 Map,prototype 是 Map 不是理所當然?為何特地寫出來?」這正是 JS 區分 Map 與一般物件(Plain Object)最關鍵的鐵證。控制台顯示 `[[Prototype]]: Map` 是告訴你這物件擁有 Map 專屬方法,跟一般 Object 不同。原型鏈:`{}` 的原型直接指向 `Object.prototype`(只有 `toString()`、`hasOwnProperty()` 等);`new Map()` 的原型指向 `Map.prototype`(才生得出 `set/get/clear/delete`)。三大混淆:① 語法——`myMap.name="Alice"` 是塞普通屬性,沒進 `[[Entries]]`,`get("name")` 抓不到;要用 `myMap.set("name","Alice")`。② 萬物皆物件——`typeof myMap` 回傳 `"object"`,所以 Map/Set/Array 常被混稱物件,看 `[[Prototype]]` 才能看穿身份。③ 核心差異對決(預設原型、key 型別、順序性、效能、遍歷方法)見對比表。
