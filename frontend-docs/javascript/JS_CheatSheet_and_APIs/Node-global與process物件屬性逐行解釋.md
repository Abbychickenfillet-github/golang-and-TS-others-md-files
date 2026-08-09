---
title: Node.js global與process物件屬性逐行解釋
type: cheatsheet
tags: [nodejs, v8, process, global, JS_CheatSheet_and_APIs]
aliases: [Node-process物件解釋, Node-global物件解釋]
related:
  - "[[01-引擎-Engine-到底是什麼]]"
  - "[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]"
  - "[[V8引擎完整管線-Parse到Deoptimization]]"
sources:
  - 使用者本機Node.js REPL實測輸出，2026年8月5日，Node.js v24.14.0，Windows平台，V8版本13.6.233.17-node.41
  - https://gemini.google.com/app/2aaa32d4d098781d
updated: 2026-08-06
---

# Node.js global與process物件屬性逐行解釋

> [!info]- 📍 這篇是什麼
> 這是你在PowerShell打`node`進REPL、依序打`window`、`document`、`global`、`process`之後，針對輸出結果逐行做的解釋筆記，直接驗證[[01-引擎-Engine-到底是什麼]]裡(c-7)(c-8)講的內容：`window`、`document`丟`ReferenceError`，證明V8本身不知道瀏覽器的東西；`global`跟`process`能正常列出一大包內容，證明這些是Node.js這個Host環境自己加上去的API。
>
> ![[Node_REPL_window與document不存在_global與process_2026-08-05.png]]

> [!warning]- ⚠️ 先講一個重要提醒，不是筆記內容，請優先看
> <mark style="background: #FF5582A6;">你貼的`process.env`輸出裡，有一行`GOOGLE_GEMINI_API`直接把一組完整的API金鑰用明文列出來了。</mark>環境變數本身沒有錯，但這代表這組金鑰目前是用明文存在你系統的環境變數裡，只要有人（或任何跑在你電腦上的程式）打開`process.env`就看得到完整金鑰。建議你儘快到Google AI Studio或對應的Google Cloud專案後台，把這組金鑰註銷、重新產生一組新的，往後這類金鑰盡量放在`.env`檔案裡並加進`.gitignore`，不要讓它出現在會被截圖、貼到對話或commit進版本控制的地方。這篇筆記後面提到`process.env`時，我不會把實際的金鑰內容或你電腦上的個人路徑寫進去，只解釋每個變數名稱代表什麼概念。

## (a) `global`物件底下的屬性，共14個

`global`是Node.js提供的全域物件，角色類似瀏覽器裡的`window`，但內容完全不同——這裡列的每一個，都是Node.js（Host環境）自己加上去的，不是V8語言本身的東西：

1. `global`——指向自己的循環參照（Circular Reference），`Object [global] { global: [Circular *1], ... }`這種寫法就是Node.js的`console.log`在印一個「物件裡面有一個屬性指回自己」的結構時，用`[Circular *1]`表示，避免無限印下去
2. `clearImmediate`——取消一個之前用`setImmediate`排定、還沒執行的立即工作，見第3項
3. `setImmediate`——排一個函式，在目前這一輪Event Loop的I/O回呼階段結束後，盡快執行它，比`setTimeout(fn, 0)`更早輪到
4. `clearInterval`——取消一個用`setInterval`設定的重複計時器
5. `clearTimeout`——取消一個用`setTimeout`設定的延遲執行工作
6. `setInterval`——每隔固定時間重複執行一次某個函式，直到被`clearInterval`取消
7. `setTimeout`——延遲指定時間後執行一次某個函式
8. `queueMicrotask`——把一個函式排進微任務佇列（Microtask Queue），會比`setTimeout`更早執行，跟Promise的`.then()`用的是同一個佇列
9. `structuredClone`——對一個物件做深拷貝（Deep Copy），支援比`JSON.parse(JSON.stringify(x))`更多的資料型別（例如`Date`、`Map`、`Set`）
10. `atob`——把Base64編碼的字串解碼回原始的二進位字串（`ASCII to Binary`的縮寫）
11. `btoa`——把二進位字串編碼成Base64字串（`Binary to ASCII`的縮寫）
12. `performance`——效能量測用的API，可以拿到高精度的時間戳記，量測程式碼執行耗時
13. `fetch`——發送HTTP請求用的Fetch API，Node.js從18版開始內建，這正是[[01-引擎-Engine-到底是什麼]](c)表格裡提到「fetch是少數兩邊都有的例外」
14. `crypto`——加密相關的API，可以產生亂數、做雜湊運算等
15. `navigator`——Node.js也加了一個簡化版的`navigator`物件（主要給跨環境套件判斷用），跟瀏覽器的`navigator`不是同一個東西，功能少很多

<mark style="background: #ADCCFFA6;">這14個全部是Node.js（Host環境）自己加的，V8本身不認得任何一個，這也是為什麼(c-7)講「純V8（`d8`）連`process`都不存在」——因為`global`底下這些東西也是Node.js加的，純V8同樣不會有。</mark>

## (b) `process`物件的頂層屬性，共70個

`process`是Node.js另一個核心的Host物件，代表「目前這個Node.js執行程序（process）本身」，用來跟作業系統層級互動。裡面的屬性很多，我照你貼的輸出順序，依功能分組解釋：

### b-1. 版本與平台資訊（5個）

1. `version`——目前這個Node.js的版本號，例如`v24.14.0`
2. `versions`——一整包所有內建元件的版本號清單，見下面(c)完整拆解
3. `arch`——CPU架構，你的是`x64`
4. `platform`——作業系統平台，你的是`win32`（Windows）
5. `release`——這個Node.js版本的發行資訊，包含名稱、LTS代號（你這版代號`Krypton`）、原始碼下載連結

### b-2. 底層綁定與事件機制（6個，多為Node內部使用）

6. `_rawDebug`——Node內部用的除錯輸出函式，開頭底線代表是內部API，不建議一般程式碼呼叫
7. `moduleLoadList`——記錄Node啟動過程中，內部依序載入了哪些原生模組（Internal Binding、NativeModule），你貼的輸出後面接了「... 76 more items」，代表清單被截斷顯示，實際還有更多
8. `binding`——載入Node內部C++綁定模組用的函式，屬於底層API
9. `_linkedBinding`——類似`binding`，但用於載入外部原生模組（Addon），一樣是內部API
10. `_events`——`process`物件自己也是一個EventEmitter，這裡存放目前註冊在`process`上的事件監聽器，例如`newListener`、`warning`、`SIGWINCH`
11. `_eventsCount`——目前註冊的事件監聽器總數

### b-3. 監聽器上限與狀態（4個）

12. `_maxListeners`——`process`這個EventEmitter最多允許掛幾個監聽器，`undefined`代表用預設值
13. `domain`——舊版Node.js的錯誤處理機制`domain`模組留下的相容屬性，新專案不建議使用
14. `_exiting`——布林值，標記目前Node是否正在結束執行的過程中
15. `exitCode`——設定Node程式結束時要回傳給作業系統的結束代碼（Exit Code），`0`通常代表成功，非`0`代表某種錯誤

### b-4. 建置設定（1個，內容龐大另拆(d)）

16. `config`——記錄這支Node.js執行檔在編譯時的所有建置參數，內容非常龐大，完整拆解見下面(d)

### b-5. 原生模組載入與資源監控（10個）

17. `dlopen`——動態載入一個原生的`.node`擴充模組（Addon），底層對應到作業系統的`dlopen`／`LoadLibrary`
18. `uptime`——回傳目前這個Node程序已經執行了幾秒
19. `_getActiveRequests`——列出目前還在進行中的底層非同步請求（例如檔案讀寫），內部除錯用
20. `_getActiveHandles`——列出目前還開著的底層資源控制代碼（例如Timer、Socket），內部除錯用
21. `getActiveResourcesInfo`——上面兩個的公開版本，回傳目前有哪些資源正讓程式無法結束
22. `reallyExit`——立刻強制結束程序，跳過部分清理流程，內部使用
23. `_kill`——傳送作業系統訊號（Signal）給某個程序，內部API
24. `loadEnvFile`——讀取一份`.env`格式的環境變數檔並載入到`process.env`，Node 20.6版之後內建
25. `cpuUsage`——回傳目前程序使用了多少CPU時間（分使用者時間與系統時間）
26. `threadCpuUsage`——跟`cpuUsage`類似，但是針對目前這條執行緒（Thread）而非整個程序

### b-6. 資源用量（4個）

27. `resourceUsage`——回傳更完整的系統資源使用報告（記憶體、I/O次數等）
28. `memoryUsage`——回傳目前程序的記憶體使用量，包含`rss`（Resident Set Size，程序實際佔用的實體記憶體）
29. `constrainedMemory`——如果程序有被容器或作業系統限制記憶體上限，回傳這個上限值
30. `availableMemory`——回傳目前系統還剩多少可用記憶體

### b-7. 程序控制（8個）

31. `kill`——對指定的程序ID（PID）發送訊號，常見用法是結束另一個程序
32. `exit`——立刻結束目前的Node程序，可指定結束代碼
33. `execve`——（僅Unix系）用新的程式完全取代目前程序，Windows平台上這個功能受限
34. `ref`——把某個計時器或資源標記為「會讓程序保持運作」，只要還有被`ref`的資源，Node就不會自動結束
35. `unref`——跟`ref`相反，標記某個資源不會阻止程序結束
36. `finalization`——即將加入的終結器（Finalizer）相關API，用來在物件被垃圾回收時執行清理動作
37. `hrtime`——高解析度時間量測（High-Resolution Time），常用來精確計算程式碼執行耗時，`bigint`是它回傳`BigInt`格式的版本
38. `openStdin`——舊版API，開啟標準輸入（stdin）的可讀串流，新程式碼建議直接用`process.stdin`

### b-8. 環境旗標與功能開關（3個）

39. `allowedNodeEnvironmentFlags`——列出啟動Node時，`NODE_OPTIONS`環境變數允許使用哪些旗標
40. `features`——回報這支Node.js執行檔編譯時有沒有啟用某些功能，例如`inspector`（除錯器）、`tls`（傳輸層加密）、`ipv6`
41. `_fatalException`——攔截未被捕捉的例外（Uncaught Exception）的內部處理函式

### b-9. 例外處理與計時器佇列（8個）

42. `setUncaughtExceptionCaptureCallback`——設定一個回呼函式，統一攔截所有未被`catch`的例外
43. `hasUncaughtExceptionCaptureCallback`——回傳目前是否已經設定了上面那個回呼函式
44. `emitWarning`——手動觸發一個Node層級的警告訊息（會印在終端機的黃色警告字樣）
45. `nextTick`——把一個函式排到「目前這輪同步程式碼執行完、但在任何I/O或計時器之前」執行，是Node裡優先權最高的非同步排程方式
46. `_tickCallback`——`nextTick`底層實際執行佇列的內部函式
47. `sourceMapsEnabled`——回傳目前是否開啟了Source Map支援（讓錯誤堆疊訊息能對應回TypeScript等原始碼位置）
48. `setSourceMapsEnabled`——手動開關Source Map支援
49. `getBuiltinModule`——取得Node內建模組（例如`fs`、`path`）的參照，不用透過`require`

### b-10. 除錯與效能分析（4個）

50. `_debugProcess`——對指定PID的另一個Node程序啟用除錯模式，內部API
51. `_debugEnd`——結束上面那個除錯連線，內部API
52. `_startProfilerIdleNotifier`——啟動V8效能分析器的閒置通知，內部API，注意這裡出現的是V8的功能，透過Node綁定暴露出來
53. `_stopProfilerIdleNotifier`——停止上面那個閒置通知，內部API

### b-11. 標準輸入輸出串流（3個）

54. `stdout`——標準輸出串流，`console.log`最終就是寫到這裡
55. `stdin`——標準輸入串流，讀取使用者在終端機打的內容
56. `stderr`——標準錯誤輸出串流，錯誤訊息、警告通常寫到這裡而不是`stdout`

### b-12. 程序資訊與環境變數（10個）

57. `abort`——立刻中止程序並產生一個核心傾印檔（Core Dump），比`exit`更粗暴
58. `umask`——設定或查詢新建立檔案的預設權限遮罩（Unix系概念，Windows上作用有限）
59. `chdir`——切換目前程序的工作目錄
60. `cwd`——回傳目前程序的工作目錄（Current Working Directory），例如你這裡是`C:\coding\JavaScript-practicing`
61. `env`——目前程序拿到的所有環境變數，內容依你的系統而異，詳細拆解見下面(e)，**這裡不會列出你的實際數值**
62. `title`——目前程序在工作管理員／`ps`裡顯示的標題，你這邊顯示的是啟動它的PowerShell路徑
63. `argv`——啟動這個Node程序時的完整命令列參數陣列，第一個固定是Node執行檔本身的路徑
64. `execArgv`——啟動Node時，傳給Node執行檔本身的選項（不是傳給你的腳本的參數）
65. `pid`——目前這個Node程序的行程識別碼（Process ID）
66. `ppid`——啟動這個Node程序的父行程（Parent Process，也就是你的PowerShell）的行程識別碼

### b-13. 其餘系統資訊與內部狀態（4個）

67. `execPath`——目前執行的`node.exe`檔案在磁碟上的完整路徑
68. `debugPort`——除錯器預設監聽的Port號，通常是`9229`
69. `argv0`——啟動命令實際打的第一個詞，通常跟`argv[0]`一樣
70. `_preload_modules`——用`--require`參數預先載入的模組清單，內部使用

### b-14. 其餘（3個）

- `report`——診斷報告（Diagnostic Report）功能的存取點，可以在程序當機時自動產生一份包含堆疊、記憶體、系統資訊的報告檔
- `Symbol(shapeMode)`——Node內部用Symbol當作隱藏屬性鍵值，避免跟一般字串屬性名稱衝突，屬於內部實作細節，不需要深究
- `Symbol(kCapture)`——同上，內部用來標記EventEmitter是否啟用「補抓錯誤」模式的內部旗標

## (c) `process.versions`：所有內建元件的版本號，共27個

<mark style="background: #FFF3A3A6;">這一包完整印出Node.js這支執行檔裡「捆綁」了哪些第三方函式庫，每一個版本都是編譯Node.js當下鎖定的版本，你自己另外`npm install`的套件不會出現在這裡。</mark>

1. `node`——Node.js本身的版本號
2. `acorn`——Node內部用來解析JavaScript語法的其中一個Parser（主要用在部分工具鏈，不是V8主要用的Parser）
3. `ada`——一套高效能的URL解析函式庫，Node的`URL`物件底層用它
4. `amaro`——Node內建用來去除TypeScript型別標註的工具，讓Node能直接執行`.ts`檔案裡的型別語法（不做型別檢查，只是移除）
5. `ares`（c-ares）——非同步DNS解析函式庫，[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]提過的那個c-ares
6. `brotli`——Google開發的資料壓縮演算法，比gzip壓縮率更高，常用在HTTP回應壓縮
7. `cldr`——Unicode的地區化資料庫（Common Locale Data Repository），提供各國日期、貨幣、數字格式規則
8. `icu`——國際化元件（International Components for Unicode），處理多語言文字排序、大小寫轉換等
9. `llhttp`——[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]提過的HTTP協定解析器
10. `merve`——Node內部使用的一個輔助函式庫（用途較內部化，官方文件說明較少）
11. `modules`——Node原生模組（Addon）的ABI（應用二進位介面，Application Binary Interface）版本號，用來判斷編譯好的原生模組跟目前Node版本相不相容
12. `napi`——Node-API的版本號，一套讓原生C++擴充模組不用跟著Node版本重新編譯的穩定介面
13. `nbytes`——處理位元組（byte）大小格式化的小型工具庫
14. `ncrypto`——Node內部用的加密輔助函式庫
15. `nghttp2`——HTTP/2協定的實作函式庫
16. `openssl`——處理TLS加密連線、雜湊、憑證的加密函式庫，`https`模組底層依賴它
17. `simdjson`——用SIMD（單一指令多資料，Single Instruction Multiple Data）加速的JSON解析函式庫
18. `simdutf`——用SIMD加速的Unicode編碼轉換函式庫
19. `sqlite`——Node 22版之後內建的SQLite資料庫引擎版本號
20. `tz`——時區資料庫（IANA Time Zone Database）版本，決定`Date`物件處理各地時區、日光節約時間的規則
21. `undici`——Node內建的HTTP用戶端函式庫，`fetch`底層實際上就是undici實作的
22. `unicode`——Node支援的Unicode標準版本
23. `uv`——libuv的版本號，見[[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]
24. `uvwasi`——讓WASI（WebAssembly System Interface）程式能透過libuv存取系統資源的相容層
25. `v8`——**V8引擎本身的版本號**，注意版本號後面的`-node.41`代表這是Node.js團隊在官方V8基礎上額外patch過41次的版本，不是原封不動的Google V8，呼應[[01-引擎-Engine-到底是什麼]](b)講的「同一顆V8」其實各家host會有自己的微調
26. `zlib`——經典的gzip/deflate壓縮函式庫
27. `zstd`——Meta開發的另一套壓縮演算法，壓縮率與速度的平衡通常優於zlib

## (d) `process.config.variables`：編譯這支Node.js時鎖定的建置參數，共104個

<mark style="background: #ADCCFFA6;">你要求全部列完，這裡逐一補齊，照你貼的原始順序編號：</mark>

1. `use_ccache_win`——是否在Windows上使用ccache（編譯快取工具）加速重複編譯，這裡是`0`，沒開啟
2. `clang`——是否用Clang這套編譯器編譯，`1`代表有
3. `llvm_version`——Clang所屬的LLVM編譯器工具鏈版本號
4. `nasm_version`——NASM（組合語言組譯器，Netwide Assembler）版本，用來組譯某些函式庫裡的組合語言程式碼
5. `node_prefix`——Node.js預設的安裝路徑前綴，這是Unix慣例路徑，Windows上這個值通常不會真的被用到
6. `node_install_npm`——編譯時是否一併安裝npm，`true`代表有
7. `node_install_corepack`——是否一併安裝Corepack（管理pnpm、yarn等套件管理工具版本的工具）
8. `control_flow_guard`——是否開啟Windows的控制流程防護（Control Flow Guard，防止程式被劫持跳轉到惡意記憶體位址的資安機制），這裡沒開
9. `node_use_amaro`——是否啟用前面(c)提過的amaro（去除TypeScript型別標註用的工具）
10. `debug_node`——是否編譯成Node本身的除錯版本，`false`代表這是正式發行版
11. `error_on_warn`——編譯時是否把警告當成錯誤處理、中斷建置
12. `suppress_all_error_on_warn`——是否完全抑制「警告視為錯誤」這個機制
13. `use_prefix_to_find_headers`——是否用第5項的`node_prefix`路徑去尋找標頭檔
14. `host_arch`——執行建置動作那台機器本身的CPU架構
15. `target_arch`——這次建置的目標成品要跑在哪種CPU架構上，這裡跟`host_arch`一樣是`x64`，代表不是跨平台編譯
16. `node_byteorder`——目標平台的位元組順序（Byte Order），`little`代表小端序，x86／x64都是小端序
17. `want_separate_host_toolset`——跨平台編譯時是否需要另外準備一套跑在建置機器上的工具鏈，這裡不需要
18. `node_use_node_snapshot`——是否使用Node啟動快照（把啟動時該做的初始化工作預先做好存成快照檔），能加快每次啟動速度
19. `node_use_node_code_cache`——是否快取Node內建JS程式碼編譯後的Bytecode，加快啟動速度
20. `node_write_snapshot_as_array_literals`——產生快照檔時是否用陣列字面值格式寫出，屬於建置細節
21. `node_enable_v8_vtunejit`——是否開啟跟Intel VTune效能分析工具整合的V8 JIT除錯支援，這裡沒開
22. `enable_pgo_generate`——是否編譯成「產生PGO（設定檔導引最佳化，Profile-Guided Optimization）資料」用的版本
23. `enable_pgo_use`——是否使用先前收集好的PGO資料來最佳化這次編譯
24. `enable_lto`——是否啟用LTO（連結時最佳化，Link-Time Optimization），讓編譯器在連結階段跨檔案做進一步最佳化
25. `single_executable_application`——是否支援把Node腳本打包成單一執行檔的功能，這裡有支援
26. `node_with_ltcg`——Windows平台專屬，是否啟用LTCG（連結時程式碼產生），概念上跟上面的LTO類似
27. `node_tag`——版本標籤字串，用來標記正式版以外的特殊建置（例如候選版），這裡是空字串代表正式版
28. `node_release_urlbase`——官方發行版下載頁的網址前綴
29. `node_debug_lib`——是否連結除錯版的函式庫
30. `debug_nghttp2`——是否對nghttp2（HTTP/2函式庫）開啟除錯模式
31. `node_no_browser_globals`——是否要「移除」瀏覽器風格的全域物件（例如`fetch`這些後來才加進Node的Web API），`false`代表保留，這也解釋了為什麼你的Node環境裡`fetch`還在
32. `node_shared`——是否把Node本身也編譯成共用函式庫（Shared Library）讓別的程式呼叫，而不是獨立執行檔
33. `libdir`——函式庫檔案要安裝到哪個資料夾名稱
34. `node_module_version`——前面(c)提過的原生模組ABI版本號，跟`process.versions.modules`是同一個數字
35. `shlib_suffix`——共用函式庫檔名的副檔名格式
36. `asan`——是否啟用AddressSanitizer（記憶體錯誤偵測工具，能抓出緩衝區溢位、使用已釋放記憶體等問題），這裡沒開，是正式發行版的正常設定
37. `ubsan`——是否啟用UndefinedBehaviorSanitizer（偵測C++未定義行為的工具），一樣沒開
38. `coverage`——是否編譯成計算程式碼覆蓋率用的版本
39. `node_target_type`——這次建置產出的目標型態，`executable`代表是一支執行檔
40. `node_library_files`——建置時包含哪些Node核心JS函式庫檔案的清單，你貼的原始輸出因為內容太長被截斷顯示成`[Array]`
41. `node_cctest_sources`——Node自己的C++單元測試（cctest）原始碼清單，同樣被截斷顯示
42. `napi_build_version`——前面(c)提過的Node-API版本號
43. `node_shared_zlib`——是否連結系統上既有的zlib，而不是用Node自己捆綁的版本，`false`代表用Node自己捆綁的
44. `node_shared_http_parser`——同上，針對HTTP解析器（新版Node已改用llhttp）
45. `node_shared_libuv`——同上，針對libuv
46. `node_shared_ada`——同上，針對(c)提過的URL解析函式庫ada
47. `node_shared_simdjson`——同上，針對simdjson
48. `node_shared_simdutf`——同上，針對simdutf
49. `node_shared_brotli`——同上，針對brotli壓縮函式庫
50. `node_shared_cares`——同上，針對c-ares（DNS解析）
51. `node_shared_gtest`——是否用系統上的Google Test框架，而非Node自己捆綁的版本
52. `node_shared_hdr_histogram`——同上，針對HdrHistogram（Node內部效能量測用的高精度直方圖統計函式庫）
53. `node_shared_merve`——同上，針對前面(c)提過的merve
54. `node_shared_nbytes`——同上，針對nbytes
55. `node_shared_nghttp2`——同上，針對nghttp2
56. `node_shared_nghttp3`——同上，針對nghttp3（HTTP/3函式庫）
57. `node_shared_ngtcp2`——同上，針對ngtcp2（QUIC通訊協定函式庫，HTTP/3底層用的傳輸協定）
58. `node_use_sqlite`——是否啟用Node內建的SQLite支援，這裡是`true`
59. `node_shared_sqlite`——是否用系統既有的SQLite，而非Node捆綁的版本
60. `node_shared_uvwasi`——同上，針對uvwasi
61. `node_shared_zstd`——同上，針對zstd壓縮函式庫
62. `v8_enable_webassembly`——V8的WebAssembly支援，這裡有開啟，讓Node.js能執行`.wasm`檔案
63. `v8_enable_javascript_promise_hooks`——是否開放JS層級可以掛勾（Hook）進Promise的內部生命週期事件，供除錯／效能分析工具使用
64. `v8_enable_lite_mode`——是否編譯成V8的輕量模式（犧牲執行效能換取更小記憶體佔用，常用在嵌入式或行動裝置），這裡沒開
65. `v8_enable_gdbjit`——是否讓GDB（GNU除錯器）能識別V8即時編譯出來的機器碼，方便除錯，這裡沒開
66. `v8_optimized_debug`——除錯建置時是否仍套用最佳化，這裡設定為`1`，但因為第10項`debug_node`是`false`，這個選項在目前這支正式版上不會真正生效
67. `dcheck_always_on`——是否強制開啟V8的DCHECK（只在除錯情境才啟用的斷言檢查機制），這裡沒開，符合正式版身分
68. `v8_enable_object_print`——是否啟用可以把V8內部物件結構印出來看的除錯工具，這裡有開
69. `v8_random_seed`——V8內部雜湊等機制用的亂數種子設定，`0`通常代表用真正隨機、不是固定種子
70. `v8_promise_internal_field_count`——Promise物件內部保留給V8引擎自己使用的隱藏欄位數量，通常給(c-6)講的那些嵌入V8的C++宿主程式附加額外資訊用
71. `v8_use_siphash`——是否用SipHash這個雜湊演算法，設計上能抵抗雜湊碰撞攻擊
72. `v8_enable_maglev`——Maglev是V8繼Ignition、TurboFan之後新增的「中階」JIT編譯器，這裡有開啟，可以跟[[01-引擎-Engine-到底是什麼]](e-1)講的JIT混合型架構對照
73. `v8_enable_pointer_compression`——V8的指標壓縮功能沒有開啟（值是`0`），開啟後能讓V8在64位元系統上用更小的記憶體位址表示法省記憶體
74. `v8_enable_sandbox`——V8的沙箱安全機制（限制V8內部記憶體存取範圍、防禦某些安全漏洞）沒有開啟
75. `v8_enable_pointer_compression_shared_cage`——指標壓縮底下更細的選項，決定是否讓多個V8 Isolate（(c-6)(c-7)提過的V8虛擬機器實例）共用同一塊記憶體「籠子」
76. `v8_enable_external_code_space`——是否把V8產生的機器碼放到獨立的記憶體空間，是指標壓縮相關的安全與效能設計
77. `v8_enable_31bit_smis_on_64bit_arch`——是否在64位元系統上仍用31位元表示SMI（小整數，V8內部對小整數的特殊優化表示法），通常跟指標壓縮搭配使用
78. `v8_enable_extensible_ro_snapshot`——是否讓V8的唯讀快照（啟動時預先建好、不會變動的內建物件資料）可以被擴充
79. `v8_trace_maps`——是否開啟V8的Map追蹤除錯功能（這裡的Map指V8內部描述物件結構、形狀的機制，不是JS的`Map`資料結構），這裡沒開
80. `node_use_v8_platform`——是否使用V8提供的Platform介面，讓V8能跟Node的Event Loop、Thread Pool協調，這裡是`true`
81. `node_use_bundled_v8`——確認Node.js用的是自己捆綁打包的V8版本，不是去讀系統上其他地方安裝的V8
82. `force_dynamic_crt`——是否強制連結動態版的C執行期函式庫，Windows平台編譯選項
83. <mark style="background: #FF5582A6;">`node_enable_d8`——**這個直接對到(c-7)的答案**：`false`，代表你這支Node.js在編譯的時候，明確把V8內建的`d8`除錯殼層關掉了、沒有打包進來，這也是為什麼你沒辦法在Node.js裡面直接叫出`d8`，這正是(c-7)建議你另外用jsvu抓一份獨立`d8`／`v8`執行檔的原因</mark>
84. `node_enable_v8windbg`——是否啟用V8跟WinDbg（Windows除錯工具）的整合擴充功能，這裡沒開
85. `v8_enable_hugepage`——是否讓V8使用作業系統的大分頁記憶體（減少記憶體管理開銷的機制），這裡沒開
86. `v8_enable_short_builtin_calls`——是否啟用「縮短內建函式呼叫指令」的最佳化，減少V8內部呼叫內建函式的機器碼體積，這裡有開
87. `v8_enable_wasm_simd256_revec`——是否啟用WebAssembly SIMD指令的256位元向量化重寫最佳化，這裡有開
88. `node_use_openssl`——是否啟用OpenSSL加密支援，這裡是`true`
89. `node_shared_openssl`——是否用系統既有的OpenSSL，而非Node捆綁版本
90. `openssl_is_fips`——這份OpenSSL是否為FIPS（美國聯邦資訊處理標準）認證版本，這裡沒有
91. `node_quic`——是否啟用QUIC通訊協定支援（HTTP/3底層的傳輸協定），這裡沒開
92. `node_fipsinstall`——是否啟用FIPS模式的OpenSSL安裝流程
93. `node_without_node_options`——是否停用`NODE_OPTIONS`環境變數的讀取功能，這裡沒停用，也就是`NODE_OPTIONS`正常可用
94. `openssl_quic`——OpenSSL本身是否啟用QUIC相關功能
95. `icu_small`——`false`代表這支Node.js包的是完整版ICU國際化資料，不是精簡版，語系、時區資料比較齊全，但執行檔體積也比較大
96. `v8_enable_i18n_support`——是否啟用V8的國際化支援（例如`Intl`物件），這裡有開
97. `icu_gyp_path`——ICU函式庫建置設定檔在原始碼裡的路徑
98. `icu_path`——ICU資料檔案在原始碼裡的路徑
99. `icu_ver_major`——使用的ICU主版本號，跟`process.versions.icu`對應
100. `icu_endianness`——ICU資料檔案的位元組順序，`l`代表小端序
101. `icu_data_in`——實際的ICU資料檔案路徑
102. `v8_enable_inspector`——是否啟用V8的Inspector除錯協定支援，讓Chrome DevTools能連進來除錯Node程式，呼應(c-5)講的CDP協定
103. `node_builtin_shareable_builtins`——哪些Node內建模組允許在Worker Threads之間共用，同樣被截斷顯示成`[Array]`
104. `ossfuzz`——是否為OSS-Fuzz（Google的開源模糊測試服務）產生特製的模糊測試建置版本

<mark style="background: #ADCCFFA6;">104項全部列完。整體來看，這包東西可以歸納成幾大類：a版本與工具鏈資訊（1到4、27到28）；b編譯選項與最佳化開關（8、21到26、36到38、65到79、85到87）；c要不要用系統既有函式庫還是Node自己捆綁的版本（43到61的`node_shared_*`系列）；d V8特定功能開關（62到83的`v8_*`系列，`node_enable_d8`就在這裡）；e國際化ICU設定（95到101）；f加密與網路協定（88到94）。</mark>

## (e) `process.env`：目前程序拿到的環境變數，只解釋變數名稱概念，不列出你的實際數值

<mark style="background: #FF5582A6;">這一段你貼的原始輸出裡包含你的Windows使用者名稱、電腦名稱、大量本機資料夾路徑，還有前面警告區塊提到的那組API金鑰。這些都是只跟你這台電腦有關的個人資訊，不適合原封不動記進筆記或分享出去，下面只解釋「這個變數名稱通常代表什麼」，不重複你貼的實際內容。</mark>

a. `USERNAME`、`USERPROFILE`、`HOMEDRIVE`、`HOMEPATH`——目前登入的Windows使用者帳號名稱，以及這個使用者的家目錄路徑
b. `COMPUTERNAME`、`USERDOMAIN`、`LOGONSERVER`——這台電腦在區域網路裡的名稱與登入驗證資訊
c. `APPDATA`、`LOCALAPPDATA`、`TEMP`、`TMP`——Windows規定應用程式存放設定檔、暫存檔的標準資料夾位置
d. `Path`——作業系統搜尋可執行檔的資料夾清單，只要某個程式的資料夾有列在這裡，就能在終端機直接打程式名稱執行，不用打完整路徑，你這份`Path`裡看得到Node.js、Git、Python、Docker等工具的安裝位置
e. `PATHEXT`——Windows判斷「打這個檔名不用加副檔名也能執行」的副檔名清單，例如`.EXE`、`.BAT`、`.CMD`
f. `PSModulePath`——PowerShell搜尋模組的資料夾清單
g. `ChocolateyInstall`、`GOPATH`、`PNPM_HOME`——分別是Chocolatey（Windows套件管理工具）、Go語言、pnpm這幾個工具各自的安裝或資料目錄
h. `NUMBER_OF_PROCESSORS`、`PROCESSOR_ARCHITECTURE`、`PROCESSOR_IDENTIFIER`——CPU的邏輯核心數量與型號資訊
i. `ComSpec`——預設命令直譯器的路徑，Windows上通常指向`cmd.exe`
j. `OS`、`SystemDrive`、`SystemRoot`、`windir`——作業系統類型跟系統資料夾位置
k. `TERM_PROGRAM`、`TERM_PROGRAM_VERSION`、`COLORTERM`——目前這個終端機（你這裡是VS Code的整合終端機）的識別資訊
l. `GIT_ASKPASS`、`VSCODE_GIT_ASKPASS_NODE`、`VSCODE_GIT_IPC_HANDLE`——VS Code跟Git整合時，處理帳密詢問跟程序間通訊用的內部設定
m. `CLAUDE_CODE_SSE_PORT`、`CLAUDE_CODE_USE_POWERSHELL_TOOL`——你這個開發環境裡跟Claude Code相關的設定
n. `GOOGLE_GEMINI_API`——一組Google Gemini的API金鑰，**這組請依前面警告區塊的建議儘快更換**
o. 其餘像`ALLUSERSPROFILE`、`ProgramFiles`、`CommonProgramFiles`——都是Windows標準的系統資料夾位置變數，每台Windows電腦上這些變數名稱都一樣，只有實際路徑值依安裝位置而異

## 對照總結

| 物件 | 誰提供的 | 這篇對應到01筆記的哪一節 |
|---|---|---|
| `window`／`document` | 瀏覽器Host環境（Chrome），Node裡不存在 | (c)(c-4)(c-7) |
| `global` | Node.js這個Host環境自己加的全域物件 | (c-7) |
| `process` | Node.js這個Host環境的核心API，讓JS能碰到作業系統層級的東西 | (c-6)(c-8) |
| `process.versions.v8` | V8引擎本身的版本，證明Node內部真的嵌入了一整顆V8 | (c-6) |
| `process.config.variables.node_enable_d8` | 直接證實這支Node.js建置時關掉了`d8` | (c-7) |

---

## 追加 2026-08-06：語音對談補充（setInterval 任務分類、`tz`、`zlib`）

> 重點編號延續為 (f)–(i)，共 4 個新增。來源：Gemini Live 語音對談 https://gemini.google.com/app/2aaa32d4d098781d ，語音辨識有多處錯字（例如「微任務」被辨識成「偽任務」、「宏任務」被辨識成「紅任務」），下面已還原為正確用詞。

> [!info] 這段跟哪些筆記相關，以及為什麼
> - [[事件循環-Event-Loop-微任務與巨任務]]：(f) 講的 `setInterval` 屬於哪一種任務、以及三段執行順序，完整版在那篇。本篇只補上「`global` 底下這幾個計時器函式各自落在哪個佇列」這一層對應，因為 (a) 已經列了 `setInterval`／`setImmediate`／`queueMicrotask`，正好可以把「名字」跟「佇列」接起來。
> - [[Node-js底層架構-V8-libuv-Bindings與CSR澄清]]：(h) 的 `zlib` 就是那篇 (a) 分層圖裡「其他專門 C 函式庫」那一格點名的成員之一，這裡補上它實際是做什麼的。

### (f) `setInterval` 是宏任務（Macrotask），不是微任務

<mark style="background: #ADCCFFA6;">`setInterval` 與 `setImmediate` 同屬非同步機制</mark>，但兩者都<mark style="background: #FFF3A3A6;">歸類為宏任務（Macrotask／Task）</mark>——每次計時結束時被放進宏任務佇列等待執行。

執行順序（<mark style="background: #BBFABBA6;">面試必背的三段式</mark>）：

1. 先執行完**所有同步任務**（呼叫堆疊清空）
2. 再清空**微任務佇列（Microtask Queue）**：`Promise.then`、`queueMicrotask`、`process.nextTick`
3. 最後才輪到**宏任務佇列（Macrotask Queue）**：`setTimeout`、`setInterval`、`setImmediate`、I/O 回呼

對應回本篇 (a) 的 `global` 屬性清單：

| `global` 上的函式 | 落在哪個佇列 |
|---|---|
| `queueMicrotask` | <mark style="background: #ADCCFFA6;">微任務</mark> |
| `setTimeout` / `setInterval` | <mark style="background: #D2B3FFA6;">宏任務</mark>（timers 階段） |
| `setImmediate` | <mark style="background: #D2B3FFA6;">宏任務</mark>（check 階段，在同一輪 I/O 回呼之後） |

### (g) `process.platform` 顯示 `win32` 但 `process.arch` 是 `x64`——這不衝突

<mark style="background: #FF5582A6;">⚠️ 這裡 Gemini 講錯了，我更正如下。</mark>Gemini 在對談中說「`win32` 通常代表它是 64 位元系統上的 32 位元模擬層」，<mark style="background: #FF5582A6;">這是錯的</mark>。

正確說法：Node.js 的 `process.platform` 對 Windows <mark style="background: #BBFABBA6;">一律回傳字串 `'win32'`，不論實際是 32 位元還是 64 位元</mark>。這只是 Node.js 沿用歷史命名的<mark style="background: #FFF3A3A6;">平台識別字串</mark>，跟位元數完全無關（同理 macOS 一律回傳 `'darwin'`）。真正表示位元數／CPU 架構的是 `process.arch`，你的是 `x64`，所以你跑的就是道地的 64 位元 Node.js，沒有任何模擬層。

### (h) `zlib` 是什麼

<mark style="background: #ADCCFFA6;">`zlib`</mark> 是 Node.js 內建的<mark style="background: #FFF3A3A6;">資料壓縮模組</mark>，提供 Gzip、Deflate、Brotli 等演算法的壓縮與解壓縮功能。常見用途：HTTP 回應內容壓縮（`Content-Encoding: gzip`）、讀寫 `.gz` 檔案、打包工具的產物壓縮。它是本篇 (c) `process.versions` 裡會列出版本號的內建 C 函式庫之一。

### (i) `process.versions.tz`（或 `tz` 屬性）：IANA 時區資料庫版本

`tz` 代表目前這支 Node.js 內建的 <mark style="background: #ADCCFFA6;">IANA 時區資料庫（IANA Time Zone Database，又稱 tz database／zoneinfo）</mark>版本，顯示 `2025c` 就是該資料庫的版次代號（格式為「年份＋流水字母」）。這個資料庫記錄全球各時區的時差與日光節約時間規則，各國政府改動時區政策時 IANA 就會發新版，所以它會隨 Node.js 版本更新而變動。<mark style="background: #FFB8EBA6;">若程式碼有跨時區換算需求，這個版號決定了你的日光節約規則新不新。</mark>

### 自我測驗

> [!question] 是非題（點答案可顯示／隱藏）
> 1. `setInterval` 的回呼會排進微任務佇列。 → ||✘ 錯。`setInterval` 是宏任務，排在微任務全部清空之後。||
> 2. `process.platform` 回傳 `win32` 代表你在跑 32 位元的 Node.js。 → ||✘ 錯。Windows 一律回傳 `'win32'`，位元數要看 `process.arch`。||
> 3. `zlib` 是 Node.js 內建模組，不用另外 `npm install`。 → ||✔ 對。它跟 `fs`、`http` 一樣是內建核心模組。||

> [!question] 申論題
> 為什麼 `process.versions.tz` 這種版本號值得留意？
> → ||因為 IANA 時區資料庫記錄的是各國時區與日光節約時間的規則，而這些規則會被政府修改（例如某國宣布取消日光節約時間）。如果你的 Node.js 內建的 tz 版本太舊，做跨時區時間換算時就可能算出錯誤的當地時間。因此涉及國際化排程、會議時間換算的系統，需要確認 runtime 的 tz 版本夠新，或改用會自行更新時區資料的套件。||

---

## 各對話來源（追加部分）

### 解釋 Node.js 全域物件循環參考（2026-08-06，Gemini Live 語音）— https://gemini.google.com/app/2aaa32d4d098781d

使用者：是像 setInterval 嗎？那 setInterval 是微任務還是宏任務呢？／它就是會先執行同步任務，才執行微任務，最後再執行宏任務。／（指著螢幕上 Node REPL 的輸出）我是說這個。／（指 `tz` 屬性）／我說 zlib 是什麼？／網路傳輸是什麼？

Gemini：setInterval 和 setImmediate 一樣都屬於非同步機制，setInterval 屬於宏任務，每次計時結束時被放入宏任務佇列等待執行。使用者對執行順序的總結正確：先處理所有同步任務，接著執行微任務佇列，最後才執行宏任務。關於畫面上的 process 輸出，Gemini 表示顯示 `win32` 但硬體架構是 `x64`，實際運行在 64 位元環境（<mark style="background: #FF5582A6;">此處 Gemini 對 win32 的解釋有誤，已於上方 (g) 更正</mark>）。`tz` 屬性代表當前系統使用的 IANA 時區資料庫版本，畫面顯示 `2025c` 即目前版本名稱。zlib 是 Node.js 內建的資料壓縮函式庫，提供 Gzip 或 Deflate 演算法的壓縮解壓縮功能。最後使用者問「網格傳輸」，Gemini 解釋為網格計算（Grid Computing，把分散各地的電腦連成虛擬超級電腦協同運算）或網狀網路（Mesh Network，點對點分發不依賴單一中央伺服器）兩種可能語意。

<mark style="background: #D2B3FFA6;">備註：這是一段 Gemini Live 語音對談，逐字稿有大量語音辨識錯字（「微任務」→「偽任務」、「宏任務」→「紅任務」、「zlib」→「z lip」），中間還夾雜與主題無關的閒聊回合（例如問「z 的筆順」），已在整理時濾除。</mark>

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本機 Node.js REPL 實測輸出 | 使用者電腦，Node.js v24.14.0，Windows x64 | 2026-08-05 實測 |
| Gemini 語音對談原文 | https://gemini.google.com/app/2aaa32d4d098781d | 對話日期 2026-08-06 |
| `process.platform` 對 Windows 一律回傳 `'win32'`（用於更正 Gemini 說法） | https://nodejs.org/api/process.html#processplatform | 查證日 2026-08-06 |
| `zlib` 模組（Gzip／Deflate／Brotli） | https://nodejs.org/api/zlib.html | 查證日 2026-08-06 |
| IANA Time Zone Database 版本命名規則 | https://www.iana.org/time-zones | 查證日 2026-08-06 |
