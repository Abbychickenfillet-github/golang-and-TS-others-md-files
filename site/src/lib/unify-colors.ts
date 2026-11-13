// 把 html 筆記自己寫死的「淺色表面色、深灰文字色、淺灰邊線」換成共用主題變數，讓深淺色模式都看得清楚；
// 螢光筆色（有彩度的黃、藍、粉…）與頁面自己的深色底一律不動：它們不是「頁面表面」，換了反而會讓字看不見；
// 匯入 postcss：解析 CSS，改完值再輸出時其餘格式（空白、註解、順序）原樣保留；
import postcss from 'postcss';
// 匯入 culori：parse 把各種色彩寫法（#fff、rgb()、white…）解析成色彩物件，oklch 轉成感知均勻的明度／彩度／色相；
import { oklch, parse } from 'culori';

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
  if (t === undefined || t.a < 0.85 || t.l < 0.93 || t.c > 0.045) return undefined;
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
    // 逐一宣告處理；
    rule.walkDecls((decl) => {
      // 屬性名稱轉小寫；
      const prop = decl.prop.toLowerCase();
      // 背景：只處理單一顏色值；
      if (prop === 'background' || prop === 'background-color') {
        // 含逗號、url、漸層的複合背景不動；
        if (/[,]|url\(|gradient/i.test(decl.value)) return;
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
    // 規則帶著「換不掉的實體單色背景」（螢光筆黃、藍、粉，或深色底）卻沒寫自己的文字色：文字會繼承上層，深色模式時上層是淺字，
    // 淺字落在淺色螢光筆上就看不見；所以替它補一個固定的文字色：亮底配深字、暗底配淺字，不隨模式改變；
    if (hasLiteralBg && !rule.some((n) => n.type === 'decl' && n.prop.toLowerCase() === 'color')) {
      // 找出這條規則的單色實體背景（漸層與圖片沒有單一明度，不補）；
      let tone: Tone | undefined;
      // 掃背景宣告；
      rule.walkDecls(/^background(-color)?$/i, (decl) => {
        // 複合背景略過；
        if (/[,]|url\(|gradient|var\(/i.test(decl.value)) return;
        // 取第一個能解析且夠不透明的顏色 token；
        for (const tok of splitTokens(decl.value)) {
          // 解析；
          const t = toneOf(tok);
          // 半透明太淡的（例如 5% 白）看不出底色，不補；
          if (t !== undefined && t.a >= 0.3 && tone === undefined) tone = t;
        }
      });
      // 有找到就補文字色；
      if (tone !== undefined) {
        // 半透明底（例如 #ff5582a6）會透出下面的頁面色：淺色模式變淺、深色模式變暗，所以文字用跟著模式走的 --ink；
        // 不透明的亮底用固定深字、暗底用固定淺字，不隨模式改變；
        const t = tone as Tone;
        rule.append({ prop: 'color', value: t.a < 0.9 ? 'var(--ink)' : t.l >= 0.55 ? 'oklch(0.22 0.03 260)' : 'oklch(0.96 0.01 258)' });
        // 計數；
        changes += 1;
      }
    }
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
