/**
 * =====================================================================================
 * postfix-increment.js
 * 主題：count++ 到底做了什麼？為什麼在 React 裡要寫 setCount(count + 1) 而不是 setCount(count++)
 * 執行方式：在這個資料夾開終端機，輸入  node postfix-increment.js
 * 名詞先講清楚：
 *   a. postfix increment（後置遞增）指的是 count++ ，++ 放在變數「後面」
 *   b. prefix increment（前置遞增）指的是 ++count ，++ 放在變數「前面」
 *   c. binding（綁定）指的是「變數名字」與「記憶體中那個值」之間的連結，
 *      let 建立的是可以重新綁定的連結，const 建立的是不能重新綁定的連結
 *   d. ToNumeric 是 ECMAScript 規格裡的抽象操作（abstract operation），
 *      意思是「把這個值強制轉成數字型別（Number 或 BigInt）」
 * =====================================================================================
 */

console.log('===== 0. 先修好你原本檔案裡的 bug =====');

// 你原本寫的是：
//   let count1 = 0;
//   function simpleAddup(){ count++ }
// 宣告的變數叫 count1 ，但函式裡用的是 count ，
// 這兩個是完全不同的名字，所以 JS 會往外層一路找 count ，找不到就丟 ReferenceError。
// ReferenceError（參考錯誤）的意思是「你叫的這個名字，我在任何一層作用域都查不到」。

try {
  // 這裡故意用 new Function 產生一段程式碼，讓錯誤發生在「執行時」而不是「解析整個檔案時」，
  // 否則整個檔案會在還沒開始跑之前就掛掉，後面的範例都看不到了。
  new Function('let count1 = 0; count++;')();
} catch (err) {
  console.log('a. 原本的寫法會噴：', err.constructor.name, '-', err.message);
}

let count = 0;                    // 正名：宣告的名字要跟使用的名字一致

function simpleAddup() {          // function 關鍵字宣告一個具名函式
  count++;                        // 對外層作用域（closure，閉包）裡的 count 做後置遞增
  console.log('   simpleAddup 之後 count =', count);
}

simpleAddup();                    // 呼叫一次，count 從 0 變成 1
simpleAddup();                    // 再呼叫一次，count 從 1 變成 2
console.log('b. 修好之後可以正常累加，count =', count);


console.log('\n===== 1. postfix 與 prefix 的差別：差在「這個運算式本身回傳什麼」 =====');

let a = 5;
const afterPostfix = a++;         // 先把 a 的「舊值 5」記下來當作整個運算式的結果，然後才把 a 變成 6
console.log('a. a++ 回傳的是舊值：', afterPostfix, '，此時 a 已經變成', a);

let b = 5;
const afterPrefix = ++b;          // 先把 b 變成 6，然後整個運算式的結果就是「新值 6」
console.log('b. ++b 回傳的是新值：', afterPrefix, '，此時 b 也是', b);

// 重點：a++ 與 ++a 對「變數本身」的效果一模一樣，都是加一。
//       差別只在「把這個運算式當成值來用的時候，你拿到的是舊的還是新的」。
//       setCount(count++) 壞掉的第一個原因就在這裡：你把「舊值」交給了 setCount。


console.log('\n===== 2. count++ 的規格層拆解 =====');

// ECMAScript 規格對 count++ 的定義，用白話拆成三步：
//   step 1. oldValue = ToNumeric(count)        把目前的值強制轉成數字
//   step 2. count    = oldValue + 1            把加一後的結果「重新綁定」回 count 這個名字
//   step 3. 整個運算式的結果 = oldValue        回傳的是 step 1 的舊值
// 用可以實際執行的程式碼把它翻譯出來：

function desugarPostfix(readFn, writeFn) {
  const oldValue = Number(readFn());   // 對應 step 1，Number() 是 ToNumeric 的近似
  writeFn(oldValue + 1);               // 對應 step 2
  return oldValue;                     // 對應 step 3
}

let c = 10;
const result = desugarPostfix(() => c, (v) => { c = v; });
console.log('a. 手工版 postfix 回傳', result, '，c 現在是', c, '（跟 c++ 完全一致）');

// 所以「count++ 是不是就等於重新賦值？」
// 答案：是，它一定包含一次「賦值（assignment）」動作，也就是 count = 舊值 + 1。
//       但它「不只是」賦值，它同時還是一個「有回傳值的運算式（expression）」，回傳舊值。


console.log('\n===== 3. count++ 與 count = count + 1 完全等價嗎？=====');

// 對數字來說：等價。
let n1 = 7; n1++;
let n2 = 7; n2 = n2 + 1;
console.log('a. 數字：', n1 === n2, '（兩邊都是 8）');

// 對字串來說：不等價，這是最常被忽略的一點。
let s1 = '5'; s1++;               // ++ 會先做 ToNumeric('5') → 數字 5，再加一 → 數字 6
let s2 = '5'; s2 = s2 + 1;        // + 遇到字串會做字串串接（string concatenation）→ '51'
console.log('b. 字串：s1 =', s1, typeof s1, ' / s2 =', s2, typeof s2, ' → 等價嗎？', s1 === s2);

// 真正跟 count++ 完全等價的是 count += 1 ，因為 += 對數字語意相同但仍有字串串接問題，
// 最精準的等價寫法其實是 count = Number(count) + 1 。
let s3 = '5'; s3 = Number(s3) + 1;
console.log('c. 精準等價：Number(s3) + 1 =', s3, typeof s3);

// 對 BigInt（大整數型別，字面量寫成 10n）來說：
let big = 10n; big++;
console.log('d. BigInt：big++ 之後是', big, typeof big, '（ToNumeric 保留 BigInt 型別，不會變成 Number）');


console.log('\n===== 4. 關鍵：const 綁定不能被重新賦值，所以 count++ 直接爆炸 =====');

// React 裡你會這樣寫：
//   const [count, setCount] = useState(0)
// const 宣告的綁定不能重新賦值（re-assignment），
// 而 count++ 的 step 2 就是一次賦值，所以會丟 TypeError。
// TypeError（型別錯誤）在這裡的意思是「這個操作對這個目標本身就不合法」。

try {
  new Function('const count = 0; count++; return count;')();
} catch (err) {
  console.log('a. const 做 ++ 會噴：', err.constructor.name, '-', err.message);
}

// 補充：const 擋的是「重新綁定」，不是「內容不可變」。
const obj = { n: 0 };
obj.n++;                          // 這是改物件裡面的屬性，不是重新綁定 obj，所以合法
console.log('b. const 物件的屬性可以 ++ ：', obj.n, '（const 鎖的是名字，不是內容）');


console.log('\n===== 5. 用假的 React 模擬：為什麼 setCount(count++) 就算語法過了也沒用 =====');

// 這段用最小程式碼模擬 React 的兩個核心行為：
//   a. snapshot（快照）：每一次 render，元件函式拿到的 count 是「那一刻的值」，是常數不是活變數
//   b. queue（更新佇列）：setCount 不是立刻改值，是把更新排進佇列，等這一輪事件處理完才一次結算

let __state = 0;                  // 假裝這是 React 內部真正保存 state 的地方
let __queue = [];                 // 假裝這是本輪的更新佇列

function useFakeState() {
  const snapshot = __state;                      // 本次 render 的快照，之後不會再變
  const setState = (updaterOrValue) => {         // setState 只是「把東西丟進佇列」
    __queue.push(updaterOrValue);
  };
  return [snapshot, setState];
}

function flush() {                               // 模擬 React 結算佇列並重新 render
  for (const item of __queue) {
    __state = typeof item === 'function' ? item(__state) : item;
  }
  __queue = [];
}

// ---- 錯誤示範：postfix 傳出去的是舊值 ----
__state = 0; __queue = [];
{
  const [snapCount, setSnapCount] = useFakeState();
  let local = snapCount;                         // 把快照抄進一個 let，讓 ++ 語法合法
  setSnapCount(local++);                         // local++ 回傳「舊值 0」，所以排進佇列的是 0
  flush();
  console.log('a. setCount(count++) 之後 state =', __state, '→ 數字完全不動');
}

// ---- 正確示範：傳新值 ----
__state = 0; __queue = [];
{
  const [snapCount, setSnapCount] = useFakeState();
  setSnapCount(snapCount + 1);                   // 排進佇列的是 1
  flush();
  console.log('b. setCount(count + 1) 之後 state =', __state, '→ 正常加一');
}

// ---- 陷阱示範：同一輪連呼叫兩次 setCount(count + 1) ----
__state = 0; __queue = [];
{
  const [snapCount, setSnapCount] = useFakeState();
  setSnapCount(snapCount + 1);                   // snapCount 是快照 0，算出 1
  setSnapCount(snapCount + 1);                   // snapCount 還是快照 0，又算出 1
  flush();                                       // 佇列是 [1, 1]，最後結果是 1
  console.log('c. 連續兩次 setCount(count + 1) 之後 state =', __state, '→ 只加了一次');
}

// ---- 解法：用 updater function（更新函式）拿到「最新值」而不是快照 ----
__state = 0; __queue = [];
{
  const [, setSnapCount] = useFakeState();
  setSnapCount((prev) => prev + 1);              // 佇列裡放的是函式，結算時才拿 prev
  setSnapCount((prev) => prev + 1);              // 第二個函式拿到的是第一個算完的結果
  flush();
  console.log('d. 連續兩次 setCount(prev => prev + 1) 之後 state =', __state, '→ 確實加了兩次');
}


console.log('\n===== 6. 結論整理 =====');
console.log([
  'a. count++ 一定包含一次賦值，所以它需要一個「可以被重新賦值的綁定」',
  'b. React 的 const [count, setCount] = useState(0) 給的是 const 綁定，賦值直接 TypeError',
  'c. 就算硬改成 let，postfix 回傳的是舊值，setCount 收到舊值等於什麼都沒做',
  'd. 更深一層：React 的 count 是這一次 render 的快照，改快照不會通知 React 重新 render',
  'e. 唯一能觸發 re-render 的是呼叫 setCount，所以正解是 setCount(count + 1)',
  'f. 同一輪要連加多次時，用 setCount(prev => prev + 1) 才不會被快照鎖死',
].join('\n'));
