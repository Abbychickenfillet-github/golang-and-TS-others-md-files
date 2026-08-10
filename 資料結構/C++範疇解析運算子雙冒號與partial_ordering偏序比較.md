---
title: C++ 雙冒號 :: 與 partial_ordering——範疇解析運算子與偏序比較
type: topic-note
source: Gemini
category: 技術
tags:
  - gemini
  - cpp
  - 資料結構
  - scope-resolution
  - spaceship-operator
  - cpp20
aliases: [C++雙冒號, 範疇解析運算子, partial_ordering, 太空船運算子]
related:
  - "[[C-C++-的-node-與-void-寫法]]"
sources:
  - https://gemini.google.com/app/2b66be0e684787b8
updated: 2026-08-09
---

# C++ 雙冒號 `::` 與 `partial_ordering`

> **本篇重點 a–j，共 10 個。**
> 這兩個問題是同一次對話問的，看起來無關，其實都在問同一件事：<mark style="background: #FFF3A3A6;">「這個名字／這個比較結果，到底屬於誰、代表什麼」</mark>。

---

## 第一部分：`::` 範疇解析運算子（Scope Resolution Operator）

(a) <mark style="background: #ADCCFFA6;">`::` 唸作 Scope Resolution Operator（範疇解析運算子）</mark>，作用是明確指出某個名稱（變數、函式、型別）屬於哪一個範疇（Scope）。

(b) <mark style="background: #ADCCFFA6;">存取命名空間成員</mark>：`std::cout` 表示 `std` 命名空間裡的 `cout` 物件。這也是為什麼你會看到有人寫 `using namespace std;` 之後就可以只寫 `cout`。

(c) <mark style="background: #ADCCFFA6;">存取類別的靜態成員或列舉</mark>：`MyClass::staticMethod()`、`Color::Red`。

(d) <mark style="background: #ADCCFFA6;">在類別外部定義成員函式</mark>：

```cpp
class MyClass {
public:
    void myFunc();      // 宣告在標頭檔
};

void MyClass::myFunc() { /* ... */ }   // 定義在 .cpp，:: 說明它屬於 MyClass
```

(e) <mark style="background: #FFB8EBA6;">前面不接任何名稱時，代表全域範疇</mark>。當區域變數與全域變數同名時，`::x` 明確指定要取全域的那一個。

```cpp
int x = 10;          // 全域
void f() {
    int x = 20;      // 區域，遮蔽了全域的 x
    std::cout << x;  // 20
    std::cout << ::x;// 10  ← 這裡的 :: 前面是空的
}
```

(f) <mark style="background: #FF5582A6;">常見混淆</mark>：`::` 與 `.`、`->` 完全不同。`::` 處理的是<mark style="background: #BBFABBA6;">編譯期的名稱歸屬</mark>；`.` 與 `->` 處理的是<mark style="background: #BBFABBA6;">執行期某個物件實例的成員存取</mark>。

---

## 第二部分：`partial_ordering` 偏序比較（C++20）

(g) 背景：C++20 引入<mark style="background: #ADCCFFA6;">三向比較運算子 `<=>`（俗稱太空船運算子，spaceship operator）</mark>，一次比較就同時得到「小於／等於／大於」的資訊，不必再分別寫 `<`、`==`、`>`。

(h) <mark style="background: #ADCCFFA6;">偏序（Partial Order）的意思是：不保證任意兩個值都能比出大小</mark>。最經典的例子是浮點數的 `NaN`（Not a Number）——它<mark style="background: #FF5582A6;">既不小於、也不等於、也不大於</mark>任何浮點數，包括它自己。

(i) `std::partial_ordering` 是 `x <=> y` 可能的回傳型別之一，它的四個值：

| 值 | 意義 |
|---|---|
| `less` | 小於 |
| `equivalent` | 等價 |
| `greater` | 大於 |
| <mark style="background: #FF5582A6;">`unordered`</mark> | 無法比較（例如與 NaN 比） |

<mark style="background: #FFF3A3A6;">`unordered` 就是「偏序」跟另外兩種排序的分水嶺</mark>。三種比較類別的差別：

| 型別 | 有 `unordered`？ | 等價是否代表可互換 | 典型用途 |
|---|---|---|---|
| `std::strong_ordering` | 否 | 是（完全相等） | 整數、字串 |
| `std::weak_ordering` | 否 | 否（等價但可區分，例如忽略大小寫比字串） | 自訂排序鍵 |
| `std::partial_ordering` | <mark style="background: #FF5582A6;">是</mark> | 否 | 浮點數 |

<mark style="background: #FFB8EBA6;">轉換方向只有單向</mark>：`strong_ordering` → `weak_ordering` → `partial_ordering` 可以隱式轉換，反過來不行。也就是說<mark style="background: #BBFABBA6;">強的可以當弱的用，弱的不能冒充強的</mark>。

(j) `std::partial_order` 則是 `<compare>` 標頭檔提供的<mark style="background: #ADCCFFA6;">自訂點物件（Customization Point Object，CPO）</mark>，也就是一個函式物件：呼叫 `std::partial_order(a, b)` 會回傳 `std::partial_ordering`。<mark style="background: #D2B3FFA6;">留意 `partial_order`（函式物件）與 `partial_ordering`（結果型別）差一個字尾，很容易看錯</mark>。

```cpp
#include <compare>
#include <cmath>

double a = 1.0, nan = std::nan("");
auto r = a <=> nan;                    // std::partial_ordering::unordered
bool ok = (r == std::partial_ordering::unordered);   // true
```

---

## 關聯筆記與關聯原因

- [[C-C++-的-node-與-void-寫法]]：<mark style="background: #D2B3FFA6;">同屬 C/C++ 語法辨識這一組</mark>。那篇看的是型別與指標的寫法，這篇看的是「名稱歸屬」與「比較結果型別」，都是讀 C++ 原始碼時第一眼會卡住的符號。

---

## 各對話來源（原文）

### C++ 雙冒號與 partial_order（2026-08）— https://gemini.google.com/app/2b66be0e684787b8

> **使用者：** c++ 2 個冒號是什麼意思。partial_order 是什麼
>
> **Gemini：**
> **1. C++ 中的兩個冒號 `::`**
> 兩個冒號 `::` 在 C++ 中稱為範疇解析運算子（Scope Resolution Operator），主要用於指定或明確指出名稱（變數、函數、類別等）所屬的範疇（Scope）。常見用途有以下幾種：
> - 存取命名空間（Namespace）中的成員：例如 `std::cout` 表示使用 `std` 命名空間裡面的 `cout` 物件。
> - 存取類別（Class/Struct）中的靜態成員或列舉：例如 `MyClass::staticMethod()` 或 `Color::Red`。
> - 在類別外部定義成員函數：例如 `void MyClass::myFunc() { ... }`，代表宣告在 `MyClass` 內的函數實作。
> - 存取全域變數（前面不加任何名稱）：當區域變數與全域變數同名時，可以在變數前加上 `::` 來明確指定要存取全域變數，如 `::x`。
>
> **2. 何謂 partial_order**
> 在 C++20 引進三向比較運算子（`<=>`，俗稱太空船運算子）後，`std::partial_order` 與 `std::partial_ordering` 用於處理偏序（Partial Ordering）比較：
> - 概念（Partial Order）：偏序意味著並非任意兩個值都能互相比較出大小。例如浮點數中的 NaN（Not a Number），它既不小於、不等於，也不大於任何浮點數。
> - `std::partial_ordering`（比較結果類別）：是 `x <=> y` 的傳回型態之一，可能的值包含 `less`、`equivalent`、`greater`、`unordered`。
> - `std::partial_order`（自訂點物件 / Customization Point Object）：是 `<compare>` 標頭檔中提供的函式物件，會對傳入的三向比較進行評估，並回傳 `std::partial_ordering` 的比較結果。

（本篇補充了 `strong_ordering` / `weak_ordering` / `partial_ordering` 的三方對照，以及 `::` 與 `.`、`->` 的差異，原對話沒有提到。）

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／查證時間 |
|---|---|---|
| 原始 Gemini 對話 | https://gemini.google.com/app/2b66be0e684787b8 | 2026-08（對話當下） |
| cppreference：`std::partial_ordering` | https://en.cppreference.com/w/cpp/utility/compare/partial_ordering | C++20，查證於 2026-08-09 |
| cppreference：`std::weak_ordering` | https://en.cppreference.com/w/cpp/utility/compare/weak_ordering | C++20，查證於 2026-08-09 |
| cppreference：`std::strong_ordering` | https://en.cppreference.com/w/cpp/utility/compare/strong_ordering | C++20，查證於 2026-08-09 |
| cppreference：`std::partial_order`（CPO） | https://en.cppreference.com/cpp/utility/compare/partial_order | C++20，查證於 2026-08-09 |
| 三種比較類別的差異與轉換方向 | https://simontoth.substack.com/p/daily-bite-of-c-stdstrong_ordering-5b3 | 查證於 2026-08-09 |
