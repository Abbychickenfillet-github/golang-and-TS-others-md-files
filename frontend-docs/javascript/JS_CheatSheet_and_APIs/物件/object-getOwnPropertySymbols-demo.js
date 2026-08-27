/**
 * Object.getOwnPropertySymbols｜靜態方法的角度
 * 用法：node object-getOwnPropertySymbols-demo.js
 *
 * 這一份的主題是「哪個列舉方法看得到 Symbol 鍵」，
 * 不是「Symbol 本身怎麼運作」——那個在 JS_Core_and_Runtime/物件/symbol-vs-symbol-for-demo.js
 *
 * 對應筆記：Object靜態方法速查.md、屬性列舉決策矩陣-...md
 */

const line = (t) => console.log('\n' + '═'.repeat(62) + '\n' + t + '\n' + '═'.repeat(62));

line('1. 建立一個四種 key 都有的物件');

const symA = Symbol('a');
const symB = Symbol('b');

const obj = {};
obj.visible = '字串＋可列舉';                                    // 第 1 格
obj[symA] = 'Symbol＋可列舉';                                    // 第 2 格
Object.defineProperty(obj, 'hidden', {                          // 第 3 格
  value: '字串＋不可列舉', enumerable: false, configurable: true,
});
Object.defineProperty(obj, symB, {                              // 第 4 格
  value: 'Symbol＋不可列舉', enumerable: false,
});

console.log('放了 4 個屬性，分別落在決策矩陣的四格。');

line('2. 每個方法看得到幾個');

const forIn = [];
for (const k in obj) forIn.push(k);

console.table([
  { 方法: 'Object.keys',                  結果: JSON.stringify(Object.keys(obj)),                        看得到: '第 1 格' },
  { 方法: 'Object.values',                結果: JSON.stringify(Object.values(obj)),                      看得到: '第 1 格' },
  { 方法: 'Object.entries',               結果: JSON.stringify(Object.entries(obj)),                     看得到: '第 1 格' },
  { 方法: 'for...in',                     結果: JSON.stringify(forIn),                                   看得到: '第 1 格＋繼承' },
  { 方法: 'Object.getOwnPropertyNames',   結果: JSON.stringify(Object.getOwnPropertyNames(obj)),         看得到: '第 1＋3 格' },
  { 方法: 'Object.getOwnPropertySymbols', 結果: String(Object.getOwnPropertySymbols(obj).map(String)),   看得到: '第 2＋4 格' },
  { 方法: 'Reflect.ownKeys',              結果: String(Reflect.ownKeys(obj).map(String)),                看得到: '四格全包' },
  { 方法: 'JSON.stringify',               結果: JSON.stringify(obj),                                     看得到: '第 1 格' },
]);

console.log('重點：Symbol 鍵只有 getOwnPropertySymbols 與 Reflect.ownKeys 撈得到。');
console.log('     keys、getOwnPropertyNames、JSON.stringify 全部看不到。');

line('3. 這就是 Symbol 常被拿來當「半私有欄位」的原因');

const 使用者資料 = { name: 'Abby', age: 20 };
const 內部快取 = Symbol('cache');
使用者資料[內部快取] = { 上次更新: '2026-08-20' };

console.log('Object.keys(使用者資料)     =', JSON.stringify(Object.keys(使用者資料)));
console.log('JSON.stringify(使用者資料)  =', JSON.stringify(使用者資料));
console.log('→ 傳給後端、印 log、for...in 都不會漏出去');
console.log('   但知道那個 Symbol 的人拿得到：', JSON.stringify(使用者資料[內部快取]));
console.log('\n注意是「半」私有 —— getOwnPropertySymbols 還是撈得出來：');
console.log('  ', Object.getOwnPropertySymbols(使用者資料).map(String));
console.log('真正的私有要用 class 的 # 欄位或閉包。');

line('4. 常見誤會：以為 length 會是 2');

console.log('如果你只放了一個 Symbol 進去，length 當然就是 1：');
const o = {};
const s1 = Symbol('a');
const s2 = Symbol('b');
// o[s1] = 'async';        ← 這行如果註解掉
o[s2] = 'await';
console.log('  Object.getOwnPropertySymbols(o).length =', Object.getOwnPropertySymbols(o).length);
console.log('  o[s1] =', o[s1], '← 根本沒放進去，所以是 undefined');
console.log('\n把兩個都放進去：');
o[s1] = 'async';
console.log('  length =', Object.getOwnPropertySymbols(o).length);
console.log('  順序   =', Object.getOwnPropertySymbols(o).map(String), '← 照寫入順序');

line('5. Symbol 鍵的順序在 Reflect.ownKeys 裡永遠排最後');

const ord = { b: 1, 2: 1, a: 1, 1: 1, [Symbol('s')]: 1, 10: 1 };
console.log('寫入順序：b, 2, a, 1, Symbol(s), 10');
console.log('Reflect.ownKeys →', Reflect.ownKeys(ord).map(String));
console.log('規則：整數鍵照數字小到大 → 其他字串鍵照寫入順序 → Symbol 最後');
