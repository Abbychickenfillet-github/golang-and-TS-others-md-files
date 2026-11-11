// `import type` 只匯入型別：Metadata 描述頁面 <head> 的標題等資訊；
import type { Metadata } from 'next';
// 匯入快取版的網站載入函式；
import { getSite } from '../lib/site';
// 匯入首頁分組函式；
import { buildHomeSections } from '../lib/home';
// 匯入 basePath 讀取；
import { getBasePath } from '../lib/base-path';
// 匯入首頁清單元件；
import { HomeIndex } from '../components/HomeIndex';

// 首頁的 <title>：用 absolute 跳過 layout 的 `%s｜Abby 的筆記` 樣板，直接是 Abby Notes；
export const metadata: Metadata = { title: { absolute: 'Abby Notes' } };

// 首頁：列出「已發布」的全部筆記（與 [...slug] 路由用同一份 site.notes，所以被排除、被取代、保留名稱的筆記都不會出現），取代 build-index.py 產生的根目錄 index.html；
export default async function Home() {
  // 載入網站（每個行程只載一次）；
  const site = await getSite();
  // 讀取前綴；
  const basePath = getBasePath();
  // 分組後交給元件；
  return <HomeIndex sections={buildHomeSections(site.notes)} total={site.notes.length} basePath={basePath} />;
}
