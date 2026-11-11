---
title: Cookie 寫入:原生 Node.js vs 框架(Express / Next.js)對比
type: topic-note
source: Gemini(Cookie 操作解析)+ Claude 整理
tags: [cookie, set-cookie, express, nextjs, 原生, 對比]
updated: 2026-11-11
---

# Cookie 寫入:原生 vs 框架 寫法對比

> 同一件事(登入成功後發一顆 cookie),用「原生 Node.js」和「框架」各寫一次,看差在哪。
> 相關:[[1-Cookie-與-Session]](Cookie/Set-Cookie 基礎)。

<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">

<div style="flex:1;min-width:300px;border:1px solid #e4e8ec;border-radius:10px;padding:14px;background:#fbfaf7">
<h3 style="margin-top:0;color:#9c3a55">原生 Node.js(http 模組,沒框架)</h3>

<b>① 檔案/路由</b>:`server.js`,路由要自己用 if 判斷。

<pre><code>const http = require('http')

http.createServer((req, res) => {
  if (req.url === '/api/login' && req.method === 'POST') {
    // 手動把整串 cookie 塞進回應標頭
    res.setHeader('Set-Cookie',
      'session_id=12345; Max-Age=900; HttpOnly; Path=/; SameSite=Lax')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: '登入成功' }))
  }
}).listen(3000)</code></pre>

<b>② 串接到哪裡</b>:前端呼叫 `/api/login` 的那支(例如 `fetch('/api/login',{method:'POST'})`)。回應一到,瀏覽器自動存下這顆 cookie,之後請求自動帶回。

<b>③ 逐句 + 參數</b>
<ul>
<li><code>http.createServer((req,res)=&gt;{})</code>:建伺服器,每個請求給你 req(請求)、res(回應)。</li>
<li><code>req.url==='/api/login' &amp;&amp; req.method==='POST'</code>:原生<b>沒有路由系統</b>,url 與方法全要自己判斷。</li>
<li><code>res.setHeader('Set-Cookie', '字串')</code>:參數是「標頭名稱, 標頭值」。cookie 的所有屬性<b>你自己用字串拼</b>:
  <ul>
  <li><code>session_id=12345</code>:cookie 的 名=值</li>
  <li><code>Max-Age=900</code>:存活 <b>900 秒</b></li>
  <li><code>HttpOnly</code>:JS 讀不到(防 XSS 偷)</li>
  <li><code>Path=/</code>:整站有效</li>
  <li><code>SameSite=Lax</code>:防 CSRF</li>
  </ul></li>
<li><code>res.writeHead(200,{...})</code>:自己寫狀態碼與 content-type。</li>
<li><code>res.end(JSON.stringify(...))</code>:自己把物件轉 JSON 字串回傳。</li>
</ul>
</div>

<div style="flex:1;min-width:300px;border:1px solid #d5e3ec;border-radius:10px;padding:14px;background:#f4f8fb">
<h3 style="margin-top:0;color:#2c4a5e">框架(Express)</h3>

<b>① 檔案/路由</b>:`routes/auth.js`(路由層)→ 商業邏輯通常再拆到 `controllers/authController.js`。

<pre><code>// routes/auth.js
router.post('/api/login', (req, res) => {
  // 驗證帳密成功後...
  res.cookie('session_id', '12345', {   // 框架自動組 Set-Cookie
    maxAge: 900000,   // 毫秒！(原生 Max-Age 是秒)
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  })
  res.send({ message: '登入成功' })
})</code></pre>

<b>② 串接到哪裡</b>:一樣是前端呼叫 `/api/login` 的那支(React 元件的 fetch/axios)。差別是後端分層:`routes/auth.js` 接路由 → `controllers/authController.js` 寫 `res.cookie(...)`。

<b>③ 逐句 + 參數</b>
<ul>
<li><code>router.post('/api/login', fn)</code>:Express 路由系統,直接宣告「POST /api/login 走這個函式」,<b>不用自己判斷 url/method</b>。</li>
<li><code>res.cookie(name, value, options)</code>:<b>框架方法</b>,它<b>自動幫你組出 Set-Cookie 標頭</b>。三個參數:
  <ul>
  <li>第 1 個 <code>'session_id'</code>:cookie 名</li>
  <li>第 2 個 <code>'12345'</code>:cookie 值</li>
  <li>第 3 個 <code>{}</code>:選項物件(框架把 camelCase 轉成標頭語法)
    <ul>
    <li><code>maxAge: 900000</code>:<b>毫秒</b>!Express 用毫秒,底層換算成 Max-Age 秒</li>
    <li><code>httpOnly / path / sameSite</code>:同原生,只是寫成物件屬性</li>
    </ul></li>
  </ul></li>
<li><code>res.send({...})</code>:框架自動轉 JSON + 設 content-type。</li>
</ul>
</div>

</div>

## 你的實際 stack:Next.js App Router

```js
// app/(api)/api/auth/local/login/route.js
import { cookies } from 'next/headers'

export async function POST(req) {
  // 驗證帳密成功後...
  const cookieStore = await cookies()        // Next 15:cookies() 要 await
  cookieStore.set('session_id', '12345', {   // Next.js 設 cookie 的方法
    maxAge: 900,      // 秒！(跟 Express 的毫秒不同)
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  })
  return Response.json({ message: '登入成功' })
}
```
白話:Next.js 的「檔案即路由」——`route.js` 放在 `api/auth/local/login/` 就自動對應那個網址;`cookies().set(...)` 是 Next 的設 cookie 方法,`Response.json()` 自動回 JSON。

## 三種寫法關鍵差異

| 比較點 | 原生 http | Express | Next.js |
|---|---|---|---|
| 設 cookie | 手拼 `res.setHeader('Set-Cookie', 字串)` | `res.cookie(name,val,opts)` | `cookies().set(name,val,opts)` |
| 路由 | 自己判斷 url/method | `router.post(...)` | 檔案即路由(`route.js`) |
| **maxAge 單位** | **秒**(Max-Age) | **毫秒** | **秒** |
| 回傳 JSON | 手動 `JSON.stringify` | `res.send()` | `Response.json()` |
| cookie 屬性 | 自己拼字串 | 物件(框架轉標頭) | 物件(Next 轉標頭) |

> ⚠️ 最容易踩的雷:**`maxAge` 單位** —— Express 是**毫秒**,原生 `Max-Age` 和 Next.js 是**秒**。抄來抄去很容易差 1000 倍。

## 一句話總結

框架(Express/Next)只是幫你把「原生要手拼的 Set-Cookie 字串 ＋ 手判路由 ＋ 手轉 JSON」包成現成方法。**底層發的還是同一顆 Set-Cookie**,差別只在你寫幾行、容不容易寫錯。
