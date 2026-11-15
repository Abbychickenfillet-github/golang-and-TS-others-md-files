// 檢查點腳本：拿真實筆記庫試跑 renderMarkdown，回報渲染數、丟錯數、耗時、殘留語法與 callout／嵌入數；用法：在 site/ 底下執行 `node scripts/render-sample.mjs`；
// 匯入 fs 的 promise 版 API，用來讀每篇筆記的原始文字；
import * as fs from 'node:fs/promises';
// 匯入 path 模組，用來把相對路徑解析成絕對路徑；
import * as path from 'node:path';
// 匯入 module 的 register：註冊上面那支 hook，讓 .ts 檔裡不寫副檔名的相對匯入也能被 Node 解析；
import { register } from 'node:module';

// 註冊 hook；第二個參數是基準網址，讓相對路徑從本檔所在資料夾算起；
register('./ts-resolve-hook.mjs', import.meta.url);
// 註冊之後才能動態匯入 .ts（靜態 import 會在 register 之前就被解析，所以這裡改用 await import）；頂層 await 是 ES 模組才有的語法；
const { listNotes, loadExclude } = await import('../src/lib/content.ts');
// 匯入 wikilink 索引建立函式；
const { buildWikilinkIndex } = await import('../src/lib/wikilink.ts');
// 匯入被檢查的對象；
const { renderMarkdown } = await import('../src/lib/markdown.ts');

// 筆記根目錄：優先讀環境變數 NOTES_ROOT，沒有就用上一層（repo 根目錄）；`??` 只在左邊是 undefined 或 null 時才取右邊；
const root = path.resolve(process.env.NOTES_ROOT ?? '..');
// 排除清單取自根目錄的 _config.yml，不另寫一份；
const exclude = await loadExclude(path.join(root, '_config.yml'));
// 掃描整個筆記庫，只留 md（html 不經過這條管線）；filter 保留符合條件的元素；
const notes = (await listNotes(root, exclude)).filter((n) => n.kind === 'md');
// 索引要用「全部」筆記（含 html）建，才與正式建置一致；所以另外再掃一次全部；
const index = buildWikilinkIndex(await listNotes(root, exclude));
// 印出基本資訊；
console.log(`root: ${root}`);
// 印出要渲染的篇數；
console.log(`md notes: ${notes.length}`);

// 計數器：onMissing 與 onAmbiguous 的次數、被引用的圖片集合；
const counts = { missing: 0, ambiguous: 0 };
// 圖片檔名集合：Set 自動去重；
const images = new Set();
// 圖片嵌入總次數；
let embedCount = 0;
// callout 總數；
let calloutCount = 0;
// 丟錯的紀錄；
const errors = [];
// 每篇的輸出：relPath → html，留給後面的抽樣檢查；
const outputs = new Map();
// 每篇的 onMissing 內文：relPath → 字串陣列，用來分辨「找不到而保留的 [[…]]」與「真正的殘留」；
const missingByNote = new Map();
// 記錄開始時間；performance.now() 是毫秒級的高精度時間；
const started = performance.now();
// 逐篇渲染；
for (const note of notes) {
  // 這篇的 onMissing 內文清單；
  const missingHere = [];
  // 讀原始文字；
  const source = await fs.readFile(path.join(root, note.relPath), 'utf8');
  // try/catch：單篇丟錯不中斷整個檢查；
  try {
    // 渲染；onImage 記錄被引用的圖並回傳輸出路徑；
    const out = await renderMarkdown(source, {
      // 索引；
      index,
      // 找不到的 wikilink：累加並記下內文；
      onMissing: (raw) => {
        // 總數加一；
        counts.missing += 1;
        // 記到這篇；
        missingHere.push(raw);
      },
      // 有歧義的 wikilink：累加並同樣記下（它們也保留原文）；
      onAmbiguous: (raw) => {
        // 總數加一；
        counts.ambiguous += 1;
        // 記到這篇；
        missingHere.push(raw);
      },
      // 圖片嵌入：記錄並回傳 /img/ 加檔名；
      onImage: (name) => {
        // 嵌入次數加一；
        embedCount += 1;
        // 加入集合；
        images.add(name);
        // 回傳輸出路徑；
        return `/img/${name}`;
      },
    });
    // 保存輸出；
    outputs.set(note.relPath, out.html);
    // 保存這篇的 missing 清單；
    missingByNote.set(note.relPath, missingHere);
    // 數這篇的 callout：每個 callout 外層 div 都有 data-callout 屬性；`match` 搭配 g 旗標回傳所有比對，沒有則為 null；
    calloutCount += (out.html.match(/<div class="callout callout-/g) ?? []).length;
  } catch (error) {
    // 記下路徑與錯誤訊息；
    errors.push({ relPath: note.relPath, message: error instanceof Error ? error.message : String(error) });
  }
}
// 總耗時（毫秒）；
const elapsed = performance.now() - started;
// 印出 (a) 渲染結果；
console.log(`\n(a) rendered=${outputs.size} threw=${errors.length} time=${elapsed.toFixed(0)}ms`);
// 印出前 5 個錯誤；slice 取前 5 個；
for (const e of errors.slice(0, 5)) console.log(`  ERROR ${e.relPath}: ${e.message}`);

// 移除輸出裡的程式碼區域（pre、code、script、style 內的字都不算「殘留」）；[\s\S]*? 是跨行最短比對；
const stripCode = (html) => html.replace(/<(pre|code|script|style)\b[\s\S]*?<\/\1>/gi, '');
// 計算一份輸出的殘留：回傳 { wiki, embed, mark } 三個計數；wiki 會扣掉「找不到而保留原文」的 wikilink（那是預期內的）；
const residue = (relPath) => {
  // 取輸出並去掉程式碼；
  const text = stripCode(outputs.get(relPath));
  // `![[` 的個數（非圖片嵌入保留原文，所以會出現）；
  const embed = (text.match(/!\[\[/g) ?? []).length;
  // `[[` 的個數，扣掉 `![[` 的那些；
  const wikiAll = (text.match(/\[\[/g) ?? []).length - embed;
  // 預期保留的（找不到或歧義）個數；
  const expected = (missingByNote.get(relPath) ?? []).length;
  // 恰好兩個等號的個數：`(?<!=)` 與 `(?!=)` 排除 === 與 ====（那是比較運算子或分隔裝飾，不是螢光筆記號）；
  const mark = (text.match(/(?<!=)==(?!=)/g) ?? []).length;
  // 回傳三項；wiki 不會小於 0；
  return { wiki: Math.max(0, wikiAll - expected), wikiAll, embed, mark };
};

// 決定性的「偽隨機」抽樣：依 relPath 排序後，取均勻分布的 5 個位置，每次跑結果都相同；
const sorted = [...outputs.keys()].sort();
// 要抽的篇數；
const pick = Math.min(5, sorted.length);
// 抽出 relPath；Array.from 搭配對應函式產生陣列，Math.floor 取整；
const sample = Array.from({ length: pick }, (_, i) => sorted[Math.floor(((i + 0.5) * sorted.length) / pick)]);
// 印出標題；
console.log('\n(b) 5 deterministic samples (residue counts outside code; wiki excludes expected missing/ambiguous):');
// 逐篇印出；
for (const relPath of sample) {
  // 計算殘留；
  const r = residue(relPath);
  // 印出；
  console.log(`  ${relPath}: unexpected[[=${r.wiki} (all[[=${r.wikiAll}, missing/ambiguous=${(missingByNote.get(relPath) ?? []).length}) ![[=${r.embed} ==:${r.mark}`);
}

// 全庫殘留彙總：逐篇累加，並列出殘留最多的前 10 篇；
const totals = { wiki: 0, embed: 0, mark: 0 };
// 每篇殘留的清單；
const perNote = [];
// 逐篇計算；
for (const relPath of outputs.keys()) {
  // 殘留；
  const r = residue(relPath);
  // 累加；
  totals.wiki += r.wiki;
  // 累加非圖片嵌入；
  totals.embed += r.embed;
  // 累加 ==；
  totals.mark += r.mark;
  // 有任何殘留就列入；
  if (r.wiki + r.embed + r.mark > 0) perNote.push({ relPath, ...r });
}
// 印出全庫彙總；
console.log(`\nvault-wide residue outside code: unexpected [[=${totals.wiki}  ![[=${totals.embed}  ==:${totals.mark}  (notes with any residue: ${perNote.length})`);
// 印出 missing 與 ambiguous 的總次數；
console.log(`wikilink kept as text: missing=${counts.missing} ambiguous=${counts.ambiguous}`);
// 殘留最多的前 10 篇，sort 依三項合計由大到小；
for (const p of perNote.sort((a, b) => b.wiki + b.embed + b.mark - (a.wiki + a.embed + a.mark)).slice(0, 10)) {
  // 印出；
  console.log(`  ${p.relPath}: [[=${p.wiki} ![[=${p.embed} ==:${p.mark}`);
}

// 印出殘留的上下文片段，方便人工判斷是 bug 還是合理的純文字；最多印 25 筆；
console.log('\nresidue snippets (first 25):');
// 已印筆數；
let printed = 0;
// 逐篇找；
for (const p of perNote) {
  // 去掉程式碼後的輸出；
  const text = stripCode(outputs.get(p.relPath));
  // 三種殘留的正規表示式：`![[`、非嵌入的 `[[`、恰好兩個等號；
  for (const re of [/!\[\[/g, /(?<!!)\[\[/g, /(?<!=)==(?!=)/g]) {
    // 逐一比對；
    for (const m of text.matchAll(re)) {
      // 超過 25 筆就停；
      if (printed >= 25) break;
      // 往前後各取 30 個字元，並把換行換成 ⏎ 讓一筆只佔一行；
      const snippet = text.slice(Math.max(0, m.index - 30), m.index + 50).replace(/\n/g, '⏎');
      // 「找不到而保留」的 [[ 是預期內的，不印；用 missingByNote 判斷這篇有沒有 missing 並粗略略過；
      if (re.source.includes('\\[\\[') && !re.source.startsWith('!') && (missingByNote.get(p.relPath) ?? []).some((raw) => snippet.includes(raw.slice(0, 8)))) continue;
      // 印出；
      console.log(`  ${p.relPath} :: ${snippet}`);
      // 計數；
      printed += 1;
    }
  }
}

// (c) 全庫 callout 與嵌入數；
console.log(`\n(c) callouts=${calloutCount} image embeds=${embedCount} (distinct image names=${images.size})`);

// (d) 螢光筆：沒有任何屬性的 <mark> 就是 ==字== 轉出來的（手寫的 <mark> 都帶 style 或 class）；列出最長的 5 筆，檢查有沒有「配對配錯、吃掉一大段」的情形；
const highlights = [];
// 逐篇收集；
for (const [relPath, out] of outputs) {
  // 比對 <mark> 與 </mark> 之間的內容（不含巢狀同名標籤，足夠用於抽查）；
  for (const m of out.matchAll(/<mark>([\s\S]*?)<\/mark>/g)) highlights.push({ relPath, text: m[1] });
}
// 印出總數；
console.log(`\n(d) ==highlight== rendered=${highlights.length}`);
// 依長度由大到小，前 5 筆；
for (const h of highlights.sort((a, b) => b.text.length - a.text.length).slice(0, 5)) {
  // 印出長度、來源與前 80 字；
  console.log(`  len=${h.text.length} ${h.relPath} :: ${h.text.slice(0, 80).replace(/\n/g, '⏎')}`);
}
