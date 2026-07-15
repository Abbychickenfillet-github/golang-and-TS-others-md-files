# Please fix this error

> Cursor · 2025-11-26 16:19 · `02f1f903-4796-4c33-83f3-9cbb570f62de` · 3 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/general-contractors.tsx:**
- **Line 92:** Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. [+10 locations]
- **Severity:** Warning
- **Code:** typescript:S3776

Provide a solution that resolves this issue. @general-contractors.tsx

## 你
改了些什麼用什麼邏輯改的本來怎麼了跟我說

## Cursor
## 調整說明

- 把 `ContractorRow` 裡面負責顯示狀態徽章與展開商品列表的區塊抽成了 `ContractorStatusBadges` 與 `ContractorProductsRow` 兩個元件；共用 `useContractorProducts` 的邏輯被移到新元件內，並加入 `renderProductsContent` 幫忙拆解條件。這樣可以把原本複雜的 JSX 判斷分散開來，降低 Cognitve Complexity。
- 也把 `GeneralContractors` 中主要的三層巢狀三元運算式抽成 `renderContractorsContent` 函式，裡面用早退的方式處理 `isLoading` 與權限檢查，避免巨大的 JSX 內聯判斷。

原本 `ContractorRow` 和 `GeneralContractors` 兩個函式都有多層巢狀條件（Loader / 權限 / 無資料 / 展開顯示產品等），導致 Sonar 的 Cognitive Complexity 超標。現在透過拆分元件與獨立渲染函式，把邏輯依責任切開（狀態徽章、商品欄、列表容器），讓主函式只保留必要的狀態與事件處理，自然就降到允許的複雜度範圍內。
