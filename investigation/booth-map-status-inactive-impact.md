# 攤位地圖 Status (Active/Inactive) 對品牌商購買的影響

## 日期
2026-03-02

## 問題背景

Dashboard 攤位管理頁面：
`http://localhost:5003/booths?page=1&event_id=46f5ad59-5ce0-42fa-8963-71054edebe0e`

新增地圖與攤位的 aside 中，地圖有 `status` 欄位可設為 `active` 或 `inactive`。

## 疑問

1. **Inactive 地圖上的攤位，品牌商還看得到嗎？**
   - 前台 `EventDetailPage` 的攤位地圖區塊是否會過濾掉 inactive 地圖？
   - 品牌商報名攤位時（`EventRegisterBoothPage`），是否只顯示 active 地圖的攤位？

2. **Inactive 代表什麼語意？**
   - 是「暫時隱藏」還是「已作廢」？
   - 如果品牌商已經選了某個攤位，之後地圖改成 inactive，已選的攤位會怎樣？

3. **目前有沒有後端邏輯處理這個？**
   - 後端 API 查詢攤位時是否有過濾 `map.status = 'active'`？
   - 還是前後端都沒有特別處理，inactive 只是一個 label 沒有實際效果？

## 待做

- [ ] 檢查後端 booth API 是否有根據 map status 過濾
- [ ] 檢查前台攤位地圖顯示邏輯（`InteractiveBoothMap.tsx`、`EventRegisterBoothPage.tsx`）
- [ ] 決定 inactive 的語意：隱藏 vs 作廢 vs 純標記
- [ ] 如果 inactive 應該有實際效果，需要前後端同步加上過濾邏輯
- [ ] Dashboard aside 的 status 欄位加上提示文字，說明 inactive 的影響

## UI 建議

在 Dashboard 攤位設定 aside 的 status 下拉旁邊，加一個提醒：
> 設為 Inactive 將使該地圖（及其攤位）對品牌商不可見（待確認實際行為）
