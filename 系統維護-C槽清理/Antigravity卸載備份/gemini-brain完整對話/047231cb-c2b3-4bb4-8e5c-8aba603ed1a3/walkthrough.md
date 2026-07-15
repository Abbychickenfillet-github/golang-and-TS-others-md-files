# 衝突修復總結

我已經根據你的要求，在 `official_website/src/pages/EventRegisterPaymentPage.tsx` 中完成了衝突修復與邏輯調整。

## 變更摘要
1. **整合 i18n 多語系**：從 `develop` 分支同步了最新的 i18n 鍵值（`text24` 到 `text28`），確保標籤顯示支援多國語言。
2. **調整訂單顯示邏輯**：
   - 移除 `order_uuid` 的優先權。
   - 保留並使用 `order_number` 作為主要顯示編號，如果不存在則顯示截短的 `orderId`。

## 代碼對比
### 調整後的邏輯：
```tsx
<span className="text-gray-600">{t('event_register_payment.text26')}</span>
<span className="font-mono text-gray-900">{orderDetails.order_number || `${orderId?.slice(0, 8)}...`}</span>
```

### 已導入對應 Hook：
```tsx
import { useTranslation } from '@/lib/hooks/useTranslation'
// ...
const { t } = useTranslation()
```

請檢查該頁面是否符合你的預期。如果你希望我也處理其他三個衝突文件（如 `SidebarItems.tsx`），請告訴我。
