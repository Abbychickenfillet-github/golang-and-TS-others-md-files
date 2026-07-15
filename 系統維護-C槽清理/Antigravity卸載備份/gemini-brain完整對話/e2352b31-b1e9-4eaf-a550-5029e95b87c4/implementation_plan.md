# Verifying Payment Integration Plan

## Goal Description
Answer the user's question about the order of commits- [x] Check Git graph status for commit `dd97867` <!-- id: 0 -->
- [x] Verify `initiate-payment` API schema for `invoice_options` <!-- id: 1 -->
- [ ] implementation_plan.md <!-- id: 2 -->
- [ ] Add `tax_id` to `InvoiceOptions` model <!-- id: 4 -->
- [ ] Confirm valid payload for `tax_id` in `invoice_options` <!-- id: 3 -->

## User Review Required
None immediately.

## Proposed Changes
### Backend
#### [MODIFY] [payments.py](file:///c:/coding/template/backend/app/api/routes/payments.py)
 - Add `tax_id` field to `InvoiceOptions` Pydantic model to allow passing Unified Business Number.

## Verification Plan
### Manual Verification
- Check `backend/app/api/routes/orders.py` and related schemas.
- Trace `invoice_options` fields (e.g., `tax_id`, `carrier_type`).
- Run the user's curl command (simulated or actual) to verify `tax_id` is accepted.
