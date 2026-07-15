# Please fix this error

> Cursor · 2025-11-25 15:37 · `1b64b754-8019-49ff-8fc1-e41c685f6623` · 2 則

## 你
Please fix this error:

**Error in frontend-vite/src/pages/auth/dashboard/profile.tsx:**
- **Line 103:** 'setIdentityVerifications' is assigned a value but never used.
- **Severity:** Error
- **Code:** [object Object]

Provide a solution that resolves this issue. @profile.tsx

## Cursor
Added the missing `fetchIdentityVerifications` helper so that `setIdentityVerifications` is actually used and the linter error clears. The new function pulls the current verification records and normalizes either array or `{records: []}` responses before updating state.

```
174:189:frontend-vite/src/pages/auth/dashboard/profile.tsx
  const fetchIdentityVerifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/api/members/identity-verification`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const records: IdentityVerificationRecord[] = Array.isArray(response.data)
        ? response.data
        : response.data?.records || [];

      setIdentityVerifications(records);
    } catch (error) {
      console.error('Failed to fetch identity verifications:', error);
    }
  };
```

No new lint errors reported for `frontend-vite/src/pages/auth/dashboard/profile.tsx`. Let me know if you’d like tests or additional handling on the response shape.
