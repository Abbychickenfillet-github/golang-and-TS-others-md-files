/**
 * Day 20：API 呼叫永遠在賽跑
 *   證明「請求發出的順序」不等於「回應抵達的順序」，
 *   以及三種處理方式的差別。
 * 執行：node day20-race-condition.js
 */
const line = (t) => console.log('\n' + '─'.repeat(62) + '\n' + t + '\n' + '─'.repeat(62));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 模擬一個 API：關鍵是「不同的查詢字串，回應時間不一樣」
// 白話講：越短的字串通常搜尋結果越多、伺服器越慢，這在真實世界很常見
const fakeApi = async (q) => {
  const delay = { 'r': 500, 're': 400, 'rea': 300, 'reac': 200, 'react': 100 }[q] ?? 150;
  await sleep(delay);
  return { query: q, result: `「${q}」的搜尋結果`, tookMs: delay };
};

async function main() {
line('Part 1｜使用者打字，每個字元發一次請求');

const typing = ['r', 're', 'rea', 'reac', 'react'];
console.log('  使用者依序打出：', typing.join(' → '));
console.log('  每個字元發一個請求，模擬的回應時間：');
for (const q of typing) {
  const d = { 'r': 500, 're': 400, 'rea': 300, 'reac': 200, 'react': 100 }[q];
  console.log(`    「${q}」`.padEnd(14), `${d} ms`);
}
console.log('\n  → 注意：先發出的請求反而最慢回來');

line('Part 2｜做法一：誰回來就用誰（最常見的錯誤寫法）');

// 白話講：模擬 useEffect 裡直接 setState，不做任何防護
let screenA = '（還沒有結果）';
await Promise.all(typing.map(async (q) => {
  const res = await fakeApi(q);
  screenA = res.result;                       // 誰後回來誰覆蓋
  console.log(`    ${res.tookMs} ms 後「${q}」回來了 → 畫面變成：${res.result}`);
}));
console.log(`\n  最終畫面：${screenA}`);
console.log('  ⚠️ 使用者明明打完了 react，畫面卻停在「r」的結果');
console.log('     因為「r」最慢回來，把正確答案蓋掉了。');

line('Part 3｜為什麼本機測不出這個 bug');

console.log(`
  本機開發時：
    API 在 localhost，每個請求都 5～20 ms 回來，
    而且延遲差異極小 → 幾乎總是「先發先回」，看起來完全正常。

  上線之後：
    使用者在行動網路、跨國連線、伺服器負載不均，
    延遲從 50 ms 跳到 800 ms，順序開始錯亂。

  這就是為什麼競態條件（race condition）被稱為
  「在你的電腦上永遠不會發生的 bug」。
`);

line('Part 4｜做法二：用旗標忽略過期的回應（手寫解法）');

let screenB = '（還沒有結果）';
let latestRequestId = 0;

async function searchWithGuard(q) {
  const myId = ++latestRequestId;             // 每次發請求就拿一個號碼牌
  const res = await fakeApi(q);
  // 白話講：回來之後先check「我還是最新的那個嗎」，不是就直接丟掉
  if (myId !== latestRequestId) {
    console.log(`    ${res.tookMs} ms 後「${q}」回來了 → 已過期，丟棄`);
    return;
  }
  screenB = res.result;
  console.log(`    ${res.tookMs} ms 後「${q}」回來了 → 採用，畫面更新`);
}

await Promise.all(typing.map(q => searchWithGuard(q)));
console.log(`\n  最終畫面：${screenB}`);
console.log('  ✅ 正確了。但注意這段程式碼做了什麼：');
console.log('     多了一個模組層級的 latestRequestId、每次要記號碼牌、回來要比對。');
console.log('     而這只解決了「競態」一件事，還沒處理 loading、error、快取、重新取得。');

line('Part 5｜做法三：交給 TanStack Query（queryKey 天然解決）');

// 極簡版模擬：用 Map 當快取，key 就是查詢字串
const cache = new Map();
let activeKey = null;

async function useQuerySim(key) {
  activeKey = key;                            // 目前畫面關心的是哪個 key
  if (cache.has(key)) {
    console.log(`    「${key}」命中快取，0 ms 直接顯示`);
    return cache.get(key);
  }
  const res = await fakeApi(key);
  cache.set(key, res);
  // 白話講：結果存進 key 對應的格子。畫面只讀 activeKey 那一格，
  //         所以舊 key 的結果回來也只是填進它自己的格子，不會蓋到畫面
  const used = key === activeKey;
  console.log(`    ${res.tookMs} ms 後「${key}」回來了 → 存進快取[${key}]${used ? '，且是目前的 key，顯示它' : '，非目前 key，只存不顯示'}`);
  return res;
}

await Promise.all(typing.map(k => useQuerySim(k)));
console.log(`\n  最終畫面：${cache.get(activeKey).result}`);
console.log('  ✅ 正確，而且多了一個附加好處：');

console.log('\n  使用者按 Backspace 退回「reac」時：');
await useQuerySim('reac');
console.log('  → 不用重發請求，因為那個 key 的結果還在快取裡。');

line('Part 6｜三種做法的代價對照');

const rows = [
  ['誰回來就用誰',      '0 行',   '❌ 會顯示錯的結果', '❌', '❌', '❌'],
  ['手寫旗標防護',      '約 8 行', '✅ 正確',          '自己寫', '自己寫', '❌'],
  ['TanStack Query',   '約 3 行', '✅ 正確',          '內建',   '內建',   '✅'],
];
console.log('  做法'.padEnd(20), '額外程式碼'.padEnd(12), '競態'.padEnd(20), 'loading', 'error', '快取');
console.log('  ' + '-'.repeat(78));
for (const r of rows) {
  console.log('  ' + r[0].padEnd(18), r[1].padEnd(12), r[2].padEnd(20), r[3].padEnd(8), r[4].padEnd(7), r[5]);
}

console.log('\nNode 版本:', process.version, '\n');
}

main();
