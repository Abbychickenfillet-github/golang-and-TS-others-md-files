# turn-off-monitor.ps1
# 用途:關閉顯示器(讓螢幕進入省電狀態)
# 對應筆記:批次檔關閉螢幕-user32-SendMessage-WM_SYSCOMMAND逐字拆解.md
# 執行:powershell -ExecutionPolicy Bypass -File .\turn-off-monitor.ps1

# --- 常數 ---------------------------------------------------------------
$HWND_BROADCAST  = -1        # 廣播給所有最上層視窗
$WM_SYSCOMMAND   = 0x0112    # 這是一則「系統指令」訊息
$SC_MONITORPOWER = 0xF170    # 系統指令的子類別:顯示器電源管理
$MONITOR_OFF     = 2         # -1=開啟 / 1=低耗電 / 2=關閉

# --- 用 P/Invoke 把 user32.dll 的 SendMessage 拉進來 ---------------------
# Add-Type 會在執行期即時編譯這段 C#,並把型別載入當前 session
# -PassThru 讓它把編譯出來的型別回傳,才能接著用 :: 呼叫靜態方法
$signature = @'
[DllImport("user32.dll", CharSet = CharSet.Auto)]
public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);
'@

$User32 = Add-Type -MemberDefinition $signature -Name 'MonitorPower' -Namespace 'Win32Utils' -PassThru

# --- 先等一秒,避開你按下 Enter 那一瞬間的殘留鍵盤輸入 -------------------
# 少了這一行,螢幕常常剛黑掉就馬上被喚醒
Start-Sleep -Seconds 1

# --- 送出訊息 -----------------------------------------------------------
[void]$User32::SendMessage(
    [IntPtr]$HWND_BROADCAST,
    $WM_SYSCOMMAND,
    [IntPtr]$SC_MONITORPOWER,
    [IntPtr]$MONITOR_OFF
)

# 註:此腳本必須在互動式桌面 session 執行
#     因為 Session 0 Isolation,包成 Windows 服務會失效
