/**
 * 詞法作用域 Lexical Scope 可執行範例
 * 執行方式：node lexical-scope-demo.js
 * 對應筆記：14-詞法作用域-Lexical-Scope-面試四段式.md
 */

const line = (t) => console.log('\n===== ' + t + ' =====');

/* ---------------------------------------------------------
 * 實驗一：作用域鏈的三層（對應主軸圖）
 * ------------------------------------------------------- */
line('實驗一：三層鏈');

const APP = 'demo';                 // script / global 層
function makeCounter(label) {       // makeCounter 層
  let count = 0;
  const secret = 'never-used';      // 有宣告但內層沒用到 → 不會被捕獲
  return function tick(step) {      // tick 層
    count += step;
    return `${label}：count=${count}`;
  };
}
const t = makeCounter('按鈕A');
console.log(t(1));   // 按鈕A：count=1
console.log(t(1));   // 按鈕A：count=2  ← count 活在 closure 裡
console.log('APP 仍看得到：', APP);

/* ---------------------------------------------------------
 * 實驗二：每次呼叫外層 → 一份全新的環境紀錄
 * ------------------------------------------------------- */
line('實驗二：兩個 counter 互不干擾');

const a = makeCounter('A');
const b = makeCounter('B');
a(1); a(1);
console.log(a(1));   // A：count=3
console.log(b(1));   // B：count=1  ← 各自獨立

/* ---------------------------------------------------------
 * 實驗三：詞法 vs 動態（JS 是詞法的）
 * ------------------------------------------------------- */
line('實驗三：詞法 vs 動態');

const who = '我出生的地方';
function sayWho() {
  return who;                       // 看的是「寫下來的位置」
}
function caller() {
  const who = '呼叫我的地方';        // 動態作用域才會拿到這一個
  return sayWho();
}
console.log(caller());               // 我出生的地方 ← 證明是詞法作用域

/* ---------------------------------------------------------
 * 實驗四：var vs let 在迴圈裡的差別
 * ------------------------------------------------------- */
line('實驗四：var vs let ＋ setTimeout');

for (var i = 0; i < 3; i++) setTimeout(() => process.stdout.write(`var:${i} `), 0);
for (let j = 0; j < 3; j++) setTimeout(() => process.stdout.write(`let:${j} `), 0);

setTimeout(() => {
  console.log('\n（var 三個共用同一份環境紀錄；let 每輪一份新的）');

  /* -------------------------------------------------------
   * 實驗五：遮蔽 Shadowing ＋ TDZ
   * ----------------------------------------------------- */
  line('實驗五：遮蔽與 TDZ');

  const name = '外層';
  function f() {
    try {
      console.log(name);            // 期待印「外層」，實際丟錯
      let name = '內層';
      return name;
    } catch (e) {
      return `${e.constructor.name}：${e.message}`;
    }
  }
  console.log(f());                 // ReferenceError：Cannot access 'name' before initialization
  console.log('外層的 name 完好無缺：', name);

  /* -------------------------------------------------------
   * 實驗六：走到鏈的盡頭
   * ----------------------------------------------------- */
  line('實驗六：鏈的盡頭');
  try {
    // eslint-disable-next-line no-undef
    console.log(ghost);
  } catch (e) {
    console.log(`${e.constructor.name}：${e.message}`);
  }
}, 10);
