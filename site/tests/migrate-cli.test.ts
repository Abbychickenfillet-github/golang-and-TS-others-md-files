// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔要建暫存 git 倉庫並 spawn 子行程，不需要 jsdom，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言、beforeEach／afterEach 掛鉤；
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// 匯入 fs 的同步 API：建資料夾、寫檔、讀檔、清除；
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// 匯入 os 的 tmpdir 取得系統暫存資料夾；
import { tmpdir } from 'node:os';
// 匯入 path 模組組路徑；
import * as path from 'node:path';
// 匯入 child_process：execFileSync 執行 git、spawnSync 執行 CLI 並取得結束碼與輸出；
import { execFileSync, spawnSync } from 'node:child_process';

// CLI 腳本的絕對路徑；vitest 從 site/ 執行；
const cli = path.resolve(process.cwd(), 'scripts', 'migrate-html-notes.mjs');
// 暫存倉庫根目錄，每個測試各自建立；
let root = '';

// 在倉庫內執行 git 並回傳輸出；
const git = (...args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// 寫檔工具：建好上層資料夾再寫；內容可以是字串或 Buffer；
function put(rel: string, content: string | Buffer): void {
  // 絕對路徑；
  const abs = path.join(root, ...rel.split('/'));
  // 建資料夾（recursive 已存在不會丟錯）；
  mkdirSync(path.dirname(abs), { recursive: true });
  // 寫檔；
  writeFileSync(abs, content);
}

// 讀檔成 Buffer；
const read = (rel: string): Buffer => readFileSync(path.join(root, ...rel.split('/')));

// 一份有共用規則 `.card` 與獨有規則 `.mine` 的筆記；
const note = (eol = '\n'): string =>
  ['<!DOCTYPE html>', '<html lang="zh-TW">', '<head>', '<meta charset="utf-8">', '<title>t</title>', '<style>', '.card{a:b}', '.mine{c:d}', '</style>', '</head>', '<body>', '<p>x</p>', '</body>', '</html>', ''].join(eol);

// 執行 CLI：回傳結束碼與合併的輸出；root 預設為暫存倉庫；
function run(...args: string[]): { code: number; out: string } {
  // spawnSync 不會因非零結束碼丟錯；cwd 設成 site/，與實際使用一致；
  const result = spawnSync(process.execPath, [cli, '--root', root, ...args], { cwd: process.cwd(), encoding: 'utf8' });
  // 回傳；
  return { code: result.status ?? -1, out: `${result.stdout}${result.stderr}` };
}

// 每個測試前建一個全新的 git 倉庫，內含共用樣式、排除設定與幾份筆記，並 commit；
beforeEach(() => {
  // 建暫存資料夾；
  root = mkdtempSync(path.join(tmpdir(), 'migrate-cli-'));
  // 初始化倉庫並設定身分（避免環境沒設定而 commit 失敗）；
  git('init', '-q');
  git('config', 'user.name', 'tester');
  git('config', 'user.email', 'tester@example.com');
  git('config', 'core.autocrlf', 'false');
  // 排除設定與共用樣式（note-theme.css 有 .card 與 --bg，notes.css 有 .toc）；
  put('_config.yml', 'exclude:\n  - private/\n');
  put('assets/note-theme.css', ':root{--bg:#fff}\n.card{a:b}\n');
  put('assets/notes.css', '.toc{a:b}\n');
  // 三份已發布的 html、一份被排除的 html、一份 md；
  put('a/one.html', note());
  put('a/two.html', note());
  put('top.html', note('\r\n'));
  put('private/secret.html', note());
  put('a/readme.md', '# hi\n');
  // 全部加入並 commit；
  git('add', '-A');
  git('commit', '-q', '-m', 'init');
});

// 每個測試後清掉暫存資料夾；
afterEach(() => {
  // force 讓不存在時不丟錯；
  rmSync(root, { recursive: true, force: true });
});

// 第二個參數的 timeout：每個測試要 spawn node 並載入 TS 模組，整套平行執行時較慢，放寬到 60 秒；
const T = 60_000;

// 一組：預設 dry-run；
describe('migrate-html-notes：dry-run', () => {
  // 預設不改任何檔案；
  it('預設 dry-run：不寫檔、列出每個檔案與摘要', () => {
    // 執行；
    const { code, out } = run();
    // 成功；
    expect(code).toBe(0);
    // 輸出含 dry-run 說明、每份已發布 html 的行、摘要；
    expect(out).toMatch(/dry-run/);
    expect(out).toContain('a/one.html');
    expect(out).toContain('a/two.html');
    expect(out).toContain('top.html');
    // 被排除的檔案不出現；
    expect(out).not.toContain('private/secret.html');
    // 工作目錄仍然乾淨；
    expect(git('status', '--porcelain')).toBe('');
  }, T);

  // 每個檔案的行格式；
  it('每行顯示 style 位元組變化、移除規則數、新增連結與腳本', () => {
    // 執行；
    const { out } = run('--only', 'a/one.html');
    // 行內容；
    expect(out).toMatch(/a\/one\.html: style \d+→\d+ bytes, rules removed 1, \+2 links, \+2 scripts/);
  }, T);
});

// 二組：--apply；
describe('migrate-html-notes：--apply', () => {
  // 髒的工作目錄拒絕套用；
  it('工作目錄不乾淨時拒絕 --apply，且不改任何檔案', () => {
    // 弄髒：多一個未追蹤檔案；
    put('stray.txt', 'x');
    // 執行；
    const { code, out } = run('--apply');
    // 失敗並說明；
    expect(code).not.toBe(0);
    expect(out).toMatch(/工作目錄不乾淨/);
    // 筆記沒被動；
    expect(read('a/one.html').toString('utf8')).toBe(note());
  }, T);

  // .superpowers 資料夾（工作紀錄）不算髒，但只有「整段路徑第一段」剛好是 .superpowers 才豁免，名稱只是以它開頭的不行；
  it('.superpowers 資料夾不算髒，.superpowers-extra 這種只是同前綴的算髒', () => {
    // 未追蹤的 .superpowers/ 底下有檔案：豁免，可以套用；
    put('.superpowers/log.txt', 'x');
    expect(run('--apply', '--only', 'top.html').code).toBe(0);
    // 還原剛才的套用（讓工作目錄回到只有 .superpowers 的狀態）；
    git('checkout', '--', 'top.html');
    // 名稱只是以 .superpowers 開頭的未追蹤檔案：不豁免；
    put('.superpowers-extra.txt', 'x');
    const refused = run('--apply', '--only', 'top.html');
    expect(refused.code).not.toBe(0);
    expect(refused.out).toMatch(/工作目錄不乾淨/);
  }, T);

  // 套用後內容改變、保留 CRLF，被排除與 md 檔不動；
  it('--apply 寫入遷移結果，保留 CRLF，不動被排除的檔案與 md', () => {
    // 執行；
    const { code } = run('--apply');
    // 成功；
    expect(code).toBe(0);
    // 一般檔案已改：有主題連結、共用規則不見；
    const one = read('a/one.html').toString('utf8');
    expect(one).toContain('<link rel="stylesheet" href="../assets/note-theme.css">');
    expect(one).not.toContain('.card{a:b}');
    expect(one).toContain('.mine{c:d}');
    // 根目錄的 CRLF 檔案：相對路徑是 assets/，且沒有單獨的 LF；
    const top = read('top.html').toString('utf8');
    expect(top).toContain('<link rel="stylesheet" href="assets/note-theme.css">');
    expect(/(?<!\r)\n/.test(top)).toBe(false);
    // 被排除的與 md 不動；
    expect(read('private/secret.html').toString('utf8')).toBe(note());
    expect(read('a/readme.md').toString('utf8')).toBe('# hi\n');
  }, T);

  // BOM 保留；
  it('保留 BOM 位元組', () => {
    // 覆寫一份帶 BOM 的筆記並 commit；
    put('bom.html', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(note(), 'utf8')]));
    git('add', '-A');
    git('commit', '-q', '-m', 'bom');
    // 套用；
    run('--apply', '--only', 'bom.html');
    // 前三個位元組仍是 BOM，且只有一組；
    const bytes = read('bom.html');
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.subarray(3, 6).toString('utf8')).not.toBe(String.fromCharCode(0xfeff));
  }, T);

  // 第二次執行不再有變更；
  it('第二次執行是 no-op（commit 之後再 --apply 也不產生變更）', () => {
    // 第一次；
    run('--apply');
    // commit 讓工作目錄回到乾淨；
    git('add', '-A');
    git('commit', '-q', '-m', 'migrated');
    // 第二次 dry-run：全部 unchanged；
    const dry = run();
    expect(dry.out).toMatch(/a\/one\.html: unchanged/);
    expect(dry.out).toMatch(/files changed: 0/);
    // 第二次 --apply：沒有任何修改；
    const again = run('--apply');
    expect(again.code).toBe(0);
    expect(git('status', '--porcelain')).toBe('');
  }, T);

  // 無法無損往返的檔案：跳過並回報，其他檔案照常處理；
  it('單一檔案失敗只跳過並回報，不中斷整批', () => {
    // 非法 UTF-8 的檔案（0xff 不可能出現在 UTF-8）；
    put('a/bad.html', Buffer.concat([Buffer.from('<html><head><style>.card{a:b}</style></head><body>', 'utf8'), Buffer.from([0xff, 0xfe]), Buffer.from('</body></html>', 'utf8')]));
    git('add', '-A');
    git('commit', '-q', '-m', 'bad');
    // 套用；
    const { code, out } = run('--apply');
    // 回報這個檔案的錯誤，結束碼非零；
    expect(out).toMatch(/a\/bad\.html: error/);
    expect(code).not.toBe(0);
    // 壞檔案原樣；
    expect(read('a/bad.html').includes(0xff)).toBe(true);
    expect(read('a/bad.html').toString('latin1')).not.toContain('note-theme.css');
    // 其他檔案仍被處理；
    expect(read('a/one.html').toString('utf8')).toContain('note-theme.css');
    expect(read('top.html').toString('utf8')).toContain('note-theme.css');
  }, T);
});

// 三組：--only 與 --limit；
describe('migrate-html-notes：--only 與 --limit', () => {
  // 目錄；
  it('--only 指定資料夾', () => {
    // 只處理 a/；
    const { out } = run('--only', 'a');
    // 含 a/ 底下兩份，不含 top.html；
    expect(out).toContain('a/one.html');
    expect(out).toContain('a/two.html');
    expect(out).not.toContain('top.html:');
  }, T);

  // 單一檔案與 glob 可重複；
  it('--only 可重複，支援檔案路徑與 glob', () => {
    // 一個檔案加一個 glob；
    const { out } = run('--only', 'top.html', '--only', 'a/*.html');
    // 三份都在；
    expect(out).toContain('top.html:');
    expect(out).toContain('a/one.html:');
    expect(out).toContain('a/two.html:');
  }, T);

  // --limit 取排序後的前 N 份；
  it('--limit 取排序後的前 N 份（決定性）', () => {
    // 限 1；
    const { out } = run('--limit', '1');
    // 排序後第一份是 a/one.html；
    expect(out).toContain('a/one.html:');
    expect(out).not.toContain('a/two.html:');
    expect(out).not.toContain('top.html:');
  }, T);

  // 沒有符合的檔案：失敗並說明；
  it('--only 沒有符合任何檔案時失敗', () => {
    // 不存在的路徑；
    const { code, out } = run('--only', 'nope/');
    // 結束碼非零並說明；
    expect(code).not.toBe(0);
    expect(out).toMatch(/沒有符合/);
  }, T);

  // 報告檔；
  it('--report 寫出 JSON', () => {
    // 報告寫在倉庫外的暫存位置，免得弄髒工作目錄；
    const reportPath = path.join(tmpdir(), `migrate-report-${Date.now()}.json`);
    // 執行；
    run('--only', 'a/one.html', '--report', reportPath);
    // 讀回；
    const json = JSON.parse(readFileSync(reportPath, 'utf8'));
    // 清掉；
    rmSync(reportPath, { force: true });
    // 結構；
    expect(json.apply).toBe(false);
    expect(json.files).toHaveLength(1);
    expect(json.files[0].path).toBe('a/one.html');
    expect(json.files[0].changed).toBe(true);
  }, T);
});
