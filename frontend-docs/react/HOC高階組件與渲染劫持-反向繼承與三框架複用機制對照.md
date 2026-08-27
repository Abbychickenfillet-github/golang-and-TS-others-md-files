---
title: HOC 高階組件與渲染劫持｜反向繼承，以及 Vue / Angular 的對應機制
type: topic-note
source: Gemini
tags: [gemini, react, hoc, 渲染劫持, 反向繼承, vue, angular, 設計模式, 面試]
sources:
  - https://gemini.google.com/app/3b8ff7e2ed0d9bd4
updated: 2026-08-25
---

# HOC 高階組件與渲染劫持｜反向繼承，以及 Vue / Angular 的對應機制

> [!info] 本篇重點 a–l，共 12 個
> 起因是在看《前端面試寶典之 React 篇》影片，冒出「渲染劫持」這個詞，追問下去發現它其實是 HOC 的一種實作技巧，而且是<mark style="background: #FF5582A6;">已經被 React 官方淡出的舊派做法</mark>。第二個問題問得很好：「render 又不是 React 專有的，你是不是要講三大框架？」——答案是三個框架各有自己的複用機制，名字完全不同。
> 關聯筆記：<mark style="background: #ADCCFFA6;">[[高階函式與函數式範式-取代OOP三大設計模式]]</mark> 講「函式當參數與回傳值」這個底層骨架，HOC 就是它在組件層的投影，也就是 Decorator 裝飾者模式；<mark style="background: #ADCCFFA6;">[[00-前端框架比較-Vue-React-Angular難易度與優缺點]]</mark> 講三框架的整體取捨，這篇聚焦在「邏輯複用」這一個切面。

---

## 重點整理

### 一. 三個詞先定義清楚

(a) <mark style="background: #ADCCFFA6;">HOC（Higher-Order Component，高階組件）</mark>：一個「接收組件、回傳新組件」的函式。名字借自數學的高階函式（Higher-Order Function），差別只在處理的單位從函式變成組件。

(b) <mark style="background: #ADCCFFA6;">渲染劫持（Render Hijacking）</mark>：在原組件真正被畫出來之前，攔截並修改它的渲染結果。這是 HOC 的一項技巧，不是另一個獨立概念。

(c) <mark style="background: #ADCCFFA6;">反向繼承（Inheritance Inversion，II）</mark>：HOC 的兩種實作流派之一。另一種是<mark style="background: #ADCCFFA6;">屬性代理（Props Proxy，PP）</mark>。

> [!note] 為什麼叫「反向」
> 正常繼承是「子類別繼承父類別」。這裡 HOC 是包裝者，理應是外層，卻反過來去 `extends` 被包裝的組件，讓包裝者變成子類別，包裝關係跟繼承關係方向相反，所以叫反向繼承。

### 二. 反向繼承的核心機制

(d) <mark style="background: #FFF3A3A6;">關鍵：`class HOC extends WrappedComponent`。</mark>HOC 繼承了原組件，於是它拿得到原組件的 `render`、`state`、生命週期方法。

(e) 在 HOC 自己的 `render()` 裡呼叫 <mark style="background: #FFF3A3A6;">`super.render()`</mark>，就能拿到原組件產出的 React 元素樹（Virtual DOM），接著讀取、修改或整個覆蓋掉。

```jsx
function withRenderHijack(WrappedComponent) {
  return class extends WrappedComponent {
    render() {
      // super.render() 回傳原組件的 JSX 元素樹
      const elementTree = super.render();

      if (!this.props.isAllowed) {
        return <p>沒有權限</p>;      // 整個覆蓋
      }
      return React.cloneElement(elementTree, {
        className: 'hijacked',        // 修改屬性
      });
    }
  };
}
```

(f) 逐行拆解：

- `function withRenderHijack(WrappedComponent)`：慣例上 HOC 命名用 `with` 開頭，參數是「被包的組件」。
- `return class extends WrappedComponent`：回傳一個匿名 class，<mark style="background: #ADCCFFA6;">`extends` 建立原型鏈（prototype chain）</mark>，讓這個新 class 的實例可以往上找到 `WrappedComponent.prototype` 上的方法。
- `super.render()`：<mark style="background: #ADCCFFA6;">`super` 指向父類別的原型</mark>，所以這句是「呼叫父類別版本的 render，但 `this` 仍然是我自己」，因此原組件的 `this.state` 與 `this.props` 都讀得到。
- `React.cloneElement(elementTree, {...})`：React 元素是<mark style="background: #FF5582A6;">不可變（immutable）</mark>的，不能直接改屬性，只能複製一份並覆寫。

### 三. 三個主要應用場景

(g) **條件式渲染**：依 props 或 state 決定要不要渲染 `super.render()` 的內容。權限控制、Loading 狀態都屬於這一類。

(h) **修改／擴充元素樹**：攔截回傳的 JSX，替換特定子元件、動態加 `style` / `className`、綁額外的事件監聽。

(i) **操縱 Props**：在元素正式渲染前，攔截並替換子元件收到的 props。

### 四. 為什麼是「React 的 render 方法」，不是通用概念

(j) <mark style="background: #FFF3A3A6;">「渲染」是所有框架的通用概念，但「渲染劫持」這個做法只在 React 成立</mark>，原因是 React 的 JSX 本質上就是 JavaScript 函式呼叫與物件，`super.render()` 回傳的是一個普通 JS 物件樹，你當然可以拿來讀跟改。Vue 的 template 與 Angular 的 template 在編譯後被框架接管，開發者拿不到那個中間結構。

(k) 三框架對照：

| | React | Vue | Angular |
| --- | --- | --- | --- |
| 主要複用機制 | HOC、Render Props、<mark style="background: #BBFABBA6;">Custom Hooks（現代主流）</mark> | Composition API（Composables）、Mixins、Scoped Slots | 依賴注入（DI）、結構型指令（`*ngIf`）、裝飾器 |
| 能不能改元素樹 | 可以，JSX 就是 JS 物件 | 一般不行，template 由編譯器接管（除非自己寫 Render Function） | 不直接改，改用 `ViewContainerRef` 操作視圖容器 |
| 心智模型 | 包一層函式 | 抽一支組合函式 | 注入一個服務或指令 |

(l) <mark style="background: #FF5582A6;">面試提醒：如果被問到 HOC，記得補一句「React 16.8 之後官方推薦用 Custom Hooks 取代大部分 HOC 場景」。</mark>反向繼承因為會破壞組件的靜態方法繼承、讓 ref 難以傳遞、也不利於 React DevTools 除錯，實務上已經很少用。知道它是為了讀懂舊 codebase 與應付面試，不是為了拿來寫新專案。

---

## 程式碼範例

同層的 `hoc-props-proxy-vs-inheritance-inversion.jsx` 把兩種 HOC 流派並排寫出來對照。

---

## 練習題

| 題號 | 題名 | 為什麼相關 |
| --- | --- | --- |
| 2666 | [Allow One Function Call](https://leetcode.com/problems/allow-one-function-call/) | 最小的「包一層、加行為」練習，HOC 的骨架 |
| 2623 | [Memoize](https://leetcode.com/problems/memoize/) | 包一層並保留狀態，等同 HOC 快取 props 的心智模型 |
| 2632 | [Curry](https://leetcode.com/problems/curry/) | 函式回傳函式，理解高階函式的閉包基礎 |
| 2704 | [To Be Or Not To Be](https://leetcode.com/problems/to-be-or-not-to-be/) | 回傳一個帶方法的物件，練習包裝者思維 |

---

## 各對話來源（原文）

### 高階組件與渲染劫持（2026-08）— https://gemini.google.com/app/3b8ff7e2ed0d9bd4

**使用者：** 高階組件與渲染劫持是有什麼相關內容

**Gemini：** 高階組件（Higher-Order Component，HOC）與渲染劫持（Render Highjacking）在 React 開發中是密不可分的概念。渲染劫持是高階組件（尤其是基於反向繼承 Inherited Inversion 的 HOC）的一項核心技巧與設計模式。
核心機制：當使用反向繼承（`class HOC extends WrappedComponent`）構建 HOC 時，HOC 繼承了原組件。在 HOC 的 `render` 方法中，透過呼叫 `super.render()` 即可獲取原組件的 React 元素樹（Virtual DOM），進而對其進行讀取、修改或覆蓋。
主要應用場景：條件式渲染（根據傳入的 props 或狀態決定是否渲染 `super.render()` 的內容，如權限控制、載入中 Loading 狀態處理）；修改／擴充 React 元素（攔截並修改 `super.render()` 返回的 JSX 元素樹，例如替換特定子元件、動態添加 `style` / `className` 或綁定額外的事件監聽）；操縱 Props（在元素被正式渲染前，攔截並替換／擴充子元件所接收到的 props）。
（Gemini 附註：使用者當時正在觀看《前端面試寶典之 React 篇》系列課程的「开篇词 如何拿下大厂前端面试」，來源標示為 Code Learning 编程教程，4,728 次觀看。）

**使用者：** 為什麼是 HOC 的 render 方法？Render 方法應該不是專屬 React 的，還是說你要表達的是 React、Angular 還有 Vue？

**Gemini：** 這裏提到的 `render` 方法與「渲染劫持」，確實是以 React 的組件模型為核心討論背景。
1. 為什麼是 HOC 的 render 方法：在 React 的 Class 組件中，`render()` 是核心的生命週期方法，負責返回描述 UI 的 Virtual DOM（JSX）。當使用反向繼承來實現 HOC 時，HOC 會繼承原組件，此時 HOC 重寫了 `render()` 方法，並可以在內部呼叫 `super.render()` 取得原組件的渲染結果。
2. 其他框架有類似的概念嗎：React 的 JSX 本質上就是 JavaScript 函數與物件，因此能在 `render()` 中直接讀取、操縱 Virtual DOM 結構。Vue 主要使用範本語法（Template），較少使用反向繼承式的 HOC，社群更傾向使用組合函數（Composables）或插槽。Angular 有強大的控制反轉與指令系統，透過指令就能直接操縱 DOM 或控制 `ViewContainerRef`，不需要透過 React 風格的 HOC 渲染劫持。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本 / 查證時間 |
| --- | --- | --- |
| Gemini 對話原文 | https://gemini.google.com/app/3b8ff7e2ed0d9bd4 | 2026-08，本次歸檔 2026-08-25 |
| React 官方文件（舊版）Higher-Order Components | https://legacy.reactjs.org/docs/higher-order-components.html | React 17 舊文件，官方已標示為 legacy，查證 2026-08-25 |
| React 官方：Reusing Logic with Custom Hooks | https://react.dev/learn/reusing-logic-with-custom-hooks | 現行推薦做法，查證 2026-08-25 |
| React `cloneElement` API | https://react.dev/reference/react/cloneElement | 查證 2026-08-25 |
| Vue：Composables | https://vuejs.org/guide/reusability/composables.html | Vue 3，查證 2026-08-25 |
| Angular：Structural Directives | https://angular.dev/guide/directives/structural-directives | 查證 2026-08-25 |

> [!warning] ⚠️ 存疑 / 更正
> 1. Gemini 把英文拼成 <mark style="background: #FF5582A6;">「Render Highjacking」與「Inherited Inversion」，兩個都拼錯了</mark>。正確是 **Render Hijacking**（沒有 h）與 **Inheritance Inversion**（不是 Inherited）。查英文資料時拼錯會找不到。
> 2. Gemini <mark style="background: #FF5582A6;">完全沒提到 HOC 已經被 Custom Hooks 取代</mark>，語氣像是在推薦現行做法。反向繼承在現代 React 幾乎不用，面試講的時候要自己補這一句，否則會顯得停留在 React 15 的時代。
> 3. 影片觀看數與課程名稱是 Gemini 從畫面抓的即時資訊，不保證正確，僅供回溯當時情境。

---

*由 Gemini 對話自動整理 · 更新於 2026-08-25*
