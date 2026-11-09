// 示範：Input／Output 的方向，是站在「正在執行這次 I/O 的那個程式」的角度看。
// 同一批位元組：伺服器收到它是 Input，客戶端送出它是 Output；回程則整個反過來。
// 對應筆記：延遲Latency-DNS遞迴查詢-TCP握手-行動網路-OSI七層串聯.md 的 (y)
// 執行：node io-input-output-方向-伺服器與客戶端視角.js
const net = require('node:net');

const server = net.createServer((socket) => {
  socket.on('data', (buf) => {                         // 從 socket 讀進來 → 對「伺服器」是 Input
    console.log(`[伺服器] Input  收到 ${buf.length} bytes：${JSON.stringify(buf.toString().trim())}`);
    const reply = 'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nhi';
    socket.write(reply, () => {                        // 寫出到 socket → 對「伺服器」是 Output
      console.log(`[伺服器] Output 送出 ${reply.length} bytes`);
    });
  });
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const client = net.connect(port, '127.0.0.1', () => {
    const req = 'GET / HTTP/1.1\r\nHost: localhost\r\n\r\n';
    client.write(req, () => {                          // 寫出到 socket → 對「客戶端」是 Output
      console.log(`[客戶端] Output 送出 ${req.length} bytes（同一批位元組，對伺服器就是 Input）`);
    });
  });
  client.on('data', (buf) => {                         // 從 socket 讀進來 → 對「客戶端」是 Input
    console.log(`[客戶端] Input  收到 ${buf.length} bytes（同一批位元組，對伺服器是 Output）`);
    client.end();
    server.close();
  });
});
