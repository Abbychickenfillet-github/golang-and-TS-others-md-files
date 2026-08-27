/**
 * 存取器屬性的三種定義方式與資料驗證
 * 用法：node 存取器-三種定義方式-demo.js
 * 對應筆記：存取器屬性三種定義方式-getter-setter與資料驗證.md
 * 驗證環境：Node.js v22（V8）｜2026-08-19
 */

const line = (t) => console.log('\n' + '='.repeat(62) + '\n' + t + '\n' + '='.repeat(62));

line('0. 先證明：getter 與 setter 是真的存在的函式物件');

const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__');
console.log('typeof d.get =', typeof d.get, '｜d.get.name =', JSON.stringify(d.get.name));
console.log('typeof d.set =', typeof d.set, '｜d.set.name =', JSON.stringify(d.set.name));
console.log('\n可以把它挖出來自己呼叫：');
console.log('  d.get.call([]) === Array.prototype →', d.get.call([]) === Array.prototype);

const borrowed = {};
const P = { greet() { return 'hi'; } };
d.set.call(borrowed, P);
console.log('  d.set.call(borrowed, P) 之後 borrowed.greet() =', borrowed.greet());

console.log('\n但它跟 Object.getPrototypeOf 不是同一個函式：');
console.log('  d.get === Object.getPrototypeOf →', d.get === Object.getPrototypeOf);
console.log('  兩者結果相同 →', d.get.call([]) === Object.getPrototypeOf([]));
console.log('  → 同一件事的兩條不同管道，不是同一個東西');

line('1. 寫法一：物件字面量的 get / set');

const user = {
  _age: 0,
  get age() {
    console.log('    （getter 被呼叫了）');
    return this._age;
  },
  set age(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) throw new TypeError('age 必須是數字');
    if (!Number.isInteger(n)) throw new RangeError('age 必須是整數');
    if (n < 0 || n > 150) throw new RangeError('age 要在 0 到 150 之間');
    this._age = n;
  },
};

user.age = 20;
console.log('  user.age =', user.age);
[['字串', 'abc'], ['小數', 1.5], ['負數', -1], ['太大', 999]].forEach(([label, v]) => {
  try { user.age = v; console.log('  ' + label + ' 竟然過了'); }
  catch (e) { console.log('  ' + label.padEnd(4) + ' → ' + e.constructor.name + '：' + e.message); }
});
console.log('  驗證失敗後 user.age 還是', user.age, '← 舊值沒被弄髒');

console.log('\n注意：字面量的存取器是「每個物件自己一份」');
console.log('  Object.hasOwn(user, "age") =', Object.hasOwn(user, 'age'));

line('2. 寫法二：Object.defineProperty');

const config = {};
let _theme = 'light';
const ALLOWED = ['light', 'dark', 'auto'];

Object.defineProperty(config, 'theme', {
  get() { return _theme; },
  set(v) {
    if (!ALLOWED.includes(v)) throw new RangeError('theme 只能是 ' + ALLOWED.join('、') + '，收到 ' + JSON.stringify(v));
    _theme = v;
  },
  enumerable: false,     // ← 這是 defineProperty 才給的控制權
  configurable: true,
});

config.theme = 'dark';
console.log('  config.theme =', config.theme);
try { config.theme = 'rainbow'; } catch (e) { console.log('  非法值 → ' + e.constructor.name + '：' + e.message); }

console.log('\n這個寫法最大的好處是可以控制四個旗標：');
console.log('  Object.keys(config)              =', JSON.stringify(Object.keys(config)), '← enumerable:false 所以掃不到');
console.log('  Object.getOwnPropertyNames(...)  =', JSON.stringify(Object.getOwnPropertyNames(config)), '← 這個掃得到');
console.log('  JSON.stringify(config)           =', JSON.stringify(config), '← 也拿不到');
console.log('  → 這就是主軸圖第 3 格：字串鍵＋不可列舉');

console.log('\n真正的私有值藏在閉包裡（_theme 在模組作用域），外面完全碰不到');

line('3. 寫法三：class 的 get / set ＋ 私有欄位');

class Temperature {
  #celsius = 0;                       // # 開頭是真正的私有欄位，不是慣例

  get celsius() { return this.#celsius; }
  set celsius(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) throw new TypeError('溫度必須是數字');
    if (v < -273.15) throw new RangeError('低於絕對零度 -273.15°C，物理上不可能');
    this.#celsius = v;
  }

  // 唯讀存取器：只有 get 沒有 set
  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
}

const t = new Temperature();
t.celsius = 25;
console.log('  t.celsius    =', t.celsius);
console.log('  t.fahrenheit =', t.fahrenheit, '← 算出來的，沒有實際存這個值');

try { t.celsius = -300; } catch (e) { console.log('  低於絕對零度 → ' + e.constructor.name + '：' + e.message); }

console.log('\n唯讀存取器被寫入時：');
t.fahrenheit = 100;
console.log('  非嚴格模式：靜默失敗，t.fahrenheit 還是', t.fahrenheit);
(function () {
  'use strict';
  try { t.fahrenheit = 100; }
  catch (e) { console.log('  嚴格模式：' + e.constructor.name + '：' + e.message); }
})();

console.log('\n私有欄位真的碰不到：');
console.log('  Object.keys(t)                    =', JSON.stringify(Object.keys(t)));
console.log('  Object.getOwnPropertyNames(t)     =', JSON.stringify(Object.getOwnPropertyNames(t)));
console.log('  JSON.stringify(t)                 =', JSON.stringify(t), '← 存取器不會被序列化');

console.log('\n重點：class 的存取器掛在 prototype 上，實例共用一份');
console.log('  Object.hasOwn(Temperature.prototype, "celsius") =', Object.hasOwn(Temperature.prototype, 'celsius'));
console.log('  Object.hasOwn(t, "celsius")                     =', Object.hasOwn(t, 'celsius'));
console.log('  → 跟 __proto__ 掛在 Object.prototype 上是完全一樣的結構');

line('4. 三種寫法對照');

console.table([
  { 寫法: '字面量 { get x(){} }',     掛在哪: '物件自己身上', 能控旗標: '不能', 私有值靠: '_底線慣例或閉包', 適合: '一次性物件' },
  { 寫法: 'Object.defineProperty',   掛在哪: '你指定的物件',   能控旗標: '能（四個都能）', 私有值靠: '閉包', 適合: '要藏起來、要唯讀' },
  { 寫法: 'class get/set',           掛在哪: 'prototype 共用', 能控旗標: '不能（預設不可列舉）', 私有值靠: '# 私有欄位', 適合: '有多個實例' },
]);

line('5. 為什麼這一切跟 __proto__ 有關');

console.log('__proto__ 就是「寫法二」做出來的東西：');
console.log('  Object.getOwnPropertyDescriptor(Object.prototype, "__proto__")');
console.log('  =', { get: typeof d.get, set: typeof d.set, enumerable: d.enumerable, configurable: d.configurable });
console.log('\n它掛在 Object.prototype 上、enumerable:false、有 get 也有 set');
console.log('差別只在於：它的 setter 改的不是一個普通的值，而是物件的「內部原型插槽」');
console.log('→ 這就是它被 deprecated 的根本原因：把「內部結構」偽裝成「一般屬性」');
