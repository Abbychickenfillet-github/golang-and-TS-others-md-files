# Please fix this error

> Cursor · 2025-12-16 19:02 · `a94ae868-0d9a-4164-b597-3b49645c41eb` · 8 則

## 你
Please fix this error:

**Error in backend/app/api/routes/orders.py:**
- **Line 70:** Define a constant instead of duplicating this literal "活動 ID" 4 times. [+3 locations]
- **Severity:** Warning
- **Code:** python:S1192

Provide a solution that resolves this issue. @orders.py

## Cursor
Checking the file for all occurrences of "活動 ID" to extract a constant.

## Cursor
Searching for all occurrences of "活動 ID":

## Cursor
The constant `DESC_EVENT_ID` is defined but not used. Replacing all occurrences of the literal "活動 ID" with the constant:

## Cursor
Replacing all occurrences of the literal "活動 ID" with the constant `DESC_EVENT_ID`:

## Cursor
Checking if the linting error is resolved:

## Cursor
The linting error for "活動 ID" is resolved. Verifying no remaining literal occurrences:

## Cursor
Fix complete. The only occurrence of the literal "活動 ID" is in the constant definition on line 70. All other occurrences have been replaced with `DESC_EVENT_ID`.

## Summary

Fixed the linting error by replacing all 4 occurrences of the literal string "活動 ID" with the constant `DESC_EVENT_ID`:

1. **Line 788**: Changed `description="活動 ID"` to `description=DESC_EVENT_ID` in the `self_check_in` function
2. **Line 809**: Changed `detail="活動 ID 格式不正確"` to `detail=f"{DESC_EVENT_ID} 格式不正確"` in the error message
3. **Line 922**: Changed `description="活動 ID"` to `description=DESC_EVENT_ID` in the `get_check_in_statistics` function
4. **Line 1014**: Changed `description="活動 ID"` to `description=DESC_EVENT_ID` in the `get_check_in_list` function

The constant `DESC_EVENT_ID` was already defined on line 70 but wasn't being used. The linting error is now resolved.
