// 把 html 筆記自己寫死的「淺色表面色、深灰文字色、淺灰邊線」換成共用主題變數，讓深淺色模式都看得清楚；
// 螢光筆色（有彩度的黃、藍、粉…）與頁面自己的深色底一律不動：它們不是「頁面表面」，換了反而會讓字看不見；
// 匯入 postcss：解析 CSS，改完值再輸出時其餘格式（空白、註解、順序）原樣保留；
import postcss from 'postcss';
// 匯入 culori：parse 把各種色彩寫法（#fff、rgb()、white…）解析成色彩物件，oklch 轉成感知均勻的明度／彩度／色相；
import { oklch, parse, rgb, wcagContrast } from 'culori';

// 一個色彩寫法的感知特徵；
type Tone = { l: number; c: number; a: number };

// 轉換結果：新字串與改了幾個宣告；
export type UnifyResult = { text: string; changes: number };

// 把單一 token（例如 #fff）解析成明度 l、彩度 c、透明度 a；解析不了（像 solid、1px）回傳 undefined；
function toneOf(token: string): Tone | undefined {
  // culori 的 parse 認不得的字串回傳 undefined；
  const parsed = parse(token);
  // 不是顏色就結束；
  if (parsed === undefined) return undefined;
  // 轉成 oklch；
  const lch = oklch(parsed);
  // 轉換失敗就結束；
  if (lch === undefined) return undefined;
  // c 對純灰色可能是 undefined（沒有色相），視為 0；alpha 沒寫就是 1（完全不透明）；
  return { l: lch.l, c: lch.c ?? 0, a: lch.alpha ?? 1 };
}

// 以空白切開 CSS 值，但括號裡的空白不切（rgb(255, 255, 255) 要保持一個 token）；
function splitTokens(value: string): string[] {
  // 結果陣列；
  const out: string[] = [];
  // 目前累積的 token 與括號深度；
  let cur = '';
  let depth = 0;
  // 逐字處理；
  for (const ch of value) {
    // 左括號深度加一；
    if (ch === '(') depth += 1;
    // 右括號深度減一；
    if (ch === ')') depth -= 1;
    // 括號外的空白是分隔點；
    if (/\s/.test(ch) && depth === 0) {
      // 有累積內容才收；
      if (cur !== '') out.push(cur);
      // 重新累積；
      cur = '';
    } else {
      // 其餘字元累加；
      cur += ch;
    }
  }
  // 收最後一個；
  if (cur !== '') out.push(cur);
  // 回傳；
  return out;
}

// 背景色：不透明、很亮、近乎無彩（白、米白、淡灰、淡藍灰）才換；明度 0.975 以上用 --card，其餘用 --soft；
function mapSurface(token: string): string | undefined {
  // 解析；
  const t = toneOf(token);
  // 不是顏色，或太透明（半透明遮罩不是表面），或有明顯彩度（螢光筆、狀態色）就不換；
  if (t === undefined || t.a < 0.85 || t.l < 0.9 || t.c > 0.045) return undefined;
  // 明度 0.90 到 0.93 的只收「幾乎純灰」（彩度 0.02 以下，例如 #e8e7e5 的淡灰底）；再有彩度的淡色多半是刻意的色調，不收；
  if (t.l < 0.93 && t.c > 0.02) return undefined;
  // 最亮的白色系用卡片底色，其餘淡色用淡底色；
  return t.l >= 0.975 ? 'var(--card)' : 'var(--soft)';
}

// 文字色：不透明、深、近乎無彩的灰才換；明度 0.36 以下用 --ink，0.36 到 0.55 用 --sub；
function mapText(token: string): string | undefined {
  // 解析；
  const t = toneOf(token);
  // 不是顏色、太透明、太亮、有彩度（紅、藍、綠的強調字）都不換；
  if (t === undefined || t.a < 0.9 || t.l > 0.58 || t.c > 0.05) return undefined;
  // 深色用主要文字色，中等灰用次要文字色；
  return t.l <= 0.36 ? 'var(--ink)' : 'var(--sub)';
}

// 邊線色：不透明、中到亮、近乎無彩的淺灰才換成 --line；
function mapLine(token: string): string | undefined {
  // 解析；
  const t = toneOf(token);
  // 不是顏色、太透明、太暗（深色邊框是設計）、太亮（接近白的分隔線換了反而消失）、有彩度都不換；
  if (t === undefined || t.a < 0.85 || t.l < 0.78 || t.l > 0.975 || t.c > 0.045) return undefined;
  // 換成主題邊線色；
  return 'var(--line)';
}

// 補文字色用的固定色與深色模式的查詢字串；
const DARK_TEXT = 'oklch(0.22 0.03 260)';
const LIGHT_TEXT = 'oklch(0.96 0.01 258)';
const DARK_QUERY = '(prefers-color-scheme: dark)';
// 淺色卡片與深色卡片的近似底色（主題的 --card 兩種模式）：半透明螢光筆混在它們上面，算出實際看到的底色；
const LIGHT_BASE = '#f7f9fc';
const DARK_BASE = 'rgb(75,86,102)';

// 值裡有沒有「括號外」的逗號（多層背景）；rgba(1,2,3,.5) 裡的逗號不算；
function hasTopLevelComma(value: string): boolean {
  // 括號深度；
  let depth = 0;
  // 逐字掃；
  for (const ch of value) {
    // 進出括號；
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    // 括號外的逗號；
    if (ch === ',' && depth === 0) return true;
  }
  // 沒有；
  return false;
}

// 是不是複合背景（多層、url、漸層）：這種沒有單一明度，不處理；
function isComplexBackground(value: string): boolean {
  // 多層、url()、漸層任一個；
  return hasTopLevelComma(value) || /url\(|gradient/i.test(value);
}

// 規則的單色實體背景：回傳明度 l 與透明度 a 以及原色；沒有或不是單色就回傳 undefined；
type LiteralBg = { l: number; a: number; color: NonNullable<ReturnType<typeof rgb>> };
function literalBg(rule: postcss.Rule): LiteralBg | undefined {
  // 結果；
  let out: LiteralBg | undefined;
  // 掃背景宣告；
  rule.walkDecls(/^background(-color)?$/i, (decl) => {
    // 變數、複合背景不處理；
    if (/var\(/i.test(decl.value) || isComplexBackground(decl.value)) return;
    // 逐 token 找第一個能解析且夠不透明的顏色；
    for (const tok of splitTokens(decl.value)) {
      // 解析明度與透明度；
      const t = toneOf(tok);
      // 半透明太淡的（例如 5% 白）看不出底色，不處理；
      if (t === undefined || t.a < 0.3 || out !== undefined) continue;
      // 半透明又幾乎無彩（白或黑的玻璃、陰影遮罩）不是螢光筆，文字色不該為它改；
      if (t.a < 0.9 && t.c <= 0.045) continue;
      // 轉成 rgb 供混色；
      const c = parse(tok);
      // 解析失敗就略過；
      const converted = c === undefined ? undefined : rgb(c);
      if (converted === undefined) continue;
      // 記錄；
      out = { l: t.l, a: t.a, color: converted };
    }
  });
  // 回傳；
  return out;
}

// 半透明背景混在某個底色上之後，深字與淺字哪個對比高就用哪個；
function pickText(bg: LiteralBg, baseColor: string): string {
  // 底色轉 rgb；
  const base = rgb(parse(baseColor) ?? { mode: 'rgb', r: 1, g: 1, b: 1 });
  // 依透明度混色（瀏覽器在 sRGB 空間混合）；
  const mixed = { mode: 'rgb' as const, r: bg.color.r * bg.a + base.r * (1 - bg.a), g: bg.color.g * bg.a + base.g * (1 - bg.a), b: bg.color.b * bg.a + base.b * (1 - bg.a) };
  // 兩種字色對這個底的對比；
  const darkRatio = wcagContrast(mixed, parse(DARK_TEXT) ?? '#000');
  const lightRatio = wcagContrast(mixed, parse(LIGHT_TEXT) ?? '#fff');
  // 取較高者；
  return darkRatio >= lightRatio ? DARK_TEXT : LIGHT_TEXT;
}

// 有彩度、偏暗的文字色（深金、深藍、深紫）在深色卡片上對比不足：回傳同色相、明度提高到 0.80 的版本；不需要提亮就回傳 undefined；
function liftColor(token: string): string | undefined {
  // 解析明度、彩度、透明度；
  const t = toneOf(token);
  // 不是顏色、太透明、已經夠亮、幾乎無彩（灰色走 mapText）都不處理；
  if (t === undefined || t.a < 0.9 || t.l > 0.62 || t.c <= 0.05) return undefined;
  // 取色相；
  const parsed = parse(token);
  // 解析失敗就不處理；
  const lch = parsed === undefined ? undefined : oklch(parsed);
  // 沒有色相也不處理；
  if (lch === undefined || lch.h === undefined) return undefined;
  // 彩度上限 0.12，避免亮色太刺眼；
  return `oklch(0.80 ${Math.min(t.c, 0.12).toFixed(3)} ${lch.h.toFixed(0)})`;
}

// 在規則後面補（或更新）一個深色模式的文字色覆寫：@media (prefers-color-scheme: dark){ 同選擇器{ color: … } }；回傳改動數；
function setDarkColor(rule: postcss.Rule, value: string): number {
  // 下一個節點若已是我們補過的 @media，就只更新它；
  const next = rule.next();
  // 判斷是不是我們的 @media；
  const mine = next !== undefined && next.type === 'atrule' && (next as postcss.AtRule).name === 'media' && (next as postcss.AtRule).params === DARK_QUERY;
  // 已有：更新裡面的 color；
  if (mine) {
    // 改動數與是否找到；
    let n = 0;
    let found = false;
    // 找裡面的 color 宣告；
    (next as postcss.AtRule).walkDecls('color', (d) => { found = true; if (d.value !== value) { d.value = value; n += 1; } });
    // 找不到就補；
    if (!found) { (next as postcss.AtRule).append(postcss.rule({ selector: rule.selector, nodes: [postcss.decl({ prop: 'color', value })] })); n += 1; }
    // 回傳；
    return n;
  }
  // 沒有：新建 @media，裡面放同一個選擇器的 color；
  const media = postcss.atRule({ name: 'media', params: DARK_QUERY });
  // 放規則；
  media.append(postcss.rule({ selector: rule.selector, nodes: [postcss.decl({ prop: 'color', value })] }));
  // 插在原規則後面；
  rule.after(media);
  // 一個改動；
  return 1;
}

// 把一個值裡的每個 token 逐一用 mapper 換；回傳新字串與是否有變；
function mapTokens(value: string, mapper: (token: string) => string | undefined): { value: string; changed: boolean } {
  // 切 token；
  const tokens = splitTokens(value);
  // 是否有任何 token 被換；
  let changed = false;
  // 逐一換；
  const next = tokens.map((tok) => {
    // 已經是 var()、關鍵字等就不處理；
    if (tok.startsWith('var(')) return tok;
    // 嘗試換；
    const mapped = mapper(tok);
    // 有換就記錄；
    if (mapped !== undefined) changed = true;
    // 沒換回原樣；
    return mapped ?? tok;
  });
  // 回傳；
  return { value: changed ? next.join(' ') : value, changed };
}

// 次要文字色：不透明、中等明度（0.3 到 0.75）、近乎無彩的灰，換成 --sub；專門給 --muted 這類「次要文字」變數用（它們是頁面表面上的說明字，不會放在深色程式碼底上）；
function mapMuted(token: string): string | undefined {
  // 解析；
  const t = toneOf(token);
  // 不是顏色、太透明、太亮或太暗、有彩度都不換；
  if (t === undefined || t.a < 0.9 || t.l < 0.3 || t.l > 0.75 || t.c > 0.05) return undefined;
  // 換成主題的次要文字色；
  return 'var(--sub)';
}

// 自訂屬性名稱的用途猜測：名稱帶這些字的才視為背景／文字／次要文字／邊線；猜不出來就不動，避免把「深色程式碼底」當成文字色換掉；
const BG_NAME = /(bg|background|card|panel|surface|paper|soft|white|chip)/i;
const INK_NAME = /(ink|text|fg|foreground|body-color)/i;
const MUTED_NAME = /(muted|dim|faint|subtle|gray|grey|(^|-)sub($|-))/i;
const LINE_NAME = /(line|border|divider|rule)/i;

// 主函式：轉換一段 CSS 文字；解析失敗就原樣回傳（changes 為 0）；
export function unifyCssColors(css: string): UnifyResult {
  // 解析成語法樹；
  let root: postcss.Root;
  // try/catch：壞掉的 CSS 不處理；
  try {
    root = postcss.parse(css);
  } catch {
    return { text: css, changes: 0 };
  }
  // 改了幾個宣告；
  let changes = 0;
  // 逐條規則處理（at-rule 裡的規則也會被走訪到）；
  root.walkRules((rule) => {
    // 這條規則有沒有「換不掉的實體背景」（螢光筆色、漸層、深色底）：有的話文字色就不能換，兩者是成對設計的；
    let hasLiteralBg = false;
    // 先掃一遍背景宣告；
    rule.walkDecls(/^background(-color|-image)?$/i, (decl) => {
      // 取值並去空白；
      const v = decl.value.trim().toLowerCase();
      // 關鍵字或已經是變數：不算實體背景；
      if (v === 'none' || v === 'transparent' || v === 'inherit' || v === 'initial' || v === 'unset' || v.startsWith('var(')) return;
      // 單一顏色且會被換成表面變數：不算；
      if (mapSurface(decl.value.trim()) !== undefined) return;
      // 其餘（有彩度的色、漸層、圖片）算實體背景；
      hasLiteralBg = true;
    });
    // 這條規則的背景是不是主題的螢光筆變數（var(--hl-warn)、var(--hl-core)…）：這些底色在深色模式會變暗，頁面寫死的深字就會看不見；
    // 用物件包起來：TypeScript 對「在回呼裡才賦值的 let 變數」會誤判成永遠 undefined，改成物件屬性就不會；
    const hl: { name?: string } = {};
    // 掃背景宣告，取出 --hl- 後面的名稱；
    rule.walkDecls(/^background(-color)?$/i, (decl) => {
      // 比對 var(--hl-名稱)；
      const m = /^var\(--hl-([a-z]+)\)/i.exec(decl.value.trim());
      // 有就記下；
      if (m) hl.name = m[1].toLowerCase();
    });
    // 動畫關鍵影格（from、50%、to）不是一般規則，不處理；
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test((rule.parent as postcss.AtRule).name)) return;
    // 深色模式提亮的字色（逐宣告時才會填）；用物件包起來避免 TypeScript 對回呼內賦值的誤判；
    const lift: { value?: string } = {};
    // 已經在 @media 裡的規則（包含我們自己補的深色覆寫）不再補，避免無限增生；
    const insideMedia = rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'media';
    // 逐一宣告處理；
    rule.walkDecls((decl) => {
      // 屬性名稱轉小寫；
      const prop = decl.prop.toLowerCase();
      // 背景：只處理單一顏色值；
      if (prop === 'background' || prop === 'background-color') {
        // 含逗號、url、漸層的複合背景不動；
        if (isComplexBackground(decl.value)) return;
        // 換；
        const r = mapTokens(decl.value, mapSurface);
        // 有變才寫回；
        if (r.changed) { decl.value = r.value; changes += 1; }
        return;
      }
      // 文字色：用 color 屬性（不含 background-color 這類，因為上面已經 return）；
      if (prop === 'color') {
        // 背景是主題螢光筆變數、文字卻寫死顏色：改成跟著模式走的螢光筆文字色（warn 有專用的 --hl-warn-ink，其餘用 --ink）；
        if (hl.name !== undefined) {
          // 目標值；
          const to = hl.name === 'warn' ? 'var(--hl-warn-ink)' : 'var(--ink)';
          // 已經是變數就不動，否則換；
          if (!decl.value.includes('var(')) { decl.value = to; changes += 1; }
          return;
        }
        // 同規則有實體背景就不動；
        if (hasLiteralBg) return;
        // 換；
        const r = mapTokens(decl.value, mapText);
        // 有變才寫回；
        if (r.changed) { decl.value = r.value; changes += 1; }
        // 沒換成變數：看看是不是需要在深色模式提亮的強調字；
        else lift.value = liftColor(decl.value.trim());
        return;
      }
      // 邊線：border、border-top…、border-color 都處理，逐 token 換顏色；
      if (/^border(-(top|right|bottom|left))?(-color)?$/.test(prop)) {
        // 換；
        const r = mapTokens(decl.value, mapLine);
        // 有變才寫回；
        if (r.changed) { decl.value = r.value; changes += 1; }
        return;
      }
      // 自訂屬性：依名稱猜用途；
      if (prop.startsWith('--')) {
        // 名稱像背景：換成表面變數；名稱像文字：換成文字變數；
        const mapper = BG_NAME.test(prop) ? mapSurface : INK_NAME.test(prop) ? mapText : MUTED_NAME.test(prop) ? mapMuted : LINE_NAME.test(prop) ? mapLine : undefined;
        // 猜不出來就不動；
        if (mapper === undefined) return;
        // 換；
        const r = mapTokens(decl.value, mapper);
        // 沒變就結束；
        if (!r.changed) return;
        // 換出來的變數就是自己（例如 --ink 換成 var(--ink)）會形成循環而失效：直接刪掉這條宣告，讓共用主題的同名變數生效；
        if (r.value.trim() === `var(${prop})`) decl.remove();
        // 否則寫回新值；
        else decl.value = r.value;
        // 計數；
        changes += 1;
      }
    });
    // 規則帶著「換不掉的實體單色背景」（螢光筆黃、藍、粉，或深色底）時，文字色要自己寫死，不能繼承上層：
    // 深色模式上層是淺字，淺字落在淺色螢光筆上就看不見；反過來半透明的粉紅螢光筆疊在深色卡片上會變暗，深字也看不見；
    // 單色背景（漸層、圖片、變數沒有單一明度，不處理）；
    const bg = literalBg(rule);
    // 這條規則的文字色宣告（沒有就是 undefined）；
    const colorDecl = rule.nodes.find((n): n is postcss.Declaration => n.type === 'decl' && n.prop.toLowerCase() === 'color');
    // 「我們先前補上的」文字色（固定深字、固定淺字、--ink）可以被改寫；頁面自己寫的顏色不碰；
    const ours = colorDecl === undefined || colorDecl.value === DARK_TEXT || colorDecl.value === LIGHT_TEXT || colorDecl.value === 'var(--ink)';
    // 只處理有單色背景、而且文字色是空的或我們補的；
    if (hasLiteralBg && bg !== undefined && ours) {
      // 不透明：亮底配固定深字、暗底配固定淺字，不隨模式改變；
      // 半透明：淺色模式的底是「螢光筆混在淺色卡片上」、深色模式是「混在深色卡片上」，兩邊各挑對比較高的字色；
      const light = bg.a >= 0.9 ? (bg.l >= 0.55 ? DARK_TEXT : LIGHT_TEXT) : pickText(bg, LIGHT_BASE);
      // 深色模式的字色；
      const dark = bg.a >= 0.9 ? light : pickText(bg, DARK_BASE);
      // 寫入淺色（預設）字色：已有就改值，沒有就補；值沒變就不算改動；
      if (colorDecl === undefined) { rule.append({ prop: 'color', value: light }); changes += 1; }
      else if (colorDecl.value !== light) { colorDecl.value = light; changes += 1; }
      // 深色模式字色不同時，在這條規則後面補一個 @media 覆寫；
      if (dark !== light) changes += setDarkColor(rule, dark);
    }
    // 寫死的「有彩度深色字」（金、藍、紫的強調字）在深色卡片上看不清楚：補一個深色模式覆寫，同色相、明度提高到 0.80；
    if (lift.value !== undefined && !insideMedia) changes += setDarkColor(rule, lift.value);
  });
  // 輸出；
  return { text: root.toString(), changes };
}

// 轉換整份 html：<style> 區塊與 style="…" 屬性；其餘位元組完全不動；
export function unifyHtmlColors(html: string): UnifyResult {
  // 總改動數；
  let total = 0;
  // 先處理 <style>…</style> 區塊；replace 的函式參數：整段、開頭標籤、內容、結尾標籤；
  let out = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_all, open: string, body: string, close: string) => {
    // 轉換內容；
    const r = unifyCssColors(body);
    // 累計；
    total += r.changes;
    // 組回；
    return open + r.text + close;
  });
  // 再處理行內 style="…"（雙引號）；把屬性包成 x{…} 當成一條規則轉換，再取出大括號內的文字；
  out = out.replace(/(\sstyle=")([^"]*)(")/gi, (_all, open: string, body: string, close: string) => {
    // 包成規則；
    const r = unifyCssColors(`x{${body}}`);
    // 沒改就原樣；
    if (r.changes === 0) return open + body + close;
    // 累計；
    total += r.changes;
    // 取出大括號內的內容；
    const inner = r.text.slice(2, -1);
    // 屬性值裡不能出現雙引號；
    return open + inner.replace(/"/g, "'") + close;
  });
  // 回傳；
  return { text: out, changes: total };
}
