# JavaScript Object Notation（記號法）
## 一、是以純文字為基礎去將結構化資料呈現為JS物件的標準格式。
- 原由：為什麼叫JavaScript Object Noation？因為這套資料格式的寫法跟JS的物件實字一模一樣
- 本質：**「把字串外套剝掉，還原成它原本代表的 JS 資料型態」**。
- 為了讓「不同程式語言之間交換資料」變得極度簡單且容易被解析（Parse）。

- 將：不同語言不同結構的物件<mark style="background: #FFB8EBA6;">先變成純文字（String）」才能傳輸。</mark>


- Object Literal跟Array Literal在_ECMA-262_ Edition 3裡面就有，_JSON_主要也就是由這一部份的功能發展出來的。
- JSON是在ECMA Edition3 納入的
- ECMA-262 指的是官方標準規格書編號，也就是Javascript語言
- 如果遇到ES5, ES4, ES6 的意思是版本演進（俗稱）
- 之後會用年份命名
---

## 延伸閱讀（2026-09-19 補）

- [[嚴格模式-PropertyDescriptor-與JSON的關係]]
  **關聯原因**：這份筆記講 JSON 是「把字串外套剝掉還原成 JS 資料型態」，延伸那篇補上兩件事 —— 一是**還原時用的是定義語意（CreateDataProperty）而不是賦值語意**，所以 `JSON.parse` 本身不會造成原型污染；二是**序列化時哪些屬性會被剝掉**，也就是 `enumerable:false` 與 Symbol 鍵會被 `JSON.stringify` 直接跳過。
