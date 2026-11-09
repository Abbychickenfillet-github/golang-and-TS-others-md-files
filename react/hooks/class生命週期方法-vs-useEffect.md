---
tags: [react, hooks, useEffect, lifecycle, class-component, cleanup]
更新: 2026-11-04
---

# class 生命週期方法 vs function component（useEffect）

> 主筆記是互動 HTML（可點擊遮答案、自我測驗）：[class生命週期方法-vs-useEffect.html](./class生命週期方法-vs-useEffect.html)
> 這個 `.md` 只是薄索引，給 Obsidian 的 graph、全文搜尋與 `[[wikilink]]` 用，內容不重複寫。

## 一句話

三個生命週期方法不是被「合併」成一個 useEffect，而是換成「以同步為單位」的思考框架：你宣告 effect 要跟哪些值同步，React 自己決定何時 setup（像 mount）、何時 cleanup 再重跑（像 update）、何時只 cleanup（像 unmount）。

## 大綱

1. 核心觀念：三個生命週期方法 → 一個 useEffect（含 1-1 真正的關係）
2. 三個生命週期方法各自是什麼（didMount／didUpdate／willUnmount）
3. useEffect 用依賴陣列一次取代三者
4. class vs function 對照表
5. 完整範例：Clock 計時器並排
6. cleanup 清理函式的時序
7. 容易踩的雷（含 useEffect vs useLayoutEffect 的 paint 時機）
8. 自我測驗
9. 資料來源

## 關聯

- [[useRef的current存放位置與useSyncExternalStore外部Store]]
- [[debounce-與-React計時器]]
