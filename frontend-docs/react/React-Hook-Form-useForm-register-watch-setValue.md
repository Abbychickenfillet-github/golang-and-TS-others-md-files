---
title: React Hook Form：useForm、register、watch、setValue
type: topic-note
source: Gemini
tags: [gemini, react, react-hook-form, frontend]
sources:
  - https://gemini.google.com/app/37198567f99c96c9
updated: 2026-07-27
---

# React Hook Form：useForm、register、watch、setValue

本篇重點 a–j，共 10 個

## 重點整理

a. React Hook Form（RHF）的核心設計是 <mark style="background: #ADCCFFA6;">「非受控組件」（Uncontrolled Components）</mark>模式。跟傳統 `useState` 每個欄位都要寫一個 `onChange` 處理函式比起來，RHF 能大幅減少重新渲染（Re-render）次數並簡化程式碼。

```jsx
const {
  register, handleSubmit, reset, watch, setValue,
  formState: { isSubmitting }
} = useForm<any>({
  mode: "onBlur",
  defaultValues: { capacity_min: 2, capacity_max: 4, sort_order: 0 }
})
```

b. 解構出來的常用工具：

| 函式 | 用途 |
|---|---|
| `register` | 核心函式，把輸入框（input/select）註冊到套件中，自動追蹤值與驗證 |
| `handleSubmit` | 高階函式，先執行驗證，通過才執行自訂 submit 邏輯，自動處理 `e.preventDefault()` |
| `reset` | 重置表單，清空欄位或恢復到 `defaultValues` |
| `watch` | 訂閱制，根據某欄位的值動態顯示其他內容 |
| `setValue` | 手動改值，常用於自訂元件（如點地圖自動填地址） |
| `formState: { isSubmitting }` | 狀態監控，判斷 API 是否正在送出，藉此禁用按鈕防止重複點擊 |

c. `mode: "onBlur"` 決定「驗證觸發時機」——預設是 `onSubmit`（送出才檢查），設為 `onBlur` 則使用者離開輸入框（失焦）時就立刻驗證，對使用者體驗較好。

d. `defaultValues` 定義表單初始狀態，這很重要：讓表單有可靠的資料來源（<mark style="background: #FFF3A3A6;">Single Source of Truth</mark>），避免欄位出現 `undefined`。

e. <mark style="background: #FF5582A6;">`useForm<any>` 的 `any` 會喪失 TypeScript 優勢</mark>，建議改成具體的 `interface IFormInput { ... }`，這樣呼叫 `setValue`/`watch` 時編輯器才能提供精準自動補全與型別檢查。

f. `watch`：監聽表單欄位變化，被監聽的欄位值改變時觸發組件重新渲染。使用場景：條件式顯示（如勾選「需要發票」才顯示統編欄位）、即時預覽、字數統計。

g. `setValue`：因為 RHF 預設非受控，不能直接用 state 改 input 值；要從外部（程式碼）修改表單內容必須用 `setValue`。使用場景：第三方套件整合（如點 Google Maps 自動填地址）、自動帶入（同通訊地址按鈕）、重置單一欄位（不動整個表單）。

h. `watch` vs `setValue` 對比：

| 特性 | watch | setValue |
|---|---|---|
| 主要目的 | 讀取（監聽值變化） | 寫入（手動修改值） |
| 重新渲染 | 會觸發（針對監聽欄位） | 預設不會（除非設定 shouldValidate 等） |
| 常用參數 | `watch("fieldName")` | `setValue("fieldName", "newValue")` |

i. <mark style="background: #FF5582A6;">效能提醒</mark>：過度使用 `watch` 會讓元件頻繁重新渲染，抵銷 RHF 原本的效能優勢。若只需要「提交時」拿資料不要用 `watch`；若只是簡單 UI 切換，考慮改用獨立的 `useWatch` Hook，能把重新渲染範圍限制在更小的組件內。

j. `register`、`watch`、`setValue` 三者搭配使用，就能涵蓋 95% 以上的複雜表單需求，常見於後台管理系統、商品上架設定等需要處理大量欄位的場景。

## 自我測驗

1. （填空題）React Hook Form 若要「讀取」某欄位的即時值來連動 UI，用 ______；若要「從程式碼手動寫入」某欄位的值，用 ______。
   答案：||watch；setValue||
2. （是非題）`mode: "onBlur"` 表示表單只有在使用者按下送出按鈕時才會驗證欄位。
   答案：||✗。`onBlur` 是欄位「失去焦點」時就立刻驗證；只有送出才驗證的是預設值 `onSubmit`。||
3. （申論題）為什麼過度使用 `watch` 會抵銷 React Hook Form 原本的效能優勢？該怎麼解決？
   答案：||React Hook Form 的核心優勢是「非受控組件」，只有必要時才觸發重新渲染；但 watch 訂閱的欄位一旦變化就會觸發該元件重新渲染，若監聽範圍太大或太頻繁，等於變相把整個表單變成受控組件，頻繁重繪拖慢效能。解法是只在真正需要「提交時」才不使用 watch，若只是簡單 UI 切換可改用獨立的 useWatch Hook，把重新渲染範圍限制在更小的組件內。||

## 與既有筆記的關聯

- 與 [[Golang/react-hook-form-number-validation|react-hook-form-number-validation]] 相關：那篇聚焦在數字欄位驗證的細節，本篇則是 `useForm` 解構出來的整體工具（`register`/`watch`/`setValue`/`handleSubmit`）的用途地圖，可視為「總覽」與「單點深入」的關係。
- 與 [[frontend-docs/react/樂觀更新-Optimistic-Update|樂觀更新-Optimistic-Update]] 相關：`formState.isSubmitting` 常搭配樂觀更新的 UI 邏輯一起使用（送出中禁用按鈕、樂觀顯示暫時結果），兩者都在處理「非同步操作進行中」的使用者體驗設計。

## 各對話來源（原文）

### React Hook Form useForm 詳解（2026-07）— https://gemini.google.com/app/37198567f99c96c9

使用者：`const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<any>({ mode: "onBlur", defaultValues: { capacity_min: 2, capacity_max: 4, sort_order: 0 } })` 通常為什麼會這樣寫

Gemini：這是 React 表單處理最主流方式之一，使用 React Hook Form 套件，屬於「非受控組件」模式，比 `useState` 逐欄位處理更省重新渲染。解構出的工具：`register`（註冊輸入框）、`handleSubmit`（驗證後才執行 submit）、`reset`（重置表單）、`watch`（訂閱式監聽）、`setValue`（手動改值）、`formState.isSubmitting`（狀態監控）。`mode: "onBlur"` 決定驗證觸發時機，失焦即驗證，UX 較好。`defaultValues` 提供可靠的初始資料來源。核心優勢：效能優化（只有必要時如 watch 才重新渲染）、開發效率（不需每個 input 寫 onChange）、型別安全（建議定義 interface 取代 any）、驗證整合（可配合 yup/zod）。

使用者：watch, setValue 是react-hook-form的嗎

Gemini：是的，兩者都是從 `useForm` 解構出來的核心函式，用於處理進階互動邏輯。`watch` 讓你訂閱表單欄位變化，觸發重新渲染以根據新值調整畫面，用於條件式顯示、即時預覽、字數統計。`setValue` 用於從外部手動修改表單內容（因為 RHF 預設非受控），用於第三方套件整合、自動帶入、重置特定欄位。效能提醒：過度使用 watch 會導致頻繁重新渲染；只在提交時需要資料就不要用 watch；簡單 UI 切換可考慮改用 `useWatch` 縮小重新渲染範圍。

## 資料來源（含查證時間）

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| React Hook Form useForm 解構用法 | https://gemini.google.com/app/37198567f99c96c9 | Gemini 對話，2026-07 |
| React Hook Form 官方文件 | https://react-hook-form.com/docs/useform | 查證時請以官方文件最新版為準（API 可能隨版本調整） |

⚠️ 存疑/更正：無明顯錯誤，內容與 React Hook Form 官方文件描述的行為一致。
