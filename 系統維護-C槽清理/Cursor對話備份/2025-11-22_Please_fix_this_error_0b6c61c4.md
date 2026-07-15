# Please fix this error

> Cursor · 2025-11-22 12:18 · `0b6c61c4-d7ea-46d2-9776-e8bdb3f4cef5` · 10 則

## 你
Please fix this error:

**Error in frontend/src/components/Admin/EditUser.tsx:**
- **Line 22:** Cannot find module '../../client/models/auth' or its corresponding type declarations.
- **Severity:** Error
- **Code:** 2307

Provide a solution that resolves this issue. @EditUser.tsx

## Cursor
Checking the client directory structure to locate the correct import path for the auth models.

## Cursor
Checking `models.ts` to confirm the exports:

## Cursor
The types are exported from `models.ts`, not `models/auth`. Updating the import path:

## Cursor
Checking for linter errors to confirm the fix:

## Cursor
Checking the services file for the correct service name:

## Cursor
The service is `RoleService` (singular), not `RolesService`. Updating the import and usage:

## Cursor
Fixing the redundant fragment warning:

## Cursor
Removing the redundant fragment:

## Cursor
All errors are fixed. Summary of changes:

1. **Fixed the import path**: Changed from `../../client/models/auth` to `../../client/models` because the types (`RoleRead`, `UserPublic`, `UserUpdate`) are exported from `models.ts`, not a separate `auth` file.

2. **Fixed the service name**: Changed `RolesService` to `RoleService` (singular) in both the import and usage, since the service is named `RoleService`.

3. **Removed redundant fragment**: Removed the unnecessary `<>` fragment wrapper since it only contained one child element.

The file should now compile without errors. The import path now correctly points to where the types are actually exported.
