// demo-01：debounce 不是「等 0.3 秒」，是「等安靜 0.3 秒」
// 執行：node demo-01-debounce-vs-throttle.js
'use strict';

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);              // clearTimeout(null) 是安全的，不會報錯
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) { last = now; fn.apply(this, args); }
  };
}

const t0 = Date.now();
const stamp = () => String(Date.now() - t0).padStart(4, " ") + "ms";

const onDebounce = debounce((k) => console.log(`  [debounce] ${stamp()} 查詢「${k}」`), 300);
const onThrottle = throttle((k) => console.log(`  [throttle] ${stamp()} 查詢「${k}」`), 300);

// 模擬使用者打字：每 100ms 一個字，共 8 個字（總共 800ms，中間從來沒安靜滿 300ms）
const word = "javascript";
console.log("使用者以 100ms/字的速度打「javascript」，delay 設 300ms\n");
word.split("").forEach((_, i) => {
  setTimeout(() => {
    const typed = word.slice(0, i + 1);
    console.log(`${stamp()} 打出「${typed}」`);
    onDebounce(typed);
    onThrottle(typed);
  }, i * 100);
});

setTimeout(() => {
  console.log("\n結論：");
  console.log("a. debounce 只在最後一次輸入後安靜滿 300ms 才執行 -> 總共 1 次");
  console.log("b. throttle 每 300ms 最多放行一次 -> 打字過程中就執行了好幾次");
  console.log("c. 如果使用者一直打字不停，debounce 會永遠不執行 —— 這是特性不是 bug");
}, 1600);
