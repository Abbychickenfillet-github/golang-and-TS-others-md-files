# 專案中有hooks use-loader

> Cursor 對話 · 2025-10-09 11:28 · composerId `b04b48bb-384f-461e-be93-e9ceeeb15d9e` · 8 則訊息

## 你
專案中有hooks/use-loader
hooks/use-loader/loaders/nike-loader.js
hooks/use-loader/loaders/react-loader.js
hooks/use-loader/loaders/text-loader.js
hooks/use-loader/loaders/lottie-animation.js
hooks/use-loader/loaders/default.js
hooks/use-loader/loaders/cat-loader.js
那麼多到底哪一個是正在控制目前全域載入頁面元件？
若沒有的話請幫我設置。不過I remembered I have one when loading into /dashboard route

## Cursor
檢查全域載入頁面元件與 `useLoader` 的實作，確認目前使用的 loader。

## Cursor
檢查 `app/providers.js` 與 `app/layout.js` 是否設定 `LoaderProvider`。

## Cursor
檢視 `hooks/use-loader/loaders/react-loader.js` 的實作。

## Cursor
檢查 `hooks/use-loader/loaders/lottie-animation.js` 的實作。

## Cursor
檢查 `hooks/use-loader/loaders/assets` 目錄是否有 `react.json`。

## Cursor
全域載入頁面元件由 `ReactLoader` 控制，透過 `LottieAnimation` 播放 `react.json`。設定位置：`app/providers.js` 的 `LoaderProvider` 使用 `CustomLoader={ReactLoader}`，`ReactLoader` 內使用 `LottieAnimation`（`animationName="react.json"`）。`app/loading.js` 呼叫 `useLoader().showLoader()` 觸發顯示。

`/dashboard` 目前使用 Bootstrap spinner，非全域 loader：
```javascript
<div className="spinner-border text-primary" role="status">
  <span className="visually-hidden">載入中...</span>
</div>
```

若要讓 `/dashboard` 使用全域 loader，可移除本地 spinner，改由 `useLoader` 控制載入狀態。

## Cursor
## 總結

**目前全域載入頁面元件由 `ReactLoader` 控制**，透過 `LottieAnimation` 播放 `react.json`。

### 目前的設定：
1. **全域載入系統**：`app/providers.js` 的 `LoaderProvider` 使用 `CustomLoader={ReactLoader}`
2. **ReactLoader**：`hooks/use-loader/loaders/react-loader.js` 使用 `LottieAnimation`
3. **LottieAnimation**：播放 `hooks/use-loader/loaders/assets/react.json`
4. **全域載入頁面**：`app/loading.js` 呼叫 `useLoader().showLoader()`

### 已完成的更新：
已更新 `/dashboard` 頁面，改為使用全域 loader：
- 導入 `useLoader` hook
- 頁面載入時顯示全域 loader
- 認證完成後隱藏 loader
- 移除本地 Bootstrap spinner

現在 `/dashboard` 會使用相同的 React Lottie 動畫作為載入動畫。
