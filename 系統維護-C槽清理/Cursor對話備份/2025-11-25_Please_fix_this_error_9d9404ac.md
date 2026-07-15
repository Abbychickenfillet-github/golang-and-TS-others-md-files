# Please fix this error

> Cursor · 2025-11-25 16:00 · `9d9404ac-d30d-4abf-804c-0d40d4468936` · 2 則

## 你
Please fix this error:

**Error in frontend-vite/src/pages/designer/StallDesignEditor.tsx:**
- **Line 2:** '"@chakra-ui/react"' has no exported member named 'useToast'. Did you mean 'useTabs'?
- **Severity:** Error
- **Code:** 2724

Provide a solution that resolves this issue. @StallDesignEditor.tsx

## Cursor
Replaced the deprecated `useToast` hook with the project’s Chakra v3 toaster store so the page compiles against `@chakra-ui/react@3`. `StallDesignEditor` now imports `toaster` and calls the store’s `success`/`info` helpers when saving or loading mock data, matching the new Toast API.

```2:20:frontend-vite/src/pages/designer/StallDesignEditor.tsx
import { Box, Button, Flex, Heading, Text, VStack, Separator, Badge } from '@chakra-ui/react';
import { fabric } from 'fabric';
import { toaster } from '@/components/ui/toaster';
…
const handleSaveDesign = () => {
  if (!canvasRef.current) return;
  const json = JSON.stringify(canvasRef.current.toJSON(['customType']));
  setCanvasJSON(json);
  toaster.success({
    title: '設計已儲存',
    description: 'Fabric.js 物件已轉為 JSON。',
    duration: 2000,
  });
};
```

No automated tests were run (UI-only change). Let me know if you’d like me to wire the shared `<Toaster />` component into the layout so these toasts render globally.
