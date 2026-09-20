// set-prototype-demo.js
// 配合筆記：Set.prototype-原型物件-無字面量-toStringTag與擴充內建原型.md
// 用法：node set-prototype-demo.js　或直接貼進 DevTools Console

'use strict';

const line = (t) => console.log('\n===== ' + t + ' =====');

// ---------------------------------------------------------------
line('1. 三階原型鏈：mySet → Set.prototype → Object.prototype → null');
const mySet = new Set([1, 2, 3]);

console.log('typeof Set               =', typeof Set);                // "function"
console.log('typeof Set.prototype     =', typeof Set.prototype);      // "object"
console.log('實例的原型是 Set.prototype   ?', Object.getPrototypeOf(mySet) === Set.prototype);
console.log('Set.prototype 的原型是 Object.prototype ?', Object.getPrototypeOf(Set.prototype) === Object.prototype);
console.log('Object.prototype 的原型      =', Object.getPrototypeOf(Object.prototype)); // null

// 方法不在實例身上，而是繼承來的
console.log('mySet 自己有 add 嗎        ?', Object.hasOwn(mySet, 'add'));          // false
console.log('Set.prototype 有 add 嗎    ?', Object.hasOwn(Set.prototype, 'add'));  // true

// ---------------------------------------------------------------
line('2. 沒有 Set 字面量，只能用 new Set(iterable)');
try {
  // eslint-disable-next-line no-eval
  eval('const bad = {1, 2, 3};');
} catch (e) {
  console.log('{1, 2, 3} 在 JS 是', e.constructor.name, '：', e.message);
}
try {
  Set([1, 2]); // 少了 new
} catch (e) {
  console.log('省略 new 會丟', e.constructor.name, '：', e.message);
}

// ---------------------------------------------------------------
line('3. Symbol.toStringTag：typeof 分不出來，toString 才分得出來');
console.log('typeof mySet                              =', typeof mySet); // "object"
console.log('Object.prototype.toString.call(mySet)     =', Object.prototype.toString.call(mySet)); // "[object Set]"
console.log('標籤在實例身上嗎                           ?', Object.hasOwn(mySet, Symbol.toStringTag));         // false
console.log('標籤在 Set.prototype 身上嗎                ?', Object.hasOwn(Set.prototype, Symbol.toStringTag)); // true
console.log('Set.prototype[Symbol.toStringTag]         =', Set.prototype[Symbol.toStringTag]);                // "Set"
console.log('該屬性的 descriptor                        =',
  Object.getOwnPropertyDescriptor(Set.prototype, Symbol.toStringTag));

// 自訂 class 也能自報家門
class Wallet {
  get [Symbol.toStringTag]() { return 'Wallet'; }
}
console.log('自訂 class 的標籤                          =', Object.prototype.toString.call(new Wallet())); // "[object Wallet]"

// ---------------------------------------------------------------
line('4. 「後補的方法」舊實例也吃得到 —— 查找是動態的，不是複製');
const older = new Set([9]);                 // 先出生
Set.prototype.isEmpty = function () {       // 後補方法（示範用，正式專案不要這樣做）
  return this.size === 0;
};
console.log('比方法早出生的 older 也拿得到 isEmpty ?', older.isEmpty()); // false，代表拿得到

// ---------------------------------------------------------------
line('5. monkey patching 的副作用：可列舉屬性會被 for...in 撈到');
Array.prototype.first = function () { return this[0]; };            // 直接賦值 → enumerable: true
const arr = [10, 20, 30];
const leaked = [];
for (const k in arr) leaked.push(k);
console.log('直接賦值後 for...in 撈到      =', leaked);               // ['0','1','2','first'] ← 汙染了

delete Array.prototype.first;
Object.defineProperty(Array.prototype, 'first', {                    // 正確做法：關掉可列舉
  value() { return this[0]; },
  enumerable: false,
  writable: true,
  configurable: true,
});
const clean = [];
for (const k in arr) clean.push(k);
console.log('用 defineProperty 後 for...in 撈到 =', clean);           // ['0','1','2'] ← 乾淨了

// 收尾：把示範時動到的內建原型還原，不要留給後面的程式碼踩
delete Array.prototype.first;
delete Set.prototype.isEmpty;

// ---------------------------------------------------------------
line('6. 不用自己 patch：原生集合運算（Baseline 2024）');
const evens = new Set([2, 4, 6, 8]);
const squares = new Set([1, 4, 9]);
console.log('union        =', evens.union(squares));               // Set(6) { 2, 4, 6, 8, 1, 9 }
console.log('intersection =', evens.intersection(squares));        // Set(1) { 4 }
console.log('difference   =', evens.difference(squares));          // Set(3) { 2, 6, 8 }

// set-like 物件也吃得下：只要有 size / has() / keys()
const setLike = {
  size: 2,
  has: (v) => v === 4 || v === 100,
  keys: () => [4, 100][Symbol.iterator](),
};
console.log('吃 set-like  =', evens.union(setLike));               // Set(5) { 2, 4, 6, 8, 100 }

// ---------------------------------------------------------------
line('7. ⚠️ Gemini 寫錯的那一行');
// console.typeof(Set.prototype);  // ← TypeError: console.typeof is not a function
console.log('正確寫法 typeof Set.prototype =', typeof Set.prototype); // "object"
