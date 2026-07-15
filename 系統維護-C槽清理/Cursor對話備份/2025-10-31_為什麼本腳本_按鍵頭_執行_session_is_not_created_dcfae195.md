# 為什麼本腳本 按鍵頭 執行 session is not created

> Cursor · 2025-10-31 16:07 · `dcfae195-d4d1-42ec-9887-9445807e84d3` · 28 則

## 你
為什麼本腳本 按鍵頭 執行 session is not created?

## Cursor
檢查腳本中的問題，特別是按下方向鍵時出現「session is not created」錯誤的原因。

## Cursor
發現兩個問題：
1. `setup_driver()` 被定義了兩次（第 9 行與第 289 行），後者會覆蓋前者。
2. 第 289 行的版本使用了 `user-data-dir`，在 Chrome 仍在執行時會導致 "session is not created"。

修正：移除重複定義，並調整 Chrome 設定以避免該錯誤。

## Cursor
問題原因：
1. `setup_driver()` 被定義了兩次：第 9 行與第 289 行，後者會覆蓋前者。
2. 第二個版本使用 `user-data-dir`，在 Chrome 仍開啟時會造成 "session is not created"。

修正中：移除重複定義，並處理 Chrome 設定以避免該錯誤。

## Cursor
檢查並清理無法執行到的程式碼：

## Cursor
移除無法執行到的程式碼：

## Cursor
檢查語法錯誤：

## Cursor
已修復問題。原因如下：

## 問題原因

1. **重複定義函數**：`setup_driver()` 被定義了兩次（第 9 行和第 289 行）。Python 會使用最後一個定義，所以實際上使用的是第 289 行的版本。

2. **Chrome 設定檔衝突**：第 289 行的 `setup_driver()` 使用了 `user-data-dir` 來連接現有的 Chrome 設定檔。當 Chrome 已開啟時，Selenium 無法建立新連線，會出現 "session is not created" 錯誤。

## 已修復

- ✅ 移除了重複的 `setup_driver()`（第 289-307 行）
- ✅ 移除了無法執行到的程式碼（`try_find_email_input` 函數中的重複邏輯）
- ✅ 現在使用第一個 `setup_driver()`，它會建立新的 Chrome 實例，不會與已運行的 Chrome 衝突

腳本現在應該可以正常執行。如果之後需要保留登入狀態，可以選擇性地加入 `user-data-dir`，但必須先關閉所有 Chrome 視窗。

## 你
有解嗎

## Cursor
短答：不能。有「穩定且合規」的方法繞過 Google 的自動化偵測來自動輸入密碼基本上不可行，而且也違反服務條款。

可行替代方案（建議擇一）：
- 手動登入一次再自動化後續流程
  - 啟動瀏覽器到登入頁，讓你手動完成 Google 登入，再由腳本接手結帳等後續。
  - 可在成功登入後把「目標網站」（例如 momoshop，而非 Google）的 Cookies 存檔，之後直接載入 Cookies 免登入。
- 改用目標網站原生帳密登入
  - 若 momoshop 支援一般帳密登入，改走該流程可避免 Google SSO 的風險與限制。
- 正規 OAuth 流程（若你的目的是使用 Google 資源）
  - 走 OAuth 2.0（使用者授權 + refresh token）或 Service Account，完全不要用瀏覽器自動化登入 Google。

極簡示例（人工登入一次，之後自動化）：
```python
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
import json, time, os

def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    return webdriver.Chrome(options=options)

def save_cookies(driver, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(driver.get_cookies(), f)

def load_cookies(driver, path, base_url):
    driver.get(base_url)  # 先到同網域才能設 cookie
    with open(path, "r", encoding="utf-8") as f:
        for c in json.load(f):
            driver.add_cookie(c)
    driver.refresh()

driver = setup_driver()
base_url = "https://www.momoshop.com.tw/"
cookies_path = "momoshop_cookies.json"

if not os.path.exists(cookies_path):
    driver.get(base_url)
    input("請在瀏覽器完成 Google 登入後按 Enter 繼續...")
    save_cookies(driver, cookies_path)
else:
    load_cookies(driver, cookies_path, base_url)

# 後續自動化（已具備 momoshop 登入狀態）
# driver.get(商品頁); driver.find_element(...).click()
time.sleep(3)
driver.quit()
```

重點注意
- 首次手動登入時請確保所有 Chrome 視窗都關閉，若要使用既有個人檔（user-data-dir）避免「session is not created」。
- Cookies 只保存目標站的登入會話，不保存或操作 Google 帳密。
- 若網站會話常過期，就在過期時再做一次人工登入並覆寫 Cookies。

如果你要，我可以把你的現有流程改成「首次人工登入＋之後載入 momoshop Cookies」的版本。

## 你
什麼叫做GPU state invalid after WaitforGetOffSetInRange?

## Cursor
簡單說：這是瀏覽器或圖形層在使用 GPU（Direct3D/ANGLE）時，驅動或資源狀態出錯的訊息。常見於 Windows 上的 Chrome/Chromium（含 Selenium 自動化）在渲染 Canvas/WebGL/合成時，GPU 驅動或 ANGLE 堆疊判定到「無效狀態」，就會拋出類似 “GPU state invalid after WaitForGetOffsetInRange” 的錯。

常見成因
- 顯示卡驅動 bug/老舊或與系統更新不相容
- 瀏覽器 GPU 功能不穩（ANGLE、D3D11、Vulkan、Viz 合成器）
- 遠端桌面/虛擬機/多顯示器環境下的 GPU 資源問題
- Headless 模式下的特定 GPU 路徑不相容

快速解法（擇一或多試）
- 更新顯卡驅動與 Windows 更新
- 在 Chrome/Chromium 關閉 GPU 硬體加速
  - 手動：設定或 `chrome://flags` 關閉 GPU rasterization
  - Selenium：
    - `options.add_argument("--disable-gpu")`
    - `options.add_argument("--disable-software-rasterizer")`
    - `options.add_argument("--disable-features=VizDisplayCompositor")`
    - 若用無頭：`options.add_argument("--headless=new")` 搭配 `--disable-gpu`
- 指定 ANGLE 後端（有時能避開驅動問題）
  - `options.add_argument("--use-gl=angle")`
  - `options.add_argument("--use-angle=d3d11")` 或 `--use-angle=gl`/`opengl`
- 在不需要 GPU 的場景改用軟體渲染
  - `--disable-gpu` 已是最直接
- 避免在 RDP/虛擬環境下使用硬體加速；必要時改用本機或關閉加速
- 確認沒有其他程式長佔 GPU（錄影、串流、3D 應用）造成資源緊張

Selenium 最小化設定範例
```python
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("--start-maximized")
options.add_argument("--disable-gpu")
options.add_argument("--disable-software-rasterizer")
options.add_argument("--disable-features=VizDisplayCompositor")
# 如仍有問題可再嘗試：
# options.add_argument("--use-gl=angle")
# options.add_argument("--use-angle=d3d11")
# options.add_argument("--headless=new")

driver = webdriver.Chrome(options=options)
```

若問題仍在：
- 收集 `chrome://gpu` 診斷資訊與 `chrome://version`，確認 GPU 功能啟用狀態與 ANGLE 後端
- 測一次舊版或最新版 Chrome/Driver 是否改善
- 確認顯示卡（特別是 Intel/混合顯卡）是否切到內顯/獨顯造成不穩，嘗試在顯卡面板鎖定應用到單一 GPU

## 你
幫我加上這一段
在 Chrome/Chromium 關閉 GPU 硬體加速
手動：設定或 chrome://flags 關閉 GPU rasterization
Selenium：
options.add_argument("--disable-gpu")
options.add_argument("--disable-software-rasterizer")
options.add_argument("--disable-features=VizDisplayCompositor")
若用無頭：options.add_argument("--headless=new") 搭配 --disable-gpu
指定 ANGLE 後端（有時能避開驅動問題）
options.add_argument("--use-gl=angle")
options.add_argument("--use-angle=d3d11") 或 --use-angle=gl/opengl

## Cursor
I'll open `python_project/buyTissue-test-success-half-way.py` to locate the Chrome options setup, then add the GPU-related arguments you specified.

## Cursor
I'll add the GPU-related Chrome options into `setup_driver()` in `python_project/buyTissue-test-success-half-way.py`, enabling the disable flags and ANGLE selection, and include a commented headless option for optional use.

## Cursor
已加上你要的設定到 `python_project/buyTissue-test-success-half-way.py` 的 `setup_driver()`：

- 啟用 GPU 關閉與相關旗標
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-features=VizDisplayCompositor`
- 指定 ANGLE 後端
  - `--use-gl=angle`
  - `--use-angle=d3d11`
- 提供可選的無頭模式（已註解）
  - `# options.add_argument("--headless=new")`

如需改為 OpenGL，可把 `--use-angle=d3d11` 改成 `--use-angle=gl` 或 `--use-angle=opengl`。

## 你
旗標是什麼
--use-angle=d3d11是什麼 剛剛開一開結果被關閉了 連輸入帳號都沒有

## Cursor
說明旗標（flags）與 ANGLE，並檢查為什麼瀏覽器會被關閉。先查看目前的程式碼：

## Cursor
說明與修正：

- 旗標（Flags）：在 Chrome 啟動時傳入的命令列參數，用來改變瀏覽器行為，例如 `--disable-gpu`、`--start-maximized`。
- `--use-angle=d3d11`：指定 ANGLE 使用 Direct3D 11 作為圖形後端（需要 GPU），適合 Windows。
- 問題：同時使用 `--disable-gpu` 與 `--use-angle=d3d11` 會衝突，導致 Chrome 無法啟動或立即關閉。

修正：移除衝突選項。若要關閉 GPU，就不要指定 `--use-angle`。

## Cursor
已修復，摘要如下：

## 問題原因
同時使用 `--disable-gpu`（關閉 GPU）和 `--use-angle=d3d11`（要求使用 GPU 的 Direct3D 11）會衝突，導致 Chrome 無法啟動或被關閉。

## 什麼是旗標（Flags）？
Chrome 啟動時的命令列參數，用來控制行為，例如：
- `--disable-gpu`：關閉 GPU 硬體加速
- `--start-maximized`：最大化視窗
- `--use-angle=d3d11`：使用 Direct3D 11 作為圖形後端

## `--use-angle=d3d11` 是什麼？
- ANGLE：Chrome 的圖形抽象層
- `d3d11`：Windows 上使用 Direct3D 11（需要 GPU）
- 其他選項：`gl`（OpenGL）、`opengl`（舊版 OpenGL）

## 已修復
現在只使用 `--disable-gpu`，已移除衝突的 ANGLE 設定。若仍出現 GPU 錯誤，可以：
1. 保持現狀（使用 `--disable-gpu`，最安全）
2. 嘗試註解 `--disable-gpu`，改用 `--disable-features=VizDisplayCompositor`（保留部分 GPU）
3. 先註解 `--disable-gpu`，再啟用 ANGLE 選項（需要 GPU 正常）

現在應該可以正常執行到輸入帳號的步驟了。

## 你
購買按鈕是a.buynow

## Cursor
查看目前程式碼中購買按鈕的定位方式：

## Cursor
將購買按鈕定位改為 `a.buynow`（CSS 選擇器）：

## Cursor
已更新：將購買按鈕的定位由 `By.ID, "buy_yes"` 改為 `By.CSS_SELECTOR, "a.buynow"`。腳本現在應能正確找到並點擊購買按鈕。

## 你
bind context provider failed

## Cursor
「bind context provider failed」通常是 GPU 上下文初始化失敗。檢查目前的設定並新增更穩定的參數：

## Cursor
新增更多穩定性參數以解決「bind context provider failed」錯誤：

## Cursor
已更新設定以解決「bind context provider failed」錯誤。新增的參數包括：

## 新增的穩定性參數：

1. **`--disable-gpu-sandbox`** - 禁用 GPU 沙箱（避免上下文初始化問題）
2. **`--disable-accelerated-2d-canvas`** - 禁用 2D canvas 硬體加速
3. **`--disable-accelerated-video-decode`** - 禁用視訊解碼加速
4. **`--disable-webgl`** / **`--disable-webgl2`** - 禁用 WebGL（避免 GPU 上下文問題）
5. **`--use-gl=swiftshader`** - 使用 SwiftShader 軟體渲染（不依賴 GPU 硬體）
6. **`--disable-features=VizDisplayCompositor`** - 關閉 Viz 顯示合成器（避免渲染錯誤）

這些設定應能解決「bind context provider failed」錯誤，讓瀏覽器以軟體渲染運行，不依賴 GPU 硬體。試試看是否還會有問題。
