---
title: DTD(文件類型定義)
type: concept-note
source: Claude
category: 技術
tags: [dtd, sgml, xml, html, doctype, 面試]
updated: 2026-07-15
---

# DTD(Document Type Definition,文件類型定義)

> 一句話：DTD 是一份「**合法標籤與結構的規則清單**」，規定某種文件「可以用哪些元素、屬性、怎麼巢狀」，讓驗證器能判斷這份文件合不合法。

## 是什麼

- **全名**：Document Type Definition，文件類型定義。
- **來自** [[SGML-標準通用標記語言|SGML]] / XML 的世界：在那裡，每一種文件類型都可以寫一份 DTD 來描述它的「文法」。
- 內容大致是這些宣告：
  - `<!ELEMENT ...>`：定義有哪些元素、能包住什麼
  - `<!ATTLIST ...>`：定義元素能有哪些屬性
  - `<!ENTITY ...>`：定義實體（例如 `&nbsp;`）

## ⚠️ DTD ≠ DOCTYPE（最常搞混）

| 名稱 | 是什麼 | 在哪 |
|---|---|---|
| **DOCTYPE**（文件類型**宣告** Declaration） | 文件最上面那**一行**指示 | 寫在 `.html` 檔第一行 |
| **DTD**（文件類型**定義** Definition） | 被指向的那份**規則檔** | 一個獨立的 `.dtd` 檔（例：`strict.dtd`） |

- HTML 4.01 的 `<!DOCTYPE ... "http://www.w3.org/TR/html4/strict.dtd">` 裡：
  - 前面 `<!DOCTYPE ...>` 是 **DOCTYPE 宣告**
  - 結尾那個 `.dtd` 網址指向的，才是 **DTD 本體**

## 為什麼 HTML5 不用 DTD 了

- 瀏覽器**根本不會去下載或驗證那份 `.dtd`**——它對實際渲染毫無影響。
- DTD 的表達能力也有限，撐不起現代 HTML 的複雜規則。
- HTML5 改用 WHATWG 直接定義的解析演算法（見 [[SGML-標準通用標記語言|SGML]] 那篇），所以 `<!DOCTYPE html>` 只保留「觸發標準模式」的開關功能，後面不再接任何 `.dtd`。

## 一句話記法

> DTD 是「文件的文法規則書」；DOCTYPE 是「文件開頭喊一聲我遵循哪本規則書」。HTML5 把規則書丟了，只留開頭那一聲當**標準模式開關**。

## 相關筆記
- [[SGML-標準通用標記語言]] — 定義 DTD 這套機制的上層元語言
- [[HTML文件結構-DOCTYPE與骨架]] — DOCTYPE 那一行的作用與歷史
