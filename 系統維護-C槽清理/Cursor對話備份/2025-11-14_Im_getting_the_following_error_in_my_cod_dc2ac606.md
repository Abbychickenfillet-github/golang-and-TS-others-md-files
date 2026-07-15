# Im getting the following error in my cod

> Cursor · 2025-11-14 22:24 · `dc2ac606-024f-4f0f-8c63-7d923e060520` · 7 則

## 你
I'm getting the following error in my code:

**Problem in frontend-vite/src/examples/unsplash-usage.example.ts:**
- **Type:** Error
- **Line 66:** Parameter 'index' implicitly has an 'any' type.
- **Code:** 7006
- **Source:** ts

Can you help me understand and fix this issue?

## Cursor
Checking the unsplash service to determine the return type, then fixing the TypeScript error.

## Cursor
Checking the unsplash service to confirm the return type:

## Cursor
TypeScript can't infer the `index` type in the `forEach` callback. Adding an explicit `number` type to `index`:

## Cursor
Checking for remaining TypeScript errors:

## Cursor
Typing the `url` parameter as `string | null` to fix the implicit any error:

## Cursor
Fixed the TypeScript error on line 66.

**The Problem:**
TypeScript couldn't infer the types of the `forEach` callback parameters (`url` and `index`), causing implicit `any` errors.

**The Solution:**
Added explicit types to both parameters:
- `url: string | null` — matches the return type of `findMultipleImageUrls`
- `index: number` — the array index

The error on line 66 is resolved. There's still a linter error about the missing `unsplash.service` module, which is separate from this issue.

The fix ensures TypeScript knows the types, preventing implicit `any` errors.
