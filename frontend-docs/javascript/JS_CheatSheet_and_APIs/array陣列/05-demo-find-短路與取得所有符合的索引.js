/**
 * demo-find-短路與取得所有符合的索引.js
 * 搭配筆記：find方法-短路與falsy陷阱-如何取得所有符合的索引.md
 * 執行：node demo-find-短路與取得所有符合的索引.js
 */
const line = t => console.log("\n" + "=".repeat(56) + "\n" + t + "\n" + "=".repeat(56));

line("1. 你原本那段的真實輸出（不是 undefined）");

const array1 = [15, 555, 80, 7, 0, 77589];
const find1 = array1.find((e, i) => e < 2);

console.log("find1 =", find1, "| typeof:", typeof find1);
console.log("find1 === undefined ?", find1 === undefined);   // false ← 它回傳的是數字 0
console.log("陣列裡其實只有", array1.filter(e => e === 0).length, "個 0");

line("2. 真正的陷阱：回傳值是 0，而 0 是 falsy");

if (find1) console.log("進到 if");
else console.log("⚠️ 沒進 if，但其實有找到！因為回傳的 0 是 falsy");

// ✅ 正確寫法：跟 undefined 比，不要直接丟進 if
if (find1 !== undefined) console.log("✅ 用 !== undefined 判斷才對，有找到：", find1);

line("3. find 找不到時才回 undefined");

console.log(array1.find(e => e < -999));   // undefined

line("4. 拿索引：findIndex / findLastIndex（只給一個）");

const arr2 = [15, 0, 80, 7, 0, 77589];      // 這次真的放兩個 0
console.log("findIndex     →", arr2.findIndex(e => e === 0));      // 1  第一個
console.log("findLastIndex →", arr2.findLastIndex(e => e === 0));  // 4  最後一個

line("5. 拿到「全部」符合的索引：四種寫法");

// (a) flatMap —— 最簡潔，符合就回 [i]，不符合回 [] 自動被攤平掉
const byFlatMap = arr2.flatMap((e, i) => (e === 0 ? [i] : []));
console.log("(a) flatMap        →", byFlatMap);

// (b) reduce —— 累加器手動 push，最通用
const byReduce = arr2.reduce((acc, e, i) => (e === 0 ? [...acc, i] : acc), []);
console.log("(b) reduce         →", byReduce);

// (c) 先 map 成索引再 filter —— 最好讀，但走兩趟
const byMapFilter = arr2.map((e, i) => (e === 0 ? i : -1)).filter(i => i !== -1);
console.log("(c) map + filter   →", byMapFilter);

// (d) 用 keys() 拿索引再 filter —— 不碰元素，直接對索引過濾
const byKeys = [...arr2.keys()].filter(i => arr2[i] === 0);
console.log("(d) keys + filter  →", byKeys);

// (e) 老派：indexOf 的第二參數 fromIndex，一路往後找
const byIndexOf = [];
let pos = arr2.indexOf(0);
while (pos !== -1) {
  byIndexOf.push(pos);
  pos = arr2.indexOf(0, pos + 1);   // 從下一格繼續找
}
console.log("(e) indexOf 迴圈    →", byIndexOf);

line("6. ⚠️ (c) 寫法的坑：如果 0 本身就是合法索引呢");

const arr3 = [0, 5, 0];
// 用 -1 當哨兵值沒問題，但如果你用 0 當哨兵就會把索引 0 誤殺
console.log("正確（哨兵用 -1）→", arr3.map((e, i) => (e === 0 ? i : -1)).filter(i => i !== -1));
console.log("錯誤（哨兵用 0）  →", arr3.map((e, i) => (e === 0 ? i : 0)).filter(i => i !== 0));
console.log("   ↑ 索引 0 被自己的哨兵值吃掉了，只剩 [2]");

line("7. find 家族一次看懂：回傳的東西完全不同");

const data = [15, 0, 80, 7, 0, 77589];
console.log("find        →", data.find(e => e === 0), "      元素");
console.log("findIndex   →", data.findIndex(e => e === 0), "      索引");
console.log("filter      →", data.filter(e => e === 0), "  符合的元素組成的新陣列");
console.log("some        →", data.some(e => e === 0), "   有沒有任何一個符合（布林）");
console.log("every       →", data.every(e => e === 0), "  是不是全部都符合（布林）");
console.log("includes    →", data.includes(0), "   有沒有這個值（不吃 callback）");
console.log("indexOf     →", data.indexOf(0), "      第一個的索引（不吃 callback）");

line("8. 短路證明：find 找到就不再往下跑");

let count = 0;
[1, 2, 3, 4, 5].find(e => { count++; return e === 3; });
console.log("陣列長度 5，但 callback 只被呼叫了", count, "次 ← 找到就停");

count = 0;
[1, 2, 3, 4, 5].filter(e => { count++; return e === 3; });
console.log("換成 filter，callback 被呼叫了", count, "次 ← 全部走完");
