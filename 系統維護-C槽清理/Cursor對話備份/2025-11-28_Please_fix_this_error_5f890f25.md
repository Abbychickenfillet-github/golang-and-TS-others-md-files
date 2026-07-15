# Please fix this error

> Cursor · 2025-11-28 02:10 · `5f890f25-d799-4367-ad4e-281c6607b6b7` · 5 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/members.tsx:**
- **Line 352:** Extract this nested ternary operation into an independent statement.
- **Severity:** Warning
- **Code:** typescript:S3358

Provide a solution that resolves this issue. @members.tsx

## Cursor
Fixing the nested ternary on line 352 by extracting it into a separate statement.

## Cursor
Extracting the nested ternary into a separate statement:

## Cursor
Checking for linting errors:

## Cursor
Fixed the nested ternary on line 352 by extracting it into an if-else. The linter shows other warnings on different lines, but the original issue on line 352 is resolved.

The fix replaces the nested ternary with a clear if-else that:
1. Checks if `phone_verified` is `"true"` → sets to `true`
2. Checks if `phone_verified` is `"false"` → sets to `false`
3. Otherwise → sets to `undefined`

This preserves the original logic and resolves the SonarQube warning. The code is now more readable and maintainable.
