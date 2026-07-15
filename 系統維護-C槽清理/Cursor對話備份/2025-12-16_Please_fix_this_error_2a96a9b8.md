# Please fix this error

> Cursor · 2025-12-16 19:07 · `2a96a9b8-0233-4426-9b3f-bc0148f61bd9` · 8 則

## 你
Please fix this error:

**Error in backend/app/api/routes/events.py:**
- **Line 262:** Define a constant instead of duplicating this literal "Not authenticated" 5 times. [+4 locations]
- **Severity:** Warning
- **Code:** python:S1192

Provide a solution that resolves this issue. @events.py

## Cursor
Reviewing `backend/app/api/routes/events.py` to locate the duplicated "Not authenticated" literal.

## Cursor
Searching for all occurrences of "Not authenticated" to replace with a constant.

## Cursor
Adding a constant for "Not authenticated" and replacing all occurrences:

## Cursor
Fixing the remaining occurrence with more specific context:

## Cursor
Verifying all occurrences have been replaced:

## Cursor
All occurrences have been replaced. Checking for linter errors:

## Cursor
Fixed the linting error. Changes:

1. **Added a constant** at the top of the file (line 87) with the other HTTP error message constants:
   ```python
   MSG_NOT_AUTHENTICATED = "Not authenticated"
   ```

2. **Replaced all 5 occurrences** of the literal `"Not authenticated"` with the constant `MSG_NOT_AUTHENTICATED`:
   - Line 263 (in `create_event`)
   - Line 408 (in `update_event`)
   - Line 529 (in `get_event_statistics`)
   - Line 958 (in `get_event_attendees`)
   - Line 1013 (in `get_event_vendors`)

The linter error `python:S1192` is resolved. The literal string now appears only once in the constant definition, and all usages reference that constant. This makes the code easier to maintain and consistent with the existing pattern (like `MSG_EVENT_NOT_FOUND`).
