// 匯入 fs 的 promise 版 API，用 `import * as` 把整個模組收成命名空間 fs；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來處理路徑；相對路徑一律用 path.posix 以正斜線計算；
import * as path from 'node:path';
// 匯入 child_process 的 execFileSync，同步執行 git；參數用陣列傳入、不經 shell，中文與空白不必跳脫；
import { execFileSync } from 'node:child_process';
// 匯入 url 模組的 pathToFileURL，用來判斷本檔是否被當成程式入口執行；
import { pathToFileURL } from 'node:url';

// JSDoc 型別宣告：從 Task 6 的 content.ts 借用 NoteEntry 型別，只在編譯期存在，不會在執行期載入 content.ts；
/** @typedef {import('../src/lib/content').NoteEntry} NoteEntry */
// JSDoc 型別宣告：一筆改名規劃，from／to 都是相對於筆記根目錄的正斜線路徑；
/** @typedef {{ from: string; to: string }} RenamePlan */
// JSDoc 型別宣告：applyRenames 的回傳結果；
/** @typedef {{ renames: RenamePlan[]; conflicts: string[]; filesChanged: { file: string; links: number }[]; linksChanged: number; ambiguous: string[]; unsafe: string[]; applied: boolean }} ApplyResult */

// 改名後綴常數：加在 .html 之前；`const` 宣告不可重新賦值的常數；
const SUFFIX = '-互動版';

// 去掉路徑最後一個副檔名（含點），例如 'a/b.html' 變成 'a/b'；
function stripExt(relPath) {
  // 取最後一個 '.' 的位置；lastIndexOf 找不到時回傳 -1；
  const dot = relPath.lastIndexOf('.');
  // 沒有點、或點在最後一個 '/' 之前（點屬於資料夾名）就原樣回傳；
  if (dot < 0 || dot < relPath.lastIndexOf('/')) return relPath;
  // slice(0, dot) 取點之前的部分；
  return relPath.slice(0, dot);
}

/**
 * 規劃改名：只對「同路徑同主檔名同時有 .md 與 .html」的 .html 產生 <原檔名>-互動版.html。
 * @param {NoteEntry[]} notes 筆記清單（listNotes 的結果）
 * @returns {RenamePlan[]} 改名規劃，順序沿用輸入順序
 */
// `export function` 匯出具名函式；
export function planRenames(notes) {
  // 用 Set 收集所有 md 的「去副檔名路徑」，之後 O(1) 查詢有沒有同名 md；
  const mdStems = new Set(notes.filter((n) => n.kind === 'md').map((n) => stripExt(n.relPath)));
  // 累積結果的陣列；
  const plan = [];
  // 逐筆檢查筆記；
  for (const n of notes) {
    // 只處理 html；
    if (n.kind !== 'html') continue;
    // 去副檔名後的路徑（同時用來比對 md 與組新檔名）；
    const stem = stripExt(n.relPath);
    // 沒有同路徑同主檔名的 md 就不是配對，略過；
    if (!mdStems.has(stem)) continue;
    // 主檔名已以 -互動版 結尾就不再加；endsWith 檢查字串結尾；
    if (stem.endsWith(SUFFIX)) continue;
    // 加入規劃：新檔名固定用小寫 .html；
    plan.push({ from: n.relPath, to: `${stem}${SUFFIX}.html` });
  }
  // 回傳規劃；
  return plan;
}

// 遞迴列出 root 底下所有 .md 與 .html（相對路徑、正斜線）；跳過點開頭資料夾、node_modules 與根層的 site/；
async function collectFiles(root, dirRel = '') {
  // 累積結果；
  const out = [];
  // 讀出目前資料夾的項目，withFileTypes 讓每筆是 Dirent；
  const entries = await fs.readdir(path.join(root, dirRel), { withFileTypes: true });
  // 逐一處理；
  for (const entry of entries) {
    // 相對路徑一律用正斜線，不用 path.join（Windows 會產生反斜線）；
    const rel = dirRel === '' ? entry.name : `${dirRel}/${entry.name}`;
    // 資料夾：決定要不要走進去；
    if (entry.isDirectory()) {
      // 點開頭（.git、.obsidian…）與 node_modules 一律不掃；
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      // 根層的 site/ 是 Next.js 專案，不掃；
      if (rel === 'site') continue;
      // 遞迴走進去，`push(...陣列)` 以展開語法把子結果加進 out；
      out.push(...(await collectFiles(root, rel)));
      // 處理下一個項目；
      continue;
    }
    // 不是一般檔案（例如符號連結）就略過；
    if (!entry.isFile()) continue;
    // 取小寫副檔名；
    const ext = path.extname(entry.name).toLowerCase();
    // 只收 .md 與 .html；
    if (ext === '.md' || ext === '.html') out.push(rel);
  }
  // 回傳；
  return out;
}

// 判斷連結路徑是不是外部或絕對位置（有協定如 https:、mailto:、C:，或 // 開頭、/ 開頭），這類不是「相對於本檔」；
function isNonRelative(p) {
  // 正規表示式：字母開頭後接字母數字與 + . - 再接冒號，就是協定；`||` 左邊為真就不看右邊；
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p) || p.startsWith('/');
}

// 把連結拆成「路徑」與「?query／#fragment 後綴」兩段；
function splitSuffix(target) {
  // search 回傳第一個 ? 或 # 的位置，找不到是 -1；
  const i = target.search(/[?#]/);
  // 找不到後綴就整段是路徑；找到就以位置切成兩段，用陣列回傳；
  return i < 0 ? [target, ''] : [target.slice(0, i), target.slice(i)];
}

// 安全的 decodeURIComponent：遇到壞掉的 % 序列時不丟錯，改回傳原字串；
function decodeSafe(p) {
  // try／catch 接住 URIError；
  try {
    // 把 %20、%E6… 還原成真實字元；
    return decodeURIComponent(p);
  } catch {
    // 不帶變數的 catch；解不開就當它本來就是字面路徑；
    return p;
  }
}

// 把「相對於 fileDir 的連結路徑」解析成筆記根目錄下的正規化路徑；不是相對路徑或解析不出就回傳 null；
function resolveLink(fileDir, rawPath) {
  // 空路徑（純 #fragment）與外部／絕對連結都不處理；
  if (rawPath === '' || isNonRelative(rawPath)) return null;
  // 還原百分比編碼後再與所在資料夾合併；
  const decoded = decodeSafe(rawPath);
  // path.posix.normalize 會化簡 ./ 與 ../；根層檔案（fileDir 為空）不加前綴；
  return path.posix.normalize(fileDir === '' ? decoded : `${fileDir}/${decoded}`);
}

// 把「-互動版」依原連結的編碼風格轉成要插入的文字：原檔名片段含百分比編碼的中文就也編碼，否則照字面；
function suffixFor(lastSegment) {
  // 判斷檔名片段是否含非 ASCII 位元組的百分比編碼（%80~%FF，即首位 8–F）；
  if (!/%[89a-fA-F][0-9a-fA-F]/.test(lastSegment)) return SUFFIX;
  // encodeURIComponent 把 -互動版 編成 -%E4%BA%92%E5%8B%95%E7%89%88（連字號是未保留字元，不編碼）；
  const encoded = encodeURIComponent(SUFFIX);
  // 取出片段內所有「% 加兩位十六進位」的序列，match 搭配 g 旗標回傳全部比對（沒有時為 null，用 ?? 換成空陣列）；
  const escapes = lastSegment.match(/%[0-9a-fA-F]{2}/g) ?? [];
  // 若原本有序列用了小寫十六進位（例如 %e6），新插入的也用小寫，保持風格一致；some 只要有一個符合就為真；
  return escapes.some((e) => /[a-f]/.test(e)) ? encoded.toLowerCase() : encoded;
}

// 把原連結路徑（字串形式）結尾的 .html 改成 -互動版.html，保留其餘字元與編碼風格；結尾不是 .html 就回傳 null；
function renamedRawPath(rawPath) {
  // 比對結尾的 .html（不分大小寫）；exec 回傳比對資訊或 null；
  const m = /\.html$/i.exec(rawPath);
  // 結尾不是 .html（例如編碼成 %2Ehtml）就不改，交由呼叫端略過；
  if (m === null) return null;
  // 取最後一個 / 之後的檔名片段，用來判斷編碼風格；
  const lastSegment = rawPath.slice(rawPath.lastIndexOf('/') + 1);
  // 組出新連結路徑：.html 之前插入後綴，副檔名固定寫成小寫 .html（與實際改名結果一致）；
  return `${rawPath.slice(0, m.index)}${suffixFor(lastSegment)}.html`;
}

// 嘗試改寫一個連結目標（路徑加可能的 ?# 後綴）；沒有指向被改名的 html 就回傳 null；
function rewriteTarget(target, fileDir, renameMap) {
  // 拆成路徑與後綴；
  const [rawPath, suffix] = splitSuffix(target);
  // 解析成根目錄下的路徑；
  const resolved = resolveLink(fileDir, rawPath);
  // 不是相對連結，或解析後不是被改名的舊 html，就不動；Map.has 檢查鍵是否存在；
  if (resolved === null || !renameMap.has(resolved)) return null;
  // 產生新的原始路徑字串；
  const next = renamedRawPath(rawPath);
  // 寫法特殊無法安全改寫就不動；
  if (next === null) return null;
  // 新路徑接回原本的後綴；
  return `${next}${suffix}`;
}

// 找出一個 [[wikilink]] 目標（已去掉 # 與 | 之後的部分）在筆記庫中對應到哪些 html；Obsidian 比對不分大小寫；
function wikiCandidates(target, htmlPaths) {
  // 去掉開頭的 /，並轉小寫比對；
  const t = target.replace(/^\/+/, '').toLowerCase();
  // 路徑完全相同，或以 /目標 結尾；目標不含 / 時，這等於只比對檔名，含 / 時等於比對路徑尾段；filter 留下符合條件的元素；
  return htmlPaths.filter((p) => {
    // 路徑轉小寫；
    const lower = p.toLowerCase();
    // 完全相同或以 /目標 結尾就是候選；
    return lower === t || lower.endsWith(`/${t}`);
  });
}

// 改寫單一檔案的內容；回傳新內容、改了幾個連結、以及含糊（不敢改）的 wikilink 清單；
function rewriteContent(content, fileRel, kind, ctx) {
  // 檔案所在資料夾（根層為空字串）；path.posix.dirname 對根層檔案回傳 '.'；
  const dir = path.posix.dirname(fileRel);
  // 把 '.' 換成空字串，方便組路徑；
  const fileDir = dir === '.' ? '' : dir;
  // 累計改寫的連結數；
  let count = 0;
  // 含糊的 wikilink 清單；
  const ambiguous = [];
  // 結果內容，依序套用各種連結寫法；
  let text = content;

  // 第一種：HTML 屬性 href／src（md 內嵌 html 也適用）；g 旗標找全部、i 旗標不分大小寫；
  text = text.replace(/(\b(?:href|src)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi, (whole, head, dq, sq) => {
    // 雙引號與單引號各有一個捕捉群組，取有值的那個；
    const value = dq ?? sq;
    // 嘗試改寫；
    const next = rewriteTarget(value, fileDir, ctx.renameMap);
    // 沒指向舊 html 就原樣回傳整段比對；
    if (next === null) return whole;
    // 改寫成功，計數加一；
    count += 1;
    // 沿用原本的引號種類（dq 有值代表雙引號）；
    const quote = dq !== undefined ? '"' : "'";
    // 組回屬性；
    return `${head}${quote}${next}${quote}`;
  });

  // 其餘兩種只出現在 md；
  if (kind === 'md') {
    // 第二種：Markdown 連結 ](目標)；目標允許一層成對括號；群組 1 是 ](，群組 2 是括號內全部，群組 3 是 )；
    text = text.replace(/(\]\()((?:[^()\n]|\([^()\n]*\))*)(\))/g, (whole, open, inner, close) => {
      // 把括號內拆成「開頭空白與可選的 <」「路徑」「結尾的 > 、可選 title 與空白」；
      const m = /^(\s*<?)([^<>]*?)(>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*)$/.exec(inner);
      // 拆不開（結構不像連結）就原樣；
      if (m === null) return whole;
      // 嘗試改寫路徑部分；
      const next = rewriteTarget(m[2], fileDir, ctx.renameMap);
      // 沒指向舊 html 就原樣；
      if (next === null) return whole;
      // 計數加一；
      count += 1;
      // 只換掉路徑那一段，其餘原樣；
      return `${open}${m[1]}${next}${m[3]}${close}`;
    });

    // 第三種：Obsidian wikilink／嵌入，明確寫出 .html；群組 1 是 [[ 或 ![[，群組 2 是目標，群組 3 是 #標題 或 |別名 與 ]]；
    text = text.replace(/(!?\[\[)([^[\]|#\n]+)((?:[#|][^[\]\n]*)?\]\])/g, (whole, open, target, tail) => {
      // 沒寫 .html 的 wikilink（例如 [[日期 物件]]）一律不動，它們指向 md；
      if (!/\.html$/i.test(target)) return whole;
      // 找出筆記庫內符合此目標的 html；
      const hits = wikiCandidates(target, ctx.htmlPaths);
      // 沒有任何 html 符合（壞連結）就不動；
      if (hits.length === 0) return whole;
      // 全部符合者都會被改名，才能確定新名稱仍指向同一批檔案；
      if (!hits.every((h) => ctx.renameMap.has(h))) {
        // 有些會改名、有些不會：無法判斷原本指向誰，不改並回報；
        if (hits.some((h) => ctx.renameMap.has(h))) ambiguous.push(`${fileRel}: ${whole}`);
        // 原樣回傳；
        return whole;
      }
      // 計數加一；
      count += 1;
      // 把目標結尾的 .html 換成 -互動版.html；
      return `${open}${target.replace(/\.html$/i, '')}${SUFFIX}.html${tail}`;
    });
  }
  // 回傳結果；
  return { text, count, ambiguous };
}

// 在 root 執行 git 並回傳標準輸出；失敗時丟錯；
function git(root, ...args) {
  // 第三個參數的 cwd 讓 git 在筆記根目錄執行；encoding 讓輸出直接是字串；
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// 檢查檔案或資料夾是否存在；
async function exists(p) {
  // access 不丟錯就是存在；
  try {
    // 檢查可見性；
    await fs.access(p);
    // 存在；
    return true;
  } catch {
    // 不存在；
    return false;
  }
}

/**
 * 套用（或 dry-run 預覽）改名與連結更新。
 * @param {RenamePlan[]} plan planRenames 的結果
 * @param {string} root 筆記根目錄（必須在 git repo 內）
 * @param {{ dryRun?: boolean }} [opts] dryRun 預設 true；為 false 才真的用 git mv 改名並寫入連結
 * @returns {Promise<ApplyResult>} 規劃、撞名清單、會改動的檔案與連結數
 */
// 預設參數 `opts = { dryRun: true }`：不傳第三個參數時就是 dry-run；
export async function applyRenames(plan, root, opts = { dryRun: true }) {
  // `??` 在 dryRun 是 undefined 時補 true，確保「沒明說」永遠是預覽；
  const dryRun = opts.dryRun ?? true;
  // 舊路徑對新路徑的對照表，連結改寫時用來查「這是不是被改名的 html」；
  const renameMap = new Map(plan.map((r) => [r.from, r.to]));

  // 撞名清單：目標已存在於磁碟，或同一份規劃內有兩筆指向同一個目標；
  const conflicts = [];
  // 已看過的目標，用來偵測規劃內部重複；
  const seenTargets = new Set();
  // 逐筆檢查；
  for (const r of plan) {
    // 目標已存在，或規劃內重複，就列為撞名；
    if ((await exists(path.join(root, r.to))) || seenTargets.has(r.to)) conflicts.push(r.to);
    // 記下已出現的目標；
    seenTargets.add(r.to);
  }

  // 掃描所有 md／html（不套用發布排除清單，私人筆記的連結也要修）；
  const files = await collectFiles(root);
  // 所有 html 的路徑，供 wikilink 判斷用；
  const htmlPaths = files.filter((f) => f.toLowerCase().endsWith('.html'));
  // 傳給改寫函式的共用資料；
  const ctx = { renameMap, htmlPaths };

  // 會被改寫的檔案（含新內容），先全部算好再決定要不要寫；
  const changes = [];
  // 含糊 wikilink 彙整；
  const ambiguous = [];
  // 不能安全以 UTF-8 往返的檔案（含非法位元組），不改寫並回報；
  const unsafe = [];
  // 逐檔讀入並嘗試改寫；
  for (const rel of files) {
    // 以位元組讀入，避免任何換行或 BOM 轉換；
    const buf = await fs.readFile(path.join(root, rel));
    // 轉成字串：Buffer.toString('utf8') 保留 BOM（變成 U+FEFF 字元）與 CRLF；
    const raw = buf.toString('utf8');
    // 副檔名決定要套用哪幾種連結寫法；
    const kind = rel.toLowerCase().endsWith('.md') ? 'md' : 'html';
    // 嘗試改寫；
    const result = rewriteContent(raw, rel, kind, ctx);
    // 累積含糊清單；
    ambiguous.push(...result.ambiguous);
    // 沒有任何連結要改就跳過，這個檔案完全不寫；
    if (result.count === 0) continue;
    // 內容若無法無損往返（非 UTF-8 位元組），寫回會破壞其他位元組，所以拒絕改寫並回報；
    if (!Buffer.from(raw, 'utf8').equals(buf)) {
      // 記下檔名；
      unsafe.push(rel);
      // 跳過；
      continue;
    }
    // 記下要寫入的內容與改寫數量；
    changes.push({ file: rel, text: result.text, links: result.count });
  }

  // 組出回傳結果；filesChanged 只留檔名與連結數；
  const summary = {
    // 原規劃；
    renames: plan,
    // 撞名清單；
    conflicts,
    // 會改動的檔案與連結數；
    filesChanged: changes.map((c) => ({ file: c.file, links: c.links })),
    // 連結總數：reduce 把每個檔案的連結數累加，初始值 0；
    linksChanged: changes.reduce((sum, c) => sum + c.links, 0),
    // 含糊 wikilink；
    ambiguous,
    // 不安全檔案；
    unsafe,
    // 是否真的套用；
    applied: false,
  };

  // dry-run 到此為止，不動任何東西；
  if (dryRun) return summary;

  // 以下是真正套用前的把關；先確認 git 工作目錄乾淨；
  let status;
  // git 執行失敗（不是 repo、沒裝 git）時轉成清楚的錯誤；
  try {
    // --porcelain 輸出穩定格式，乾淨時輸出為空字串；
    status = git(root, 'status', '--porcelain');
  } catch (error) {
    // 錯誤物件的 message 附上原因；
    throw new Error(`無法執行 git status，請確認筆記根目錄在 git repo 內：${error instanceof Error ? error.message : String(error)}`);
  }
  // 不是空字串就代表有未提交或未追蹤的變更；
  if (status.trim() !== '') {
    // 丟錯並把變更清單附上，方便使用者看到是哪些檔案；
    throw new Error(`git 工作目錄不乾淨，請先 commit 或 stash 後再執行 --apply：\n${status}`);
  }
  // 目標檔名已存在就拒絕，避免覆蓋；
  if (conflicts.length > 0) {
    // 丟錯並列出所有撞名目標；
    throw new Error(`目標檔名已存在或重複，拒絕套用：\n${conflicts.map((c) => `  ${c}`).join('\n')}`);
  }

  // 先用 git mv 改名，讓 git 歷史跟著走（-- 之後的參數一律視為路徑）；
  for (const r of plan) {
    // 執行 git mv；
    git(root, 'mv', '--', r.from, r.to);
  }
  // 再寫入改寫後的內容；被改名的檔案要寫到新路徑；
  for (const c of changes) {
    // 該檔若剛被改名就用新路徑，否則原路徑；
    const target = renameMap.get(c.file) ?? c.file;
    // 以 UTF-8 寫出；字串中的 BOM 字元會原樣寫回，換行未經正規化；
    await fs.writeFile(path.join(root, target), c.text, 'utf8');
  }
  // 標記已套用；
  summary.applied = true;
  // 回傳結果；
  return summary;
}

// 判斷此檔是否被當成程式入口執行（node scripts/rename-interactive-pairs.mjs），被 import 時不執行下面的區塊；
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 立即執行的 async 函式，讓區塊內可以使用 await；
  (async () => {
    // 取出命令列參數（跳過 node 與腳本路徑）；
    const args = process.argv.slice(2);
    // 有 --apply 才真的改名；
    const apply = args.includes('--apply');
    // --out 後面接輸出檔路徑；indexOf 找不到是 -1；
    const outIndex = args.indexOf('--out');
    // 有 --out 就取下一個參數，否則為 undefined；
    const outFile = outIndex >= 0 ? args[outIndex + 1] : undefined;
    // --out 後面沒接路徑就報錯；
    if (outIndex >= 0 && (outFile === undefined || outFile.startsWith('--'))) throw new Error('--out 後面必須接輸出檔路徑');
    // 筆記根目錄：環境變數 NOTES_ROOT，預設為上一層（site/ 的上一層）；
    const root = path.resolve(process.cwd(), process.env.NOTES_ROOT ?? '..');
    // 動態匯入 Task 6 的載入器；Node 24 可直接載入 .ts（型別標註會被剝除），放在這裡讓被 import 時不需要載入它；
    const { listNotes, loadExclude } = await import('../src/lib/content.ts');
    // 排除清單取自根目錄的 _config.yml，不另寫一份；
    const exclude = await loadExclude(path.join(root, '_config.yml'));
    // 掃描所有會發布的筆記；
    const notes = await listNotes(root, exclude);
    // 規劃改名；
    const plan = planRenames(notes);
    // 套用或預覽；
    const result = await applyRenames(plan, root, { dryRun: !apply });
    // 印出標題與筆數；
    console.log(`${apply ? '已套用' : '預覽（dry-run，未改動任何檔案）'}：共 ${plan.length} 組 md＋html 同名配對`);
    // 逐筆印出 from → to；
    for (const r of plan) console.log(`  ${r.from} → ${r.to}`);
    // 印出連結更新統計；
    console.log(`${apply ? '已改寫' : '會改寫'}連結的檔案：${result.filesChanged.length} 個，連結共 ${result.linksChanged} 個`);
    // 撞名要明確列出；
    if (result.conflicts.length > 0) {
      // 標題；
      console.log(`⚠️ 目標檔名已存在（--apply 會拒絕）：${result.conflicts.length} 個`);
      // 逐筆列出；
      for (const c of result.conflicts) console.log(`  ${c}`);
    }
    // 含糊的 wikilink；
    if (result.ambiguous.length > 0) {
      // 標題；
      console.log(`⚠️ 含糊的 [[wikilink]]（同名 html 有的改名有的不改，未改動）：${result.ambiguous.length} 個`);
      // 逐筆列出；
      for (const a of result.ambiguous) console.log(`  ${a}`);
    }
    // 不能安全改寫的檔案；
    if (result.unsafe.length > 0) {
      // 標題；
      console.log(`⚠️ 含非 UTF-8 位元組、未改寫的檔案：${result.unsafe.length} 個`);
      // 逐筆列出；
      for (const u of result.unsafe) console.log(`  ${u}`);
    }
    // 有 --out 就把規劃寫成 JSON；JSON.stringify 第三個參數 2 是縮排空白數；
    if (outFile !== undefined) {
      // 建立輸出檔的上層資料夾；
      await fs.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
      // 寫出 JSON，結尾補換行；
      await fs.writeFile(path.resolve(outFile), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
      // 告知輸出位置；
      console.log(`規劃已寫入 ${path.resolve(outFile)}`);
    }
  })().catch((err) => {
    // 失敗時把訊息寫到 stderr，不印堆疊（訊息本身已足夠說明）；
    console.error(err instanceof Error ? err.message : err);
    // 結束碼設為 1（非 0 代表失敗）；
    process.exitCode = 1;
  });
}
