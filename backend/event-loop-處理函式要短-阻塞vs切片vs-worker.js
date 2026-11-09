// 示範：event loop 上的「處理函式」太長會卡住所有人；怎麼讓它變短。
// 對應筆記：延遲Latency-DNS遞迴查詢-TCP握手-行動網路-OSI七層串聯.md 的 (v)
// 執行：node event-loop-處理函式要短-阻塞vs切片vs-worker.js
// 用「心跳計時器」模擬其他連線：它每 20ms 應該響一次，響得越晚代表其他連線被卡得越久。
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

function heavy(n) { // 純 CPU 運算，代表「要用 CPU 的處理函式」
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.sqrt(i);
  return s;
}

if (!isMainThread) { // 這一段是 worker 執行緒在跑
  parentPort.postMessage(heavy(workerData.n));
  return;
}

const N = 4e8;

async function measure(label, task) {
  let last = Date.now(), maxGap = 0;
  const beat = setInterval(() => { const now = Date.now(); maxGap = Math.max(maxGap, now - last); last = now; }, 20);
  const t0 = Date.now();
  await task();
  await new Promise((r) => setTimeout(r, 40)); // 讓被卡住的心跳有機會響一次，才量得到延遲
  clearInterval(beat);
  console.log(`${label.padEnd(26)} 總耗時 ${String(Date.now() - t0).padStart(5)} ms，其他連線最長被卡 ${String(maxGap).padStart(5)} ms`);
}

(async () => {
  await measure('1) 一口氣算完（阻塞）', async () => { heavy(N); });

  await measure('2) 切成 200 片，片間讓出', async () => {
    for (let i = 0; i < 200; i++) {
      heavy(N / 200);
      await new Promise((r) => setImmediate(r)); // 讓 event loop 先處理別人
    }
  });

  await measure('3) 丟給 worker 執行緒', () => new Promise((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { n: N } });
    w.once('message', resolve); w.once('error', reject);
  }));
})();
