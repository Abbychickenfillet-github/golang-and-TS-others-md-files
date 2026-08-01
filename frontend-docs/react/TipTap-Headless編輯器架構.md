---
title: TipTap：Headless（無頭）編輯器架構是什麼
type: topic-note
source: Gemini
tags: [gemini, react, tiptap, rich-editor, frontend-architecture]
sources:
  - https://gemini.google.com/app/7a772dbf62bb2d5f
updated: 2026-07-27
---

# TipTap：Headless（無頭）編輯器架構

本篇重點 a–g，共 7 個

## 重點整理

a. <mark style="background: #ADCCFFA6;">Headless（無頭）</mark>的意思：只提供大腦（邏輯），不提供長相（UI）。傳統富文本編輯器（CKEditor、TinyMCE）是「有頭」的——安裝後自動畫好工具列、按鈕、彈出視窗；想改一個按鈕形狀往往要寫大量 CSS 覆蓋（Override）預設樣式。

b. TipTap 的架構拆分：<mark style="background: #FFF3A3A6;">邏輯層（The Brain）</mark>處理所有複雜編輯行為（加粗、超連結、選取範圍、HTML 解析、JSON 轉換）；<mark style="background: #FFF3A3A6;">視覺層（The Face）</mark>完全交給開發者——外觀、工具列長相、按鈕位置全部自己用 React 組件寫。TipTap 底層基於 <mark style="background: #D2B3FFA6;">Prosemirror</mark>，負責資料模型（Model）與邏輯，不負責視圖（View）具體實作。

c. 對於需要「左側編輯後台 + 右側即時預覽」這種架構的專案，Headless 帶來的優勢：可以直接用現有的 Tailwind CSS 或 UI 組件庫建構工具列，讓後台看起來完全像系統的一部分，而不是硬塞進去的外來套件。

```jsx
<Button
  className="bg-white border-none shadow-sm"
  onClick={() => editor.chain().focus().toggleBold().run()}
>
  B
</Button>
```

d. <mark style="background: #ADCCFFA6;">結構化資料：JSON vs HTML</mark>——TipTap 不只能產出 HTML，更重要的是能產出 JSON 樹狀結構。資料儲存端可以把 JSON 存進 PostgreSQL；前台預覽端可以解析同一份 JSON，對應到前台開發的 React 元件渲染，確保樣式跟前台 100% 同步，不會有 CSS 污染問題。

e. 高度擴充性：透過 Extension 機制可以寫自訂指令，例如「重置為系統預設色」：

```js
// 清除所有選取範圍內的行內樣式，恢復系統 CSS 變數顏色
editor.chain().focus().unsetColor().unsetAttributes('style').run();
```

f. 傳統編輯器 vs TipTap（Headless）比較：

| 特性 | 傳統編輯器 Classic | TipTap Headless |
|---|---|---|
| 預設介面 | 內建工具列與選單 | 完全沒有（空白） |
| 開發難度 | 低（開箱即用） | 中（需自建 UI） |
| 自定義程度 | 低（受限官方樣式） | 極高（100% 控制） |
| 與 React 整合 | 普通（通常是 Wrapper） | 極佳（邏輯與組件分離） |
| 適合場景 | 快速開發、標準部落格 | CMS 後台、SaaS、專業工具 |

g. <mark style="background: #FF5582A6;">色彩防護機制（Safe-guard）</mark>：給用戶 Rich Editor 自由調色的同時，必須提供「恢復原狀」能力，否則前端渲染可能因用戶亂調顏色（例如白字白底）而破圖或不可讀。做法：編輯器初始化時預設不帶 `style="color: ..."`，直接繼承前台 CSS 變數（如 `--text-primary`）；工具列提供明顯的「Reset to Default / System Color」按鈕，執行時清除所有行內 `color`/`background-color` 樣式；限制可選色票（Color Palette）為符合品牌識別的色標，避免給全色域選擇器造成 UI 崩壞風險。

## 開發實作要點（使用 TipTap 時）

- 使用 `useEditor` hook 初始化編輯器邏輯。
- 使用 `<EditorContent />` 作為編輯畫布。
- 自訂工具列按鈕的選取狀態透過 `editor.isActive('bold')` 動態切換樣式（例如變色表示已套用）。
- 若要做「左側編輯、右側即時預覽」的雙欄同步，搭配 `onUpdate` 事件 + debounce（約 300ms），把 JSON 數據同步到右側預覽組件，避免 Rich Editor 頻繁觸發導致輸入延遲（Input Lag）。
- 效能：預覽組件（右側）建議用 `React.memo` 或 `useMemo`，避免左側表單小變動就讓整個預覽畫面重繪；也要評估預覽端是直接渲染 Component，還是用 iframe 完全隔離樣式（避免 CSS 污染）。

## 自我測驗

1. （填空題）Headless 編輯器架構中，「邏輯層」負責 ______，「視覺層」負責 ______，兩者由開發者自行決定。
   答案：||處理所有複雜編輯行為（加粗、超連結、選取範圍、HTML/JSON 轉換）；外觀與工具列的實作（用 React 組件自行打造）||
2. （是非題）TipTap 只能輸出 HTML，無法輸出結構化的 JSON 資料。
   答案：||✗。TipTap 除了能產出 HTML，更重要的是能產出 JSON 樹狀結構，方便存進資料庫，前台也能解析同一份 JSON 對應到 React 元件渲染，確保樣式與前台同步。||
3. （申論題）為什麼在 Rich Editor 中要提供「重置為系統預設色」的按鈕？這解決了什麼風險？
   答案：||Rich Editor 給予使用者自由調整顏色的彈性，但若使用者不小心設定了與背景對比度不足的顏色（例如白字白底），或顏色與前台 Dark/Light Mode 衝突，會導致畫面破圖或文字不可讀，形成 UI 崩壞。提供 Reset 按鈕（清除行內 color/background-color 樣式、恢復繼承系統 CSS 變數）可以讓使用者一鍵修復，同時限制可選色票範圍也能從源頭降低風險。||

## 與既有筆記的關聯

- 與 [[backend/database/SQL-INSERT語法與菜單JSONB選項建模-Alias|SQL-INSERT語法與菜單JSONB選項建模-Alias]] 是同一場對話的延伸：先討論資料庫怎麼存菜單資料，接著討論後台管理介面要重構成「左編輯、右預覽」並導入 TipTap，兩者是「資料層」與「介面層」的一體兩面，實作時通常要一起規劃（TipTap 產出的 JSON 要能對應資料庫欄位設計）。
- 與 [[frontend-docs/react/React-Hook-Form-useForm-register-watch-setValue|React-Hook-Form-useForm-register-watch-setValue]] 相關：文中提到的「左側編輯、右側即時預覽」架構若用 React Hook Form 的 `watch` 搭配 TipTap 的 `onUpdate`，是常見的雙欄同步實作組合，但要注意 `watch` 過度使用一樣有效能陷阱，需要 debounce。
- 與 [[frontend-docs/react/樂觀更新-Optimistic-Update|樂觀更新-Optimistic-Update]] 概念呼應：即時預覽與樂觀更新都在解決「使用者操作後，畫面該多快反映結果」的 UX 問題，只是即時預覽是「本地狀態直接渲染」，樂觀更新是「先假設 API 會成功，之後再校正」。

## 各對話來源（原文）

### 拆解複雜職缺介紹 / 大重構規劃（2026-07，延伸自 SQL 咖啡菜單對話）— https://gemini.google.com/app/7a772dbf62bb2d5f

使用者：請幫我寫出來我要讓CLAUDE CODE知道我右邊是要official_website的預覽左邊依然是白底的admin後台管理畫面然後都要改用richeditor是個大重構請他plan，因為他不能看圖片所以麻煩你gemini幫我轉述一下

Gemini：整理成給 Claude Code 的重構計畫：左側 Admin 白底管理台，長文字欄位改用 Rich Text Editor；右側即時預覽官方網站前台效果。技術要求包含 SplitLayout 元件、狀態管理讓右側能訂閱左側變化、Rich Editor 建議用 TipTap 或 CKEditor。

使用者：不只 WebsiteSettings 其他管理頁也是喔

Gemini：升級為全域性重構計畫，涵蓋 Menu、Seat、Event、WebsiteSettings 等所有管理頁，建立可重用的 SplitViewLayout 元件與統一的 RichEditor 元件，並提醒效能風險（Debounced Preview、Memoization、Iframe vs Component 的取捨）。

使用者：（要求保留原始文字顏色作為預設按鈕選項，避免用戶把 UI 搞垮）

Gemini：補充「System-First 色彩政策」：Reset to Default 按鈕、預設繼承 CSS 變數而非寫死顏色、限制調色盤為品牌色票，避免用戶自訂顏色破壞 UI 一致性。

使用者：tiptap的 HEADLESS是啥意思

Gemini：解釋 Headless 架構：只提供邏輯不提供 UI，邏輯層處理編輯行為、視覺層完全交給開發者用 React 組件實作。優勢是 UI 完全一致、能產出 JSON 結構化資料供前後台同步渲染、擴充性高（可寫自訂 Extension 如 unsetColor）。與傳統編輯器的差異比較表、實作建議（useEditor、EditorContent、debounce 同步）。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| TipTap Headless 架構討論 | https://gemini.google.com/app/7a772dbf62bb2d5f | Gemini 對話，2026-07 |
| TipTap 官方文件（Headless 概念、Prosemirror 基礎） | https://tiptap.dev/docs | 查證時請以官方文件最新版為準 |

⚠️ 存疑/更正：無明顯錯誤，Headless 架構描述與 TipTap 官方定位一致；實際 Extension API（如 `unsetColor`）名稱請以當時安裝的 TipTap 版本文件為準，套件版本更新可能調整 API。
