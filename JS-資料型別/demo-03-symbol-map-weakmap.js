// demo-03：Symbol 當 Map key vs 當物件 key，以及 WeakMap 的限制
// 執行：node demo-03-symbol-map-weakmap.js
'use strict';

console.log("--- Symbol 的唯一性 ---");
const symKey1 = Symbol("id");
const symKey2 = Symbol("id");
console.log(symKey1 === symKey2);   // false  描述一樣但完全不同

console.log("\n--- 當 Map 的 key：兩個都留著 ---");
const myMap = new Map();
myMap.set(symKey1, "User_001");
myMap.set(symKey2, "User_002");
console.log(myMap.get(symKey1), myMap.get(symKey2), myMap.size);  // User_001 User_002 2
myMap.forEach((v, k) => console.log("forEach 看得到:", String(k), "=>", v));
console.log([...myMap.keys()].map(String));

console.log("\n--- 當物件的 key：被藏起來 ---");
const s = Symbol("id");
const o = { [s]: 1, name: "abby" };
console.log("Object.keys:              ", Object.keys(o));                  // [ 'name' ]
console.log("JSON.stringify:           ", JSON.stringify(o));               // {"name":"abby"}
console.log("getOwnPropertySymbols:    ", Object.getOwnPropertySymbols(o));  // [ Symbol(id) ]
console.log("Reflect.ownKeys:          ", Reflect.ownKeys(o));               // [ 'name', Symbol(id) ]

console.log("\n--- WeakMap：只收得住『會被回收的東西』---");
const wm = new WeakMap();
const objKey = { name: "test" };
const weakSym = Symbol("weakKey");
wm.set(objKey, "value1");
wm.set(weakSym, "value2");
console.log(wm.get(objKey), wm.get(weakSym));   // value1 value2

for (const bad of [123, "str", true, Symbol.for("registered")]) {
  try {
    wm.set(bad, "x");
    console.log(String(bad), "-> 竟然成功了");
  } catch (e) {
    console.log(String(bad).padEnd(20), "->", e.constructor.name + ":", e.message);
  }
}
console.log("Node 版本:", process.version, "（Symbol 當 WeakMap key 需 Node 20+ / Chrome 108+）");
