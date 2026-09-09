// demo-01：7 種原始型別與 typeof 的兩個坑
// 執行：node demo-01-primitives-typeof.js
'use strict';

const samples = ["str", 1, true, Symbol("s"), null, undefined, 10n,
                 {}, [], function () {}, new Map()];
console.log(samples.map((v) => typeof v).join(" | "));
// string | number | boolean | symbol | object | undefined | bigint | object | object | function | object

console.log("\n--- 坑 1：typeof null ---");
console.log(typeof null);        // "object"  ← 1995 年留下的 bug
console.log(null === null);      // true      ← 正確的判斷方式

console.log("\n--- 坑 2：函式是物件的子型別 ---");
function fn() {}
fn.myProp = 1;
console.log(typeof fn, fn.myProp, fn instanceof Object);  // function 1 true

console.log("\n--- falsy 只有 8 個 ---");
const all = [false, 0, -0, 0n, "", null, undefined, NaN, [], {}, "0", "false"];
// 補充：JSON.stringify 遇到 BigInt 會直接丟 TypeError，所以這裡改用 String()
const show = (v) => (typeof v === "string" ? `"${v}"` : Object.is(v, -0) ? "-0" : String(v));
all.forEach((v) => console.log(String(typeof v).padEnd(10), show(v).padEnd(12), "->", Boolean(v)));

console.log("\n--- NaN ---");
console.log(NaN === NaN, Number.isNaN(NaN), isNaN("abc"), "con" - 78, "78" - 8);

console.log("\n--- BigInt ---");
console.log(typeof 9007199254740993n, 9007199254740993n + 1n);
try { console.log(1n + 1); } catch (e) { console.log(e.constructor.name + ":", e.message); }

// ============================================================================
// 補充：== 不是用 truthy / falsy 判斷的（對應筆記第 4-b 節）
// ============================================================================
console.log("\n\n=== 決定性反例：如果 == 走 truthy/falsy，這兩組不可能同時成立 ===");
console.log("Boolean([])        =>", Boolean([]),        "  ← 空陣列是 truthy");
console.log("[] == false        =>", [] == false,        "  ← 卻等於 false ？！");
console.log("Boolean(null)      =>", Boolean(null),      "  ← null 是 falsy");
console.log("null == false      =>", null == false,      "  ← 卻不等於 false ？！");
console.log("undefined == false =>", undefined == false);

console.log("\n=== 實際規則：轉成數字／原始值，不是轉成布林 ===");
[
  ['0 == false',    0 == false],
  ['"0" == false',  "0" == false],
  ['"" == false',   "" == false],
  ['"1" == true',   "1" == true],
  ['"abc" == true', "abc" == true],   // false：true→1，"abc"→NaN
  ['2 == true',     2 == true],       // false：true→1，2!==1（不是「2 是 truthy」）
  ['[] == 0',       [] == 0],
  ['[0] == false',  [0] == false],
  ['[1] == true',   [1] == true],
  ['"\\n" == 0',    "\n" == 0],       // true：前後空白會被去掉
  ['null == undefined', null == undefined],
  ['null == 0',     null == 0],       // false：null 只跟 undefined 相等
  ['NaN == NaN',    NaN == NaN],
  ['[] == ![]',     [] == ![]],       // 經典題
].forEach(([label, v]) => console.log(label.padEnd(20), "=>", v));

console.log("\n=== 完整對照：15 個值裡有 7 個不一致 ===");
const pairs = [
  [false, "false"], [0, "0"], [-0, "-0"], [0n, "0n"], ["", '""'],
  [null, "null"], [undefined, "undefined"], [NaN, "NaN"],
  [[], "[]"], [{}, "{}"], ["0", '"0"'], ["false", '"false"'],
  [" ", '" "'], [[0], "[0]"], [[[]], "[[]]"],
];
console.log("值".padEnd(12), "Boolean(v)".padEnd(12), "v == false".padEnd(12), "一致嗎");
pairs.forEach(([v, label]) => {
  const b = Boolean(v), e = (v == false);
  console.log(label.padEnd(12), String(b).padEnd(12), String(e).padEnd(12), b === !e ? "✅" : "❌ 不一致");
});

console.log("\n=== if (x) 走的才是 truthy / falsy ===");
const arr = [];
if (arr) console.log("if ([]) 進得去      => true   （[] 是 truthy）");
console.log("但 [] == false      =>", arr == false, "  ← 同一個值，兩套規則各走各的");

console.log("\n=== JavaScript 的四種「相等」===");
console.log("[NaN].includes(NaN)  =>", [NaN].includes(NaN), " SameValueZero，認得 NaN");
console.log("[NaN].indexOf(NaN)   =>", [NaN].indexOf(NaN),  "    indexOf 用 ===，認不得");
console.log("Object.is(NaN, NaN)  =>", Object.is(NaN, NaN), " SameValue");
console.log("Object.is(+0, -0)    =>", Object.is(+0, -0),   " 只有它區分正負零");
console.log("+0 === -0            =>", +0 === -0);
console.log("new Set([NaN,NaN]).size =>", new Set([NaN, NaN]).size, "  SameValueZero 所以只留一個");

console.log("\n=== 唯一值得用 == 的場合 ===");
for (const v of [null, undefined, 0, "", false, NaN]) {
  console.log(String(v).padEnd(12), "v == null =>", String(v == null).padEnd(6), "| !v =>", !v);
}
console.log("→ v == null 精準地只擋 null 與 undefined，!v 會連 0 和 \"\" 一起擋掉");
