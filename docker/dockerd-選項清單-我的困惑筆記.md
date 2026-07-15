## 什麼時候要用&來開啟server端本機的dockerd.exe
> 來源指令(注意:路徑有空格 → 要用 `&` + 引號):
> ```powershell
> & 'C:\Program Files\Docker\Docker\resources\dockerd.exe' --help
> ```
> ⚠️ 這些是 **`dockerd`(引擎/伺服器)的「開機設定旗標」**,不是你日常打的 `docker` CLI 指令!
> Docker Desktop 已經幫你把引擎連同這些設定啟動好,平常你「幾乎不會用到」。
> 想看「我 CLI 能用什麼」→ 改打 `docker --help`。
> 詳細概念見:[[docker-引擎-context-image-container-觀念]]

---
## ❓ 我的困惑總覽(自由書寫區)

> 在這裡寫下你看不懂、想問的點,之後一次問:

- (例)==--data-root 跟 ./data 的 volume 有什麼不同?==
- 如果這些指令我不能直接操作為何他要包裝得好像是使用者平常在下的command? like --authorization-plugin
- swarm, tls分別是什麼
-

---

## 選項全表(白話翻譯)

> 「我的困惑/筆記」欄空著給你填。看不懂的整列可以用 `==...==` 標黃。

| 旗標(option)                       | 白話翻譯                                                 | 我的困惑/筆記 |
| -------------------------------- | ---------------------------------------------------- | ------- |
| `--authorization-plugin`         | 載入授權外掛(控制誰能對引擎下指令)                                   |         |
| `-b, --bridge`                   | 把容器接到指定的虛擬網路橋接器                                      |         |
| `--cdi-spec-dir`                 | CDI 規格檔目錄(給 GPU 等裝置用)                                |         |
| `--config-file`                  | 引擎的設定檔路徑(daemon.json)                                |         |
| `--containerd`                   | 底層 containerd 的連線位址                                  |         |
| `--containerd-namespace`         | containerd 用的命名空間(預設 moby)                           |         |
| `--containerd-plugins-namespace` | containerd 外掛用的命名空間                                  |         |
| `--cri-containerd`               | 啟動 containerd 並帶 CRI(K8s 介面)                         |         |
| `--data-root`                    | 引擎把資料(image/容器/volume)存哪(預設 `C:\ProgramData\docker`) |         |
| `-D, --debug`                    | 開除錯模式(印更詳細 log)                                      |         |
| `--default-network-opt`          | 預設網路選項                                               |         |
| `--default-runtime`              | 預設用哪個 OCI runtime 跑容器                                |         |
| `--dns`                          | 容器預設用的 DNS 伺服器                                       |         |
| `--dns-opt`                      | DNS 選項                                               |         |
| `--dns-search`                   | DNS 搜尋網域                                             |         |
| `--exec-opt`                     | runtime 執行選項                                         |         |
| `--exec-root`                    | 執行狀態檔的根目錄                                            |         |
| `--experimental`                 | 開啟實驗性功能                                              |         |
| `--feature`                      | 開啟引擎的某個功能                                            |         |
| `--fixed-cidr`                   | 固定 IP 用的 IPv4 子網                                     |         |
| `-G, --group`                    | 哪些使用者/群組能存取那扇「門」(named pipe)                         |         |
| `--help`                         | 印說明                                                  |         |
| `-H, --host`                     | 引擎要開哪些「門」(socket)讓 CLI 連                             |         |
| `--host-gateway-ip`              | host-gateway 解析到的 IP                                 |         |
| `--http-proxy`                   | 對外連線用的 HTTP 代理                                       |         |
| `--https-proxy`                  | 對外連線用的 HTTPS 代理                                      |         |
| `--insecure-registry`            | 允許連不安全(非 HTTPS)的 registry                            |         |
| `--label`                        | 給引擎貼 key=value 標籤                                    |         |
| `--log-driver`                   | 容器 log 預設用哪種驅動存(預設 json-file)                        |         |
| `--log-format`                   | 引擎自己 log 的格式(text/json)                              |         |
| `-l, --log-level`                | 引擎 log 詳細度(debug/info/warn/error/fatal)              |         |
| `--log-opt`                      | log 驅動的選項                                            |         |
| `--max-concurrent-downloads`     | 同時最多下載幾層 image(預設 3)                                 |         |
| `--max-concurrent-uploads`       | 同時最多上傳幾層(預設 5)                                       |         |
| `--max-download-attempts`        | 每次 pull 最多重試幾次(預設 5)                                 |         |
| `--metrics-addr`                 | 對外提供監控 metrics 的位址                                   |         |
| `--network-control-plane-mtu`    | 網路控制平面 MTU(預設 1500)                                  |         |
| `--no-proxy`                     | 哪些主機/IP 不走代理                                         |         |
| `--node-generic-resource`        | 宣告自訂資源(swarm 用)                                      |         |
| `-p, --pidfile`                  | 引擎 PID 檔放哪                                           |         |
| `--raw-logs`                     | log 用完整時間戳、不上色                                       |         |
| `--register-service`             | 把 dockerd 註冊成 Windows 服務後退出                          |         |
| `--registry-mirror`              | 偏好的 registry 映像檔站(加速下載)                               |         |
| `--service-name`                 | Windows 服務名稱(預設 docker)                              |         |
| `--shutdown-timeout`             | 關閉時等待秒數(預設 15)                                       |         |
| `--storage-opt`                  | 儲存驅動選項                                               |         |
| `--swarm-default-advertise-addr` | swarm 對外公告位址                                         |         |
| `--tls`                          | 啟用 TLS 加密                                            |         |
| `--tlscacert`                    | 信任的 CA 憑證                                            |         |
| `--tlscert`                      | TLS 憑證檔                                              |         |
| `--tlskey`                       | TLS 金鑰檔                                              |         |
| `--tlsverify`                    | 啟用 TLS 並驗證對方                                         |         |
| `--unregister-service`           | 取消註冊 Windows 服務後退出                                   |         |
| `--validate`                     | 只檢查設定檔對不對就退出                                         |         |
| `-v, --version`                  | 印版本                                                  |         |

---

## 📌 重點分辨(別搞混)

| | `dockerd --help` | `docker --help` |
|---|---|---|
| 身分 | 引擎(伺服器)本體 | 遙控器(CLI) |
| 格式 | `dockerd [OPTIONS]` | `docker [OPTIONS] COMMAND` |
| 後面接 | 只接 `--旗標`(開機設定) | 接**指令**(`ps`/`run`/`compose`…) |
| 你會常打嗎 | ❌ 幾乎不(Desktop 幫你開好) | ✅ 天天打 |

> 你剛叫出的這堆 `--xxx` 是「**設定引擎怎麼開機**」的旋鈕,不是你 CLI 要打的指令。
