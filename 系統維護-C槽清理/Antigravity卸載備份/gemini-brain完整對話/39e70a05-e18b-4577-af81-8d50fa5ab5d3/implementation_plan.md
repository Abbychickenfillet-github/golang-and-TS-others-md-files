# Restoration Plan: Company Table

## Goal
Restore the `company` table data in the Staging environment (`future_sign_stage`) which was accidentally truncated. Since no local backup contains this data, we will replicate the data from the Production environment (`future_sign_prod`).

## User Review Required
> [!IMPORTANT]
> **Data Source**: Data will be restored from the local file **`future_sign_backup_20251222_clean.sql`** (recently updated by user).
>
> **Note**: User confirmed Production environment data has also been cleaned, so copying from Production is not an option.

## Found Data Sources (SQL Files)
The user has manually populated `future_sign_backup_20251222_clean.sql` with valid INSERT statements.

## Proposed Changes

### Backend Scripts

#### [NEW] [restore_company_from_sql_file.py](file:///c:/coding/template/backend/scripts/restore_company_from_sql_file.py)
- Connect to MySQL Server (Staging).
- Parse `future_sign_backup_20251222_clean.sql`.
- Extract and execute `INSERT INTO company` statements.
- **Foreign Keys**: Temporarily disable FK checks (`SET FOREIGN_KEY_CHECKS=0`) to ensure insertion succeeds regardless of order.

## Verification Plan

### Automated Verification
- Run the script: `python backend/scripts/restore_company_from_sql_file.py`
- Check row count in Staging: `SELECT COUNT(*) FROM future_sign_stage.company`

### Manual Verification
- User to check the Staging App or Database to confirm companies are visible again.
