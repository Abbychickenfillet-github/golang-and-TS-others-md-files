/**
 * Day 24：抽象化陷阱 —— 淺模組 (Shallow Module) 實測
 * 執行：node day24-shallow-wrapper.js
 */
const line = (t) => console.log('\n' + '─'.repeat(58) + '\n' + t + '\n' + '─'.repeat(58));

// ── 重構前：Strategy + Factory 包住一行判斷 ─────────────────
class EmailValidationStrategy {
  validate(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
class PasswordValidationStrategy {
  validate(value) {
    return value.length >= 8;
  }
}
class ValidatorFactory {
  static create(type) {
    switch (type) {
      case 'email':
        return new EmailValidationStrategy();
      case 'password':
        return new PasswordValidationStrategy();
      default:
        throw new Error(`Unknown validator type: ${type}`);
    }
  }
}

function checkEmailBefore(email) {
  const validator = ValidatorFactory.create('email');
  return validator.validate(email);
}

// ── 重構後：直接是一個函式 ──────────────────────────────────
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function checkEmailAfter(email) {
  return isValidEmail(email);
}

line('Part 1｜行為必須一致');
const cases = ['a@b.com', 'not-an-email', '', 'x@y.co'];
let allSame = true;
for (const c of cases) {
  const a = checkEmailBefore(c);
  const b = checkEmailAfter(c);
  allSame = allSame && a === b;
  console.log(`  "${c}"`.padEnd(20), 'Strategy版:', a, ' 函式版:', b, a === b ? '✅' : '❌');
}
console.log('\n  全部一致 ?', allSame);

line('Part 2｜要看懂「這個 email 合不合法」，得跳幾次定義');

// 用呼叫堆疊深度模擬「要理解這段邏輯，讀者得往下追幾層」
function countJumpsBefore() {
  // 讀者路徑：checkEmailBefore -> ValidatorFactory.create -> switch/case -> new EmailValidationStrategy -> .validate() -> 正規表達式
  return ['checkEmailBefore', 'ValidatorFactory.create', 'switch-case 選擇該回傳哪個類別', 'EmailValidationStrategy 建構子', '.validate() 方法本體', '正規表達式本身'].length;
}
function countJumpsAfter() {
  // 讀者路徑：checkEmailAfter -> isValidEmail -> 正規表達式
  return ['checkEmailAfter', 'isValidEmail', '正規表達式本身'].length;
}
console.log('  Strategy+Factory 版，讀者要跳的定義數：', countJumpsBefore());
console.log('  函式版，讀者要跳的定義數：            ', countJumpsAfter());
console.log('\n  介面（呼叫方式）沒有變簡單，但要理解「怎麼運作」的成本從 6 跳降到 3 跳');

line('Part 3｜什麼時候 Strategy/Factory 才划算：模擬 5 種真的不同的付款方式');

class CreditCardPayment {
  pay(amount) {
    return { method: 'credit_card', amount, fee: amount * 0.028, steps: ['3D驗證', '請款', '對帳'] };
  }
}
class LinePayPayment {
  pay(amount) {
    return { method: 'linepay', amount, fee: amount * 0.02, steps: ['開啟App確認', '扣款', '對帳'] };
  }
}
class ATMTransferPayment {
  pay(amount) {
    return { method: 'atm', amount, fee: 15, steps: ['產生虛擬帳號', '等待轉帳', '比對入帳'] };
  }
}
class PaymentFactory {
  static create(type) {
    const map = { credit_card: CreditCardPayment, linepay: LinePayPayment, atm: ATMTransferPayment };
    const Ctor = map[type];
    if (!Ctor) throw new Error(`Unknown payment type: ${type}`);
    return new Ctor();
  }
}
for (const type of ['credit_card', 'linepay', 'atm']) {
  const payment = PaymentFactory.create(type);
  const result = payment.pay(1000);
  console.log(`  ${type.padEnd(12)} 手續費=${result.fee.toFixed(1).padEnd(6)} 步驟數=${result.steps.length}`);
}
console.log('\n  這裡每個 Strategy 都封裝了「真的不一樣」的流程與計費邏輯，介面窄（都是 .pay(amount)），');
console.log('  實作深（各自藏了完全不同的手續費公式與步驟），這才是抽象化該賺回來的複雜度。');

console.log('\nNode 版本:', process.version, '\n');
