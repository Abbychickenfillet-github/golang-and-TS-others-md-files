// 匯入 fs 的 promise 版 API，用來讀每篇筆記的原始文字；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來把相對路徑解析成絕對路徑；
import * as path from 'node:path';
// 匯入 content.ts 的函式；Node 24 內建「型別剝除」，可直接匯入 .ts 檔，所以副檔名要寫完整；
import { listNotes, loadExclude } from '../src/lib/content.ts';
// 匯入 wikilink.ts 的索引建立與解析函式；
import { buildWikilinkIndex, resolveWikilink } from '../src/lib/wikilink.ts';

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

// 建立索引；若有真正的鍵衝突會丟錯，這裡要把衝突清單完整印出（這是 Abby 需要的資料），不能吞掉；
let index;
// try/catch 接住 buildWikilinkIndex 丟出的衝突錯誤；
try {
  // 建索引；
  index = buildWikilinkIndex(notes);
} catch (error) {
  // 印出完整的衝突訊息（訊息本身已列出每個鍵與所有衝突的 relPath）；
  console.log('INDEX BUILD FAILED（鍵衝突）：');
  // error 在 JS 裡可能是任何值，所以先判斷是不是 Error；
  console.log(error instanceof Error ? error.message : String(error));
  // 記下結束碼為失敗；腳本仍繼續用「降級索引」跑統計，讓 Abby 看到衝突之外的整體數字；
  process.exitCode = 1;
  // 降級索引：只供這支腳本統計用，不代表網站實際會這樣連；鍵衝突時「先出現者勝」，且檔名鍵優先於標題鍵；
  index = new Map();
  // 先放所有檔名鍵；slug 的最後一段就是去掉副檔名的檔名；
  for (const note of notes) if (!index.has(note.slug.at(-1))) index.set(note.slug.at(-1), `/${note.slug.join('/')}`);
  // 再放標題鍵，已有的不覆蓋；
  for (const note of notes) if (!index.has(note.title.trim())) index.set(note.title.trim(), `/${note.slug.join('/')}`);
  // 提醒下面的數字是降級索引算出來的；
  console.log('（以下統計改用降級索引：鍵衝突時先出現者勝，僅供參考）');
}
// 印出索引的鍵數；
console.log(`index keys: ${index.size}`);

// 印出 00-閱讀順序 的解析結果（它先前不在舊的執行期索引裡）；
console.log(`00-閱讀順序 ->`, JSON.stringify(resolveWikilink('00-閱讀順序', index)));
// 順便印出帶資料夾寫法的解析結果；
console.log(`backend/Session-Token-Cookie-認證系列/00-閱讀順序 ->`, JSON.stringify(resolveWikilink('backend/Session-Token-Cookie-認證系列/00-閱讀順序', index)));

// 掃描用的正規表示式：可選的 !、[[、不含 [ 或 ] 的內文、]]；g 旗標找全部；
const re = /(!?)\[\[([^[\]]+)\]\]/g;
// 已解析與未解析的計數；
let resolved = 0;
// 未解析的計數；
let unresolved = 0;
// 嵌入語法（![[…]]）的計數，這支腳本不處理它；
let embeds = 0;
// 未解析目標的出現次數：Map 的鍵是內文，值是次數；
const missing = new Map();
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
    // 解析；
    if (resolveWikilink(m[2], index)) {
      // 找得到；
      resolved += 1;
    } else {
      // 找不到：累加總數，並以內文為鍵累加次數；
      unresolved += 1;
      // 以還原轉義後、去空白的內文當鍵，方便合併相同目標；
      const key = m[2].replace(/\\\|/g, '|').trim();
      // 寫回次數；
      missing.set(key, (missing.get(key) ?? 0) + 1);
    }
  }
}
// 印出統計；
console.log(`wikilinks: resolved=${resolved} unresolved=${unresolved} (embeds skipped=${embeds})`);
// 取次數最多的前 10 個未解析目標：Array.from 轉陣列，sort 依次數由大到小；
const top = Array.from(missing).sort((a, b) => b[1] - a[1]).slice(0, 10);
// 印出標題；
console.log(`top unresolved targets (${missing.size} distinct):`);
// 逐行印出；
for (const [target, count] of top) console.log(`  ${count}\t[[${target}]]`);
