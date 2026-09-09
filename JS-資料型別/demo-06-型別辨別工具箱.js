/**
 * =====================================================================================
 * demo-06-型別辨別工具箱.js
 * 主題：如何辨別一個變數的資料型別（typeof 以外的四種工具，以及它們各自的破口）
 * 執行：node demo-06-型別辨別工具箱.js
 *
 * 名詞先講清楚：
 *   a. realm（領域）：一份獨立的 JS 執行環境，有自己的全域物件與自己的一整套內建建構函式。
 *      iframe、Web Worker、Node 的 vm 模組各自是一個 realm。
 *   b. internal slot（內部欄位）：規格層面掛在物件上、程式碼碰不到的隱藏欄位，
 *      例如陣列的 [[ArrayLength]]、Date 的 [[DateValue]]。內建方法靠它判斷「你到底是不是我」。
 *   c. Symbol.toStringTag：一個 well-known symbol（規格預先定義好的 Symbol），
 *      Object.prototype.toString 會讀它來組出 [object XXX] 的 XXX。
 * =====================================================================================
 */

const vm = require('node:vm'); // Node 內建模組，用來製造「另一個 realm」

console.log('===== 1. typeof：最快，但有三個破口 =====');

const samples = ['str', 1, true, Symbol('s'), null, undefined, 10n,
                 {}, [], function () {}, new Map(), new Date(), /re/];
samples.forEach((v) => {
  // String(v) 對 Symbol 會丟錯，所以用 typeof 先擋掉
  const label = typeof v === 'symbol' ? 'Symbol(s)' : String(v);
  console.log(`   typeof ${label.padEnd(18)} → ${typeof v}`);
});

console.log('   破口 a：typeof null 是 "object"（1995 年的 tagged pointer bug），判 null 只能用 === null');
console.log('   破口 b：陣列、Date、RegExp、Map 通通是 "object"，分不出來');
console.log('   破口 c：function 被特別挑出來，但它其實是 Object 的子型別（有 [[Call]] 內部方法）');


console.log('\n===== 2. Object.prototype.toString.call：分得比較細 =====');

// 為什麼要 .call？因為要「借」Object.prototype 上那個沒被覆寫過的版本，
// 直接寫 x.toString() 會拿到 Array.prototype.toString 之類被覆寫過的版本。
const typeTag = (v) => Object.prototype.toString.call(v);

[null, undefined, 1, 'a', true, 10n, Symbol('s'), {}, [], function () {},
 new Map(), new Set(), new Date(), /re/, new Error('e'), Promise.resolve(),
 Math, JSON, arguments_placeholder()].forEach((v) => {
  console.log('  ', typeTag(v));
});
function arguments_placeholder() { return (function () { return arguments; })(); }

console.log('   注意：null 與 undefined 也分得出來，這是 typeof 做不到的');


console.log('\n===== 3. 但 Object.prototype.toString 可以被竄改 =====');

const liar = { [Symbol.toStringTag]: 'Array' }; // 冒充自己是陣列
console.log('   假貨的 tag  →', typeTag(liar));
console.log('   Array.isArray(假貨) →', Array.isArray(liar), '← 騙不過，因為它讀的是內部欄位');
console.log('   結論：toString 讀的是「可寫的 Symbol.toStringTag」，只適合除錯，不適合當安全判斷');


console.log('\n===== 4. instanceof 的破口：跨 realm 就失效 =====');

const foreignArray = vm.runInNewContext('[1,2,3]'); // 在另一個 realm 造一個陣列
console.log('   foreignArray 內容        →', foreignArray);
console.log('   foreignArray instanceof Array →', foreignArray instanceof Array, '← 失效');
console.log('   Array.isArray(foreignArray)   →', Array.isArray(foreignArray), '← 正確');
console.log('   原因：instanceof 走的是原型鏈，另一個 realm 有自己的 Array.prototype，');
console.log('         兩條原型鏈根本不相交。Array.isArray 讀的是內部欄位，所以不受影響。');
console.log('   前端最常遇到的 realm 邊界：iframe、Web Worker、跨視窗 postMessage');


console.log('\n===== 5. 等值判斷的三種語意 =====');

const cases = [
  ['0 與 -0', 0, -0],
  ['NaN 與 NaN', NaN, NaN],
  ['1 與 "1"', 1, '1'],
  ['null 與 undefined', null, undefined],
];
console.log('   ' + '情境'.padEnd(20) + '=='.padEnd(8) + '==='.padEnd(8) + 'Object.is');
cases.forEach(([label, a, b]) => {
  console.log('   ' + label.padEnd(20) +
    String(a == b).padEnd(8) + String(a === b).padEnd(8) + String(Object.is(a, b)));
});
console.log('   a. ==  會做型別轉換（IsLooselyEqual）');
console.log('   b. === 不轉換，但 NaN 不等於自己、+0 等於 -0');
console.log('   c. Object.is 是「SameValue」：把 NaN 當相等、把 +0 與 -0 當不相等');
console.log('   d. React 判斷 state 有沒有變，用的就是 Object.is');


console.log('\n===== 6. NaN 專用：Number.isNaN vs 全域 isNaN =====');

['NaN 本人', 'hello', undefined, '123', null].forEach((v) => {
  const val = v === 'NaN 本人' ? NaN : v;
  console.log(`   ${String(v).padEnd(10)} → isNaN: ${String(isNaN(val)).padEnd(6)} Number.isNaN: ${Number.isNaN(val)}`);
});
console.log('   全域 isNaN 會先把參數 ToNumber，所以 "hello" 也被說成 NaN');
console.log('   Number.isNaN 只在「型別是 number 而且值是 NaN」時才 true，永遠用這個');


console.log('\n===== 7. 收攏成一個可用的工具函式 =====');

/**
 * 回傳小寫的型別名稱字串。
 * 判斷順序刻意這樣排：
 *   1. null 先擋掉，因為 typeof null 是 "object"
 *   2. 非物件（primitive 與 function）直接用 typeof，最快
 *   3. 剩下的才用 toString tag，切出 array / date / map / regexp⋯
 */
function typeOf(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t !== 'object') return t;                    // string number boolean symbol bigint undefined function
  if (Array.isArray(value)) return 'array';        // 跨 realm 也正確
  return Object.prototype.toString.call(value)     // [object Date] → date
    .slice(8, -1)
    .toLowerCase();
}

[null, undefined, 1, 'a', true, 10n, Symbol('s'), {}, [], foreignArray,
 function () {}, new Map(), new Date(), /re/, new Error('e'), Promise.resolve()]
  .forEach((v) => {
    const shown = typeof v === 'symbol' ? 'Symbol(s)' : (typeof v === 'function' ? 'function(){}' : String(v));
    console.log(`   typeOf(${shown.padEnd(16)}) → ${typeOf(v)}`);
  });


console.log('\n===== 選用準則 =====');
console.log([
  'a. 只要分 primitive 與 function　　　　→ typeof（記得 null 要另外擋）',
  'b. 判 null／undefined　　　　　　　　　→ === null／=== undefined，不要用 typeof',
  'c. 判陣列　　　　　　　　　　　　　　　→ Array.isArray，永遠不要用 instanceof Array',
  'd. 判 Date／Map／RegExp 這些內建物件　→ Object.prototype.toString.call（除錯用）',
  'e. 判自訂類別的實例　　　　　　　　　　→ instanceof（但要確定不跨 realm）',
  'f. 判 NaN　　　　　　　　　　　　　　　→ Number.isNaN',
  'g. 判「值有沒有變」（React 心智模型）　→ Object.is',
].join('\n'));
