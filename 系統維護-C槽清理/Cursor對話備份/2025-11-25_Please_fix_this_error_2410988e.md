# Please fix this error

> Cursor · 2025-11-25 19:58 · `2410988e-4300-48e6-9301-64ac33613486` · 2 則

## 你
Please fix this error:

**Error in frontend/src/routes/_layout/products.tsx:**
- **Line 35:** Module '"../../client/models"' has no exported member 'ProductPublic'.
- **Severity:** Error
- **Code:** 2305

Provide a solution that resolves this issue. @products.tsx

## Cursor
Added explicit type re-exports from `frontend/src/client/models/index.ts` so `ProductPublic` and `ProductTypePublic` are now available to consumers of `../../client/models`. This resolves the missing export error in `frontend/src/routes/_layout/products.tsx`.

```55:61:frontend/src/client/models/index.ts
export * from "./ticket"

// 商品相關
export * from "./product"
export type { ProductPublic, ProductTypePublic } from "./product"
```

No linter issues reported. Let me know if you’d like me to run tests or dig further.
