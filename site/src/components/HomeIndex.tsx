// 從 react 匯入 Fragment：不產生額外 DOM 節點的群組容器，讓標題與清單成為卡片的直接子元素；
import { Fragment } from 'react';
// 匯入頁首元件；
import { Hero } from './Hero';
// 匯入卡片元件；
import { Card } from './Card';
// 匯入網址編碼工具（逐段 encodeURIComponent，再加 basePath）；
import { encodeSitePath } from '../lib/render-note';
// `import type` 只匯入型別；
import type { HomeSection } from '../lib/home';

// 用 interface 宣告 props 形狀；
interface HomeIndexProps {
  // sections 是 buildHomeSections 的結果；
  sections: HomeSection[];
  // total 是已發布的筆記總數，顯示在頁首；
  total: number;
  // basePath 是網址前綴（沒有就是空字串）；
  basePath: string;
}

// 首頁：頁首加一張卡片，卡片裡每個資料夾一個標題（h2 或 h3）與一份筆記清單；
// 全部區塊放在同一張卡片（同一個 article）：notes.js 只會對頁面上第一個 article 建大綱，分成多張卡片大綱就只涵蓋第一張；
export function HomeIndex({ sections, total, basePath }: HomeIndexProps) {
  // 回傳 JSX；
  return (
    // 與筆記頁相同的外層結構：.wrap > .layout > main.content，notes.js 會把大綱放進左側；
    <div className="wrap">
      {/* 兩欄版面； */}
      <div className="layout">
        {/* 主要內容區； */}
        <main className="content">
          {/* 頁首：標題 Abby Notes，沒有標籤，meta 放篇數； */}
          <Hero title="Abby Notes" pills={[]} meta={`共 ${total} 篇筆記`} />
          {/* 一張卡片裝全部區塊； */}
          <Card>
            {/* 逐區塊輸出；標題文字加上篇數；key 用區塊自己的 key（由完整資料夾路徑組成，不同頂層資料夾底下的同名巢狀資料夾也不會撞）； */}
            {sections.map((section) => {
              // 標題標籤依層級決定；JSX 的標籤名可以是大寫變數或字串變數，這裡用小寫字串變數需要先指定給大寫開頭的常數；
              const Heading = section.level === 2 ? 'h2' : 'h3';
              // 回傳一組標題加清單；
              return (
                // Fragment 加 key（短語法 <> 不能帶 key）；
                <Fragment key={section.key}>
                  {/* 資料夾標題；篇數用 meta 小字；notes.js 的大綱會取整段文字； */}
                  <Heading>
                    {section.heading}
                    <span className="meta">（{section.count}）</span>
                  </Heading>
                  {/* 沒有直接放的筆記就不輸出空清單； */}
                  {section.items.length > 0 && (
                    // 筆記清單；
                    <ul>
                      {/* 每篇一個項目；path 在同一資料夾內唯一；一般 <a> 連結（整頁載入，讓每頁自己的腳本都會執行）； */}
                      {section.items.map((item) => (
                        // 清單項目；
                        <li key={item.path}>
                          {/* 連結文字是標題；網址是 basePath 加逐段編碼的路徑； */}
                          <a href={encodeSitePath(item.path, basePath)}>{item.title}</a>
                          {/* 互動版加可見標記：沿用 .pill 膠囊樣式；前面的 {' '} 是一個空白文字節點，讓標記與連結隔開； */}
                          {item.interactive && (
                            <>
                              {' '}
                              <span className="pill">互動版</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Fragment>
              );
            })}
          </Card>
        </main>
      </div>
    </div>
  );
}
