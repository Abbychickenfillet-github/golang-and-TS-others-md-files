/**
 * 11-demo-typedarray-view與transferable.js
 * 搭配筆記：11-陣列的底層記憶體-一般陣列與型別陣列與類陣列-ArrayBuffer視圖與Transferable.md
 *
 * 跑法（擇一）：
 *   1. node 11-demo-typedarray-view與transferable.js
 *   2. 瀏覽器 F12 Console 直接整段貼上（Worker 那段只有瀏覽器能跑）
 */

const line = (t) => console.log('\n===== ' + t + ' =====');

/* ------------------------------------------------------------------ */
line('(b) length 是「最大整數索引 + 1」，不是元素個數');
const a1 = ['apple'];
a1[100] = 'banana';
console.log('a1.length =', a1.length);          // 101
a1.length = 1;                                   // 手動改 length 會砍掉後面
console.log('砍完 a1 =', a1);                    // ['apple']

/* ------------------------------------------------------------------ */
line('(c) 非索引屬性不計入 length');
const a2 = [1, 2];
a2.customKey = 'I am not an index';
console.log('a2.length =', a2.length);           // 2
console.log('a2.customKey =', a2.customKey);

/* ------------------------------------------------------------------ */
line('(f) 不要自己戳洞：delete 會讓陣列變 holey，而且回不去');
const a3 = [1, 2, 3];
delete a3[1];
console.log('a3 =', a3, ' a3.length =', a3.length);   // [1, <1 empty item>, 3] length 3
console.log('1 in a3 ?', 1 in a3);                     // false ← 這格是洞，不是 undefined
console.log('Object.keys(a3) =', Object.keys(a3));     // ['0','2'] ← 洞不會被列舉

/* ------------------------------------------------------------------ */
line('(i) 同一塊 ArrayBuffer 掛兩個 View ，改一個另一個立刻看到');
const buffer = new ArrayBuffer(8);               // 8 Bytes
const i8 = new Int8Array(buffer);                // 1 Byte 一格 → 8 格
const i32 = new Int32Array(buffer);              // 4 Bytes 一格 → 2 格
console.log('i8.length =', i8.length, ' i32.length =', i32.length);

i32[0] = 1000;                                   // 1000 = 0x000003E8
console.log('寫 i32[0] = 1000 之後，i8 看到：', Array.from(i8));
// 小端序（little-endian）機器上會看到 [ -24, 3, 0, 0, 0, 0, 0, 0 ]
// -24 是 0xE8 用 Int8（有號）解讀的結果；換成 Uint8Array 就會看到 232

/* ------------------------------------------------------------------ */
line('(j) TypedArray 寫超出範圍不會報錯，是「靜默忽略」');
const ta = new Int32Array(3);
ta[10] = 99;
console.log('ta.length =', ta.length);           // 3 ，沒有變長
console.log('ta[10] =', ta[10]);                 // undefined ，也沒有丟 TypeError

/* ------------------------------------------------------------------ */
line('(k) 路線一：手動擴容（自己做一遍引擎幫一般陣列做的事）');
let oldArr = new Int32Array([10, 20, 30]);
const newArr = new Int32Array(oldArr.length * 2);
newArr.set(oldArr);                              // 把舊資料整批複製進去
newArr[3] = 40;
oldArr = newArr;
console.log('擴容後 =', Array.from(oldArr));      // [10, 20, 30, 40, 0, 0]

line('(k) 路線二：resizable ArrayBuffer（建立時先講好上限）');
try {
  const buf = new ArrayBuffer(12, { maxByteLength: 40 });
  const view = new Int32Array(buf);              // 不給長度 → 跟著 buffer 伸縮
  console.log('buf.resizable =', buf.resizable, ' view.length =', view.length); // true 3
  buf.resize(20);
  console.log('resize(20) 之後 view.length =', view.length);                     // 5
} catch (e) {
  console.log('這個執行環境還不支援 resizable ArrayBuffer：', e.message);
}

/* ------------------------------------------------------------------ */
line('(n) 鏈式呼叫每一步都生一個中介陣列');
const numbers = [1, 2, 3, 4, 5];
const step1 = numbers.filter((n) => n % 2 !== 0);   // 中介陣列 [1, 3, 5]
const step2 = step1.map((n) => n * 2);              // 最終結果 [2, 6, 10]
console.log('中介陣列 =', step1, ' 最終結果 =', step2);
console.log('step1 === numbers ?', step1 === numbers);  // false ，確實是新的一份

/* ------------------------------------------------------------------ */
line('(v)(w) Transferable：轉移後來源端 detached（只有瀏覽器能跑）');
if (typeof Worker === 'undefined') {
  console.log('Node 的一般環境沒有 Worker 全域，請到瀏覽器 Console 跑這一段。');
} else {
  const src = `self.onmessage = (e) => {
    const view = new Int32Array(e.data);
    for (let i = 0; i < view.length; i++) view[i] = view[i] * 2;  // in-place 就地運算
    self.postMessage(e.data, [e.data]);                            // 再原路轉移回去
  };`;
  const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));

  const big = new ArrayBuffer(4 * 4);
  new Int32Array(big).set([1, 2, 3, 4]);
  console.log('轉移前 big.byteLength =', big.byteLength);          // 16

  worker.onmessage = (e) => {
    console.log('Worker 算完轉回來 =', Array.from(new Int32Array(e.data))); // [2,4,6,8]
    worker.terminate();
  };

  worker.postMessage(big, [big]);                                  // 第二個參數才是 transfer list
  console.log('轉移後 big.byteLength =', big.byteLength);           // 0 ← detached
}
