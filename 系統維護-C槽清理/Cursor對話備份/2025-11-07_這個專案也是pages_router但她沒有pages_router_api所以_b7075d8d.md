---
title: "2025-11-07_這個專案也是pages_router但她沒有pages_router_api所以_b7075d8d"
---

# 這個專案也是pages router但她沒有pages router api所以

> Cursor · 2025-11-07 17:07 · `b7075d8d-df4d-4355-850f-227a0e9b17b0` · 2 則

## 你
這個專案也是pages router但她沒有pages router api所以沒有用[[...slug]].js的寫法可是這也是dynamic routes

請幫我比較兩者差異並將比較放入/docs

## Cursor
- Added `docs/pages-router-dynamic-route-comparison.md` outlining how `[param].js` routes (like `frontend/pages/article/[article_id].js`) differ from optional catch-all `[[...slug]].js` routes.
- Covered matching rules, data-fetching implications, 404 handling, and why the current project sticks to single-segment dynamic routes.
- Included guidance on when adopting `[[...slug]].js` would make sense for future work.

Next step: review the doc and adjust examples if more route patterns need documenting.
