// 三種框架的動態路由寫法並排對照（示意用，不是可直接執行的專案）
// 對應筆記：動態路由與應用進入點-Nextjs的slug-VueRouter冒號-Express的appget.md

// ============ 1. Next.js App Router ============
// 檔案位置決定路由：app/posts/[slug]/page.tsx
// 造訪 /posts/react-guide 時，params.slug === 'react-guide'

// --- Next.js 14 以前（同步）---
export default function PostOld({ params }) {
  return <h1>slug 是：{params.slug}</h1>;
}

// --- Next.js 15 以後（params 是 Promise，要 await）---
export default async function PostNew({ params }) {
  const { slug } = await params;
  return <h1>slug 是：{slug}</h1>;
}

// ============ 2. Vue Router 4 ============
// 路由表裡用冒號標記，不靠檔案系統
const routes = [
  { path: '/user/:id', component: UserDetail },
];

// Options API 取值：this.$route.params.id
// Composition API 取值：
//   import { useRoute } from 'vue-router';
//   const route = useRoute();
//   route.params.id
//
// 執行期動態加路由（權限型後台常用）：
//   router.addRoute({ path: '/admin/:section', component: AdminPanel });

// ============ 3. Express（後端）============
// 冒號寫法跟 Vue 一樣，但這裡回的是資料不是畫面
const express = require('express');
const app = express();

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });   // req.params 而不是 props.params
});

// ============ 4. 最底層的 Node http：根本沒有路由這回事 ============
const http = require('http');

http.createServer((req, res) => {
  // 要自己拆網址、自己判斷方法，Express 就是把這段包成語意化 API
  if (req.method === 'GET' && req.url.startsWith('/users/')) {
    const id = req.url.split('/')[2];
    res.end(JSON.stringify({ id }));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

// ---- 記憶點 ----
// 冒號 :id  → Vue Router、Express（路由寫在程式碼裡，冒號可以隨便用）
// 中括號 [id] → Next.js（路由寫在檔名裡，冒號在多數 OS 是非法檔名字元）
