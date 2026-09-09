// =====================================================================================
// app/postfix-increment/page.tsx
// 這一頁只是「目錄」，四個範例各自獨立成一個檔案，方便你一次只看一份程式碼
// 網址：http://localhost:3000/postfix-increment
// =====================================================================================

// Link 是 Next.js 的用戶端導航元件（client-side navigation），
// 它會攔截點擊、只換掉需要變的部分，不會整頁重新載入。
import Link from 'next/link';

// 把四個範例的資料抽成陣列，畫面用 map 展開，之後要加第五個範例只要多一筆資料。
const demos = [
  {
    href: '/postfix-increment/01-const-typeerror',
    tag: '關卡 1',
    tone: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
    title: 'const 綁定做 count++ 會丟 TypeError',
    desc: 'useState 解構出來的 count 是 const，而 ++ 內含一次重新賦值，所以直接爆炸。',
    file: 'app/postfix-increment/01-const-typeerror/page.tsx',
  },
  {
    href: '/postfix-increment/02-postfix-old-value',
    tag: '關卡 2',
    tone: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    title: '改成 let 也沒用，postfix 回傳的是舊值',
    desc: 'setCount 收到舊值，等於把 state 設回它本來就有的數字，畫面完全不動。',
    file: 'app/postfix-increment/02-postfix-old-value/page.tsx',
  },
  {
    href: '/postfix-increment/03-correct-plus-one',
    tag: '正解',
    tone: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    title: 'setCount(count + 1) 為什麼可以',
    desc: 'count + 1 是純運算式，完全不碰綁定；真正觸發重新渲染的是 setCount 這個呼叫。',
    file: 'app/postfix-increment/03-correct-plus-one/page.tsx',
  },
  {
    href: '/postfix-increment/04-snapshot-vs-updater',
    tag: '進階',
    tone: 'border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
    title: '快照陷阱：連呼叫兩次為什麼只加一次',
    desc: 'setCount(count + 1) 兩次只加 1，setCount(prev => prev + 1) 兩次才加 2。',
    file: 'app/postfix-increment/04-snapshot-vs-updater/page.tsx',
  },
];

export default function PostfixIncrementIndex() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          為什麼 React 裡不能寫 setCount(count++)
        </h1>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          四個範例各自一個檔案、各自一個網址，點進去會同時看到「可以按的 demo」與
          「這一頁自己的原始碼」，不用在檔案總管跟瀏覽器之間來回跳。
        </p>
      </header>

      <nav className="flex flex-col gap-3">
        {demos.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className={`rounded-lg border p-4 transition hover:shadow-md ${d.tone}`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
              {d.tag}
            </div>
            <div className="mt-1 font-semibold">{d.title}</div>
            <p className="mt-1 text-sm leading-6 opacity-80">{d.desc}</p>
            <code className="mt-2 block text-xs opacity-60">{d.file}</code>
          </Link>
        ))}
      </nav>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <p className="font-medium">建議的閱讀順序</p>
        <p>1. 先看 01，理解「++ 一定包含一次賦值」，所以 const 擋下它</p>
        <p>2. 再看 02，理解「postfix 回傳舊值」，所以就算改成 let 也是白做</p>
        <p>3. 接著看 03，理解「setCount 才是觸發重新渲染的那個動作」</p>
        <p>4. 最後看 04，理解「count 是這一次 render 的快照」，這是最深的一層</p>
      </section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm leading-7 dark:border-zinc-800">
        <p className="font-medium">順帶回答：++count 是不是比 count++ 好</p>
        <p>a. 關卡 1 完全平手，++count 一樣是賦值，一樣 TypeError</p>
        <p>b. ++count 唯一贏的地方是回傳新值，但那只是讓錯誤的觀念「看起來會動」</p>
        <p>c. 關卡 3、4 兩者仍然平手，所以正解永遠是 count + 1 或 prev =&gt; prev + 1</p>
      </section>
    </main>
  );
}
