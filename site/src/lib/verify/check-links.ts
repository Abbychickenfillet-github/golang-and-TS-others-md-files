// 建置後驗證：檢查輸出資料夾裡每個 .html 的站內連結（href、src、srcset、poster、object data、form action…）對應的檔案是否存在；
// 與 GitHub Pages 一致的存在規則：網址（去掉 basePath、百分比解碼後）對應到 (a) 同名檔案，或 (b) 加 .html 的檔案，或 (c) 資料夾裡的 index.html；
// 區分大小寫：先把 out/ 走訪一次成「精確相對路徑的 Set」，不對每條連結呼叫 fs.stat；本機 Windows 不分大小寫打得開、Pages 上 404 的連結因此會被抓到；
// 相對網址的解讀（決定）：以「頁面檔案所在資料夾」為基準，與瀏覽器開啟 /a/b 或 /a/b.html 時一樣（兩者的基準資料夾都是 /a/）；
//   網站輸出的連結也是這樣用的：md 產生的 wikilink 與圖片是 `${basePath}/…` 的絕對網址（不受基準影響），html 筆記保留原作者寫的「頁面相對」連結；
//   因此一律把頁面當成位於 `${basePath}/該檔案相對路徑`，用瀏覽器同樣的 WHATWG URL 規則解析（`..`、`./`、`?query`、`#fragment`、`%2e%2e` 都由 URL 處理）；
// 匯入 fs 的 promise 版 API，讀頁面檔案；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，組實體路徑；
import * as path from 'node:path';
// 匯入 cheerio 解析 html；它只會找到「元素的屬性」，script、style、註解裡長得像連結的文字不會被當成連結；
import * as cheerio from 'cheerio';
// 匯入 domhandler 的元素型別；`import type` 只用於型別，執行時整行消失；
import type { Element } from 'domhandler';
// 匯入 srcset 解析（依 WHATWG 規則，網址裡的逗號不會被切碎）；
import { parseSrcset } from '../local-assets';
// 匯入走訪工具；
import { listOut } from './walk';

// 一筆連結問題：page 是頁面相對路徑（如 a/b.html），href 是頁面裡原始寫的連結文字；
export type LinkProblem = { page: string; href: string };

// 選項：basePath 是網站部署的前綴（'' 或 '/segment…'）；fragments 預設 true，檢查 #錨點是否存在於目標頁（只警告）；
export type CheckLinksOptions = { basePath?: string; fragments?: boolean };

// 回傳：broken 是目標不存在的連結；missingAnchors 是目標頁存在但沒有該錨點（只是警告）；pages 是掃描的頁數；links 是檢查的站內連結數；
export type CheckLinksResult = { broken: LinkProblem[]; missingAnchors: LinkProblem[]; pages: number; links: number };

// 解析用的假網站來源；`.invalid` 是保留網域，保證不會是任何真實網站；用來判斷「解析後是不是仍在本站」；
const SITE_ORIGIN = 'http://site.invalid';

// 寬鬆的百分比解碼：整串能解就整串解；有壞掉的 % 序列時，只解其中合法的連續片段，壞的保留原樣（不丟錯）；
function decodeLenient(text: string): string {
  // try/catch：decodeURIComponent 遇到不合法序列（例如單獨的 %）會丟 URIError；
  try {
    // 先嘗試整串解碼；
    return decodeURIComponent(text);
  } catch {
    // 退而求其次：把每一段連續的 %XX 各自解碼，失敗的那段保留；正規式 (?:%[0-9a-fA-F]{2})+ 比對連續的百分比編碼；
    return text.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
      // 單段解碼；
      try {
        // 成功就用解碼結果；
        return decodeURIComponent(run);
      } catch {
        // 不是合法的 UTF-8 序列就保留；
        return run;
      }
    });
  }
}

// 取出一個頁面裡所有「待檢查的連結文字」，並收集這頁可以當錨點的 id 與 a[name]；
function extractRefs(html: string): { refs: string[]; ids: Set<string> } {
  // 解析；cheerio.load 回傳類似 jQuery 的函式；
  const $ = cheerio.load(html);
  // 連結文字清單；
  const refs: string[] = [];
  // 錨點集合；
  const ids = new Set<string>();
  // 一次選出所有可能帶連結的元素，逐一看屬性；選擇器用逗號分隔代表「或」；
  $('[href],[src],[srcset],[imagesrcset],[poster],[data],[action]').each((_, node) => {
    // 這個選擇器只會選到元素，所以可斷言成 Element（含 attribs 與 name）；
    const el = node as Element;
    // 屬性物件與標籤名稱；
    const { attribs, name } = el;
    // <base href> 不是連結（它改變解析基準，但本檢查不處理）；
    if (attribs.href !== undefined && name !== 'base') refs.push(attribs.href);
    // src：img、script、iframe、source、video、audio、track、embed 等都用它；
    if (attribs.src !== undefined) refs.push(attribs.src);
    // srcset 與 link 的 imagesrcset：多個候選網址；
    if (attribs.srcset !== undefined) refs.push(...parseSrcset(attribs.srcset));
    // 展開運算子 `...` 把陣列元素逐一加進 refs；
    if (attribs.imagesrcset !== undefined) refs.push(...parseSrcset(attribs.imagesrcset));
    // 影片封面；
    if (attribs.poster !== undefined) refs.push(attribs.poster);
    // 只有 <object> 的 data 屬性是網址（其他元素的 data 不是）；
    if (attribs.data !== undefined && name === 'object') refs.push(attribs.data);
    // 只有 <form> 的 action 是網址；
    if (attribs.action !== undefined && name === 'form') refs.push(attribs.action);
  });
  // 收集所有 id；
  $('[id]').each((_, node) => {
    // 取 id 值；空字串不算；
    const id = (node as Element).attribs.id;
    // 有值才收；
    if (id) ids.add(id);
  });
  // 舊式錨點 <a name="x">（HTML 規格仍承認它當 fragment 目標）；
  $('a[name]').each((_, node) => {
    // 取 name 值；
    const anchorName = (node as Element).attribs.name;
    // 有值才收；
    if (anchorName) ids.add(anchorName);
  });
  // 回傳；
  return { refs, ids };
}

// 在檔案清單裡找出網址對應的實際檔案（GitHub Pages 的規則）；找不到回傳 undefined；
// rel 是去掉 basePath 與開頭斜線、已解碼的路徑；結尾斜線代表「資料夾網址」，只找 index.html；
function findTarget(rel: string, files: Set<string>): string | undefined {
  // 空路徑就是首頁；
  if (rel === '') return files.has('index.html') ? 'index.html' : undefined;
  // 結尾斜線：資料夾網址，Pages 只會回 該資料夾/index.html；
  if (rel.endsWith('/')) return files.has(`${rel}index.html`) ? `${rel}index.html` : undefined;
  // 其他：依序試 檔案本身、加 .html、資料夾的 index.html，第一個存在的就是目標；
  return [rel, `${rel}.html`, `${rel}/index.html`].find((candidate) => files.has(candidate));
}

// 檢查輸出資料夾裡所有 .html 的站內連結；
export async function checkLinks(outDir: string, opts: CheckLinksOptions = {}): Promise<CheckLinksResult> {
  // basePath 預設空字串；fragments 預設開啟；
  const basePath = opts.basePath ?? '';
  // 錨點檢查預設開；`!== false` 讓 undefined 也算開；
  const fragments = opts.fragments !== false;
  // 走訪一次輸出資料夾；
  const entries = listOut(outDir);
  // 精確（區分大小寫）的檔案清單；
  const files = new Set(entries.filter((e) => !e.isDir).map((e) => e.rel));
  // 要掃描的頁面：副檔名 .html（不分大小寫）；
  const pages = [...files].filter((rel) => /\.html$/i.test(rel));
  // 每頁的連結文字與錨點；第一輪解析後存起來，第二輪才解析連結（才找得到「別頁的 id」）；
  const parsed = new Map<string, { refs: string[]; ids: Set<string> }>();
  // 逐頁讀檔與解析；一次只處理一頁，解析樹用完即丟，記憶體不會隨頁數累積；
  for (const rel of pages) {
    // 讀成字串；path.join 搭配展開的片段，Windows 與 Linux 都能正確組出實體路徑；
    const html = await fs.readFile(path.join(outDir, ...rel.split('/')), 'utf8');
    // 取連結與錨點；
    parsed.set(rel, extractRefs(html));
  }
  // 問題清單與去重用的鍵；
  const broken: LinkProblem[] = [];
  // 缺少的錨點；
  const missingAnchors: LinkProblem[] = [];
  // 已回報過的「頁面＋連結」，同一頁重複的同一個壞連結只列一次；
  const seen = new Set<string>();
  // 檢查過的站內連結數；
  let links = 0;
  // 逐頁解析連結；
  for (const [rel, { refs }] of parsed) {
    // 這頁的網址：basePath 加上逐段百分比編碼的檔案相對路徑；encodeURIComponent 會處理空白、#、+、%、中文；
    const pageUrl = new URL(`${basePath}/${rel.split('/').map(encodeURIComponent).join('/')}`, SITE_ORIGIN);
    // 逐條連結；
    for (const raw of refs) {
      // 解析成絕對網址；
      let url: URL;
      // try/catch：WHATWG URL 遇到無法解析的文字會丟錯；
      try {
        // 第二個參數是基準網址：相對連結以頁面所在資料夾為基準；
        url = new URL(raw, pageUrl);
      } catch {
        // 有協定的（例如 http://）解析失敗代表外部網址寫壞了，不是站內連結，略過；其餘無法解析的算壞連結；
        if (!/^\s*[a-z][a-z0-9+.-]*:/i.test(raw)) record(broken, seen, rel, raw);
        // 處理下一條；
        continue;
      }
      // 不在本站（https://、mailto:、javascript:、data:、blob:、//host 都會到這裡）就略過；
      if (url.origin !== SITE_ORIGIN) continue;
      // 這是站內連結，計數；
      links += 1;
      // 路徑解碼後的樣子，例如 /前端/日期 物件；
      let pathname = decodeLenient(url.pathname);
      // 有 basePath 時，網址必須在它底下；不在底下的絕對連結部署後會指到網站外面，算壞連結；
      if (basePath !== '') {
        // 必須剛好等於 basePath 或以 `basePath/` 開頭（所以 /Abby-notesX 不算）；
        if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
          // 記為壞連結；
          record(broken, seen, rel, raw);
          // 處理下一條；
          continue;
        }
        // 去掉前綴；剩下的是 '' 或以 / 開頭的路徑；
        pathname = pathname.slice(basePath.length);
      }
      // 去掉開頭的斜線，得到相對於輸出資料夾的路徑；
      const target = findTarget(pathname.replace(/^\//, ''), files);
      // 找不到檔案：壞連結；
      if (target === undefined) {
        // 記錄；
        record(broken, seen, rel, raw);
        // 下一條；
        continue;
      }
      // 錨點檢查（只警告）：目標必須是 html 且連結帶有非空的 #fragment；
      if (fragments && url.hash.length > 1 && /\.html$/i.test(target)) {
        // fragment 去掉 # 後解碼；
        const fragment = decodeLenient(url.hash.slice(1));
        // 空字串與 top 依 HTML 規格永遠有效（捲到頁首）；其他要在目標頁的 id 集合裡；
        if (fragment.toLowerCase() !== 'top' && !parsed.get(target)?.ids.has(fragment)) record(missingAnchors, seen, rel, raw, 'anchor');
      }
    }
  }
  // 回傳結果；
  return { broken, missingAnchors, pages: pages.length, links };
}

// 把一筆問題加進清單（同一頁同一個連結文字只記一次）；kind 用來讓壞連結與錨點警告的去重鍵不互相干擾；
function record(list: LinkProblem[], seen: Set<string>, page: string, href: string, kind: string = 'broken'): void {
  // 去重鍵：用 NUL 字元分隔，因為它不可能出現在路徑或網址裡；
  const key = `${kind}\0${page}\0${href}`;
  // 已記過就略過；
  if (seen.has(key)) return;
  // 記下鍵；
  seen.add(key);
  // 加進清單；
  list.push({ page, href });
}
