---
title: react-i18next 初始化整合與語言切換（i18n.use / lng / changeLanguage）
type: topic-note
source: Gemini
tags: [gemini, react, i18next, i18n, 多語系]
sources:
  - https://gemini.google.com/app/69c341c9b4a7c02a
updated: 2026-06-28
---

# react-i18next 初始化整合與語言切換

## 重點整理

### 1. `i18n.use(initReactI18next)` 為什麼要這樣傳遞
把 i18n 實例整合進 React 生態系的關鍵步驟，主要有四個原因：

- <mark style="background: #FFF3A3A6;">提供 Context 全域存取</mark>：把 i18n 實例綁到 React 的 <mark style="background: #ADCCFFA6;">Context</mark>，讓所有 Hook（`useTranslation`）／HOC（`withTranslation`）都能直接取用，<mark style="background: #BBFABBA6;">不必每個元件手動 import</mark>。
- <mark style="background: #FFF3A3A6;">自動觸發 UI 更新（Re-render）</mark>：切換語言（`i18n.changeLanguage`）時通知元件重新渲染。<mark style="background: #FF5582A6;">沒有這層綁定，元件感知不到語系改變，文字不會自動更新。</mark>
- <mark style="background: #FFF3A3A6;">處理預設值與安全性</mark>：協助 React 特有設定，例如 `interpolation: { escapeValue: false }`——因為 <mark style="background: #ADCCFFA6;">React 本身已防 XSS</mark>，不需 i18next 再轉義一次。
- <mark style="background: #FFF3A3A6;">生命週期管理</mark>：確保 i18next 初始化與 React 載入流程正確銜接，避免翻譯資源還沒載入就報錯。

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n
  .use(initReactI18next) // 核心步驟：把 i18n 傳遞給 react-i18next
  .init({
    resources,
    lng: "en",
    interpolation: {
      escapeValue: false, // React 已安全處理，不需重複轉義
    },
  });
```

### 2. `lng: 'en'` 不是把語言鎖死，而是「啟動預設語系」
- `lng` 是 <mark style="background: #FFF3A3A6;">Initial Language（初始語系）</mark>：使用者第一次開網頁時顯示哪種語言。
- 寫死 `'en'` → <mark style="background: #FF5582A6;">不會偵測瀏覽器語系</mark>。
- 進階做法：搭配 <mark style="background: #BBFABBA6;">`i18next-browser-languagedetector`</mark>，讓初始語系變動態（自動抓使用者瀏覽器設定）。
- 若完全不設 `lng`，可能因找不到語系資源而<mark style="background: #FF5582A6;">直接顯示原始的 Key</mark>。

### 3. `i18n.changeLanguage` 在哪裡呼叫
是 i18n 實例上的 <mark style="background: #ADCCFFA6;">方法（Method）</mark>，通常綁在「語系切換按鈕」的點擊事件。

方法 A — React 元件內（推薦，用 Hook 取得）：

```jsx
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <button onClick={() => i18n.changeLanguage('fr')}>
      切換至法文
    </button>
  );
}
```

方法 B — 一般 JS/TS 檔案內（匯入全域實例）：

```typescript
import i18n from './i18n'; // 匯入設定好的 i18n 實例
const toggleLanguage = (lng) => {
  i18n.changeLanguage(lng);
};
```

> [!warning] 注意
> 執行 `changeLanguage('fr')` 後，i18next 會去 `resources` 找對應語系檔；<mark style="background: #FF5582A6;">若 `resources` 沒定義該語系，畫面就無法正確顯示翻譯。</mark>

## 自我測驗

<details class="quiz">
<summary>是非題：初始化寫 <code>lng: 'en'</code> 代表整個專案語言被鎖死成英文。</summary>
<div class="ans">

<strong>✗ 錯。</strong> `lng` 只是<mark style="background: #FFF3A3A6;">啟動時的預設語系</mark>，之後仍可用 `changeLanguage` 切換；要自動偵測瀏覽器語系可搭配 `i18next-browser-languagedetector`。

</div>
</details>

<details class="quiz">
<summary>填空：React 環境設定 <code>escapeValue: false</code> 的原因是 ____ 已內建防護機制。</summary>
<div class="ans">

<mark style="background: #ADCCFFA6;">React</mark> 本身已防範 <mark style="background: #FF5582A6;">XSS</mark>，不需 i18next 再做一次轉義。

</div>
</details>

<details class="quiz">
<summary>申論題：不呼叫 <code>i18n.use(initReactI18next)</code> 會有什麼後果？</summary>
<div class="ans">

i18n 實例不會綁進 React Context：`useTranslation` 等 Hook 取不到實例，且切換語言時元件<mark style="background: #FF5582A6;">收不到通知、不會 re-render</mark>，介面文字無法自動更新。

</div>
</details>

## 各對話來源

### react-i18next 初始化 i18n 整合（2026-06）— https://gemini.google.com/app/69c341c9b4a7c02a

<div class="srcline"><span class="u">使用者：</span>（貼初始化截圖）passes i18n down to react-i18next 為什麼要這樣傳遞？</div>
<div class="srcline"><span class="g">Gemini：</span>`i18n.use(initReactI18next)` 把 i18n 整合進 React 生態系：提供 Context 全域存取（Hook/HOC 免手動 import）、語系切換時自動 re-render、處理 React 特有設定（escapeValue:false，因 React 已防 XSS）、銜接初始化生命週期避免資源未載入就報錯。並附 Obsidian callout 筆記與 init 範例。</div>
<div class="srcline"><span class="u">使用者：</span>`lng: 'en'` 為啥固定英文？`i18n.changeLanguage` 在哪？</div>
<div class="srcline"><span class="g">Gemini：</span>`lng` 是初始語系不是鎖死，寫死就不偵測瀏覽器語系，進階用 LanguageDetector 動態抓取。`changeLanguage` 是實例方法，可在元件內用 `useTranslation` 取得的 `i18n` 呼叫（方法 A），或在一般 JS/TS 匯入實例呼叫（方法 B）；切換後會去 resources 找語系檔，沒定義就無法顯示。</div>
