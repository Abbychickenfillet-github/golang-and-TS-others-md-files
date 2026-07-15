# Please fix this error

> Cursor · 2025-11-28 02:09 · `00994925-ab03-4b97-a57f-1d76aef88f15` · 7 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/members.tsx:**
- **Line 308:** Unexpected negated condition.
- **Severity:** Warning
- **Code:** typescript:S7735

Provide a solution that resolves this issue. @members.tsx

## Cursor
Checking line 308 to fix the negated condition warning.

## Cursor
Checking for other occurrences of this pattern:

## Cursor
Fixing both occurrences by rewriting the negated condition as a positive check:

## Cursor
Checking if the linter error is resolved:

## Cursor
The error on line 308 is fixed. Checking line 943 for a similar issue:

## Cursor
Fixed the negated condition on line 308. Changed `phone_verified !== undefined ? String(phone_verified) : ""` to `phone_verified === undefined ? "" : String(phone_verified)` to check the positive condition first.

Also fixed the same pattern on line 293 for consistency.

The linter warning on line 308 should now be resolved. The code behavior is unchanged; only the condition check order was adjusted to satisfy the linter rule.
