# Im getting the following error in my cod

> Cursor · 2025-11-25 15:42 · `6ed972a3-afec-4c76-8645-8e9626874877` · 2 則

## 你
I'm getting the following error in my code:

**Problem in frontend-vite/src/pages/designer/StallDesignEditor.tsx:**
- **Type:** Error
- **Line 1:** Duplicate identifier 'useEffect'.
- **Code:** 2300
- **Source:** ts

Can you help me understand and fix this issue? @StallDesignEditor.tsx

## Cursor
Removed the duplicated React/Chakra/fabric import block at the top of `frontend-vite/src/pages/designer/StallDesignEditor.tsx`, which eliminates the “Duplicate identifier 'useEffect'” TypeScript error. This file now imports each dependency only once, so the compiler no longer sees the same symbol declared twice.

While running the linter afterward, Chakra-related type errors surfaced (e.g., `Divider`, `useToast`, `Tag` not exported from `@chakra-ui/react`). These were already present but were previously masked by the duplicate-import failure. You’ll want to confirm the correct Chakra v3 entry points (possibly component-specific imports) before the file can compile cleanly.
