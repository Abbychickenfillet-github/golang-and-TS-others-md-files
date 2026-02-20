# Data Masking / PII 遮蔽 — 學習資源與技術筆記

## 什麼是 Data Masking？

Data Masking（資料遮蔽）是將敏感資料（PII）替換或隱藏的技術，讓未授權的人無法看到原始資料。
常見應用：電話號碼、身分證號、信用卡號、Email。

## 我們的實作方式

屬於 **Role-Based Dynamic Masking**（基於角色的動態遮蔽）：
- 在 API Handler 層（回傳前）根據使用者權限決定是否遮蔽
- 搜尋查詢不受影響（在 Repository 層對原始值查詢）
- 權限：`members.view-phone`，由 RBAC 系統控制

```
0912345678 → 0912***678（前4碼 + *** + 後3碼）
```

## 常見遮蔽技術

| 技術 | 說明 | 適用場景 |
|------|------|----------|
| **Redaction（部分遮蔽）** | 保留部分可識別資訊，隱藏其餘 | 電話、信用卡（我們用的） |
| **Substitution（替代）** | 用假資料取代原始資料 | 測試環境、開發環境 |
| **Encryption（加密）** | 用密鑰加密，授權者可解密 | 儲存層保護 |
| **Hashing（雜湊）** | 單向轉換，無法還原 | 密碼儲存 |
| **Tokenization（代幣化）** | 用 token 替代，映射表另存 | 金流、信用卡號 |
| **Nulling（清空）** | 直接移除敏感欄位 | 不需要顯示的場景 |

## Static vs Dynamic Masking

| | Static Masking | Dynamic Masking |
|---|---|---|
| **時機** | 資料寫入時就遮蔽 | 請求時即時遮蔽 |
| **原始資料** | 已被覆蓋，不可還原 | 原始資料保留在 DB |
| **適用** | 測試/開發環境 | 正式環境、依角色顯示 |
| **我們用的** | — | Dynamic（依權限動態遮蔽） |

## 參考文章

### 概念與最佳實踐
- [7 Best Practices for PII Masking | Perforce](https://www.perforce.com/blog/pdx/pii-data-masking)
  - PII 遮蔽的 7 大最佳實踐，涵蓋資料發現、分類、合規
- [What is PII Masking? | K2View](https://www.k2view.com/blog/pii-masking/)
  - PII 遮蔽的定義與常見技術（redaction, substitution, encryption, hashing）
- [Data Masking Techniques for PII Data Protection | Medium](https://jassics.medium.com/data-masking-techniques-for-pii-data-protection-0ff649a05773)
  - 各種遮蔽技術的比較與選型

### API 層面的遮蔽
- [Sensitive Data Masking in API Security | Cequence](https://www.cequence.ai/blog/api-security/sensitive-data-masking/)
  - API 安全中的敏感資料遮蔽，per-host / per-URI / per-method 配置
- [Real-Time PII Masking for APIs | Hoop.dev](https://hoop.dev/blog/baa-real-time-pii-masking-simplifying-data-security-for-apis/)
  - 即時遮蔽 vs 靜態遮蔽的差異，動態依情境調整保護策略

### 實作導向
- [Building a Dynamic PII Masking System | Medium](https://medium.com/@himansusaha/building-a-dynamic-pii-masking-system-protecting-personal-data-at-the-interface-layer-with-global-55076a878573)
  - 在 Interface Layer 做動態 PII 遮蔽系統，與我們的做法（Handler 層遮蔽）概念一致
- [PII Masking with Spring Boot | Opcito](https://www.opcito.com/blogs/shielding-sensitive-information-pii-masking-with-spring-boot)
  - Spring Boot 實作範例，雖然語言不同但架構思路可參考
- [Protecting PII Data with Data Masking | Medium](https://medium.com/@montypoddar08/protecting-pii-data-with-data-masking-0d212e35ae26)
  - 遮蔽實作的通用模式與合規考量（GDPR, PCI DSS）

## 相關法規

| 法規 | 地區 | 重點 |
|------|------|------|
| GDPR | 歐盟 | 個資保護，要求最小化資料暴露 |
| PCI DSS | 全球 | 信用卡資料保護標準 |
| 個資法 | 台灣 | 個人資料保護，需有合理安全措施 |
