---
title: 訊號與電路基礎：連續／離散頻率、RLC 諧振頻寬、VCVS、CD4007 偏壓量測
type: topic-note
source: Gemini
category: 技術
tags: [gemini, 電子電路, 訊號處理, 取樣, 諧振, 頻寬, 相依電源, VCVS, CD4007, 量測]
sources:
  - https://gemini.google.com/app/96905190801f0291
  - https://gemini.google.com/app/7eaa6ea4a9438ea7
  - https://gemini.google.com/app/81db2c8dd65f08fe
  - https://gemini.google.com/app/c55344ee2b9a9e22
updated: 2026-08-29
---

# 訊號與電路基礎：連續／離散頻率、RLC 諧振頻寬、VCVS、CD4007 偏壓量測

> 本篇重點 a–s，共 19 個。四段 Gemini 對話合併：頻率符號 Ω 與 ω 的差別、RLC 串聯諧振與半功率頻寬、相依電源 VCVS、CD4007 差動對偏壓電流 I_B 的實務量測法。

---

## 重點整理

### 一、Ω 與 ω：連續時間頻率 vs 離散時間頻率

先把縮寫講清楚，避免只丟符號：

- <mark style="background: #ADCCFFA6;">Ω（大寫 Omega）＝ Analog Angular Frequency，類比角頻率</mark>，單位 rad/s（每秒轉過的弧度）。
- <mark style="background: #ADCCFFA6;">ω（小寫 omega）＝ Digital Angular Frequency，數位角頻率</mark>，單位 rad/sample（每一個取樣點之間轉過的弧度）。
- <mark style="background: #ADCCFFA6;">DSP ＝ Digital Signal Processing，數位訊號處理</mark>。
- <mark style="background: #ADCCFFA6;">Nyquist Theorem ＝ 奈奎斯特取樣定理</mark>，說明取樣率必須至少是訊號最高頻率的兩倍。

(a) <mark style="background: #FFF3A3A6;">兩者的差別不在「符號長得不一樣」，而在定義域</mark>：Ω 的定義域是 (−∞, ∞)，ω 的定義域被壓縮在 [−π, π]（或 [0, 2π]）。

(b) <mark style="background: #FFF3A3A6;">離散頻率 ω 具有 2π 的週期性</mark>，連續頻率 Ω 則不具週期性。這是因為離散序列只在整數取樣點上有值，e^(jωn) 在 ω 與 ω+2π 時完全等價，取樣點看不出差別。

(c) 兩者的轉換關係為 <mark style="background: #FFF3A3A6;">ω ＝ Ω · T_s ＝ Ω / f_s</mark>，其中 T_s 是取樣週期、f_s 是取樣頻率。所以離散頻率是被「歸一化（normalized）」過的量。

(d) <mark style="background: #FF5582A6;">離散頻率有上限，超過 π 就發生頻譜混疊（Aliasing）</mark>：ω ＝ π 對應到 f_s / 2，也就是 Nyquist 頻率。超過之後高頻訊號會被誤判成低頻，波形看起來像另一個訊號。

(e) 對照表整理如下：

| 特性 | 連續時間 Ω | 離散時間 ω |
| --- | --- | --- |
| 訊號類型 | 類比訊號 Analog | 離散／數位訊號 Discrete／Digital |
| 定義域 | (−∞, ∞) | [−π, π] 或 [0, 2π] |
| 週期性 | 不具週期性 | 具 2π 週期性 |
| 物理意義 | 每秒轉過的弧度 | 每個取樣點之間轉過的弧度 |
| 單位 | rad/s | rad/sample |

(f) <mark style="background: #D2B3FFA6;">補充易混淆點</mark>：演算法複雜度裡的 Ω(n) 是完全不同的東西，那是漸進分析的 <mark style="background: #ADCCFFA6;">Lower Bound，下界</mark>，代表「至少需要多少時間」，跟訊號處理的角頻率毫無關係。看到 Ω 要先確認上下文是訊號處理還是演算法。

---

### 二、RLC 串聯電路：諧振、半功率點與頻寬

- <mark style="background: #ADCCFFA6;">RLC ＝ Resistor（電阻）、Inductor（電感）、Capacitor（電容）三種被動元件組成的電路</mark>。
- <mark style="background: #ADCCFFA6;">Resonance ＝ 諧振</mark>，指電感抗與電容抗互相抵消、電路呈純電阻性的那個頻率點。
- <mark style="background: #ADCCFFA6;">Bandwidth ＝ 頻寬</mark>，兩個半功率點之間的頻率差。

(g) 串聯 RLC 的平均功率為 <mark style="background: #FFF3A3A6;">P(ω) ＝ ½ · I² · R</mark>。當發生諧振（頻率為 ω₀）時電流達到最大值 I_m ＝ V_m / R，此時功率也最大：P(ω₀) ＝ ½ · V_m² / R。

(h) <mark style="background: #FFF3A3A6;">半功率頻率（Half-Power Frequency）ω₁ 與 ω₂ 定義為功率降到最大值一半的兩個頻率點</mark>，即 P(ω₁) ＝ P(ω₂) ＝ P(ω₀) / 2。

(i) 因為功率正比於電流平方，功率減半代表<mark style="background: #FFF3A3A6;">電流降到最大值的 1/√2 ≈ 0.707 倍</mark>。這就是圖表縱軸常標 0.707 · V_m / R 的由來。

(j) <mark style="background: #BBFABBA6;">頻寬 B ＝ ω₂ − ω₁</mark>。半功率點的一般式為：

```text
ω₁ = −R/(2L) + sqrt( (R/(2L))² + 1/(LC) )
ω₂ =  R/(2L) + sqrt( (R/(2L))² + 1/(LC) )
```

兩式相減可得 B ＝ R / L，這也是為什麼<mark style="background: #FFF3A3A6;">電阻越大、頻寬越寬、選擇性（Q 值）越差</mark>。

(k) <mark style="background: #ADCCFFA6;">dB ＝ decibel，分貝</mark>。電壓增益轉分貝的算式是 20·log₁₀(比值)，20·log₁₀(1/√2) ≈ −3.01 dB。<mark style="background: #FFF3A3A6;">所以半功率頻率又叫 −3 dB 頻率或截止頻率（Cutoff Frequency）</mark>，前端工程師在調濾波器、音訊 EQ 時看到的 −3dB 就是這個意思。

---

### 三、VCVS：電壓控制電壓源

- <mark style="background: #ADCCFFA6;">VCVS ＝ Voltage-Controlled Voltage Source，電壓控制電壓源</mark>。
- <mark style="background: #ADCCFFA6;">Dependent Source ＝ 相依電源</mark>，輸出值取決於電路中另一處的電壓或電流，共有四種（VCVS、VCCS、CCVS、CCCS）。
- <mark style="background: #ADCCFFA6;">Op-Amp ＝ Operational Amplifier，運算放大器</mark>。

(l) VCVS 的核心式子是 <mark style="background: #FFF3A3A6;">V_out ＝ μ · V_in</mark>，μ 是無單位的電壓增益常數。

(m) 理想特性：<mark style="background: #BBFABBA6;">輸入阻抗 R_in ＝ ∞（不從控制端抽電流）、輸出阻抗 R_out ＝ 0（輸出電壓不隨負載改變）</mark>。這兩個條件合起來就是「完美的緩衝器」。

(n) <mark style="background: #FFF3A3A6;">一個理想運算放大器本質上就是一個增益極高的 VCVS</mark>。主動濾波器（例如 Sallen-Key 拓撲）也用 VCVS 提供穩定增益並隔離前後級。

(o) 為什麼要學：做節點電壓法（Node Voltage）或網目電流法（Mesh Current）分析時，相依電源是模擬電晶體、Op-Amp 這類主動元件的核心等效模型；<mark style="background: #D2B3FFA6;">高輸入阻抗＋低輸出阻抗的組合可以防止訊號源被負載拉低（Loading Effect，負載效應）</mark>。

(p) <mark style="background: #D2B3FFA6;">畫法備註</mark>：電路圖中獨立電源畫成圓形，相依電源（含 VCVS）畫成菱形（Diamond），這是快速辨識的視覺線索。

---

### 四、CD4007 差動對：I_B 偏壓電流怎麼量

- <mark style="background: #ADCCFFA6;">CD4007 ＝ CMOS 積體電路，內含三對 NMOS／PMOS 電晶體，實驗課常用來自行接差動對</mark>。
- <mark style="background: #ADCCFFA6;">I_B ＝ Bias Current，偏壓電流</mark>，這裡指流過 MB 電晶體、供應差動對的尾電流。
- <mark style="background: #ADCCFFA6;">KCL ＝ Kirchhoff's Current Law，基爾霍夫電流定律</mark>，流入節點的電流總和等於流出的總和。

(q) <mark style="background: #BBFABBA6;">最推薦：間接量測法（壓降法）</mark>。依 KCL，I_B ＝ i_D1 + i_D2，操作步驟：

1. 用電表量 R_D1 兩端的電壓降，即 V_DD − V_O1。
2. 算第一路電流 i_D1 ＝ (V_DD − V_O1) / R_D1。
3. 同理算 i_D2 ＝ (V_DD − V_O2) / R_D2。
4. 兩者相加即為 I_B。

<mark style="background: #BBFABBA6;">優點是不必拆電路，也不會受電表內阻造成的 Burden Voltage（負擔電壓）影響精確度</mark>。

(r) <mark style="background: #FF5582A6;">直接串聯電流表是次選</mark>：必須把 MB 的 Source 與 V_SS 之間斷開（或把 M1、M2 的 Source 與 MB 的 Drain 節點斷開），電表切 mA 檔紅棒接近 Drain 側。<mark style="background: #FF5582A6;">CD4007 的電流通常只有 0.5 mA 左右，電表內阻會造成明顯誤差</mark>。

(s) 調可變電阻到 I_B ＝ 0.5 mA 的技巧：若 R_D1 ＝ R_D2 ＝ 10 kΩ 且電路平衡，則 i_D1 ＝ i_D2 ＝ 0.25 mA，R_D 上的壓降為 0.25 mA × 10 kΩ ＝ <mark style="background: #FFB8EBA6;">2.5 V</mark>。所以<mark style="background: #BBFABBA6;">只要一邊轉可變電阻、一邊量 V_O1 或 V_O2，調到等於 10 V − 2.5 V ＝ 7.5 V 即可</mark>，不需要真的去量電流。

---

## 關聯筆記（以及為什麼相關）

- [[LTspice-模擬卡死與漣波觀察]]：同一個電子電路資料夾。<mark style="background: #FFF3A3A6;">關聯原因</mark>：那篇在講 Op-Amp 電源腳沒接好導致模擬不收斂，本篇 (n) 說明「Op-Amp 就是一個高增益 VCVS」，正好補上那篇缺的等效模型觀念；另外那篇的「漣波要跑滿 16.67 ms 才看得到」與本篇 (a)(c) 的時間／頻率換算是同一組直覺。
- [[frontend-docs/css/CSS色彩空間-色相色度明度與Oklab-Oklch]]：<mark style="background: #D2B3FFA6;">關聯原因</mark>：色彩空間的「色相角度」與本篇的角頻率都是用弧度／角度描述週期性量，理解 2π 週期性有助於理解 hue 為什麼是 0–360 度繞一圈。
- [[計算機基礎]] 資料夾：<mark style="background: #D2B3FFA6;">關聯原因</mark>：(f) 提到的 Ω(n) 下界屬於演算法複雜度分析，同一個符號在兩個領域意義完全不同，是很典型的「縮寫撞名」陷阱。

---

## 相關練習題（LeetCode／NeetCode）

本篇屬電子電路與訊號處理，<mark style="background: #FF5582A6;">LeetCode／NeetCode 沒有直接對應的題目</mark>。最接近的是與「頻率、週期、視窗」概念相通的題型，可當作演算法面試的延伸練習：

- LeetCode 424. Longest Repeating Character Replacement — https://leetcode.com/problems/longest-repeating-character-replacement/ ：滑動視窗（Sliding Window），概念上等同訊號處理的「加窗分析」。
- LeetCode 239. Sliding Window Maximum — https://leetcode.com/problems/sliding-window-maximum/ ：固定視窗長度掃描序列，跟離散取樣序列的處理直覺一致。
- NeetCode Sliding Window 專區 — https://neetcode.io/practice ：整套視窗類題目的系統性練習。

至於 (f) 的 Big-O／Ω 下界觀念，建議搭配 NeetCode 的複雜度分析章節一起複習。

---

## ⚠️ 存疑／更正

- Gemini 在 VCVS 那段輸出了未渲染的 LaTeX 殘留「零 (0 \Omega)」，正確寫法是 <mark style="background: #BBFABBA6;">0 Ω</mark>。內容本身正確，只是排版錯誤。
- Gemini 給的半功率點公式正確，但<mark style="background: #FFF3A3A6;">沒有點出相減後 B ＝ R / L 這個更好記的結論</mark>，本篇 (j) 已補上。
- 對話標題「HSPICE」的那則（app/aabe85329142254a）實際內容是 Hospice 安寧療護，與電子電路無關，<mark style="background: #FF5582A6;">屬語音輸入誤判造成的標題錯誤</mark>，已列入 skipped 不建檔。

---

## 各對話來源

### 連續與離散頻率符號差異（2026-08）— https://gemini.google.com/app/96905190801f0291

使用者：左邊的是連續的嗎右邊的是離散的？ 差在哪

Gemini：兩個都是希臘字母 Omega，大寫 Ω 是類比角頻率（rad/s，對應連續時間訊號），小寫 ω 是數位角頻率（rad/sample，對應取樣後的離散序列）。列出對照表：訊號類型、定義域（Ω 為 (−∞,∞)、ω 為 [−π,π]）、週期性（ω 具 2π 週期）、物理意義。說明離散頻率有上限是因為取樣頻率限制，依奈奎斯特理論最高只到 π（對應 f_s/2），超過會發生頻譜混疊。轉換式為 ω ＝ Ω·T_s ＝ Ω/f_s。補充：演算法複雜度中的 Ω(n) 是下界（Lower Bound），與角頻率無關。

### RLC 串聯電路諧振與頻寬（2026-08）— https://gemini.google.com/app/7eaa6ea4a9438ea7

使用者：（貼上投影片照片）解釋

Gemini：說明 RLC 串聯電路的諧振與頻寬。平均功率 P(ω) ＝ ½I²R，諧振時電流最大 I_m ＝ V_m/R，功率最大 P(ω₀) ＝ ½·V_m²/R。ω₁、ω₂ 為半功率點（截止頻率），功率為最大值的一半、電流為最大值的 1/√2 ≈ 0.707 倍。頻寬 B ＝ ω₂ − ω₁。給出半功率點一般式 ω₁ ＝ −R/(2L) + sqrt((R/(2L))² + 1/(LC))、ω₂ ＝ R/(2L) + sqrt((R/(2L))² + 1/(LC))。補充投影片手寫的 20·log(1/√2) 就是 −3 dB，故半功率頻率又稱 −3dB 頻率。

使用者：教我算術平均數的公式幫我複習（此段偏基礎統計複習，與電路主題無關，未納入重點整理）

### 電壓控制電壓源 VCVS 介紹（2026-08）— https://gemini.google.com/app/81db2c8dd65f08fe

使用者：電子學的 VCVS 是什麼意思

Gemini：VCVS ＝ Voltage-Controlled Voltage Source，中文「電壓控制電壓源」，是四種理想相依電源之一。輸出電壓與控制電壓成正比：V_out ＝ μ·V_in，μ 為無單位增益常數。理想輸入阻抗無限大、輸出阻抗為零。應用：理想運算放大器本質上就是高增益 VCVS；主動濾波器的 Sallen-Key 拓撲用它提供穩定增益並隔離前後級；高輸入低輸出阻抗可避免負載效應。學習價值：節點電壓法／網目電流法分析時，相依電源是模擬電晶體與 Op-Amp 的核心等效模型。

使用者：他的圖形長怎樣

Gemini：電路圖中 VCVS 用菱形（Diamond）表示，與獨立電源的圓形不同，代表它是相依電源。

### CD4007 I_B 量測方法（2026-08）— https://gemini.google.com/app/c55344ee2b9a9e22

使用者：（附電路圖）這個 cd4007，ib 怎麼量

Gemini：最直接且精準的方法不是串聯三用電表，而是壓降法。方法一（推薦，間接量測）：依 KCL，I_B ＝ i_D1 + i_D2；量 R_D1 兩端壓降 V_DD − V_O1，算 i_D1 ＝ (V_DD − V_O1)/R_D1，同理算 i_D2，相加即得；優點是不必拆電路、不受電表內阻（Burden Voltage）影響。方法二（直接量測）：把 MB 的 Source 與 V_SS 斷開，或斷開 M1、M2 的 Source 與 MB 的 Drain 節點，電表切 mA 檔；但 CD4007 電流僅約 0.5 mA，內阻易造成誤差。方法三（調可變電阻技巧）：若 R_D1 ＝ R_D2 ＝ 10 kΩ、電路平衡，I_B ＝ 0.5 mA 時 i_D1 ＝ i_D2 ＝ 0.25 mA，R_D 壓降 2.5 V，因此只要調到 V_O1 或 V_O2 ＝ 7.5 V（＝ 10 V − 2.5 V）即可。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| Gemini 對話：連續與離散頻率符號差異 | https://gemini.google.com/app/96905190801f0291 | 對話 2026-08，整理於 2026-08-29 |
| Gemini 對話：RLC 串聯電路諧振與頻寬 | https://gemini.google.com/app/7eaa6ea4a9438ea7 | 對話 2026-08，整理於 2026-08-29 |
| Gemini 對話：電壓控制電壓源 VCVS 介紹 | https://gemini.google.com/app/81db2c8dd65f08fe | 對話 2026-08，整理於 2026-08-29 |
| Gemini 對話：CD4007 I_B 量測方法 | https://gemini.google.com/app/c55344ee2b9a9e22 | 對話 2026-08，整理於 2026-08-29 |
| Nyquist–Shannon 取樣定理（外部佐證） | https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem | 定理本身為 1949 年成果，條目持續更新 |
| Dependent source 相依電源（外部佐證） | https://en.wikipedia.org/wiki/Dependent_source | 條目持續更新 |
| CD4007 資料手冊（Texas Instruments，外部佐證） | https://www.ti.com/product/CD4007 | TI 官方產品頁，規格以官網為準 |
| RLC 電路與 Q 值、頻寬（外部佐證） | https://en.wikipedia.org/wiki/RLC_circuit | 條目持續更新 |

> 註：外部連結為概念佐證用，實際數值請以課本、實驗講義與原廠 datasheet 為準。本次執行因本機磁碟空間吃緊，未額外擷取新截圖。
