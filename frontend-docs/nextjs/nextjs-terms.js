/* ==========================================================================
   nextjs-terms.js — Next.js 名詞表（單一來源）＋ hover 名詞載入器
   用法：
     1. HTML 筆記引入本檔：<script src="nextjs-terms.js"></script>
     2. 內文寫 <span class="term" data-term="hydration">Hydration</span>
     3. 載入時依 data-term 填入 data-def，樣式沿用 assets/notes.css 的 .term
   改定義只改下面 TERMS，全篇同一個詞永遠同一句
   欄位：t = 顯示名稱，d = 一句定義，s = 定義依據
   未來 React 元件化：把 TERMS 原樣存成 terms.json 即可，見筆記「名詞 hover 規格」
   ========================================================================== */
window.NOTE_TERMS = {
  prerender: { t: 'Prerender 預渲染', d: '在建置時（或重新驗證的背景中）先執行元件函式，把結果存成 HTML 與 RSC Payload，之後可直接從 CDN 送出。請求進來才渲染的叫動態渲染。', s: 'Next.js Glossary' },
  'dynamic-rendering': { t: 'Dynamic rendering 動態渲染', d: '在請求進來的當下才渲染元件。用到 cookies()、headers()、searchParams 這類請求時 API 就會變成動態。', s: 'Next.js Glossary' },
  bailout: { t: 'Bailout 跳船', d: '預渲染時放棄把某棵子樹轉成 HTML，改交給瀏覽器渲染。HTML 裡只留下最近一層 Suspense 的 fallback 或空殼。', s: 'Next.js useSearchParams 文件與本 vault 實測' },
  ssr: { t: 'SSR 伺服器端渲染', d: '每次請求進來時，伺服器才把元件渲染成 HTML 字串再回傳。內容永遠是請求當下的資料。', s: '本 vault SSR 筆記' },
  ssg: { t: 'SSG 靜態生成', d: '建置時就把頁面渲染成 HTML 檔，部署後所有人拿到同一份。內容更新要重新建置。', s: '本 vault SSR 筆記' },
  csr: { t: 'CSR 使用者端渲染', d: '伺服器只送空殼 HTML，瀏覽器下載並執行 JS 之後才產生畫面內容。', s: '本 vault SSR 筆記' },
  html: { t: 'HTML 字串', d: '純文字。伺服器端產生的只是一串字元，還不是 DOM，瀏覽器解析後才會變成 DOM。', s: '本 vault SSR 筆記' },
  dom: { t: 'DOM 文件物件模型', d: '瀏覽器解析 HTML 之後在記憶體中建立的節點樹。伺服器端（Node.js）沒有 DOM，所以建置期不可能產生 DOM。', s: '本 vault SSR 筆記' },
  cssom: { t: 'CSSOM', d: '瀏覽器把 CSS 解析成的樹狀資料結構。CSSOM 沒建好之前瀏覽器不會繪製畫面，所以 CSS 屬於 render-blocking。', s: '本 vault FCP 筆記' },
  'render-blocking': { t: 'Render-blocking 阻塞繪製', d: '瀏覽器規定 CSSOM 建好之前一個像素都不畫，所以 CSS 檔越大，首次繪製越晚。', s: '本 vault FCP 筆記' },
  render: { t: '渲染 render', d: '依 props 與 state 呼叫元件函式，得到 UI 的描述（React element 樹）。伺服器端還會再把它序列化成 HTML 字串與 RSC Payload。這不等於瀏覽器把畫面畫出來，那叫 Paint。', s: '本 vault SSR 筆記 (b)(d) 與 Next.js Glossary' },
  'run-component': { t: '執行元件函式', d: '呼叫元件函式（例如 Page()）並取得它回傳的 JSX 結果。是渲染的第一步，不包含之後轉成 HTML 字串。預渲染時這一步發生在 Node.js，不是瀏覽器。', s: '本 vault SSR 筆記 (d)' },
  paint: { t: 'Paint 繪製', d: 'DOM 與 CSSOM 合成 Render Tree、算完 Layout 之後，把像素畫上螢幕。此時畫面看得到，但事件還沒接上。', s: '本 vault SSR 筆記' },
  hydration: { t: 'Hydration 水合', d: 'React 在瀏覽器認領伺服器送來的既有 DOM 並掛上事件處理器，讓靜態 HTML 變成可互動。不是重畫一次。', s: 'React hydrateRoot 與 Next.js Glossary' },
  hydrateroot: { t: 'hydrateRoot', d: 'React 的瀏覽器端 API，把 React 附加到伺服器先前渲染好的 HTML 上並接管該節點內的 DOM。', s: 'React 官方文件' },
  rendertostring: { t: 'renderToString', d: 'React 的伺服器端 API，把元件同步渲染成 HTML 字串。不支援串流，遇到會 suspend 的元件只輸出最近 Suspense 的 fallback。', s: 'React 官方文件' },
  suspense: { t: 'Suspense', d: '子元件還沒準備好時先顯示 fallback 的 React 元件。在 Next.js 裡它也決定預渲染的靜態外殼到哪裡為止。', s: 'React 官方文件與 Next.js Glossary' },
  fallback: { t: 'fallback', d: 'Suspense 在內容尚未就緒時顯示的替代畫面。Bailout 時，伺服器 HTML 裡留下的就是它。', s: 'React 官方文件' },
  fcp: { t: 'FCP 首次內容繪製', d: '從開始載入到畫面上首次出現文字、圖片等內容的時間。Bailout 的子樹畫不出內容，FCP 就得等其他有內容的部分。', s: '本 vault FCP 筆記' },
  lcp: { t: 'LCP 最大內容繪製', d: '視窗內最大那塊內容畫出來的時間。被 Bailout 的主內容要等 JS 跑完才出現，通常拖慢的是 LCP。', s: '本 vault FCP 診斷筆記' },
  tti: { t: 'TTI 可互動時間', d: '頁面不只看得到，還能回應點擊的時間點。Hydration 完成之後才算。', s: '本 vault FCP 診斷筆記' },
  'server-component': { t: 'Server Component 伺服器元件', d: 'App Router 的預設元件。只在伺服器渲染，不增加瀏覽器端 JS，不能用 state 與瀏覽器 API。', s: 'Next.js Glossary' },
  'client-component': { t: 'Client Component 使用者端元件', d: '檔案頂端寫了 use client 的元件。可用 state 與瀏覽器 API，而且初次載入時仍會在伺服器預渲染成 HTML 再 hydrate。', s: 'Next.js Glossary 與 Server and Client Components 文件' },
  'use-client': { t: "'use client' 指令", d: '宣告伺服器與使用者端模組之間的打包邊界，代表這個檔案與它 import 的東西會被打包送到瀏覽器。它沒有說不要在伺服器渲染。', s: 'Next.js Server and Client Components 文件' },
  'rsc-payload': { t: 'RSC Payload', d: 'Server Component 渲染結果的壓縮序列化格式，含 Client Component 的位置標記與 JS 檔參照，供瀏覽器端 React 對齊兩棵樹。', s: 'Next.js Glossary' },
  usesearchparams: { t: 'useSearchParams()', d: '讀取網址問號後查詢字串的 Client hook。查詢字串屬於請求時才知道的資料，所以預渲染時會讓呼叫它的 Client 樹退到最近 Suspense 邊界為止改由瀏覽器渲染。', s: 'Next.js useSearchParams 文件' },
  'next-dynamic': { t: 'next/dynamic', d: 'Next.js 的延遲載入函式，是 React.lazy 與 Suspense 的組合。設 ssr: false 就會跳過該 Client Component 的預渲染。', s: 'Next.js Lazy Loading 文件' },
  'ssr-false': { t: 'ssr: false', d: 'next/dynamic 的選項，明確要求不要預渲染這個 Client Component，HTML 裡只會有 loading 或空白。', s: 'Next.js Lazy Loading 文件' },
  'build-time': { t: 'Build time 建置期', d: '執行 next build 的那一次，編譯程式碼、產生靜態頁面並準備部署資源。只發生一次，不是每個使用者一次。', s: 'Next.js Glossary' },
  'static-shell': { t: 'Static shell 靜態外殼', d: '預渲染出來、立即送給瀏覽器的 HTML 結構，包含所有可靜態渲染的內容，以及動態部分的 Suspense fallback。', s: 'Next.js Glossary' },
  ttfb: { t: 'TTFB 首位元組時間', d: '從發出請求到收到回應第一個位元組的時間，是 FCP 的起點。', s: '本 vault FCP 筆記' },
  cdn: { t: 'CDN', d: '把靜態檔案放在離使用者近的節點直接送出。預渲染的結果因為是檔案，可以放在 CDN。', s: 'Next.js Glossary' },

  /* ---- 爬蟲與渲染 ---- */
  crawler: { t: 'Crawler 爬蟲', d: '自動抓取網頁的程式。它先拿到伺服器回應的 HTML 文字，自己解析出文字與連結，不一定會執行頁面的 JS。', s: 'Google Search Central JavaScript SEO basics' },
  googlebot: { t: 'Googlebot', d: 'Google 的爬蟲。200 狀態的頁面會排入渲染佇列，由無頭 Chromium 執行 JS，之後用渲染後的 HTML 索引，等待時間不一定。', s: 'Google Search Central JavaScript SEO basics' },
  wrs: { t: 'WRS 網頁渲染服務', d: 'Google 用來渲染頁面的服務，行為像現代瀏覽器，會執行 JS 與 CSS，但無狀態，每次請求之間會清除本地儲存與 session。', s: 'Google Search Central Inside Googlebot' },
  'render-queue': { t: 'Render queue 渲染佇列', d: 'Googlebot 抓到 200 狀態的頁面後排隊等待渲染。等待時間不一定，所以依賴 JS 才出現的內容會比初始 HTML 內容晚被看到。', s: 'Google Search Central JavaScript SEO basics' },
  'view-source': { t: 'view-source 檢視原始碼', d: '顯示伺服器回應的原始 HTML 文字，沒有經過瀏覽器端 JS 修改。和 Elements 面板顯示的 DOM 不同。', s: '本 vault FCP 與 SSR 筆記' },
  parse: { t: 'parse 解析', d: '把一串文字依規則拆成結構。爬蟲與瀏覽器都會 parse HTML 文字，差別在瀏覽器之後還會執行 JS 並修改 DOM。', s: '本 vault SSR 筆記' },

  /* ---- SSG 與 Headless CMS ---- */
  headless: { t: 'Headless 無頭', d: '內容後台與前端展示層分離，內容透過 API 提供，前端想用什麼框架都行。與 SSG 是兩個不同的概念。', s: '本筆記整理' },
  'headless-cms': { t: 'Headless CMS', d: '只負責存放與編輯內容並提供 API 的內容管理系統，沒有綁定的網頁前端。', s: '本筆記整理' },
  isr: { t: 'ISR 增量靜態再生', d: '預渲染的頁面在背景定期或按需重新產生，不必重跑整個 next build。', s: 'Next.js ISR 文件' },
  'on-demand-revalidation': { t: 'On-demand revalidation 按需重新驗證', d: '用 revalidatePath 或 revalidateTag 在內容變更時讓快取失效，下一次請求才重新產生該頁。', s: 'Next.js ISR 文件' },

  /* ---- URL 解析 ---- */
  'legacy-url': { t: 'Legacy URL API', d: 'Node 舊的 url.parse() 一派，只有 Node 有。官方標為 Legacy，其中 url.parse() 標為 Deprecated。', s: 'Node.js url 文件' },
  'whatwg-url': { t: 'WHATWG URL', d: '瀏覽器與 Node 共通的標準 URL API，包含 new URL() 與 URL.parse()，屬性有 searchParams、username、password。', s: 'Node.js url 與 MDN 文件' },
  'parser-differential': { t: 'Parser differential 解析器差異', d: '兩個 parser 對同一字串解讀出不同結果。若檢查與發請求各用一個，攻擊者可以挑能繞過檢查的字串。', s: '本筆記實測' }
}

;(function () {
  var T = window.NOTE_TERMS

  function fill() {
    var els = document.querySelectorAll('.term[data-term]')
    for (var i = 0; i < els.length; i++) {
      var el = els[i]
      var item = T[el.getAttribute('data-term')]
      if (!item) {
        el.classList.add('term-missing')
        if (window.console) console.warn('名詞表沒有這個 id：' + el.getAttribute('data-term'))
        continue
      }
      el.setAttribute('data-def', item.t + '：' + item.d)
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
      if (!el.textContent.trim()) el.textContent = item.t
    }
  }

  /* 氣泡貼近左右邊界時改成靠邊對齊，避免超出畫面。顯示與隱藏仍是純 CSS 的 :hover 與 :focus */
  function align(e) {
    var el = e.target.closest ? e.target.closest('.term') : null
    if (!el) return
    var r = el.getBoundingClientRect()
    var w = Math.min(320, window.innerWidth - 32)
    var c = r.left + r.width / 2
    el.removeAttribute('data-align')
    el.removeAttribute('data-pos')
    if (c - w / 2 < 8) el.setAttribute('data-align', 'left')
    else if (c + w / 2 > window.innerWidth - 8) el.setAttribute('data-align', 'right')
    if (r.top < 190) el.setAttribute('data-pos', 'below')
  }

  function glossaryTable(box) {
    var rows = ''
    Object.keys(T).forEach(function (k) {
      rows += '<tr><td><code>' + k + '</code></td><td>' + T[k].t + '</td><td>' + T[k].d + '</td><td>' + T[k].s + '</td></tr>'
    })
    box.innerHTML = '<table><thead><tr><th>id</th><th>顯示名稱</th><th>定義</th><th>依據</th></tr></thead><tbody>' + rows + '</tbody></table>'
  }

  window.fillNoteTerms = fill

  function init() {
    fill()
    document.addEventListener('pointerenter', align, true)
    document.addEventListener('focusin', align)
    var box = document.getElementById('glossary-table')
    if (box) glossaryTable(box)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
