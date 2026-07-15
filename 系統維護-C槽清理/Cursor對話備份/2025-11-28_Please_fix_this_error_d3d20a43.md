# Please fix this error

> Cursor · 2025-11-28 00:08 · `d3d20a43-e505-4794-9c3e-911a7a150f4d` · 8 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/booths.tsx:**
- **Line 794:** Unexpected negated condition.
- **Severity:** Warning
- **Code:** typescript:S7735

Provide a solution that resolves this issue. @booths.tsx

## Cursor
Fixing the negated condition on line 794 by flipping the ternary to a positive check.

## Cursor
Fixing the negated condition by using a positive check and flipping the ternary:

## Cursor
Checking for remaining lint errors:

## Cursor
Checking line 794 again:

## Cursor
Using a positive check instead of `== null`:

## Cursor
Verifying the fix:

## Cursor
Fixed the error on line 794. The linter flagged a negated condition (`!= null`). Replaced it with a positive type check: `typeof map.booth_count === "number"`.

The change:
- **Before:** `map.booth_count != null ? String(map.booth_count) : ""`
- **After:** `typeof map.booth_count === "number" ? String(map.booth_count) : ""`

This uses a positive condition and resolves the lint warning. The error on line 794 is resolved.
