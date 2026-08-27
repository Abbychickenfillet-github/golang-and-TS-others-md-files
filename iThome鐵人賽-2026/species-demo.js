/**
 * Symbol.species 實測腳本
 * 對應文章：Map-Symbol-species-規範裡沒人用的屬性.md
 * 執行：node species-demo.js
 */
const line = (t) => console.log('\n' + '='.repeat(50) + '\n' + t + '\n' + '='.repeat(50));

line('Part 1｜哪些內建類別有 Symbol.species');
for (const [name, C] of Object.entries({ Array, Map, Set, RegExp, Promise, ArrayBuffer })) {
  const d = Object.getOwnPropertyDescriptor(C, Symbol.species);
  console.log('  ' + name.padEnd(12), d ? 'YES  預設回傳自己 = ' + (C[Symbol.species] === C) : 'NO');
}

line('Part 2｜Array 的 species 真的會被用到');
class MyArray extends Array {}
const ma = new MyArray(1, 2, 3);
console.log('  MyArray().map() 回傳 MyArray ?', ma.map(x => x * 2) instanceof MyArray);

class PlainArray extends Array {
  static get [Symbol.species]() { return Array; }
}
const pa = new PlainArray(1, 2, 3);
console.log('  覆寫 species 後回傳普通 Array ?', !(pa.map(x => x) instanceof PlainArray));

line('Part 3｜Map 的 species 從來沒被呼叫過');
let called = 0;
class MyMap extends Map {
  static get [Symbol.species]() { called++; return Map; }
}
const mm = new MyMap([['a', 1]]);
mm.set('b', 2); mm.get('a'); mm.has('a'); mm.delete('b'); mm.forEach(() => {});
[...mm.entries()]; [...mm.keys()]; [...mm.values()];
console.log('  跑完 8 種 Map 操作，species getter 被呼叫', called, '次');
console.log('  原因：沒有任何 Map 方法會建立並回傳新的 Map');

line('Part 4｜ES2025 的 Set 新方法也不用 species');
let setCalled = 0;
class MySet extends Set {
  static get [Symbol.species]() { setCalled++; return Set; }
}
const s1 = new MySet([1, 2, 3]);
if (typeof s1.union === 'function') {
  const u = s1.union(new Set([4]));
  console.log('  union() 回傳 MySet ?', u instanceof MySet);
  console.log('  species 被呼叫', setCalled, '次');
  console.log('  → 新方法直接回傳普通 Set，完全繞過 species');
} else {
  console.log('  這個 Node 版本還沒有 Set.prototype.union，請升級到 Node 22 以上');
}

console.log('\nNode 版本:', process.version, '\n');
