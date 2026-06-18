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
