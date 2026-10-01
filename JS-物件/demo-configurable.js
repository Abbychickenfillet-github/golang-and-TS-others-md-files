'use strict';
/**
 * demo-configurable.js
 * 搭配筆記：物件-configurable這把鎖與defineProperty實務用途.md
 * 執行方式：node demo-configurable.js
 */

const obj = {};

Object.defineProperty(obj, 'a', {
  value: 10,
  writable: true,
  enumerable: true,
  configurable: false, // 上鎖
});

console.log('--- 1. 想刪除 ---');
try {
  delete obj.a;
} catch (e) {
  console.log('刪除失敗：', e.constructor.name); // TypeError
}
console.log('a 還在嗎 →', obj.a); // 10

console.log('--- 2. 想改 enumerable ---');
try {
  Object.defineProperty(obj, 'a', { enumerable: false });
} catch (e) {
  console.log('改設定失敗：', e.constructor.name); // TypeError
}

console.log('--- 3. 想改 value（writable 還是 true，所以放行）---');
obj.a = 20;
console.log('值可以換 →', obj.a); // 20

console.log('--- 4. writable 是單行道 ---');
Object.defineProperty(obj, 'a', { writable: false }); // true → false，可以
try {
  Object.defineProperty(obj, 'a', { writable: true }); // false → true，不行
} catch (e) {
  console.log('false 改回 true 失敗：', e.constructor.name); // TypeError
}

console.log('--- 5. defineProperty 新增屬性時，三個布林預設都是 false ---');
const p = {};
Object.defineProperty(p, 'hidden', { value: 1 });
console.log(Object.getOwnPropertyDescriptor(p, 'hidden'));
// { value: 1, writable: false, enumerable: false, configurable: false }
console.log('Object.keys 看得到嗎 →', Object.keys(p)); // []

const q = {};
q.normal = 1; // 一般賦值
console.log(Object.getOwnPropertyDescriptor(q, 'normal'));
// { value: 1, writable: true, enumerable: true, configurable: true }

console.log('--- 6. 更正示範：陣列的 length 是 writable: true ---');
console.log(Object.getOwnPropertyDescriptor([1, 2, 3], 'length'));
// { value: 3, writable: true, enumerable: false, configurable: false }
const arr = [1, 2, 3];
arr.length = 0; // 合法，這是清空陣列的老寫法
console.log('清空後 →', arr); // []

console.log('--- 7. 對照：Math.PI 真的三把鎖全上 ---');
console.log(Object.getOwnPropertyDescriptor(Math, 'PI'));
// { value: 3.141592653589793, writable: false, enumerable: false, configurable: false }
