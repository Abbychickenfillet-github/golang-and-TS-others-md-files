---
title: 前端框架比較：Vue、React、Angular 難易度與優缺點
type: topic-note
source: Gemini
tags: [gemini, frontend, vue, react, angular, 框架比較, react-native, angular-signals, proxy, 變更偵測, reactivity, svelte, solid, 面試]
aliases: [前端框架比較, Vue-React-Angular比較]
related:
  - "[[React-純函數與嚴格模式-StrictMode]]"
  - "[[程序編程-Procedural-Programming-與控制反轉IoC對比]]"
  - "[[00-ref與reactive-響應式的兩種實作]]"
  - "[[00-GoF-23種設計模式總覽]]"
  - "[[雙向綁定與單向資料流-Vue-Scoped-CSS-PostCSS-Incremental-DOM與HOC]]"
sources:
  - https://gemini.google.com/app/0656144d084eda4f
updated: 2026-08-18
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


---

### 追加 2026-08-18

> 重點編號延續為 (i)–(m)，共 5 個新增。這批補的是原本 (a)–(h) 完全沒碰到的一層：三個框架**內部怎麼知道資料變了**。前面八點比的是「難易度與生態系」，屬於選型的外圍條件；這五點比的是變更偵測機制，屬於選型的技術核心。

#### (i) Vue 的 Proxy 代理模式到底是什麼

> [!warning] ⚠️ 先分辨兩個撞名的 proxy，它們完全無關
> - a. <mark style="background: #FF5582A6;">JavaScript 的 [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 物件</mark>：ES6 語言層的攔截器，Vue 3 拿它做響應式。**本節講的是這個。**
> - b. <mark style="background: #FF5582A6;">Vue CLI 的 [`devServer.proxy`](https://cli.vuejs.org/zh/config/#devserver-proxy)</mark>：建構工具的**開發伺服器反向代理**，用途是把前端的 API 請求轉發到後端主機，解決本機開發的跨來源問題。它跟響應式、依賴收集、`ref()` 一點關係都沒有。
>
> 兩者都翻成「代理」，但一個在語言層攔截物件讀寫，一個在網路層轉發 HTTP 請求。查資料時看到 `vue.config.js` 裡的 `proxy` 設定，那是 (b) 不是 (a)。

<mark style="background: #FFF3A3A6;">[`Proxy`（代理器）](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 是 ES6 內建的物件，用來在「你」和「目標物件」之間插一個攔截層，所有讀寫都先經過它。</mark>

```javascript
const proxy = new Proxy(target, handler);
//                      目標物件   攔截器設定
```

`handler` 裡可以定義最多 13 種攔截行為（官方術語叫 <mark style="background: #FFF3A3A6;">trap，陷阱</mark>），最常用的是 `get`（讀屬性）、`set`（寫屬性）、`has`（`in` 運算子）、`deleteProperty`（`delete`）。

```javascript
const raw = { count: 0 };
const state = new Proxy(raw, {
  get(target, key, receiver) {
    console.log(`[讀取] ${String(key)}`);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    console.log(`[寫入] ${String(key)} = ${value}`);
    return Reflect.set(target, key, value, receiver);
  }
});

state.count;        // [讀取] count
state.count = 1;    // [寫入] count = 1
state.newProp = 9;  // [寫入] newProp = 9  ← 注意：新增的屬性也攔得到
```

<mark style="background: #FFB86CA6;">Vue 3 就是用這兩個 trap 做出響應式，步驟只有三步</mark>（官方說明見 [深入響應式系統](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)，API 文件見 [`reactive()`](https://cn.vuejs.org/api/reactivity-core.html#reactive)）：

- a. **依賴收集（track）**：`get` 被觸發時，Vue 記下「現在正在執行的那個副作用（元件的 render 函式）用到了這個屬性」，建立一張「屬性 → 用到它的人」的對應表。
- b. **觸發更新（trigger）**：`set` 被觸發時，Vue 去查那張表，只通知真正用到這個屬性的元件重新執行。
- c. **惰性代理（lazy）**：讀到的值如果還是物件，這時候才把它包成新的 Proxy，不需要一開始就遞迴整棵物件樹。

> [!info] 這就是「代理模式」這個設計模式的本體
> 代理模式（Proxy Pattern）是 GoF 二十三個設計模式之一，定義是「為某個物件提供一個替身，藉此控制對這個物件的存取」。Vue 的用法屬於其中的**智慧代理（Smart Proxy）**：替身不改變原本的行為，只是在存取的前後多做一件事。完整的模式地圖見 [[00-GoF-23種設計模式總覽]]。

##### 為什麼 Vue 2 要從 `Object.defineProperty` 換成 Proxy

| 限制 | Vue 2 的 `Object.defineProperty` | Vue 3 的 `Proxy` |
|---|---|---|
| 攔截的對象 | <mark style="background: #FF5582A6;">單一屬性</mark>，必須逐個 define | <mark style="background: #BBFABBA6;">整個物件</mark>，一次搞定 |
| 新增屬性 | <mark style="background: #FF5582A6;">偵測不到</mark>，要手動 `Vue.set()` | 自動偵測 |
| 刪除屬性 | <mark style="background: #FF5582A6;">偵測不到</mark>，要 `Vue.delete()` | `deleteProperty` trap 攔得到 |
| 陣列索引賦值 `arr[0] = x` | <mark style="background: #FF5582A6;">偵測不到</mark>，靠改寫 7 個陣列方法硬補 | 自動偵測 |
| 修改 `arr.length` | 偵測不到 | 自動偵測 |
| 初始化成本 | <mark style="background: #FF5582A6;">一開始就遞迴整棵物件樹</mark> | <mark style="background: #BBFABBA6;">惰性</mark>，存取到才往下代理 |
| 瀏覽器支援 | 可 polyfill，支援 IE9+ | <mark style="background: #FF5582A6;">無法 polyfill</mark>，這是 Vue 3 放棄 IE11 的直接原因 |

##### Proxy 帶來的兩個副作用（面試常追問）

- a. <mark style="background: #FF5582A6;">`reactive(obj) === obj` 是 `false`</mark>。你拿到的是替身不是本人，要取回原物件得用 `toRaw()`。
- b. <mark style="background: #FF5582A6;">Proxy 攔不到 primitive</mark>。`reactive(0)` 沒有意義，因為 Proxy 的 target 必須是物件。這就是 Vue 為什麼另外要有 `ref()`——它把純值包進一個 `{ value: x }` 物件。

> [!warning] ⚠️ 重要更正：`ref()` 其實不是用 Proxy 做的
> Vue 官方文件原話是「Vue 3 中則使用了 Proxy 來創建響應式對象，<mark style="background: #FFF3A3A6;">仍將 getter / setter 用於 ref</mark>」——也就是 `reactive()` 用 Proxy，<mark style="background: #FF5582A6;">`ref()` 用的是 ES5 的 getter／setter</mark>。
> 這也解釋了 `.value` 的真正理由：getter／setter 只能攔截**具名屬性**，所以必須真的存在一個叫 `value` 的屬性才攔得到。完整拆解見 [[00-ref與reactive-響應式的兩種實作]]。

> [!tip] 跟 React 對照著記
> **Vue 知道你改了什麼，React 不知道。** Vue 有替身站在資料前面，任何讀寫它都看得到。React 沒有替身，`state.count = 1` 這樣直接改它完全無感，你必須呼叫 `setState` 主動通報。React 的不可變更新（immutable update）規定也是從這裡來的——既然它只比對參考，你就必須每次都給它一個新參考。

> [!example] 可執行範例：`proxy-reactivity-demo.js`（同資料夾）
> 終端機執行 `node proxy-reactivity-demo.js`，五個 Part 依序印出：Proxy 三個 trap 攔到什麼、30 行手寫響應式的依賴收集紀錄、`Object.defineProperty` 的三個死角、`reactive(obj) === obj` 為 `false`、React 這邊 `Object.is` 的對照。
>
> <mark style="background: #BBFABBA6;">Part 2 的輸出建議截圖存進 obsidian-attachment，那段依賴收集紀錄是「Vue 知道誰用了什麼」最直觀的證據。</mark>

#### (j) 五大框架的變更偵測策略橫向比較

所有前端框架都在解同一題：<mark style="background: #FFF3A3A6;">資料變了，畫面怎麼跟著變？</mark>差別只有兩個環節——**它怎麼知道資料變了**，以及**知道之後怎麼算出要改哪裡**。

| | React | Vue 3 | Angular（現代） | Svelte | Solid |
|---|---|---|---|---|---|
| 怎麼知道資料變了 | <mark style="background: #ADCCFFA6;">你呼叫 `setState` 通報</mark> | <mark style="background: #ADCCFFA6;">Proxy 自動攔截</mark> | <mark style="background: #ADCCFFA6;">Signals 自動追蹤</mark>（舊版靠 Zone.js） | 編譯期把賦值改寫成更新指令 | Signals 自動追蹤 |
| 更新粒度 | 元件層級，往下重跑 | 元件層級，但只跑有依賴的 | 可到節點層級 | 節點層級 | <mark style="background: #BBFABBA6;">節點層級，元件函式只跑一次</mark> |
| 有沒有 Virtual DOM | 有 | 有，但 3.6 Vapor Mode 可以不用 | 沒有（Ivy 用 Incremental DOM） | <mark style="background: #BBFABBA6;">沒有</mark> | <mark style="background: #BBFABBA6;">沒有</mark> |
| 編譯期做的事 | 少（React Compiler 補上自動 memo 化） | 多（Patch Flags、Hoisting、Block Tree） | 多（Ivy 編譯成指令） | <mark style="background: #BBFABBA6;">極多，框架幾乎編譯掉</mark> | 多 |
| 心智模型 | 顯式：我說了才更新 | 隱式：它自己會知道 | 混合：訊號顯式、追蹤自動 | 隱式 | 顯式宣告、隱式追蹤 |

> [!note] Vue 的編譯期三招是什麼
> - <mark style="background: #FFB86CA6;">Static Hoisting（靜態提升）</mark>：不會變的節點提到 render 函式外面，只建立一次。
> - <mark style="background: #FFB86CA6;">Patch Flags（更新標記）</mark>：編譯時就標記「這個節點只有 class 會變」，執行期只比對那一個屬性。
> - <mark style="background: #FFB86CA6;">Block Tree（區塊樹）</mark>：把動態節點收集成扁平陣列，diff 時直接跳過整片靜態內容。

> [!info] 為什麼這一格要跟 [[雙向綁定與單向資料流-Vue-Scoped-CSS-PostCSS-Incremental-DOM與HOC]] 一起看
> 那篇談 Vue 的 scoped CSS 怎麼靠 PostCSS 在**編譯期**加上屬性選擇器。這裡的 (j) 是同一主題的上一層：<mark style="background: #BBFABBA6;">現代框架的效能競賽，本質上是「把多少工作從執行期搬到編譯期」的競賽</mark>。scoped CSS 的屬性注入、Vue 的 Patch Flags、Svelte 的整個框架被編譯掉，全是同一種思路的不同強度。

#### (k) 2026 年的現況：三個框架正在往同一個方向收斂

| 框架 | 2026 年的關鍵演進 | 方向 |
|---|---|---|
| React | <mark style="background: #BBFABBA6;">React Compiler v1.0 於 2025-10 穩定</mark>，編譯期自動插入 memo 化 | 把手動優化搬到編譯期 |
| Vue | <mark style="background: #BBFABBA6;">Vue 3.6 的 Vapor Mode 直接拿掉 Virtual DOM</mark> | 把 diff 搬到編譯期 |
| Angular | <mark style="background: #BBFABBA6;">v21 預設啟用 zoneless，v22 讓 Signal Forms 穩定</mark> | 拿掉 Zone.js，改用細粒度訊號 |

<mark style="background: #BBFABBA6;">結論：三者都在往「編譯期做更多、執行期做更少」與「更細的更新粒度」收斂。</mark>這代表用「效能」當選型的唯一理由，說服力一年比一年低。

#### (l) 面試怎麼回答「你為什麼選 React」

<mark style="background: #FFB86CA6;">30 秒版：</mark>

> 我選 React 主要是兩個理由。第一，JSX 就是 JavaScript，UI 邏輯不用學另一套模板語法，TypeScript 的推導也是原生等級。第二，生態系可以橫向遷移，同一套心智模型可以寫 Web 也可以寫 React Native。至於效能，React 預設確實比 Vue 和現在的 Angular 吃虧，這點我不會硬拗。

<mark style="background: #FFB86CA6;">90 秒版（被要求展開時往下接）：</mark>

> 單看變更偵測，React 是三者裡最粗的。它不知道資料變了，要我呼叫 `setState` 通報，然後整個子樹重跑。Vue 有 Proxy 站在資料前面自動追蹤依賴，加上編譯期的 Patch Flags，能把 diff 範圍壓得很小；Angular 走 Signals 加 zoneless 之後可以精準到節點。所以效能這一項，React 是靠 React Compiler 在補，不是天生就贏。
>
> 我還是選 React，是因為我這個專案的瓶頸不在 render 效能，而在需求變動速度跟一個人維護的成本。如果今天是十幾個人、要維護五年的企業後台，我會認真考慮 Angular。

<mark style="background: #FFB86CA6;">被追問「那你為什麼不用 Vue」——講取捨，不要講 Vue 不好：</mark>

> Vue 在中小型專案的開發速度我認為是贏的。我選 React 是因為我想把時間投在 JavaScript 本身，而不是框架語法上。JSX 學會了，我的 JS 能力可以直接變現；模板語法學再熟，換框架時帶不走。這是我的個人押注，不是說 Vue 有問題。

> [!check] 這題的評分標準其實不是「哪個框架最好」
> <mark style="background: #BBFABBA6;">面試官要看的是你知不知道自己放棄了什麼。</mark>「因為 React 最好」會被扣分，因為那代表沒比較過。「React 在效能預設值上不如另外兩個，但我這個場景的瓶頸不在那裡，我選它是為了 X，代價是 Y」會加分，因為那代表做過技術選型。

#### (m) 這五個說法很順口，但拿去面試會被打

- a. <mark style="background: #FF5582A6;">「React 把 UI 約束成純函數 `UI = f(props, state)`」</mark>——這是**理想模型不是實作事實**。`useEffect`、`useRef`、`Context`、Server Components 全在公式之外。
- b. <mark style="background: #FF5582A6;">「Vue 的模板讓組件化沒 React 好用」</mark>——太強了。Slot 涵蓋絕大多數組合情境，而且 Vue 本來就支援 JSX。改成「在傳遞高度動態的 UI 參數時，我個人覺得直接傳 JSX 比 Slot 好推導」，這是偏好，站得住。
- c. <mark style="background: #FF5582A6;">「Vue 的 TypeScript 要靠外掛二次解析」</mark>——現況是 Vue Language Tools 與 `vue-tsc` 已相當成熟，講成硬傷會顯得資訊過時。
- d. <mark style="background: #FF5582A6;">「AngularJS 用髒檢查所以效能差」</mark>——**這是在打一個 2022 年 1 月就 EOL 的版本**。現在講 Angular 就是講 Signals 與 zoneless。
- e. <mark style="background: #FF5582A6;">「Vue 有 Virtual DOM 所以跟 React 差不多」</mark>——Vue 3.6 的 Vapor Mode 正在把 Virtual DOM 拿掉，這句話的有效期正在過去。

### 自我測驗（2026-08-18 追加：變更偵測與 Proxy）

> [!question] 填空題
> 1. Proxy 的建構語法是 `new Proxy(||target||, ||handler||)`，handler 裡定義的攔截行為官方術語叫 ||trap（陷阱）||。
> 2. Vue 3 用 `get` trap 做 ||依賴收集（track）||，用 `set` trap 做 ||觸發更新（trigger）||。
> 3. Vue 2 的 `Object.defineProperty` 偵測不到 ||新增屬性||、||刪除屬性|| 與 ||陣列索引賦值||。
> 4. `reactive(obj) === obj` 的結果是 ||false||，要取回本人得用 ||`toRaw()`||。
> 5. `ref()` 底層用的是 ||getter／setter||，不是 Proxy；`reactive()` 底層用的才是 ||Proxy||。
> 6. React Compiler 於 ||2025 年 10 月|| 推出 v1.0 穩定版，作用是在 ||編譯期自動插入 memo 化||。

> [!question] 是非題
> 1. Vue 3 放棄支援 IE11 跟 Proxy 有直接關係。 → ||✔ 對。Proxy 無法被 polyfill。||
> 2. React 也是靠攔截資料的讀寫來知道狀態變了。 → ||✘ 錯。React 完全不知道，必須由你呼叫 setState 通報。||
> 3. Vue 的 Patch Flags 是在執行期計算出來的。 → ||✘ 錯。是編譯期就標記好的。||
> 4. Svelte 和 Solid 都沒有 Virtual DOM。 → ||✔ 對。||
> 5. 拿 AngularJS 1.x 的髒檢查當「不選 Angular」的理由是安全的說法。 → ||✘ 錯。1.x 已於 2022 年 1 月 EOL。||

> [!question] 申論題
> 請解釋「Vue 知道你改了什麼，React 不知道」的技術含意，以及它如何導致兩邊寫法的差異。
> → ||關鍵在有沒有攔截層。Vue 3 用 Proxy 在資料前面放了替身，讀寫都經過 get 與 set 兩個 trap，所以能在讀取時記錄「哪個元件用到這個屬性」，寫入時精準通知那些元件更新。React 沒有這一層，直接改 state 物件它完全無感，必須呼叫 setState 主動通報。||
> ||這決定了兩邊的寫法。Vue 可以直接寫 state.count++；React 必須寫 setCount(prev => prev + 1)，而且更新物件或陣列時要產生新的參考，因為 React 判斷「有沒有變」只靠淺比較參考。所以 React 的不可變更新不是風格潔癖，是偵測機制決定的必要條件。||

### 2026-08-18 追加的資料來源

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| React 版本頁（19.2.x；React Compiler v1.0 於 2025-10 穩定） | https://react.dev/versions | 查證日 2026-08-18 |
| Angular 變更偵測現況（Signals 與 zoneless） | https://angular.love/the-latest-in-angular-change-detection-zoneless-signals | 查證日 2026-08-18 |
| Vue 3.6 Vapor Mode 實作進度 | https://certificates.dev/blog/vapor-mode-in-practice | 查證日 2026-08-18 |
| Vue 官方：深入響應式系統 | https://cn.vuejs.org/guide/extras/reactivity-in-depth.html | 查證日 2026-08-18 |
| MDN：`Proxy` 與 handler traps | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy | 查證日 2026-08-18 |
| Vue CLI `devServer.proxy`（<mark style="background: #FF5582A6;">此頁為開發伺服器反向代理，與 JavaScript Proxy 無關</mark>） | https://cli.vuejs.org/zh/config/#devserver-proxy | 查證日 2026-08-18 |
| AngularJS 1.x 已於 2022-01 終止支援 | https://en.wikipedia.org/wiki/AngularJS | 查證日 2026-08-18 |

> [!warning] ⚠️ 提醒
> (j) 表格中 Svelte 與 Solid 的欄位是依公開設計理念整理，未逐項對照官方版本號。要引用具體效能數字建議另查 js-framework-benchmark 當期結果。

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
