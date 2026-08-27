/**
 * 兩個常見誤解：
 *   1. isValid 需要讀得到 requests 嗎？  → 不需要
 *   2. console.log(isValid) 為什麼印出 [Function: isValid]？ → 那是正常的
 * 執行：node 函式本身vs函式的結果-demo.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

line('Part 1｜isValid 根本不認識 requests');

// 注意這一行：括號裡的 request 是「參數」，不是外部變數
const isValid = (request) => request.status === 'ok' && request.payload !== null;
//                ~~~~~~~ 這個名字只活在函式內部，跟外面的 requests 一點關係都沒有

console.log('  此時此刻 requests 還沒被宣告，但 isValid 已經可以用了：');
console.log('   ', isValid({ status: 'ok', payload: { a: 1 } }), ' ← 我隨手捏一個物件丟給它');
console.log('   ', isValid({ status: 'error', payload: null }), ' ← 再捏一個');
console.log('\n  → isValid 要的是「一筆 request 物件」，不是「整個 requests 陣列」');
console.log('  → 所以誰先宣告都無所謂，它們之間沒有依賴關係');

const requests = [
  { id: 1, status: 'ok',    payload: { a: 1 } },
  { id: 2, status: 'error', payload: null     },
  { id: 3, status: 'ok',    payload: { c: 3 } },
];

line('Part 2｜console.log(isValid) 為什麼是 [Function: isValid]');

console.log('  console.log(isValid)：');
console.log('   ', isValid);
console.log('    ↑ 這是「函式本身」，就像你拿到一台果汁機，還沒放水果進去');

console.log('\n  console.log(isValid(requests[0]))：');
console.log('   ', isValid(requests[0]));
console.log('    ↑ 這是「函式的結果」，加了括號才等於按下開關');

console.log(`
  這跟之前講的 getter 是同一個概念：
      obj.normalFn      → ƒ normalFn()   拿到函式本身
      obj.normalFn()    → 'Hi'           加括號才執行

  記法：函式名稱是「名詞」，加上括號才變成「動詞」。
`);

line('Part 3｜想看 isValid 的「作用」，三種方法');

console.log('  方法一：直接餵東西給它，看回傳什麼（最直覺）');
const samples = [
  { id: 'A', status: 'ok',    payload: { x: 1 } },
  { id: 'B', status: 'error', payload: { x: 1 } },
  { id: 'C', status: 'ok',    payload: null     },
];
for (const s of samples) {
  console.log(`    isValid(${JSON.stringify(s)})`.padEnd(58), '→', isValid(s));
}
console.log('    → 一眼看出：status 要是 ok，而且 payload 不能是 null，兩個都成立才 true');

console.log('\n  方法二：印出它的原始碼');
console.log('   ', isValid.toString());

console.log('\n  方法三：看它的「長相」');
console.log('    isValid.name   =', isValid.name,   ' ← 函式叫什麼名字');
console.log('    isValid.length =', isValid.length, ' ← 它需要幾個參數');
console.log('    typeof isValid =', typeof isValid);

line('Part 4｜every 到底怎麼把資料餵給 isValid（這才是你想看的）');

// 包一層，把每次呼叫都印出來
let callCount = 0;
const isValidTraced = (request) => {
  callCount++;
  const result = request.status === 'ok' && request.payload !== null;
  console.log(`    第 ${callCount} 次呼叫：收到 id=${request.id} → 回傳 ${result}`);
  return result;
};

console.log('  執行 requests.every(isValidTraced)：');
const answer = requests.every(isValidTraced);
console.log(`  最終結果：${answer}`);
console.log(`  isValid 總共被呼叫 ${callCount} 次（陣列有 ${requests.length} 筆）`);
console.log(`
  看懂了嗎：
    every 自己跑迴圈，把陣列裡的元素「一個一個」丟進 isValid，
    你完全不用管迴圈怎麼跑、索引是多少。

    id=1 → true  → 繼續
    id=2 → false → 立刻停止，不再檢查 id=3   ← 這就是短路
`);

line('Part 5｜證明 isValid 真的不依賴 requests');

// 換一個完全不相干的陣列，isValid 照樣能用
const otherThings = [
  { id: 'X', status: 'ok', payload: 'hello' },
  { id: 'Y', status: 'ok', payload: 'world' },
];
console.log('  用同一個 isValid 檢查另一個陣列：');
console.log('   ', otherThings.every(isValid));
console.log('  → 這就是為什麼 isValid 是「可重用的商業邏輯」，');
console.log('    而 let everyRequestValid 只服務那一個迴圈，是「拋棄式的實作細節」');

console.log('\nNode 版本:', process.version, '\n');
