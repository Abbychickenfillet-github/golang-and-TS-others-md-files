---
title: 進位制 — 二進制 / 十六進制 / 十進制、Bytes 與 RGB 顏色
type: topic-note
source: Gemini
tags: [gemini, 計算機基礎, 進位制, binary, hex, bytes]
sources:
  - https://gemini.google.com/app/d60ebf7c608541d8
updated: 2026-06-20
---

# 進位制 — 二進制 / 十六進制 / 十進制、Bytes 與 RGB 顏色

## 重點整理

### 1. 機器底層只吃二進制，十六進制是給人看的「漂亮外衣」
- 硬體核心（CPU、記憶體）由電晶體組成，最穩定只有兩種狀態：<mark style="background: #ADCCFFA6;">導通=1、截止=0</mark>。所有程式碼/影片/遊戲到 CPU 眼裡都是 `0101...`（機器碼 Machine Code）。
- 工程師很少直接寫十六進制；現代多寫高階語言（JS/Python/Go），由<mark style="background: #FFF3A3A6;">編譯器/直譯器這個「翻譯官」</mark>翻成二進制機器碼。
- 高階語言 ──編譯/解釋──> 機器碼（二進制 0/1）。

### 2. 為什麼到處是十六進制？因為它是二進制的完美縮寫
<mark style="background: #FFF3A3A6;">關鍵：因為 2⁴ = 16，每 4 個二進制位元(bits) 可以毫無誤差地縮寫成 1 個十六進制字元。</mark>

- 「4」指的是<mark style="background: #FF5582A6;">2 的「4 次方」</mark>（4 個開關有 2×2×2×2=16 種組合 → 對應 Hex 的 0~F），不是「4 倍」。連帶結果是字數長度縮短為 ¼（二進制字數是十六進制的 4 倍）。
- 記憶體最小定址單位是 <mark style="background: #ADCCFFA6;">1 Byte = 8 bits</mark>，剛好切兩半（4+4 bits），所以 1 Byte 用 2 個十六進制字元就能完美表達（`00`~`FF`）。Debug 看記憶體、設硬體暫存器時都看 Hex，不會去數那串 0/1。

### 3. 16 進制 → 10 進制（位數權重 = 16 的次方）
範例 `3F8₁₆`（F=15）：

```
3F8 = (3×16²) + (15×16¹) + (8×16⁰)
    = (3×256) + (15×16) + (8×1)
    = 768 + 240 + 8 = 1016
```

<mark style="background: #FFB8EBA6;">冷知識：`0x3F8` 正是早期 PC 架構中序列埠 COM1 的標準 I/O 基礎位址。</mark>

### 4. 二進制 → 十六進制：用「8-4-2-1」法則直接秒換
4 位元權重從右到左是 8、4、2、1。每組把是 1 的位置加起來即可，<mark style="background: #BBFABBA6;">不必先轉十進制</mark>。

| 二進位(4bit) | 加總 | Hex | | 二進位 | 加總 | Hex |
|---|---|---|---|---|---|---|
| 1001 | 9 | 9 | | 1100 | 12 | C |
| 1010 | 10 | A | | 1101 | 13 | D |
| 1011 | 11 | B | | 1110 | 14 | E |
| | | | | 1111 | 15 | F |

步驟：①從**最右邊**每 4 個切一組，最左不滿 4 位就**前面補 0**；②每組用 8-4-2-1 換成 1 個 Hex 字元。

- `11010111` → `1101`(D) `0111`(7) → **0xD7**
- `101110` → 補成 `0010`(2) `1110`(E) → **0x2E**

### 5. 顏色不是只有 256 個 —— 全彩 = 3 Bytes
- 1 Byte = 8 bits，<mark style="background: #FFB8EBA6;">2⁸ = 256</mark> → 若只用 1 Byte 表示顏色就只有 256 色（早期 GIF / 復古遊戲的「256 色限制」，範圍 `00`~`FF`）。
- 現代全彩(True Color, 24-bit) 用 <mark style="background: #ADCCFFA6;">RGB 三原色，各佔 1 Byte（256 種亮度）</mark>：

```
256 × 256 × 256 = 256³ = 16,777,216 種顏色（約 1680 萬色）
```

- 網頁 Hex 色碼就是把 3 Bytes 排一起 → 6 碼：`#FF5733` = R(FF) G(57) B(33)。`#FFFFFF` 三原色全開到最亮=白；`#000000` 全關=黑。

### 6. 四大進位英文簡寫（術語）
<mark style="background: #ADCCFFA6;">Bin</mark>(Binary 二進位 0/1)、<mark style="background: #ADCCFFA6;">Oct</mark>(Octal 八進位 0~7，少用)、<mark style="background: #ADCCFFA6;">Dec</mark>(Decimal 十進位)、<mark style="background: #ADCCFFA6;">Hex</mark>(Hexadecimal 十六進位)。

## 各對話來源

### 16進制3F8轉10進制（2026-06）— https://gemini.google.com/app/d60ebf7c608541d8

**使用者：** `3F8` 從 16 進制到 10 進制是 1016？
**Gemini：** 正確。驗算 `(3×256)+(15×16)+(8×1)=1016`；補充 `0x3F8` 是 COM1 序列埠 I/O 基礎位址。

**使用者：** 電腦科學中程式碼都是 16 進制嗎？但機器底層是 2 進制？
**Gemini：** 機器底層只吃二進制（電晶體導通/截止=1/0），十六進制是人類為了好讀的縮寫；現代寫高階語言由編譯器翻成機器碼。十六進制無所不在是因為它是二進制完美縮寫（2⁴=16，每 4 bits→1 Hex；1 Byte=8 bits→2 Hex）。

**使用者：** 「每四個二進制位元」是指 2 的 4 次方的 4，還是 4 倍的 4？
**Gemini：** 最直接源頭是「2 的 4 次方=16」；結果是長度縮短為 ¼ 倍。例：`1010 1111 0011 1000`(16字元) → `AF38`(4字元)。

**使用者：** 顏色只有 256 個嗎？（請把 bytes 關係合進去）
**Gemini：** 不只。1 Byte=256 種（早期 256 色）；現代全彩用 RGB 3 Bytes，256³=16,777,216 色。網頁 6 碼 Hex 即 R/G/B 各 1 Byte，`#FFFFFF`=白、`#000000`=黑。

**使用者：** 但二進制怎麼轉十六進制？Decimal 是十進位的意思嗎？
**Gemini：** Decimal=十進位(Dec)。用 8-4-2-1 法則：每 4 bits 一組（左側不足補 0），各組相加換成 Hex。範例 `11010111`→`0xD7`、`101110`→`0x2E`。並附 Bin/Oct/Dec/Hex 四大簡寫。
