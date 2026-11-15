// 匯入頁首元件；
import { Hero } from './Hero';
// 匯入卡片元件；
import { Card } from './Card';
// 匯入卡片牆元件；
import { SnapDeck } from './SnapDeck';
// `import type` 只匯入型別；
import type { RenderedMd } from '../lib/render-note';

// 從 frontmatter 取出標籤：只接受「全是字串的陣列」，其他形狀一律不顯示；
function tagsOf(frontmatter: Record<string, unknown>): string[] {
  // 取出 tags 欄位；
  const tags = frontmatter.tags;
  // Array.isArray 判斷是陣列，every 要求每個元素都是字串；
  return Array.isArray(tags) && tags.every((t) => typeof t === 'string') ? tags : [];
}

// 從 frontmatter 取出日期文字：優先 updated，其次 date；gray-matter 會把 YAML 日期轉成 Date 物件，所以兩種型別都處理；
function dateOf(frontmatter: Record<string, unknown>): string | null {
  // 依序找第一個有值的欄位；
  for (const key of ['updated', 'date']) {
    // 取值；
    const value = frontmatter[key];
    // Date 物件：取 ISO 字串的前 10 個字元（YYYY-MM-DD）；isNaN 擋掉無效日期；
    if (value instanceof Date && !isNaN(value.getTime())) return `${key === 'updated' ? '更新' : '日期'}：${value.toISOString().slice(0, 10)}`;
    // 字串或數字：原樣轉文字；
    if ((typeof value === 'string' && value.trim() !== '') || typeof value === 'number') return `${key === 'updated' ? '更新' : '日期'}：${String(value).trim()}`;
  }
  // 都沒有就回傳 null；
  return null;
}

// md 筆記頁：.wrap > .layout > main.content，內含頁首與一張放渲染結果的卡片；
export function MdNote({ rendered }: { rendered: RenderedMd }) {
  // 解構取出筆記與渲染結果；
  const { note, html, frontmatter } = rendered;
  // 日期文字；
  const date = dateOf(frontmatter);
  // 內文卡片：dangerouslySetInnerHTML 直接插入建置時產生的 HTML（來源是自己的筆記庫）；
  const body = (
    // Card 是 article.card；
    <Card>
      {/* note-body 包住渲染結果；suppressHydrationWarning 容忍 notes.js 等腳本在 hydration 前後改動內容； */}
      <div className="note-body" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
    </Card>
  );
  // 回傳 JSX；
  return (
    // 外層 wrap；
    <div className="wrap">
      {/* 兩欄版面，notes.js 會把大綱放進左側； */}
      <div className="layout">
        {/* 主要內容區； */}
        <main className="content">
          {/* 頁首：標題、標籤、日期；`{...(條件 ? {…} : {})}` 只在有日期時才傳 meta（Hero 沒收到 meta 就不輸出 .meta）； */}
          <Hero title={note.title} pills={tagsOf(frontmatter)} {...(date !== null ? { meta: date } : {})} />
          {/* frontmatter 的 deck 嚴格等於 true 才包進卡片牆； */}
          {frontmatter.deck === true ? <SnapDeck>{body}</SnapDeck> : body}
        </main>
      </div>
    </div>
  );
}
