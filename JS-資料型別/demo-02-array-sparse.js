// demo-02：稀疏陣列（sparse）與 React 星星評分的三種寫法
// 執行：node demo-02-array-sparse.js
'use strict';

console.log("--- new Array() 的參數陷阱 ---");
console.log(new Array(3));                        // [ <3 empty items> ]  稀疏
console.log(new Array(3).length, new Array(3)[0]); // 3 undefined
console.log(0 in new Array(3));                    // false  ← 索引根本不存在
console.log(new Array("3"), new Array(true), new Array(1, 2, 3));

console.log("\n--- sparse vs dense ---");
const sparse = new Array(2);
const dense = [undefined, undefined];
console.log("0 in sparse:", 0 in sparse, "| 0 in dense:", 0 in dense);

console.log("\n--- 陣列方法會跳過空位 ---");
let n = 0;
new Array(3).map(() => { n++; });
console.log("map callback 被呼叫次數:", n);   // 0

console.log("\n--- React 星星評分：四種寫法的實際結果 ---");
console.log("❌ [...Array(5).map(...)]      ", JSON.stringify([...Array(5).map((_, i) => i)]));
console.log("✅ [...Array(5)].map(...)      ", JSON.stringify([...Array(5)].map((_, i) => i)));
console.log("✅ Array(5).fill(0).map(...)   ", JSON.stringify(new Array(5).fill(0).map((_, i) => i)));
console.log("✅ Array.from({length:5}, fn)  ", JSON.stringify(Array.from({ length: 5 }, (_, i) => i)));

console.log("\n--- 判斷是不是陣列 ---");
const arr = new Array({ name: "Christine" });
console.log(typeof arr, Array.isArray(arr), arr instanceof Array,
            Object.prototype.toString.call(arr));
