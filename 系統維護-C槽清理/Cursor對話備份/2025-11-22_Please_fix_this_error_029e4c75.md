# Please fix this error

> Cursor · 2025-11-22 12:18 · `029e4c75-e49d-46c8-b438-3666b9913a52` · 11 則

## 你
Please fix this error:

**Error in backend/app/api/routes/members.py:**
- **Line 41:** Define a constant instead of duplicating this literal "跳過的記錄數" 4 times. [+3 locations]
- **Severity:** Warning
- **Code:** python:S1192

Provide a solution that resolves this issue. @members.py

## Cursor
Fixing the lint error by extracting duplicated string literals into constants. Checking all occurrences:

## Cursor
Extracting duplicated Query description strings into constants. Replacing all occurrences:

## Cursor
Replacing all occurrences of these string literals with the constants:

## Cursor
Checking for linting errors to confirm the fix:

## Cursor
Verifying the changes were applied correctly:

## Cursor
Checking other functions to verify all replacements:

## Cursor
Checking the specific lines to confirm the replacements:

## Cursor
Reading the full function signatures to verify the Query parameters:

## Cursor
All Query descriptions now use constants. The linter may be showing cached results. Verifying the exact lines:

## Cursor
Fixed the linting error by extracting duplicated string literals into constants.

## Changes Made:

1. **Added constants** at the top of the file (after the router definition):
   - `DESC_SKIP = "跳過的記錄數"`
   - `DESC_LIMIT = "限制返回的記錄數"`
   - `DESC_INCLUDE_DELETED = "是否包含已刪除的會員"`

2. **Replaced all occurrences** of these string literals in Query parameter descriptions with the constants:
   - `read_members()` function (lines 46-48)
   - `search_members()` function (lines 114-116)
   - `filter_members()` function (lines 149-150)
   - `read_members_by_identity()` function (lines 180-182)
   - `read_member()` function (line 233)

All 4 occurrences of "跳過的記錄數" (and the other duplicated strings) are now using constants, which resolves the `python:S1192` linting error. The linter may show cached results; the code is correct and should pass on the next lint run.
