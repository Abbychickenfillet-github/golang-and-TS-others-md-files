---
title: "Getter / Setter 與 OOP 封裝｜JS、Java、Python、C# 跨語言比較"
type: topic-note
source: Gemini
tags: [gemini, javascript, java, python, csharp, oop, encapsulation, getter, setter, 面試]
sources:
  - https://gemini.google.com/app/2f8e0a32ed203a4b
updated: 2026-08-25
---

# Getter / Setter 與 OOP 封裝｜跨語言比較

> [!info] 本篇重點 a–g 共 7 個
> 一句話結論：<mark style="background: #FFF3A3A6;">Getter / Setter 是 OOP「封裝」的核心機制，但「一定要寫 class 才能用嗎」完全看語言設計</mark>。JavaScript 是這幾個語言裡唯一「不用 class 也能用」的。

> [!info] 與其他筆記的關聯（附理由）
> a. 這篇是 [[存取器屬性三種定義方式-getter-setter與資料驗證]] 的「語言比較版」。那篇講的是「在 JavaScript 裡怎麼做出存取器屬性」（物件字面值、`Object.defineProperty`、class），本篇補上「這件事在 Java、Python、C# 長什麼樣，以及為什麼 OOP 需要它」，避免只會 JS 寫法但答不出面試的觀念題。
> b. 呼應 [[Object靜態方法vs原型方法-Symbol弱封裝與species]] 的 l 節：那篇談「怎麼把屬性藏起來」（Symbol 弱私有 vs `#` 真私有），本篇談「藏起來之後要怎麼開一扇受控的門給外面用」，兩篇合起來才是完整的封裝故事。

---

## 重點整理

**a.** Getter / Setter <mark style="background: #ADCCFFA6;">不是 JavaScript 專屬的東西</mark>。它是物件導向程式設計（OOP，Object-Oriented Programming）實現「封裝（Encapsulation）」的通用機制，Java、Python、C# 都有。

**b.** 封裝要解決的第一件事是<mark style="background: #FFF3A3A6;">控制存取權限</mark>：把物件內部的欄位設為私有（private），只透過 Getter / Setter 暴露一個對外的存取介面，避免外部程式直接改動內部狀態。

**c.** 封裝要解決的第二件事是<mark style="background: #BBFABBA6;">邏輯驗證與保護</mark>：可以在 Setter 裡加資料合法性檢查（例如年齡不可為負數），或在 Getter 裡回傳資料副本，防止外部拿到參考後直接改到原始物件。

**d.** 各語言對 class 的依賴程度（這是本篇最該記住的表）：

| 語言 | 是否必須寫出 class | 運作方式 |
|---|---|---|
| Java | <mark style="background: #FF5582A6;">是</mark> | Java 是純 class-based 語言，所有方法（含 Getter / Setter）都必須定義在 `class` 或 `record` 內 |
| JavaScript | <mark style="background: #BBFABBA6;">否</mark> | 除了 `class` 內可以寫，也可以直接寫在物件字面值 `const obj = { get x() {} }`，或用 `Object.defineProperty()` 定義 |
| Python | 是（主要） | 通常用 `@property` 裝飾器定義在 class 內部 |
| C# | 是 | 以屬性（Property）形式寫在 `class` 或 `struct` 內：`public string Name { get; set; }` |

**e.** JavaScript 之所以能「不用 class」，根本原因是它是<mark style="background: #D2B3FFA6;">基於原型（prototype-based）而不是基於類別（class-based）的語言</mark>。JS 的 `class` 只是語法糖，底層仍是建構函式加原型鏈，所以存取器屬性本來就可以直接定義在任何一個物件上，不必先有類別。

**f.** 三種 JavaScript 寫法對照（詳細版請看 [[存取器屬性三種定義方式-getter-setter與資料驗證]]）：

```js
// 寫法一：物件字面值（最輕量，不需要 class）
const user1 = {
  _age: 25,
  get age() { return this._age; },
  set age(v) {
    if (v < 0) throw new RangeError("年齡不可為負數");
    this._age = v;
  }
};

// 寫法二：Object.defineProperty（可額外控制 enumerable / configurable）
const user2 = {};
Object.defineProperty(user2, "age", {
  get() { return this._age; },
  set(v) { this._age = v; },
  enumerable: false          // 讓它不出現在 Object.keys 與 for...in
});

// 寫法三：class（最接近 Java / C# 的心智模型）
class User {
  #age = 0;                  // ES2022 真私有欄位
  get age() { return this.#age; }
  set age(v) {
    if (v < 0) throw new RangeError("年齡不可為負數");
    this.#age = v;
  }
}
```

**g.** Java 與 C# 的對照寫法，看一次就知道差別在哪：

```java
// Java：一定要在 class 裡，而且 getter / setter 是「方法」，呼叫要加括號
public class User {
    private int age;                              // 私有欄位
    public int getAge() { return age; }           // Getter
    public void setAge(int age) {                 // Setter（含驗證）
        if (age < 0) throw new IllegalArgumentException("年齡不可為負數");
        this.age = age;
    }
}
// 使用：user.setAge(25);  int a = user.getAge();
```

```csharp
// C#：語言把 getter / setter 包成「屬性（Property）」，用起來像欄位不用加括號
public class User {
    private int _age;
    public int Age {
        get => _age;
        set {
            if (value < 0) throw new ArgumentOutOfRangeException(nameof(value));
            _age = value;
        }
    }
}
// 使用：user.Age = 25;  int a = user.Age;
```

```python
# Python：用 @property 裝飾器，用起來也像欄位
class User:
    def __init__(self):
        self._age = 0

    @property
    def age(self):
        return self._age

    @age.setter
    def age(self, value):
        if value < 0:
            raise ValueError("年齡不可為負數")
        self._age = value
# 使用：user.age = 25   a = user.age
```

> [!tip] 面試一句話版本
> 「Getter / Setter 是封裝的實作手段：把欄位設 private，再開一個受控的入口做驗證。<mark style="background: #FFF3A3A6;">Java、Python、C# 都必須寫在 class 裡，只有 JavaScript 因為是原型導向，可以直接在物件字面值或用 `Object.defineProperty` 定義存取器屬性</mark>。C# 與 Python 的寫法在呼叫端看起來像存取欄位，Java 則是明確的 `getXxx()` / `setXxx()` 方法。」

> [!warning] 存疑與更正
> Gemini 這場對話結尾主動提議「需要幫你在 Google Slides 建立一份簡報嗎」並被接受，但<mark style="background: #FF5582A6;">對話中沒有留下實際產出的簡報連結</mark>，因此本篇無法引用簡報內容。若 Abby 之後找到那份 Slides，可以把連結補進 frontmatter 的 sources。<br>另外 Gemini 表格中 Python 標「是（主要）」是正確的謹慎說法：Python 確實也能用 `property()` 函式或描述器（descriptor）在 class 外組裝，但實務上都還是掛回 class，所以理解成「要 class」即可。

---

## 相關練習題（LeetCode JavaScript 專區）

| 題號與題目 | 練到本篇哪一節 | 連結 |
|---|---|---|
| 2695. Array Wrapper | e、f 節：透過覆寫 `valueOf` 與 `toString` 客製化物件行為，是「存取器思維」的延伸 | <https://leetcode.com/problems/array-wrapper/> |
| 2632. Curry | b 節：函式層級的封裝與延遲求值，跟 Getter「被讀取時才執行」是同一種思路 | <https://leetcode.com/problems/curry/> |
| 2725. Interval Cancellation | c 節：把內部狀態藏在閉包裡只回傳受控介面，是不用 class 的封裝實作 | <https://leetcode.com/problems/interval-cancellation/> |

---

## 自我測驗

<div class="quiz" markdown="0">
<div class="q">填空題 1：Getter / Setter 是 OOP 中實現 <span class="blank">封裝 Encapsulation</span> 的核心機制。</div>
<div class="q">填空題 2：JavaScript 不寫 class 也能定義存取器屬性，另外兩種方式是物件字面值與 <span class="blank">Object.defineProperty()</span>。</div>
<div class="q">填空題 3：Python 定義 getter 用的裝飾器是 <span class="blank">@property</span>。</div>
</div>

<div class="quiz" markdown="0">
<div class="q">是非題 1：所有支援 OOP 的語言都必須寫出 class 才能使用 Getter / Setter。</div>
<div class="opts"><button onclick="pick(this,false)">是</button><button onclick="pick(this,true)">非</button></div>
<div class="ans">非。JavaScript 是原型導向語言，可以直接在物件字面值上寫 <code>get x() {}</code>，或用 <code>Object.defineProperty()</code> 定義，完全不需要 class。（本篇 d、e 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">是非題 2：C# 的 <code>public string Name { get; set; }</code> 在呼叫端要寫成 <code>user.Name()</code>。</div>
<div class="opts"><button onclick="pick(this,false)">是</button><button onclick="pick(this,true)">非</button></div>
<div class="ans">非。C# 把 getter / setter 包成「屬性 Property」，呼叫端寫起來跟存取欄位一樣是 <code>user.Name</code>，不加括號。Java 才是明確的 <code>getName()</code> 方法呼叫。（本篇 d、g 節）</div>
</div>

<div class="quiz" markdown="0">
<div class="q">申論題：請說明封裝要解決的兩個問題，並用一段 JavaScript 程式示範「在 Setter 裡做資料驗證」。</div>
<button class="tb" onclick="showAns(this)">顯示答案</button>
<div class="ans">參考答案：<br>一、控制存取權限——把內部欄位設為私有，只留受控的對外介面，避免外部直接改動內部狀態造成不可預期的錯誤。<br>二、邏輯驗證與保護——在 Setter 內加合法性檢查（例如年齡不可為負），或在 Getter 內回傳副本避免外部改到原始資料。<br>示範：<code>class User { #age = 0; set age(v) { if (v &lt; 0) throw new RangeError("年齡不可為負數"); this.#age = v; } get age() { return this.#age; } }</code>（本篇 b、c、f 節）</div>
</div>

---

## 各對話來源（原文精華）

### Getter/Setter 與 OOP 封裝比較（2026-08）— <https://gemini.google.com/app/2f8e0a32ed203a4b>

**使用者：** getter/setter 不是只指 JavaScript 的東西，Java 裡面也有，但是它跟 OOP 比較有關係，它是一個封裝在用的東西，而且必須要寫出 class 才能用？

**Gemini：** 你的理解非常準確。Getter/Setter 的確是物件導向編程（OOP）實現「封裝（Encapsulation）」的核心機制，但「是否一定要寫出 class 才能用」則取決於程式語言的設計。……控制存取權限：將物件內部的欄位設為私有（private），僅透過 Getter/Setter 暴露對外的存取介面……邏輯驗證與保護：可在 Setter 內加入資料合法性檢查（例如年齡不可為負數），或在 Getter 內傳回資料副本以防止外部改動原始物件。……Java：是，Java 為純以 Class 為基礎的語言；JavaScript：否，也可以直接在普通物件字面值或透過 `Object.defineProperty()` 定義；Python：是（主要），通常使用 `@property` 裝飾器；C#：是，以屬性（Property）的形式寫在 class 或 struct 內。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| Gemini 對話：Getter/Setter 與 OOP 封裝比較 | <https://gemini.google.com/app/2f8e0a32ed203a4b> | 對話時間 2026-08，擷取於 2026-08-25 |
| MDN：get 語法 | <https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Functions/get> | 查證於 2026-08-25 |
| MDN：Object.defineProperty() | <https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty> | 查證於 2026-08-25 |
| MDN：Private properties（`#` 私有欄位，ES2022） | <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties> | 查證於 2026-08-25 |
| Python 官方文件：property() | <https://docs.python.org/3/library/functions.html#property> | 查證於 2026-08-25 |
| Microsoft Learn：C# Properties | <https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/properties> | 查證於 2026-08-25 |
