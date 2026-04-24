# ECPay DoAction API（信用卡請款/退款）

## 官方文件連結

- **信用卡請款/退款 API 文件**：https://developers.ecpay.com.tw/?p=16567
- **信用卡關帳與退款操作說明**：https://developers.ecpay.com.tw/22797/

---

## ⚠️ AIO vs ECPG — 兩套完全不同的系統

ECPay 有兩套金流系統，API domain、認證方式、Stage 支援度都不同：

| | AIO（舊版，我們使用的） | ECPG（新版 EC Payment Gateway） |
|---|---|---|
| **全名** | All-In-One 金流整合 | EC Payment Gateway 線上金流 |
| **Stage Domain** | `payment-stage.ecpay.com.tw` | `ecpayment-stage.ecpay.com.tw` |
| **Prod Domain** | `payment.ecpay.com.tw` | `ecpayment.ecpay.com.tw` |
| **驗證方式** | CheckMacValue（HMAC SHA256） | Bearer Token + AES 加密 |
| **DoAction Stage** | ✅ 可用（模擬交易） | ❌ 不可用（Stage 無真實授權） |
| **DoAction Prod** | `payment.ecpay.com.tw/CreditDetail/DoAction` | `ecpayment.ecpay.com.tw/1.0.0/Credit/DoAction` |
| **付款頁進入點** | `AioCheckOut/V5` | 站內付 2.0 / 幕後授權 |

### 為什麼 Stage 測不了取消授權？

- **AIO Stage**：有模擬授權流程，DoAction 可以打但回應可能不完全模擬真實行為
- **ECPG Stage**：官方明確說 Stage 無法執行真實授權，所以 DoAction（Action=N 取消授權）無法測試

### 我們的選擇

我們目前使用 **AIO**，因為：
1. AIO 整合較成熟，文件範例多
2. Stage 環境可以測試完整流程
3. CheckMacValue 驗證方式較簡單

如果未來要遷移到 ECPG（站內付 2.0、Token 綁卡等），需要整套認證機制改寫。

---

## Endpoint

| 環境 | URL |
|------|-----|
| Stage | `https://payment-stage.ecpay.com.tw/CreditDetail/DoAction` |
| Production | `https://payment.ecpay.com.tw/CreditDetail/DoAction` |

## 信用卡交易生命週期

```
時間軸 ────────────────────────────────────────────────────►

  ①            ②             ③
 刷卡          請款           入帳
 授權成功       (關帳)        (錢真的撥給商家)
  │            │             │
  ▼            ▼             ▼
 ┌──────────┐ ┌───────────┐ ┌──────────────┐
 │ 已授權    │ │ 已請款     │ │ 已入帳       │
 │ Authorized│ │ Captured  │ │ Settled      │
 └──────────┘ └───────────┘ └──────────────┘
       │            │              │
       │            │              │
  可用 N 取消授權  可用 E 取消請款   只能用 R 退款
  (Void)        (Cancel Capture)  (Refund)
```

### 各階段說明

| 階段 | 狀態 | 發生了什麼 | 可用的反悔操作 |
|------|------|-----------|--------------|
| ① 刷卡 | 已授權 | 銀行「凍結」消費者的額度，但錢還沒動 | **N 取消授權** — 解凍額度，當作沒發生 |
| ② 請款 | 已關帳 | 商家跟銀行說「我要收這筆錢」，進入請款流程 | **E 取消請款** — 攔截請款，錢還沒撥出去 |
| ③ 入帳 | 已撥款 | 錢真的從消費者帳戶扣走，撥給商家 | **R 退款** — 商家把錢退回去，會有手續費 |

### 手續費差異

```
N 取消授權  →  錢根本沒動過，只是解除「凍結」 → 免手續費 ✅
E 取消請款  →  錢正要撥但還沒撥，攔截回來     → 免手續費 ✅
R 退款      →  錢已經撥了，要逆向轉回去       → 有手續費 ❌
```

## Action 參數

| Action | 說明           | 用途                         |
|--------|----------------|------------------------------|
| N      | 放棄（取消授權） | 信用卡尚未請款，取消交易       |
| C      | 請款（關帳）     | 確認收款                     |
| R      | 退款           | 已請款後退錢（可全額或部分）   |
| E      | 取消關帳       | 取消請款，回復訂單狀態         |

## 後端 ProcessRefund 邏輯

後端 `ProcessRefund` 已有智能判斷：

1. **全額退款**：先試 `Action=N`（取消授權），失敗才用 `Action=R`（退款）
2. **CancelAuthorization**：獨立的 `Action=N` 呼叫

原因：`N`（取消授權）不會產生手續費，對商家更有利；但如果已經請款了，`N` 會失敗，此時才走 `R`（退款）。
