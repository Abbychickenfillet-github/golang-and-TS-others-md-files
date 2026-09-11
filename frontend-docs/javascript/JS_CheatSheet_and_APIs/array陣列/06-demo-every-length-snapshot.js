// every() 的長度快照與短路求值 — 直接 node every-length-snapshot-demo.js
// 對應筆記：every短路求值與初始長度快照-命令式重構為宣告式.md

console.log('--- 1. 長度快照：push 進去的元素不會被檢查 ---');
const arr = [1, 2, 3];
arr.every((val, index, array) => {
  array.push(99);
  console.log(`  檢查索引 ${index}，值為 ${val}`);
  return val < 10;
});
console.log('  跑完之後的 arr =', arr, '（99 一次都沒被檢查）');

console.log('\n--- 2. 短路求值：遇到第一個 false 就停 ---');
let calls = 0;
const result = [10, 20, 999, 30].every((v) => {
  calls++;
  return v < 40;
});
console.log('  結果 =', result, '，callback 被呼叫次數 =', calls, '（不是 4 次）');

console.log('\n--- 3. 邊界：空陣列是 vacuous truth ---');
console.log('  [].every(() => false) =', [].every(() => false), '(true)');
console.log('  [].some(() => true)   =', [].some(() => true), '(false)');

console.log('\n--- 4. 命令式 vs 宣告式，行為完全一樣 ---');
const isValid = (r) => r.ok === true;
const requests = [{ ok: true }, { ok: true }, { ok: false }, { ok: true }];

let everyRequestValid = true;
for (const request of requests) {
  if (!isValid(request)) { everyRequestValid = false; break; }
}
console.log('  命令式 =', everyRequestValid);
console.log('  宣告式 =', requests.every(isValid));
