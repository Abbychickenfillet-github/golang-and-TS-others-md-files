// 建置後驗證：輸出資料夾的大小；GitHub Pages 的站台上限約 1 GB（⚠️ 未查證），預設門檻 950 MB 是暫定值；
// 匯入走訪工具；
import { listOut } from './walk';

// 1 MB 的位元組數（用 1024 × 1024，也就是 MiB；與檔案總管顯示的 MB 相同算法）；
const MB = 1024 * 1024;

// 預設上限（MB）；
export const DEFAULT_LIMIT_MB = 950;

// 計算輸出資料夾的總大小；mb 是總大小（MB），ok 表示沒有超過上限（剛好等於上限算通過）；
// 預設參數 `limitMb = 950`：呼叫時省略第二個參數就用 950；
export function reportSize(outDir: string, limitMb: number = DEFAULT_LIMIT_MB): { mb: number; ok: boolean } {
  // reduce 把每個項目的大小加總（資料夾的 size 是 0）；
  const bytes = listOut(outDir).reduce((sum, entry) => sum + entry.size, 0);
  // 換算成 MB；
  const mb = bytes / MB;
  // 回傳；
  return { mb, ok: mb <= limitMb };
}

// 頂層項目（資料夾與檔案各算一項）的大小排行，由大到小取前 n 個；超過上限時用來告訴 Abby 是哪個資料夾最肥；
export function topLevelSizes(outDir: string, n: number = 5): { name: string; bytes: number }[] {
  // 名稱 → 位元組數；
  const sizes = new Map<string, number>();
  // 逐一累加；
  for (const entry of listOut(outDir)) {
    // 資料夾本身不佔大小，略過（它底下的檔案會累加進來）；
    if (entry.isDir) continue;
    // 頂層名稱是路徑第一段；split('/') 切開後取 [0]；
    const top = entry.rel.split('/')[0];
    // 累加到該頂層項目；`?? 0` 在第一次出現時從 0 開始；
    sizes.set(top, (sizes.get(top) ?? 0) + entry.size);
  }
  // 轉成陣列、由大到小排序（同大小時依名稱，確保順序確定）、取前 n 個；
  return [...sizes.entries()]
    // 把 [名稱, 大小] 轉成物件；
    .map(([name, bytes]) => ({ name, bytes }))
    // 比較函式：大的在前；
    .sort((a, b) => b.bytes - a.bytes || (a.name < b.name ? -1 : 1))
    // 只取前 n 個；
    .slice(0, n);
}
