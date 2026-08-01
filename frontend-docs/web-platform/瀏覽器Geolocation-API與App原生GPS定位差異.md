---
title: 瀏覽器 Geolocation API 與 App 原生 GPS 定位差異
type: topic-note
source: Gemini
category: 技術
tags: [gemini, web-platform, geolocation, gps, 瀏覽器api]
sources:
  - https://gemini.google.com/app/7bc4533c9a7e90a0
updated: 2026-07-25
---

# 瀏覽器 Geolocation API 與 App 原生 GPS 定位差異

本篇重點 a–h，共 8 個。

## 重點整理

(a) 網頁版定位比 App 版差，核心原因是<mark style="background: #ADCCFFA6;">「取得定位權限」與「底層技術」本質不同</mark>——即使同一支手機，網頁版 Google Maps 拿到的定位精準度與更新頻率通常還是輸給原生 App。

(b) <mark style="background: #FFF3A3A6;">手機 App 屬於高權限</mark>：可直接存取手機內建 GPS 晶片、陀螺儀、電子羅盤，甚至用周圍 Wi-Fi 基地台與電信基地台做多重三角定位（A-GPS）。

(c) <mark style="background: #FFF3A3A6;">瀏覽器網頁屬於低權限</mark>：出於隱私與資安限制，透過 HTML5 Geolocation API 取得定位時通常無法直接呼叫底層高頻率的原生 GPS 晶片，拿到的是系統包裝過、頻率較低的估算位置。

(d) <mark style="background: #FF5582A6;">網頁常退而求其次用 IP 位址定位</mark>，IP 的位置通常是電信商機房或出入口，會造成定位偏移數公里到數十公里；網頁版也缺少硬體羅盤輔助，難以即時捕捉移動方向。

(e) <mark style="background: #D2B3FFA6;">抓取頻率不同</mark>：App 可在背景持續追蹤並用感測器動態平滑演算（測算移動速度與方向）；網頁通常只在開啟頁面或點擊定位按鈕時發送一次性請求，資訊常是延遲或過時的。

(f) 「預估店家距離」誤差的連鎖反應：<mark style="background: #FF5582A6;">起點（你的位置）先被抓錯</mark> → 有些簡易網頁版只算兩點間「直線距離（Haversine 公式）」而非實際道路路線 → 若拿到的起點不精準，規劃出的距離就會嚴重歪斜。

(g) <mark style="background: #BBFABBA6;">改善網頁版定位準確度的做法</mark>：在手機/電腦「設定 → 隱私權」開啟瀏覽器的「精確定位」權限；地圖右下角有「瞄準圖示（顯示我的位置）」，重新點擊可強制瀏覽器重新撈取最新座標。

(h) 延伸：這個機制解釋也適用於理解 <mark style="background: #D2B3FFA6;">HTML5 Geolocation API 在網頁開發中的定位</mark>，屬於瀏覽器提供的裝置能力 API 之一，與 [[HTML5演進-Quirks-Mode與HTML5-API]] 中的 HTML5 API 概念相關聯——都是「瀏覽器把裝置硬體能力包裝成 JS 可呼叫介面」的例子，只是 Geolocation 精度受限於瀏覽器安全沙盒。

## 各對話來源

### 網頁定位差於App原因(2026-07-25)— https://gemini.google.com/app/7bc4533c9a7e90a0

使用者：為什麼網頁的定位會比 Google maps 軟體 app 還差？網頁看的預估店家距離有誤

Gemini：這主要是因為網頁版與手機 App 在「取得定位權限」與「底層技術」上有本質上的不同。即使同一支裝置，網頁版 Google Maps 拿到的定位資料，精準度與更新頻率通常還是會輸給原生 App。核心原因：(1) 存取硬體權限的層級不同——手機 App（高權限）可以直接存取手機內建的 GPS 晶片、陀螺儀、電子羅盤，甚至能拿周圍 Wi-Fi 基地台與電信基地台做多重三角定位（A-GPS）；瀏覽器網頁（低權限）出於隱私與資安限制，透過 HTML5 Geolocation API 取得定位時通常無法直接呼叫底層高頻率的原生 GPS 晶片，拿到的通常是經過系統包裝、頻率較低的估算位置。(2) 定位依賴的數據來源不同——網頁常退而求其次使用 IP 位址或快取的 Wi-Fi 資訊，IP 的位置通常是電信商機房或出入口，會導致定位直接偏移數公里到數十公里；也沒有硬體羅盤輔助，難以即時捕捉方向。(3) 抓取頻率與背景更新機制不同——App 可在背景持續追蹤並結合感測器數據做動態平滑演算；網頁通常只在開啟網頁或點擊定位按鈕時發送一次性廣播請求，資訊往往延遲或過時。為什麼預估店家距離有誤：起點抓錯（定位在電信機房或隔壁街區）+ 有些簡易網頁版只算兩點間直線距離（Haversine 公式）而非實際道路路線 + 圖資更新與轉向限制，導致路徑距離嚴重歪斜。如何改善：開啟瀏覽器的精確定位權限（手機/電腦「設定」→「隱私權」），並在地圖右下角找「瞄準圖示（顯示我的位置）」重新點擊一次，強制瀏覽器重新撈取最新座標。

## 資料來源(含查證時間)

| 主題 | 連結 | 版本/時間 |
|---|---|---|
| 瀏覽器定位 vs App 原生 GPS 原始對話 | https://gemini.google.com/app/7bc4533c9a7e90a0 | 2026-07-25 查證 |
| HTML5 Geolocation API 規範(外部來源) | https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API | Gemini 回覆未附版本號，建議日後自行核對 MDN 頁面更新時間 |
