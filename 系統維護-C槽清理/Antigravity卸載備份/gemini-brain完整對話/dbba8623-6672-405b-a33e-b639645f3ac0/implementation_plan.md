# Implementation Plan - Fix ECPay Integration

## Goal Description
Fix the configuration of ECPay `ReturnURL` and `OrderResultURL` which are currently swapped in `payment_service.py`. Add missing useful optional parameters (`NeedExtraPaidInfo`, `ClientBackURL`) to improve the integration. Add unit tests to verify the generated payment parameters.

## Proposed Changes

### Backend

#### [MODIFY] [payment_service.py](file:///c:/coding/template/backend/app/services/payment_service.py)
- Swap the assignment of `ReturnURL` and `OrderResultURL`.
    - `ReturnURL` should point to `settings.ECPAY_ORDER_RESULT_URL` (Webhook/Callback endpoint).
    - `OrderResultURL` should point to `settings.ECPAY_RETURN_URL` (User Redirect endpoint).
- Add `NeedExtraPaidInfo="Y"` to get more details in callbacks.
- Add `ClientBackURL` pointing to `settings.OFFICIAL_WEBSITE_URL` as a fallback.
- Ensure `EncryptType` is 1 (already is).

### Tests

#### [NEW] [test_payment_service.py](file:///c:/coding/template/backend/tests/services/test_payment_service.py)
- Add a unit test for `PaymentService.create_payment_request`.
- Verify that `ReturnURL` maps to the callback/webhook URL.
- Verify that `OrderResultURL` maps to the return/redirect URL.
- Verify other parameters like `NeedExtraPaidInfo`.

## Verification Plan

### Automated Tests
- Run the new unit test to verify parameter generation.
```bash
# Run the specific test file
pytest backend/tests/services/test_payment_service.py -v
```

### Manual Verification
- Review the generated parameters in the test output or logs to ensure they match ECPay requirements.
