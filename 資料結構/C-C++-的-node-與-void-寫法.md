---
title: C/C++ 的 node 與 void 寫法(從關鍵字判斷語言)
type: topic-note
source: Gemini
category: 技術
tags: [gemini, c, cpp, 資料結構, linked-list, void]
sources:
  - https://gemini.google.com/app/ff40f2b0ef517296
updated: 2026-06-11
---

# C/C++ 的 node 與 void 寫法(從關鍵字判斷語言)

## 重點整理

看到 `xfun` 和 `node` + `void` 同時出現,幾乎可以確定是 **C 或 C++**,典型情境是資料結構(鏈結串列、樹)的範例程式碼。

### void 與 node 的線索

- `void`:C/C++ 的「無型態 / 不回傳值」。如 `void insertNode(Node* head, int data) { ... }`
- `node` / `Node`:工程師自訂的 `struct` 或 `class`,代表資料結構的一個節點。
- `void*`(萬用指標):C 想做能容納任何型態的節點時常見 `void* data;`。

### xfun 是什麼

- 不是 C/C++ 內建關鍵字。多半是自訂函式名(X-Function / Extra-Function),常見於作業與範例程式碼。
- 也有同名的 R 語言 `xfun` 套件,但與 void/node 同檔出現時,九成只是某人取的函式名。

```c
#include <stdio.h>

struct Node {
    int data;
    struct Node* next;
};

void xfun(struct Node* node) {
    // 執行某些操作
}
```

## 各對話來源

### C/C++ 語言判斷: xfun 與 node void(2026-06)— https://gemini.google.com/app/ff40f2b0ef517296

使用者:xfun 跟 node void 出現的話會是什麼語言

Gemini:最有可能是 C 或 C++。void 與 node 組合是 C/C++ 資料結構(鏈結串列、樹)的經典寫法:void 代表無型態/不回傳值,Node 通常是自訂 struct/class 節點,void* 是萬用指標。xfun 不是內建關鍵字,通常是自訂函式名稱(學校作業、範例程式常用),也存在 R 語言的 xfun 套件,但與 void、node 同檔出現時九成是 C/C++ 函式名。並附上典型範例:struct Node { int data; struct Node* next; }; 與 void xfun(struct Node* node)。
