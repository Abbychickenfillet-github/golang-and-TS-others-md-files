// demo-03：正式專案該有的 debounce —— 支援 leading edge、cancel、flush
// 執行：node demo-03-debounce加強版.js
'use strict';

function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    fn.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    const isFirstCall = timer === null;        // 目前沒有排程 = 這是「安靜之後的第一次」

    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) invoke();      // 尾端執行
    }, delay);

    if (leading && isFirstCall) invoke();      // 前端執行：立刻做一次
  }

  debounced.cancel = function () {             // 放棄還沒執行的那一次（例如元件 unmount）
    clearTimeout(timer);
    timer = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = function () {              // 不等了，立刻把排隊中的那次執行掉（例如使用者按 Enter）
    if (timer !== null) { clearTimeout(timer); timer = null; if (lastArgs) invoke(); }
  };

  debounced.pending = () => timer !== null;    // 目前有沒有排隊中的任務

  return debounced;
}

const t0 = Date.now();
const stamp = () => String(Date.now() - t0).padStart(4, " ") + "ms";

console.log("=== leading: true, trailing: true —— 第一下立刻做，最後一下也做 ===");
const both = debounce((k) => console.log(`  ${stamp()} 執行「${k}」`), 300, { leading: true, trailing: true });
["j", "ja", "jav"].forEach((k, i) => setTimeout(() => both(k), i * 100));

setTimeout(() => {
  console.log("\n=== flush()：使用者按 Enter，不想再等 ===");
  const d = debounce((k) => console.log(`  ${stamp()} 執行「${k}」`), 300);
  d("react");
  console.log("  pending?", d.pending());
  d.flush();
  console.log("  flush 後 pending?", d.pending());

  console.log("\n=== cancel()：元件 unmount，直接放棄 ===");
  const d2 = debounce(() => console.log("  ❌ 這行不該出現"), 200);
  d2("bye");
  d2.cancel();
  setTimeout(() => console.log("  400ms 後確認：什麼都沒執行 ✅"), 400);
}, 900);
