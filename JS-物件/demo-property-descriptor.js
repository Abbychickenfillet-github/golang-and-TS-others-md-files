/**
 * demo-property-descriptor.js
 * 主題：物件的 property descriptor 六個欄位，以及 writable 與 get/set 的分工
 * 跑法：node demo-property-descriptor.js
 * 實測環境：Node v22.22.2（2026-09-20）
 * 每一段都可以單獨剪下貼到 Chrome DevTools 的 Console 裡跑。
 */

const 段落 = (t) => console.log('\n===== ' + t + ' =====');

/* ------------------------------------------------------------------
 * 段落 a：原文那個物件，以及 a.name 是不是必定永遠是 fillano
 * 白話：我建一個空物件，把 name 設成 writable:false + configurable:false，
 *       然後用四種方式試著改它 —— 賦值、嚴格模式賦值、delete、重新 defineProperty，
 *       結果四種全部失敗，所以它是貨真價實的常數屬性。
 * ------------------------------------------------------------------ */
段落('a. a.name 是不是必定永遠是 fillano');
const a = {};
Object.defineProperties(a, {
  name: { value: 'fillano', writable: false, enumerable: false, configurable: false },
  age: { value: 30, writable: true, enumerable: true, configurable: false },
});
a.name = '改掉';
console.log('非嚴格模式賦值後   ->', a.name, '（靜靜失敗）');
try { (function () { 'use strict'; a.name = '改掉'; })(); }
catch (e) { console.log('嚴格模式賦值      ->', e.constructor.name + '：' + e.message); }
delete a.name;
console.log('delete 之後        ->', a.name);
try { Object.defineProperty(a, 'name', { value: 'X' }); }
catch (e) { console.log('再 defineProperty ->', e.constructor.name + '：' + e.message); }
console.log('結論：a.name 永遠是', a.name);

/* ------------------------------------------------------------------
 * 段落 b：但如果 configurable 是 true，writable:false 其實鎖不住
 * 白話：configurable 只要開著，別人就能用 defineProperty 重新給一次值繞過 writable。
 *       所以「真正的常數屬性」需要 writable 跟 configurable 兩個都關掉。
 * ------------------------------------------------------------------ */
段落('b. writable:false + configurable:true 鎖不住');
const b = {};
Object.defineProperty(b, 'name', { value: 'fillano', writable: false, enumerable: true, configurable: true });
Object.defineProperty(b, 'name', { value: '被改掉了' });
console.log('b.name =', b.name, '← configurable 開著就繞過去了');

/* ------------------------------------------------------------------
 * 段落 c：enumerable:false 到底讓「誰」看不見
 * 白話：我把同一個物件丟給七種列舉類操作跟六種直接詢問類操作，
 *       列舉類全部看不到 name，直接問的全部看得到。
 *       所以 enumerable:false 是「不參與列舉」，不是「不存在」。
 * ------------------------------------------------------------------ */
段落('c. enumerable:false 讓誰看不見');
console.log('--- 看不見的（列舉類）---');
console.log('for...in       :', (() => { const r = []; for (const k in a) r.push(k); return r; })());
console.log('Object.keys    :', Object.keys(a));
console.log('Object.values  :', Object.values(a));
console.log('Object.entries :', Object.entries(a));
console.log('JSON.stringify :', JSON.stringify(a));
console.log('展開 {...a}     :', JSON.stringify({ ...a }));
console.log('Object.assign  :', JSON.stringify(Object.assign({}, a)));
console.log('--- 看得見的（直接問類）---');
console.log('a.name              :', a.name);
console.log("'name' in a         :", 'name' in a);
console.log('Object.hasOwn       :', Object.hasOwn(a, 'name'));
console.log('getOwnPropertyNames :', Object.getOwnPropertyNames(a));
console.log('Reflect.ownKeys     :', Reflect.ownKeys(a));
console.log('getOwnPropertyDescriptor:', JSON.stringify(Object.getOwnPropertyDescriptor(a, 'name')));

/* ------------------------------------------------------------------
 * 段落 d：for...in 會走原型鏈，Object.keys 不會
 * 白話：我做一個建構函式，把 inherited 掛在 prototype 上，own 掛在實例上。
 *       for...in 兩個都印出來，Object.keys 只印實例自己的那個。
 * ------------------------------------------------------------------ */
段落('d. for...in 走原型鏈，Object.keys 不走');
function Parent() {}
Parent.prototype.inherited = 1;
const c = new Parent();
c.own = 2;
console.log('for...in    :', (() => { const r = []; for (const k in c) r.push(k); return r; })());
console.log('Object.keys :', Object.keys(c));

/* ------------------------------------------------------------------
 * 段落 e：own / enumerable / 字串鍵 三個條件各自擋掉誰
 * 白話：我刻意做出四種屬性 —— 繼承來的、正常的、不可列舉的、Symbol 鍵的，
 *       然後 stringify 一次，只有「正常的」那一個活下來。
 * ------------------------------------------------------------------ */
段落('e. JSON.stringify 三個條件各自擋掉誰');
const proto = { fromProto: 'A' };
const d = Object.create(proto);
d.normal = 'B';
Object.defineProperty(d, 'hidden', { value: 'C', enumerable: false });
d[Symbol('sym')] = 'D';
console.log('d 身上摸得到 fromProto / normal / hidden / Symbol 四種');
console.log('JSON.stringify(d) =', JSON.stringify(d), '← 只剩 normal');
console.log('d.fromProto 讀得到嗎 =', d.fromProto, '｜ 是 own 嗎 =', Object.hasOwn(d, 'fromProto'));

/* ------------------------------------------------------------------
 * 段落 f：writable 不是「能不能寫」的總開關
 * 白話：我掛一對 get/set，然後印出 descriptor —— 裡面根本沒有 writable 這個欄位。
 *       接著用賦值去寫它，照樣成功，因為能不能寫看的是有沒有 set 函式。
 * ------------------------------------------------------------------ */
段落('f. accessor 屬性根本沒有 writable 這一格');
const e = {};
let _v = 'fillano';
Object.defineProperty(e, 'name', {
  get() { return _v; },
  set(x) { _v = x; },
  enumerable: true, configurable: true,
});
console.log('descriptor =', JSON.stringify(
  Object.getOwnPropertyDescriptor(e, 'name'),
  (k, v) => (typeof v === 'function' ? '[Function]' : v)
));
e.name = '改成功了';
console.log('用 setter 寫入後 e.name =', e.name, '← 沒有 writable 照樣寫得進去');

/* ------------------------------------------------------------------
 * 段落 g：只有 get 沒有 set，才是真正的唯讀
 * 白話：非嚴格模式寫進去像沒發生過，嚴格模式會明確告訴你「這個屬性只有 getter」。
 * ------------------------------------------------------------------ */
段落('g. 只有 get 沒有 set 才是唯讀');
const f = {};
Object.defineProperty(f, 'ro', { get() { return 1; }, enumerable: true, configurable: true });
f.ro = 999;
console.log('非嚴格模式寫入後 f.ro =', f.ro);
try { (function () { 'use strict'; f.ro = 999; })(); }
catch (err) { console.log('嚴格模式 ->', err.constructor.name + '：' + err.message); }

/* ------------------------------------------------------------------
 * 段落 h：兩組欄位混在一起會直接丟 TypeError
 * 白話：get/set 屬於 accessor 組，value/writable 屬於 data 組，規格規定互斥。
 * ------------------------------------------------------------------ */
段落('h. accessor 組與 data 組互斥');
try { Object.defineProperty({}, 'x', { get() {}, set(v) {}, writable: true }); }
catch (err) { console.log(err.constructor.name + '：' + err.message); }

/* ------------------------------------------------------------------
 * 段落 i：為什麼 prototype pollution 的 payload 要寫 {"hacked": 1}
 * 白話：hacked 只是一個記號，檢查方式是去問一個全新的空物件有沒有它。
 *       JSON.parse 走定義語意，不會污染；賦值只污染自己一個；
 *       真正的災難是把 parse 結果丟進用賦值寫的遞迴 merge。
 * ------------------------------------------------------------------ */
段落('i. hacked 這個記號在測什麼');
console.log('下毒前 ({}).hacked =', ({}).hacked);
const p1 = JSON.parse('{"__proto__": {"hacked": 1}}');
console.log('[JSON.parse] own keys =', Object.getOwnPropertyNames(p1),
  '｜原型沒被換 =', Object.getPrototypeOf(p1) === Object.prototype,
  '｜({}).hacked =', ({}).hacked);
const p2 = {};
p2.__proto__ = { hacked: 1 };
console.log('[賦值]       own keys =', Object.getOwnPropertyNames(p2),
  '｜p2.hacked =', p2.hacked, '｜({}).hacked =', ({}).hacked, '← 只影響 p2');

function merge(target, source) {
  for (const k in source) {
    if (typeof source[k] === 'object' && source[k] !== null) {
      if (!target[k]) target[k] = {};
      merge(target[k], source[k]);
    } else {
      target[k] = source[k];     // ← 賦值語意，災難從這裡開始
    }
  }
  return target;
}
merge({}, JSON.parse('{"__proto__": {"hacked": 1}}'));
console.log('[遞迴 merge] ({}).hacked =', ({}).hacked,
  '｜[].hacked =', [].hacked, '← 全世界都被污染了');
delete Object.prototype.hacked;
console.log('（已清乾淨 ({}).hacked =', ({}).hacked, '）');

/* ------------------------------------------------------------------
 * 段落 j：嚴格模式對 eval 做了什麼
 * 白話：非嚴格模式下 eval 裡宣告的 var 會漏到外面的函式作用域，
 *       嚴格模式下它有自己的作用域，不會漏。
 *       而且 eval 這個名字在嚴格模式不能被當變數名或賦值目標。
 * ------------------------------------------------------------------ */
段落('j. 嚴格模式收緊 eval');
function sloppyEval() { eval('var leaked = 1;'); return typeof leaked; }
function strictEval() { 'use strict'; eval('var leaked = 1;'); return typeof leaked; }
console.log('非嚴格 eval 宣告的 var 外面看得到嗎 ->', sloppyEval());
console.log('嚴格   eval 宣告的 var 外面看得到嗎 ->', strictEval());
try { eval('"use strict"; var eval = 1;'); }
catch (err) { console.log('嚴格模式 var eval ->', err.constructor.name + '：' + err.message); }

/* ------------------------------------------------------------------
 * 段落 k：eval 解析 JSON 為什麼危險
 * 白話：eval 會把字串當程式碼執行，所以字串裡如果藏了函式呼叫，它真的會被執行。
 *       JSON.parse 只認 JSON 文法，同一段字串直接被擋下來。
 * ------------------------------------------------------------------ */
段落('k. eval 解析 JSON 為什麼危險');
let 被執行了 = false;
globalThis.__mark = () => { 被執行了 = true; return 1; };
eval('(' + '{"n": __mark()}' + ')');
console.log('eval 會順便執行裡面的函式嗎 ->', 被執行了);
try { JSON.parse('{"n": __mark()}'); }
catch (err) { console.log('JSON.parse 同一段 ->', err.constructor.name + '：' + err.message); }

/* ------------------------------------------------------------------
 * 段落 l：JSON.stringify 的第二個參數 replacer 的兩種型態
 * 白話：傳函式就是逐個 key 過濾，回傳 undefined 那個 key 就消失；
 *       傳陣列就是白名單，只有陣列裡列出的 key 會被保留。
 *       第三個參數 space 是縮排，給數字或字串都行。
 * ------------------------------------------------------------------ */
段落('l. replacer 的兩種型態');
const g = { a: 1, b: 2, secret: 'x' };
console.log('replacer 函式 :', JSON.stringify(g, (k, v) => (k === 'secret' ? undefined : v)));
console.log('replacer 陣列 :', JSON.stringify(g, ['a', 'b']));
console.log('space 縮排    :\n' + JSON.stringify({ a: 1, b: { c: 2 } }, null, 2));

console.log('\nNode 版本：', process.version);
