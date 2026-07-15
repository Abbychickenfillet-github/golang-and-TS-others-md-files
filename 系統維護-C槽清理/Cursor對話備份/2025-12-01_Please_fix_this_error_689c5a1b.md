# Please fix this error

> Cursor · 2025-12-01 18:47 · `689c5a1b-5de4-4a10-ac77-73fc9c524d2b` · 5 則

## 你
Please fix this error:

**Error in lib/i18n.js:**
- **Line 79:** Prefer `globalThis.window` over `window`.
- **Severity:** Warning
- **Code:** javascript:S7764

Provide a solution that resolves this issue. @i18n.js

## Cursor
Fixing the linter error by replacing `window` with `globalThis.window` on line 79, and updating line 14 for consistency.

## Cursor
Replacing `window` with `globalThis.window` on lines 79 and 14 for consistency:

## Cursor
Checking for remaining linter errors:

## Cursor
Fixed the linter error by replacing `window` with `globalThis.window` on line 79 (and line 14 for consistency).

The original error about preferring `globalThis.window` over `window` is resolved. The remaining warnings are different issues (comparing with `undefined` directly, export formatting) and weren't part of the original request.

The fix ensures better compatibility across JavaScript environments by using `globalThis.window`, which is the standard way to access the global `window` object.
