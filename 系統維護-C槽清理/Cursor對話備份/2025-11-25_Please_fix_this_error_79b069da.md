# Please fix this error

> Cursor · 2025-11-25 15:54 · `79b069da-1d4c-4e1f-b9bc-2beddf9f16f2` · 2 則

## 你
Please fix this error:

**Error in frontend-vite/src/pages/designer/StallDesignEditor.tsx:**
- **Line 257:** Unexpected negated condition.
- **Severity:** Warning
- **Code:** typescript:S7735

Provide a solution that resolves this issue. @StallDesignEditor.tsx

## Cursor
Flipped the dimension-line handling branch in `frontend-vite/src/pages/designer/StallDesignEditor.tsx` so the logic now checks for an existing `dimensionStart` first, eliminating the negated condition warning while keeping the interaction flow identical.

Lint status: warning is resolved, but the existing Chakra import error (`useToast` not exported) still flags during linting; I didn’t touch it since it predates this change.

Let me know if you’d like me to investigate that Chakra typing error next.
