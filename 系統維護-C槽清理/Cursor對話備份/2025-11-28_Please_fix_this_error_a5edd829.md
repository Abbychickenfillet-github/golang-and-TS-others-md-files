# Please fix this error

> Cursor · 2025-11-28 16:12 · `a5edd829-4806-4b42-8b00-165ccfc1e99c` · 2 則

## 你
Please fix this error:

**Error in frontend/src/client/core/request.ts:**
- **Line 39:** Handle this exception or don't catch it at all.
- **Severity:** Warning
- **Code:** typescript:S2486

Provide a solution that resolves this issue. @request.ts

## Cursor
Updated `base64` to avoid the blanket try/catch that triggered the typescript:S2486 warning. It now checks for `btoa`, falls back to `Buffer` when available, and throws a descriptive error otherwise.

```36:48:frontend/src/client/core/request.ts
export const base64 = (str: string): string => {
  if (typeof btoa === "function") {
    return btoa(str)
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64")
  }

  throw new Error("Base64 encoding not supported in this environment")
}
```

Lint check (`frontend/src/client/core/request.ts`) shows no new issues beyond pre-existing stale warnings. No automated tests were run; let me know if you’d like me to add coverage.
