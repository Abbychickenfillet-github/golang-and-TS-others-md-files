/**
 * object-is-demo.js
 * 執行方式：node object-is-demo.js
 * 對應筆記：JS-相等性與傳值傳址.md
 * 驗證日期：2026-08-06　驗證環境：Node v22.22.2
 */

const W = 30;
const show = (label, value) => console.log('  ' + label.padEnd(W) + ' -> ' + value);
const sec = (t) => console.log('\n' + t);

console.log('=== Node ' + process.version + ' 實際執行 ===');

/* ---------------------------------------------------------------
 * A. NaN：=== 與 Object.is 的分歧
 *
 * IEEE 754 規定 NaN 與任何值（含自己）比較都不相等。
 * 所以 IsLooselyEqual（==）與 IsStrictlyEqual（===）都判 false。
 * SameValue（Object.is）與 SameValueZero 則刻意把 NaN 視為與自己相同。
 * --------------------------------------------------------------- */
sec('--- A. NaN：=== 與 Object.is 的分歧 ---');
show('NaN === NaN', NaN === NaN);                      // false
show('NaN == NaN', NaN == NaN);                        // false
show('Object.is(NaN, NaN)', Object.is(NaN, NaN));      // true   SameValue
show('[NaN].indexOf(NaN)', [NaN].indexOf(NaN));        // -1     indexOf 用 ===
show('[NaN].includes(NaN)', [NaN].includes(NaN));      // true   includes 用 SameValueZero
show('new Set([NaN, NaN]).size', new Set([NaN, NaN]).size);  // 1  Set 用 SameValueZero
show('Number.isNaN(NaN)', Number.isNaN(NaN));          // true   實務上判 NaN 的首選

/* ---------------------------------------------------------------
 * B. +0 / -0：SameValue 與 SameValueZero 的「唯一」差別
 *
 * 兩者對 NaN 的處理完全一樣，只有正負零不同：
 *   SameValue      → +0 與 -0 是不同的值
 *   SameValueZero  → +0 與 -0 是同一個值（名字裡的 Zero 就是在講這件事）
 * --------------------------------------------------------------- */
sec('--- B. +0 / -0：SameValue 與 SameValueZero 的唯一差別 ---');
show('0 === -0', 0 === -0);                            // true
show('Object.is(0, -0)', Object.is(0, -0));            // false  只有它分得出來
show('Object.is(-0, -0)', Object.is(-0, -0));          // true
show('[-0].includes(0)', [-0].includes(0));            // true   SameValueZero 併零
show('new Set([0, -0]).size', new Set([0, -0]).size);  // 1
show("new Map([[0,'a']]).get(-0)", new Map([[0, 'a']]).get(-0));  // 'a'
show('1/0', 1 / 0);                                    // Infinity   證明 +0 與 -0 真的不同
show('1/-0', 1 / -0);                                  // -Infinity

/* ---------------------------------------------------------------
 * C. 除了上面兩種特例，Object.is 的行為完全等同 ===
 * --------------------------------------------------------------- */
sec('--- C. 其他情況 Object.is 等同 === ---');
show("Object.is(1, '1')", Object.is(1, '1'));                  // false 不做型別轉換
show("1 == '1'", 1 == '1');                                    // true  == 會轉型
show('Object.is(null, undefined)', Object.is(null, undefined));// false
show('null == undefined', null == undefined);                  // true
show('Object.is({}, {})', Object.is({}, {}));                  // false 比位址不比內容

/* ---------------------------------------------------------------
 * D. 自己實作一次，最能記住兩個演算法的差別
 * --------------------------------------------------------------- */
sec('--- D. 手刻 polyfill 驗證 ---');

function myObjectIs(x, y) {
  if (x === y) {
    // 唯一要補救的：x === y 為 true 但其實是 +0 與 -0
    return x !== 0 || 1 / x === 1 / y;
  }
  // 唯一要補救的：x === y 為 false 但兩邊都是 NaN
  return x !== x && y !== y;
}

function sameValueZero(x, y) {
  return x === y || (x !== x && y !== y);   // 只補 NaN，不管正負零
}

show('myObjectIs(NaN, NaN)', myObjectIs(NaN, NaN));       // true
show('myObjectIs(0, -0)', myObjectIs(0, -0));             // false
show('sameValueZero(NaN, NaN)', sameValueZero(NaN, NaN)); // true
show('sameValueZero(0, -0)', sameValueZero(0, -0));       // true

const pass =
  myObjectIs(NaN, NaN) === Object.is(NaN, NaN) &&
  myObjectIs(0, -0) === Object.is(0, -0) &&
  sameValueZero(0, -0) === [0].includes(-0);
console.log('\npolyfill 與原生行為一致：' + pass);
