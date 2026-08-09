// 程序式程式設計 vs 控制反轉 IoC 對照 demo
// 執行方式：node 程序式程式設計-demo.js
// 觀察重點：兩段的「印出順序」與「誰決定何時執行」

console.log('===== 第一段：程序式 Procedural（控制權在你手上）=====');

// 這三個是「可重用的函式庫」，它們完全被動，不呼叫就永遠不動
function readUser(name) { console.log('  [lib] readUser 被呼叫'); return { name }; }
function validate(u) { console.log('  [lib] validate 被呼叫'); return { ...u, ok: true }; }
function saveToDb(u) { console.log('  [lib] saveToDb 被呼叫'); return true; }

// main 在「你」手上，順序你全權決定，由上往下一路 return 回來
function main() {
  console.log('  [你] main 開始，接下來每一步都是我主動呼叫');
  const u = readUser('Abby');
  const v = validate(u);
  saveToDb(v);
  console.log('  [你] main 結束，控制權從頭到尾沒離開過我');
}
main();

console.log('\n===== 第二段：控制反轉 IoC（控制權讓渡給框架）=====');

// 一個 20 行的迷你框架，模擬 Express 或 AngularJS 的行為
const miniFramework = {
  handlers: {},
  // 你只是「登記」，不是執行
  on(event, fn) { console.log(`  [你] 登記了 ${event} 的處理函式，但它現在不會跑`); this.handlers[event] = fn; },
  // 框架自己啟動，自己決定何時回頭呼叫你
  run() {
    console.log('  [框架] 我接管了進入點，開始跑我的流程');
    console.log('  [框架] 我決定現在該叫 init 了');
    this.handlers.init?.({ from: 'framework' });
    console.log('  [框架] 我決定現在該叫 render 了');
    this.handlers.render?.({ from: 'framework' });
    console.log('  [框架] 流程結束，你的程式碼全程是被我呼叫的');
  },
};

// 你寫的只有這兩個 callback，它們何時執行你管不著
miniFramework.on('init', (ctx) => console.log(`    [你的程式碼] init 被 ${ctx.from} 呼叫了`));
miniFramework.on('render', (ctx) => console.log(`    [你的程式碼] render 被 ${ctx.from} 呼叫了`));

miniFramework.run(); // 這一行之後，main 就不是你的了

console.log('\n結論：呼叫方向不同 → 第一段你的程式 ──▶ 函式庫，第二段 框架 ──▶ 你的程式');
console.log('這個方向的翻轉就叫 Inversion of Control 控制反轉，口號是 Don\'t call us, we\'ll call you');
