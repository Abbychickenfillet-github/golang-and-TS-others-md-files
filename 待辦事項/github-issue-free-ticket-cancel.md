# GitHub Issue — official_website

## Title
feat: 免費票券取消功能（不走退款流程）

## Body

### Summary

免費票券（is_free=true, price=0）的取消應與付費票券退款分開處理。消費者可隨時取消免費票，不需要走 ECPay 退款流程、不需要主辦審核。

### 業務規則

| | 免費票取消 | 付費票退款 |
|---|---|---|
| 按鈕文字 | 「取消票券」 | 「申請退款」 |
| 需要填寫原因 | 不需要 | 需要 |
| 需要主辦審核 | 不需要，直接取消 | 需要主辦審核 |
| 金流處理 | 無 | ECPay 退款 |
| 時間限制 | 隨時可取消 | 活動前7天全額 / 3-7天50% / 3天內不退 |
| 已轉讓的票 | 擋住（需先轉回自己） | 擋住 |

### 影響範圍

**前端（MyTicketsPage）**
- 免費票顯示「取消票券」按鈕（取代「申請退款」）
- 點擊後彈出確認對話框（不需填原因）
- 確認後直接呼叫取消 API

**後端**
- 新增免費票取消 API 或在現有退款流程判斷 is_free
- 取消 = order 狀態改為 CANCELLED + order_item 軟刪除
- 已轉讓的票不能取消（檢查 holder_member_id != buyer_member_id）

### 副作用考量
- **禮品券**：取消後不自動撤銷已領取的贈品，但後續資格檢查會擋
- **max_per_member**：取消後計數 -1，消費者可重新領取
- **ticket.sold_count**：取消後 -1，釋放名額

### 退票政策（/refund-policy）

依據文化部《藝文展覽票券定型化契約應記載及不得記載事項》及《藝文表演票券定型化契約應記載及不得記載事項》辦理。

**活動分類**：Event model 新增 `refund_policy` 欄位（`exhibition` / `performance`）

#### 1. 藝文展覽類 (`exhibition`)
- 購買 7 天內退票：**全額退款**（7 天鑑賞期，不扣手續費）
- 購買超過 7 天退票：扣票面金額 **10% 手續費**，退 90%
- 展覽結束前皆可退票
- 主辦更換主要展出內容、活動取消或延期 → 消費者可全額退費，不扣手續費（由主辦方發起退款）

#### 2. 藝文表演類 (`performance`)
- 不適用 7 天鑑賞期
- 退票一律扣票面金額 **10% 手續費**，退 90%

#### 3. 共通規則
- **免費票券**：可隨時取消，無需退款
- **票券已核銷**（check_in_status = checked_in）：不可退票
- **票券已轉讓**：需先轉回購買者才可退票
- 套票組合需整套退票，無法退單張

#### 後端實作
- `Event.RefundPolicy`：`exhibition`（預設）/ `performance`
- `RefundService.RequestRefundByMember`：自動根據政策計算退款金額
- `RefundService.calculateRefundAmount`：退款金額計算邏輯
- 新增錯誤：`ErrRefundEventEnded`、`ErrRefundTicketCheckedIn`

### Labels
enhancement, priority: medium
