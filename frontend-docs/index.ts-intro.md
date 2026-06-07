# `frontend/src/client/models/index.ts` 說明

## 這個檔案是做什麼的？
- 這不是後端檔案，也不會被打包送去 API。它只是前端 TypeScript 型別的「總出口」。
- `frontend/src/client/models/` 底下有很多檔案，例如 `member.ts`, `company.ts`, `product.ts`。每個檔案都描述後端 API 回傳／接收資料的欄位（屬於「型別宣告」）。
- `index.ts` 把這些型別統一 `export *`，方便其他地方只寫 `import { MemberPublic } from "../../client/models"` 就能拿到所有型別。

## 為什麼前端還要有 `models`？
- 開發流程是 **後端先定義資料結構 → 產生 OpenAPI → 前端依照 API schema 建型別**。
- 這些型別幫助我們在呼叫 axios/fetch 時拿到自動完成與型別檢查，減少欄位拼錯或漏掉的問題。
- 這些 `.ts` 只存在於編譯階段，瀏覽器不會看到它們，也不會傳到後端。

## 什麼時候要改 `index.ts`？
- 新增/刪除某個 model 檔案後，記得在 `index.ts` 重新 export，讓所有型別保持同步。
- 如果後端更新了欄位，也要更新對應的 model 檔案，再由 `index.ts` 匯出即可。










