/**
 * demo-descriptor-json.js
 * 主題：嚴格模式、Property Descriptor、與 JSON 的三方關係
 * 跑法：node demo-descriptor-json.js
 * 實測環境：Node v22.22.2（2026-09-19）
 *
 * 每一段都可以單獨剪下貼到 Chrome DevTools 的 Console 裡跑。
 */

const 段落 = (t) => console.log('\n===== ' + t + ' =====');

/* ------------------------------------------------------------------
 * 段落 a：enumerable 直接決定 JSON.stringify 看不看得到這個 property
 * 白話：我建一個空物件，然後用 defineProperties 一次定義兩個屬性。
 *       name 我把 enumerable 設成 false，age 設成 true。
 *       接著分別用 Object.keys、getOwnPropertyNames、JSON.stringify 去看它。
 *       結果是 keys 跟 JSON 都只看得到 age，只有 getOwnPropertyNames 兩個都看得到。
 * ------------------------------------------------------------------ */
段落('a. enumerable 決定 JSON.stringify 看不看得到');
const a = {};
Object.defineProperties(a, {
  name: { value: 'fillano', writable: false, enumerable: false, configurable: false },
  age: { value: 30, writable: true, enumerable: true, configurable: false },
});
console.log('直接讀 a.name 還是讀得到 =', a.name);           // fillano（不可列舉不等於讀不到）
console.log('Object.keys(a) =', Object.keys(a));             // [ 'age' ]
console.log('getOwnPropertyNames(a) =', Object.getOwnPropertyNames(a)); // [ 'name', 'age' ]
console.log('JSON.stringify(a) =', JSON.stringify(a));       // {"age":30}

/* ------------------------------------------------------------------
 * 段落 b：字面值建立 vs defineProperty 建立，descriptor 預設值完全相反
 * 白話：用 { name: 'fillano' } 這種寫法建立的屬性，三個開關預設全開。
 *       用 Object.defineProperty 而且沒有明講的開關，預設全關。
 *       所以 defineProperty 出來的屬性預設就是「唯讀、不可列舉、不可刪」。
 * ------------------------------------------------------------------ */
段落('b. 兩種建立方式的 descriptor 預設值');
const b1 = { name: 'fillano' };
console.log('字面值   :', JSON.stringify(Object.getOwnPropertyDescriptor(b1, 'name')));
// {"value":"fillano","writable":true,"enumerable":true,"configurable":true}
const b2 = {};
Object.defineProperty(b2, 'name', { value: 'fillano' });
console.log('define   :', JSON.stringify(Object.getOwnPropertyDescriptor(b2, 'name')));
// {"value":"fillano","writable":false,"enumerable":false,"configurable":false}

/* ------------------------------------------------------------------
 * 段落 c：原文第二段範例其實會爆炸
 * 白話：我把 get、set 跟 writable 放在同一個 descriptor 裡面，然後用 try 包起來跑。
 *       規格規定 accessor（get/set）跟 data（value/writable）兩組欄位互斥，
 *       所以它不是「功能更強」，它是直接丟 TypeError。
 * ------------------------------------------------------------------ */
段落('c. get/set 與 writable 同時出現會 TypeError');
try {
  const c = {};
  Object.defineProperties(c, {
    name: { get() { return 1; }, set(v) {}, writable: true, enumerable: true, configurable: false },
  });
  console.log('沒報錯');
} catch (e) {
  console.log(e.constructor.name + '：' + e.message);
  // TypeError：Invalid property descriptor. Cannot both specify accessors and a value or writable attribute
}

/* ------------------------------------------------------------------
 * 段落 d：getter 會不會被 JSON.stringify 真的呼叫
 * 白話：我掛一個 getter，每被讀一次就把計數器加一，然後只做一次 stringify。
 *       計數器變成 1，代表 stringify 真的去讀了 getter，把回傳值寫進 JSON。
 *       第二個例子只給 setter 沒給 getter，讀出來是 undefined，JSON 直接把整個 key 丟掉。
 * ------------------------------------------------------------------ */
段落('d. getter 會被 stringify 呼叫，只有 setter 的則整個消失');
let 讀取次數 = 0;
const d1 = {};
Object.defineProperty(d1, 'name', {
  get() { 讀取次數++; return 'fillano'; },
  enumerable: true, configurable: true,
});
console.log('JSON =', JSON.stringify(d1), '｜ getter 被讀次數 =', 讀取次數); // {"name":"fillano"} 1
const d2 = {};
Object.defineProperty(d2, 'onlySetter', { set(v) {}, enumerable: true });
console.log('只有 setter =', JSON.stringify(d2)); // {}

/* ------------------------------------------------------------------
 * 段落 e：JSON 這一側自己的三個攔截點 toJSON / replacer / reviver
 * 白話：toJSON 是物件自己決定「我要變成什麼樣子再進 JSON」，
 *       跟 getter 是同一個概念，只是攔截的時機在序列化那一刻。
 *       Date 之所以會變成字串，就是因為 Date.prototype.toJSON 存在。
 * ------------------------------------------------------------------ */
段落('e. toJSON / replacer / reviver');
class Money {
  constructor(v) { this.v = v; }
  toJSON() { return this.v + ' TWD'; }
}
console.log('toJSON  :', JSON.stringify({ price: new Money(100) }));      // {"price":"100 TWD"}
console.log('Date    :', JSON.stringify({ t: new Date(0) }));             // {"t":"1970-01-01T00:00:00.000Z"}
console.log('replacer:', JSON.stringify({ a: 1, secret: 'x' }, (k, v) => (k === 'secret' ? undefined : v)));
console.log('reviver :', JSON.parse('{"n":"3"}', (k, v) => (k === 'n' ? Number(v) : v)));

/* ------------------------------------------------------------------
 * 段落 f：JSON round-trip 會把 descriptor 全部洗回預設值
 * 白話：我把一個屬性先 stringify 再 parse 回來，然後看它的 descriptor。
 *       原本設成 writable:false 之類的設定完全不見，三個開關全部變回 true。
 *       因為 JSON 格式裡根本沒有地方可以寫 descriptor。
 * ------------------------------------------------------------------ */
段落('f. round-trip 之後 descriptor 被洗掉');
const f0 = {};
Object.defineProperty(f0, 'age', { value: 30, writable: false, enumerable: true, configurable: false });
const f1 = JSON.parse(JSON.stringify(f0));
console.log('原本 :', JSON.stringify(Object.getOwnPropertyDescriptor(f0, 'age')));
console.log('回來 :', JSON.stringify(Object.getOwnPropertyDescriptor(f1, 'age')));
// 回來 : {"value":30,"writable":true,"enumerable":true,"configurable":true}

/* ------------------------------------------------------------------
 * 段落 g：JSON.parse 用「定義語意」，賦值用「設定語意」
 * 白話：JSON.parse 內部用的是 CreateDataProperty，等同 defineProperty，
 *       所以 "__proto__" 這個 key 會變成一個真的 own property，原型沒被動到。
 *       但如果我用 p2.__proto__ = {...} 這種賦值寫法，就會走到 Object.prototype 上的
 *       setter，真的把原型換掉，own keys 反而是空的。
 * ------------------------------------------------------------------ */
段落('g. __proto__ 的兩種語意差異');
const g1 = JSON.parse('{"__proto__": {"hacked": 1}}');
console.log('parse  own keys =', Object.getOwnPropertyNames(g1));                       // [ '__proto__' ]
console.log('parse  有 own 嗎 =', Object.prototype.hasOwnProperty.call(g1, '__proto__')); // true
const g2 = {};
g2.__proto__ = { hacked: 1 };
console.log('賦值   own keys =', Object.getOwnPropertyNames(g2), '｜ g2.hacked =', g2.hacked); // [] 1

/* ------------------------------------------------------------------
 * 段落 h：JSON 表達不了的東西
 * 白話：函式、undefined、Symbol 直接整個 key 消失；NaN 跟 Infinity 變成 null；
 *       循環參考直接丟 TypeError。這就是為什麼深拷貝不該偷懶用 JSON。
 * ------------------------------------------------------------------ */
段落('h. JSON 表達不了的東西');
console.log(JSON.stringify({ f() {}, u: undefined, s: Symbol('x'), n: NaN, i: Infinity, ok: 1 }));
// {"n":null,"i":null,"ok":1}
try {
  const h = {}; h.self = h; JSON.stringify(h);
} catch (e) {
  console.log(e.constructor.name + '：' + e.message.split('\n')[0]); // TypeError：Converting circular structure to JSON
}

/* ------------------------------------------------------------------
 * 段落 i：原文說「函數.call(null) 會產生錯誤」其實不對
 * 白話：非嚴格模式下 this 被自動裝箱換成 globalThis，嚴格模式下 this 就乖乖維持 null，
 *       但兩種情況都不會丟錯。
 * ------------------------------------------------------------------ */
段落('i. 嚴格模式的 this 不會丟錯，只是不再自動裝箱');
function sloppy() { return this; }
console.log('sloppy.call(null) ->', String(sloppy.call(null)));   // [object global]
function strictFn() { 'use strict'; return this; }
console.log('strict.call(null) ->', String(strictFn.call(null))); // null

/* ------------------------------------------------------------------
 * 段落 j：原文說「物件不可有同名的屬性」在 ES6 之後已經被放寬
 * 白話：物件字面值重複 key 在嚴格模式下也不報錯了，後面的蓋掉前面的。
 *       但函式的重複參數名在嚴格模式下仍然是 SyntaxError。
 * ------------------------------------------------------------------ */
段落('j. 重複 key 已放寬，重複參數名仍禁止');
console.log('重複 key   ->', JSON.stringify(eval('"use strict"; ({x:1, x:2})'))); // {"x":2}
try { eval('"use strict"; function f(a, a){}'); } catch (e) {
  console.log('重複參數名 ->', e.constructor.name + '：' + e.message);
}

/* ------------------------------------------------------------------
 * 段落 k：嚴格模式讓 descriptor 的違規從「靜靜失敗」變成「大聲報錯」
 * 白話：寫入一個 writable:false 的屬性，非嚴格模式什麼都不說就吞掉，
 *       嚴格模式會丟 TypeError。這是 strict mode 跟 descriptor 最直接的交集。
 * ------------------------------------------------------------------ */
段落('k. 嚴格模式把靜默失敗變成 TypeError');
const k = {};
Object.defineProperty(k, 'v', { value: 1, writable: false, enumerable: true });
k.v = 999;
console.log('非嚴格模式，靜靜失敗 k.v =', k.v); // 1
try { (function () { 'use strict'; k.v = 999; })(); } catch (e) {
  console.log('嚴格模式 ->', e.constructor.name + '：' + e.message);
}

/* ------------------------------------------------------------------
 * 段落 l：key 的順序規則，Object.keys 跟 JSON.stringify 完全一致
 * 白話：像整數的 key 先照數字大小升冪排，其餘字串 key 照插入順序。
 * ------------------------------------------------------------------ */
段落('l. key 的順序');
const l = { b: 1, 2: 1, a: 1, 1: 1 };
console.log('Object.keys =', Object.keys(l), '｜ JSON =', JSON.stringify(l));
// [ '1', '2', 'b', 'a' ] {"1":1,"2":1,"b":1,"a":1}

console.log('\nNode 版本：', process.version);
