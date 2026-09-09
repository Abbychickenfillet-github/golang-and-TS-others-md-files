/**
 * =====================================================================================
 * demo-08-immutable的四個層次.js
 * 主題：「不可變 immutable」在 JavaScript 裡至少有四個意思，鎖的東西完全不同
 * 執行：node demo-08-immutable的四個層次.js
 *
 * 為什麼要寫這一份：
 *   總覽筆記的型別樹上寫著「原始型別 ── 不可變 immutable」，
 *   那句話只講了四個層次裡的第一個。實際寫 code 會同時遇到四個，
 *   而且它們「由誰決定」「違反時噴什麼錯」完全不一樣，混在一起就會誤判 bug。
 *
 * 名詞先講清楚：
 *   a. binding（綁定）：名字與值之間的連結。let／const 建立的就是綁定
 *   b. internal slot（內部欄位）：規格層掛在物件上、程式碼碰不到的隱藏欄位
 *   c. internal method（內部方法）：規格層的操作，例如 [[Get]]、[[Set]]、[[DefineOwnProperty]]
 *   d. identity（身分）：「這一個」與「那一個」能不能被區分開來
 *   e. interning（駐留）：引擎把內容相同的值共用成同一份，省記憶體
 * =====================================================================================
 */

const line = (s) => console.log('\n' + '='.repeat(78) + '\n' + s + '\n' + '='.repeat(78));

line('層次一：primitive 的「值」不可變　—— 語言強制，你無法選擇');

// ⚠️ 先講一個很多人不知道的前提：
//   Node 的 .js 檔（CommonJS 模組）預設「不是」嚴格模式。
//   只有 .mjs、package.json 標了 "type":"module" 的 ESM、以及 class 內部、
//   還有你自己寫 'use strict' 的地方，才是嚴格模式。
//   這件事很重要，因為「改不可變的東西」在兩種模式下的行為完全不同：
//     嚴格模式 → 丟 TypeError，你馬上知道
//     非嚴格   → 靜默失敗，什麼都不說，最難 debug
// 下面兩個 helper 讓我們可以明確指定要跑哪一種模式。
const runStrict = (code) => new Function('"use strict";' + code)();
const runSloppy = (code) => new Function(code)();

let s = 'hello';
const before = s;

// 1-a. 嚴格模式下試著改字串裡的某個字元
try {
  runStrict('const s = "hello"; s[0] = "H"; return s;');
  console.log('   [嚴格] s[0] = "H" 竟然沒出錯？');
} catch (err) {
  console.log('   [嚴格] s[0] = "H" →', err.constructor.name, '|', err.message);
}

// 1-b. 非嚴格模式下是「靜默失敗」，這才是最難 debug 的
console.log('   [非嚴格] s[0] = "H" 之後 →', runSloppy('const s = "hello"; s[0] = "H"; return s;'),
            '← 不報錯，但也沒改到，靜悄悄地什麼都沒發生');
console.log('   （這個檔案本身是 CommonJS，所以直接寫 s[0]="H" 走的是非嚴格那條路）');

// 1-c. 所有 String 方法都是「回傳新字串」，沒有一個是原地修改
const upper = s.toUpperCase();
console.log('   s.toUpperCase() 回傳 →', upper, '　原本的 s 仍是 →', s, '　s === before ?', s === before);

// 1-d. 那為什麼 s.length、s.toUpperCase() 叫得出來？auto-boxing（自動裝箱）
console.log('   [非嚴格] t.foo = 1 之後讀 t.foo →',
            runSloppy('const t = "hi"; t.foo = 1; return t.foo;'));
try {
  runStrict('const t = "hi"; t.foo = 1; return t.foo;');
} catch (err) {
  console.log('   [嚴格]   同一行 →', err.constructor.name, '|', err.message);
}
console.log('   原因：讀寫屬性時引擎做 ToObject(t) 產生一個「臨時的」String 包裝物件，');
console.log('         屬性寫進了那個臨時物件，然後臨時物件立刻被丟棄。');
console.log('         下次再讀又建一個全新的臨時物件，當然讀不到 → undefined');

console.log('\n   ── 那為什麼規格要規定 primitive 不可變？五個理由 ──');
console.log([
  '   a. 規格層：primitive 不是 Object，身上沒有 internal slot 可以寫，',
  '      也沒有 [[Set]]／[[DefineOwnProperty]] 這些 internal method。',
  '      所有「修改」的門都開在 Object 上，primitive 根本沒有那扇門',
  '   b. 沒有 identity：兩個 5 就是同一個 5，語言不區分「哪一個 5」。',
  '      既然沒有身分，「改變某一個 5」這句話本身就沒有意義',
  '   c. 引擎最佳化的前提：因為不可變，V8 才敢做字串 interning（相同內容共用一份）、',
  '      Smi（小整數直接編碼進指標不進堆積）。可變的話這些共享全部不安全',
  '   d. 值語意（value semantics）：a = b 之後兩者互不影響，沒有 aliasing（別名）問題',
  '   e. 讓 ===、property key、Map key 的語意穩定：比的是值，不需要問「是不是同一個」',
].join('\n'));

// 1-e. 值語意 vs 參考語意的直接對照
let p1 = 5, p2 = p1; p2 = 6;
const o1 = { n: 5 }, o2 = o1; o2.n = 6;
console.log('\n   值語意   p1 =', p1, '  p2 =', p2, '← 互不影響');
console.log('   參考語意 o1.n =', o1.n, '  o2.n =', o2.n, '← 同一個物件，o1 也被改了');


line('層次二：const 的「綁定」不可變　—— 宣告時由你決定');

const c = 0;
try {
  new Function('"use strict"; const c = 0; c++; return c;')();
} catch (err) {
  console.log('   const c = 0; c++ →', err.constructor.name, '|', err.message);
}
const obj = { n: 0 };
obj.n++; // 合法：改的是物件內容，不是 obj 這個綁定
console.log('   const obj = { n: 0 }; obj.n++ → 合法，obj.n 現在是', obj.n);
try {
  new Function('"use strict"; const o = {}; o = {}; return o;')();
} catch (err) {
  console.log('   const obj = {}; obj = {} →', err.constructor.name, '|', err.message);
}
console.log('   結論：const 鎖的是「這個名字還能不能指向別的東西」，完全不管內容');
console.log('   （c 目前是', c, '，只是為了證明它真的還在）');


line('層次三：Object.freeze 的「內容」不可變　—— 執行時由你呼叫，而且是淺層的');

const frozen = Object.freeze({ n: 0, nested: { m: 0 } });
try {
  runStrict('const f = Object.freeze({n:0}); f.n++; return f.n;');
  console.log('   [嚴格] frozen.n++ 竟然沒出錯？');
} catch (err) {
  console.log('   [嚴格] frozen.n++ →', err.constructor.name, '|', err.message);
}
frozen.n++; // 這一行在 CommonJS 的非嚴格環境下靜默失敗
console.log('   [非嚴格] frozen.n++ 之後 frozen.n 還是', frozen.n, '← 靜默失敗');
frozen.nested.m = 99; // 沒有錯，因為 freeze 只凍第一層
console.log('   frozen.nested.m = 99 → 成功，值是', frozen.nested.m, '← freeze 是淺層的！');
console.log('   Object.isFrozen(frozen)        →', Object.isFrozen(frozen));
console.log('   Object.isFrozen(frozen.nested) →', Object.isFrozen(frozen.nested), '← 內層根本沒被凍');

// 深層凍結要自己遞迴
function deepFreeze(o) {
  Object.getOwnPropertyNames(o).forEach((k) => {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  });
  return Object.freeze(o);
}
const deep = deepFreeze({ a: { b: { c: 1 } } });
deep.a.b.c = 2; // 非嚴格：靜默失敗
console.log('   deepFreeze 之後改最內層 → 值還是', deep.a.b.c, '（非嚴格，靜默失敗）');
console.log('   同一行在嚴格模式下會丟 TypeError: Cannot assign to read only property');


line('層次四：React 的 immutable update　—— 語言完全不強制，是「慣例」');

// 這一層沒有任何語言機制擋你，錯了不會報錯，只會「畫面不動」
const todos = [{ id: 1, done: false }];

// 錯誤寫法：就地修改
const wrongNext = todos;
wrongNext[0].done = true;
console.log('   就地修改後 todos === wrongNext →', todos === wrongNext, '← 參考相同');
console.log('   React 用 Object.is 一比發現相同 → 直接跳過重新渲染 → 畫面不動且不報錯');

// 正確寫法：產生新外殼
const base = [{ id: 1, done: false }, { id: 2, done: false }];
const rightNext = base.map((t) => (t.id === 1 ? { ...t, done: true } : t));
console.log('   immutable 更新後：');
console.log('     外殼 base === rightNext         →', base === rightNext, '← 不同，React 比得出來');
console.log('     被改的 base[0] === rightNext[0] →', base[0] === rightNext[0], '← 新物件');
console.log('     沒改的 base[1] === rightNext[1] →', base[1] === rightNext[1], '← 共用，沒被複製');
console.log('   這一層叫 structural sharing（結構共享）');


line('四個層次總表');

const rows = [
  ['層次', '鎖什麼', '由誰決定', '違反時會怎樣'],
  ['1. primitive 值', '值本身', '語言，無法選', '嚴格模式 TypeError／非嚴格靜默失敗'],
  ['2. const 綁定', '名字指向誰', '你，宣告時', 'TypeError: Assignment to constant variable.'],
  ['3. Object.freeze', '物件的屬性（淺層）', '你，執行時', 'TypeError: Cannot assign to read only property'],
  ['4. React 更新慣例', '沒有真的鎖', '你，寫 code 時', '不報錯，畫面不動（最難 debug）'],
];
rows.forEach((r, i) => {
  console.log('   ' + r[0].padEnd(18) + r[1].padEnd(22) + r[2].padEnd(14) + r[3]);
  if (i === 0) console.log('   ' + '-'.repeat(94));
});

console.log('\n   最實用的辨認方式：看錯誤訊息');
console.log([
  '   a. "Assignment to constant variable."          → 你動到了 const 綁定（層次 2）',
  '   b. "Cannot assign to read only property \'x\'"   → 你動到了被 freeze 的屬性（層次 3）',
  '   c. 完全沒有錯誤訊息但值沒變                     → 層次 1 或 3 的非嚴格靜默失敗。',
  '      Node 的 .js（CommonJS）預設非嚴格，.mjs／ESM／class 內部才是嚴格。',
  '      瀏覽器裡 <script type="module"> 是嚴格，一般 <script> 不是',
  '   d. 完全沒有錯誤訊息、值變了但畫面沒動           → 層次 4，React 的 Object.is 判定沒變',
].join('\n'));
