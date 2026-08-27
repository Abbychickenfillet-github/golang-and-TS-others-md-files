/**
 * __proto__ 的三種身分 demo
 * 用法：node __proto__-三種身分-demo.js
 * 對應筆記：Object建構子-plain-object的建立與存取.md 的 j 節
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(62) + '\n' + t + '\n' + '='.repeat(62));

line('1. 它是 accessor property，不是方法，也不是靜態');

const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
console.log('描述器 =', {
  get: typeof d.get, set: typeof d.set,
  value: d.value, writable: d.writable,
  enumerable: d.enumerable, configurable: d.configurable,
});
console.log('有 get 與 set、沒有 value → 是存取器屬性 accessor property');
console.log();
console.log('Object.hasOwn(Object.prototype, "__proto__") =',
  Object.hasOwn(Object.prototype, '__proto__'), '← 住在 Object.prototype 上');
console.log('Object.hasOwn(Object,           "__proto__") =',
  Object.hasOwn(Object, '__proto__'), '← 不在 Object 建構函式上，所以不是靜態方法');

line('2. 不是方法，所以不能加括號');

const o = {};
console.log('typeof o.__proto__ =', typeof o.__proto__, '← 直接就是原型物件，不用呼叫');
try { o.__proto__(); } catch (e) {
  console.log('o.__proto__()      →', e.constructor.name + '：' + e.message);
}

line('3. 三個長得一樣但完全不同的 __proto__');

// a. 存取器（本篇主角，deprecated）
const a = {};
const proto = { greet() { return 'hi'; } };
a.__proto__ = proto;
console.log('a) obj.__proto__ = proto      → 走 Object.prototype 上的 setter，deprecated');
console.log('   Object.getPrototypeOf(a) === proto =', Object.getPrototypeOf(a) === proto);

// b. 物件字面量裡的 __proto__（獨立語法，標準且被最佳化）
const litNull = { __proto__: null };
const litProto = { __proto__: proto };
console.log('b) { __proto__: X } 字面量語法 → 這是獨立的語法特性，MDN 明說跟上面那個「很不一樣」');
console.log('   Object.getPrototypeOf({ __proto__: null })  =', Object.getPrototypeOf(litNull));
console.log('   Object.getPrototypeOf({ __proto__: proto }) === proto =',
  Object.getPrototypeOf(litProto) === proto);

// c. 計算屬性名，只是個普通字串 key
const litComputed = { ['__proto__']: 'just a string' };
console.log('c) { ["__proto__"]: v } 計算屬性名 → 只是普通字串 key，不碰原型');
console.log('   原型還是 Object.prototype？',
  Object.getPrototypeOf(litComputed) === Object.prototype);
console.log('   litComputed["__proto__"] =', litComputed['__proto__']);

line('4. null-prototype 物件沒有這個存取器');

const np = Object.create(null);
np.x = 1;
console.log('np.__proto__ =', np.__proto__, '← undefined，因為它沒繼承 Object.prototype');
np.__proto__ = { hacked: true };
console.log('賦值之後 Object.getPrototypeOf(np) =', Object.getPrototypeOf(np),
  '← 還是 null，剛剛那行只是新增了一個普通屬性');
console.log('Object.getOwnPropertyNames(np) =', Object.getOwnPropertyNames(np),
  '← __proto__ 變成一個貨真價實的自有屬性');
console.log('這就是 null-prototype 物件擋掉原型污染 prototype pollution 的原理');

line('5. 現代等價寫法');

const x = {};
Object.setPrototypeOf(x, proto);
console.log('Object.setPrototypeOf(x, proto) → x.greet() =', x.greet());
console.log('Object.getPrototypeOf(x) === proto  =', Object.getPrototypeOf(x) === proto, '← 建議用這個');
console.log('Reflect.getPrototypeOf(x) === proto =', Reflect.getPrototypeOf(x) === proto, '← Proxy 場景用這個');
console.log('x.__proto__ === proto               =', x.__proto__ === proto, '← 結果一樣但 deprecated');

line('6. 順帶一提：Object 本身也有 __proto__');

console.log('Object.__proto__ === Function.prototype =', Object.__proto__ === Function.prototype);
console.log('因為 Object 是一個函式，函式也是物件，它的第 1 階是 Function.prototype');
console.log('這跟「__proto__ 是不是靜態方法」是兩件事，別搞混');
