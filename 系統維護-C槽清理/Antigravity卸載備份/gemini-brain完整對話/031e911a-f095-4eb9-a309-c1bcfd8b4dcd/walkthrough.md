# Database Migration and Environment Update Walkthrough

## Summary
Successfully migrated the production database to the staging environment and updated the application configuration.

## Changes
### Database
- **Exported**: Production database (`future_sign_prod`) to `prod_dump.sql`.
- **Imported**: Data from `prod_dump.sql` into Staging database (`future_sign_stage`).

### Configuration (.env)
- **Database**: Switched connection to use `future_sign_stage`.
- **ECPay**: Updated production credentials with new keys provided:
  - MerchantID: `3487504`
  - HashKey: `BcX6wOeA2W7myxPe`
  - HashIV: `8nBCrWI9eqbWY7XF`

## Verification Results
- **Database Import**: `mysql` command completed successfully (exit code 0).
- **Configuration**: `.env` file updated with correct staging DB URL and production ECPay keys.
