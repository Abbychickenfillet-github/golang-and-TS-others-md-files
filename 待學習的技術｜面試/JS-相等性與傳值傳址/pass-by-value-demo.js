/**
 * pass-by-value-demo.js
 * 執行方式：node pass-by-value-demo.js
 * 對應筆記：JS-相等性與傳值傳址.md
 * 驗證日期：2026-08-06　驗證環境：Node v22.22.2
 *
 * 這支檔案的唯一目的：用「重新賦值」把 pass by value 與 pass by reference 切開。
 */

const line = (t) => console.log('\n===== ' + t + ' =====');

/* ---------------------------------------------------------------
 * 實驗一　改屬性（mutate）
 * 函式拿到的是「位址的複本」，複本與外面的變數指向同一個 Heap 物件，
 * 所以改屬性時外面看得到。
 * --------------------------------------------------------------- */
line('實驗一　改屬性');
function mutate(o) { o.name = 'changed'; }
const a = { name: 'origin' };
mutate(a);
console.log("a.name =", a.name);   // 'changed'  → 呼叫端看得到

/* ---------------------------------------------------------------
 * 實驗二　重新賦值（reassign）── 判定的關鍵
 * 如果 JS 是 pass by reference，b 應該會被換成 brandNew。
 * 實際上沒有，因為函式改的只是「自己那份位址複本」。
 * --------------------------------------------------------------- */
line('實驗二　重新賦值（決定性證據）');
function reassign(o) { o = { name: 'brandNew' }; }
const b = { name: 'origin' };
reassign(b);
console.log("b.name =", b.name);   // 'origin'   → 呼叫端看不到

/* ---------------------------------------------------------------
 * 實驗三　let obj1 = obj2 的兩種「改」
 * 這正是被問到時最容易講糊的地方，一定要分開講。
 * --------------------------------------------------------------- */
line('實驗三　賦值後的兩種改法');
let obj1 = { name: 'A' };
let obj2 = obj1;

obj2.name = 'B';                   // 改「屬性」：動到同一個 Heap 物件
console.log("改屬性後   obj1.name =", obj1.name);   // 'B'   會連動

obj2 = { name: 'C' };              // 改「變數本身」：只換掉 obj2 這一格的值
console.log("重新賦值後 obj1.name =", obj1.name);   // 'B'   不會連動
console.log("Object.is(obj1, obj2) =", Object.is(obj1, obj2));  // false

/* ---------------------------------------------------------------
 * 實驗四　基本型別當然也是傳值
 * --------------------------------------------------------------- */
line('實驗四　基本型別');
function addOne(n) { n = n + 1; return n; }
let num = 10;
const returned = addOne(num);
console.log("num =", num, "／ 回傳值 =", returned);   // 10 ／ 11

/* ---------------------------------------------------------------
 * 實驗五　真正想「換掉呼叫端的物件」要怎麼做
 * JS 沒有 pass by reference，只能回傳新值，或包一層容器。
 * --------------------------------------------------------------- */
line('實驗五　JS 的替代做法');
function replaceByReturn(o) { return { ...o, name: 'brandNew' }; }
let c = { name: 'origin' };
c = replaceByReturn(c);
console.log("回傳新物件再接回來 c.name =", c.name);   // 'brandNew'

const box = { value: { name: 'origin' } };
function replaceViaBox(container) { container.value = { name: 'brandNew' }; }
replaceViaBox(box);
console.log("包一層容器 box.value.name =", box.value.name);   // 'brandNew'

/* ---------------------------------------------------------------
 * 小結
 *   a. JS 一律 pass by value
 *   b. 物件的「值」就是那個位址（reference）
 *   c. 這個模式的正式名稱是 call by sharing（Barbara Liskov 提出）
 *   d. 判定方法：函式內重新賦值，呼叫端有沒有跟著換
 * --------------------------------------------------------------- */
