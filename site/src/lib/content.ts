// 匯入 fs 的 promise 版 API，`import * as` 把整個模組收進命名空間 fs；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，只用它的 extname／basename／join 處理檔名，relPath 與 slug 一律另外轉成正斜線；
import * as path from 'node:path';
// 匯入 gray-matter（預設匯出是函式），用來把 md 的 YAML frontmatter 與內文拆開；
import matter from 'gray-matter';
// 匯入 cheerio 的 load 函式，用來在 Node 端解析 html（語法像 jQuery）；
import { load } from 'cheerio';
// 匯入 yaml 套件的 parse，用來解析 _config.yml；
import { parse as parseYaml } from 'yaml';

// `export type` 匯出型別別名；它只在編譯期存在，後續任務用它描述一篇筆記；
export type NoteEntry = {
  // kind：檔案種類，字面值聯集型別只允許 'md' 或 'html'；
  kind: 'md' | 'html';
  // relPath：相對於筆記根目錄的路徑，一律用正斜線，保留中文、空白、#、+、括號原樣；
  relPath: string;
  // slug：relPath 去掉副檔名後依 / 切開的片段陣列，例如 ['前端', '日期 物件']；
  slug: string[];
  // title：依 frontmatter、<title>、第一個 h1、檔名的順序決定的標題；
  title: string;
  // frontmatter：md 的前言物件，html 與沒有前言的 md 固定為 {}；Record<string, unknown> 表示鍵為字串、值型別未知；
  frontmatter: Record<string, unknown>;
};

// 讀 _config.yml 的 exclude 清單；async 函式一律回傳 Promise；
export async function loadExclude(configPath: string): Promise<string[]> {
  // 讀整個設定檔成 UTF-8 字串，檔案不存在會直接丟錯，不默默當成「沒有排除」；
  const text = await fs.readFile(configPath, 'utf8');
  // 用 yaml 解析；空檔案會得到 null，所以結果型別標成 unknown 再自行檢查；
  const config: unknown = parseYaml(text);
  // 設定不是物件（例如空檔）時視為沒有 exclude；typeof null 也是 'object'，所以要多擋 null；
  if (typeof config !== 'object' || config === null) return [];
  // 以型別斷言取出 exclude 欄位；`as` 只改變型別檢查，不會改變執行期的值；
  const raw = (config as { exclude?: unknown }).exclude;
  // exclude 不是陣列（沒寫或寫錯型別）時回傳空陣列；
  if (!Array.isArray(raw)) return [];
  // filter 搭配型別守衛 (x): x is string 只留下字串項目，並讓回傳型別收斂成 string[]；
  return raw.filter((item): item is string => typeof item === 'string');
}

// 把只含 * 與 ? 的簡單萬用字元轉成正規表示式；* 不跨資料夾，? 代表單一個非斜線字元；
function globToRegExp(glob: string): RegExp {
  // 先把正規表示式的特殊字元加上反斜線跳脫，`$&` 代表「整段比對到的字元」；* 與 ? 不在跳脫清單內，留待下一步轉換；
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // 再把 * 換成 [^/]*、? 換成 [^/]，並用 ^ 與 $ 要求整串完全相符；
  return new RegExp(`^${escaped.replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
}

// 判斷一個路徑該不該被排除；relPath 是相對根目錄的正斜線路徑，isDir 表示它是資料夾；
export function isExcluded(relPath: string, isDir: boolean, patterns: string[]): boolean {
  // 取路徑最後一段當名稱；split 後 at(-1) 取最後一個元素；
  const name = relPath.split('/').at(-1) ?? relPath;
  // 底線或點開頭的檔案與資料夾一律不發布，不論設定檔怎麼寫；
  if (name.startsWith('_') || name.startsWith('.')) return true;
  // 任何深度的 node_modules 資料夾都不掃，避免走進套件；
  if (isDir && name === 'node_modules') return true;
  // 逐條檢查 _config.yml 的排除樣式，some 只要有一條符合就回傳 true；
  return patterns.some((raw) => {
    // 去掉樣式開頭的 ./ 或 /，因為 Jekyll 的樣式都是相對於根目錄；
    const pattern = raw.replace(/^\.?\//, '');
    // 空字串樣式不代表任何東西，略過；
    if (pattern === '') return false;
    // 結尾斜線代表資料夾：只排除根層、路徑完全相同的那個資料夾；
    if (pattern.endsWith('/')) return isDir && relPath === pattern.slice(0, -1);
    // 含 * 或 ? 的樣式是萬用字元；
    if (/[*?]/.test(pattern)) {
      // 樣式本身含斜線時比對整條相對路徑，否則只比對檔名（所以 *.sh 在任何深度都符合）；
      return globToRegExp(pattern).test(pattern.includes('/') ? relPath : name);
    }
    // 其餘是裸名稱：只比對根層該路徑，檔案與資料夾都算；
    return relPath === pattern;
  });
}

// 從 md 內文找第一個 h1，略過程式碼圍欄內的 #；找不到回傳 undefined；
function firstMarkdownH1(content: string): string | undefined {
  // 目前所在圍欄的標記字元（` 或 ~），不在圍欄內時為 undefined；
  let fence: string | undefined;
  // 統一換行後逐行掃描；正規表示式 /\r\n?|\n/ 同時切開 CRLF、CR、LF；
  for (const line of content.split(/\r\n?|\n/)) {
    // 偵測圍欄開頭或結尾：最多 3 個空白縮排後接 3 個以上的 ` 或 ~；
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    // 這一行是圍欄標記時切換狀態，並跳過這一行；
    if (fenceMatch) {
      // 圍欄標記的第一個字元；
      const mark = fenceMatch[1][0];
      // 不在圍欄內就進入圍欄；在圍欄內且標記字元相同就離開；標記字元不同則視為圍欄內的文字；
      if (fence === undefined) fence = mark;
      else if (fence === mark) fence = undefined;
      // 處理完圍欄標記，進下一行；
      continue;
    }
    // 在圍欄內的行都不是標題；
    if (fence !== undefined) continue;
    // ATX 標題：最多 3 個空白、一個 #、空白、文字，結尾若有「空白＋#」視為關閉符號而不算標題文字（所以 C# 的 # 會保留）；
    const h1 = /^ {0,3}#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    // 符合就回傳去掉頭尾空白的標題文字；
    if (h1) return h1[1].trim();
  }
  // 整份都沒有 h1；
  return undefined;
}

// 把可能是任意型別的值整理成「非空字串」或 undefined；用在 frontmatter 的 title；
function cleanTitle(value: unknown): string | undefined {
  // 字串與數字都接受，數字（例如 title: 2024）轉成字串；其他型別一律當作沒有標題；
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  // 空字串回傳 undefined，讓呼叫端用 ?? 接著往下一個來源找；
  return text === '' ? undefined : text;
}

// 解析一份 md：回傳 frontmatter 與標題；
function readMarkdown(raw: string, baseName: string): { frontmatter: Record<string, unknown>; title: string } {
  // 去掉檔案開頭可能的 BOM（﻿），否則 gray-matter 認不出開頭的 ---；
  const text = raw.replace(/^﻿/, '');
  // 預設沒有 frontmatter，內文就是整份檔案；
  let frontmatter: Record<string, unknown> = {};
  // 內文，後面可能被換成去掉前言的版本；
  let content = text;
  // try/catch：frontmatter 的 YAML 壞掉時 gray-matter 會丟錯，這裡接住並視為沒有前言，不讓整個建置失敗；
  try {
    // 第二個參數傳 {}：gray-matter 在沒有選項時會用「檔案內容」當快取鍵並回傳同一個物件，傳空物件可關掉快取；
    const parsed = matter(text, {});
    // data 是解析出的前言物件；
    frontmatter = parsed.data;
    // content 是去掉前言後的內文；
    content = parsed.content;
  } catch {
    // 不帶變數的 catch 區塊（可省略錯誤參數）；維持預設值即可；
  }
  // 標題依序取：前言 title、內文第一個 h1、檔名；?? 在左邊是 undefined 或 null 時才取右邊；
  const title = cleanTitle(frontmatter.title) ?? firstMarkdownH1(content) ?? baseName;
  // 回傳整理好的結果；
  return { frontmatter, title };
}

// 解析一份 html：沒有前言，標題依序取 <title>、第一個 <h1>、檔名；
function readHtml(raw: string, baseName: string): string {
  // load 把 html 字串解析成可查詢的文件物件，慣例用 $ 當名字；
  const $ = load(raw);
  // 只看 <head> 裡的 <title>，避免誤取 SVG 內的 <title>（那是圖形的提示文字）；text() 取純文字；
  const headTitle = $('head title').first().text().trim();
  // 取內文第一個 <h1> 的純文字；
  const h1 = $('h1').first().text().trim();
  // 空字串是假值，所以 || 會接著找下一個來源；
  return headTitle || h1 || baseName;
}

// 遞迴走訪資料夾，把符合的檔案累積到 out；dirRel 是目前資料夾相對根目錄的路徑（根層為空字串）；
async function walk(root: string, dirRel: string, patterns: string[], out: NoteEntry[]): Promise<void> {
  // 讀出目前資料夾的項目；withFileTypes 讓每筆是 Dirent，可直接問是不是資料夾；
  const entries = await fs.readdir(path.join(root, dirRel), { withFileTypes: true });
  // for...of 搭配 await 逐一處理，維持順序也避免同時開太多檔案；
  for (const entry of entries) {
    // 組出項目的相對路徑，一律用正斜線（不用 path.join，因為 Windows 會產生反斜線）；
    const relPath = dirRel === '' ? entry.name : `${dirRel}/${entry.name}`;
    // 資料夾：被排除就整個不走進去，否則遞迴處理；
    if (entry.isDirectory()) {
      // 被排除的資料夾直接略過；
      if (isExcluded(relPath, true, patterns)) continue;
      // 遞迴走進子資料夾；
      await walk(root, relPath, patterns, out);
      // 資料夾處理完，進下一個項目；
      continue;
    }
    // 不是一般檔案（例如符號連結）就略過；
    if (!entry.isFile()) continue;
    // 取副檔名並轉小寫，統一比對 .md 與 .html；
    const ext = path.extname(entry.name).toLowerCase();
    // 只有 .md 與 .html 會變成筆記；
    if (ext !== '.md' && ext !== '.html') continue;
    // 被排除的檔案略過；
    if (isExcluded(relPath, false, patterns)) continue;
    // 去掉副檔名的檔名，當作最後的標題備援；
    const baseName = path.basename(entry.name, path.extname(entry.name));
    // 讀檔成 UTF-8 字串；
    const raw = await fs.readFile(path.join(root, relPath), 'utf8');
    // slug 是去掉副檔名的路徑，再依 / 切成片段；
    const slug = relPath.slice(0, relPath.length - path.extname(entry.name).length).split('/');
    // md 與 html 走不同的標題規則；
    if (ext === '.md') {
      // 解析 md 取得前言與標題；
      const { frontmatter, title } = readMarkdown(raw, baseName);
      // push 把這篇筆記加進累積陣列；
      out.push({ kind: 'md', relPath, slug, title, frontmatter });
    } else {
      // html 沒有前言，frontmatter 固定為空物件；
      out.push({ kind: 'html', relPath, slug, title: readHtml(raw, baseName), frontmatter: {} });
    }
  }
}

// 掃描筆記根目錄，回傳依 relPath 排序的筆記清單；slug 重複時「不」丟錯（改名前 md／html 配對本來就同 slug），要檢查請呼叫 assertUniqueSlugs；
export async function listNotes(root: string, exclude: string[]): Promise<NoteEntry[]> {
  // 累積結果的陣列；
  const out: NoteEntry[] = [];
  // 從根層（相對路徑為空字串）開始遞迴；
  await walk(root, '', exclude, out);
  // 依 relPath 的碼點順序排序，讓每次建置的順序一致；sort 的比較函式回傳負、零、正數；
  out.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  // 回傳排序後的清單；
  return out;
}

// 檢查 slug 是否唯一；有衝突就丟出 Error，訊息列出每一組衝突與組內所有 relPath；
export function assertUniqueSlugs(notes: NoteEntry[]): void {
  // Map 以「slug 用 / 連起來的字串」為鍵，值是同 slug 的筆記路徑陣列；
  const groups = new Map<string, string[]>();
  // 逐篇筆記歸組；
  for (const note of notes) {
    // 組出鍵；
    const key = note.slug.join('/');
    // 取出既有的陣列，沒有就用空陣列；
    const list = groups.get(key) ?? [];
    // 加入這篇的路徑；
    list.push(note.relPath);
    // 寫回 Map；
    groups.set(key, list);
  }
  // 只保留路徑數大於 1 的組別，也就是有衝突的；Array.from 把 Map 轉成 [鍵, 值] 陣列；
  const conflicts = Array.from(groups).filter(([, list]) => list.length > 1);
  // 沒有衝突就正常返回；
  if (conflicts.length === 0) return;
  // 把每一組衝突寫成「slug：路徑一、路徑二」的多行文字；
  const lines = conflicts.map(([key, list]) => `  ${key}\n${list.map((p) => `    - ${p}`).join('\n')}`);
  // 丟出錯誤，訊息含衝突組數與完整清單；
  throw new Error(`發現 ${conflicts.length} 組 slug 衝突：\n${lines.join('\n')}`);
}
