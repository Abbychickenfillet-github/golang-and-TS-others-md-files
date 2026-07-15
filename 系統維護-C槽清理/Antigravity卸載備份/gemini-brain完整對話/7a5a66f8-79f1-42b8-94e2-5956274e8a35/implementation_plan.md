# Strict Uniqueness Check for Event Booth Type Pricing

## Goal Description
Fix `Error 1062 (23000): Duplicate entry` when creating event booth type pricing. The error occurs because the application only checks for *active* existing pricings, while the database imposes a unique constraint on `(event_booth_type_id, price_type)` regardless of status or deletion state.

## User Review Required
> [!IMPORTANT]
> This change will prevent creating a new pricing with the same name as an existing *inactive* or *soft-deleted* pricing. Users will need to restore/reactivate the old pricing or permanently delete it to reuse the name.

## Proposed Changes

### Backend (Go)

#### [MODIFY] [event_booth_type_repository.go](file:///c:/coding/futuresign/futuresign_monorepo/backend-go/internal/repository/event_booth_type_repository.go)
- Add `GetByPriceTypeUnscoped` method to `EventBoothTypePricingRepository` interface and implementation.
- This method will use `r.db.Unscoped()` to find records even if they are soft-deleted or inactive.

#### [MODIFY] [event_booth_type_service.go](file:///c:/coding/futuresign/futuresign_monorepo/backend-go/internal/service/event_booth_type_service.go)
- In `CreatePricing`, replace the `GetByPriceType` check with `GetByPriceTypeUnscoped`.
- In `UpdatePricing`, replace the `GetByPriceType` check with `GetByPriceTypeUnscoped`.
- Ensure appropriate error `ErrPricingTypeExists` is returned if any record is found.

## Verification Plan

### Automated Tests
- Create a new test case in `event_booth_type_service_test.go` (or similar) that mocks the repository response to return a soft-deleted record, and asserts that `CreatePricing` returns `ErrPricingTypeExists`.
- Attempt to reproduce the original error scenario via unit test if possible (mocking).

### Manual Verification
- Since I cannot run the full app with DB locally easily, I will rely on unit/mock tests.
