// 框架 vs 函式庫：同一件事，兩種控制方向
// 執行：node 框架-vs-函式庫-demo.js
// 對照筆記：框架-vs-函式庫-控制反轉IoC.md

// ─────────────────────────────────────────────
// A. 函式庫風格：我呼叫它（控制權在我）
// ─────────────────────────────────────────────
const dateLib = {
  format: (d) => d.toISOString().slice(0, 10),
};

console.log('[Library] 我主動呼叫：', dateLib.format(new Date()));
// 重點：這一行不寫，dateLib 永遠不會執行。main 在我手上。

// ─────────────────────────────────────────────
// B. 框架風格：它呼叫我（控制權讓渡給框架）
// ─────────────────────────────────────────────
const miniFramework = {
  routes: {},
  get(path, handler) {          // 我只是「註冊」，沒有執行
    this.routes[path] = handler;
  },
  run() {                        // 框架自己的生命週期
    console.log('[Framework] 框架啟動，開始接收請求');
    for (const path of Object.keys(this.routes)) {
      const fakeReq = { path };
      const fakeRes = { send: (body) => console.log(`[Framework] 回應 ${path}：${body}`) };
      this.routes[path](fakeReq, fakeRes);   // ← 好萊塢原則：框架回頭呼叫我
    }
  },
};

miniFramework.get('/hello', (req, res) => {
  res.send('我是被框架呼叫的，不是我自己跑的');
});

miniFramework.run();
// 重點：我沒有寫任何一行「執行 handler」的程式碼，是 run() 決定何時呼叫我。
// 這就是 IoC（Inversion of Control，控制反轉）。
