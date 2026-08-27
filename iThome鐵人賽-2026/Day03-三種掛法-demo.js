/**
 * Day 3 隨文範例：靜態方法、實例方法、存取器屬性
 * 用法：node Day03-三種掛法-demo.js
 * 對照文章：Day03-靜態方法-實例方法-存取器屬性-讀懂React原始碼的三行寫法.md
 * 驗證環境：Node.js v22（V8）｜React 19.2.8｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(60) + '\n' + t + '\n' + '='.repeat(60));

line('二、三種掛法');

console.log('[靜態方法] 掛在建構函式上');
console.log('  Object.hasOwn(Object, "keys")           =', Object.hasOwn(Object, 'keys'));
console.log('  Object.hasOwn(Object.prototype, "keys") =', Object.hasOwn(Object.prototype, 'keys'));
try { ({}).keys(); } catch (e) { console.log('  ({}).keys() →', e.constructor.name + '：' + e.message); }

console.log('\n[實例方法] 掛在 prototype 上，全體共用一份');
const a = {}, b = {};
console.log('  a.hasOwnProperty === b.hasOwnProperty                =', a.hasOwnProperty === b.hasOwnProperty);
console.log('  a.hasOwnProperty === Object.prototype.hasOwnProperty =', a.hasOwnProperty === Object.prototype.hasOwnProperty);

console.log('\n[存取器屬性] 不呼叫，讀寫時自動觸發');
const person = {
  first: 'Abby',
  last: 'L',
  get full() { return this.first + ' ' + this.last; },
};
console.log('  person.full   =', person.full, '← 沒有括號，但 getter 執行了');
try { person.full(); } catch (e) { console.log('  person.full() →', e.constructor.name + '：' + e.message); }

line('三、Object.prototype 攤開來看');

const names = Object.getOwnPropertyNames(Object.prototype);
console.log('自有屬性共', names.length, '個');
console.log('Object.keys(Object.prototype) =', Object.keys(Object.prototype), '← 全部 enumerable:false');
console.table(names.map((n) => {
  const d = Object.getOwnPropertyDescriptor(Object.prototype, n);
  return {
    成員: n,
    種類: (d.get || d.set) ? 'accessor 存取器' : (typeof d.value === 'function' ? 'method 方法' : 'value'),
    enumerable: d.enumerable,
  };
}));

line('五之二、React 為什麼要 hasOwnProperty.call(config, key)');

console.log('情況一：config 自己有一個同名屬性把它蓋掉');
const config = { hasOwnProperty: '我是一個字串', title: 'hi' };
try { config.hasOwnProperty('title'); }
catch (e) { console.log('  config.hasOwnProperty("title") →', e.constructor.name + '：' + e.message); }
console.log('  Object.prototype.hasOwnProperty.call(config, "title") =',
  Object.prototype.hasOwnProperty.call(config, 'title'), '← React 的寫法，借過來用');
console.log('  Object.hasOwn(config, "title") =',
  Object.hasOwn(config, 'title'), '← ES2022 靜態方法，更乾淨');

console.log('\n情況二：config 是 null-prototype 物件');
const np = Object.create(null);
np.x = 1;
try { np.hasOwnProperty('x'); }
catch (e) { console.log('  np.hasOwnProperty("x") →', e.constructor.name + '：' + e.message); }
console.log('  Object.prototype.hasOwnProperty.call(np, "x") =',
  Object.prototype.hasOwnProperty.call(np, 'x'));

line('五之四、React 手動接原型鏈的空殼函式手法');

function Component() { console.log('  ！Component 的建構子被執行了'); }
Component.prototype.setState = function () { return 'setState'; };

function PureComponent() {}
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

const pureProto = (PureComponent.prototype = new ComponentDummy());
console.log('（上面這行沒有印出「建構子被執行了」→ 只借原型、不執行建構子）');
pureProto.constructor = PureComponent;
Object.assign(pureProto, Component.prototype);
pureProto.isPureReactComponent = true;

console.log('PureComponent.prototype 的第 1 階 === Component.prototype ?',
  Object.getPrototypeOf(PureComponent.prototype) === Component.prototype);

const inst = new PureComponent();
console.log('實例拿得到繼承來的 setState ?', typeof inst.setState);
console.log('inst.constructor.name =', inst.constructor.name, '← 手動修過才會對');
console.log('對照：換掉 prototype 卻不修 constructor 的話：');
function Broken() {}
Broken.prototype = Object.create(Component.prototype);
console.log('  new Broken().constructor.name =', new Broken().constructor.name, '← 指到 Component 去了');

line('六、實例方法在意 this，靜態方法不在意');

class C {
  constructor() { this.n = 1; }
  setState() { return this.n; }
  static pure(x) { return x * 2; }
}
const c = new C();
console.log('c.setState()        =', c.setState());
const detached = c.setState;
try { detached(); }
catch (e) { console.log('把方法拆下來單獨呼叫 →', e.constructor.name + '：' + e.message, '← 這就是要 bind 的理由'); }
console.log('C.pure(21)          =', C.pure(21), '← 靜態方法不在意 this，怎麼呼叫都一樣');
console.log('Object.hasOwn(C, "pure")           =', Object.hasOwn(C, 'pure'), '← 掛在類別本身');
console.log('Object.hasOwn(C.prototype, "pure") =', Object.hasOwn(C.prototype, 'pure'));
console.log('Object.hasOwn(C.prototype, "setState") =', Object.hasOwn(C.prototype, 'setState'), '← 實例方法在 prototype 上');
