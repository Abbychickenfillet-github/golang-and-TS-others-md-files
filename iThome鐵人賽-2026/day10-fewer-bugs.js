/**
 * Day 10：三種「寫得出來」的 bug，以及讓它們寫不出來的做法
 * 執行：node day10-fewer-bugs.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

line('Part 1｜浮點數比較：算出來的小計不是它該有的樣子');

const items = [{ name: '杯子', price: 129.9, qty: 2 }, { name: '盤子', price: 59.9, qty: 1 }, { name: '碗', price: 19.9, qty: 1 }];
const rate = 0.85; // 結帳套用 85 折

function subtotalAfterDiscount_buggy(items, rate) {
  return items.reduce((sum, i) => sum + i.price * i.qty * rate, 0);
}

const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const discountedTotal = subtotalAfterDiscount_buggy(items, rate);
console.log('  原始小計（129.9*2 + 59.9 + 19.9）應該是 339.6，實際算出來:', rawSubtotal);
console.log('  rawSubtotal === 339.6 →', rawSubtotal === 339.6, '⚠️ 明明數學上是對的，比較卻是 false');
console.log('  折扣後金額:', discountedTotal);

function isExactly(value, target) {
  return value === target; // 直接比較浮點數，中獎機率很高
}
console.log('  isExactly(discountedTotal, 288.66) →', isExactly(discountedTotal, 288.66));

function isApproximately(value, target, epsilon = 1e-9) {
  return Math.abs(value - target) < epsilon;
}
console.log('  改用容差比較 isApproximately(discountedTotal, 288.66) →', isApproximately(discountedTotal, 288.66));

function subtotalInCents_fixed(items) {
  // 全部用「分」為單位，全程整數運算，沒有精度問題
  return items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.qty, 0);
}
const rawSubtotalInCents = subtotalInCents_fixed(items);
console.log('  改用「分」為單位計算原始小計:', rawSubtotalInCents, '（33960 分 = 339.6 元，整數，沒有誤差）');

line('Part 2｜迴圈邊界：off-by-one');

function getLastNItems_buggy(arr, n) {
  const result = [];
  // 錯誤：<= 多跑一次，i 會等於 arr.length，讀到 undefined
  for (let i = arr.length - n; i <= arr.length; i++) {
    result.push(arr[i]);
  }
  return result;
}

function getLastNItems_fixed(arr, n) {
  const result = [];
  for (let i = arr.length - n; i < arr.length; i++) {
    result.push(arr[i]);
  }
  return result;
}

function getLastNItems_robust(arr, n) {
  const result = [];
  // 補上下界：n 比陣列長度大時，起點不能是負數
  const start = Math.max(0, arr.length - n);
  for (let i = start; i < arr.length; i++) {
    result.push(arr[i]);
  }
  return result;
}

const orders = ['A', 'B', 'C', 'D', 'E'];
console.log('  原始陣列:', orders);
console.log('  n 比陣列長度大的邊界情境 getLastNItems_fixed(orders, 99) →', getLastNItems_fixed(orders, 99));
console.log('  同一個情境 getLastNItems_robust(orders, 99) →', getLastNItems_robust(orders, 99));
console.log('  buggy  getLastNItems(orders, 3) →', getLastNItems_buggy(orders, 3));
console.log('  fixed  getLastNItems(orders, 3) →', getLastNItems_fixed(orders, 3));
console.log('  buggy 版本混入了', getLastNItems_buggy(orders, 3).includes(undefined) ? 'undefined ⚠️' : '沒問題');

line('Part 3｜共享可變狀態：函式偷偷改了呼叫端的資料');

function applyDiscount_buggy(cartItems, rate) {
  // 錯誤：直接改傳進來的陣列裡的物件，呼叫端完全不知道
  cartItems.forEach((item) => {
    item.price = item.price * (1 - rate);
  });
  return cartItems;
}

function applyDiscount_fixed(cartItems, rate) {
  // 回傳新陣列，不動原本的資料
  return cartItems.map((item) => ({ ...item, price: item.price * (1 - rate) }));
}

const originalCart = [{ name: '杯子', price: 100 }, { name: '盤子', price: 200 }];
const cartSnapshot = JSON.stringify(originalCart);

const discountedCart = applyDiscount_buggy(originalCart, 0.1);
console.log('  呼叫 applyDiscount_buggy 之後，原始 cart 有沒有被動到？',
  JSON.stringify(originalCart) !== cartSnapshot ? '⚠️ 被動到了' : '沒被動到');
console.log('  原始 cart:', originalCart);

const originalCart2 = [{ name: '杯子', price: 100 }, { name: '盤子', price: 200 }];
const cartSnapshot2 = JSON.stringify(originalCart2);
const discountedTotal2 = applyDiscount_fixed(originalCart2, 0.1);
console.log('\n  呼叫 applyDiscount_fixed 之後，原始 cart 有沒有被動到？',
  JSON.stringify(originalCart2) !== cartSnapshot2 ? '⚠️ 被動到了' : '沒被動到');
console.log('  原始 cart:', originalCart2);
console.log('  新的 discounted cart:', discountedTotal2);

line('Part 4｜三種寫法，實測踩雷次數');

function runTrial(fn, cases) {
  let bugHit = 0;
  for (const c of cases) {
    try {
      const r = fn(...c);
      if (JSON.stringify(r).includes('null') || (Array.isArray(r) && r.some((x) => x === undefined))) {
        bugHit++;
      }
    } catch {
      bugHit++;
    }
  }
  return bugHit;
}

const boundaryCases = [[[1, 2, 3], 3], [[1, 2], 5], [[], 1]];
console.log('  邊界情境（拿的數量 > 陣列長度）:');
console.log('    buggy   版本命中異常結果次數:', runTrial(getLastNItems_buggy, boundaryCases), '/', boundaryCases.length, '（off-by-one 沒修）');
console.log('    fixed   版本命中異常結果次數:', runTrial(getLastNItems_fixed, boundaryCases), '/', boundaryCases.length, '（off-by-one 修了，但 n > 長度 沒修）');
console.log('    robust  版本命中異常結果次數:', runTrial(getLastNItems_robust, boundaryCases), '/', boundaryCases.length, '（兩種邊界都修了）');

console.log('\nNode 版本:', process.version, '\n');
