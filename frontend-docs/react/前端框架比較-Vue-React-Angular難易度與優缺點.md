---
title: 前端框架比較：Vue、React、Angular 難易度與優缺點
type: topic-note
source: Gemini
tags: [gemini, frontend, vue, react, angular, 框架比較, react-native, angular-signals]
aliases: [前端框架比較, Vue-React-Angular比較]
related:
  - "[[React-純函數與嚴格模式-StrictMode]]"
  - "[[程序編程-Procedural-Programming-與控制反轉IoC對比]]"
sources:
  - https://gemini.google.com/app/0656144d084eda4f
updated: 2026-08-06
---

# 前端框架比較：Vue、React、Angular 難易度與優缺點

> 與 [[React-純函數與嚴格模式-StrictMode]] 相關：那篇談 React 內部的純函數規則，這篇往外拉一層，比較 React 跟另外兩個主流框架（Vue、Angular）在學習門檻與整體優缺點上的差異，適合決定「該學哪一個」時對照著看。

## 重點整理

本篇重點 (a)–(d)，共 4 個。

### (a) 學習難易度排序：Vue ⟶ React ⟶ Angular

- <mark style="background: #ADCCFFA6;">Vue.js（最平易近人）</mark>：難度低。採用傳統 HTML／CSS／JavaScript 分離語法（Single File Component），傳統網頁開發者可無縫轉銜，官方文件完善，新手能快速建立全貌概念。
- <mark style="background: #ADCCFFA6;">React（中等，需掌握 JS 底子）</mark>：難度中等。強調「Everything is JavaScript」，全寫在 JSX 中。核心 API 精簡，但需熟練 ES6+ 語法、函數式程式設計（Functional Programming）概念與狀態管理機制。
- <mark style="background: #ADCCFFA6;">Angular（最陡峭）</mark>：難度高。強制要求使用 TypeScript，並引進大量設計模式與架構概念，如依賴注入（Dependency Injection）、RxJS 響應式程式設計、Decorators 等，需一次性吸收完整開發規範。

### (b) Vue.js 優缺點

<mark style="background: #BBFABBA6;">優點：</mark>

| 優點 | 說明 |
|---|---|
| 極低門檻 | 學習曲線最平緩，能以最快速度產出專案 |
| 雙向資料綁定 | 處理表單與簡單互動時非常直覺 |
| 漸進式採納 | 可直接透過 `<script>` 標籤引入小專案，也能擴充成大型 SPA（單頁應用程式） |
| 官方生態系整合佳 | 路由（Vue Router）與狀態管理（Pinia/Vuex）均由官方維護，不必花時間挑選套件 |

<mark style="background: #FF5582A6;">缺點：</mark>大型專案架構彈性過大，若沒有良好規範，不同開發者程式碼風格容易混亂；北美／全球職缺相對較少，在亞洲（台灣、中國）需求極高，但歐美市場規模略次於 React。

### (c) React 優缺點

<mark style="background: #BBFABBA6;">優點：</mark>

| 優點 | 說明 |
|---|---|
| 生態系極度龐大 | 社群最豐富的 UI 套件庫、第三方工具與社群支援 |
| 跨平台延伸能力強 | 掌握 React 後可無縫學習 React Native，開發 iOS／Android App |
| 高度靈活 | 核心僅為 UI View 層，能自由搭配所需的各類套件庫 |

<mark style="background: #FF5582A6;">缺點：</mark>選擇疲勞——官方沒有提供統一的路由或狀態管理方案，需自己從生態系做技術選型（如 Redux、Zustand、React Query）；語法更新頻繁，從 Class Component 轉到 Hooks，再到 Server Components，技術迭代快，需持續學習。

### (d) Angular 優缺點

<mark style="background: #BBFABBA6;">優點：</mark>

| 優點 | 說明 |
|---|---|
| 開箱即用（All-in-One） | 包含 HTTP 客戶端、路由、表單驗證、狀態管理等完整工具鏈，不必額外安裝第三方套件 |
| 高度標準化 | 大型團隊合作時，不同工程師寫出來的架構高度一致，利於企業級維護 |
| 原生 TypeScript 支持 | 型別檢查嚴謹，大幅減少大型專案中的 Runtime 錯誤 |

<mark style="background: #FF5582A6;">缺點：</mark>打包體積較大，初期載入時間與效能相較 Vue／React 較不易最佳化；程式碼較為冗長，開發小型專案時容易顯得笨重；社群與職缺成長放緩，相較 React 與 Vue，新手社群聲量與新創專案採用率較低。

### 總結建議表

| 需求場景 | 推薦選擇 |
|---|---|
| 剛接觸前端框架／想快速產出 MVP 專案／喜歡直覺語法 | Vue.js |
| 目標找前端工程師工作／重視社群資源／未來想寫跨平台 App | React |
| 大型企業級專案／團隊偏好嚴格架構規範與 TypeScript | Angular |

---

### 追加 2026-08-06

> 重點編號延續為 (e)–(h)，共 4 個新增。同一則對話後續追加了 4 個回合。

#### (e) Angular 模板語法範例（Standalone Component + Signals）

現代 Angular（Angular 17 以後）的標準寫法已改為 <mark style="background: #ADCCFFA6;">Standalone Component（獨立組件，不必再宣告 NgModule）</mark>搭配 <mark style="background: #ADCCFFA6;">Signals（訊號，Angular 的細粒度響應式狀態原語）</mark>：

```typescript
// user-list.component.ts
import { Component, signal } from '@angular/core';

interface User { id: number; name: string; role: string; }

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent {
  title = '使用者管理系統';
  isLoading = signal<boolean>(false);

  users = signal<User[]>([
    { id: 1, name: 'Alice', role: 'Admin' },
    { id: 2, name: 'Bob', role: 'Developer' }
  ]);

  selectedUser = signal<User | null>(null);

  selectUser(user: User): void { this.selectedUser.set(user); }

  addUser(): void {
    const newUser: User = { id: Date.now(), name: 'User_new', role: 'Member' };
    this.users.update(list => [...list, newUser]);   // update 收一個函式，回傳新陣列
  }
}
```

```html
{% raw %}
<!-- user-list.component.html -->
<div class="container">
  <h1>{{ title }}</h1>                                <!-- 插值綁定 -->

  <button [disabled]="isLoading()" (click)="addUser()">新增使用者</button>
  <!-- [prop] 是屬性綁定，(event) 是事件綁定，注意 signal 要加 () 才會取值 -->

  @if (isLoading()) {
    <p class="loading">資料載入中...</p>
  } @else {
    <ul class="user-list">
      @for (user of users(); track user.id) {
        <li [class.active]="selectedUser()?.id === user.id" (click)="selectUser(user)">
          <span class="name">{{ user.name }}</span>
          <span class="role">({{ user.role }})</span>
        </li>
      } @empty {
        <li class="empty">目前尚無使用者資料</li>
      }
    </ul>
  }

  @if (selectedUser(); as user) {                     <!-- as 可把值鎖進區域變數 -->
    <div class="detail-card">
      <h3>使用者詳細資訊</h3>
      <p>ID: {{ user.id }}</p>
      <p>姓名: {{ user.name }}</p>
    </div>
  }
</div>
{% endraw %}
```

核心模板語法對照：

| 語法類型 | 寫法範例 | 用途說明 |
|---|---|---|
{% raw %}| 資料渲染 | `{{ value }}` | 把 Component 的狀態輸出至 DOM |{% endraw %}
| 屬性綁定 | `[disabled]="isPending"` | 把 DOM 屬性綁定至 Component 變數 |
| 事件綁定 | `(click)="handleClick()"` | 監聽 DOM 事件並執行 Component 方法 |
| 條件渲染 | `@if (cond) { ... } @else { ... }` | 取代舊版 `*ngIf`，內建控制流 |
| 列表渲染 | `@for (item of list; track item.id)` | 取代舊版 `*ngFor`，<mark style="background: #FF5582A6;">強制</mark>要求指定 `track` 效能鍵 |
| 類別動態切換 | `[class.active]="isSelected"` | 條件成立時自動附加 CSS class |

> [!tip] 跟 React 對照著記
> Angular 的 `@if` / `@for` 對應 React 的 `{cond && ...}` 與 `list.map()`；`track user.id` 對應 React 的 `key={user.id}`，兩者都是為了讓框架用最小代價 diff 出真正變動的節點。差別是 <mark style="background: #FF5582A6;">Angular 從 v17 起把 track 設為強制</mark>，React 的 key 只會警告。

#### (f) Angular 版本演進：v17 已 EOL，最新穩定版是 v22

Angular 官方維持<mark style="background: #FFF3A3A6;">每半年發布一次大版本</mark>的固定步調：

| 版本 | 發布時間 | 重要核心更新 |
|---|---|---|
| Angular 17 | 2023-11 | 導入 `@if`／`@for` 控制流、預設 Standalone 架構、`@defer` 延遲載入 |
| Angular 18 | 2024-05 | 實驗性 Zoneless（免 Zone.js）變更檢測、SSR 效能優化 |
| Angular 19 | 2024-11 | 組件、指令與 Pipe 預設皆改為 Standalone |
| Angular 20 | 2025-05 | Signals 狀態管理機制達到穩定版（Stable） |
| Angular 21 | 2025-11 | 預設啟用 Zoneless 變更檢測、實驗性 Signal Forms、測試框架改用 Vitest |
| <mark style="background: #BBFABBA6;">Angular 22</mark> | 2026-06-03 | <mark style="background: #BBFABBA6;">最新穩定版</mark>，Signal Forms 正式穩定、原生無障礙組件庫 Angular ARIA、Selectorless 組件 |

<mark style="background: #FF5582A6;">Angular 17 已結束官方支援（EOL）。</mark>新專案建議直接用 Angular 22。Angular 21 的長期支援（LTS）到 2027-05，Angular 20 的 LTS 到 2026-11。每個大版本共 18 個月支援期：6 個月 active + 12 個月 LTS。

> [!check] 已查證
> Gemini 這段版本表我另外查了官方與第三方版本追蹤站核對過，<mark style="background: #BBFABBA6;">Angular 22 於 2026-06-03 發布、最新修訂版為 22.1.0（2026-07-29）屬實</mark>，Gemini 沒有講錯。詳見文末資料來源表。

#### (g) React Native 也是用 JSX，差在 UI 組件與樣式

React Native <mark style="background: #BBFABBA6;">完全使用 JSX</mark>，State／Props 傳遞機制與 Web 端 React 幾乎一模一樣。主要差異在基本 UI 組件與樣式寫法：

| 比較項目 | React (Web) | React Native (Mobile) |
|---|---|---|
| 容器／區塊 | `<div>` | `<View>` |
| 文字 | `<p>` `<span>` `<h1>` | `<Text>`（<mark style="background: #FF5582A6;">所有文字必須包在 `<Text>` 內</mark>） |
| 圖片 | `<img src="..." />` | `<Image source={...} />` |
| 可點擊元素 | `<button>` `<a>` | `<TouchableOpacity>` `<Pressable>` |
| 滾動列表 | `<div>` + CSS `overflow` | `<ScrollView>` `<FlatList>` |
| 樣式處理 | CSS／SCSS／Tailwind | JS 物件（`StyleSheet.create`），預設 Flexbox |
| 點擊事件 | `onClick` | <mark style="background: #FF5582A6;">`onPress`</mark> |

```javascript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>當前計數：{count}</Text>
      <TouchableOpacity style={styles.button} onPress={() => setCount(count + 1)}>
        <Text style={styles.buttonText}>加 1</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, marginBottom: 10 },
  button: { backgroundColor: '#007AFF', padding: 10, borderRadius: 5 },
  buttonText: { color: '#FFF' }
});
```

核心心智模型（Component、Hooks、Data Flow）完全共通，所以 React 開發者通常只需補學原生 UI 組件與裝置 API。

#### (h) Vue 是「漸進式框架」，可當函式庫也可當框架

Vue 官方定位是 <mark style="background: #ADCCFFA6;">Progressive JavaScript Framework（漸進式 JavaScript 框架）</mark>，意思是它<mark style="background: #FFF3A3A6;">可大可小</mark>：

- <mark style="background: #BBFABBA6;">當輕量函式庫用</mark>：像引入 jQuery 那樣直接用 `<script>` 標籤掛進現有 HTML 頁面，只負責特定區塊的 UI 與資料綁定，不控制整個專案架構。
- <mark style="background: #BBFABBA6;">當完整框架用</mark>：搭配官方生態系 Vue Router（路由）、Pinia（狀態管理）、Vite（建構打包）、SFC 單檔案組件規範，此時它掌握整個應用程式架構。

三者定位對比：

| 工具 | 定位類型 | 運作哲學 |
|---|---|---|
| React | UI 函式庫 | 核心僅專注 View 渲染，路由與狀態管理自由搭配社群套件（React Router、Zustand） |
| Vue | 漸進式框架 | 核心可輕量載入，需要時導入官方維護的路由與狀態管理，兼顧靈活與一致 |
| Angular | 全功能框架 | 開箱即用，內建 HTTP 客戶端、表單驗證、路由，架構規範嚴格 |

> [!info] 為什麼這一格要跟 [[程序編程-Procedural-Programming-與控制反轉IoC對比]] 一起看
> 「Vue 是框架還是函式庫」這題之所以難答，正是因為判準是<mark style="background: #FFF3A3A6;">控制權讓渡了多少</mark>，而不是體積或功能數量。用 `<script>` 引入時你的程式仍主導流程（程序式），用 SFC + Router 時進入點變成 Vue 的 runtime（控制反轉）。同一個工具在光譜上滑動，這就是「漸進式」三個字的真正含意。

---

## 自我測驗

> [!question] 填空題（點答案處可顯示／隱藏，也可用上方按鈕一次全開全關）
> 1. Angular 的 `@for` 強制要求指定 ||`track`|| 效能鍵，作用等同 React 的 ||`key`|| 屬性。
> 2. Angular 目前的最新穩定版是 ||Angular 22（2026-06-03 發布）||，官方每 ||半|| 年發一次大版本。
> 3. React Native 的容器標籤是 ||`<View>`||，文字必須包在 ||`<Text>`|| 裡，點擊事件用 ||`onPress`|| 而非 `onClick`。
> 4. Vue 的官方定位是 ||漸進式 JavaScript 框架（Progressive JavaScript Framework）||。

> [!question] 是非題
> 1. Angular 17 目前仍在官方支援期內。 → ||✘ 錯。v17 已 EOL，Angular 每版支援 18 個月（6 個月 active + 12 個月 LTS）。||
> 2. React Native 的樣式寫法跟 Web 端 React 一樣可以用 CSS 檔。 → ||✘ 錯。React Native 用 `StyleSheet.create` 的 JS 物件，預設 Flexbox。||
> 3. Angular 的 Signals 在 v20 才達到穩定版。 → ||✔ 對。v20（2025-05）Signals 穩定，v22 再讓 Signal Forms 穩定。||
> 4. Vue 可以像 jQuery 那樣直接用 `<script>` 標籤引入現有頁面。 → ||✔ 對。這正是「漸進式」的意思，可當函式庫也可當完整框架。||

> [!question] 申論題
> 面試官問「你為什麼選 React 而不是 Vue 或 Angular」，請用本篇的內容組出一個有判準、不只是喊口號的回答。
> → ||先講判準再講選擇。判準有三個：一是團隊規模與規範需求，二是生態系與人才供給，三是未來延伸性。以我目前的情境來說，React 的社群套件最完整、職缺數最多，代表遇到問題時查得到解、接手的人也好找；而且掌握 React 之後可以用同一套 JSX 與 Hooks 心智模型延伸到 React Native 做行動端。反過來說，如果是大型企業的長期專案、團隊人多且需要強制一致的架構，我會傾向 Angular，因為它 All-in-One 又強制 TypeScript，等於用自由度換維護成本；如果是要快速做出 MVP 或漸進式改造既有頁面，Vue 的門檻最低。所以這題沒有絕對答案，取決於專案在「開發速度、團隊一致性、生態系規模」這三個軸上的權重。||

## 各對話來源

### 前端框架比較：Vue、React、Angular（2026-08-05）— https://gemini.google.com/app/0656144d084eda4f

使用者：Angular.js vs vue.js vs react 難易度比較，選 a 選 b 選 c 的優缺。

Gemini：難易度從易到難依序是 Vue.js → React → Angular。Vue.js 門檻低，採傳統 HTML／CSS／JS 分離語法，適合快速上手；React 難度中等，強調 Everything is JavaScript，需要 ES6+ 與函數式程式設計基礎；Angular 難度最高，強制用 TypeScript，並引入依賴注入、RxJS、Decorators 等完整架構概念。三者優缺點分別整理如上表，並依需求場景給出推薦選擇。

#### 追加回合（2026-08-06，第 2–5 回合）

使用者：給我看 Angular 的模板。

Gemini：提供現代 Angular（Standalone Component + Angular 17 以後新版語法）的組件與 HTML 模板範例，含 `signal()` 狀態宣告、`@if`／`@else`／`@for`／`@empty` 控制流、`track` 效能鍵、`[class.active]` 類別動態切換、`@if (selectedUser(); as user)` 區域變數鎖定，並附核心模板語法對照表。整合進上方追加第 (e) 點。

使用者：Angular 17+ 這是最新的了嗎？

Gemini：不是。目前最新穩定版本是 Angular 22。Angular 官方維持每半年發布一次大版本的固定步調，v17（2023-11）導入 `@if`／`@for` 控制流與預設 Standalone；v18（2024-05）導入實驗性 Zoneless 變更檢測；v19（2024-11）組件、指令與 Pipe 預設皆改為 Standalone；v20（2025-05）Signals 達到穩定版；v21（2025-11）預設啟用 Zoneless、實驗性 Signal Forms、測試框架改用 Vitest；v22（2026-06）為最新穩定版，正式穩定 Signal Forms 並提供原生無障礙組件庫 Angular ARIA。Angular 17 已結束官方支援（EOL），新專案建議直接用 Angular 22。整合進上方追加第 (f) 點。

使用者：「跨平台能力強：掌握 React 後，可以無縫學習 React Native 開發 iOS／Android App」，React Native 他們也是用 JSX 嗎？

Gemini：是的，React Native 完全使用 JSX 撰寫使用者介面，寫法、邏輯處理、State 與 Props 傳遞機制與 Web 端 React 幾乎一模一樣，主要差別在 UI 基本組件（`<div>`→`<View>`、`<p>`→`<Text>`、`<img>`→`<Image>`、`<button>`→`<TouchableOpacity>`）與樣式撰寫方式（CSS → `StyleSheet.create` 的 JS 物件，預設 Flexbox），事件也從 `onClick` 改為 `onPress`。整合進上方追加第 (g) 點。

使用者：Vue 是框架還是函式庫？

Gemini：Vue 是「漸進式 JavaScript 框架」（Progressive JavaScript Framework），它可以作為單純的函式庫使用，也可以擴充為功能完整的框架，這正是「漸進式」的原因。當輕量函式庫用時，可像 jQuery 那樣以 `<script>` 標籤引入現有頁面；當完整框架用時，搭配 Vue Router、Pinia、Vite／Vue CLI 與 SFC 單檔案組件規範，即具備完整框架能力。對比之下 React 是 UI 函式庫、Angular 是全功能框架。整合進上方追加第 (h) 點。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| Gemini 對話原文 | https://gemini.google.com/app/0656144d084eda4f | 對話日期 2026-08-05、追加回合 2026-08-06 |
| Angular 版本歷史與最新穩定版（v22，2026-06-03 發布；22.1.0 於 2026-07-29） | https://frontendminds.com/blog/angular-latest-version-2026 | 查證日 2026-08-06 |
| Angular 支援週期與 EOL（每版 18 個月＝6 個月 active + 12 個月 LTS） | https://endoflife.date/angular | 查證日 2026-08-06 |
| Angular 版本沿革（維基百科） | https://en.wikipedia.org/wiki/Angular_(web_framework) | 查證日 2026-08-06 |

> [!check] 查核結果
> Gemini 的 Angular 版本演進表（v17→v22 的時間點與各版重點）經查證<mark style="background: #BBFABBA6;">正確</mark>，Angular 22 確為 2026-06-03 發布的最新穩定版，Angular 17 確已 EOL。

> [!warning] ⚠️ 存疑／提醒
> 第 1 回合的框架比較屬於一般性定性敘述，未附官方數據來源（如 State of JS 調查、職缺網站統計）。「職缺較少／較多」等市場面說法建議 Abby 之後自行以 State of JS、104／LinkedIn 職缺數查證，不宜直接當作絕對數據引用。
