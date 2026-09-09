// demo-04：「用 var 才能做 concat？」— 不是，差在有沒有 console.log
// 執行：node demo-04-concat-var-let-const.js
'use strict';

console.log("--- 三種宣告方式的結果完全一樣 ---");
var s1 = "con"; var n1 = 78;
let s2 = "con"; let n2 = 78;
const s3 = "con", n3 = 78;
console.log("var  :", s1 + n1, typeof (s1 + n1));   // con78 string
console.log("let  :", s2 + n2, typeof (s2 + n2));   // con78 string
console.log("const:", s3 + n3, typeof (s3 + n3));   // con78 string
console.log("concat 方法:", s2.concat(78));          // con78

console.log("\n--- 截圖裡的 7 + '7' 印出 77，但它是字串 ---");
const cost3 = 7 + '7';
console.log(cost3);            // 77        ← console.log 印字串不加引號
console.log(typeof cost3);     // string    ← 真相
console.log({ cost3 });        // { cost3: '77' }  ← 用物件包起來就看得到引號

console.log("\n--- + 運算子的完整規則 ---");
const cases = [
  ["1 + 2", 1 + 2], ['"1" + 2', "1" + 2], ['1 + "2"', 1 + "2"],
  ["[] + {}", [] + {}], ['null + "x"', null + "x"], ['undefined + "x"', undefined + "x"],
  ["1 + null", 1 + null], ["1 + undefined", 1 + undefined],
];
cases.forEach(([expr, val]) => console.log(expr.padEnd(18), "=>", JSON.stringify(val), `(${typeof val})`));

console.log("\n--- 其他算術運算子沒有字串特例 ---");
console.log('"con" - 78 =>', "con" - 78);   // NaN
console.log('"78" - 8   =>', "78" - 8);     // 70
console.log('"3" * "4"  =>', "3" * "4");    // 12

console.log("\n--- var / let / const 真正的差別（把註解取消看報錯）---");
var a = 1; var a = 2; console.log("var 可重複宣告 ->", a);
// let b = 1; let b = 2;   // SyntaxError: Identifier 'b' has already been declared
// const c = 1; c = 2;     // TypeError: Assignment to constant variable.
// console.log(tdz); let tdz = 1;  // ReferenceError: Cannot access 'tdz' before initialization
