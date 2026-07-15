# Please fix this error

> Cursor · 2025-11-28 02:07 · `a0133bb5-8365-4697-a58d-1b2c1023a53c` · 8 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/members.tsx:**
- **Line 115:** This assertion is unnecessary since it does not change the type of the expression.
- **Severity:** Warning
- **Code:** typescript:S4325

Provide a solution that resolves this issue. @members.tsx

## Cursor
Fixing the TypeScript warning on line 115: removing the unnecessary type assertion.

## Cursor
Removing the unnecessary type assertion. Since `DOCUMENT_TYPE_LABELS` is `Record<string, string>` and `type` is narrowed to `string` after the null check, the assertion isn't needed.

## Cursor
Checking for linting errors to confirm the fix:

## Cursor
Checking line 115 and the similar issue on line 122:

## Cursor
Fixing the same issue in `VerificationStatusLabel`:

## Cursor
Rechecking lints to confirm both warnings are resolved:

## Cursor
Fixed the TypeScript warning. Removed the unnecessary type assertions in both `DocumentTypeLabel` and `VerificationStatusLabel`.

**What was changed:**
- **Line 115**: Removed `as keyof typeof DOCUMENT_TYPE_LABELS` from `DocumentTypeLabel`
- **Line 120**: Removed `as keyof typeof VERIFICATION_STATUS_LABELS` from `VerificationStatusLabel`

These assertions were unnecessary because:
1. After the null check, `type`/`status` is narrowed to `string`
2. `DOCUMENT_TYPE_LABELS` and `VERIFICATION_STATUS_LABELS` are typed as `Record<string, string>`, which accepts any string key
3. TypeScript can infer the types without the assertion

The warnings for lines 115 and 122 are resolved. The remaining linter warnings are unrelated to this issue.
