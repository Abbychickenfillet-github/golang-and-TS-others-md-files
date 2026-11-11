// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本測試只做字串處理，改用 node 環境；
// 從 vitest 匯入測試骨架：describe 分組、it 定義單一案例、expect 斷言；
import { describe, expect, it } from 'vitest';
// 匯入被測模組的公開函式；
import { splitFrontmatter } from '../src/lib/frontmatter';

// splitFrontmatter 是 markdown.ts 與 content.ts 共用的前言解析，兩邊行為必須完全一致；
describe('splitFrontmatter', () => {
  // 正常前言：資料與內文分開；
  it('拆出前言物件與內文', () => {
    // 一份標準前言；
    expect(splitFrontmatter('---\ntitle: 標題\ntags: [a, b]\n---\n# 大標\n')).toEqual({ data: { title: '標題', tags: ['a', 'b'] }, body: '# 大標\n' });
  });

  // 沒有前言：整份是內文；
  it('沒有前言時整份是內文', () => {
    // 一般文字；
    expect(splitFrontmatter('# 大標\n內文\n')).toEqual({ data: {}, body: '# 大標\n內文\n' });
  });

  // BOM 與 CRLF；
  it('處理 BOM 與 CRLF', () => {
    // 開頭有 BOM、換行是 \r\n；
    const out = splitFrontmatter('﻿---\r\ntitle: x\r\n---\r\n內文\r\n');
    // 前言正確；
    expect(out.data).toEqual({ title: 'x' });
    // 內文去掉前言；
    expect(out.body.trim()).toBe('內文');
  });

  // 沒有結尾分隔線：開頭的 --- 只是分隔線；
  it('開頭 --- 沒有結尾時整份是內文', () => {
    // 分隔線後接文字；
    expect(splitFrontmatter('---\n\n內文\n')).toEqual({ data: {}, body: '---\n\n內文\n' });
  });

  // 前言只有一個空區塊；
  it('空前言區塊得到 {} 與內文', () => {
    // 兩條相鄰的分隔線；
    expect(splitFrontmatter('---\n---\n內文\n')).toEqual({ data: {}, body: '內文\n' });
  });

  // 只有前言：內文為空；
  it('只有前言時內文為空字串', () => {
    // 前言後沒有任何東西；
    expect(splitFrontmatter('---\ntitle: x\n---\n')).toEqual({ data: { title: 'x' }, body: '' });
  });

  // 壞 YAML：data 為 {}，前言區塊從內文拿掉；
  it('壞 YAML 得到 {}，且前言區塊從內文移除', () => {
    // 未閉合的方括號；
    expect(splitFrontmatter('---\ntitle: [壞掉\n---\n# 內文 h1\n')).toEqual({ data: {}, body: '# 內文 h1\n' });
  });

  // 非 mapping 的 YAML（兩條 --- 夾普通文字）：data 為 {}，整份保留為內文（其實是兩條分隔線）；
  it('非 mapping 的 YAML 得到 {}，整份保留為內文', () => {
    // 普通段落夾在兩條分隔線之間；
    const text = '---\n\n普通段落\n\n---\n後面\n';
    // 結果；
    expect(splitFrontmatter(text)).toEqual({ data: {}, body: text });
  });

  // 開頭帶引擎標記的 ---js、---javascript：不是前言，不執行任何東西，整份是內文；
  it.each(['---js', '---javascript', '---yaml', '---json'])('開頭是 %s 時不是前言，且不執行程式碼', (opener) => {
    // 旗標掛在 globalThis 上，被執行過就會被設成 true；
    const g = globalThis as { __pwned?: boolean };
    // 先清掉；
    delete g.__pwned;
    // 內含會設旗標的 JavaScript；
    const text = `${opener}\n{ title: (globalThis.__pwned = true, "x") }\n---\n內文\n`;
    // 解析；
    const out = splitFrontmatter(text);
    // 沒有執行；
    expect(g.__pwned).toBeUndefined();
    // 沒有前言；
    expect(out.data).toEqual({});
    // 整份原文都在內文裡；
    expect(out.body).toBe(text);
  });
});
