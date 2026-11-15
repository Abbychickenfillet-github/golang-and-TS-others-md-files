// `import type` 只匯入型別：Metadata 描述頁面 <head> 的資訊；
import type { Metadata } from 'next';
// 匯入 notFound：找不到筆記時讓 Next 回傳 404（dynamicParams=false 下理論上不會發生）；
import { notFound } from 'next/navigation';
// 匯入快取版的網站載入函式；
import { getSite } from '../../lib/site';
// 匯入單篇渲染與 slug 查詢；
import { findNoteBySlug, renderNote } from '../../lib/render-note';
// 匯入 basePath 讀取；
import { getBasePath } from '../../lib/base-path';
// 匯入 md 頁面元件；
import { MdNote } from '../../components/MdNote';
// 匯入 html 頁面元件；
import { HtmlNote } from '../../components/HtmlNote';

// 只產生 generateStaticParams 列出的路徑，其他網址一律 404（靜態匯出必須如此）；
export const dynamicParams = false;

// 頁面 props 的型別：Next 16 的 params 是 Promise；slug 是 catch-all 路由的片段陣列；
type PageProps = { params: Promise<{ slug: string[] }> };

// 列出所有要產生的頁面；片段是未編碼的原始字串（中文、空白、#、+、括號原樣），由 Next 自己決定輸出檔名；
export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  // 載入網站（每個行程只載入一次）；
  const site = await getSite();
  // 每篇筆記一個路徑；map 把筆記轉成 { slug }；
  return site.notes.map((note) => ({ slug: note.slug }));
}

// 依網址找出筆記；找不到就 404；
async function noteFor(params: PageProps['params']) {
  // 等 params 的 Promise；解構取出 slug；
  const { slug } = await params;
  // 載入網站；
  const site = await getSite();
  // 查詢；
  const note = findNoteBySlug(site, slug);
  // 找不到就丟出 404；notFound 的回傳型別是 never，之後的程式碼 TypeScript 會知道 note 一定存在；
  if (!note) notFound();
  // 回傳網站與筆記；
  return { site, note };
}

// 每頁的 <title>：用筆記標題（layout 的樣板會加上網站名稱）；
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // 找筆記；
  const { note } = await noteFor(params);
  // 回傳標題；
  return { title: note.title };
}

// 筆記頁：依種類交給 MdNote 或 HtmlNote；
export default async function NotePage({ params }: PageProps) {
  // 找筆記；
  const { site, note } = await noteFor(params);
  // 讀取前綴；
  const basePath = getBasePath();
  // 渲染；警告寫進這個行程的 site.report，但整站彙整由建置前的 site-report.mjs 負責（見該檔開頭說明）；
  // STRICT_LINKS=1 時遇到歧義連結直接丟錯，所以就算跳過 site-report.mjs 直接跑 next build 也會失敗；
  const rendered = await renderNote(site, note, basePath, site.report, { strictLinks: process.env.STRICT_LINKS === '1' });
  // md 與 html 分流；
  return rendered.kind === 'md' ? <MdNote rendered={rendered} /> : <HtmlNote rendered={rendered} basePath={basePath} />;
}
