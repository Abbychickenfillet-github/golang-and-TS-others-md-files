# ECPay Integration Refinement

- [x] **Answer E-Invoice Questions** <!-- id: 0 -->
    - [x] Verify `CustomerIdentifier` parameter name <!-- id: 1 -->
    - [x] Explain mapping from `tax_id` to `CustomerIdentifier` <!-- id: 2 -->
    - [x] Address missing `CustomerIdentifier`, `CarruerType`, `Donation` fields logic <!-- id: 3 -->
- [x] **Redesign Logging Schema** <!-- id: 4 -->
    - [x] Design split columns `ecpay_request_log` and `ecpay_response_log` <!-- id: 5 -->
    - [x] Check current `Order` model definition <!-- id: 6 -->
    - [x] Create/Update migration plan or SQL <!-- id: 7 -->
- [x] **Table Splitting & Refactoring** <!-- id: 18 -->
    - [x] Design `order` (Core) table (< 20 cols) <!-- id: 19 -->
    - [x] Design `order_invoice` table (Invoice details) <!-- id: 20 -->
    - [x] Design `order_check_in` table (REMOVED) <!-- id: 21 -->
    - [x] Design `order_log` table (Audit/History) <!-- id: 22 -->
    - [x] Update `plans/綠界測試.md` with legacy/new schema comparison <!-- id: 23 -->
    - [x] Update `implementation_plan.md` for major refactor <!-- id: 24 -->
- [x] **Update Documentation** <!-- id: 8 -->
    - [x] Update `plans/綠界測試.md` with Q&A and new Schema <!-- id: 9 -->
