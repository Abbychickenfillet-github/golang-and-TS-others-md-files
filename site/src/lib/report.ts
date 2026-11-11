// `import type` 只匯入型別，編譯後整行消失；
import type { SiteReport } from './site.ts';

// 歧義鍵（索引層級）的型別，與 listAmbiguousKeys 的回傳形狀相同；
type AmbiguousKey = { key: string; candidates: string[] };

// 把報告整理成人看得懂的繁體中文文字（多行）；ambiguousKeys 是索引裡的歧義鍵（沒被任何筆記連到的也列出數量）；
export function formatReport(report: SiteReport, ambiguousKeys: AmbiguousKey[] = []): string {
  // 累積輸出的每一行；
  const lines: string[] = [];
  // 標題；
  lines.push('===== 網站建置警告摘要 =====');
  // 找不到的 wikilink：依連結次數由多到少排序；Array.from 把 Map 轉成 [鍵, 值] 陣列；
  const missing = Array.from(report.missingLinks).sort((a, b) => b[1].size - a[1].size);
  // 總次數：reduce 把每個集合的大小加總；
  const missingTotal = missing.reduce((sum, [, from]) => sum + from.size, 0);
  // 小標；
  lines.push(`找不到目標的 wikilink：${missing.length} 個不同目標（共 ${missingTotal} 處，只列前 20 個；它們以純文字顯示）`);
  // 前 20 個；slice(0, 20) 取前 20 筆；
  for (const [raw, from] of missing.slice(0, 20)) lines.push(`  [[${raw}]] ×${from.size}：${Array.from(from).join('、')}`);
  // 歧義 wikilink：全部列出；
  lines.push(`有歧義的 wikilink：${report.ambiguousLinks.size} 個不同目標（全部列出；STRICT_LINKS=1 時建置會失敗）`);
  // 逐一列出候選與連結它的筆記；
  for (const [raw, { candidates, from }] of report.ambiguousLinks) {
    // 目標與次數；
    lines.push(`  [[${raw}]] ×${from.size}`);
    // 候選；
    lines.push(`    候選：${candidates.join('、')}`);
    // 連結它的筆記；
    lines.push(`    出現在：${Array.from(from).join('、')}`);
  }
  // 索引層級的歧義鍵數量；
  lines.push(`索引中的歧義鍵：${ambiguousKeys.length} 個（含沒有被任何筆記連到的）`);
  // 被蓋過的標題；
  lines.push(`被檔名蓋過的標題：${report.shadowedTitles.length} 個`);
  // 逐一列出；
  for (const s of report.shadowedTitles) lines.push(`  「${s.key}」由 ${s.winner} 取得，被蓋過：${s.shadowed.join('、')}`);
  // 被取代的舊 html；
  lines.push(`被「-互動版.html」取代而不發布的舊 html：${report.superseded.length} 個`);
  // 逐一列出；
  for (const s of report.superseded) lines.push(`  ${s.relPath} → ${s.replacedBy}`);
  // 保留名稱而不發布的筆記（R29）；
  lines.push(`網址是保留名稱而不發布的筆記：${report.reserved.length} 個（根目錄的 index 由網站首頁取代）`);
  // 逐一列出；
  for (const relPath of report.reserved) lines.push(`  ${relPath}`);
  // 大小寫衝突；
  lines.push(`只差大小寫或 Unicode 正規化的網址：${report.caseCollisions.length} 組（在 Windows／macOS 會互相覆蓋）`);
  // 逐組列出；
  for (const group of report.caseCollisions) lines.push(`  ${group.join('、')}`);
  // 找不到的圖片；
  lines.push(`找不到的圖片嵌入：${report.missingImages.size} 個`);
  // 逐一列出；
  for (const [name, from] of report.missingImages) lines.push(`  ![[${name}]]：${Array.from(from).join('、')}`);
  // 同名圖片；
  lines.push(`同名圖片不只一張（已挑一張）：${report.ambiguousImages.size} 個`);
  // 逐一列出；
  for (const [name, candidates] of report.ambiguousImages) lines.push(`  ${name}：${candidates.join('、')}`);
  // 被引用的圖片數；
  lines.push(`被引用的圖片：${report.images.size} 張`);
  // 用換行接起來；
  return lines.join('\n');
}

// STRICT_LINKS=1 且有任何歧義 wikilink 時丟錯；env 預設是 process.env，測試可傳假物件；
export function assertStrictLinks(report: SiteReport, env: Record<string, string | undefined> = process.env): void {
  // 沒開嚴格模式或沒有歧義就正常返回；
  if (env.STRICT_LINKS !== '1' || report.ambiguousLinks.size === 0) return;
  // 丟錯；訊息含數量，完整清單已在摘要裡；
  throw new Error(`STRICT_LINKS=1：有 ${report.ambiguousLinks.size} 個有歧義的 wikilink，請在連結裡加上資料夾前綴或改名（清單見上方摘要）`);
}

// 把報告轉成可寫成 JSON 的純物件（Map 與 Set 轉成陣列或物件）；
export function reportToJson(report: SiteReport): Record<string, unknown> {
  // Object.fromEntries 把 [鍵, 值] 陣列轉成物件；
  const setMap = (m: Map<string, Set<string>>) => Object.fromEntries(Array.from(m, ([k, v]) => [k, Array.from(v)]));
  // 逐欄轉換；
  return {
    superseded: report.superseded, // 已是純陣列，原樣放；
    reserved: report.reserved, // 字串陣列，原樣放；
    caseCollisions: report.caseCollisions, // 陣列的陣列，原樣放；
    shadowedTitles: report.shadowedTitles, // 物件陣列，原樣放；
    missingLinks: setMap(report.missingLinks), // Map<字串, Set> 轉成 { 內文: [筆記…] }；
    ambiguousLinks: Object.fromEntries(Array.from(report.ambiguousLinks, ([k, v]) => [k, { candidates: v.candidates, from: Array.from(v.from) }])), // Array.from 的第二個參數是對每筆做轉換的函式；
    missingImages: setMap(report.missingImages), // 同 missingLinks；
    ambiguousImages: Object.fromEntries(report.ambiguousImages), // Map<字串, 陣列> 直接轉物件；
    images: Array.from(report.images).sort(), // Set 轉陣列並排序，讓輸出穩定；
  };
}
