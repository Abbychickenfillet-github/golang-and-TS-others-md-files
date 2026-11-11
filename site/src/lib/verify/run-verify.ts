// 建置後驗證的總流程（R32 的政策）：把「私人檔案外洩、敏感檔名、大小、壞連結與錨點」四項檢查串起來，決定結束碼並產生要印的文字；
// 一律失敗：私人檔案外洩、敏感檔名、輸出超過大小上限；
// 只有 STRICT_LINKS=1 才失敗：壞連結（真實 repo 已知有歷史壞連結，不能擋住第一次部署），否則只印前 30 筆並把完整清單寫進報告檔；
// 永遠只警告：缺少的錨點（#fragment）；
// 本檔不讀環境變數也不呼叫 process.exit，方便測試；環境變數與輸出由 scripts/verify.mjs 處理；
// 匯入 fs 的 promise 版 API，寫報告檔；
import * as fs from 'node:fs/promises';
// 匯入三個檢查；
import { checkLinks } from './check-links';
// 匯入外洩與敏感檔名檢查；
import { assertNoPrivate, assertNoSensitive, findPrivateLeaks, findSensitive } from './assert-no-private';
// 匯入大小檢查；
import { reportSize, topLevelSizes } from './report-size';
// 匯入走訪工具，用來先確認輸出資料夾存在並統計檔案數；
import { listOut } from './walk';
// 匯入型別；
import type { LinkProblem } from './check-links';

// 執行選項；
export type VerifyOptions = {
  // 輸出資料夾（絕對路徑）；
  outDir: string;
  // _config.yml 的 exclude 清單；
  exclude: string[];
  // 網站的 basePath；
  basePath: string;
  // 大小上限（MB）；
  limitMb: number;
  // STRICT_LINKS=1：壞連結視為失敗；
  strictLinks: boolean;
  // 是否檢查錨點；
  fragments: boolean;
  // 完整報告檔的寫入路徑；
  reportPath: string;
};

// 結果：stdout 與 stderr 是要印的行；exitCode 是 0（通過）或 1（失敗）；
export type VerifyResult = { exitCode: 0 | 1; stdout: string[]; stderr: string[] };

// 畫面上最多列出的壞連結數；
const SHOW_BROKEN = 30;
// 畫面上最多列出的缺錨點數；
const SHOW_ANCHORS = 10;
// 使用量達上限的這個比例以上就印出頂層資料夾大小；
const NEAR_RATIO = 0.8;

// 把錯誤物件轉成訊息文字；`instanceof` 判斷它是不是 Error；
function messageOf(error: unknown): string {
  // Error 取 message，其他轉成字串；
  return error instanceof Error ? error.message : String(error);
}

// 把問題清單依頁面分組成多行文字（清單已按頁面順序排好，相鄰同頁的併在一起）；
function groupByPage(problems: LinkProblem[]): string[] {
  // 輸出行；
  const lines: string[] = [];
  // 目前所在頁面；
  let current: string | undefined;
  // 逐筆處理；
  for (const problem of problems) {
    // 換頁了就印頁面標題；
    if (problem.page !== current) {
      // 記下目前頁面；
      current = problem.page;
      // 頁面一行；
      lines.push(`  ${problem.page}`);
    }
    // 連結縮排兩層；
    lines.push(`    ${problem.href}`);
  }
  // 回傳；
  return lines;
}

// 執行全部檢查；每一項都會跑完再決定結束碼，這樣 Abby 一次就看得到所有問題；
export async function runVerify(opts: VerifyOptions): Promise<VerifyResult> {
  // 標準輸出的行；
  const stdout: string[] = [];
  // 失敗原因（印到標準錯誤，且只要非空結束碼就是 1）；
  const failures: string[] = [];
  // 記下開始時間，最後印出耗時；
  const started = Date.now();
  // 先確認輸出資料夾存在，並統計項目數；不存在就是建置沒產出，直接失敗；
  let fileCount = 0;
  // try/catch 接住「資料夾不存在」；
  try {
    // 只算檔案；
    fileCount = listOut(opts.outDir).filter((e) => !e.isDir).length;
  } catch (error) {
    // 無法繼續，回報後結束；
    return { exitCode: 1, stdout, stderr: [`verify 失敗：找不到輸出資料夾 ${opts.outDir}（${messageOf(error)}），請先執行 npm run build`] };
  }
  // 開頭資訊；
  stdout.push(`verify：檢查 ${opts.outDir}（${fileCount} 個檔案，basePath「${opts.basePath}」）`);
  // 報告檔要寫的資料；
  const report: Record<string, unknown> = { outDir: opts.outDir, basePath: opts.basePath, strictLinks: opts.strictLinks, fragments: opts.fragments };

  // ===== 1. 私人檔案外洩（一律失敗）=====
  // 排除清單是空的時警告：這代表 _config.yml 沒有 exclude，只剩底線與點開頭的規則在把關；
  if (opts.exclude.length === 0) stdout.push('警告：_config.yml 沒有 exclude 項目，私人檔案檢查只剩底線與點開頭的規則');
  // 接住不支援的樣式等錯誤，一律當成失敗（失敗即關閉）；
  try {
    // 有外洩就丟錯；
    assertNoPrivate(opts.outDir, opts.exclude);
    // 通過；
    stdout.push(`私人檔案：通過（${opts.exclude.length} 條排除樣式，比對不分大小寫）`);
    // 報告；
    report.privateLeaks = [];
  } catch (error) {
    // 失敗原因；
    failures.push(messageOf(error));
    // 報告只放路徑清單，不放內容；
    try {
      // 重新取得清單；
      report.privateLeaks = findPrivateLeaks(opts.outDir, opts.exclude);
    } catch {
      // 樣式本身有問題時沒有清單；
      report.privateLeaks = null;
    }
  }

  // ===== 2. 敏感檔名（一律失敗）=====
  // 接住錯誤；
  try {
    // 有敏感檔名就丟錯；
    assertNoSensitive(opts.outDir);
    // 通過；
    stdout.push('敏感檔名：通過');
    // 報告；
    report.sensitive = [];
  } catch (error) {
    // 失敗原因（只含路徑）；
    failures.push(messageOf(error));
    // 報告；
    report.sensitive = findSensitive(opts.outDir);
  }

  // ===== 3. 大小（超過上限一律失敗）=====
  // 計算大小；
  const size = reportSize(opts.outDir, opts.limitMb);
  // 摘要行；
  stdout.push(`大小：${size.mb.toFixed(2)} MB／上限 ${opts.limitMb} MB（${size.ok ? '通過' : '超過上限'}）`);
  // 報告；
  report.size = { mb: size.mb, limitMb: opts.limitMb, ok: size.ok };
  // 接近或超過上限時列出最大的 5 個頂層項目；
  if (!size.ok || size.mb >= opts.limitMb * NEAR_RATIO) {
    // 標題；
    stdout.push('最大的頂層項目：');
    // 逐項列出；
    for (const top of topLevelSizes(opts.outDir, 5)) stdout.push(`  ${top.name}  ${(top.bytes / (1024 * 1024)).toFixed(2)} MB`);
  }
  // 超過上限就失敗；
  if (!size.ok) failures.push(`輸出 ${size.mb.toFixed(2)} MB 超過上限 ${opts.limitMb} MB（GitHub Pages 站台上限約 1 GB，⚠️ 未查證）`);

  // ===== 4. 站內連結與錨點 =====
  // 接住檢查本身的錯誤；
  try {
    // 執行；
    const links = await checkLinks(opts.outDir, { basePath: opts.basePath, fragments: opts.fragments });
    // 摘要行；
    stdout.push(`連結：掃描 ${links.pages} 頁、檢查 ${links.links} 個站內連結，壞連結 ${links.broken.length} 個，缺少的錨點 ${links.missingAnchors.length} 個${opts.fragments ? '' : '（已關閉錨點檢查）'}`);
    // 報告（完整清單）；
    report.pages = links.pages;
    // 檢查的連結數；
    report.links = links.links;
    // 壞連結完整清單；
    report.broken = links.broken;
    // 缺少的錨點完整清單；
    report.missingAnchors = links.missingAnchors;
    // 有壞連結時列出前 30 筆；
    if (links.broken.length > 0) {
      // 標題；
      stdout.push(`壞連結（前 ${Math.min(SHOW_BROKEN, links.broken.length)} 筆，依頁面分組；完整清單在 ${opts.reportPath}）：`);
      // 分組列出；
      stdout.push(...groupByPage(links.broken.slice(0, SHOW_BROKEN)));
      // 還有更多時提示；
      if (links.broken.length > SHOW_BROKEN) stdout.push(`  …另有 ${links.broken.length - SHOW_BROKEN} 筆`);
      // 嚴格模式：失敗；否則只提示；
      if (opts.strictLinks) failures.push(`有 ${links.broken.length} 個壞連結，STRICT_LINKS=1 因此視為失敗`);
      else stdout.push('壞連結只是警告（未設 STRICT_LINKS=1，不會讓 verify 失敗）');
    }
    // 有缺錨點時列出前 10 筆；
    if (links.missingAnchors.length > 0) {
      // 標題與說明：html 筆記的標題 id 有些是 notes.js 在瀏覽器執行時才加的，所以可能有誤報；
      stdout.push(`缺少的錨點（警告，永遠不會讓 verify 失敗；前 ${Math.min(SHOW_ANCHORS, links.missingAnchors.length)} 筆；html 筆記的標題 id 有些由 notes.js 在瀏覽器執行時才產生，可能是誤報）：`);
      // 分組列出；
      stdout.push(...groupByPage(links.missingAnchors.slice(0, SHOW_ANCHORS)));
      // 還有更多時提示；
      if (links.missingAnchors.length > SHOW_ANCHORS) stdout.push(`  …另有 ${links.missingAnchors.length - SHOW_ANCHORS} 筆`);
    }
  } catch (error) {
    // 連結檢查本身壞掉不能當成通過；
    failures.push(`連結檢查失敗：${messageOf(error)}`);
  }

  // ===== 報告檔 =====
  // 寫完整報告；寫不出來只警告，不影響結果；
  try {
    // JSON.stringify 的第三個參數 2 是縮排空格數；
    await fs.writeFile(opts.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // 印出位置；
    stdout.push(`完整報告：${opts.reportPath}`);
  } catch (error) {
    // 警告；
    stdout.push(`警告：無法寫入報告檔 ${opts.reportPath}（${messageOf(error)}）`);
  }
  // 耗時；
  stdout.push(`verify：耗時 ${((Date.now() - started) / 1000).toFixed(1)} 秒，${failures.length === 0 ? '全部通過' : `失敗 ${failures.length} 項`}`);
  // 失敗原因；
  const stderr = failures.length === 0 ? [] : ['verify 失敗：', ...failures];
  // 回傳；
  return { exitCode: failures.length === 0 ? 0 : 1, stdout, stderr };
}
