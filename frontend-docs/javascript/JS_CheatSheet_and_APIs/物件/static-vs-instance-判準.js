/**
 * 靜態方法 vs 實例方法：一個判準、兩個盒子
 * 用法：node static-vs-instance-判準.js
 * 對應筆記：Object靜態方法速查.md 的「兩個盒子」章節
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(60) + '\n' + t + '\n' + '='.repeat(60));

line('0. 核心概念：Object 與 Object.prototype 是「兩個不同的物件」');

console.log('Object === Object.prototype ?', Object === Object.prototype);
console.log('typeof Object           =', typeof Object, '　← 建構函式，它是個 function');
console.log('typeof Object.prototype =', typeof Object.prototype, '　← 它是個 plain object');
console.log();
console.log('靜態成員住左邊那個盒子：Object.getOwnPropertyNames(Object).length =',
  Object.getOwnPropertyNames(Object).length);
console.log('實例成員住右邊那個盒子：Object.getOwnPropertyNames(Object.prototype).length =',
  Object.getOwnPropertyNames(Object.prototype).length);
console.log('\n→ 所以「東西在哪個盒子裡」就決定了它是靜態還是實例。');
console.log('   Object.hasOwn(哪個盒子, "名字") 就是拿來問這件事的尺。');

line('1. 用同一把尺量兩個盒子，就知道東西住哪');

const probe = (holder, holderName, key) => {
  const inCtor = Object.hasOwn(holder, key);
  const inProto = Object.hasOwn(holder.prototype || {}, key);
  console.log(
    (holderName + '.' + key).padEnd(28) +
    '建構函式上 ' + String(inCtor).padEnd(6) +
    '｜prototype 上 ' + String(inProto).padEnd(6) +
    '→ ' + (inCtor ? '靜態方法' : inProto ? '實例方法' : '兩邊都沒有')
  );
};

probe(Object, 'Object', 'assign');
probe(Object, 'Object', 'keys');
probe(Object, 'Object', 'hasOwn');
probe(Object, 'Object', 'hasOwnProperty');
probe(Object, 'Object', '__proto__');
console.log();
probe(Map, 'Map', 'set');
probe(Map, 'Map', 'get');
probe(Map, 'Map', 'groupBy');
console.log();
probe(Array, 'Array', 'isArray');
probe(Array, 'Array', 'from');
probe(Array, 'Array', 'push');
probe(Array, 'Array', 'map');

line('2. 為什麼是 map.set(...) 不是 Map.set(...)');

console.log('Object.hasOwn(Map.prototype, "set") =', Object.hasOwn(Map.prototype, 'set'), '← 住在 prototype');
console.log('Object.hasOwn(Map,           "set") =', Object.hasOwn(Map, 'set'), '← Map 身上根本沒有');
console.log('typeof Map.set =', typeof Map.set);

const m = new Map();
try { Map.set(m, 'a', 1); }
catch (e) { console.log('\nMap.set(m, "a", 1) →', e.constructor.name + '：' + e.message); }

console.log('\n正確寫法：');
m.set('a', 1);
console.log('  m.set("a", 1) 之後 m.get("a") =', m.get('a'));

line('3. 判準：這個方法需不需要知道「對誰做」');

console.log('實例方法：需要。那個「誰」就是 this，寫在點的左邊。');
console.log('  map.set("a", 1)');
console.log('   ↑                ← 這個 map 就是 this，告訴 set「要塞進哪一個 Map」');
console.log();
console.log('靜態方法：不需要。所有資訊都當參數傳進去。');
console.log('  Object.assign(target, source)');
console.log('         ↑                       ← Object 只是命名空間，不是操作對象');
console.log();
console.log('把「誰」拿掉就爆炸 → 那就是實例方法：');
const detached = m.set;
try { detached('c', 3); }
catch (e) { console.log('  const f = m.set; f("c", 3) →', e.constructor.name + '：' + e.message); }
console.log('  <- 訊息裡的 incompatible receiver 就是在說「this 不對」');
console.log();
console.log('靜態方法拆下來完全沒事：');
const assign = Object.assign;
console.log('  const f = Object.assign; f({}, {a:1}) =', JSON.stringify(assign({}, { a: 1 })));

line('4. 反證：實例方法可以「借」給別的物件用');

console.log('既然 map 只是 this，那就可以用 .call() 手動指定：');
Map.prototype.set.call(m, 'b', 2);
console.log('  Map.prototype.set.call(m, "b", 2) → m.get("b") =', m.get('b'), '｜m.size =', m.size);
console.log('\n這跟 React 原始碼裡那招是同一件事：');
console.log('  var hasOwnProperty = Object.prototype.hasOwnProperty;');
console.log('  hasOwnProperty.call(config, propName)');
console.log('  ← 把實例方法從 prototype 借出來，用 .call 硬指定 this 是 config');

line('5. 同一個建構函式上可以兩種都有');

console.log('Map 建構函式身上的靜態成員：', Object.getOwnPropertyNames(Map).join(', '));
console.log('  Map.groupBy 是靜態方法（ES2024）：', typeof Map.groupBy);
console.log();
const people = [{ n: 'Abby', age: 20 }, { n: 'Bob', age: 30 }, { n: 'Cat', age: 20 }];
const grouped = Map.groupBy(people, (p) => p.age);
console.log('  Map.groupBy(people, p => p.age) →');
for (const [k, v] of grouped) console.log('    ' + k + ' → ' + v.map((p) => p.n).join(', '));
console.log('\n  注意寫法：Map.groupBy(資料, callback)　資料當「參數」傳進去 → 靜態');
console.log('           grouped.get(20)　　　　　　　grouped 在點的左邊 → 實例');

line('6. 回到 __proto__');

const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
console.log('Object.hasOwn(Object.prototype, "__proto__") =', Object.hasOwn(Object.prototype, '__proto__'));
console.log('Object.hasOwn(Object,           "__proto__") =', Object.hasOwn(Object, '__proto__'));
console.log('→ 住在右邊的盒子 → 不是靜態');
console.log('typeof d.value =', typeof d.value, '｜typeof d.get =', typeof d.get);
console.log('→ 沒有 value、有 get 與 set → 也不是方法，是存取器屬性');
console.log();
console.log('對照 Object.getPrototypeOf：');
console.log('Object.hasOwn(Object, "getPrototypeOf") =', Object.hasOwn(Object, 'getPrototypeOf'), '← 住在左邊的盒子 → 靜態方法');
