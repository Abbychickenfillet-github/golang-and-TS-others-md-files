// ===== 把已發布的 html 筆記遷移成使用共用主題與共用腳本（Task 13）=====
// 用法（在 site/ 底下執行）：
//   node scripts/migrate-html-notes.mjs [--root <筆記根目錄，預設 ..>] [--only <路徑／資料夾／glob>]… [--limit N] [--apply] [--report <json>]
// 預設是 dry-run（只預覽、不寫檔）；--apply 才會真的寫檔，而且要求 git 工作目錄乾淨，讓每次遷移都能用 git 一鍵回復；
// 檔案範圍：已發布的 html 筆記（排除 _config.yml 的 exclude、底線開頭的檔案、被 -互動版 取代的舊 html、根目錄的 index.html），再依 --only／--limit 篩選，依路徑排序所以結果固定；
// 單一檔案失敗只跳過並回報，不中斷整批；有任何失敗時結束碼為 1；
// 匯入 fs 的 promise 版 API，用來讀寫筆記檔與報告檔；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來組路徑與算相對路徑；
import * as path from 'node:path';
// 匯入 child_process 的 execFileSync：同步執行 git，參數用陣列傳入、不經 shell，中文路徑與空白不必跳脫；
import { execFileSync } from 'node:child_process';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址，讓相對路徑從本檔所在資料夾算起；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts（靜態 import 會在 register 之前就被解析）；頂層 await 是 ES 模組才有的語法；
const { listNotes, loadExclude } = await import('../src/lib/content.ts');
// 匯入與網站建置相同的「發布範圍」規則：被取代的舊 html、保留的 slug；
const { applyReservedSlugs, dropSuperseded } = await import('../src/lib/site.ts');
// 匯入原子寫檔；
const { atomicWriteFile } = await import('../src/lib/atomic-write.ts');
// 匯入遷移函式與相對路徑計算；
const { assetsRelPath, migrateHtml } = await import('../src/lib/migrate-html.ts');
// 匯入共用集合的聯集函式；
const { sharedSelectorsOf } = await import('../src/lib/parse-html.ts');

// 用法說明，參數錯誤時印出；
const USAGE = '用法：node scripts/migrate-html-notes.mjs [--root <目錄>] [--only <路徑／資料夾／glob>]… [--limit N] [--apply] [--report <json>]';

// 解析命令列參數；argv 是 process.argv.slice(2)；回傳整理好的選項物件，格式不對就丟錯；
function parseArgs(argv) {
  // 預設值：root 先讀環境變數 NOTES_ROOT（與其他腳本一致），再退回上一層；
  const opts = { root: process.env.NOTES_ROOT ?? '..', only: [], limit: undefined, apply: false, report: undefined };
  // 用索引迴圈，因為有些旗標要吃下一個參數；
  for (let i = 0; i < argv.length; i++) {
    // 目前的參數；
    const arg = argv[i];
    // 取下一個參數當值；沒有就丟錯；
    const next = () => {
      // 超出範圍代表旗標後面沒給值；
      if (i + 1 >= argv.length) throw new Error(`${arg} 後面需要一個值\n${USAGE}`);
      // 前進一格並回傳；
      i += 1;
      // 值；
      return argv[i];
    };
    // 依旗標分流；
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--root') opts.root = next();
    else if (arg === '--only') opts.only.push(next());
    else if (arg === '--report') opts.report = next();
    else if (arg === '--limit') {
      // 取值並轉數字；
      const value = Number(next());
      // 必須是正整數；
      if (!Number.isInteger(value) || value < 1) throw new Error(`--limit 必須是正整數\n${USAGE}`);
      // 存起來；
      opts.limit = value;
    } else throw new Error(`不認得的參數：${arg}\n${USAGE}`);
  }
  // 回傳；
  return opts;
}

// 把 glob（支援 * ? **）轉成正規表示式：* 不跨資料夾、** 可跨、? 比對單一非斜線字元；
function globToRegExp(glob) {
  // 逐字處理，結果累積成字串；
  let source = '';
  // 索引迴圈，因為 ** 要吃兩個字元；
  for (let i = 0; i < glob.length; i++) {
    // 目前字元；
    const ch = glob[i];
    // `**/` 代表「零或多層資料夾」；
    if (ch === '*' && glob[i + 1] === '*' && glob[i + 2] === '/') {
      // 加入對應的正規式並跳過這三個字元（迴圈本身還會再加一，所以只跳兩個）；
      source += '(?:.*/)?';
      i += 2;
    } else if (ch === '*' && glob[i + 1] === '*') {
      // 結尾的 ** 比對任何字元；
      source += '.*';
      i += 1;
    } else if (ch === '*') {
      // 單一 * 不跨資料夾；
      source += '[^/]*';
    } else if (ch === '?') {
      // ? 是單一非斜線字元；
      source += '[^/]';
    } else {
      // 其餘字元跳脫正規式的特殊符號後原樣加入；
      source += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  // 整串比對（頭尾錨定）；
  return new RegExp(`^${source}$`);
}

// 依 --only 的樣式建立比對函式；沒有樣式就全部符合；
function makeMatcher(patterns, root) {
  // 沒有 --only：全部符合；
  if (patterns.length === 0) return () => true;
  // 把每個樣式轉成「relPath → 布林」的函式；
  const tests = patterns.map((raw) => {
    // 絕對路徑先換成相對於 root 的路徑；
    let p = path.isAbsolute(raw) ? path.relative(root, raw) : raw;
    // 統一成正斜線、去掉開頭的 ./ 與結尾的 /，並做 NFC 正規化（Windows 與 macOS 的檔名 Unicode 形式可能不同）；
    p = p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '').normalize('NFC');
    // 含萬用字元：用 glob；
    if (/[*?]/.test(p)) {
      // 轉正規式；
      const re = globToRegExp(p);
      // 比對整個相對路徑；
      return (rel) => re.test(rel);
    }
    // 否則是檔案路徑或資料夾：完全相同，或在該資料夾底下；
    return (rel) => rel === p || rel.startsWith(`${p}/`);
  });
  // 任何一個樣式符合就算符合；
  return (rel) => tests.some((test) => test(rel.normalize('NFC')));
}

// 在 root 執行 git 並回傳標準輸出；失敗會丟錯；maxBuffer 放大，避免 ls-files 列出整個筆記庫時超過預設上限；
function git(root, ...args) {
  // execFileSync 以陣列傳參數，不經 shell；stdio 設定讓 stderr 被收進錯誤訊息；
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
}

// 確認工作目錄乾淨並回傳「git 已追蹤的檔案集合」；不乾淨就丟錯（訊息是繁體中文）；
function assertCleanAndTracked(root) {
  // 取 git status；失敗（不是 repo、沒裝 git）轉成清楚的錯誤；
  let status;
  // try/catch；
  try {
    // --porcelain 輸出穩定、適合程式讀；
    status = git(root, 'status', '--porcelain');
  } catch (error) {
    // 轉訊息；
    throw new Error(`無法執行 git status，請確認筆記根目錄在 git repo 內：${error instanceof Error ? error.message : String(error)}`);
  }
  // 逐行過濾：只有 .superpowers（工作紀錄資料夾）不算髒；porcelain 每行前三個字元是狀態與空格，路徑可能被引號包住、資料夾以 / 結尾；
  // 必須是「第一段路徑剛好等於 .superpowers」（精確比對，不是前綴：.superpowers-extra 不豁免）；
  const dirty = status.split('\n').filter((line) => {
    // 空行略過；
    if (line.trim() === '') return false;
    // 取路徑、去掉可能的引號，並取第一段；
    const first = line.slice(3).replace(/^"|"$/g, '').split('/')[0];
    // 第一段不是 .superpowers 才算髒；
    return first !== '.superpowers';
  });
  // 有任何其他變更就拒絕；
  if (dirty.length > 0) {
    // 最多列 10 行；
    throw new Error(`git 工作目錄不乾淨，請先 commit 或 stash 後再執行 --apply（這樣每次遷移都能用 git 一鍵回復）：\n${dirty.slice(0, 10).join('\n')}${dirty.length > 10 ? `\n…還有 ${dirty.length - 10} 筆` : ''}`);
  }
  // 已追蹤的檔案：-z 以 NUL 分隔且不跳脫中文路徑；split('\0') 切開，filter(Boolean) 去掉結尾空字串；
  return new Set(git(root, 'ls-files', '-z').split('\0').filter(Boolean));
}

// 讀兩個共用樣式檔，回傳共用選擇器集合；任一檔案不存在會丟錯，集合沒有任何選擇器也丟錯（大聲失敗，不默默什麼都不修剪）；
async function loadShared(root) {
  // 讀 note-theme.css 與 notes.css；Promise.all 同時讀；
  const texts = await Promise.all(['note-theme.css', 'notes.css'].map((name) => fs.readFile(path.join(root, 'assets', name), 'utf8')));
  // 取聯集；
  const set = sharedSelectorsOf(texts);
  // 全是自訂屬性或空：代表樣式檔壞了；
  if (![...set].some((key) => !key.startsWith('--'))) throw new Error(`共用樣式沒有任何 selector（${root}/assets 的 note-theme.css 與 notes.css 是空的？）`);
  // 回傳；
  return set;
}

// 處理單一檔案：讀、遷移、（apply 時）寫；回傳一筆結果物件；任何錯誤都轉成 error 欄位，不丟出去；
async function processFile(root, relPath, shared, apply, tracked) {
  // 基本結果；
  const entry = { path: relPath, changed: false };
  // try/catch：單檔失敗不中斷整批；
  try {
    // 絕對路徑；
    const abs = path.join(root, ...relPath.split('/'));
    // 讀原始位元組；
    const buf = await fs.readFile(abs);
    // 解成 UTF-8 字串（BOM 會保留成 U+FEFF 字元）；
    const text = buf.toString('utf8');
    // 無損往返檢查：編回去的位元組必須與原檔完全相同，否則寫回會悄悄改掉非法位元組；
    if (!Buffer.from(text, 'utf8').equals(buf)) throw new Error('不是有效的 UTF-8，無法無損寫回');
    // 遷移；
    const result = migrateHtml(text, assetsRelPath(relPath), shared);
    // 併入統計欄位；
    Object.assign(entry, result.stats, { changed: result.changed });
    // 真的要寫：已追蹤才寫（未追蹤的檔案出錯時 git 無法回復）；
    if (apply && result.changed) {
      // 沒被 git 追蹤就回報錯誤、不寫；
      if (!tracked.has(relPath)) throw new Error('檔案未被 git 追蹤，無法用 git 回復，不寫入');
      // 原子寫入：先寫同資料夾的暫存檔再改名覆蓋，中途失敗不會留下寫到一半的筆記（並保留原檔模式）；
      await atomicWriteFile(abs, Buffer.from(result.html, 'utf8'));
    }
  } catch (error) {
    // 記錄錯誤訊息；
    entry.error = error instanceof Error ? error.message : String(error);
  }
  // 回傳；
  return entry;
}

// 把一筆結果格式化成一行；
function formatLine(entry) {
  // 錯誤；
  if (entry.error !== undefined) return `${entry.path}: error (${entry.error})`;
  // 跳過；
  if (entry.skipped !== undefined) return `${entry.path}: skipped (${entry.skipped})`;
  // 沒變更；
  if (!entry.changed) return `${entry.path}: unchanged`;
  // 有變更：style 位元組變化、移除規則數、新增連結與腳本數；
  return `${entry.path}: style ${entry.styleBytesBefore}→${entry.styleBytesAfter} bytes, rules removed ${entry.rulesRemoved}, +${entry.linksAdded.length} links, +${entry.scriptsAdded.length} scripts`;
}

// 主流程；回傳結束碼；
async function main() {
  // 解析參數；
  const opts = parseArgs(process.argv.slice(2));
  // 絕對路徑的根目錄；
  const root = path.resolve(process.cwd(), opts.root);
  // 只有 --apply 才檢查 git 並取得已追蹤清單；dry-run 不需要 git；
  const tracked = opts.apply ? assertCleanAndTracked(root) : new Set();
  // 排除清單只取自 _config.yml；
  const exclude = await loadExclude(path.join(root, '_config.yml'));
  // 掃描所有筆記；
  const all = await listNotes(root, exclude);
  // 與網站建置相同：去掉被取代的舊 html、保留 slug（根目錄的 index）；
  const { published: current } = dropSuperseded(all);
  const { published } = applyReservedSlugs(current);
  // 只留 html，再依 --only 篩選；listNotes 已依 relPath 排序，filter 保持順序；
  const matcher = makeMatcher(opts.only, root);
  let files = published.filter((note) => note.kind === 'html' && matcher(note.relPath)).map((note) => note.relPath);
  // 有 --only 卻一份都沒符合：多半是打錯路徑，失敗並說明；
  if (opts.only.length > 0 && files.length === 0) throw new Error(`--only 沒有符合任何已發布的 html 筆記：${opts.only.join('、')}`);
  // --limit：取前 N 份；
  if (opts.limit !== undefined) files = files.slice(0, opts.limit);
  // 載入共用集合；
  const shared = await loadShared(root);
  // 開頭說明模式；
  console.log(`${opts.apply ? '套用模式（--apply，會寫檔）' : 'dry-run（只預覽、不寫檔；加 --apply 才會寫入）'}：${root}，共 ${files.length} 份已發布的 html 筆記`);
  // 逐檔處理；for...of 搭配 await 依序執行，輸出順序固定；
  const entries = [];
  for (const relPath of files) {
    // 處理一份；
    const entry = await processFile(root, relPath, shared, opts.apply, tracked);
    // 立刻印出，長時間執行時能看到進度；
    console.log(formatLine(entry));
    // 收集；
    entries.push(entry);
  }
  // 彙總；
  const changed = entries.filter((e) => e.changed && e.error === undefined);
  const unchanged = entries.filter((e) => !e.changed && e.error === undefined && e.skipped === undefined);
  const skipped = entries.filter((e) => e.skipped !== undefined && e.error === undefined);
  const errors = entries.filter((e) => e.error !== undefined);
  // 所有檔案的 style 位元組總計與節省量（未變更的檔案前後相同）；
  const sum = (list, key) => list.reduce((total, e) => total + (e[key] ?? 0), 0);
  const before = sum(entries, 'styleBytesBefore');
  const after = sum(entries.filter((e) => e.error === undefined), 'styleBytesAfter');
  // 印摘要；
  console.log('---');
  console.log(`files changed: ${changed.length}`);
  console.log(`files unchanged: ${unchanged.length}`);
  console.log(`files skipped: ${skipped.length}${skipped.length > 0 ? `（${skipped.map((e) => `${e.path}：${e.skipped}`).join('；')}）` : ''}`);
  console.log(`files errored: ${errors.length}${errors.length > 0 ? `（${errors.map((e) => `${e.path}：${e.error}`).join('；')}）` : ''}`);
  console.log(`style bytes (all files): ${before}→${after}，saved ${before - after}`);
  console.log(`rules removed: ${sum(changed, 'rulesRemoved')}，custom properties removed: ${sum(changed, 'customPropsRemoved')}`);
  // 報告檔；
  if (opts.report !== undefined) {
    // 組 JSON；
    const json = { root, apply: opts.apply, summary: { changed: changed.length, unchanged: unchanged.length, skipped: skipped.length, errors: errors.length, styleBytesBefore: before, styleBytesAfter: after }, files: entries };
    // 寫成縮排 2 格的 JSON；
    await fs.writeFile(path.resolve(process.cwd(), opts.report), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    // 告知位置；
    console.log(`報告已寫入 ${path.resolve(process.cwd(), opts.report)}`);
  }
  // 有任何失敗，結束碼 1；
  return errors.length > 0 ? 1 : 0;
}

// 執行主流程；try/catch 把丟出的錯誤轉成訊息與結束碼 1（不印堆疊，訊息本身已是給人看的）；
try {
  // 設定結束碼，讓行程自然結束（不用 process.exit，避免截斷尚未寫出的輸出）；
  process.exitCode = await main();
} catch (error) {
  // 印出訊息；
  console.error(error instanceof Error ? error.message : String(error));
  // 結束碼；
  process.exitCode = 1;
}
