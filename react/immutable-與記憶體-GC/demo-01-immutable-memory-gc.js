/**
 * =====================================================================================
 * immutable-memory-gc.js
 * 主題：immutable（不可變更新）會不會讓記憶體塞滿舊值？
 * 執行方式（一定要加 --expose-gc，否則沒辦法手動觸發回收，數字會很吵）：
 *     node --expose-gc immutable-memory-gc.js
 *
 * 名詞先講清楚：
 *   a. immutable（不可變）：不修改原本的資料，而是產生一份新的資料
 *   b. mutable（可變）：直接就地修改原本的資料，例如 arr.push(x)
 *   c. reference（參考／指標）：變數存的不是物件本身，而是「物件在堆積中的位址」，
 *      在 64 位元的 V8 上一個指標是 8 bytes
 *   d. heap（堆積）：物件實際被配置的那塊記憶體區域
 *   e. GC（Garbage Collection，垃圾回收）：自動找出「再也無法被存取到的物件」並釋放它們
 *   f. reachable（可達）：從根（全域物件、當前呼叫堆疊、閉包⋯⋯）順著參考走得到的物件。
 *      GC 回收的判準不是「舊」，而是「不可達」
 *   g. structural sharing（結構共享）：新的資料結構與舊的共用沒有變動的那些部分，
 *      只有變動路徑上的節點是新的
 *   h. Smi（Small Integer，小整數）：V8 對小整數的最佳化，直接把數字塞在指標的位元裡，
 *      完全不配置堆積記憶體
 *   i. generational hypothesis（世代假說）：大多數物件出生後很快就死掉。
 *      V8 依此把堆積分成新生代與老生代，新生代回收的成本只跟「活下來的物件數」成正比，
 *      跟「產生了多少垃圾」無關
 * =====================================================================================
 */

const MB = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
const heap = () => process.memoryUsage().heapUsed;

// global.gc 只有加了 --expose-gc 才存在
const canGC = typeof global.gc === 'function';
const gc = () => {
  if (!canGC) return;
  global.gc(); // 跑兩次，讓第一次被喚醒的 finalizer 產生的垃圾也一併清掉
  global.gc();
};

console.log('node', process.version, canGC ? '' : '（沒有 --expose-gc，數字會不準）');
console.log('');

// =====================================================================================
// 實驗 A：primitive number 做 count = count + 1，到底有沒有配置記憶體？
// 這是你原本的疑問最直接的來源，先把它打掉。
// =====================================================================================
gc();
const a0 = heap();
let count = 0;
for (let i = 0; i < 1e7; i++) {
  count = count + 1; // 一千萬次「產生新值」
}
const a1 = heap();
console.log('A. 一千萬次 count = count + 1');
console.log('   heap 變化：', MB(a1 - a0));
console.log('   結論：幾乎是 0。number 是 primitive（原始型別），它是「值」不是「物件」，');
console.log('         而且小整數走 Smi 最佳化，根本不進堆積，談不上「舊值堆積」');
console.log('');

// =====================================================================================
// 實驗 B：真正的 immutable 情境（陣列），但只保留最新一份
// 這就是 React 裡 setItems([...items, newItem]) 的樣子
// =====================================================================================
gc();
const b0 = heap();
let items = [];
for (let i = 0; i < 20000; i++) {
  items = [...items, { id: i, name: 'item' + i }];
  // 每一圈都產生一個新陣列，舊陣列的變數 items 立刻被重新指向新的，
  // 於是上一個陣列變成「不可達」，下一次 minor GC 就會被清掉
}
gc();
const b1 = heap();
console.log('B. 20000 次 items = [...items, newObj]，只保留最新一份');
console.log('   GC 後 heap 增加：', MB(b1 - b0), '　陣列長度：', items.length);
console.log('   結論：留下來的只有「最後那一份」加上 20000 個 item 物件。');
console.log('         中間產生的 19999 個舊陣列全部被回收了');
console.log('');

// =====================================================================================
// 實驗 C：同樣次數，但把每一版都留著（模擬沒有上限的 undo 堆疊）
// 這才是你的擔心真正會發生的情況
// =====================================================================================
gc();
const c0 = heap();
let cur = [];
const history = [];
// 這裡刻意只跑 5000 次。原因：第 i 版的外殼有 i 個指標，全部留著的總成本是
// n(n+1)/2 個指標 ≈ O(n²)。跑 20000 次會吃掉約 1.6 GB 而直接 OOM（記憶體不足）。
// 你可以自己把 VERSIONS 調大，親眼看它爆炸。
const VERSIONS = 5000;
for (let i = 0; i < VERSIONS; i++) {
  cur = [...cur, { id: i }];
  history.push(cur); // ← 罪魁禍首在這一行，每一版都被 history 抓住，永遠可達
}
gc();
const c1 = heap();
console.log('C. 同樣做 immutable 更新', VERSIONS, '次，但每一版都 push 進 history');
console.log('   GC 後 heap 增加：', MB(c1 - c0), '　版本數：', history.length);
console.log('   結論：暴增。但問題不在 immutable，在「你自己把舊值抓住不放」。');
console.log('         注意成本是 O(n²)：第 i 版的外殼有 i 個指標，總和是 n(n+1)/2 個指標');
console.log('');

// =====================================================================================
// 實驗 D：structural sharing（結構共享）證明
// 新陣列是新的「外殼」，但裡面的元素還是同一批物件
// =====================================================================================
const oldArr = [{ n: 1 }, { n: 2 }, { n: 3 }];
const newArr = [...oldArr, { n: 4 }];
console.log('D. structural sharing 證明');
console.log('   oldArr === newArr        →', oldArr === newArr, '（外殼是新的，所以 React 的 Object.is 比較得出來）');
console.log('   oldArr[0] === newArr[0]  →', oldArr[0] === newArr[0], '（元素是同一個物件，沒有被複製）');
console.log('   前三個元素全部共用        →', oldArr.every((o, i) => o === newArr[i]));
console.log('');

// =====================================================================================
// 實驗 E：一個「新外殼」到底多貴？跟深拷貝差多少？
// =====================================================================================
const N = 100000;
const base = Array.from({ length: N }, (_, i) => ({ id: i, payload: 'x'.repeat(50) }));

gc();
const e0 = heap();
const shell = [...base]; // 淺拷貝：只複製 N 個指標
gc();
const e1 = heap();

gc();
const f0 = heap();
const deep = base.map((o) => ({ ...o })); // 深一層拷貝：真的產生 N 個新物件
gc();
const f1 = heap();

console.log('E. 對 100000 筆物件做一次拷貝的成本');
console.log('   [...base]（淺拷貝，共享元素）：', MB(e1 - e0), '→ 每個元素約', ((e1 - e0) / N).toFixed(1), 'bytes');
console.log('   map(o => ({...o}))（複製元素）：', MB(f1 - f0), '→ 每個元素約', ((f1 - f0) / N).toFixed(1), 'bytes');
console.log('   結論：淺拷貝每個元素只花一個指標的錢，這就是 structural sharing 的意義。');
console.log('         真正貴的是「連元素一起複製」，那才是要避免的寫法');
console.log('   （防止最佳化把變數優化掉）', shell.length, deep.length);
console.log('');

// =====================================================================================
// 實驗 F：immutable 真正的代價不是記憶體，是 CPU 時間
// 在迴圈裡每次都展開整個陣列，是 O(n²)
// =====================================================================================
const M = 30000;

let t0 = performance.now();
const mutableArr = [];
for (let i = 0; i < M; i++) mutableArr.push(i); // push 是 O(1) 攤銷
const tMutable = performance.now() - t0;

t0 = performance.now();
let immutableArr = [];
for (let i = 0; i < M; i++) immutableArr = [...immutableArr, i]; // 每圈複製 i 個指標 → O(n²)
const tImmutable = performance.now() - t0;

console.log('F. 速度比較（各', M, '次）');
console.log('   mutable push        ：', tMutable.toFixed(2), 'ms');
console.log('   immutable [...arr,x]：', tImmutable.toFixed(2), 'ms　→ 慢約', (tImmutable / tMutable).toFixed(0), '倍');
console.log('   結論：這才是 immutable 真正要注意的地方。');
console.log('         在 React 裡通常不痛，因為你是「每次事件一次更新」不是「迴圈裡跑三萬次」；');
console.log('         如果真的要在迴圈裡累積，先用 mutable 組好，最後再一次交出新陣列');
console.log('');

// =====================================================================================
// 總結
// =====================================================================================
console.log('===== 總結 =====');
console.log([
  'a. count + 1 這種 primitive 完全不配置堆積，你的擔心在這個例子上不成立',
  'b. 物件與陣列的 immutable 更新確實會產生新外殼，但舊的一旦不可達就會被 GC 回收',
  'c. V8 的新生代回收成本只跟「活下來的物件」成正比，短命的舊 state 幾乎是免費的',
  'd. 記憶體真的會漲，是因為你自己把舊值抓住（undo 堆疊、快取、閉包、全域陣列）',
  'e. structural sharing 讓新外殼只花指標的錢，不要手滑寫成深拷貝',
  'f. immutable 真正的成本是 CPU（迴圈內重複複製），不是記憶體',
].join('\n'));
