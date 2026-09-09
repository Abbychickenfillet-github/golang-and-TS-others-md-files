// demo-02：用純 JS 模擬 React 的 re-render，證明「為什麼 timer 一定要放在 useRef 裡」
// 執行：node demo-02-為什麼React需要useRef.js
'use strict';

// ---- 用最小的方式模擬 React 的兩個關鍵行為 ----
// a. 每次 render 就是「把元件函式從頭再跑一次」
// b. useRef 回傳的是同一個物件（跨 render 存活），local 變數不是
const refStore = [];
let cursor = 0;
function useRef(initial) {
  if (refStore[cursor] === undefined) refStore[cursor] = { current: initial };
  return refStore[cursor++];
}
function render(Component, label) { cursor = 0; console.log(`\n--- ${label} ---`); Component(); }

// ---- ❌ 錯誤版：timer 是 local 變數 ----
function SearchBoxBroken() {
  let timer = null;                       // 每次 render 都重新變成 null！
  console.log("render 開始時 timer =", timer);
  timer = setTimeout(() => {}, 1000);
  clearTimeout(timer);                    // 只清得掉「這一次 render 排的」
  console.log("這次 render 排到的 timer id 型別:", typeof timer);
}

// ---- ✅ 正確版：timer 放進 ref ----
function SearchBoxOK() {
  const timerRef = useRef(null);
  console.log("render 開始時 timerRef.current =", timerRef.current === null ? "null" : "上一次留下來的 id");
  clearTimeout(timerRef.current);         // 清得掉「上一次 render 排的」✅
  timerRef.current = setTimeout(() => {}, 1000);
}

console.log("=== ❌ 用 local 變數：每次 render 都被重置，永遠清不掉前一個計時器 ===");
render(SearchBoxBroken, "第 1 次 render");
render(SearchBoxBroken, "第 2 次 render");

console.log("\n\n=== ✅ 用 useRef：同一個盒子跨 render 存活 ===");
render(SearchBoxOK, "第 1 次 render");
render(SearchBoxOK, "第 2 次 render");
render(SearchBoxOK, "第 3 次 render");

// 收尾：把最後一個計時器清掉，讓 node 可以正常結束
clearTimeout(refStore[0].current);

console.log("\n重點：");
console.log("a. 元件函式每次 render 都是一次全新的函式呼叫，local 變數會重生");
console.log("b. useRef 給你一個『跨 render 同一個』的可變盒子 ref.current");
console.log("c. 改 ref.current 不會觸發 re-render —— 這正是 timer id 需要的性質");
console.log("d. 這個盒子在原生 JS 版的 debounce 裡，對應的就是被閉包鎖住的 let timer");
