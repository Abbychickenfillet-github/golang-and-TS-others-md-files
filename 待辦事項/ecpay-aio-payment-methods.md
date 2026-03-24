# ECPay AIO 所有付款方式（ChoosePayment）及付款期限

> 來源：ECPay 全方位金流 AIO 技術文件 (2026-03 SNAPSHOT)
> 用途：攤位訂單超時自動取消功能，判斷不同付款方式的保留時間

## 付款方式總覽

| ChoosePayment | 付款方式 | 類型 | 付款期限 | 參數 | 金額限制 |
|---------------|---------|------|---------|------|---------|
| `Credit` | 信用卡一次付清 | **線上即時** | 即時 | — | — |
| `Credit` + `CreditInstallment` | 信用卡分期 | **線上即時** | 即時 | CreditInstallment=3,6,12,18,24,30 | — |
| `Credit` + Period 參數 | 定期定額 | **線上即時** | 即時（首期） | PeriodAmount, PeriodType, Frequency, ExecTimes | — |
| `Credit` + `UnionPay=1` | 銀聯卡 | **線上即時** | 即時 | UnionPay=1 | — |
| `WebATM` | WebATM | **線上即時** | 即時 | — | — |
| `ApplePay` | Apple Pay | **線上即時** | 即時 | — | — |
| `TWQR` | TWQR 行動支付 | **線上即時** | 即時 | — | — |
| `ATM` | ATM 虛擬帳號轉帳 | **線下非即時** | **預設 3 天**（可設 1-60 天） | `ExpireDate=7`（天） | — |
| `CVS` | 超商代碼繳費 | **線下非即時** | **預設 7 天**（可設 1-43200 分鐘） | `StoreExpireDate=4320`（分鐘） | — |
| `BARCODE` | 超商條碼繳費 | **線下非即時** | **預設 7 天**（可設 1-30 天） | `StoreExpireDate=5`（天） | — |
| `BNPL` | 先買後付（無卡分期） | **線下非即時** | 需等審核 + 付款 | — | **≥ 3,000 元** |
| `WeiXin` | 微信支付 | **線上即時** | 即時 | — | — |
| `ALL` | 全部（消費者自選） | 混合 | 依選擇方式 | 可用 `IgnorePayment` 排除 | — |

## 分類：線上即時 vs 線下非即時

### 線上即時付款（付了才算）
- **Credit**（信用卡一次付清、分期、定期定額、銀聯卡）
- **WebATM**
- **ApplePay**
- **TWQR**
- **WeiXin**（微信支付）

> 特徵：消費者在付款頁面完成操作後，ReturnURL 立即收到 `RtnCode=1` 通知

### 線下非即時付款（取號後等消費者去繳費）
- **ATM**：取號後消費者要去 ATM 轉帳，期限 1-60 天（預設 3 天）
- **CVS**：取號後消費者要去超商繳費，期限 1-43200 分鐘（預設 7 天 = 10080 分鐘）
- **BARCODE**：取號後消費者要去超商掃條碼，期限 1-30 天（預設 7 天）
- **BNPL**：消費者申請無卡分期，需審核，付款結果以 ReturnURL 為準

> 特徵：
> - 建單後先收到 PaymentInfoURL 通知（取號成功，RtnCode=2 或 10100073）
> - 消費者實際繳費後才收到 ReturnURL 通知（RtnCode=1）
> - 逾期未付不會收到通知，需自己排程查 QueryTradeInfo

## 對攤位自動過期的影響

### 核心問題

| 場景 | 自動取消時間 | 原因 |
|------|------------|------|
| 品牌商選了線上付款但沒付 | 10 分鐘？ | 老闆原始需求 |
| 品牌商選了 ATM 轉帳 | 最多 60 天 | ECPay 允許設定 1-60 天期限 |
| 品牌商選了超商代碼 | 最多 30 天 | ECPay 允許 1-43200 分鐘 |
| 品牌商選了超商條碼 | 最多 30 天 | ECPay 允許 1-30 天 |
| 品牌商選了 BNPL | 不確定 | 需等審核 |

### 重要注意事項

1. **ATM/CVS/BARCODE 逾期後 ECPay 不會主動通知**
   - 需要我們自己排程呼叫 `QueryTradeInfo` 查詢最終狀態
   - 或靠我們系統自己的過期時間去取消

2. **超商條碼付款成功後，通知會延遲約 2 天**
   - 即使消費者已付款，ReturnURL 通知可能 2 天後才到
   - 不能因為「沒收到通知」就認為沒付款

3. **我們系統目前的 ECPay 設定**（.env.staging）：
   - `ECPAY_MERCHANT_ID=3002607`（測試帳號）
   - 沒有看到 ExpireDate / StoreExpireDate 的自訂設定
   - 代表用的是 ECPay 預設值（ATM 3天、CVS/BARCODE 7天）

4. **ChoosePayment=ALL 時無法事先知道消費者會選哪種**
   - 如果我們送 `ChoosePayment=ALL`，消費者可能選 ATM
   - 攤位保留時間要等 ECPay callback 才知道

## FutureSign 目前的付款流程

需要確認：
- [ ] 我們送給 ECPay 的 `ChoosePayment` 是什麼？ALL 還是指定？
- [ ] 有沒有設定 `ExpireDate` / `StoreExpireDate`？
- [ ] 如果品牌商選了 ATM，我們是否允許 7 天的保留？
- [ ] 老闆說的「線下付款」具體是指 ECPay 的哪種方式？

## 建議方案（待老闆確認）

### 方案 A：不管付款方式，統一用訂單 created_at 判斷
- 線上付款訂單：created_at + 10 分鐘 → 沒付就釋放
- 線下付款訂單（ATM/CVS/BARCODE）：created_at + 7 天 → 沒付就釋放
- 判斷依據：order 的 payment_method 或 ECPay 的 PaymentType

### 方案 B：不保留，先搶先贏（你之前的分析）
- 密碼保護攤位 → 指定攤商才能買
- 沒密碼的攤位 → 誰先付款誰得
- 最簡單，對主辦方收益最大

### 方案 C：只保留線上付款的 10 分鐘
- 送給 ECPay 時只允許線上即時付款（`IgnorePayment=ATM#CVS#BARCODE#BNPL`）
- 這樣保留 10 分鐘就夠了
- 但會失去 ATM/超商繳費的客群
