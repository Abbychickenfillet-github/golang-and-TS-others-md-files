// @vitest-environment node
// 上一行是 vitest 的檔案層級指令：本檔只測純字串，改用 node 環境；
// 從 vitest 匯入測試骨架；
import { describe, expect, it } from 'vitest';
// 匯入被測模組：顏色解析、感知明度與深色配色偵測（R39 從 parse-html.ts 拆出來的獨立模組）；
import { colorLightness, hasOwnDarkPalette } from '../src/lib/dark-palette';

// R39：深色配色偵測要看得懂 oklch()、oklab()、lab()、lch() 與少數具名顏色；看不懂的（var()、color-mix()、relative color）一律視為「未知」＝不偵測；
describe('colorLightness：把一段 CSS 值裡第一個顏色換成感知明度（0 黑到 1 白），未知回傳 null', () => {
  // oklch 的 L 直接就是明度，可寫成 0–1 的小數或百分比；
  it('oklch：小數與百分比的 L', () => {
    // 小數；
    expect(colorLightness('oklch(0.15 0.02 260)')).toBeCloseTo(0.15, 5);
    // 百分比；
    expect(colorLightness('oklch(15% 0.02 260)')).toBeCloseTo(0.15, 5);
    // 帶 alpha（忽略 alpha，只看明度）；
    expect(colorLightness('oklch(0.95 0 0 / 0.5)')).toBeCloseTo(0.95, 5);
    // 大小寫不分；
    expect(colorLightness('OKLCH(0.5 0.1 30)')).toBeCloseTo(0.5, 5);
  });

  // oklab 同樣；lab、lch 的 L 是 0–100，除以 100；
  it('oklab、lab、lch', () => {
    expect(colorLightness('oklab(0.2 0 0)')).toBeCloseTo(0.2, 5);
    expect(colorLightness('lab(20 5 5)')).toBeCloseTo(0.2, 5);
    expect(colorLightness('lch(90% 10 100)')).toBeCloseTo(0.9, 5);
  });

  // sRGB 系列：黑與白的兩端；
  it('hex、rgb、hsl 與具名顏色', () => {
    // 黑與白；
    expect(colorLightness('#000')).toBeCloseTo(0, 3);
    expect(colorLightness('#ffffff')).toBeCloseTo(1, 3);
    expect(colorLightness('rgb(0,0,0)')).toBeCloseTo(0, 3);
    expect(colorLightness('hsl(0,0%,100%)')).toBeCloseTo(1, 3);
    expect(colorLightness('black')).toBeCloseTo(0, 3);
    expect(colorLightness('WHITE')).toBeCloseTo(1, 3);
    // 常見深色與淺色具名顏色；
    expect(colorLightness('navy') as number).toBeLessThan(0.5);
    expect(colorLightness('midnightblue') as number).toBeLessThan(0.5);
    expect(colorLightness('whitesmoke') as number).toBeGreaterThan(0.9);
  });

  // 取第一個顏色（漸層）；
  it('漸層取第一個顏色', () => {
    expect(colorLightness('linear-gradient(180deg, oklch(0.1 0 0), #fff)') as number).toBeCloseTo(0.1, 5);
  });

  // 未知：var()、color-mix()、transparent、relative color、沒有顏色；
  it('未知回傳 null', () => {
    expect(colorLightness('var(--x)')).toBeNull();
    expect(colorLightness('color-mix(in oklch, red 40%, black)')).toBeNull();
    expect(colorLightness('transparent')).toBeNull();
    expect(colorLightness('oklch(from var(--c) l c h)')).toBeNull();
    expect(colorLightness('none')).toBeNull();
    expect(colorLightness('oklch(none 0 0)')).toBeNull();
  });
});

describe('hasOwnDarkPalette：新色彩語法', () => {
  // oklch 深底淺字：偵測到；
  it('oklch 深色 body 加淺色文字', () => {
    expect(hasOwnDarkPalette('body{background:oklch(0.15 0.02 260);color:oklch(0.95 0 0)}')).toBe(true);
    // 百分比；
    expect(hasOwnDarkPalette('body{background:oklch(15% 0.02 260);color:oklch(95% 0 0)}')).toBe(true);
    // 帶 alpha；
    expect(hasOwnDarkPalette('body{background:oklch(0.15 0.02 260 / 1);color:oklch(0.95 0 0 / 0.9)}')).toBe(true);
  });

  // oklch 淺底：不偵測；
  it('oklch 淺色 body 不算', () => {
    expect(hasOwnDarkPalette('body{background:oklch(0.97 0.01 260);color:oklch(0.25 0.02 260)}')).toBe(false);
    // 深底但文字也深（內容在自己的淺卡片上）：不算；
    expect(hasOwnDarkPalette('body{background:oklch(0.3 0.1 280);color:oklch(0.25 0.02 260)}')).toBe(false);
  });

  // 具名顏色；
  it('具名 black 與 white', () => {
    expect(hasOwnDarkPalette('body{background:black;color:white}')).toBe(true);
    expect(hasOwnDarkPalette('body{background:white;color:black}')).toBe(false);
    expect(hasOwnDarkPalette('body{background:navy;color:whitesmoke}')).toBe(true);
  });

  // 未知（無法解析的 var()、color-mix()）：視為未偵測；且後面的未知宣告覆蓋前面的已知宣告；
  it('未知值不偵測', () => {
    expect(hasOwnDarkPalette('body{background:var(--nope);color:#fff}')).toBe(false);
    expect(hasOwnDarkPalette('body{background:color-mix(in oklch,black 90%,white);color:#fff}')).toBe(false);
    // 前面是深色，後面被未知值覆蓋：以最後一個為準，未知＝不偵測；
    expect(hasOwnDarkPalette('body{background:#000;background:var(--bg);color:#fff}')).toBe(false);
  });
});
