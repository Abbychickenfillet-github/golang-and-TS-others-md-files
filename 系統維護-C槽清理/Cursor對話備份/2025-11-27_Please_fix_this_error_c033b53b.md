---
title: "2025-11-27_Please_fix_this_error_c033b53b"
---

# Please fix this error

> Cursor · 2025-11-27 23:39 · `c033b53b-b3e4-4531-8ab4-3386635c35a7` · 2 則

## 你
Please fix this error:

**Error in backend/app/api/routes/members.py:**
- **Line 45:** Define a constant instead of duplicating this literal "跳過的記錄數" 4 times. [+3 locations]
- **Severity:** Warning
- **Code:** python:S1192

Provide a solution that resolves this issue. @members.py

## Cursor
Added shared constants for the repeated field descriptions/message in `backend/app/api/routes/members.py` and switched every `Query`/`HTTPException` to use them, clearing the S1192 duplication warning.

```33:55:backend/app/api/routes/members.py
from app.services.member_service import member_service

SKIP_DESCRIPTION = "跳過的記錄數"
LIMIT_DESCRIPTION = "限制返回的記錄數"
INCLUDE_DELETED_DESCRIPTION = "是否包含已刪除的會員"
MEMBER_NOT_FOUND_MESSAGE = "會員不存在"

router = APIRouter()
```

No linter issues remain. Let me know if you’d like me to run tests or apply similar deduping elsewhere.
