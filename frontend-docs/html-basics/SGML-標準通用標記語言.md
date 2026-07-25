---
title: SGML(標準通用標記語言)
type: concept-note
source: Claude
category: 技術
tags: [sgml, html, xml, markup, dtd, 標記語言, 面試]
updated: 2026-07-15
---

# SGML(Standard Generalized Markup Language,標準通用標記語言)

> 一句話：SGML 是「**用來定義各種標記語言的元語言**」——它本身不是 HTML，而是「制定 HTML 這類語言的規則系統」。HTML(4.01 以前)與 XML 都是它的後代。

## 是什麼

- **全名**：Standard Generalized Markup Language，標準通用標記語言。
- **標準編號**：ISO 8879（1986 年成為國際標準）。
- **本質**：一種 **meta-language（元語言）**——不是拿來寫文件，而是拿來「**定義一套標記語言長什麼樣子**」。你用 SGML 定義「有哪些標籤、標籤能怎麼巢狀」，這份定義就叫 [[DTD-文件類型定義|DTD]]。

## 跟 HTML 的關係

- **HTML 是 SGML 的一個「應用(application)」**：HTML 4.01 在規範上正式宣稱自己是「一種 SGML 應用」，用一份 [[DTD-文件類型定義|DTD]] 定義它合法的標籤集合。
- 這就是為什麼 HTML 4.01 的 DOCTYPE 要寫那一長串、還指向一個 `.dtd` 網址——那串就是在說「我這份文件遵循**這一份 SGML DTD**」。
- 尖角括號 `<tag>` 這種標籤語法，就是從 SGML 借來的（HTML 之父 Tim Berners-Lee 沿用了 SGML 的角括號慣例）。

## 為什麼 HTML5 把 SGML 丟掉

- **瀏覽器其實從來沒真的照 SGML 規則解析 HTML**：真實網頁充滿沒收尾、寫錯的標籤，瀏覽器一直是用自己的「容錯解析(error-tolerant parsing)」硬吞，而不是 SGML 那套嚴格驗證。
- SGML 又**過度複雜**，那份 DTD 對瀏覽器毫無實際作用（瀏覽器根本不下載、不驗證）。
- 所以 **HTML5(WHATWG)乾脆不再宣稱自己是 SGML 應用**，改為直接定義一套明確的「HTML 解析演算法」。於是 [[DTD-文件類型定義|DTD]] 也一起被淘汰，`<!DOCTYPE html>` 縮到最短、不再指向任何 `.dtd`。

## 一句話記法

> SGML 是「爺爺」：HTML 4 與 XML 是它的孩子。HTML5 長大後不認這個爺爺了，改用自己的規則。

## 相關筆記
- [[DTD-文件類型定義]] — SGML 用來定義文件結構的那份規則檔
- [[HTML文件結構-DOCTYPE與骨架]] — DOCTYPE 為什麼變短、標準／怪異模式
