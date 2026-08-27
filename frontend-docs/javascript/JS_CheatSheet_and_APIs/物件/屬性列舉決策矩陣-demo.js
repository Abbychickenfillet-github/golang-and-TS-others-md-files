/**
 * 屬性列舉決策矩陣 demo
 * 用法：node 屬性列舉決策矩陣-demo.js
 * 對應筆記：屬性列舉決策矩陣-keys與getOwnPropertyNames與Reflect-ownKeys.md
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(64) + '\n' + t + '\n' + '='.repeat(64));

// ---------- 建立一個四格都有的測試物件 ----------
const sym = Symbol('symKey');
const hiddenSym = Symbol('hiddenSym');
const parent = { inherited: 'from parent' };

const obj = Object.create(parent);
obj.visible = 'V';                                    // 第 1 格：字串＋可列舉
obj[sym] = 'S';                                       // 第 2 格：Symbol＋可列舉
Object.defineProperty(obj, 'hidden', {                // 第 3 格：字串＋不可列舉
  value: 'H', enumerable: false, writable: true, configurable: true,
});
Object.defineProperty(obj, hiddenSym, {               // 第 4 格：Symbol＋不可列舉
  value: 'HS', enumerable: false,
});
obj[2] = 'two';
obj[1] = 'one';

line('c 節｜八種方法的涵蓋範圍');

const forIn = [];
for (const k in obj) forIn.push(k);

console.table([
  { 方法: 'Object.keys',                  輸出: JSON.stringify(Object.keys(obj)),                        看得到: '第 1 格' },
  { 方法: 'Object.values',                輸出: JSON.stringify(Object.values(obj)),                      看得到: '第 1 格' },
  { 方法: 'Object.entries',               輸出: JSON.stringify(Object.entries(obj)),                     看得到: '第 1 格' },
  { 方法: 'for...in',                     輸出: JSON.stringify(forIn),                                   看得到: '第 1 格＋繼承' },
  { 方法: 'Object.getOwnPropertyNames',   輸出: JSON.stringify(Object.getOwnPropertyNames(obj)),         看得到: '第 1＋3 格' },
  { 方法: 'Object.getOwnPropertySymbols', 輸出: String(Object.getOwnPropertySymbols(obj).map(String)),   看得到: '第 2＋4 格' },
  { 方法: 'Reflect.ownKeys',              輸出: String(Reflect.ownKeys(obj).map(String)),                看得到: '四格全包' },
  { 方法: 'JSON.stringify',               輸出: JSON.stringify(obj),                                     看得到: '第 1 格' },
]);

line('d 節｜Object.prototype 有什麼');

const protoNames = Object.getOwnPropertyNames(Object.prototype);
console.log('getOwnPropertyNames 共 ' + protoNames.length + ' 個：');
console.table(protoNames.map((n) => {
  const d = Object.getOwnPropertyDescriptor(Object.prototype, n);
  return {
    成員: n,
    種類: (d.get || d.set) ? 'accessor' : (typeof d.value === 'function' ? 'method' : 'value'),
    writable: d.writable === undefined ? '—' : d.writable,
    enumerable: d.enumerable,
    configurable: d.configurable,
  };
}));
console.log('Object.keys(Object.prototype) →', Object.keys(Object.prototype), '← 全部 enumerable:false');
console.log('Object.getPrototypeOf(Object.prototype) →', Object.getPrototypeOf(Object.prototype), '← 鏈的終點');

line('e 節｜兩種屬性描述器');

console.log('資料描述器 data descriptor：');
console.log('  visible →', Object.getOwnPropertyDescriptor(obj, 'visible'));
console.log('  hidden  →', Object.getOwnPropertyDescriptor(obj, 'hidden'));
console.log('存取器描述器 accessor descriptor：');
console.log('  a       →', Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a'));
console.log('繼承來的拿不到：');
console.log('  inherited →', Object.getOwnPropertyDescriptor(obj, 'inherited'), '← undefined');

line('e-3 節｜為什麼複製物件要用 getOwnPropertyDescriptors');

const withGetter = {
  first: 'Abby',
  last: 'L',
  get full() { return this.first + ' ' + this.last; },
};

const byAssign = Object.assign({}, withGetter);
const byDescriptor = Object.create(
  Object.getPrototypeOf(withGetter),
  Object.getOwnPropertyDescriptors(withGetter)
);

console.log('原物件的 full 是 getter？',
  typeof Object.getOwnPropertyDescriptor(withGetter, 'full').get === 'function');
console.log('Object.assign 之後 full 變成：',
  Object.getOwnPropertyDescriptor(byAssign, 'full'), '← getter 被執行成死值了');
console.log('descriptors 複製之後 full 還是 getter？',
  typeof Object.getOwnPropertyDescriptor(byDescriptor, 'full').get === 'function');

byAssign.first = 'Bob';
byDescriptor.first = 'Bob';
console.log('改 first 之後 → assign 版：', byAssign.full, '｜descriptor 版：', byDescriptor.full);

line('g 節｜鍵的排序規則');

const ord = { b: 1, 2: 1, a: 1, 1: 1, [Symbol('s')]: 1, 10: 1 };
console.log('寫入順序：b, 2, a, 1, Symbol(s), 10');
console.log('Reflect.ownKeys →', Reflect.ownKeys(ord).map(String));
console.log('規則：整數鍵照數字小到大 → 其他字串鍵照寫入順序 → Symbol 最後');
console.log('注意是 1, 2, 10 而不是字串排序的 1, 10, 2');

line('h 節｜實務上最常見的兩個誤用');

console.log('誤用一：以為 Object.keys 拿得到全部');
console.log('  Object.keys(obj).length =', Object.keys(obj).length,
            '｜Reflect.ownKeys(obj).length =', Reflect.ownKeys(obj).length, '← 差 3 個');

console.log('誤用二：用 obj.hasOwnProperty 檢查 null-prototype 物件');
const np = Object.create(null);
np.p = 1;
try {
  np.hasOwnProperty('p');
} catch (e) {
  console.log('  np.hasOwnProperty("p") →', e.constructor.name + '：' + e.message);
}
console.log('  Object.hasOwn(np, "p") →', Object.hasOwn(np, 'p'), '← 靜態方法才安全');
