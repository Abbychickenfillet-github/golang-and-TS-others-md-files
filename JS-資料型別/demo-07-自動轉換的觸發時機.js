/**
 * =====================================================================================
 * demo-07-自動轉換的觸發時機.js
 * 主題：什麼時候 JavaScript 會偷偷幫你轉型別（coercion，強制轉換）
 * 執行：node demo-07-自動轉換的觸發時機.js
 *
 * 名詞先講清楚：
 *   a. coercion（強制轉換）：語言在你沒明說的情況下，自動把值轉成別的型別
 *   b. abstract operation（抽象操作）：規格裡定義的內部函式，你叫不到它，但語言到處在用。
 *      跟型別有關的五個入口：
 *        ToBoolean      → 需要真假值時
 *        ToNumber       → 需要數字時
 *        ToNumeric      → 需要數字或 BigInt 時（算術運算子用這個）
 *        ToString       → 需要字串時
 *        ToPropertyKey  → 需要一個物件的鍵時
 *      物件要先經過 ToPrimitive（轉成原始值）才能進上面任何一個
 *   c. hint（提示）：呼叫 ToPrimitive 時傳的偏好，有 "number"、"string"、"default" 三種
 * =====================================================================================
 */

console.log('===== 入口 1：ToBoolean —— 只有 8 個 falsy，其他全是 truthy =====');

const falsy = [false, 0, -0, 0n, '', null, undefined, NaN];
console.log('   falsy 清單：false, 0, -0, 0n, "", null, undefined, NaN　共 8 個');
console.log('   全部檢查    →', falsy.every((v) => !v));
console.log('   容易誤判的 truthy：');
[[], {}, '0', 'false', ' ', function () {}, new Boolean(false), -1, Infinity].forEach((v) => {
  const label = typeof v === 'function' ? 'function(){}' : JSON.stringify(v) ?? String(v);
  console.log(`     ${String(label).padEnd(16)} → ${Boolean(v) ? 'truthy' : 'falsy'}`);
});
console.log('   觸發時機：if()、while()、!、&&、||、三元運算子、Array.prototype.filter 的回傳值');
console.log('   ⚠️ 表單輸入 "0" 是 truthy，但 Number("0") 是 falsy，這是最常見的判斷事故');


console.log('\n===== 入口 2：ToNumber / ToNumeric —— 算術運算子 =====');

const arith = [
  ['"5" - 2', '5' - 2],
  ['"5" * "2"', '5' * '2'],
  ['"5" / 2', '5' / 2],
  ['true + 1', true + 1],
  ['null + 1', null + 1],
  ['undefined + 1', undefined + 1],
  ['[] * 2', [] * 2],
  ['[3] * 2', [3] * 2],
  ['[1,2] * 2', [1, 2] * 2],
  ['"abc" - 1', 'abc' - 1],
];
arith.forEach(([expr, val]) => console.log(`   ${expr.padEnd(16)} → ${String(val).padEnd(8)} (${typeof val})`));
console.log('   規則：-、*、/、%、** 一律走 ToNumeric，沒有字串特例');
console.log('   ⚠️ null → 0 但 undefined → NaN，這兩個很容易搞混');


console.log('\n===== 入口 3：ToString —— 加號的字串特例 =====');

const plus = [
  ['1 + "2"', 1 + '2'],
  ['1 + 2 + "3"', 1 + 2 + '3'],
  ['"1" + 2 + 3', '1' + 2 + 3],
  ['[] + []', [] + []],
  ['[] + {}', [] + {}],
  ['[1,2] + [3]', [1, 2] + [3]],
  ['1 + null', 1 + null],
  ['1 + undefined', 1 + undefined],
];
plus.forEach(([expr, val]) => console.log(`   ${expr.padEnd(16)} → ${JSON.stringify(val)} (${typeof val})`));
console.log('   規則：兩邊先各自 ToPrimitive，只要其中一邊變成字串就做串接，否則做加法');
console.log('   ⚠️ 1 + 2 + "3" 是 "33"，"1" + 2 + 3 是 "123"，因為 + 是左結合，順序決定一切');
console.log('   其他 ToString 入口：`${x}` 模板字串、String(x)、alert(x)、陣列 join');


console.log('\n===== 入口 4：ToPrimitive —— 物件怎麼變成原始值 =====');

// 查找順序：Symbol.toPrimitive → 依 hint 決定 valueOf 與 toString 誰先
const spy = {
  [Symbol.toPrimitive](hint) {
    console.log(`     Symbol.toPrimitive 被呼叫，hint = "${hint}"`);
    if (hint === 'number') return 42;
    if (hint === 'string') return 'FORTY-TWO';
    return 'default-42';
  },
};
console.log('   +spy（單元加號，hint = number）');
console.log('     結果 →', +spy);
console.log('   `${spy}`（模板字串，hint = string）');
console.log('     結果 →', `${spy}`);
console.log('   spy + ""（加號，hint = default）');
console.log('     結果 →', spy + '');

// 沒有 Symbol.toPrimitive 時的預設順序
const order = [];
const plain = {
  valueOf() { order.push('valueOf'); return 7; },
  toString() { order.push('toString'); return 'seven'; },
};
console.log('   沒有 Symbol.toPrimitive 時：');
console.log('     plain * 1  →', plain * 1, '　呼叫順序', JSON.stringify(order));
order.length = 0;
console.log('     `${plain}` →', `${plain}`, '　呼叫順序', JSON.stringify(order));
console.log('   結論：hint number/default 先試 valueOf，hint string 先試 toString');
console.log('   這就是為什麼 [] + {} 是 "[object Object]"：陣列的 toString 給 ""，物件的給 "[object Object]"');


console.log('\n===== 入口 5：ToPropertyKey —— 物件的鍵一定是字串或 Symbol =====');

const obj = {};
obj[1] = 'number one';
obj['1'] = 'string one'; // 覆蓋掉上面那個，因為 1 被轉成 "1"
obj[true] = 'boolean';
obj[{ a: 1 }] = 'object as key';
obj[[1, 2]] = 'array as key';
console.log('   obj →', obj);
console.log('   obj[1] === obj["1"] →', obj[1] === obj['1'], '← 同一格');
console.log('   Object.keys →', Object.keys(obj));
console.log('   ⚠️ 用數字或物件當一般物件的 key，會被 ToPropertyKey 壓成字串而互相覆蓋');
console.log('   要保留型別請用 Map，Map 的 key 用 SameValueZero 比對，不轉型');
const m = new Map([[1, 'number one'], ['1', 'string one']]);
console.log('   Map 的話 →', m.get(1), '/', m.get('1'), '← 兩格');


console.log('\n===== 入口 6：關係運算子與 sort =====');

console.log('   "10" < "9"  →', '10' < '9', '← 兩邊都是字串，做字典序比較');
console.log('   "10" < 9    →', '10' < 9, '← 有一邊是數字，兩邊都 ToNumber');
console.log('   [10, 9, 1].sort() →', [10, 9, 1].sort(), '← sort 預設把元素 ToString 再比字典序');
console.log('   正確寫法 [10,9,1].sort((a,b) => a-b) →', [10, 9, 1].sort((a, b) => a - b));


console.log('\n===== 入口 7：== 的轉換規則（=== 完全不轉）=====');

const eq = [
  ['0 == ""', 0 == ''],
  ['0 == "0"', 0 == '0'],
  ['"" == "0"', '' == '0'],
  ['null == undefined', null == undefined],
  ['null == 0', null == 0],
  ['null == false', null == false],
  ['NaN == NaN', NaN == NaN],
  ['[] == false', [] == false],
  ['[1,2] == "1,2"', [1, 2] == '1,2'],
];
eq.forEach(([expr, val]) => console.log(`   ${expr.padEnd(20)} → ${val}`));
console.log('   ⚠️ 0 == "" 與 0 == "0" 都 true，但 "" == "0" 是 false → == 不具遞移性');
console.log('   ⚠️ null 與 undefined 在 == 的世界只跟彼此相等，跟 0、""、false 都不等（規格特例）');
console.log('   實務結論：一律用 ===，只有一個例外 x == null 可以同時擋掉 null 與 undefined');


console.log('\n===== 總結：七個入口 =====');
console.log([
  'a. ToBoolean      → if / while / ! / && / || / 三元',
  'b. ToNumeric      → - * / % ** 與 ++ --',
  'c. ToString       → + 的字串特例、模板字串、String()、陣列 join',
  'd. ToPrimitive    → 物件參與上面任何運算前的必經之路（Symbol.toPrimitive → valueOf → toString）',
  'e. ToPropertyKey  → obj[任何東西] 都會被壓成字串或 Symbol',
  'f. 關係運算       → < > <= >=，兩邊都是字串才比字典序，否則 ToNumber',
  'g. IsLooselyEqual → == 的專屬演算法，跟 truthy/falsy 是兩回事',
].join('\n'));
