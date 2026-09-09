// demo-05：BigInt 的取捨、原始型別的不可變性、物件的可變性、臨時包裝物件
// 執行：node demo-05-BigInt與不可變性與包裝物件.js
'use strict';

console.log("=== 1. Number 的安全上限，以及什麼時候真的需要 BigInt ===");
console.log("MAX_SAFE_INTEGER :", Number.MAX_SAFE_INTEGER);          // 9007199254740991
console.log("9007199254740993 :", 9007199254740993);                  // 9007199254740992 精度被吃掉
console.log("...92 === ...93   :", 9007199254740992 === 9007199254740993);  // true 兩個數字變同一個
console.log("BigInt 版         :", 9007199254740993n);                // 正確
console.log("Date.now()        :", Date.now(), "← 毫秒時間戳離上限還很遠，所以日常用不到");

console.log("\n--- 真正會出事的場景：後端 int64 ID 經過 JSON.parse ---");
const raw = '{"id": 1234567890123456789, "name": "abby"}';
console.log("後端傳來    :", raw);
console.log("JSON.parse  :", JSON.parse(raw).id, "← 最後幾位被改掉，而且不會報錯");
console.log("正解        :", JSON.parse('{"id":"1234567890123456789"}').id, "← 請後端把 int64 序列化成字串");

console.log("\n--- BigInt 的代價（所以不該當預設選擇）---");
try { JSON.stringify({ v: 1n }); } catch (e) { console.log("JSON.stringify ->", e.constructor.name + ":", e.message); }
try { Math.max(1n, 2n); } catch (e) { console.log("Math.max       ->", e.constructor.name + ":", e.message); }
try { console.log(1n + 1); } catch (e) { console.log("和 Number 混用 ->", e.constructor.name + ":", e.message); }

console.log("\n=== 2. 兩個數字相加才是真的加法 ===");
var number1 = 7, number2 = 8;
console.log('7 + 8        =', number1 + number2, `(${typeof (number1 + number2)})`);   // 15 number
console.log('7 + "8"      =', 7 + "8", `(${typeof (7 + "8")})`);                        // "78" string
console.log('"7" + "8"    =', "7" + "8");                                               // "78"
console.log('"7" - "8"    =', "7" - "8");                                               // -1  減法強制轉數字
console.log('+"7" + +"8"  =', +"7" + +"8");                                             // 15  一元 + 先轉數字
console.log('Number("7") + Number("8") =', Number("7") + Number("8"));                  // 15  最好讀的寫法

console.log("\n=== 3. 原始型別不可變（immutable）===");
let s = "abc";
// ⚠️ 這一行的行為取決於模式：非嚴格模式靜靜失敗，嚴格模式（本檔頂端有 'use strict'）直接噴 TypeError
try { s[0] = "Z"; } catch (e) { console.log('嚴格模式下 s[0]="Z" ->', e.constructor.name + ":", e.message); }
console.log('s[0] = "Z" 之後 :', s, "← 不管哪種模式，值都沒變");
// 對照：非嚴格模式是靜靜失敗，更難抓 —— 這就是為什麼要開 strict mode
const sloppy = new Function('let t="abc"; t[0]="Z"; return t;');
console.log("非嚴格模式      :", sloppy(), "← 不報錯但也沒改成功");
console.log("toUpperCase()   :", s.toUpperCase(), "| 原本的 s 仍是:", s, "← 回傳的是新字串");
s = "xyz";
console.log("重新賦值後      :", s, "← 這是換一個值綁上去，不是改掉原本那個值");

console.log("\n--- const 鎖的是「綁定」不是「值」---");
const arr = [1, 2, 3];
arr.push(4);
console.log("const arr 可以 push :", arr, "← 物件內容可變");
try { eval("const c = [1]; c = [2];"); } catch (e) { console.log("但不能重新綁定    :", e.constructor.name + ":", e.message); }

console.log("\n=== 4. 物件預設可變，但可以凍結 ===");
const o = { a: 1, nested: { b: 2 } };
Object.freeze(o);
// 非嚴格模式下這三個動作全部靜靜失敗；嚴格模式會噴 TypeError，所以包起來
try { o.a = 99; } catch (e) { console.log("改凍結物件 ->", e.constructor.name + ":", e.message); }
try { o.c = 3; } catch (e) { console.log("加新屬性   ->", e.constructor.name + ":", e.message); }
try { delete o.a; } catch (e) { console.log("刪屬性     ->", e.constructor.name + ":", e.message); }
console.log("凍結後 o        :", o, "| isFrozen:", Object.isFrozen(o));
o.nested.b = 999;                // 這個「不會」被擋，因為 freeze 只凍最外層
console.log("⚠️ freeze 是淺層的，巢狀物件還是被改了:", o.nested);

function deepFreeze(obj) {       // 要真的凍結必須遞迴
  Object.getOwnPropertyNames(obj).forEach((k) => {
    const v = obj[k];
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
}
const o2 = deepFreeze({ a: 1, nested: { b: 2 } });
try { o2.nested.b = 999; } catch (e) { console.log("deepFreeze 擋下 ->", e.constructor.name + ":", e.message); }
console.log("deepFreeze 之後 :", o2.nested, "← 這次擋住了");

console.log("\n--- 嚴格模式下改凍結物件會噴錯（非嚴格模式是靜靜失敗，更難抓）---");
try { (function () { "use strict"; const f = Object.freeze({ x: 1 }); f.x = 2; })(); }
catch (e) { console.log(e.constructor.name + ":", e.message); }

console.log("\n=== 5. 原始型別的方法從哪來：臨時包裝物件（autoboxing）===");
const str = "abc";
// 嚴格模式會噴 TypeError；非嚴格模式靜靜失敗。兩種情況下 str.foo 都是 undefined
try { str.foo = 123; } catch (e) { console.log("str.foo = 123 ->", e.constructor.name + ":", e.message); }
console.log("str.foo =", str.foo, "← undefined，那個臨時包裝物件早就被丟掉了");
console.log('typeof "abc"            :', typeof "abc");
console.log('typeof new String("abc"):', typeof new String("abc"), "← 這才是真的物件");
console.log('"abc" === new String("abc"):', "abc" === new String("abc"), "← 所以絕對不要 new String()");
console.log("方法住在哪            :", typeof String.prototype.toUpperCase);

console.log("\n--- null / undefined 沒有包裝物件，所以碰屬性就爆 ---");
for (const v of [null, undefined]) {
  try { v.toString(); } catch (e) { console.log(String(v).padEnd(10), "->", e.constructor.name + ":", e.message); }
}

console.log("\n--- Symbol / BigInt 有包裝物件但不能 new ---");
for (const [name, C] of [["Symbol", Symbol], ["BigInt", BigInt]]) {
  try { new C(1); } catch (e) { console.log(name.padEnd(7), "->", e.constructor.name + ":", e.message); }
}
console.log("Object(Symbol(\"s\")) 的型別:", typeof Object(Symbol("s")), "← 要包裝只能用 Object()");
