---
title: Round-Robin輪詢調度與負載平衡LB-L4對L7
type: topic-note
source: Gemini
tags: [gemini, 演算法, 排程, 負載平衡, load-balancer, 讀寫分離, 系統設計]
sources:
  - https://gemini.google.com/app/a9c30355e0c95e3a
updated: 2026-08-15
---

# Round Robin 輪詢調度與負載平衡（LB）｜L4 對 L7

> 本篇重點 a–s，共 19 個

相關筆記：[[DNS查詢-TCP與TLS握手RTT-邊緣節點與網頁效能]]、[[CloudFront-CDN概念與快取失效Invalidation]]、[[Cookie-與-Session]]、[[冪等性Idempotence與冪運算的區別]]
關聯原因：Round Robin 是 LB 的預設演算法；LB 又直接決定 Session 能不能黏在同一台機器（Sticky Session），所以跟 Cookie／Session 筆記是同一條鏈。CDN 與 DNS 則是這條鏈更上游的一段。

---

## 重點整理

### 一、Round Robin 是什麼

(a) <mark style="background: #ADCCFFA6;">Round Robin（RR，輪詢調度）</mark>是一種基礎且公平的<mark style="background: #ADCCFFA6;">調度演算法（Scheduling Algorithm）</mark>。核心原則是「輪流」：把待處理任務排成一個環狀佇列，每個任務給一個固定的<mark style="background: #ADCCFFA6;">時間片（Time Quantum／Time Slice）</mark>，時間到就換下一個，沒做完的排到隊尾。

(b) <mark style="background: #FFF3A3A6;">公平性是它最大的賣點</mark>：每個任務都有平等機會拿到資源，不會有任務被無限期擱置（不會 starvation）。

(c) <mark style="background: #FF5582A6;">時間片的長度是關鍵陷阱</mark>：設太短，切換太頻繁，<mark style="background: #ADCCFFA6;">上下文切換（Context Switch）</mark>的成本會吃掉效能；設太長，就退化成<mark style="background: #ADCCFFA6;">先到先服務（FCFS，First-Come First-Served）</mark>。

(d) <mark style="background: #FFB8EBA6;">三個常見應用場景</mark>：作業系統的多工排程、網路負載平衡（Server A→B→C→A）、讀寫分離架構下輪流向多個從庫讀資料。

```javascript
class RoundRobin {
  constructor(servers) {
    this.servers = servers;
    this.currentIndex = 0;
  }

  getNextServer() {
    const server = this.servers[this.currentIndex];
    // 使用取餘數運算子來達成循環
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  }
}

const lb = new RoundRobin(['Server-1', 'Server-2', 'Server-3']);
lb.getNextServer(); // Server-1
lb.getNextServer(); // Server-2
lb.getNextServer(); // Server-3
lb.getNextServer(); // Server-1（回到起點）
```

(e) <mark style="background: #FF5582A6;">RR 的先天限制</mark>：它假設所有任務或伺服器的「權重」相同。現實中有的機器效能較強、有的任務較耗時，所以會演進成 <mark style="background: #BBFABBA6;">Weighted Round Robin（加權輪詢）</mark>。

---

### 二、讀寫分離架構（Read/Write Splitting）

(f) <mark style="background: #ADCCFFA6;">讀寫分離</mark>是把資料庫的「寫入／更新」與「讀取」分開處理的架構模式：<mark style="background: #ADCCFFA6;">Master（主庫）</mark>負責 `INSERT`／`UPDATE`／`DELETE`，<mark style="background: #ADCCFFA6;">Slave（從庫）</mark>負責 `SELECT`，主庫資料透過 <mark style="background: #ADCCFFA6;">Replication（複寫）</mark>同步到多個從庫。

(g) <mark style="background: #FFF3A3A6;">為什麼要這樣做</mark>：多數應用「讀」遠多於「寫」（看文章的人多、發文章的人少），把讀取壓力分散到多個從庫能大幅提升回應速度；同時獲得高可用性（從庫掛一台還有別台，主庫掛了可把從庫升為新主庫）與水平擴展能力。

(h) <mark style="background: #BBFABBA6;">分流規則</mark>：所有寫入精確導向 Master；多個 Slave 之間就用 Round Robin 輪流分配讀取請求。

```javascript
const db = {
  master: createConnection('master-db-url'),
  slaves: [createConnection('slave-1-url'), createConnection('slave-2-url')],
  slaveIndex: 0
};

function executeQuery(sql) {
  if (sql.startsWith('SELECT')) {
    // 讀取分流：使用 Round Robin 選擇 Slave
    const slave = db.slaves[db.slaveIndex];
    db.slaveIndex = (db.slaveIndex + 1) % db.slaves.length;
    return slave.query(sql);
  }
  // 寫入請求：強制導向 Master
  return db.master.query(sql);
}
```

(i) <mark style="background: #FF5582A6;">最大的技術挑戰是資料一致性</mark>：主庫同步到從庫有毫秒級延遲，會出現「剛寫入馬上讀卻讀不到」的情況（<mark style="background: #ADCCFFA6;">Replication Lag</mark>）。實務解法是把「寫入後立刻要讀」的關鍵查詢改由主庫負責（read-your-own-writes）。

---

### 三、Load Balancer（LB）

(j) <mark style="background: #ADCCFFA6;">LB = Load Balancer（負載平衡器）</mark>，位於使用者與後端伺服器群之間，把大量請求平衡地分發出去，避免任何一台過載崩潰。

(k) <mark style="background: #FFB8EBA6;">LB 的四大功能</mark>：分流（Distributing）、健康檢查（Health Check，掛掉的機器自動停止送流量）、擴展性（Scalability，加機器不必改客戶端位址）、隱藏後端（使用者只看得到 LB 的 IP）。

| 面向 | Layer 4 LB（傳輸層） | Layer 7 LB（應用層） |
|---|---|---|
| 判斷依據 | IP 與 Port | HTTP／HTTPS 的內容 |
| 看不看封包內容 | 不看，速度極快 | 會做 SSL 卸載後讀內容 |
| 能不能依路由分流 | 不行，不認得路徑 | 可以依 URL Path、Hostname、Header、Cookie |
| 代表工具 | AWS NLB、LVS | Nginx、AWS ALB、Google Cloud LB |

(l) <mark style="background: #FFF3A3A6;">L7「讀取內容」具體讀什麼</mark>：

- <mark style="background: #ADCCFFA6;">URL 與 Path Routing</mark>：`/api/*` 導向後端伺服器群、`/static/*` 導向檔案伺服器、`/admin/*` 導向內部管理伺服器。
- <mark style="background: #ADCCFFA6;">Hostname</mark>：同一個 IP 掛多個網域，靠 Host Header 判斷送給哪個專案。
- <mark style="background: #ADCCFFA6;">HTTP Headers</mark>：例如檢查 `User-Agent`，手機版導向行動優化伺服器。
- <mark style="background: #ADCCFFA6;">Cookie／Session Persistence</mark>：讀 Cookie 裡的 Session ID，確保同一使用者連到同一台後端，這叫 <mark style="background: #BBFABBA6;">Sticky Sessions</mark>，對需要登入狀態的系統很重要。

```nginx
# Nginx 路由分流範例（Layer 7）
location /api/ {
  proxy_pass http://backend_nodes;   # 只有 /api 開頭的去後端
}

location / {
  root /var/www/frontend;            # 其他的直接讀取前端靜態檔案
}
```

---

### 四、四種常見負載平衡演算法

(m) <mark style="background: #BBFABBA6;">Round Robin</mark>：純輪流，最簡單，假設每台機器一樣強。

(n) <mark style="background: #BBFABBA6;">Weighted Round Robin</mark>：給效能好的機器更高權重，讓它接更多請求。

(o) <mark style="background: #BBFABBA6;">Least Connections</mark>：優先送給目前連線數最少的機器，適合「處理時間長短不一」的任務。

(p) <mark style="background: #BBFABBA6;">IP Hash</mark>：用使用者 IP 算出固定值，讓同一使用者永遠連到同一台，常用於維持 Session 狀態。

---

### 五、實務與存疑

(q) <mark style="background: #FFB8EBA6;">雲端環境（Zeabur、AWS）通常自動提供 LB</mark>，不必手動設 Nginx 也能應付高併發。

(r) <mark style="background: #D2B3FFA6;">補充（Gemini 沒提）</mark>：Sticky Session 雖然方便，但會讓 LB 分流不均，也讓機器無法隨意下線（該機器上的 Session 會斷）。現代做法更傾向把 Session 外部化到 Redis，讓後端維持<mark style="background: #ADCCFFA6;">無狀態（Stateless）</mark>，這樣任何機器都能接任何請求。可對照 [[Cookie-與-Session]]。

(s) <mark style="background: #FF5582A6;">名詞別搞混</mark>：Round Robin 在「作業系統排程」與「負載平衡」是同一個演算法概念，但前者切的是 CPU 時間、後者切的是請求；面試被問到要先確認對方在講哪一層。

---

## 各對話來源（原文）

### Round Robin 概念與應用（2026-08 前後）— https://gemini.google.com/app/a9c30355e0c95e3a

**使用者：** Round robin 是什麼意思

**Gemini：** Round Robin（RR）是一種基礎且公平的調度演算法（Scheduling Algorithm）。核心原則是「輪流」：將所有待處理的任務排成一個環狀佇列（Queue），給予每個任務一個固定的執行時間片（Time Quantum），時間一到，無論任務是否完成，都會被排到隊伍末端，換下一個任務執行。核心機制：公平性——每個任務都有平等的機會獲得 CPU 或資源，不會有任務被無限期擱置；時間片（Time Slice/Quantum）——這是 RR 的關鍵，如果時間片設得太短，切換頻率過高會導致效能浪費（Context Switch），如果太長，則會退化成一般的「先到先服務」（FCFS）；循環運作——像玩遊戲輪流抽牌一樣，最後一個執行完後又會回到第一個。常見應用場景：作業系統（處理多工任務分配）、網路負載平衡（按順序將請求分發給 Server A → B → C，然後再回到 A）、資料庫分流（在讀寫分離的架構中，輪流向不同的從屬資料庫讀取資料）。缺點與限制：Round Robin 假設所有任務或伺服器的「權重」是一樣的，但現實中有些伺服器效能較強、有些任務較耗時，這種情況通常會演進為 Weighted Round Robin（加權輪詢）。

**使用者：** 資料庫分流在這邊是什麼意思。何謂讀寫分離的架構

**Gemini：** 讀寫分離（Read/Write Splitting）是一種將資料庫的「寫入／更新（Write）」與「讀取（Read）」動作分開處理的架構模式。Master（主庫）負責處理 INSERT、UPDATE、DELETE 等會變動資料的指令；Slave（從庫）負責處理 SELECT 查詢指令，主庫的資料會同步（Replication）到多個從庫中。為什麼需要這樣做：效能優化（在大多數應用中「讀」的次數遠大於「寫」，將讀取壓力分擔到多個從庫可大幅提升回應速度）、高可用性（其中一個從庫掛掉系統仍能從其他從庫讀取；主庫掛掉可將從庫提升為新主庫）、資源擴展（讀取壓力增加時只需水平增加從庫數量）。什麼是「資料庫分流」：寫入分流——所有寫入請求都精確導向 Master；讀取分流（Round Robin）——當有多個 Slave 時，系統會利用 Round Robin 演算法將查詢請求輪流分配給 Slave 1、Slave 2、Slave 3。技術挑戰：資料一致性——由於主庫同步到從庫需要一點時間（毫秒級同步延遲），有時會發生「剛寫入資料，馬上讀取卻讀不到」的情況，開發時需特別考慮（例如重要的讀取改由主庫負責）。

**使用者：** LB 是什麼

**Gemini：** 在網路技術中，LB 是 Load Balancer（負載平衡器）的縮寫。Load Balancer 是一台伺服器或軟體服務，位於使用者（Client）與後端伺服器群（Server Farm）之間，工作是將大量的網路請求「平衡地」分發到多個後端伺服器上。核心功能：分流（Distributing）、健康檢查（Health Check，持續檢查後端伺服器，若某台掛了會自動停止送流量給它直到恢復）、擴展性（Scalability，流量變大時只需多開幾台伺服器並加入 LB 清單，不需更改客戶端存取位址）、隱藏後端（Security，使用者只會看到 LB 的 IP，後端真實位址被隱藏在內網中）。常見的 LB 類型：Layer 4 LB（傳輸層，基於 IP 和 Port 進行轉發，速度極快，因為它不看封包內容）、Layer 7 LB（應用層，會讀取 HTTP/HTTPS 內容，可以根據網址路徑或 Cookie 來決定分流路徑，常見工具如 Nginx 或 AWS ALB）。負載平衡演算法：除了 Round Robin，還有 Least Connections（優先把請求送給目前連線數最少的伺服器，適合處理時間長短不一的任務）、IP Hash（根據使用者的 IP 算出固定值，讓同一個使用者總是連到同一台伺服器，常用於維持 Session 狀態）、Weighted Round Robin（給效能好的伺服器更高權重）。實務應用：在雲端環境中（例如 Zeabur 或 AWS）通常會自動提供 LB 功能，讓你不需要手動設定 Nginx 也能應付高併發流量。

**使用者：** 會讀取 HTTP/HTTPS 內容 是啥 讀路由嗎 還是網址

**Gemini：** Layer 7（應用層）的 LB 會「拆開信封」看裡面的內容，而不僅僅是看信封外的地址。在 Layer 4 時，LB 只看來源與目的地的 IP 和 Port（像快遞員只看門牌）；而 Layer 7 LB 會進行 SSL 卸載（解密 HTTPS），讀取 HTTP 協定內的具體資訊，包含網址（URL）、路由（Path）、標頭（Headers）、Cookie 甚至是表單內容（Body）。它具體讀取什麼：路由與網址（URL & Path Routing）——可以根據路徑把流量導向不同的微服務，例如 example.com/api/* 導向後端伺服器群、example.com/static/* 導向檔案伺服器（S3/Nginx）、example.com/admin/* 導向內部管理伺服器；主機名稱（Hostname/Domain）——同一個 IP 可以掛載多個網域，LB 可根據 Host Header 判斷要把請求送給哪個專案；標頭（HTTP Headers）——可以檢查 User-Agent，例如手機版瀏覽器就導向行動版優化過的伺服器；會話保持（Session Persistence/Cookie）——透過讀取 Cookie 中的 Session ID，LB 可以確保同一個使用者在同一段時間內都會連到同一台後端伺服器，這叫 Sticky Sessions，對於需要登入狀態的系統非常重要。總結：Layer 4 只看 IP/Port，速度極快，但不認得「路由」；Layer 7 認得「網址」「路由」「Cookie」，可以做很細緻的流量調度，是現代微服務架構的標準配備。

---

## 資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
|---|---|---|
| 本篇來源對話（Gemini Flash） | https://gemini.google.com/app/a9c30355e0c95e3a | 對話擷取於 2026-08-15 |
| Nginx 官方｜HTTP Load Balancing | https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/ | 查證於 2026-08-15 |
| AWS 官方｜ALB 與 NLB 比較（Elastic Load Balancing 功能表） | https://aws.amazon.com/elasticloadbalancing/features/ | 查證於 2026-08-15 |
| MySQL 官方｜Replication 概觀 | https://dev.mysql.com/doc/refman/8.0/en/replication.html | 查證於 2026-08-15 |

> ⚠️ 存疑／更正：Gemini 說「Layer 7 LB 會讀取表單內容（Body）」，技術上做得到但實務上 L7 LB 極少解析 Request Body（成本高、風險大），路由判斷通常只到 Header／Path／Cookie 為止。WAF 才會看 Body。這點原文講得太寬鬆。
