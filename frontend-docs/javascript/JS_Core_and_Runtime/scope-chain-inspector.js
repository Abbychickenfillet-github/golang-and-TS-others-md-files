/**
 * 把「真實的作用域鏈」印出來
 * 執行方式：node scope-chain-inspector.js
 *
 * 原理：node:inspector 是 Node 內建的模組，講的是跟 Chrome DevTools
 * 同一套 V8 Inspector Protocol。在 debugger; 斷點暫停時，
 * Debugger.paused 事件會夾帶 callFrames，每個 frame 有 scopeChain，
 * 那就是引擎眼中的作用域鏈本體。
 *
 * 對應筆記：14-詞法作用域-Lexical-Scope-面試四段式.md 的 1-3 小節
 * 實測環境：Node v22.22.2，2026-08-06
 */

const inspector = require('node:inspector');
const session = new inspector.Session();
session.connect();

const post = (method, params) =>
  new Promise((res, rej) => session.post(method, params, (e, r) => (e ? rej(e) : res(r))));

let captured = null;
session.post('Debugger.enable', () => {});
session.on('Debugger.paused', (msg) => { captured = msg.params.callFrames[0]; });

/* ---------- 被觀察的程式碼（跟主軸圖同一份） ---------- */
const APP = 'lexical-scope-demo';        // 外層有宣告，但內層沒用到

function makeCounter(label) {
  let count = 0;
  const secret = 'never-used';           // 外層有宣告，但內層沒用到
  return function tick(step) {
    count += step;
    debugger;                            // ← 引擎在這裡暫停
    return count + label.length;         // 內層有用到 label 與 count
  };
}

makeCounter('A')(1);
/* ----------------------------------------------------- */

(async () => {
  const rows = [];
  for (const scope of captured.scopeChain) {
    let vars = [];
    if (scope.object.objectId) {
      const r = await post('Runtime.getProperties', {
        objectId: scope.object.objectId,
        ownProperties: true,
      });
      vars = r.result.map((p) => p.name);
      if (scope.type === 'global') vars = ['(全域內建：setTimeout、console…)'];
    }
    rows.push(`${scope.type.padEnd(10)} | ${(scope.name || '-').padEnd(12)} | ${vars.join(', ')}`);
  }

  console.log('scope type | 所屬函式     | 這一層看得到的變數');
  console.log('-'.repeat(70));
  console.log(rows.join('\n'));

  // 關鍵結論：V8 只捕獲內層真的有引用到的變數
  const dump = JSON.stringify(rows);
  console.log('\nAPP 在鏈上嗎？   ', dump.includes('APP'));
  console.log('secret 在鏈上嗎？', dump.includes('secret'));

  session.disconnect();
})();
