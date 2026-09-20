// 函式四種寫法與 block-body return 陷阱 demo
// 配合筆記：傳統函式與匿名函式-表達式-IIFE-Callback.md
// 用法：node 函式四種寫法與block-body-return陷阱-demo.js

'use strict';
const line = (t) => console.log('\n===== ' + t + ' =====');

// ---------------------------------------------------------------
line('1. 兩條軸交叉出的四格，能成立的三格都跑得動');

// ① 宣告 + function 關鍵字
function declFn(x) { return x < 40; }

// ② 表達式 + function 關鍵字（函式本體匿名）
const exprFn = function (x) { return x < 40; };

// ③ 表達式 + 箭頭（concise body）
const arrowConcise = (x) => x < 40;

// ④ 宣告 + 箭頭 → 不存在，箭頭函式只能是表達式

console.log('declFn(1)        =', declFn(1));
console.log('exprFn(1)        =', exprFn(1));
console.log('arrowConcise(1)  =', arrowConcise(1));
console.log('exprFn 的函式本體有名字嗎 ? name =', JSON.stringify(exprFn.name)); // "exprFn" 是「推斷」來的，本體仍是匿名

// ---------------------------------------------------------------
line('2. 踩雷那行：漏掉 => 會在 parse 階段就爆（SyntaxError）');
try {
  // eslint-disable-next-line no-eval
  eval('const bad = (element){element < 40};');
} catch (e) {
  console.log('丟出', e.constructor.name, '：', e.message);
  console.log('→ 錯誤指的是 { 而不是 (，因為 (element) 在讀到它的當下完全合法');
}

// ---------------------------------------------------------------
line('3. 更陰險的一類：block body 忘了寫 return —— 不報錯，只是默默回 undefined');
const forgotReturn = (e) => { e < 40; };          // ❌ 沒有 return
const withReturn = (e) => { return e < 40; };     // ✅

console.log('forgotReturn(1) =', forgotReturn(1));   // undefined
console.log('withReturn(1)   =', withReturn(1));     // true

const arr = [55, 86, 64, 1, 10];
console.log('every(forgotReturn) =', arr.every(forgotReturn)); // false ← 誤打誤撞「看起來對」
console.log('every(withReturn)   =', arr.every(withReturn));   // false ← 真的算出來的

const small = [1, 2, 3];
console.log('小資料才露餡：every(forgotReturn) =', small.every(forgotReturn)); // false ← 錯，應該是 true
console.log('小資料才露餡：every(withReturn)   =', small.every(withReturn));   // true  ← 對

// ---------------------------------------------------------------
line('4. 傳統函式也是同一條規則：有大括號就不自動回傳');
const tradForgot = function (e) { e < 40; };
console.log('傳統函式忘了 return =', tradForgot(1)); // undefined ← 不是箭頭函式特有的陷阱

// ---------------------------------------------------------------
line('5. 三種匿名場景');
const greet = function () { return 'Hello World'; };       // 函式表達式
console.log('函式表達式 =', greet());

const iifeResult = (function () { return '立刻執行，且沒有名字'; })();  // IIFE
console.log('IIFE       =', iifeResult);

setTimeout(function () { console.log('Callback   = 延遲 10ms 後執行'); }, 10); // Callback

// ---------------------------------------------------------------
line('6. 宣告 vs 表達式的執行期差異：hoisting 與 TDZ');
console.log('宣告可以提前呼叫 =', hoisted(1));
function hoisted(x) { return x < 40; }

try {
  notYet(1);                       // ← const 綁定在 TDZ 裡
} catch (e) {
  console.log('表達式提前呼叫丟', e.constructor.name, '：', e.message);
}
// eslint-disable-next-line no-unused-vars
const notYet = (x) => x < 40;

// ---------------------------------------------------------------
line('7. 箭頭函式與傳統函式的行為差異（不只是寫法短）');
const obj = {
  v: 42,
  trad: function () { return this && this.v; },
  arrow: () => (typeof this === 'undefined' ? undefined : this && this.v),
};
console.log('傳統函式的 this 由呼叫點決定 =', obj.trad());   // 42
console.log('箭頭函式的 this 由定義處決定 =', obj.arrow());  // undefined（模組頂層的 this）

try {
  const Arrow = () => {};
  new Arrow();
} catch (e) {
  console.log('箭頭函式不能 new，丟', e.constructor.name, '：', e.message);
}
console.log('箭頭函式有 prototype 屬性嗎 ?', 'prototype' in ((x) => x)); // false
