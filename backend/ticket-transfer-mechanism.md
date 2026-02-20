● 票券轉讓實作說明

  票券轉讓功能的實作架構如下：

  資料庫設計 (order_item 表)

  關鍵欄位（定義在 backend/sql/047_create_ticket_instance.sql）：

  | 欄位             | 說明                          |
  |------------------|-------------------------------|
  | buyer_member_id  | 購買人 ID（永遠不變）         |
  | holder_member_id | 持有人 ID（轉讓時更新此欄位） |

  購買時：buyer_member_id = A, holder_member_id = null (預設同購買人)
  轉讓後：buyer_member_id = A, holder_member_id = B

  後端 API (backend/app/api/routes/orders.py:2224)

  POST /api/v1/orders/tickets/{item_id}/transfer?recipient_email=xxx@example.com

  轉讓流程：
  1. 驗證當前會員是票券持有人（檢查 holder_member_id 或 buyer_member_id）
  2. 透過 Email 查找接收者（必須已註冊會員）
  3. 更新 holder_member_id 為接收者的 ID

  # 核心邏輯 (orders.py:2291)
  item.holder_member_id = str(recipient.id)

  前台 UI (official_website/app/my-tickets/page.tsx)

  消費者在「我的票券」頁面可以：
  1. 點擊轉讓按鈕
  2. 輸入接收者 Email
  3. 確認後呼叫 API 完成轉讓

  // 呼叫轉讓 API
  const result = await ordersApi.transferTicket(selectedTicket.id, recipientEmail.trim())

  判斷持有人邏輯

  # 當前持有人 = holder_member_id (如果有轉讓過) 或 buyer_member_id (原購買人)
  current_holder_id = item.holder_member_id or item.buyer_member_id

  這個設計的好處是：
  - 保留購買紀錄：buyer_member_id 永遠記錄誰買的
  - 追蹤持有人：holder_member_id 記錄當前誰持有
  - 可多次轉讓：每次轉讓只需更新 holder_member_id
