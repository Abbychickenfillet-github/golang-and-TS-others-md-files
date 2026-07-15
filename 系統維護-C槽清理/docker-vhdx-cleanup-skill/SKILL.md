---
name: docker-vhdx-cleanup
description: >
  當 Windows C 槽因為 Docker 而爆滿時的清理 SOP:先清 Docker 內部(build cache /
  images / volumes),再用 diskpart compact 把「只長不縮」的 docker_data.vhdx 消氣,
  把空間真正還給 C 槽。適用情境:C 槽空間不足、Docker 佔用過大、Docker Desktop 顯示
  磁碟用量爆炸、想壓縮虛擬磁碟。觸發詞:「C 槽滿了」「清理 docker」「壓縮 vhdx」
  「docker 佔太多空間」「磁碟空間不足怎麼辦」。
---

# Docker vhdx 清理 SOP

目標:把 Docker 吃掉、且「刪了 Docker 內部也不會自動還」的 C 槽空間拿回來。
核心觀念:vhdx「只長不縮」——`prune` 清內容、`compact` 才消氣,兩步都要做。

## 步驟

### 0. 先量現況
提醒使用者用系統管理員開 CMD/PowerShell,執行:
```
fsutil volume diskfree C:
```
記下「可用位元組(GB)」,清理後好對比。

### 第一大部份:清 Docker 內部

依賴順序(container 會佔用 image/volume,所以先刪 container):
1. Docker Desktop → Containers → 停止並刪除不要的容器
2. Images / Volumes → 刪不要的(⚠️ 刪 volume = 資料不可逆,正在用的專案別刪)
3. 清 build cache(通常最大宗,可達 20GB+):
   ```
   docker builder prune -a
   ```

保留原則:正在運作的專案 image / volume(顯示綠點 in use)不要動。

### 第二大部份:compact vdisk(把空間還給 C 槽)

**前置(順序很重要):**
1. 完全退出 Docker Desktop(右下角圖示右鍵 Quit)
2. 關 WSL:
   ```
   wsl --shutdown
   ```
3. 確認關乾淨:
   ```
   wsl --list --running
   ```
   要顯示「沒有正在執行的發行版」才對(否則 vhdx 被鎖住,compact 會失敗)。

**找 vhdx 路徑(第一次):**
```
dir /s /b "%LOCALAPPDATA%\Docker\wsl\*.vhdx"
```
要 compact 的是 **`docker_data.vhdx`**(資料,肥),不是 `main\ext4.vhdx`(引擎,小)。

**用系統管理員開 CMD → diskpart,逐行執行(等號兩邊不能有空格):**
```
diskpart
select vdisk file="C:\Users\<使用者>\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
attach vdisk readonly
compact vdisk
detach vdisk
exit
```
- diskpart 不會展開 `%LOCALAPPDATA%`,要用完整路徑。
- `detach` 千萬別忘,忘了會害 Docker 下次開不起來(vhdx 一直被鎖)。

### 3. 驗收
再跑一次 `fsutil volume diskfree C:`,對比清理前後可用 GB。

## 常見錯誤

- **compact 報「檔案正由另一個程序使用」**:WSL 的 VM(Vmmem)還沒關。工作管理員關 Docker 程序不夠,一定要 `wsl --shutdown`。
- **在 diskpart 裡打 wsl / Optimize-VHD 沒反應**:提示字元是 `DISKPART>` 代表人還在 diskpart 內,要先 `exit`。
- **Docker 刪了空間卻沒變多**:那是 vhdx「只長不縮」,還沒 compact。

## 備註
- Optimize-VHD 需要 Hyper-V(專業版),家用版一律用 diskpart `compact vdisk`。
- 相關筆記:Docker問題prune+壓縮vhdx(虛擬磁碟)解決硬碟爆掉.md
