// arguments 物件示範：用 `node arguments物件-示範.js` 執行，每一行的輸出寫在註解裡

// 1. 它是什麼：函式內建的類陣列物件，裝著「這次呼叫實際傳入的全部引數」
function show(a, b) {
  console.log(typeof arguments);                           // 'object'
  console.log(Array.isArray(arguments));                   // false，不是真正的 Array
  console.log(Object.prototype.toString.call(arguments));  // '[object Arguments]'
  console.log(arguments.length, show.length);              // 3 2，實際傳了 3 個，宣告的參數有 2 個
  console.log(arguments[2]);                               // 'extra'，超出宣告的引數也拿得到
}
show(1, 2, 'extra');

// 2. 只算「實際傳入」的，預設值不算
function defaults(a = 10, b = 20) { return arguments.length; }
console.log(defaults());      // 0
console.log(defaults(1));     // 1

// 3. 類陣列：沒有 map、forEach，要先轉成真正的 Array
function toArray() {
  console.log(typeof arguments.map);                       // 'undefined'
  console.log(Array.from(arguments));                      // [ 1, 2, 3 ]
  console.log([...arguments]);                             // [ 1, 2, 3 ]
  console.log(Array.prototype.slice.call(arguments));      // [ 1, 2, 3 ]
  console.log(arguments[Symbol.iterator] === Array.prototype.values); // true，所以可以被 for...of、展開
}
toArray(1, 2, 3);

// 4. mapped：非 strict 且參數列表單純時，arguments[i] 與參數變數連動
function mapped(a) { arguments[0] = 99; return a; }
console.log(mapped(1));        // 99
function mappedReverse(a) { a = 50; return arguments[0]; }
console.log(mappedReverse(1)); // 50

// 5. unmapped：strict、或有預設值／rest／解構時，兩邊各自獨立
function strictFn(a) { 'use strict'; arguments[0] = 99; return a; }
console.log(strictFn(1));      // 1
function withDefault(a = 0) { arguments[0] = 99; return a; }
console.log(withDefault(1));   // 1
function withRest(a, ...rest) { arguments[0] = 99; return [a, rest]; }
console.log(withRest(1, 2));   // [ 1, [ 2 ] ]

// 6. 另外一個只剩「傳入了幾個」可用：沒傳的參數，arguments 裡也沒有那一格
function missing(a, b) { return [arguments.length, arguments[1], b]; }
console.log(missing(1));       // [ 1, undefined, undefined ]

// 7. 箭頭函式沒有自己的 arguments，會往外層函式找
function outer() {
  const arrow = () => arguments[0];  // 這個 arguments 是 outer 的
  return arrow('arrow 自己的引數');
}
console.log(outer('outer 的引數'));  // 'outer 的引數'
const arrowOnly = (...args) => args; // 想在箭頭函式收全部引數，用 rest
console.log(arrowOnly(1, 2));        // [ 1, 2 ]

// 8. arguments.callee：sloppy 的 mapped 物件有，指向函式本身；strict 一用就丟 TypeError
function sloppyCallee() { return arguments.callee === sloppyCallee; }
console.log(sloppyCallee());   // true
function strictCallee() { 'use strict'; try { return arguments.callee; } catch (e) { return e.constructor.name; } }
console.log(strictCallee());   // 'TypeError'

// 9. 現代寫法：用 rest 參數取代 arguments，得到真正的 Array
function sum(...nums) { return nums.reduce((x, y) => x + y, 0); }
console.log(sum(1, 2, 3));     // 6
