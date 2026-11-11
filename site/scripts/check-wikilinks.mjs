// 匯入 fs 的 promise 版 API，用來讀每篇筆記的原始文字；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來把相對路徑解析成絕對路徑；
import * as path from 'node:path';
// 匯入 content.ts 的函式；Node 24 內建「型別剝除」，可直接匯入 .ts 檔，所以副檔名要寫完整；
import { listNotes, loadExclude } from '../src/lib/content.ts';
// 匯入 wikilink.ts 的索引建立、歧義清單與詳細解析函式；
import { buildWikilinkIndex, listAmbiguousKeys, resolveWikilinkDetailed } from '../src/lib/wikilink.ts';

// 筆記根目錄：優先讀環境變數 NOTES_ROOT，沒有就用上一層（repo 根目錄）；`??` 只在左邊是 undefined 或 null 時才取右邊；
const root = path.resolve(process.env.NOTES_ROOT ?? '..');
// 排除清單取自根目錄的 _config.yml，不另寫一份；
const exclude = await loadExclude(path.join(root, '_config.yml'));
// 掃描整個筆記庫（被排除的資料夾不會出現在清單裡）；頂層 await 是 ES 模組才有的語法；
const notes = await listNotes(root, exclude);
// 印出根目錄與筆記數，方便確認掃的是哪裡；
console.log(`root: ${root}`);
// 印出筆記數；
console.log(`notes: ${notes.length}`);

// 建立索引；R15 之後 buildWikilinkIndex 不會丟錯，同鍵不同筆記只標成歧義鍵；
const index = buildWikilinkIndex(notes);
// 印出索引的鍵數；
console.log(`index keys: ${index.size}`);
// 取得歧義鍵清單；
const ambiguousKeys = listAmbiguousKeys(index);
// 印出歧義鍵數；
console.log(`ambiguous keys: ${ambiguousKeys.length}`);

// 印出 00-閱讀順序 的解析結果（它先前不在舊的執行期索引裡）；JSON.stringify 把物件印成一行文字；
console.log(`00-閱讀順序 ->`, JSON.stringify(resolveWikilinkDetailed('00-閱讀順序', index)));
// 順便印出帶資料夾寫法的解析結果；
console.log(`backend/Session-Token-Cookie-認證系列/00-閱讀順序 ->`, JSON.stringify(resolveWikilinkDetailed('backend/Session-Token-Cookie-認證系列/00-閱讀順序', index)));

// 掃描用的正規表示式：可選的 !、[[、不含 [ 或 ] 的內文、]]；g 旗標找全部；
const re = /(!?)\[\[([^[\]]+)\]\]/g;
// 已解析的計數；
let resolved = 0;
// 找不到的計數；
let unresolved = 0;
// 指向歧義鍵而不連結的計數；
let ambiguous = 0;
// 嵌入語法（![[…]]）的計數，這支腳本不處理它；
let embeds = 0;
// 找不到目標的出現次數：Map 的鍵是內文，值是次數；
const missing = new Map();
// 歧義目標：Map 的鍵是內文，值是 { count, candidates }；
const ambiguousTargets = new Map();
// 逐篇讀檔掃描；
for (const note of notes) {
  // 讀成 UTF-8 字串；
  let text = await fs.readFile(path.join(root, note.relPath), 'utf8');
  // md 先移除圍欄程式碼與行內程式碼（它們裡面的 [[ ]] 不會被轉成連結）；html 則整份掃（script 內的另有跳過規則，這裡只做粗略統計）；
  if (note.kind === 'md') {
    // 移除 ``` 或 ~~~ 圍欄區塊；[\s\S]*? 是「跨行的最短比對」；
    text = text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[`~]*[ \t]*$/gm, '');
    // 移除行內程式碼；
    text = text.replace(/`[^`\n]*`/g, '');
  }
  // 逐一比對；matchAll 回傳所有比對結果的迭代器；
  for (const m of text.matchAll(re)) {
    // 嵌入語法另外計數；
    if (m[1] === '!') {
      // 累加；
      embeds += 1;
      // 下一個；
      continue;
    }
    // 以還原轉義後、去空白的內文當鍵，方便合併相同目標；
    const key = m[2].replace(/\\\|/g, '|').trim();
    // 詳細解析；
    const r = resolveWikilinkDetailed(m[2], index);
    // 依狀態累加；
    if (r.status === 'ok') {
      // 找得到；
      resolved += 1;
    } else if (r.status === 'ambiguous') {
      // 有歧義：累加總數，並記下候選；
      ambiguous += 1;
      // 取舊紀錄；
      const prev = ambiguousTargets.get(key) ?? { count: 0, candidates: r.candidates };
      // 次數加一後寫回；
      ambiguousTargets.set(key, { count: prev.count + 1, candidates: r.candidates });
    } else {
      // 找不到：累加總數與該目標的次數；
      unresolved += 1;
      // 寫回次數；
      missing.set(key, (missing.get(key) ?? 0) + 1);
    }
  }
}
// 印出統計；
console.log(`wikilinks: resolved=${resolved} unresolved=${unresolved} ambiguous-referenced=${ambiguous} (embeds skipped=${embeds})`);
// 取次數最多的前 10 個未解析目標：Array.from 轉陣列，sort 依次數由大到小；
const top = Array.from(missing).sort((a, b) => b[1] - a[1]).slice(0, 10);
// 印出標題；
console.log(`top unresolved targets (${missing.size} distinct):`);
// 逐行印出；
for (const [target, count] of top) console.log(`  ${count}\t[[${target}]]`);
// 取次數最多的前 10 個歧義目標；
const topAmbiguous = Array.from(ambiguousTargets).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
// 印出標題；
console.log(`top ambiguous targets (${ambiguousTargets.size} distinct):`);
// 逐行印出目標、次數與候選 relPath；
for (const [target, { count, candidates }] of topAmbiguous) console.log(`  ${count}\t[[${target}]]\n\t  candidates: ${candidates.join(' ; ')}`);
// 有任何歧義連結時以非 0 結束碼結束（Task 11 的建置會因此失敗）；
if (ambiguous > 0) process.exitCode = 1;
