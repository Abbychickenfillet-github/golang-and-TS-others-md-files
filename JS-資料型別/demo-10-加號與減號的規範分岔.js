/**
 * demo-10-加號與減號的規範分岔.js
 * 搭配筆記：JavaScript資料型別總覽-原始型別與物件.md  第 3-a 節
 *
 * 主題：為什麼 "78" - 8 是數字 70，而 "78" + 8 是字串 "788"
 * 規範依據：ECMA-262 ApplyStringOrNumericBinaryOperator( lval, opText, rval )
 *
 * 執行方式：node demo-10-加號與減號的規範分岔.js
 */

const line = (t) => console.log("\n" + "=".repeat(56) + "\n" + t + "\n" + "=".repeat(56));

// 小工具：同時印出「值」與「型別」，避免被 console.log 的無引號輸出騙到
const fmt = (v) => {
  if (typeof v === "string") return `"${v}"`;
  if (Number.isNaN(v)) return "NaN";           // JSON.stringify(NaN) 會變成 null，會騙人
  return String(v);
};
const show = (label, value) =>
  console.log(String(label).padEnd(22), "=>", fmt(value), " typeof:", typeof value);

line("1. 同一組值，換一個運算子就換一種型別");

show('"78" - 8', "78" - 8);        // 70        number
show('"78" + 8', "78" + 8);        // "788"     string
show('"con" - 78', "con" - 78);    // NaN       number（轉不動）
show('"con" + 78', "con" + 78);    // "con78"   string（根本不用轉）

line("2. 證明「+ 只會做字串合併」是錯的");

show("1 + 2", 1 + 2);              // 3   兩邊都不是字串 → 走數值分支
show("true + true", true + true);  // 2   ToNumeric(true) = 1
show("1 + null", 1 + null);        // 1   ToNumeric(null) = 0
show("1 + undefined", 1 + undefined); // NaN

line("3. 二元加號 vs 一元加號 是兩個不同的運算子");

show('"78" + 8   二元', "78" + 8); // "788"  加法運算子，有字串分支
show('+"78"      一元', +"78");    // 78     一元加號，永遠 ToNumber
show('+"78abc"   一元', +"78abc"); // NaN

line("4. 沒有字串分支的運算子一律 ToNumeric");

show('"78" * 1', "78" * 1);        // 78
show('"78" / 2', "78" / 2);        // 39
show('"78" % 5', "78" % 5);        // 3
show('"2" ** "3"', "2" ** "3");    // 8
show("[] - []", [] - []);          // 0  ToNumeric("") = 0

line("5. 物件會先走 ToPrimitive（Symbol.toPrimitive → valueOf → toString）");

show("[] + []", [] + []);              // ""
show("[] + {}", [] + {});              // "[object Object]"
show("[1,2] + [3]", [1, 2] + [3]);     // "1,23"  陣列 toString 等同 join(",")

// 自己寫一個物件，親眼看 ToPrimitive 的呼叫順序
const probe = {
  [Symbol.toPrimitive](hint) {
    console.log("   ↳ ToPrimitive 被呼叫了，hint =", hint);
    return hint === "string" ? "我是字串" : 100;
  },
};

console.log("\nprobe + 1 :");
show("probe + 1", probe + 1);   // hint = "default" → 100 + 1 = 101
console.log("probe - 1 :");
show("probe - 1", probe - 1);   // hint = "number"  → 100 - 1 = 99
console.log("`${probe}` :");
show("`${probe}`", `${probe}`); // hint = "string"  → "我是字串"

line("6. Date：全語言唯一 default hint 比照 string 的內建型別");

const d = new Date("2026-09-08T15:30:00+08:00");
show("typeof (d + 1)", typeof (d + 1)); // "string"
show("typeof (d - 1)", typeof (d - 1)); // "number"
show("d - 0（取毫秒）", d - 0);          // 該時刻的 Unix 毫秒時間戳

line("7. 把字串轉數字的三個正規做法，差在容錯");

show('Number("78")', Number("78"));            // 78
show('Number("78abc")', Number("78abc"));      // NaN   嚴格
show('Number("")', Number(""));                // 0     ⚠️ 空字串是 0 不是 NaN
show('parseInt("78abc", 10)', parseInt("78abc", 10)); // 78  寬鬆，讀到讀不下去為止
show('parseInt("", 10)', parseInt("", 10));    // NaN
show('parseInt("0x10")', parseInt("0x10"));    // 16    ⚠️ 所以 radix 一定要寫

line("8. 驗證陷阱：console.log 印字串不會加引號");

const cost = "7" + 7;
console.log("直接印 cost      :", cost);        // 77      看起來像數字
console.log("typeof cost      :", typeof cost); // "string" 其實是字串
console.log("包成物件印 {cost} :", { cost });    // { cost: '77' }  這樣才看得出引號
