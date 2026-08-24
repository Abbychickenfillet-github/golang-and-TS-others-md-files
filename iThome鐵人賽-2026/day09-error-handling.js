/**
 * Day 9：錯誤處理的三個層次
 * 執行：node day09-error-handling.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 模擬一個會失敗的付款閘道 ──────────────────────────────
async function paymentGateway(amount) {
  if (amount <= 0) {
    // 程式呼叫錯誤：呼叫端傳了不合法的金額，這是「不該發生」的錯誤
    throw new TypeError(`amount 必須大於 0，收到 ${amount}`);
  }
  if (amount > 50000) {
    // 業務規則失敗：這是「預期內會發生」的失敗，不是程式錯誤
    return { ok: false, code: 'LIMIT_EXCEEDED', message: '單筆金額超過上限' };
  }
  return { ok: true, transactionId: 'tx_' + Math.random().toString(36).slice(2, 8) };
}

line('Part 1｜層次一：吞掉錯誤（重構前，反面教材）');

async function chargeSwallowed(amount) {
  try {
    const result = await paymentGateway(amount);
    return result;
  } catch (err) {
    console.log('  [內部 log]', err.message);
    return undefined; // 呼叫端拿到 undefined，完全不知道是「本來就沒結果」還是「爆炸了」
  }
}

const swallowedCases = [1000, -50, 99999];
for (const amt of swallowedCases) {
  const r = await chargeSwallowed(amt);
  console.log(`  charge(${amt}) →`, r, r === undefined ? '⚠️ 呼叫端無法區分「失敗」跟「結果剛好是 undefined」' : '');
}

line('Part 2｜層次二：語意化的回傳值（Result-like 物件）');

async function chargeResult(amount) {
  try {
    const result = await paymentGateway(amount);
    if (!result.ok) return { success: false, reason: result.code, message: result.message };
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    // 程式錯誤（TypeError）不吞，直接往上炸——這不是「業務失敗」，是呼叫端寫錯
    throw err;
  }
}

let programmerErrorCaught = false;
for (const amt of [1000, 99999]) {
  const r = await chargeResult(amt);
  console.log(`  charge(${amt}) →`, r);
}
try {
  await chargeResult(-50);
} catch (err) {
  programmerErrorCaught = true;
  console.log('  charge(-50) → 直接拋出:', err.constructor.name, '-', err.message);
}
console.log('\n  程式錯誤有沒有被正確地往上炸？', programmerErrorCaught ? '✅ 有' : '❌ 沒有（被誤吞了）');

line('Part 3｜層次三：強制處理的 Result 型別（用 Object.freeze 模擬 discriminated union）');

const Ok = (value) => Object.freeze({ kind: 'ok', value });
const Err = (error) => Object.freeze({ kind: 'err', error });

async function chargeStrictResult(amount) {
  try {
    const result = await paymentGateway(amount);
    if (!result.ok) return Err({ code: result.code, message: result.message });
    return Ok(result.transactionId);
  } catch (err) {
    throw err; // 程式錯誤一樣往上炸，Result 型別只包「預期內的失敗」
  }
}

function handle(result) {
  // 這裡故意示範「忘記檢查其中一種分支」在 JS 執行期不會被擋下來
  if (result.kind === 'ok') {
    return `交易成功：${result.value}`;
  }
  // 如果漏寫這個 else 分支，result.error 會是 undefined，但不會報錯——這是 JS 的限制
  return `交易失敗：${result.error?.message ?? '(忘記處理 err 分支，訊息遺失)'}`;
}

for (const amt of [1000, 99999]) {
  const r = await chargeStrictResult(amt);
  console.log(`  charge(${amt}) →`, handle(r));
}

line('Part 4｜三種寫法遇到「忘記處理錯誤」時的差異');

let bugCount = { swallowed: 0, resultLike: 0, strictResult: 0 };

// 情境：呼叫端忘記檢查回傳值，直接假設一定成功
function callerForgotToCheck_swallowed(result) {
  // 直接假設 result 一定有 transactionId
  try {
    return result.transactionId.slice(0, 4); // undefined.transactionId 會炸，但炸的位置離原因很遠
  } catch {
    bugCount.swallowed++;
    return null;
  }
}

function callerForgotToCheck_resultLike(result) {
  try {
    return result.transactionId.slice(0, 4); // 同樣可能拿到 { success:false } 而不是 undefined，一樣會產生錯誤結果
  } catch {
    bugCount.resultLike++;
    return null;
  }
}

function callerForgotToCheck_strictResult(result) {
  try {
    return result.value.slice(0, 4); // Result 型別下，忘記判斷 kind 一樣會拿到 undefined
  } catch {
    bugCount.strictResult++;
    return null;
  }
}

const failResultSwallowed = await chargeSwallowed(99999999); // 這裡故意用超大金額製造非預期路徑
callerForgotToCheck_swallowed(failResultSwallowed ?? {});
const failResultLike = await chargeResult(99999);
callerForgotToCheck_resultLike(failResultLike);
const failStrict = await chargeStrictResult(99999);
callerForgotToCheck_strictResult(failStrict);

console.log('  三種寫法在「呼叫端忘記檢查」時，是否會在執行期產生錯誤結果（而非型別檢查期就擋下）：');
console.log('    層次一（吞掉錯誤）      ', bugCount.swallowed > 0 ? '會，且錯誤發生位置離原因很遠' : '不會');
console.log('    層次二（Result-like）   ', bugCount.resultLike > 0 ? '會，JS 執行期無法強制檢查 kind' : '不會');
console.log('    層次三（Result 型別）   ', bugCount.strictResult > 0 ? '會，但在 TypeScript + exhaustive check 下編譯期就能擋下' : '不會');
console.log('\n  結論：純 JavaScript 執行期，三種寫法都擋不住「忘記檢查」；Result 型別的優勢要靠 TypeScript 的');
console.log('  discriminated union + exhaustiveness check 才會真正生效，這在下面「我一開始想錯的地方」會展開。');

console.log('\nNode 版本:', process.version, '\n');
