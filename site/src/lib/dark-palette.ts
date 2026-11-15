// 匯入 postcss 的預設匯出，用它把 CSS 解析成語法樹；
import postcss from 'postcss';

// 感知明度的門檻（0 黑到 1 白，與 OKLab／oklch 的 L 同一把尺）：
//   背景明度低於 DARK_BG_MAX 才算「深色背景」（約等於 WCAG 相對亮度 0.18，也就是中間偏暗以下）；
//   文字明度高於 LIGHT_FG_MIN 才算「淺色文字」（約等於 WCAG 相對亮度 0.4）；
//   sRGB 顏色（#hex、rgb()、hsl()、具名顏色）用「相對亮度的立方根」近似 OKLab 的 L；oklch／oklab 直接用 L；lab／lch 用 L÷100；
export const DARK_BG_MAX = 0.565;
export const LIGHT_FG_MIN = 0.737;

// 少數常見的具名顏色（小寫名稱 → #hex）：黑白、常見深色與淺色；其餘具名顏色視為未知（不偵測），因為完整的 148 色表對這個用途不值得；
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  navy: '#000080',
  midnightblue: '#191970',
  darkblue: '#00008b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkgreen: '#006400',
  darkred: '#8b0000',
  dimgray: '#696969',
  dimgrey: '#696969',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  gainsboro: '#dcdcdc',
  whitesmoke: '#f5f5f5',
  snow: '#fffafa',
  ivory: '#fffff0',
  ghostwhite: '#f8f8ff',
  aliceblue: '#f0f8ff',
};

// 一次找出第一個顏色字面值的正規表示式（最左邊的優先）：
//   群組 1 是 #hex；群組 2、3 是函式名稱與括號內容；群組 4 是具名顏色（含 transparent，轉成「未知」）；flag i 不分大小寫；
const COLOR_RE = new RegExp(`#([0-9a-f]{3,8})\\b|\\b(oklch|oklab|lab|lch|rgba?|hsla?)\\(([^)]*)\\)|\\b(transparent|${Object.keys(NAMED_COLORS).join('|')})\\b`, 'i');

// sRGB（0–255）換成感知明度：先算 WCAG 相對亮度，再取立方根；
function srgbLightness(r: number, g: number, b: number): number {
  // 每個通道先換成線性值；
  const lin = (v: number): number => {
    // 0–255 正規化到 0–1；
    const c = Math.min(Math.max(v, 0), 255) / 255;
    // sRGB 的伽瑪還原；
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  // 相對亮度（加權總和）；
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // 立方根近似 OKLab 的 L；
  return Math.cbrt(y);
}

// 把函式括號內的第一個分量（L）轉成 0–1：百分比除以 100，小數照用；`none` 或不是數字回傳 null；scale100 為 true（lab、lch）時小數也是 0–100；
function firstComponent(inner: string, scale100: boolean): number | null {
  // 以空白、逗號或斜線切開，取第一個非空片段；
  const first = inner.split(/[\s,/]+/).find((s) => s !== '');
  // 沒有片段或是 none／relative color 的 from 都不認得；
  if (first === undefined || first.toLowerCase() === 'none' || first.toLowerCase() === 'from') return null;
  // 百分比：100% 就是 1；
  if (first.endsWith('%')) {
    // 轉數字；
    const p = parseFloat(first);
    // 不是有限數就是未知；
    return Number.isFinite(p) ? p / 100 : null;
  }
  // 小數；
  const n = parseFloat(first);
  // 不是有限數就是未知；
  if (!Number.isFinite(n)) return null;
  // lab、lch 的 L 是 0–100；
  return scale100 ? n / 100 : n;
}

// 把一段 CSS 值裡「第一個顏色」換成感知明度（0 黑到 1 白）；看不懂或是未知一律回傳 null（意思是「不偵測」，不是「淺色」也不是「深色」）：
//   未知包含：var()、color-mix()、relative color（oklch(from …)）、transparent、沒有列在表裡的具名顏色、值裡完全沒有顏色；
//   alpha 一律忽略，只看明度；漸層取第一個顏色；
export function colorLightness(value: string): number | null {
  // 這些語法無法在不執行 CSS 的情況下算出顏色，直接視為未知；
  if (/\bvar\(|\bcolor-mix\(/i.test(value)) return null;
  // 找第一個顏色；
  const m = COLOR_RE.exec(value);
  // 沒有就是未知；
  if (!m) return null;
  // 十六進位：3、4 位數每位重複一次，取前 6 位；
  if (m[1] !== undefined) {
    // 3 或 4 位數展開成 6 或 8 位；
    const hex = m[1].length <= 4 ? m[1].replace(/./g, (c) => c + c) : m[1];
    // 長度不合法（5、7 位）視為未知；
    if (hex.length !== 6 && hex.length !== 8) return null;
    // 三個通道；parseInt 的第二個參數 16 代表十六進位；
    return srgbLightness(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
  }
  // 函式寫法；
  if (m[2] !== undefined) {
    // 函式名稱小寫；
    const fn = m[2].toLowerCase();
    // 括號內容；
    const inner = m[3] ?? '';
    // oklch、oklab：L 就是明度；
    if (fn === 'oklch' || fn === 'oklab') return firstComponent(inner, false);
    // lab、lch：L 是 0–100；
    if (fn === 'lab' || fn === 'lch') return firstComponent(inner, true);
    // rgb／rgba：以逗號、空白或斜線切開，取前三個數（百分比換成 0–255）；
    if (fn === 'rgb' || fn === 'rgba') {
      // 切開；
      const parts = inner.split(/[\s,/]+/).filter((s) => s !== '').slice(0, 3);
      // 轉數字；
      const nums = parts.map((s) => (s.endsWith('%') ? (parseFloat(s) / 100) * 255 : parseFloat(s)));
      // 三個都是有限數才算；
      return nums.length === 3 && nums.every((n) => Number.isFinite(n)) ? srgbLightness(nums[0], nums[1], nums[2]) : null;
    }
    // hsl／hsla：色相、飽和度、亮度換成 rgb；
    const hsl = inner.split(/[\s,/]+/).filter((s) => s !== '').slice(0, 3).map((s) => parseFloat(s));
    // 三個數都有效才算；
    if (hsl.length !== 3 || !hsl.every((n) => Number.isFinite(n))) return null;
    // 標準 HSL 轉 RGB 公式；
    const h = (((hsl[0] % 360) + 360) % 360) / 360;
    const s = Math.min(Math.max(hsl[1] / 100, 0), 1);
    const l = Math.min(Math.max(hsl[2] / 100, 0), 1);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    // 色相轉單一通道（0–1）；
    const channel = (t0: number): number => {
      // 把 t 夾回 0–1；
      const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
      // 三段線性；
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    // 換成 0–255 後算明度；
    return srgbLightness(channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255);
  }
  // 具名顏色：transparent 與表外的名稱都是未知；
  const hex = NAMED_COLORS[(m[4] ?? '').toLowerCase()];
  // 表內才換算；
  return hex === undefined ? null : colorLightness(hex);
}

// 頁面是否「自帶深色配色」（12 頁抽樣檢查的失敗類別）：頂層（不在 @media 內）的 body／html 背景是深色「而且」文字色是淺色，或 color-scheme 為 dark。
// 這種頁面的卡片與文字色都是為深色底設計的，若抽掉 body 的背景與文字色換成主題的淺色，就會出現深色字配深色卡片，所以不能抽換共用樣式；
// 背景與文字值可以是字面顏色、漸層（取第一個顏色）或 var(--名稱[, 備用值])（用頂層 :root／html 的自訂屬性解析）；
// 背景深、文字也深代表內容放在自己的淺色卡片上（例如樣板頁的紫底白卡），不算；
// 值看不懂（未知）時不偵測：而且後面出現的未知宣告會覆蓋前面已知的宣告（最後一個宣告才是實際生效的）；無法解析的 CSS 回傳 false；
export function hasOwnDarkPalette(css: string): boolean {
  // 解析；
  let root: ReturnType<typeof postcss.parse>;
  // 失敗就當作不是；
  try {
    // postcss.parse 遇到語法錯誤會丟錯；
    root = postcss.parse(css);
  } catch {
    // 不丟出去；
    return false;
  }
  // 頂層 :root／html 的自訂屬性表，後面的覆蓋前面的；
  const vars = new Map<string, string>();
  // 是否有 color-scheme: dark；
  let schemeDark = false;
  // 只看直接在根底下的規則（不進 @media）；
  for (const node of root.nodes) {
    // 非規則略過；
    if (node.type !== 'rule') continue;
    // 選擇器清單；
    const sels = node.selectors.map((s) => s.trim());
    // :root 或 html 規則：收自訂屬性；
    if (sels.some((s) => s === ':root' || s === 'html')) {
      // 走訪宣告；
      node.each((child) => {
        // 自訂屬性收進表；
        if (child.type === 'decl' && child.prop.startsWith('--')) vars.set(child.prop, child.value);
      });
    }
    // 任一頂層 :root／html／body 規則宣告 color-scheme: dark；
    if (sels.some((s) => s === ':root' || s === 'html' || s === 'body')) {
      // 檢查宣告；
      node.each((child) => {
        // color-scheme 值含 dark 且不含 light（light dark 是跟隨系統，不算）；
        if (child.type === 'decl' && child.prop.toLowerCase() === 'color-scheme' && /\bdark\b/i.test(child.value) && !/\blight\b/i.test(child.value)) schemeDark = true;
      });
    }
  }
  // 有 color-scheme: dark 就算；
  if (schemeDark) return true;
  // 解析 var()：最多展開幾層，避免循環；
  const resolve = (value: string, depth = 0): string => {
    // 找第一個 var(--x 或 var(--x, 備用)；
    const m = /var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/.exec(value);
    // 沒有 var 或太深就原樣回傳（仍含 var 的值，colorLightness 會視為未知）；
    if (!m || depth > 5) return value;
    // 取表裡的值，沒有就用備用值；
    const replacement = vars.get(m[1]) ?? (m[2] ?? '').trim();
    // 換掉並繼續展開；
    return resolve(value.replace(m[0], replacement), depth + 1);
  };
  // 背景深且文字淺才算；
  let bgDark = false;
  let fgLight = false;
  for (const node of root.nodes) {
    // 只看規則；
    if (node.type !== 'rule') continue;
    // 選擇器含 body 或 html；
    if (!node.selectors.some((s) => s.trim() === 'body' || s.trim() === 'html')) continue;
    // 逐一檢查宣告；
    node.each((child) => {
      // 只看宣告；
      if (child.type !== 'decl') return;
      // 背景：解出明度；未知（null）時覆蓋成「不是深色」；
      if (/^background(-color)?$/i.test(child.prop)) {
        const lightness = colorLightness(resolve(child.value));
        bgDark = lightness !== null && lightness < DARK_BG_MAX;
      }
      // 文字色：同理，未知覆蓋成「不是淺色」；
      if (child.prop.toLowerCase() === 'color') {
        const lightness = colorLightness(resolve(child.value));
        fgLight = lightness !== null && lightness > LIGHT_FG_MIN;
      }
    });
  }
  // 兩者同時成立才算；
  return bgDark && fgLight;
}
