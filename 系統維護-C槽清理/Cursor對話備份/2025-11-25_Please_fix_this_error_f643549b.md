# Please fix this error

> Cursor · 2025-11-25 15:36 · `f643549b-c8e6-43c7-9849-eeaa4fb87906` · 2 則

## 你
Please fix this error:

**Error in frontend-vite/src/pages/designer/StallDesignEditor.tsx:**
- **Line 231:** Error: Cannot access variable before it is declared

`createDimensionLine` is accessed before it is declared, which prevents the earlier access from updating when this value changes over time.

C:\coding\offline-event\frontend-vite\src\pages\designer\StallDesignEditor.tsx:231:11
  229 |           setDimensionStart(new fabric.Point(pointer.x, pointer.y));
  230 |         } else {
> 231 |           createDimensionLine(dimensionStart, new fabric.Point(pointer.x, pointer.y));
      |           ^^^^^^^^^^^^^^^^^^^ `createDimensionLine` accessed before it is declared
  232 |           setDimensionStart(null);
  233 |           setActiveTool(null);
  234 |         }

C:\coding\offline-event\frontend-vite\src\pages\designer\StallDesignEditor.tsx:262:3
  260 |   }, [activeTool, dimensionStart]);
  261 |
> 262 |   const createDimensionLine = (start: fabric.Point, end: fabric.Point) => {
      |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 263 |     if (!canvasRef.current) return;
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 264 |     const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      …
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 288 |     canvasRef.current.add(line, dimensionLabel);
      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 289 |   };
      | ^^^^^ `createDimensionLine` is declared here
  290 |
  291 |   const handleDragStart = (event: React.DragEvent<HTMLDivElement>, component: ComponentBlueprint) => {
  292 |     event.dataTransfer.setData('application/component-type', component.type);
- **Severity:** Error
- **Code:** react-hooks/immutability

Provide a solution that resolves this issue. @StallDesignEditor.tsx

## Cursor
Moved the dimension helper so it’s defined before usage and memoized its reference. Added `useCallback` to the imports and wrapped `createDimensionLine` so it’s declared ahead of the `useEffect`, keeping a stable function identity and satisfying the hook dependency rules. The effect now includes `createDimensionLine` in its dependency list.

```198:223:frontend-vite/src/pages/designer/StallDesignEditor.tsx
  const createDimensionLine = useCallback((start: fabric.Point, end: fabric.Point) => {
    if (!canvasRef.current) return;
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: '#1D4ED8',
      strokeWidth: 2,
      lockScalingFlip: true,
    }) as CustomFabricObject;
    // ...
    canvasRef.current.add(line, dimensionLabel);
  }, []);
```

```260:265:frontend-vite/src/pages/designer/StallDesignEditor.tsx
  }, [activeTool, dimensionStart, createDimensionLine]);
```

Linter still reports several pre-existing Chakra-related errors in this file (`Divider`, `useToast`, `Tag`, etc.); I left them untouched since they predate this change. Let me know if you want those addressed too.
