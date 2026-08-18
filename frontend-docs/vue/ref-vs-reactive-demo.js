/**
 * ref 與 reactive 的底層機制對照：純 JavaScript 手寫，不需要安裝 Vue
 * 對應筆記：00-ref與reactive-響應式的兩種實作.md
 * 執行：node ref-vs-reactive-demo.js
 */
const line = (t) => console.log('\n' + '='.repeat(54) + '\n' + t + '\n' + '='.repeat(54));

// ── Part 1：getter/setter 是原生 JS，跟 Vue 無關 ──────────
line('Part 1｜getter / setter 是 ES5 就有的原生語言特性');

const person = {
  firstName: 'Abby',
  lastName: 'L',
  get fullName() {
    console.log('  [getter 執行了] 讀 fullName 其實是在呼叫函式');
    return this.firstName + ' ' + this.lastName;
  },
  set fullName(v) {
    console.log('  [setter 執行了] 寫 fullName 其實是在呼叫函式，收到：', v);
    [this.firstName, this.lastName] = v.split(' ');
  },
};
console.log('  person.fullName =>', person.fullName);
person.fullName = 'Abby Lin';
console.log('  拆解後 firstName =', person.firstName, '/ lastName =', person.lastName);
console.log('  ↑ 全程沒有 import 任何框架，這是 JavaScript 自己的能力');

// ── 共用的極簡依賴系統 ────────────────────────────────
let activeEffect = null;
const bucket = new WeakMap();
function track(target, key) {
  if (!activeEffect) return;
  let m = bucket.get(target); if (!m) bucket.set(target, (m = new Map()));
  let d = m.get(key); if (!d) m.set(key, (d = new Set()));
  d.add(activeEffect);
  console.log(`    [收集] ${String(key)} <- "${activeEffect.label}"`);
}
function trigger(target, key) {
  const d = bucket.get(target)?.get(key);
  if (!d) return console.log(`    [觸發] ${String(key)} 改了，沒人訂閱`);
  console.log(`    [觸發] ${String(key)} 改了，通知 ${d.size} 個`);
  d.forEach((fn) => fn());
}
function effect(fn, label) {
  const w = () => { activeEffect = w; fn(); activeEffect = null; };
  w.label = label; w();
}

// ── Part 2：ref 用 getter/setter ─────────────────────────
line('Part 2｜ref() 的實作：class + getter / setter，不是 Proxy');

class RefImpl {
  constructor(value) { this._value = value; }
  get value() { track(this, 'value'); return this._value; }
  set value(v) { this._value = v; trigger(this, 'value'); }
}
const ref = (v) => new RefImpl(v);

const count = ref(0);
console.log('  console.log(count) =>', count, ' ← 是盒子不是數字');
console.log('  typeof count =', typeof count, '/ typeof count.value =', typeof count.value);

effect(() => console.log(`  >> 畫面渲染：count is ${count.value}`), 'Counter');
console.log('  -- 執行 count.value++ --');
count.value++;

// ── Part 3：reactive 用 Proxy ───────────────────────────
line('Part 3｜reactive() 的實作：Proxy，攔的是整個物件');

const reactive = (target) => new Proxy(target, {
  get(t, k, r) { track(t, k); return Reflect.get(t, k, r); },
  set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok; },
});

const state = reactive({ price: 100 });
effect(() => console.log(`  >> 價格元件渲染：${state.price}`), '價格元件');
console.log('  -- 執行 state.price = 200 --');
state.price = 200;
console.log('  -- 新增一個原本不存在的屬性 --');
state.brandNew = 'hi';   // Proxy 攔得到；Object.defineProperty 攔不到

// ── Part 4：為什麼 primitive 一定要用 ref ────────────────
line('Part 4｜Proxy 攔不到 primitive，這就是 ref 存在的理由');

try {
  new Proxy(0, {});
} catch (e) {
  console.log('  new Proxy(0, {}) 直接爆炸：');
  console.log('   ', e.constructor.name + ':', e.message);
}
console.log('  所以 Vue 把純值裝進 { value } 這個盒子，再用 getter/setter 攔那個屬性');

// ── Part 5：ref 傳物件時，兩種機制會疊在一起 ──────────────
line('Part 5｜ref(物件) = 外層 getter/setter + 內層 Proxy');

class RefImpl2 {
  constructor(value) {
    // Vue 的真實行為：值是物件時，內部再呼叫 reactive() 包一層
    this._value = (value !== null && typeof value === 'object') ? reactive(value) : value;
  }
  get value() { track(this, 'value'); return this._value; }
  set value(v) { this._value = v; trigger(this, 'value'); }
}
const user = new RefImpl2({ name: 'Abby' });
console.log('  user 本身是 RefImpl2 嗎 ?', user instanceof RefImpl2);
console.log('  user.value 是 Proxy 嗎 ? 讀一下 name 看有沒有觸發收集：');
effect(() => console.log(`  >> 使用者元件渲染：${user.value.name}`), '使用者元件');
console.log('  -- 執行 user.value.name = "Abby-2"（改的是內層 Proxy）--');
user.value.name = 'Abby-2';

console.log('\n總結：響應式是效果，Proxy 與 getter/setter 是兩種手段，Vue 兩種都用。\n');
