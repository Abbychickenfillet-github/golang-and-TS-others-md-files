// 示範：event loop 是「跑在某一條執行緒上」的迴圈；回呼函式永遠在跑這個 loop 的那條執行緒上執行。
// 對應筆記：延遲Latency-DNS遞迴查詢-TCP握手-行動網路-OSI七層串聯.md 的 (v)
// 執行：node event-loop-跑在哪條執行緒-threadId示範.js
// threadId：主執行緒是 0，每個 Worker 有自己的編號（1、2、…）。
const { Worker, isMainThread, threadId } = require('node:worker_threads');
const fs = require('node:fs');

const tag = isMainThread ? '主執行緒' : `Worker 執行緒`;

if (isMainThread) {
  console.log(`[${tag}] threadId=${threadId}：這條執行緒在跑「主」event loop`);

  setTimeout(() => {
    console.log(`[${tag}] setTimeout 回呼在 threadId=${threadId} 執行`);
  }, 10);

  // 讀檔的「阻塞工作」是在 libuv 的 Worker Pool 背景執行緒做的，但回呼仍回到跑 event loop 的這條執行緒
  fs.readFile(__filename, () => {
    console.log(`[${tag}] fs.readFile 回呼在 threadId=${threadId} 執行（真正讀檔的是 libuv 執行緒池，但回呼回到 event loop 這條）`);
  });

  // 另開一個 Worker：它有「自己的」event loop，跑在自己的執行緒上
  new Worker(__filename);
} else {
  console.log(`[${tag}] threadId=${threadId}：這條執行緒有「自己的」event loop`);
  setTimeout(() => {
    console.log(`[${tag}] setTimeout 回呼在 threadId=${threadId} 執行`);
  }, 10);
}
