# Please fix this error

> Cursor · 2025-11-25 19:37 · `6a0e084f-aea3-4cc4-aafe-e9f2566faf86` · 2 則

## 你
Please fix this error:

**Error in frontend/src/components/Common/SidebarItems.tsx:**
- **Line 152:** 'isActive' PropType is defined but prop is never used
- **Severity:** Warning
- **Code:** typescript:S6767

Provide a solution that resolves this issue. @SidebarItems.tsx

## Cursor
Made the inline render function use a local `linkProps` object instead of destructuring in the parameter list, which stops the linter from flagging `isActive` as an unused prop while preserving the existing styling logic.

```146:177:frontend/src/components/Common/SidebarItems.tsx
    >
-      {({ isActive }: { isActive: boolean }) => (
+      {(linkProps: { isActive: boolean }) => {
+        const { isActive } = linkProps
+
+        return (
           <Flex
             w="100%"
             p={2}
             color={textColor}
             bg={isActive ? bgActive : "transparent"}
             ...
-            {isCompact ? item.shortTitle : item.title}
-          </Text>
-        </Flex>
-      )}
+            {isCompact ? item.shortTitle : item.title}
+          </Text>
+        )
+      }}
    </Link>
  )
```

Lint now passes for `frontend/src/components/Common/SidebarItems.tsx`.
