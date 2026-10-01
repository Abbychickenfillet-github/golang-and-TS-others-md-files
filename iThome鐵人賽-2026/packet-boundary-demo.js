/**
 * 一個標籤可能被切成兩半
 *   證明「封包邊界」跟「標籤邊界」完全不對齊，
 *   以及 HTML 解析器為什麼必須是「可暫停、可續傳」的狀態機。
 * 執行：node day20-packet-boundary.js
 */
const line = (t) => console.log('\n' + '─'.repeat(64) + '\n' + t + '\n' + '─'.repeat(64));

// 一段很普通的 HTML
const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>我的網站</title></head>
<body>
  <div id="root" class="container">
    <h1 class="title">歡迎</h1>
    <p>這是一段內容。</p>
  </div>
</body>
</html>`;

// 真實 MSS 約 1460 bytes，這裡縮到 40 才看得出切點
const MSS = 40;

line('Part 1｜封包是按「位元組」切的，完全不管標籤在哪');

// 白話講：Buffer.from 把字串變成位元組陣列，才能按 byte 精準切
//         中文一個字在 UTF-8 佔 3 bytes，所以不能用 string.slice
const bytes = Buffer.from(html, 'utf8');
console.log(`  這份 HTML 的長度：${html.length} 個字元 / ${bytes.length} 個位元組`);
console.log(`  （中文字在 UTF-8 佔 3 個位元組，所以兩個數字不一樣）`);
console.log(`  假設 MSS = ${MSS} bytes，會被切成 ${Math.ceil(bytes.length / MSS)} 個封包\n`);

const packets = [];
for (let i = 0; i < bytes.length; i += MSS) {
  packets.push(bytes.subarray(i, i + MSS));
}

// 檢查每個切點是不是落在標籤中間
const isInsideTag = (text, pos) => {
  const before = text.slice(0, pos);
  const lastOpen = before.lastIndexOf('<');
  const lastClose = before.lastIndexOf('>');
  return lastOpen > lastClose;     // 有 < 但還沒 >，就是在標籤中間
};

console.log('  封包  內容（↵ 代表換行）'.padEnd(52), '切點落在哪');
console.log('  ' + '-'.repeat(74));
let cursor = 0;
packets.forEach((p, i) => {
  const chunk = p.toString('utf8');
  cursor += p.length;
  const inTag = isInsideTag(bytes.subarray(0, cursor).toString('utf8'), cursor);
  const preview = chunk.replace(/\n/g, '↵').slice(0, 42);
  console.log(`  #${String(i + 1).padStart(2)}  ${preview.padEnd(46)}`,
              inTag ? '⚠️ 標籤正中間被切斷' : '標籤邊界外');
});

line('Part 2｜被切斷的標籤長什麼樣');

let cur = 0;
let shown = 0;
for (let i = 0; i < packets.length && shown < 3; i++) {
  cur += packets[i].length;
  const upto = bytes.subarray(0, cur).toString('utf8');
  if (isInsideTag(upto, cur)) {
    const tagStart = upto.lastIndexOf('<');
    const head = upto.slice(tagStart);                         // 這個封包結束時，標籤只有這麼多
    const rest = bytes.subarray(cur).toString('utf8');
    const tagEnd = rest.indexOf('>');
    const tail = rest.slice(0, tagEnd + 1);                    // 剩下的要等下一個封包
    console.log(`  封包 #${i + 1} 結束時：`);
    console.log(`    已收到    「${head}」          ← 標籤還沒完`);
    console.log(`    還在路上  「${tail}」          ← 要等下一個封包`);
    console.log(`    完整標籤  「${head + tail}」\n`);
    shown++;
  }
}
console.log('  → 解析器在這一刻「知道有一個標籤開始了，但不知道它是什麼標籤」');

line('Part 3｜所以解析器必須是「可暫停、可續傳」的狀態機');

// 一個極簡的 HTML tokenizer：只分「在標籤內」與「在文字內」兩種狀態
// 重點是它把狀態存在外面，所以可以一包一包餵，不用一次給完整份 HTML
function createTokenizer() {
  let state = 'TEXT';        // TEXT（讀文字中）或 TAG（讀標籤中）
  let buffer = '';           // 還沒讀完的那半個標籤，暫存在這裡
  const tokens = [];

  return {
    // 白話講：每收到一個封包就呼叫一次，它會把能確定的 token 吐出來，
    //         不能確定的（半個標籤）留在 buffer 裡等下一次
    feed(chunk) {
      for (const ch of chunk) {
        if (state === 'TEXT') {
          if (ch === '<') { 
            if (buffer.trim()) tokens.push({ type: 'text', value: buffer.trim() });
            buffer = '<'; state = 'TAG';
          } else buffer += ch;
        } else {
          buffer += ch;
          if (ch === '>') {
            tokens.push({ type: 'tag', value: buffer });
            buffer = ''; state = 'TEXT';
          }
        }
      }
      return { state, pending: buffer };    // 回報目前卡在哪
    },
    tokens,
  };
}

const tk = createTokenizer();
console.log('  一包一包餵給 tokenizer，觀察它每次結束時的狀態：\n');
console.log('  封包  餵完之後的狀態   還卡在 buffer 裡的東西');
console.log('  ' + '-'.repeat(60));
packets.slice(0, 8).forEach((p, i) => {
  const { state, pending } = tk.feed(p.toString('utf8'));
  const label = state === 'TAG' ? 'TAG（標籤讀一半）' : 'TEXT（文字讀一半）';
  console.log(`  #${String(i + 1).padStart(2)}   ${label.padEnd(20)} 「${pending.replace(/\n/g, '↵').slice(0, 24)}」`);
});
packets.slice(8).forEach(p => tk.feed(p.toString('utf8')));

console.log(`\n  全部餵完後，共產生 ${tk.tokens.length} 個 token`);
console.log('  前 6 個：');
tk.tokens.slice(0, 6).forEach(t => {
  console.log(`    ${t.type.padEnd(5)} 「${t.value.replace(/\n/g, '↵')}」`);
});

line('Part 4｜更底層：連一個中文字都會被切成兩半');

// 白話講：UTF-8 是變動長度編碼，ASCII 佔 1 byte，中文佔 3 bytes。
//         封包邊界是按 byte 切的，所以一個中文字的 3 個 bytes 可能跨兩個封包。
console.log('  上面 Part 1 的封包 #2 結尾出現了「�」，那不是亂碼，是「字元被切斷」。\n');

const word = '網';
console.log(`  「${word}」這個字在 UTF-8 的位元組是：`, [...Buffer.from(word)].map(b => '0x' + b.toString(16)).join(' '));
console.log(`  它佔 ${Buffer.from(word).length} 個位元組，所以有 2 種被切斷的方式\n`);

const sentence = Buffer.from('我的網站', 'utf8');
console.log('  === 方式一：不用 stream 模式（錯的做法）===');
const naive = new TextDecoder('utf-8');
for (const cut of [5, 6, 7]) {
  const a = sentence.subarray(0, cut);
  const b = sentence.subarray(cut);
  // 每次都當成「完整獨立的輸入」來解碼，殘留的位元組直接變成 �
  const out = naive.decode(a) + naive.decode(b);
  console.log(`    在第 ${cut} 個位元組切開 → 「${out}」`);
}

console.log('\n  === 方式二：用 stream 模式（對的做法）===');
for (const cut of [5, 6, 7]) {
  const a = sentence.subarray(0, cut);
  const b = sentence.subarray(cut);
  const dec = new TextDecoder('utf-8');
  // stream: true 的意思是「這還沒完，下次還有」
  // decoder 會把湊不成一個字的殘留位元組留著，等下一批來補齊
  const out = dec.decode(a, { stream: true }) + dec.decode(b, { stream: true });
  console.log(`    在第 ${cut} 個位元組切開 → 「${out}」  ✅`);
}

console.log(`
  → 所以瀏覽器接收 HTML 時，用的是 stream 模式的解碼器。
  → 這也是為什麼「解碼」和「解析」是兩個不同的階段：
        位元組 →（TextDecoder，stream 模式）→ 字元 →（Tokenizer，狀態機）→ token → DOM
     兩個階段都必須能「暫停在半路」，因為封包不管你的邊界在哪。
`);

line('Part 5｜這解釋了三件事');
console.log(`
  a. 為什麼「串流解析」做得到
     因為 tokenizer 把狀態存在外面（state + buffer），
     所以它不需要一次拿到整份 HTML，收到多少就處理多少。

  b. 為什麼 <script> 一定要阻塞解析
     JS 可以用 document.write() 改寫「還沒讀到的那段位元流」。
     解析器不敢繼續讀，因為後面的內容可能被動過。

  c. 為什麼前 14 KB 這麼關鍵
     TCP 慢啟動第一輪只送約 10 個封包（約 14 KB），
     解析器在第一個來回就只拿到這麼多 bytes。
     如果首屏需要的標籤落在第 15 KB，就要多等一個 RTT。
`);

console.log('Node 版本:', process.version, '\n');
