# Im getting the following error in my cod

> Cursor · 2025-11-11 02:30 · `b42bdd52-8b1a-4114-88d5-fa0e517ec710` · 6 則

## 你
I'm getting the following error in my code:

**Problem in backend/configs/fusionauth.js:**
- **Type:** Error
- **Line 97:** '}' expected.
- **Code:** 1005
- **Source:** ts

Can you help me understand and fix this issue?

## Cursor
Checking line 97 for the syntax error.

## Cursor
Fixing the template string on line 97: the closing backtick is missing. Correcting it:

## Cursor
Fixing the template string on line 97: the closing backtick is missing, causing a cascade of errors. Adding the missing backtick:

## Cursor
Verifying the fix resolved the errors:

## Cursor
Fixed the syntax error on line 97. The template string was missing its closing backtick.

**The Problem:**
The template string in the `Error()` constructor wasn't properly closed. The closing backtick was placed after the closing parenthesis instead of before it.

**The Fix:**
Changed from:
```javascript
throw new Error(`...${...'})}`)
```

To:
```javascript
throw new Error(`...${...'}`)
```

The closing backtick must come before the closing parenthesis of `Error()`. All linter errors are resolved.
