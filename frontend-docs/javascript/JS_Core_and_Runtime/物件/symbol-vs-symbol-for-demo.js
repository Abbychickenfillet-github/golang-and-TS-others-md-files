/**
 * Symbol() vs Symbol.for()｜Symbol 本身的角度
 * 用法：node symbol-vs-symbol-for-demo.js
 *
 * 這一份的主題是「Symbol 這個型別怎麼運作」，
 * 不是「哪個方法撈得到 Symbol 鍵」——那個在 JS_CheatSheet_and_APIs/物件/object-getOwnPropertySymbols-demo.js
 *
 * 對應筆記：Symbol-符號型別與物件key.md
 */

const line = (t) => console.log('\n' + '═'.repeat(62) + '\n' + t + '\n' + '═'.repeat(62));

line('1. 核心差別：Symbol() 每次都是新的，Symbol.for() 會查登錄表');

const s1 = Symbol('key');
const s2 = Symbol('key');
console.log('Symbol("key") === Symbol("key")          →', s1 === s2);
console.log('  ← false。描述 "key" 只是給人看的標籤，不是身分證');

const g1 = Symbol.for('key');
const g2 = Symbol.for('key');
console.log('\nSymbol.for("key") === Symbol.for("key")  →', g1 === g2);
console.log('  ← true。for 會去「全域 Symbol 登錄表」查，有就拿舊的，沒有才建新的');

console.log('\nSymbol("key") === Symbol.for("key")      →', s1 === g1);
console.log('  ← false。兩套系統完全不相通');

line('2. 三個東西都叫 key，但是三個不同的身分');

console.log('s1 =', String(s1), '｜s1.description =', JSON.stringify(s1.description));
console.log('s2 =', String(s2), '｜s2.description =', JSON.stringify(s2.description));
console.log('g1 =', String(g1), '｜g1.description =', JSON.stringify(g1.description));
console.log('印出來一模一樣，但 s1 !== s2 !== g1，三個都是不同的 Symbol');

line('3. Symbol.keyFor 只認得登錄表裡的');

console.log('Symbol.keyFor(Symbol.for("key")) =', JSON.stringify(Symbol.keyFor(g1)), '← 查得到');
console.log('Symbol.keyFor(Symbol("key"))     =', Symbol.keyFor(s1), '← undefined，不在登錄表裡');
console.log('\n這是判斷「這個 Symbol 是不是全域的」最直接的方法。');

line('4. 什麼時候用哪一個');

console.table([
  { 寫法: 'Symbol(desc)',     身分: '每次都全新', 適合: '模組內部的私有 key、避免撞名', 例子: '內部快取欄位' },
  { 寫法: 'Symbol.for(key)',  身分: '全域共用一份', 適合: '跨模組、跨 iframe 要對得起來', 例子: '跨套件的協定欄位' },
]);

console.log('經驗法則：預設用 Symbol()。');
console.log('只有在「不同檔案、不同套件要拿到同一個 Symbol」時才用 Symbol.for()。');

line('5. 跨檔案的差別（用兩個變數模擬）');

// 模組 A 與模組 B 各自建立
function 模組A用Symbol()      { return Symbol('shared'); }
function 模組B用Symbol()      { return Symbol('shared'); }
function 模組A用SymbolFor()   { return Symbol.for('shared'); }
function 模組B用SymbolFor()   { return Symbol.for('shared'); }

console.log('兩個模組各自寫 Symbol("shared")：');
console.log('  對得起來嗎 →', 模組A用Symbol() === 模組B用Symbol(), '← 對不起來，各自為政');
console.log('兩個模組各自寫 Symbol.for("shared")：');
console.log('  對得起來嗎 →', 模組A用SymbolFor() === 模組B用SymbolFor(), '← 對得起來');

const proto = {};
proto[模組A用SymbolFor()] = '模組 A 寫進去的';
console.log('\n模組 B 用自己的 Symbol.for 讀得到嗎 →',
  JSON.stringify(proto[模組B用SymbolFor()]));

line('6. Symbol 當 key 的基本性質');

const o = {};
const sym = Symbol('mySym');
o[sym] = '值';
o.normal = '一般字串 key';

console.log('typeof sym            =', typeof sym, '← 它是一種原始型別，跟 string、number 平行');
console.log('o[sym]                =', o[sym]);
console.log('Object.keys(o)        =', JSON.stringify(Object.keys(o)), '← Symbol 鍵看不到');
console.log('JSON.stringify(o)     =', JSON.stringify(o), '← 也不會被序列化');
console.log('Object.getOwnPropertySymbols(o) =', Object.getOwnPropertySymbols(o).map(String));

console.log('\n物件的 key 只有兩種型別：字串與 Symbol。');
console.log('其他任何值當 key 都會被隱式轉成字串：');
const o2 = {};
o2[1] = 'a';
o2[{}] = 'b';
console.log('  o2[1] 之後 Object.keys(o2) 有 "1" 這個字串 →', Object.keys(o2));
console.log('  o2[{}] 變成 "[object Object]"，兩個不同的物件當 key 會互相蓋掉');
console.log('  → 這就是需要 Map 的理由，Map 的 key 可以是任意型別');

line('7. 常見誤會');

console.log('誤會一：以為 description 一樣就是同一個 Symbol');
console.log('  → 錯。description 只是標籤，Symbol("a") 每次都是新的身分');
console.log('\n誤會二：以為 Symbol 是「真正的私有」');
console.log('  → 錯。Object.getOwnPropertySymbols 撈得出來，只是「半私有」');
console.log('  → 真正的私有要用 class 的 # 欄位或閉包');
console.log('\n誤會三：以為可以 new Symbol()');
try { new Symbol('x'); }
catch (e) { console.log('  new Symbol("x") →', e.constructor.name + '：' + e.message); }
console.log('  → Symbol 是原始型別，不是建構函式。就像你不會寫 new 3');
