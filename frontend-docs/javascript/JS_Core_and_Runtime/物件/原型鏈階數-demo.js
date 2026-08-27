/**
 * 原型鏈階數 demo：為什麼 getPrototypeOf([]) 不是 Object.prototype
 * 用法：node 原型鏈階數-demo.js
 * 對應筆記：Object建構子-plain-object的建立與存取.md 的 b-2 節
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(62) + '\n' + t + '\n' + '='.repeat(62));

/** 把一個值的完整原型鏈走完，回傳每一階的名字 */
function walkChain(value) {
  const steps = [];
  let cur = value;
  let guard = 0;
  while (guard++ < 20) {
    cur = Object.getPrototypeOf(cur);
    if (cur === null) { steps.push('null'); break; }
    const name = cur.constructor && cur.constructor.name;
    steps.push(name + '.prototype');
  }
  return steps;
}

line('1. 三條鏈的完整長相');

const cases = [
  ['{}',             {}],
  ['[]',             []],
  ['new Map()',      new Map()],
  ['new Set()',      new Set()],
  ['new Date()',     new Date()],
  ['function f(){}', function f() {}],
  ['"abc"',          'abc'],
];

cases.forEach(([label, v]) => {
  console.log(label.padEnd(16) + ' → ' + walkChain(v).join('  →  '));
});

console.log('\n注意：終點全部一樣，都是 Object.prototype → null。');
console.log('差別只在「中間有沒有多插一層」。');

line('2. getPrototypeOf 只跳一階的證據');

console.log('第 1 次呼叫：Object.getPrototypeOf([]) === Array.prototype  →',
  Object.getPrototypeOf([]) === Array.prototype);
console.log('第 2 次呼叫：再對結果呼叫一次 === Object.prototype       →',
  Object.getPrototypeOf(Object.getPrototypeOf([])) === Object.prototype);
console.log('\n所以它問的是「上一階是誰」，不是「最上面是誰」。');

line('3. 陣列仍然是物件，也仍然繼承得到 Object.prototype');

console.log('typeof []                          =', typeof []);
console.log('[] instanceof Object               =', [] instanceof Object);
console.log('Object.prototype.isPrototypeOf([]) =', Object.prototype.isPrototypeOf([]), '← 在鏈上，只是不在第 1 階');
console.log('typeof [].hasOwnProperty           =', typeof [].hasOwnProperty, '← 從 Object.prototype 繼承來的');
console.log('[].toString === Object.prototype.toString   =',
  [].toString === Object.prototype.toString, '← Array 自己覆寫了一份');
console.log('({}).toString === Object.prototype.toString =',
  ({}).toString === Object.prototype.toString, '← plain object 用的是原版');

line('4. 那多出來的一層裝了什麼');

const arrOwn = Object.getOwnPropertyNames(Array.prototype);
const mapOwn = Object.getOwnPropertyNames(Map.prototype);
const objOwn = Object.getOwnPropertyNames(Object.prototype);

console.table([
  { 原型: 'Array.prototype',  自有屬性數: arrOwn.length, 代表成員: 'push, pop, map, filter, reduce, length' },
  { 原型: 'Map.prototype',    自有屬性數: mapOwn.length, 代表成員: mapOwn.filter((n) => n !== 'constructor').join(', ') },
  { 原型: 'Object.prototype', 自有屬性數: objOwn.length, 代表成員: 'toString, valueOf, hasOwnProperty' },
]);

console.log('plain object 有沒有 push？', typeof ({}).push, '← 沒有，因為它的第 1 階直接就是 Object.prototype');

line('5. 判斷 plain object 的兩種寫法');

const isPlainByToString = (v) => Object.prototype.toString.call(v) === '[object Object]';
const isPlainByProto = (v) => {
  if (v === null || typeof v !== 'object') return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;   // null 是 Object.create(null) 的情況
};

const samples = [
  ['{}',                  {}],
  ['[]',                  []],
  ['new Map()',           new Map()],
  ['new Date()',          new Date()],
  ['Object.create(null)', Object.create(null)],
  ['function f(){}',      function f() {}],
];

console.table(samples.map(([label, v]) => ({
  值: label,
  toString法: isPlainByToString(v),
  getPrototypeOf法: isPlainByProto(v),
  第1階: v === null ? '—' : (() => {
    const p = Object.getPrototypeOf(v);
    return p === null ? 'null' : (p.constructor && p.constructor.name) + '.prototype';
  })(),
})));

console.log('\n兩種寫法的差別：');
console.log('a. toString 法對 Object.create(null) 也回 true，但它其實看的是內部標記');
console.log('b. getPrototypeOf 法語意最直接：「第 1 階是不是 Object.prototype」');
console.log('c. 兩者對 [] 與 new Map() 都回 false，這就是拆檔的判準');
