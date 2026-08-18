/**
 * Vue 的 Proxy 代理模式：可執行 Demo
 * 對應筆記：00-前端框架比較-Vue-React-Angular難易度與優缺點.md 第 (i) 點
 * 執行方式：node proxy-reactivity-demo.js
 */

const line = (t) => console.log('\n' + '='.repeat(52) + '\n' + t + '\n' + '='.repeat(52));

// ── Part 1：Proxy 的兩個 trap 在做什麼 ──────────────────
line('Part 1｜Proxy 攔截讀寫');

const raw = { count: 0 };
const spy = new Proxy(raw, {
  get(t, k, r) { console.log(`  [讀取] ${String(k)}`); return Reflect.get(t, k, r); },
  set(t, k, v, r) { console.log(`  [寫入] ${String(k)} = ${v}`); return Reflect.set(t, k, v, r); },
  deleteProperty(t, k) { console.log(`  [刪除] ${String(k)}`); return Reflect.deleteProperty(t, k); },
});

spy.count;          // 讀
spy.count = 1;      // 寫
spy.brandNew = 99;  // 新增屬性也攔得到
delete spy.brandNew;

// ── Part 2：手寫 Vue 響應式（依賴收集 + 觸發更新）────────
line('Part 2｜30 行手寫響應式：track 與 trigger');

let activeEffect = null;
const depsMap = new WeakMap();          // target -> (key -> Set<effect>)

function track(target, key) {
  if (!activeEffect) return;
  let keyMap = depsMap.get(target);
  if (!keyMap) depsMap.set(target, (keyMap = new Map()));
  let dep = keyMap.get(key);
  if (!dep) keyMap.set(key, (dep = new Set()));
  dep.add(activeEffect);
  console.log(`  [收集] ${String(key)} 被 "${activeEffect.label}" 用到了`);
}

function trigger(target, key) {
  const dep = depsMap.get(target)?.get(key);
  if (!dep) return console.log(`  [觸發] ${String(key)} 改了，但沒人用到，不更新`);
  console.log(`  [觸發] ${String(key)} 改了，通知 ${dep.size} 個副作用`);
  dep.forEach((fn) => fn());
}

function reactive(target) {
  return new Proxy(target, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r); },
    set(t, k, v, r) { const ok = Reflect.set(t, k, v, r); trigger(t, k); return ok; },
  });
}

function effect(fn, label) {
  const wrapped = () => { activeEffect = wrapped; fn(); activeEffect = null; };
  wrapped.label = label;
  wrapped();
}

const state = reactive({ price: 100, qty: 2, unused: 'nobody reads me' });

effect(() => console.log(`  >> 總價元件渲染：${state.price * state.qty}`), '總價元件');
effect(() => console.log(`  >> 單價元件渲染：${state.price}`), '單價元件');

console.log('\n-- 改 qty（只有總價元件用到）--');
state.qty = 5;

console.log('\n-- 改 price（兩個元件都用到）--');
state.price = 200;

console.log('\n-- 改 unused（沒有元件用到）--');
state.unused = 'still nobody';

// ── Part 3：Vue 2 的 defineProperty 攔不到什麼 ───────────
line('Part 3｜Object.defineProperty 的三個死角');

const legacy = { a: 1 };
Object.defineProperty(legacy, 'a', {
  get() { console.log('  [defineProperty 攔到] 讀 a'); return 1; },
  set(v) { console.log('  [defineProperty 攔到] 寫 a =', v); },
  configurable: true, enumerable: true,
});
legacy.a;
legacy.a = 2;
console.log('  死角 1：新增屬性 →');
legacy.b = 'new';                        // 靜悄悄，什麼都沒印
console.log('    legacy.b =', legacy.b, '（完全沒被攔截，這就是 Vue.set 存在的理由）');

const arr = [1, 2, 3];
console.log('  死角 2：陣列索引賦值 arr[0] = 9 → Vue 2 攔不到，只能改寫 push/pop 等 7 個方法');
console.log('  死角 3：修改 arr.length → 同樣攔不到');

// ── Part 4：代理不是本人 ────────────────────────────────
line('Part 4｜reactive(obj) === obj 是 false');

const origin = { name: 'Abby' };
const proxied = reactive(origin);
console.log('  proxied === origin ?', proxied === origin, '  ← 拿到的是替身');
console.log('  改替身會影響本人嗎 ?');
proxied.name = 'Abby-2';
console.log('    origin.name =', origin.name, '  ← 會，替身只是攔截層，資料還是同一份');
console.log('  Proxy 攔不到 primitive：reactive(0) 沒有意義，所以 Vue 才需要 ref() 把純值包成 { value }');

// ── Part 5：React 為什麼一定要 setState ─────────────────
line('Part 5｜React 沒有替身，所以你必須通報');

let reactState = { count: 0 };
const prev = reactState;

reactState.count = 1;                     // 直接改：React 完全無感
console.log('  直接改 state.count 之後，Object.is(prev, reactState) =', Object.is(prev, reactState));
console.log('  → 參考沒變，React 的淺比較判定「沒有變化」，不會重新渲染');

reactState = { ...reactState, count: 2 }; // 不可變更新：產生新參考
console.log('  用展開運算子產生新物件後，Object.is(prev, reactState) =', Object.is(prev, reactState));
console.log('  → 參考變了，React 才知道要重新渲染');

console.log('\n結論：不可變更新不是風格潔癖，是 React 偵測機制決定的必要條件。\n');
