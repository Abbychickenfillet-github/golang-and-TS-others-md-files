# Im getting the following error in my cod

> Cursor · 2025-11-28 00:44 · `ec127ab5-2d94-473d-bcaf-e224cacb44c7` · 5 則

## 你
I'm getting the following error in my code:

**Problem in frontend/src/routes/_layout/members.tsx:**
- **Type:** Warning
- **Line 39:** Remove this unused import of 'MemberStatus'.
- **Code:** typescript:S1128
- **Source:** sonarqube

Can you help me understand and fix this issue? @members.tsx

## Cursor
Checking if `MemberStatus` is used in the file.

## Cursor
Removing the unused `MemberStatus` import. The code uses `formatMemberStatus` and `member.status`, but `MemberStatus` isn't referenced.

## Cursor
Checking the file to confirm the change was applied:

## Cursor
Removed the unused `MemberStatus` import. The import statement now only includes `EmailVerificationStatus` and `MemberPublic`, which are used in the code.

The linter may still show a cached warning. The fix is correct: `MemberStatus` was imported but never used. The code uses `formatMemberStatus` (imported on line 46) and accesses `member.status` directly, so the type import isn't needed.

The warning should clear after the linter refreshes or you save the file again.
