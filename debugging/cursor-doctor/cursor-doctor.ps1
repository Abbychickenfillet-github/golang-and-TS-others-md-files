<#
.SYNOPSIS
  Cursor 打不開診斷腳本（預設只讀取、不修改任何檔案）

.USAGE
  # 1. 只做靜態檢查（安全，不會關掉任何程式）
  powershell -ExecutionPolicy Bypass -File .\cursor-doctor.ps1

  # 2. 靜態檢查 + 實際用 4 種參數啟動 Cursor 做對照測試（會關掉所有 Cursor 行程，執行前會先問你）
  powershell -ExecutionPolicy Bypass -File .\cursor-doctor.ps1 -LaunchTest

.OUTPUT
  畫面上彩色顯示結果，同時在腳本旁邊存一份 cursor-doctor-report-日期.txt
#>
param(
  [switch]$LaunchTest,       # 加上這個開關才會真的去啟動 Cursor
  [int]$WaitSeconds = 15     # 每次啟動後等幾秒再檢查有沒有視窗
)

$ErrorActionPreference = 'Continue'
$base   = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$report = Join-Path $base ("cursor-doctor-report-{0}.txt" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$issues = New-Object System.Collections.Generic.List[string]
Set-Content -Path $report -Value "Cursor Doctor 報告 $(Get-Date)" -Encoding UTF8

# ---------- 輸出工具 ----------
function Log([string]$msg, [string]$color = 'Gray') {
  Write-Host $msg -ForegroundColor $color
  Add-Content -Path $report -Value $msg -Encoding UTF8
}
function Section([string]$t) { Log ''; Log "==== $t ====" 'Cyan' }
function Ok([string]$m)   { Log "  [OK]   $m" 'Green' }
function Info([string]$m) { Log "  [INFO] $m" 'Gray' }
function Warn([string]$m) { Log "  [WARN] $m" 'Yellow'; $script:issues.Add("WARN  $m") }
function Bad([string]$m)  { Log "  [FAIL] $m" 'Red';    $script:issues.Add("FAIL  $m") }

function Get-DirSizeMB([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { return $null }
  $s = (Get-ChildItem -LiteralPath $p -Recurse -File -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum
  if (-not $s) { $s = 0 }
  return [math]::Round($s / 1MB, 1)
}
function Test-FileLocked([string]$path) {
  try { $fs = [IO.File]::Open($path, 'Open', 'ReadWrite', 'None'); $fs.Close(); return $false }
  catch { return $true }
}
function Get-CursorProcs { @(Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue) }

$userData = Join-Path $env:APPDATA 'Cursor'

# ============================================================
Section '1. 安裝位置與執行檔完整性'
# ============================================================
$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'),
  (Join-Path $env:ProgramFiles 'cursor\Cursor.exe')
)
$regPaths = @(
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$reg = Get-ItemProperty $regPaths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Cursor*' }
foreach ($r in $reg) {
  Info "登錄檔找到：$($r.DisplayName) 版本 $($r.DisplayVersion)"
  if ($r.InstallLocation) { $candidates += (Join-Path $r.InstallLocation 'Cursor.exe') }
}
$exe = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $exe) {
  Bad '找不到 Cursor.exe → 安裝壞掉或更新到一半被中斷，請重新安裝'
} else {
  $installDir = Split-Path $exe
  $ver = (Get-Item -LiteralPath $exe).VersionInfo.ProductVersion
  Ok "執行檔：$exe（版本 $ver）"

  $sig = Get-AuthenticodeSignature -FilePath $exe
  if ($sig.Status -eq 'Valid') { Ok "數位簽章有效（$($sig.SignerCertificate.Subject.Split(',')[0])）" }
  else { Bad "數位簽章狀態 = $($sig.Status) → 執行檔可能損毀或被竄改，建議重新安裝" }

  $pkg = Join-Path $installDir 'resources\app\package.json'
  if (Test-Path -LiteralPath $pkg) { Ok 'resources\app\package.json 存在' }
  else { Bad 'resources\app\package.json 不見了 → 程式本體不完整，請重新安裝' }

  if (Test-Path -LiteralPath (Join-Path $installDir '_')) {
    Warn "安裝目錄裡有 '_' 資料夾 → 可能是背景更新的暫存沒套用完，重開機或重新安裝通常能解"
  }
}
$upd = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'inno_updater|CursorSetup|CursorUserSetup' })
if ($upd.Count -gt 0) { Warn "更新程式正在跑：$(($upd.Name) -join ', ') → 等它跑完再開 Cursor" }

# ============================================================
Section '2. 背景殘留行程（最常見原因）'
# ============================================================
$procs = Get-CursorProcs
if ($procs.Count -eq 0) {
  Ok '目前沒有 Cursor 行程'
} else {
  $win = @($procs | Where-Object { $_.MainWindowHandle -ne 0 })
  $memMB = [math]::Round((($procs | Measure-Object -Property WorkingSet64 -Sum).Sum) / 1MB)
  Info "Cursor 行程 $($procs.Count) 個，有視窗的 $($win.Count) 個，共用記憶體 $memMB MB"
  if ($win.Count -eq 0) {
    Bad "有 $($procs.Count) 個 Cursor 行程在背景卻沒有視窗 → 新的啟動請求會被轉交給這個卡住的舊實例，所以看起來「點了沒反應」"
    Info '  修法：Stop-Process -Name Cursor -Force  然後再開一次'
  }
}

# ============================================================
Section '3. 會讓 Electron 不開視窗的環境變數'
# ============================================================
foreach ($name in 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS') {
  foreach ($scope in 'Process', 'User', 'Machine') {
    $v = [Environment]::GetEnvironmentVariable($name, $scope)
    if ($v) {
      if ($name -eq 'ELECTRON_RUN_AS_NODE') {
        Bad "$name=$v（$scope 層級）→ Cursor.exe 會被當成純 Node.js 執行，直接結束、不開視窗"
        Info "  修法：[Environment]::SetEnvironmentVariable('$name', `$null, '$scope')，然後重開終端機"
      } else {
        Warn "$name=$v（$scope 層級）→ 奇怪的 Node 參數可能讓 Cursor 啟動失敗"
      }
    }
  }
}
if (-not ($issues | Where-Object { $_ -match 'ELECTRON_RUN_AS_NODE|NODE_OPTIONS' })) { Ok '沒有可疑的 Electron／Node 環境變數' }

# ============================================================
Section '4. C 槽空間'
# ============================================================
$drive  = Get-PSDrive -Name C
$freeGB = [math]::Round($drive.Free / 1GB, 1)
if     ($freeGB -lt 2)  { Bad  "C 槽只剩 $freeGB GB → Cursor 寫不進 state.vscdb（SQLite 資料庫）就會啟動失敗，先清空間（例如 Docker 的 vhdx）" }
elseif ($freeGB -lt 10) { Warn "C 槽剩 $freeGB GB，偏少" }
else                    { Ok   "C 槽剩 $freeGB GB" }

# ============================================================
Section '5. 使用者資料夾 %APPDATA%\Cursor'
# ============================================================
if (-not (Test-Path -LiteralPath $userData)) {
  Warn "找不到 $userData（沒開過或被刪了，第一次啟動會重建，通常不是問題）"
} else {
  Info "位置：$userData（總大小 $(Get-DirSizeMB $userData) MB）"

  $gs = Join-Path $userData 'User\globalStorage'
  $dbs = @(Get-ChildItem -LiteralPath $gs -Filter 'state.vscdb*' -Force -ErrorAction SilentlyContinue)
  foreach ($db in $dbs) {
    $mb = [math]::Round($db.Length / 1MB, 1)
    $line = "$($db.Name)  $mb MB  修改於 $($db.LastWriteTime)"
    if ($mb -gt 500) { Warn "$line → 太大，啟動時載入會很慢甚至卡死" } else { Info $line }
    if ((Get-CursorProcs).Count -eq 0 -and (Test-FileLocked $db.FullName)) {
      Bad "$($db.Name) 在 Cursor 沒開的情況下仍被鎖住 → 有別的程式（防毒／同步軟體／殘留行程）咬住它"
    }
  }
  if ($dbs.Count -eq 0) { Info 'globalStorage 裡沒有 state.vscdb' }

  $lock = Join-Path $userData 'code.lock'
  if ((Test-Path -LiteralPath $lock) -and (Get-CursorProcs).Count -eq 0) {
    Warn 'code.lock 存在但沒有 Cursor 行程 → 可能是上次當掉留下的舊鎖檔'
  }

  foreach ($c in 'GPUCache', 'Code Cache', 'Cache', 'CachedData', 'Service Worker') {
    $sz = Get-DirSizeMB (Join-Path $userData $c)
    if ($null -ne $sz) { Info ("快取 {0,-15} {1,8} MB" -f $c, $sz) }
  }
}

$argv = Join-Path $env:USERPROFILE '.cursor\argv.json'
if (Test-Path -LiteralPath $argv) {
  $lines = Get-Content -LiteralPath $argv | Where-Object { $_.Trim() -and $_ -notmatch '^\s*//' }
  Info "argv.json 生效內容：$($lines -join ' ')"
}

# ============================================================
Section '6. 最近一次啟動的 main.log'
# ============================================================
$logRoot = Join-Path $userData 'logs'
$latest  = Get-ChildItem -LiteralPath $logRoot -Directory -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) {
  Warn '沒有任何 log 資料夾 → Cursor 可能在寫 log 之前就掛了（看第 1、3、7 節）'
} else {
  Info "最新 log：$($latest.FullName)（$($latest.LastWriteTime)）"
  $main = Join-Path $latest.FullName 'main.log'
  if (Test-Path -LiteralPath $main) {
    $hits = Select-String -LiteralPath $main -Pattern 'error|fatal|crash|EPERM|ENOSPC|EBUSY|EACCES|SQLITE|corrupt' |
            Select-Object -Last 15
    if ($hits) {
      Warn "main.log 有 $(@($hits).Count) 行錯誤關鍵字（顯示最後 15 行）："
      foreach ($h in $hits) { Log ("    L{0}: {1}" -f $h.LineNumber, $h.Line.Trim()) 'DarkYellow' }
    } else { Ok 'main.log 沒有錯誤關鍵字' }
  }
}

$dumpDir = Join-Path $userData 'Crashpad'
$dumps = @(Get-ChildItem -LiteralPath $dumpDir -Recurse -Filter '*.dmp' -ErrorAction SilentlyContinue |
           Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-3) })
if ($dumps.Count -gt 0) { Warn "最近 3 天有 $($dumps.Count) 個崩潰傾印檔（.dmp）→ Cursor 有真的 crash" }

# ============================================================
Section '7. Windows 事件檢視器（近 7 天的 Cursor 崩潰／無回應）'
# ============================================================
try {
  $ev = Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Id = 1000, 1002; StartTime = (Get-Date).AddDays(-7) } -ErrorAction Stop |
        Where-Object { $_.Message -match 'Cursor\.exe' } | Select-Object -First 5
  if ($ev) {
    foreach ($e in $ev) {
      $kind = if ($e.Id -eq 1000) { '崩潰' } else { '無回應' }
      $module = ($e.Message -split "`n" | Where-Object { $_ -match 'Faulting module|錯誤模組|失敗的模組' } | Select-Object -First 1)
      Bad "$($e.TimeCreated) Cursor $kind（事件 $($e.Id)）$module"
    }
  } else { Ok '沒有 Cursor 的崩潰事件' }
} catch { Ok '沒有 Cursor 的崩潰事件' }

# ============================================================
Section '8. 顯示卡與防毒'
# ============================================================
Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
  Info "GPU：$($_.Name)  驅動 $($_.DriverVersion)"
}
try {
  $det = Get-MpThreatDetection -ErrorAction Stop | Where-Object { ($_.Resources -join ' ') -match 'cursor' }
  if ($det) { Bad "Windows Defender 曾攔截 Cursor 相關檔案 $(@($det).Count) 次 → 去「病毒與威脅防護 > 保護歷程記錄」還原" }
  else { Ok 'Defender 沒有攔截過 Cursor' }
} catch { Info '無法讀取 Defender 紀錄（可能用第三方防毒或權限不足）' }

# ============================================================
if ($LaunchTest -and $exe) {
  Section '9. 實際啟動對照測試'
  $running = Get-CursorProcs
  $go = $true
  if ($running.Count -gt 0) {
    $ans = Read-Host "會強制關閉目前 $($running.Count) 個 Cursor 行程（未存檔的內容會遺失），繼續嗎？(y/N)"
    $go = $ans -match '^[yY]'
  }
  if ($go) {
    function Stop-CursorAll { Get-CursorProcs | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2 }

    $freshData = Join-Path $env:TEMP 'cursor-doctor-profile'
    $freshExt  = Join-Path $env:TEMP 'cursor-doctor-ext'
    $tests = [ordered]@{
      'normal'        = @('--verbose')
      'disable-gpu'   = @('--verbose', '--disable-gpu')
      'no-extensions' = @('--verbose', '--disable-extensions')
      'fresh-profile' = @('--verbose', "--user-data-dir=`"$freshData`"", "--extensions-dir=`"$freshExt`"")
    }
    $result = @{}
    foreach ($label in $tests.Keys) {
      Stop-CursorAll
      $out = Join-Path $env:TEMP "cursor-doctor-$label.out.txt"
      $err = Join-Path $env:TEMP "cursor-doctor-$label.err.txt"
      Info "啟動 [$label]：Cursor.exe $($tests[$label] -join ' ')"
      $p = Start-Process -FilePath $exe -ArgumentList $tests[$label] -PassThru `
             -RedirectStandardOutput $out -RedirectStandardError $err
      Start-Sleep -Seconds $WaitSeconds
      $win = @(Get-CursorProcs | Where-Object { $_.MainWindowHandle -ne 0 })
      $result[$label] = ($win.Count -gt 0)
      if ($result[$label]) {
        Ok "[$label] $WaitSeconds 秒內出現視窗"
      } else {
        $exit = if ($p.HasExited) { "已結束，ExitCode=$($p.ExitCode)" } else { '還在跑但沒視窗' }
        Bad "[$label] $WaitSeconds 秒內沒有視窗（主行程$exit）"
        $tail = @(Get-Content -LiteralPath $err -Tail 8 -ErrorAction SilentlyContinue) +
                @(Get-Content -LiteralPath $out -Tail 8 -ErrorAction SilentlyContinue)
        foreach ($t in $tail) { if ($t.Trim()) { Log "    $t" 'DarkYellow' } }
      }
    }
    Stop-CursorAll

    Section '10. 對照結論'
    if     ($result['normal'])        { Ok '正常模式能開 → 原本多半是殘留行程或暫時性問題，剛剛已被清掉' }
    elseif ($result['disable-gpu'])   { Warn '只有關掉 GPU 才能開 → 顯示卡驅動或 GPUCache 有問題：更新驅動，或刪 %APPDATA%\Cursor\GPUCache' }
    elseif ($result['no-extensions']) { Warn '停用擴充功能才能開 → 某個擴充功能卡住啟動：到 %USERPROFILE%\.cursor\extensions 逐一移走排查' }
    elseif ($result['fresh-profile']) { Warn '只有全新設定檔能開 → %APPDATA%\Cursor 設定或 state.vscdb 損毀：先備份整個資料夾再改名重建' }
    else                              { Bad  '四種模式都開不起來 → 程式本體或系統層問題：重新安裝 Cursor，並看第 1、3、7、8 節' }
  }
} elseif (-not $LaunchTest) {
  Section '9. 實際啟動對照測試（略過）'
  Info '想做啟動測試請加 -LaunchTest 重跑'
}

# ============================================================
Section '總結'
# ============================================================
if ($issues.Count -eq 0) { Ok '沒發現明顯問題，建議加 -LaunchTest 再跑一次' }
else { foreach ($i in $issues) { Log "  - $i" 'Yellow' } }
Log ''
Log "完整報告：$report" 'Cyan'
