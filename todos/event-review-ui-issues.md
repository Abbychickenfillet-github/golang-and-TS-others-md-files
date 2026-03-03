# 活動審核 UI Issues

## Issue 1: EventsCreateBasicPage Step4 — 審核管理入口

**檔案**: `official_website/src/pages/EventsCreateBasicPage.tsx` (約 line 1501)

**現況**: Step4 只有一個「品牌商需事先審核」的 Switch 開關，開啟後沒有任何地方可以管理審核。

**需求**: 當 `require_vendor_review` 開啟後，需要有入口讓主辦方管理審核申請。

**方案（擇一）**:
- **A. 超連結**: Switch 下方加一個連結，跳轉到 EventVendorsPage 的審核 Tab
  ```
  「品牌商需事先審核」開關
  → 下方顯示：「前往審核管理 →」超連結
  → 跳轉到 /event/:id/vendors?tab=reviews
  ```
- **B. Accordion 展開**: 直接在 Switch 下方用 Accordion 展開審核列表（inline 管理）
  ```
  「品牌商需事先審核」開關
  → 展開後顯示：待審核列表 + 核准/拒絕按鈕
  ```

**建議**: 方案 A 較簡單，不用在建立頁面塞太多東西。

---

## Issue 2: Dashboard events.tsx Tabs 沒有 RWD

**檔案**: `dashboard/src/routes/_layout/events.tsx` (約 line 1644)

**現況**: 活動管理頁面有 9+ 個 Tabs（基本資訊、攤位類型、票種、優惠券、品牌商、審核、封鎖...），在小螢幕時 Tabs 全部消失看不到。

**原因**: Chakra UI v2 的 `TabList` 預設 `overflow: hidden`，Tab 太多超出寬度就被裁切。目前有 `flexWrap="wrap"` 但可能不夠。

**修復方向**:
- 加 `overflowX="auto"` 讓 TabList 可以水平捲動
- 或改用下拉選單在手機版切換 Tab
- 或用 `flexWrap="wrap"` + 適當的 `minW` 確保換行時還能看到

```tsx
<TabList overflowX="auto" flexWrap={{ base: "nowrap", md: "wrap" }}>
```
