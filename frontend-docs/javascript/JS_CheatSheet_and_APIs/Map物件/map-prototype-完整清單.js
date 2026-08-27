/**
 * Map.prototype 完整清單
 * 用法：node map-prototype-完整清單.js
 * 對應筆記：Map.prototype完整清單-實例方法與存取器.md
 *
 * 注意：getOrInsert 這類實驗性 API 的可用性會隨環境與時間改變，
 *      請以你自己跑出來的結果為準，不要照抄筆記裡的數字。
 */

const line = (t) => console.log('\n' + '='.repeat(64) + '\n' + t + '\n' + '='.repeat(64));

console.log('執行環境：Node ' + process.version + '｜V8 ' + process.versions.v8);

line('a. 先證明「所有實例共享同一份方法」');

const m1 = new Map();
const m2 = new Map();
console.log('m1.set === m2.set                 →', m1.set === m2.set, '← 兩個實例拿到同一份');
console.log('m1.set === Map.prototype.set      →', m1.set === Map.prototype.set, '← 就是原型上那一份');
console.log('Object.hasOwn(m1, "set")          →', Object.hasOwn(m1, 'set'), '← 實例身上沒有，是繼承來的');

line('b. 數不完整的陷阱');

console.log('Object.keys(Map.prototype)                  →',
  JSON.stringify(Object.keys(Map.prototype)), '← 空的，全部 enumerable:false');
console.log('Object.getOwnPropertyNames(Map.prototype)   →',
  Object.getOwnPropertyNames(Map.prototype).length, '個（漏掉 Symbol 鍵）');
console.log('Object.getOwnPropertySymbols(Map.prototype) →',
  Object.getOwnPropertySymbols(Map.prototype).length, '個');
console.log('Reflect.ownKeys(Map.prototype)              →',
  Reflect.ownKeys(Map.prototype).length, '個 ← 這才完整');

line('c. 完整清單，逐一標種類');

console.table(Reflect.ownKeys(Map.prototype).map((k) => {
  const d = Object.getOwnPropertyDescriptor(Map.prototype, k);
  let kind, detail;
  if (d.get || d.set) {
    kind = 'accessor 存取器';
    detail = (d.get ? 'get' : '') + (d.set ? ' set' : ' 只有 get 唯讀');
  } else if (typeof d.value === 'function') {
    kind = 'method 方法';
    detail = '參數 ' + d.value.length + ' 個';
  } else {
    kind = 'value 值';
    detail = JSON.stringify(d.value);
  }
  return { 成員: String(k), 種類: kind, 細節: detail, enumerable: d.enumerable };
}));

line('c-1. size 是存取器不是方法');

const m = new Map([['a', 1], ['b', 2]]);
console.log('m.size   =', m.size, '← 沒有括號');
try { m.size(); } catch (e) { console.log('m.size() →', e.constructor.name + '：' + e.message); }

const sd = Object.getOwnPropertyDescriptor(Map.prototype, 'size');
console.log('描述器：get =', typeof sd.get, '｜set =', typeof sd.set, '← 只有 get，唯讀');

console.log('\n對照 Array 的 length 是「資料屬性」，可以寫：');
const arr = [1, 2, 3];
arr.length = 0;
console.log('  arr.length = 0 之後 arr =', arr, '← 真的被清空了');
m.size = 99;
console.log('  m.size = 99 之後 m.size =', m.size, '← 沒有用，唯讀存取器');

line('c-2. Symbol.iterator 就是 entries');

console.log('Map.prototype[Symbol.iterator] === Map.prototype.entries →',
  Map.prototype[Symbol.iterator] === Map.prototype.entries);
console.log('所以 for...of 走 map 拿到的是 [key, value] 配對：');
for (const pair of m) console.log('  ', JSON.stringify(pair));
console.log('順手解構就好讀了：');
for (const [k, v] of m) console.log('  ', k, '→', v);

line('c-3. Symbol.toStringTag 是「值」不是方法');

console.log('Map.prototype[Symbol.toStringTag] =', JSON.stringify(Map.prototype[Symbol.toStringTag]));
console.log('Object.prototype.toString.call(m) =', Object.prototype.toString.call(m));
console.log('→ 那個 [object Map] 裡的 Map 就是從這裡讀來的');

line('d. 那兩個帶問號的實驗性方法，在你的環境有嗎');

['clear', 'delete', 'entries', 'forEach', 'get', 'has', 'keys', 'set', 'values', 'size',
 'getOrInsert', 'getOrInsertComputed'].forEach((n) => {
  const exists = n in Map.prototype;
  const d = exists ? Object.getOwnPropertyDescriptor(Map.prototype, n) : null;
  const kind = !exists ? '' : (d.get || d.set) ? '（存取器，不加括號）' : '（方法）';
  console.log('  ' + n.padEnd(22) + (exists ? '✔ 有 ' + kind : '✘ 沒有 ← MDN 標為 Experimental'));
});

console.log('\n判斷一個 API 能不能用的三個方法：');
console.log('  a. 看 MDN 頁面頂端有沒有 Experimental 或 Baseline 未廣泛可用的標記');
console.log('  b. 直接測：\'方法名\' in Map.prototype');
console.log('  c. 查 caniuse 或 MDN 的 Browser compatibility 表');
console.log('注意：VS Code 提示得出來 ≠ 跑得起來，TypeScript 的型別定義可能比執行環境新');

line('e. Map 建構函式身上（靜態）');

console.log('Object.getOwnPropertyNames(Map)   =', Object.getOwnPropertyNames(Map).join(', '));
console.log('Object.getOwnPropertySymbols(Map) =', Object.getOwnPropertySymbols(Map).map(String).join(', '));

const people = [{ n: 'Abby', age: 20 }, { n: 'Bob', age: 30 }, { n: 'Cat', age: 20 }];
const grouped = Map.groupBy(people, (p) => p.age);
console.log('\nMap.groupBy(people, p => p.age)   ← 靜態：資料當參數傳進去');
for (const [k, v] of grouped) console.log('  ', k, '→', v.map((p) => p.n).join(', '));
console.log('grouped.get(20)                   ← 實例：grouped 在點的左邊');
console.log('  =', grouped.get(20).map((p) => p.n).join(', '));

line('f. Map 實例的完整原型鏈');

console.log('Object.getPrototypeOf(m) === Map.prototype                 →',
  Object.getPrototypeOf(m) === Map.prototype);
console.log('Object.getPrototypeOf(Map.prototype) === Object.prototype  →',
  Object.getPrototypeOf(Map.prototype) === Object.prototype);
console.log('\n完整鏈：m → Map.prototype → Object.prototype → null（3 階）');
console.log('所以 Map 不是 plain object，但仍繼承得到 Object.prototype 的東西：');
console.log('  typeof m.hasOwnProperty =', typeof m.hasOwnProperty, '← 從第 2 階來的');

line('g. Map vs plain object 的關鍵差異');

const objKey = { id: 1 };
const mm = new Map();
mm.set(objKey, '用物件當 key');
mm.set(NaN, '用 NaN 當 key');
console.log('Map 可以用任意型別當 key：');
console.log('  mm.get(objKey) =', mm.get(objKey));
console.log('  mm.get(NaN)    =', mm.get(NaN), '← NaN 也可以，SameValueZero');

const o = {};
o[objKey] = '塞進 plain object';
console.log('\nplain object 的 key 會被轉成字串：');
console.log('  Object.keys(o) =', Object.keys(o), '← 變成 "[object Object]"');
console.log('  兩個不同的物件當 key 會互相蓋掉，這就是需要 Map 的理由');

console.log('\nJSON 序列化：');
console.log('  JSON.stringify(m) =', JSON.stringify(m), '← Map 序列化不出來');
console.log('  要序列化得先轉：JSON.stringify([...m]) =', JSON.stringify([...m]));
