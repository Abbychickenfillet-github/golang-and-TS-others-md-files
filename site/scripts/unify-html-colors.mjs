// ===== 把已套用公版的 html 筆記裡寫死的淺色表面色、深灰文字、淺灰邊線換成主題變數 =====
// 用法（在 site/ 底下執行）：node scripts/unify-html-colors.mjs [--root <筆記根目錄，預設 ..>] [--only <路徑或資料夾>]… [--apply]
// 預設是 dry-run（只預覽、不寫檔）；--apply 才會寫檔，而且要求 git 工作目錄乾淨，讓每次都能用 git 一鍵回復；
// 範圍：已發布、而且已經連結 note-theme.css 的 html 筆記（還沒套公版的頁面不動）；
// 匯入 fs 的 promise 版 API；
import * as fs from 'node:fs/promises';
// 匯入 path 模組；
import * as path from 'node:path';
// 匯入 execFileSync：同步執行 git，參數用陣列傳入、不經 shell；
import { execFileSync } from 'node:child_process';
// 匯入 module 的 register：註冊 ts-resolve-hook，讓 .ts 檔裡不寫副檔名的匯入也能解析；
import { register } from 'node:module';

// 註冊 hook；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才動態匯入 .ts；
const { listNotes, loadExclude } = await import('../src/lib/content.ts');
// 匯入與網站建置相同的發布範圍規則；
const { applyReservedSlugs, dropSuperseded } = await import('../src/lib/site.ts');
// 匯入原子寫檔；
const { atomicWriteFile } = await import('../src/lib/atomic-write.ts');
// 匯入顏色統一函式；
const { unifyHtmlColors } = await import('../src/lib/unify-colors.ts');

// 解析參數：--root、--only（可多次）、--apply；
function parseArgs(argv) {
  // 預設值；
  const opts = { root: process.env.NOTES_ROOT ?? '..', only: [], apply: false };
  // 逐一處理；
  for (let i = 0; i < argv.length; i++) {
    // 旗標吃下一個參數當值；
    if (argv[i] === '--apply') opts.apply = true;
    else if (argv[i] === '--root') opts.root = argv[++i];
    else if (argv[i] === '--only') opts.only.push(argv[++i]);
    else throw new Error(`不認得的參數：${argv[i]}`);
  }
  // 回傳；
  return opts;
}

// 在 root 執行 git 並回傳輸出；
function git(root, ...args) {
  // 參數用陣列傳入；
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
}

// 主流程；
async function main() {
  // 解析參數；
  const opts = parseArgs(process.argv.slice(2));
  // 根目錄；
  const root = path.resolve(process.cwd(), opts.root);
  // --apply 要求工作目錄乾淨（.superpowers 資料夾不算）；
  if (opts.apply) {
    // 取 porcelain 狀態；
    const dirty = git(root, 'status', '--porcelain').split('\n').filter((l) => l.trim() !== '' && !['.superpowers', 'node_modules'].includes(l.slice(3).replace(/^"|"$/g, '').split('/')[0]));
    // 有變更就拒絕；
    if (dirty.length > 0) throw new Error(`git 工作目錄不乾淨，請先 commit 後再 --apply：\n${dirty.slice(0, 10).join('\n')}`);
  }
  // 與網站相同的發布範圍；
  const exclude = await loadExclude(path.join(root, '_config.yml'));
  const all = await listNotes(root, exclude);
  const { published: current } = dropSuperseded(all);
  const { published } = applyReservedSlugs(current);
  // 只留 html 並依 --only 篩選（路徑相同或在該資料夾底下）；
  const only = opts.only.map((p) => p.replace(/\\/g, '/').replace(/\/+$/, '').normalize('NFC'));
  const files = published.filter((n) => n.kind === 'html' && (only.length === 0 || only.some((p) => n.relPath.normalize('NFC') === p || n.relPath.normalize('NFC').startsWith(`${p}/`)))).map((n) => n.relPath);
  // 統計；
  let changedFiles = 0;
  let changedDecls = 0;
  let skippedNoTheme = 0;
  // 逐檔處理；
  for (const rel of files) {
    // 絕對路徑與內容；
    const abs = path.join(root, ...rel.split('/'));
    const buf = await fs.readFile(abs);
    const text = buf.toString('utf8');
    // 無損往返檢查；
    if (!Buffer.from(text, 'utf8').equals(buf)) { console.log(`${rel}: error (不是有效的 UTF-8)`); continue; }
    // 還沒套公版的不處理；
    if (!text.includes('note-theme.css')) { skippedNoTheme += 1; continue; }
    // 轉換；
    const result = unifyHtmlColors(text);
    // 沒變就略過；
    if (result.changes === 0) continue;
    // 統計並印出；
    changedFiles += 1;
    changedDecls += result.changes;
    console.log(`${rel}: ${result.changes} 處`);
    // 寫檔；
    if (opts.apply) await atomicWriteFile(abs, Buffer.from(result.text, 'utf8'));
  }
  // 摘要；
  console.log('---');
  console.log(`${opts.apply ? '已寫入' : 'dry-run，將會改'}：${changedFiles} 份、${changedDecls} 處宣告；未套公版而略過：${skippedNoTheme} 份`);
}

// 執行；失敗設結束碼；
try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
