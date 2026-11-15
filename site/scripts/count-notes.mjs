// 匯入 path 模組，用來把相對路徑解析成絕對路徑；
import * as path from 'node:path';
// 匯入 content.ts 的函式；Node 24 內建「型別剝除」，可直接匯入 .ts 檔，所以副檔名要寫完整；
import { listNotes, loadExclude } from '../src/lib/content.ts';

// 筆記根目錄：優先讀環境變數 NOTES_ROOT，沒有就用上一層（repo 根目錄）；`??` 只在左邊是 undefined 或 null 時才取右邊；
const root = path.resolve(process.env.NOTES_ROOT ?? '..');
// 排除清單取自根目錄的 _config.yml，不另寫一份；
const exclude = await loadExclude(path.join(root, '_config.yml'));
// 掃描整個筆記庫；頂層 await 是 ES 模組才有的語法；
const notes = await listNotes(root, exclude);

// 以「slug 用 / 連起來」為鍵統計每個 slug 出現幾次；Map 的鍵可以是任何值，這裡是字串；
const counts = new Map();
// 逐篇筆記累加次數；
for (const note of notes) {
  // 組出鍵；
  const key = note.slug.join('/');
  // 取舊次數（沒有就 0）加一後寫回；
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
// 次數大於 1 的 slug 就是衝突組；Array.from 把 Map 轉成陣列再 filter；
const conflicts = Array.from(counts).filter(([, n]) => n > 1);

// 印出筆記根目錄，方便確認掃的是哪裡；
console.log(`root: ${root}`);
// 印出總數；
console.log(`total: ${notes.length}`);
// 印出 .md 數量；
console.log(`md: ${notes.filter((n) => n.kind === 'md').length}`);
// 印出 .html 數量；
console.log(`html: ${notes.filter((n) => n.kind === 'html').length}`);
// 印出 slug 衝突組數；
console.log(`slug conflicts: ${conflicts.length}`);
