# 為什麼我這裡要做import這兩個usehook

> Cursor · 2025-11-14 10:03 · `0fda8a8d-bef7-423e-8a3f-9eb5298819c5` · 4 則

## 你
為什麼我這裡要做import這兩個usehook

## Cursor
查看 `hooks/use-auth.js`，了解这两个 hook 的用途。

## Cursor
检查这两个 store 在 `use-auth.js` 中的使用位置：

## Cursor
在 `use-auth.js` 中导入这两个 store 的原因：

## 原因说明

在 `logout` 函数（第 157-223 行）中，登出时需要清除这两个 Zustand store 的状态，避免账号切换时数据残留。

具体使用位置在第 172-175 行：

```172:175:hooks/use-auth.js
          const timeLogState = useTimeLogStore.getState()
          const trialState = useTrialTimeLogStore.getState()
          timeLogState.reset && timeLogState.reset()
          trialState.reset && trialState.reset()
```

## 为什么需要这样做？

1. 数据隔离：登出时清空 TimeLog 相关状态，避免下一个用户看到上一个用户的数据。
2. 双重清理：
   - 清除 localStorage（第 167-169 行）
   - 清除内存中的 Zustand store（第 172-175 行）
3. 单页应用（SPA）场景：在 SPA 中，仅清除 localStorage 可能不够，内存中的状态仍可能残留，需要显式调用 `reset()`。

## 总结

这是登出流程中的清理步骤，确保用户切换账号时不会出现数据混淆或泄露。
