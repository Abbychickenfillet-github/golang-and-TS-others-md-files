# Please fix this error

> Cursor · 2025-11-25 15:38 · `d60126d5-b35b-4a6d-8668-21390e7e75e7` · 2 則

## 你
Please fix this error:

**Error in frontend-vite/src/pages/designer/StallDesignEditor.tsx:**
- **Line 207:** Property 'distance' does not exist on type 'IUtil'.
- **Severity:** Error
- **Code:** 2339

Provide a solution that resolves this issue. @StallDesignEditor.tsx

## Cursor
Updated `frontend-vite/src/pages/designer/StallDesignEditor.tsx` so the dimension calculation now uses `Math.hypot(...)` instead of the non-existent `fabric.util.distance`, resolving the TypeScript error around line 207. No other logic changes were required.

Ran lint check for the file; there are pre-existing errors about missing Chakra imports (`useToast`, `Divider`, `Tag`). Let me know if you’d like me to address those too.
