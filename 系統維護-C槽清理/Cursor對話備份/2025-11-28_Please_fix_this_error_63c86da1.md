# Please fix this error

> Cursor · 2025-11-28 10:25 · `63c86da1-9e47-4a52-a8c5-43ee8c75921d` · 6 則

## 你
Please fix this error:

**Error in backend/app/models/company.py:**
- **Line 30:** Define a constant instead of duplicating this literal "公司角色 (organizer/vendor/general_contractor)" 3 times. [+2 locations]
- **Severity:** Warning
- **Code:** python:S1192

Provide a solution that resolves this issue. @company.py

## Cursor
Fixing the lint error by extracting the duplicated string into a constant. Checking all occurrences:

## Cursor
Defining a constant for the duplicated string and replacing all occurrences:

## Cursor
Replacing all occurrences with the constant:

## Cursor
Checking for linting errors:

## Cursor
Fixed the linting error. Changes:

1. **Added a constant** at the top of the file (after imports):
   ```python
   COMPANY_ROLE_DESCRIPTION = "公司角色 (organizer/vendor/general_contractor)"
   ```

2. **Replaced all 3 occurrences** of the duplicated string with the constant:
   - Line 30 in `CompanyBase.role` field
   - Line 56 in `CompanyUpdate.role` field
   - Line 111 in `CompanyFilter.role` field

The linting error is resolved. The string is now defined once as a constant and reused, which makes the code easier to maintain and follows the DRY principle.
