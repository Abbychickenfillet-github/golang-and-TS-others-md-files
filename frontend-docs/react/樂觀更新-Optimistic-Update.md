---
title: 樂觀更新 Optimistic Update
type: topic-note
source: Gemini
tags: [gemini, frontend, react, 樂觀更新, optimistic-update, 資料流]
sources:
  - https://gemini.google.com/app/7363e6f0602869d4
updated: 2026-06-17
---

# 樂觀更新 Optimistic Update

## 重點整理

<mark style="background: #ADCCFFA6;">樂觀更新（Optimistic Update）</mark>是前端常用技巧：在等待伺服器回應前，<mark style="background: #FFF3A3A6;">先假設操作會成功，立即更新 UI</mark>，提供更流暢的體驗（不必等網路來回才看到變化）。

### 時序
1. 使用者發起更新的<mark style="background: #BBFABBA6;">瞬間</mark> → UI 立刻顯示「預期的新狀態」（看起來像已完成）。
2. 背景送出請求到伺服器。
3. 伺服器回成功 → 保留更新（或用真實資料校正）。
4. 伺服器回<mark style="background: #FF5582A6;">錯誤／查無資料</mark> → 捕捉錯誤，把畫面<mark style="background: #FF5582A6;">回滾（rollback）到更新前的狀態</mark>，並顯示錯誤訊息。

### 重要觀念：樂觀值只是「暫時」的
若要更新使用者 email，但其實後端沒有這筆 email：樂觀更新階段 UI 會<mark style="background: #FFB8EBA6;">暫時顯示你預期的新 email</mark>；一旦伺服器回找不到資料／錯誤，系統就撤銷樂觀更新，畫面恢復原狀並提示失敗。也就是說——樂觀值不是真實資料，它隨時可能被打回原形。

### React 範例（簡化）
```jsx
// 以 useState 手動回滾為例
async function updateEmail(newEmail) {
  const prev = email;          // 1. 先備份舊值
  setEmail(newEmail);          // 2. 樂觀更新 UI
  try {
    const res = await api.patchEmail(newEmail);
    setEmail(res.email);       // 3a. 成功：用後端回傳校正
  } catch (err) {
    setEmail(prev);            // 3b. 失敗：回滾
    showError('更新失敗，已還原');
  }
}
```

> [!note] 實務上 React 19 有內建 `useOptimistic` Hook，TanStack Query 的 mutation 也有 `onMutate / onError / onSettled` 來做樂觀更新與回滾，不必每次手寫備份。

## 各對話來源

### 樂觀更新的前後端架構(2026-06)— https://gemini.google.com/app/7363e6f0602869d4
使用者：你知道樂觀更新嗎？ → Gemini：前端技巧，等伺服器回應時先假設成功、立即更新 UI。
使用者：它何時執行？收到錯誤或查無資料時何時把更新轉回？ → Gemini：發起更新瞬間立即執行；伺服器回錯誤就捕捉並把介面回復更新前狀態、顯示錯誤訊息。
使用者：如果要找使用者 email 但其實沒有這個 email，會顯示怎樣的 email？ → Gemini：樂觀階段暫時顯示你預期的新 email；伺服器回找不到就撤銷、恢復原狀並顯示錯誤。
使用者：你抓範例 code 嗎？ → Gemini：（當時參考的部落格在談 React Server Components 架構哲學，非可運行範例）。

---

## 2026-09-22 補充：實測與「回滾最容易出錯的那一步」

上面那段 Gemini 整理的內容都對，但它停在「失敗就回滾」。實際跑過之後有三件事要補。

### 一、樂觀更新的價值不是「快幾倍」，是跨過 100ms 那條線

實測（伺服器延遲 600ms，Node.js v22.22.2）：

| 做法 | 按下按鈕後畫面第一次有反應 |
|---|---|
| 悲觀更新（等伺服器） | 602ms |
| 樂觀更新 | 0ms |

分母是 0，所以「快十倍」這種倍數說法根本算不出來。正確的參考點是 <mark style="background: #FFF3A3A6;">Jakob Nielsen 1993 年的三個反應時間界線</mark>：0.1 秒以內使用者覺得「即時」、1 秒以內思緒不中斷、10 秒以內注意力還在。樂觀更新做的是把 602ms 搬到 0ms，**跨過 100ms 那條線**，伺服器該花的時間一秒都沒少。

出處：https://www.nngroup.com/articles/response-times-3-important-limits/ （1993-01-01，文中引用 Miller 1968 與 Card et al. 1991）

### 二、備份的是「前端快取」，不是資料庫

前端快取 = 上一次 GET 回來的那份快照，它跟資料庫不保證同步。所以樂觀更新的回滾防的是<mark style="background: #FF5582A6;">「我自己這次操作失敗」</mark>，不是防別人改資料。詳見 `tanstack/context.previous.md`。

### 三、最容易出錯的那一步不是「忘記備份」

> `setEmail(prev)` 這一行看起來只是還原，實際上是一次**整份覆寫**。回滾寫回的是「那個操作開始時的整個世界」，不是「那個操作改的那一個欄位」。

上面那段 React 範例（`const prev = email` → `setEmail(prev)`）在**單一操作**的世界裡完全正確。但如果使用者同時改了 email 和顯示名稱，兩個請求一快一慢，慢的那個失敗回滾時就會把快的那個已經成功的結果一起還原掉。

這也解釋了 `> [!note]` 那句「React 19 有內建 useOptimistic」為什麼值得注意：**`useOptimistic` 沒有提供任何回滾 API**。它的模型是「疊一層在真相上面，Action 結束那層就消失」，所以回滾不是一個動作，而是那一層自然消失——結構上就不可能抹掉別人的值。

出處：https://react.dev/reference/react/useOptimistic

### 關聯到哪些筆記，以及為什麼

- **`tanstack/onMutate-optimistic-update.md`**：那篇的「失敗寫法 5」就是第三點的完整實測時間軸。**關聯原因**：這篇講的是概念與手寫 `useState` 版本，那篇講的是 TanStack Query 的 API 對應
- **`tanstack/context.previous.md`**：**關聯原因**：第二點「備份的是快取不是 DB」的完整說明在那裡
- **`iThome鐵人賽-2026/Day21-樂觀更新-先假裝成功失敗再回滾.md`**：**關聯原因**：這三點的完整推導與五個 Part 的實測輸出，以及可執行的 `day21-optimistic-update.js`
- **`react/useRef與Vue的ref-value-可變值不觸發渲染的兩種設計.md`**：**關聯原因**：`useOptimistic` 的疊加層要能反映在畫面上，前提是它會觸發 render。這跟 `useRef.current` 改了不觸發 render 正好是一組對照——同樣是「存了一個值」，一個進 render 流程一個不進
