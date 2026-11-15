// 自然排序（R31）：語意與 build-index.py 的 natural_key 相同，讓「2-x」排在「10-x」前面；且與機器的語系無關（不用 Intl.Collator 與 localeCompare，它們依地區設定，不同機器結果可能不同）；
// 做法：用「連續數字」把字串切成「文字、數字、文字、數字…」交錯的片段（正規式的捕獲群組會把分隔的數字也留在結果裡，所以偶數索引一定是文字、奇數索引一定是數字）；
// 逐片段比較：數字片段比數值、文字片段比碼點；全部相同時，片段少的在前；

// 依「碼點」比較兩個字串（Python 的字串比較就是碼點順序）；不能直接用 JS 的 < ：它比的是 UTF-16 碼元，補充平面字元（例如 😀 U+1F600，第一個碼元是 0xD83D）會排在 U+FF21 之前；
function cmpCodePoints(a: string, b: string): number {
  // for...of 逐個「碼點」走訪字串（不是逐個碼元）；先取得兩個迭代器；
  const ia = a[Symbol.iterator]();
  // 同上；
  const ib = b[Symbol.iterator]();
  // 一直比到分出高下或其中一邊用完；
  for (;;) {
    // 各取下一個碼點；
    const ra = ia.next();
    // 同上；
    const rb = ib.next();
    // 兩邊同時用完：相等；
    if (ra.done && rb.done) return 0;
    // a 先用完：a 較短所以較小；
    if (ra.done) return -1;
    // b 先用完：a 較大；
    if (rb.done) return 1;
    // codePointAt(0) 取這個字元的碼點數值；
    const ca = (ra.value as string).codePointAt(0) as number;
    // 同上；
    const cb = (rb.value as string).codePointAt(0) as number;
    // 不同就以大小決定；
    if (ca !== cb) return ca < cb ? -1 : 1;
  }
}

// 比較兩個「純數字」字串的數值，不轉成 Number（超過 2 的 53 次方會失去精度）：去掉前導零後，位數多的比較大，位數相同再逐字比；
function cmpDigits(a: string, b: string): number {
  // 去掉前導零；全是零時留下 '0'；
  const da = a.replace(/^0+/, '') || '0';
  // 同上；
  const db = b.replace(/^0+/, '') || '0';
  // 位數不同：位數多的數值大；
  if (da.length !== db.length) return da.length < db.length ? -1 : 1;
  // 位數相同：ASCII 數字的字串比較就是數值比較；
  return da < db ? -1 : da > db ? 1 : 0;
}

// 自然排序的比較函式，可直接給 Array.prototype.sort 用；
export function naturalCompare(a: string, b: string): number {
  // 切成交錯的片段：`/(\d+)/` 的括號是捕獲群組，split 會把比對到的數字也放進結果；字串開頭是數字時第一個片段是空字串；
  const pa = a.split(/(\d+)/);
  // 同上；
  const pb = b.split(/(\d+)/);
  // 逐片段比到較短那一邊用完；
  for (let i = 0; i < Math.min(pa.length, pb.length); i += 1) {
    // 奇數索引是數字片段：比數值；偶數索引是文字片段：比碼點；
    const c = i % 2 === 1 ? cmpDigits(pa[i], pb[i]) : cmpCodePoints(pa[i], pb[i]);
    // 這個片段分出高下就結束；
    if (c !== 0) return c;
  }
  // 前面都相同：片段少（字串較短）的在前；
  if (pa.length !== pb.length) return pa.length - pb.length;
  // 連片段數都相同，只剩「數值相同但寫法不同」（例如 3 與 03）：用整串的碼點順序當最後的決勝，結果才確定、不依輸入順序；
  return cmpCodePoints(a, b);
}
