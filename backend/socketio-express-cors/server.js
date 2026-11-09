// 範例：Express + Node http + Socket.IO，CORS 用「明確白名單」而不是 "*"
// 安裝：npm i express socket.io
// 執行：ALLOWED_ORIGINS=http://localhost:3000 node server.js

const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

// 白名單從環境變數讀，逗號分隔，預設只允許本機前端
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())

// 1. express() 回傳的 app 本身是一個 (req, res, next) 函式，可直接當 http 的 request 處理器
const app = express()
app.get('/health', (req, res) => res.json({ ok: true }))

// 2. 明確用 Node 內建的 http.createServer 包住 app，才拿得到 httpServer 這個把手
//    Socket.IO 需要同一個 httpServer 才能攔截 WebSocket 的 upgrade 請求
const httpServer = createServer(app)

// 3. new Server(httpServer, options) 是 Socket.IO 官方文件唯一示範的初始化寫法
const io = new Server(httpServer, {
  // cors 只負責「瀏覽器的 HTTP long-polling 請求」要回哪些 Access-Control-* 標頭
  cors: {
    origin: ALLOWED_ORIGINS, // 陣列白名單，不是 "*"
    credentials: true, // 允許帶 Cookie，此時 origin 不可為 "*"
  },
  // WebSocket 本身不受 CORS 約束，所以要在握手階段自己檢查 Origin 標頭
  allowRequest: (req, callback) => {
    const origin = req.headers.origin
    // 沒有 Origin 代表不是瀏覽器發的(例如 curl 或原生 App)，這裡選擇放行，
    // 實際上要靠登入驗證擋，不能只靠 Origin
    const ok = !origin || ALLOWED_ORIGINS.includes(origin)
    callback(null, ok) // 第一個參數是錯誤訊息，第二個是否放行
  },
})

// 4. 事件模型：on('connection') 是 Socket.IO 內建事件，'chat' 是我們自訂的具名事件
io.on('connection', (socket) => {
  console.log('connected', socket.id)

  socket.on('chat', (msg, ack) => {
    // 廣播給「所有連線」包含自己，rooms 可縮小範圍
    io.emit('chat', { from: socket.id, msg })
    // ack 是 Socket.IO 才有的「確認回呼」，原生 WebSocket 沒有
    if (typeof ack === 'function') ack({ received: true })
  })

  socket.on('disconnect', (reason) => console.log('bye', socket.id, reason))
})

httpServer.listen(3001, () => console.log('listening on 3001'))
// 注意：這裡不能改成 app.listen(3001)，因為 app.listen 會「另外」建一個新的 http server，
// io 綁的 httpServer 就收不到連線了
