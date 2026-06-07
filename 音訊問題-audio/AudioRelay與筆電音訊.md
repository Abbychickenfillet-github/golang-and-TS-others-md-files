# AudioRelay 與筆電音訊問題

> 背景：筆電內建音效裝置故障，原本想靠外接螢幕輸出聲音，但螢幕在音效設定裡沒有出現成輸出裝置。目前系統預設輸出是 **Virtual Speakers（AudioRelay 的虛擬裝置）**。

## 🎧 AudioRelay 是什麼

AudioRelay 是一套「在裝置之間串流音訊」的軟體（PC 端 + 手機 App）。核心用途：

- **PC 聲音 → 手機**：把手機變成電腦的無線喇叭，PC 音訊透過 Wi-Fi 或 USB 即時傳到手機播放，延遲比藍牙低。
- **手機當麥克風 → PC**：用手機的麥克風當電腦的輸入裝置。
- **跨裝置串流**：手機音訊放到 PC 播、或分享給另一台 Android。

### 運作方式
1. PC 裝「server」、手機裝 App。
2. 兩台在「同一個區域網路」時，手機 App 會自動找到 PC server。
3. 連線方式：Wi-Fi（方便）或 USB tethering（延遲最低）。
4. 它用音訊壓縮降低網路流量，體驗通常比藍牙好。

它在 PC 上會建立一個**虛擬輸出裝置 `Virtual Speakers`**，系統把聲音送進這個虛擬裝置，再由 AudioRelay 轉送到手機 —— 這就是為什麼你的音效設定裡預設輸出是「Virtual Speakers for AudioRelay」。

## 🔍 我的情況對照

| 項目 | 現況 |
|---|---|
| 筆電內建音效 | Realtek(R) Audio，故障 |
| 外接螢幕音訊 | 音效設定中**沒有**出現（沒喇叭／線材不帶音訊／驅動問題） |
| 目前預設輸出 | Virtual Speakers（走 AudioRelay 串到手機） |
| 等於 | 我其實已經在用 AudioRelay 當「把聲音丟到手機」的替代方案 |

## ✅ 解法選項（可長期參考）

1. **最穩、最省事**：用 **USB 耳機 / USB 音效 dongle / 藍牙耳機** —— 這些會建立「自己的音訊裝置」，完全繞過故障的 Realtek 晶片。
   - ⚠️ 注意：**有線 3.5mm 插筆電孔沒用**，因為那個孔也是走故障的 Realtek。
2. **螢幕輸出音訊**（只有在以下都成立才可行）：
   - 螢幕本身有喇叭或 3.5mm 耳機孔，且
   - 用 **HDMI / DisplayPort / USB-C** 連接（**VGA、DVI 不帶音訊**），且
   - Windows 音效設定看得到該裝置 → 若驅動被停用，可在「裝置管理員」重新啟用。
3. **維持 AudioRelay**：把手機當無線喇叭繼續用（現狀）。

## 🔗 相關
- 同資料夾後續可放：裝置管理員排查筆記、螢幕型號與連接埠規格

## 來源
- [AudioRelay 官網](https://audiorelay.net/)
- [Send audio from Windows（官方文件）](https://audiorelay.net/docs/windows/stream-audio-from-your-pc-to-your-phone)
- [AudioRelay 文件](https://audiorelay.net/docs)
