@echo off
REM turn-off-monitor.bat
REM 用途:關閉顯示器(讓螢幕進入省電狀態)
REM 對應筆記:批次檔關閉螢幕-user32-SendMessage-WM_SYSCOMMAND逐字拆解.md
REM
REM 與 Gemini 原版的差異:
REM   1. 最後一行改成 exit,不再用 taskkill /f /im cmd.exe
REM      原版會殺掉「所有」叫 cmd.exe 的行程,連你另外開的視窗也一起關掉
REM   2. 加上 timeout 先等一秒,避開按下 Enter 那一瞬間的殘留鍵盤輸入
REM
REM 參數說明(全部見筆記第四節):
REM   -1     = HWND_BROADCAST   廣播給所有最上層視窗
REM   0x0112 = WM_SYSCOMMAND    這是一則系統指令訊息
REM   0xF170 = SC_MONITORPOWER  子類別:顯示器電源管理
REM   2      = 關閉螢幕(-1 開啟 / 1 低耗電 / 2 關閉)

timeout /t 1 /nobreak >nul

powershell -windowstyle hidden -command "(Add-Type '[DllImport(\"user32.dll\")]public static extern int SendMessage(int hWnd, int hMsg, int wParam, int lParam);' -Name a -Passthru)::SendMessage(-1, 0x0112, 0xF170, 2)"

exit
