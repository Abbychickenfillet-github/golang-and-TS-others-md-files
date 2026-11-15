// `import type` 只匯入型別；
import type { RenderedHtml } from '../lib/render-note';

// html 屬性名稱與 React 屬性名稱不同的對照表（只列 script／link 可能出現的）；
const REACT_PROP: Record<string, string> = {
  crossorigin: 'crossOrigin', // 跨來源設定；
  nomodule: 'noModule', // 不支援模組的舊瀏覽器才執行；
  referrerpolicy: 'referrerPolicy', // 參照來源政策；
  charset: 'charSet', // 字元編碼；
  fetchpriority: 'fetchPriority', // 下載優先序；
};
// 布林屬性：html 裡只寫名稱（值是空字串），React 要給 true 才會輸出；
const BOOLEAN_ATTRS = new Set(['async', 'defer', 'nomodule']);

// 把原始 html 屬性轉成 React props；略過 src（另外處理）與 on 開頭的事件屬性（React 不接受字串事件處理器）；
function toReactProps(attrs: Record<string, string>): Record<string, string | boolean> {
  // 結果物件；
  const props: Record<string, string | boolean> = {};
  // Object.entries 取出 [名稱, 值] 陣列；
  for (const [name, value] of Object.entries(attrs)) {
    // 名稱轉小寫比對；
    const lower = name.toLowerCase();
    // src 另外處理、事件屬性略過；
    if (lower === 'src' || lower.startsWith('on')) continue;
    // 對照表有就換名，否則保留原名；`??` 在左邊是 undefined 時取右邊；
    const key = REACT_PROP[lower] ?? lower;
    // 布林屬性給 true，其他照原值；
    props[key] = BOOLEAN_ATTRS.has(lower) ? true : value;
  }
  // 回傳；
  return props;
}

// body 上要搬到外層 div 的屬性：class、id 與 data-*；style 字串 React 不接受，略過；
function bodyProps(attrs: Record<string, string>): Record<string, string> {
  // 結果物件；
  const props: Record<string, string> = {};
  // 逐一處理；
  for (const [name, value] of Object.entries(attrs)) {
    // class 要寫成 React 的 className；
    if (name === 'class') props.className = value;
    // id 與 data-* 原樣保留；
    else if (name === 'id' || name.startsWith('data-')) props[name] = value;
  }
  // 回傳；
  return props;
}

// html 筆記頁：依 R27 的順序輸出樣式，再輸出 body 內容，最後依原順序輸出頁面自己的腳本（伺服器端輸出的 script 標籤，瀏覽器解析時就會執行，R4）；
export function HtmlNote({ rendered, basePath }: { rendered: RenderedHtml; basePath: string }) {
  // 解構取出解析結果與 note-quiz 需求；
  const { parsed, needsQuiz } = rendered;
  // 回傳 JSX；<>…</> 是 Fragment，不產生額外元素；
  return (
    <>
      {/* 頁面自己的外部樣式表（例如 Google Fonts）；map 的第二個參數是索引，當 key 用； */}
      {parsed.pageStylesheets.map((href, i) => (
        // 放在 body 內的 link 樣式表瀏覽器一樣會套用；
        <link key={`css-${i}`} rel="stylesheet" href={href} />
      ))}
      {/* 無法解析的一般樣式區塊：各自獨立的 <style>，排在 pageCss 之前（R27）；filter 篩掉 override 的； */}
      {parsed.rawStyleBlocks
        .filter((b) => !b.override)
        .map((b, i) => (
          // media 沒有時 React 不輸出這個屬性；
          <style key={`raw-${i}`} media={b.media} dangerouslySetInnerHTML={{ __html: b.css }} />
        ))}
      {/* 頁面獨有的 CSS（已抽掉共用規則）；空字串就不輸出； */}
      {parsed.pageCss.trim() !== '' && <style dangerouslySetInnerHTML={{ __html: parsed.pageCss }} />}
      {/* 無法解析的覆寫區塊：排在最後才能在層疊中勝出（R27）； */}
      {parsed.rawStyleBlocks
        .filter((b) => b.override)
        .map((b, i) => (
          // 同上；
          <style key={`override-${i}`} media={b.media} dangerouslySetInnerHTML={{ __html: b.css }} />
        ))}
      {/* body 內容：外層 div 帶著原本 body 的 class 與 data-*；suppressHydrationWarning 容忍頁面腳本在 hydration 前改動 DOM； */}
      <div {...bodyProps(parsed.bodyAttrs)} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: parsed.bodyHtml }} />
      {/* 原頁載入過 note-quiz.js 才同步載入它，而且排在頁面腳本之前（頁面 inline 腳本會直接呼叫 NoteQuiz.mount）； */}
      {/* 下一行的 eslint 指令關掉「不要用同步 script」規則：這裡刻意要同步，瀏覽器解析到它就執行，後面的 inline 腳本才拿得到 NoteQuiz（R4）； */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      {needsQuiz && <script src={`${basePath}/assets/note-quiz.js`} />}
      {/* 頁面自己的腳本依原順序輸出； */}
      {parsed.pageScripts.map((s, i) =>
        // 外部腳本：src 加上保留的屬性；內嵌腳本：內容原樣放進 dangerouslySetInnerHTML；
        s.src !== undefined ? (
          // 外部腳本；下一行關掉同步 script 規則：頁面原本就是同步載入，順序要與原頁相同（R4）；
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script key={`js-${i}`} src={s.src} {...toReactProps(s.attrs)} />
        ) : (
          // 內嵌腳本；
          <script key={`js-${i}`} {...toReactProps(s.attrs)} dangerouslySetInnerHTML={{ __html: s.inline ?? '' }} />
        ),
      )}
    </>
  );
}
