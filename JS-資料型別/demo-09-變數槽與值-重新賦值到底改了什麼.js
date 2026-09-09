/**
 * =====================================================================================
 * demo-09-變數槽與值-重新賦值到底改了什麼.js
 * 主題：let a = 1; a = 2; 到底改了哪裡？「儲存 integer 1 的那格記憶體」真的存在嗎？
 * 執行：node --expose-gc demo-09-變數槽與值-重新賦值到底改了什麼.js
 *
 * 這一份要回答的具體問題：
 *   「primitive value is unchangeable 應該是說，let a = 1 之後 a = 2，
 *     不會改動那個儲存 integer 1 的那格記憶體，對吧？」
 *
 * 短答：方向對，但有一個地方要修正 ——
 *   對小整數來說，「儲存 integer 1 的那格記憶體」根本不存在。
 *
 * 名詞先講清楚：
 *   a. binding / 變數槽：名字對應到的那一格儲存空間。let a = 1 建立的就是這個
 *   b. value / 值：槽裡放的東西。「不可變」講的是這個，不是槽
 *   c. Smi（Small Integer，小整數）：V8 把小整數直接編碼在槽的位元裡，堆積上不配置任何東西
 *   d. HeapNumber：放不進 Smi 的數字（浮點數、超出範圍的整數）才會在堆積上配置一個物件
 *   e. identity（身分）：「這一個」與「那一個」能不能被區分開來
 * =====================================================================================
 */

const MB = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
const canGC = typeof global.gc === 'function';
const gc = () => { if (canGC) { global.gc(); global.gc(); } };
const mem = () => process.memoryUsage();

console.log('node', process.version, canGC ? '' : '（沒有 --expose-gc，數字會不準）');


console.log('\n===== 0. 先把兩個東西分開命名 =====');
console.log([
  '   變數槽（binding）：名字對應的那一格　→　會被改寫',
  '   值（value）　　　：槽裡放的東西　　　→　不可變的是這個',
  '',
  '   a = 2 改的是「槽」，不是「值 1」。所以你的方向是對的：',
  '   沒有任何操作把「1 這個值」變成「2 這個值」。',
].join('\n'));


console.log('\n===== 1. 但對小整數來說，「儲存 1 的那格記憶體」不存在 =====');

// V8 的 Smi：整數直接編碼在槽的位元裡，堆積上沒有任何物件。
// 所以 a = 2 就是把 a 這一格的位元從「1 的編碼」改寫成「2 的編碼」。
// 被改寫的是「變數槽」，不是「值 1」。
gc();
const s0 = mem().heapUsed;
let a = 1;
for (let i = 0; i < 1e7; i++) { a = i; } // 一千萬次重新賦值
gc();
const s1 = mem().heapUsed;
console.log('   一千萬次 a = i（小整數）　heap 變化:', MB(s1 - s0), '　a =', a);
console.log('   → 堆積完全沒動，因為從頭到尾沒有任何「數字物件」被配置');
console.log('   → 這也是 setCount(count + 1) 在記憶體上幾乎免費的原因');


console.log('\n===== 2. 字串才真的有「那一格」，而且你的講法完全正確 =====');

// 字串放不進槽裡，槽裡放的是「指標」，指向堆積上的字串物件。
// s = "world" → 在堆積上造一個新字串，把槽改成指向新的那個。
// 舊的 "hello" 一個位元都沒被動過。

const original = 'hello';
let alias = original;      // 兩個槽指向同一個字串
alias = 'world';           // 只有 alias 這一槽改指向新的字串

console.log('   const original = "hello"');
console.log('   let alias = original;  alias = "world"');
console.log('   original 現在是 →', JSON.stringify(original), '　← 一個位元都沒被動過');
console.log('   alias    現在是 →', JSON.stringify(alias));
console.log('   original === "hello" →', original === 'hello');

// 用大字串實測「新的真的佔了新空間」。
// ⚠️ 這裡有個量測陷阱，見第 4 節：字串必須「被觸碰過」才會真的配置。
const makeBig = (ch, n) => { const s = ch.repeat(n); void s[s.length - 1]; return s; };

gc();
const t0 = mem();
const big1 = makeBig('a', 5e6);   // 500 萬字元
gc();
const t1 = mem();
let holder = big1;
holder = makeBig('b', 5e6);       // 造第二個，舊的仍被 big1 抓著
gc();
const t2 = mem();

console.log('\n   造第一個 500 萬字元字串　　rss 增加:', MB(t1.rss - t0.rss));
console.log('   holder 改指向第二個　　　　rss 再增加:', MB(t2.rss - t1.rss), '← 新字串真的佔了新空間');
console.log('   big1 長度仍是', big1.length, '，第一個字元:', big1[0], '← 舊的完全沒被動過');
console.log('   holder 長度', holder.length, '，第一個字元:', holder[0]);


console.log('\n===== 3. 最深的一層：語言根本不讓你問「是不是同一格」 =====');

const o1 = {};
const o2 = {};
console.log('   物件有 identity（身分）：');
console.log('     {} === {}                             →', o1 === o2, '　← 觀察得到「不是同一個」');
console.log('   primitive 沒有 identity：');
console.log('     1 === 1                               →', 1 === 1, '　← 永遠 true');
console.log('     "a" === "a"                           →', 'a' === 'a', '　← 永遠 true');
console.log('   包裝物件才有（因為它是物件不是 primitive）：');
console.log('     new Number(1) === new Number(1)       →', new Number(1) === new Number(1));
console.log('     typeof new Number(1)                  →', typeof new Number(1));

console.log('\n   關鍵：你「問不出」兩個 1 是不是同一格記憶體。');
console.log('   不是引擎把它藏起來，而是語言層根本沒有這個概念。');
console.log('   ECMAScript 規格只定義「值」與「行為」，完全不定義記憶體佈局。');
console.log('   所以「堆積上有沒有一格存著 1」是 V8 的實作自由，換個引擎可以不一樣。');

// 三個「來源不同」但內容相同的字串
const x1 = 'hello';
const x2 = 'hel' + 'lo';        // 編譯期就能算出來
let part = 'hel';
const x3 = part + 'lo';         // 執行期才拼出來
console.log('\n   三個來源不同、內容相同的字串：');
console.log('     x1 === x2 →', x1 === x2, '｜ x1 === x3 →', x1 === x3);
console.log('     全部 true，因為 === 比的是「值」，不是「哪一格」');


console.log('\n===== 4. 我在做這份實測時踩到的坑（量測記憶體時很實用）=====');

// V8 對 String.prototype.repeat 的結果是「惰性」的：
// 你沒有真的讀它的內容之前，記憶體可能還沒被真正配置。
gc();
const l0 = mem();
const lazy = [];
for (let i = 0; i < 200; i++) lazy.push('x'.repeat(500000 + i)); // 理論上約 100 MB
gc();
const l1 = mem();
let touched = 0;
for (const s of lazy) if (s[s.length - 1] === 'x') touched++;    // 強迫它真的長出來
gc();
const l2 = mem();

console.log('   200 個 50 萬字元字串（理論約 100 MB）');
console.log('     只是建立，還沒讀內容　　rss 增加:', MB(l1.rss - l0.rss));
console.log('     讀過每個字串的最後一字後 rss 再增加:', MB(l2.rss - l1.rss), '　touched =', touched);
console.log('   → 教訓：量記憶體時如果數字小得不合理，先確認資料「真的被用到過」');
console.log('   → 對照組 Buffer.alloc 是立刻配置的，不會有這個現象');


console.log('\n===== 5. 四種情況的對照表 =====');
const rows = [
  ['值的種類', '槽裡放什麼', '堆積上有東西嗎', 'a = 新值 做了什麼'],
  ['小整數 Smi', '整數本身的編碼位元', '沒有', '改寫槽的位元'],
  ['浮點數 / 大整數', '指標', '有 HeapNumber', '造新的，槽改指向它'],
  ['字串', '指標', '有字串物件', '造新字串，槽改指向它，舊的原封不動'],
  ['物件', '指標', '有物件', '槽改指向新物件'],
];
rows.forEach((r, i) => {
  console.log('   ' + r[0].padEnd(18) + r[1].padEnd(22) + r[2].padEnd(18) + r[3]);
  if (i === 0) console.log('   ' + '-'.repeat(96));
});

console.log('\n   最後一列的關鍵對比：');
const obj = { n: 0 };
const objBefore = obj;
obj.n = 2;                    // 改的是「堆積上那個物件」，槽完全沒動
console.log('     const obj = { n: 0 }; obj.n = 2');
console.log('     obj === objBefore →', obj === objBefore, '　← 槽沒動，動的是堆積上的內容');
console.log('     這就是物件「可變」與 primitive「不可變」的分界：');
console.log('     物件的內容可以被就地改寫，primitive 的值不行。');


console.log('\n===== 總結 =====');
console.log([
  'a. 你的方向對：a = 2 沒有把「值 1」變成「值 2」，它改的是「變數槽指向誰」',
  'b. 但「儲存 integer 1 的那格記憶體」對小整數而言不存在（Smi 直接編碼在槽裡）',
  'c. 字串、浮點數、BigInt 才真的在堆積上有一格，這時你的講法完全正確：',
  '   舊的那一格一個位元都沒被動過，只是變成沒人指向它，然後被 GC 回收',
  'd. 最深的一層：語言根本不讓你觀察 primitive 的 identity，',
  '   所以「是不是同一格」這個問題在 JS 裡問不出來，也不該拿來當心智模型',
  'e. 比較安全的心智模型是：',
  '   「值是不可變的抽象概念，變數槽是可以改寫的容器，賦值只動容器」',
].join('\n'));
