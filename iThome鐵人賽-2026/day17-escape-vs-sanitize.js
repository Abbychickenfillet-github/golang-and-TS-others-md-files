/**
 * Day 17：轉義（escape）vs 淨化（sanitize）
 * 對應文章：Day17-框架資安差異-XSS-CSRF-權限-稽核.md
 * 執行：node day17-escape-vs-sanitize.js
 *   Part 1 純 JavaScript 即可跑
 *   Part 2 需要先 npm install isomorphic-dompurify
 */

// ── Part 1：轉義（escape）─── 純 JavaScript，不需要任何套件 ───────
// 白話講：把 HTML 的特殊字元換成實體編碼，讓瀏覽器當文字看而不是當標籤看
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const payloads = [
  ['<b>重要</b>公告',                        '使用者想要粗體'],
  ['<script>alert(1)</script>',              '明顯的攻擊'],
  ['<img src=x onerror=alert(1)>',           '靠事件屬性攻擊'],
  ['<a href="javascript:alert(1)">連結</a>', '靠 URL 協定攻擊'],
];

console.log('=== Part 1：轉義的結果（模擬 React / Vue 的預設行為）===\n');
for (const [input, note] of payloads) {
  console.log(`情境：${note}`);
  console.log(`  原始：${input}`);
  console.log(`  轉義：${escapeHtml(input)}`);
  console.log('  → 不會執行，但如果使用者本來就想要格式，格式也一起被殺掉了\n');
}

// ── Part 2：淨化（sanitize）─── 需要 npm install isomorphic-dompurify ──
// 白話講：真的解析這段 HTML，把危險的標籤與屬性挑掉，保留安全的部分
let DOMPurify;
try {
  DOMPurify = require('isomorphic-dompurify');
} catch (e) {
  console.log('=== Part 2 略過 ===');
  console.log('  要跑這一段請先執行：npm install isomorphic-dompurify\n');
  process.exit(0);
}

console.log('=== Part 2：轉義 vs 淨化 對照 ===\n');
console.log('輸入'.padEnd(42), '| 淨化後的結果');
console.log('-'.repeat(80));
for (const [input] of payloads) {
  console.log(input.padEnd(40), '|', DOMPurify.sanitize(input) || '（整段被移除）');
}

console.log(`
  觀察三件事：
    a. <b> 被保留了       → 淨化不會破壞使用者想要的格式
    b. <script> 整段消失   → 危險標籤直接移除
    c. <img> 留著但 onerror 不見了
       → 這是淨化最關鍵的特徵：它只切掉危險的屬性，不是把整個標籤殺掉
`);
