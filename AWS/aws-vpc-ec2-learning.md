# AWS VPC 與 EC2 學習筆記

> **建檔日期**：2026-04-24
> **用法**：這份是基礎觀唸的整理，之後有新觀念可以繼續加進來。

---

## 目錄

1. [核心觀念：EC2 vs VPC](#1-核心觀念ec2-vs-vpc)
2. [層級結構](#2-層級結構)
3. [為什麼 Subnet 要綁一個 AZ](#3-為什麼-subnet-要綁一個-az)
4. [Public Subnet vs Private Subnet](#4-public-subnet-vs-private-subnet)
5. [關鍵網路元件](#5-關鍵網路元件)
6. [Load Balancer（ALB）](#6-load-balancerealb)
7. [高可用性（HA）架構](#7-高可用性ha架構)
8. [CIDR Block 基礎](#8-cidr-block-基礎)
9. [典型網站架構範例](#9-典型網站架構範例)
10. [費用陷阱與清理清單](#10-費用陷阱與清理清單)
11. [名詞對照表](#11-名詞對照表)

---

## 1. 核心觀念：EC2 vs VPC

### EC2 (Elastic Compute Cloud)
- **類別**：Compute（運算服務）
- **本質**：虛擬機器
- **你可以**：開機、關機、SSH 進去、裝軟體、跑程式
- **比喻**：雲端的一台電腦

### VPC (Virtual Private Cloud)
- **類別**：Networking（網路服務）
- **本質**：**一套虛擬網路配置（不是機器）**
- **包含**：IP 範圍、Subnet 劃分、路由規則、防火牆規則
- **比喻**：整棟辦公大樓的網路規劃 + 門禁系統

### 兩者的關係
- EC2 **一定要**放在某個 VPC 的某個 Subnet 裡
- VPC 可以是空的，但通常會有 EC2 / RDS 等服務住進去
- 新帳號在每個 Region 會有一個「default VPC」自動建好

### 對照表

| 項目 | EC2 | VPC |
|---|---|---|
| 類別 | 運算 Compute | 網路 Networking |
| 是什麼 | 虛擬電腦 | 虛擬網路環境 |
| 所在層級 | Subnet（AZ 層級） | Region 層級 |
| 單獨存在？ | 不能，必須在 Subnet 裡 | 可以是空的 |
| 收費方式 | 按小時 + EBS 儲存 | VPC 本身免費；NAT Gateway、Endpoint 等才收錢 |

---

## 2. 層級結構

```
Region（例如 ap-northeast-1 東京）
├── AZ-1a    ┐
├── AZ-1c    ├── 實體資料中心群（會停電、會斷網）
└── AZ-1d    ┘

VPC（Region 層級，橫跨所有 AZ）
  ├── Subnet A  ──→ 綁在 AZ-1a
  │     └── EC2
  ├── Subnet B  ──→ 綁在 AZ-1c
  │     └── EC2
  └── Subnet C  ──→ 綁在 AZ-1d
        └── EC2
```

### 每一層是什麼
- **Region**：AWS 的地理區域，例如 ap-northeast-1（東京）、us-west-2（俄勒岡）
- **AZ (Availability Zone)**：Region 底下獨立運作的資料中心群
- **VPC**：Region 層級的虛擬網路（重點：橫跨 AZ）
- **Subnet**：VPC 內的子網路（重點:綁定單一 AZ，不能改）
- **EC2**：虛擬機，住在某個 Subnet 裡

---

## 3. 為什麼 Subnet 要綁一個 AZ

這是 AWS 的硬性規定 — 建立 Subnet 時必須選一個 AZ，之後不能改也不能跨 AZ。

### 物理原因
AZ 是**不同實體機房**。一段 IP 範圍對應實際機器，機器住在某個實體地點，所以 Subnet 必須綁定一個 AZ。

### 設計目的（更重要）
AWS 故意設計這個限制，目的是**強迫使用者思考「失效隔離 (failure isolation)」**。

如果 Subnet 可以跨 AZ，很多人會圖方便把所有 EC2 塞進同一個 Subnet，結果 AZ 一掛就全倒。AWS 把這個規則寫進設計，等於強迫你建架構時想：

> 如果 AZ-1a 整個掛了，我的服務還會活著嗎？

### 所以 HA 要這樣做
1. 建立多個 Subnet，每個綁不同 AZ
2. 在每個 Subnet 放一台 EC2，跑一樣的服務
3. 前面放 Load Balancer 自動分流

---

## 4. Public Subnet vs Private Subnet

**重要：物理上 Public 和 Private Subnet 沒有任何差別 — 差別完全來自「路由表設定」。**

### Public Subnet
- **特徵**：路由表有一條 `0.0.0.0/0 → IGW` 的規則
- **裡面的 EC2 可以**：
  - 擁有 Public IP
  - 直接被網際網路連到
  - 主動連出去到網際網路
- **典型用途**：Web 伺服器、跳板機、Load Balancer

### Private Subnet
- **特徵**：路由表**沒有**指向 IGW 的規則
- **裡面的 EC2 只能**：
  - 在 VPC 內部通訊
  - 如果要連外網，需要透過 NAT Gateway（放在 Public Subnet）
- **典型用途**：資料庫、內部 API、批次工作

### 判斷方法
看路由表裡有沒有指向 IGW 的規則 — 就這一條規則決定 Subnet 的「公私」。

---

## 5. 關鍵網路元件

### Internet Gateway (IGW)
- **是什麼**：VPC 對外（網際網路）的「大門」
- **特性**：每個 VPC 最多一個 IGW，且是 Region 層級（不會掛）
- **怎麼用**：
  1. 建立 IGW 並 attach 到 VPC
  2. 在 Public Subnet 的路由表加 `0.0.0.0/0 → IGW`
- **費用**：IGW 本身免費（但透過它的流量可能收費）

### NAT Gateway
- **是什麼**：讓 Private Subnet 的 EC2「能出去但不能被連進來」
- **使用場景**：Private Subnet 的 DB 要下載安全更新、連外部 API
- **特性**：要放在 Public Subnet，然後 Private Subnet 的路由表指向它
- **費用**：**按小時 + 流量收費，蠻貴的**
- **注意**：這是 AWS 意外帳單的常見來源，不用時記得刪掉

### Route Table（路由表）
- **是什麼**：每個 Subnet 都有一張，決定「要連到某個 IP 時走哪條路」
- **內容範例**：
  ```
  10.0.0.0/16  → local      （VPC 內部通訊）
  0.0.0.0/0    → igw-xxxxx  （走 IGW 上網際網路 —— Public 的關鍵）
  ```
- **路由邏輯**：由上到下比對，最精確的規則優先

### Security Group
- **層級**：掛在 EC2 上
- **狀態**：**Stateful**（有狀態）— 允許進來的連線，自動允許回應流量
- **規則類型**：只能「允許」，沒有「拒絕」
- **預設**：對外全開、對內全關
- **比喻**：每台 EC2 門口的保全

### NACL (Network ACL)
- **層級**：掛在 Subnet 上
- **狀態**：**Stateless**（無狀態）— 進出都要各自定義規則
- **規則類型**：允許 + 拒絕都可以
- **預設**：對內對外全開（很寬鬆）
- **比喻**：整個 Subnet 外面的警衛室

### Security Group vs NACL 對照

| | Security Group | NACL |
|---|---|---|
| 層級 | EC2 | Subnet |
| 狀態 | Stateful | Stateless |
| 規則 | 只能允許 | 允許 + 拒絕 |
| 預設值 | 對內全關 | 全開 |
| 評估方式 | 所有規則一起評估 | 由上到下 |
| 初學者頻率 | 常用 | 進階才用 |

---

## 6. Load Balancer（ALB）

### 是什麼
Application Load Balancer 處理 HTTP/HTTPS 流量，把使用者請求分散到多台 EC2。

### 架構位置
- 本身**跨 AZ**（不綁單一 AZ）
- 建立時要選「橫跨哪些 Public Subnet」（至少兩個不同 AZ）
- 使用者流量先打到 ALB，ALB 再分流到後面的 Web EC2

### 為什麼要用 LB
1. **HA**：AZ-1a 的 Web 掛了，ALB 自動全導到 AZ-1c
2. **負載平衡**：多台 EC2 平均分擔流量
3. **單一入口**：使用者只記一個網址
4. **健康檢查**：定期「戳」EC2，戳不到就不分流量過去

### 典型流量路徑
```
使用者 → DNS → ALB（Public Subnet）→ Web EC2（可能 AZ-1a 或 AZ-1c）→ DB EC2（Private Subnet）
```

### ALB vs NLB vs CLB
- **ALB** (Application) — HTTP/HTTPS 層 7，**最常用**
- **NLB** (Network) — TCP/UDP 層 4，極高效能
- **CLB** (Classic) — 舊版，新專案別用了

---

## 7. 高可用性（HA）架構

### 最小可用 HA 架構

```
                 [使用者]
                    ↓
           [IGW]
                    ↓
           [Application Load Balancer]
             （跨 AZ-1a + AZ-1c）
              ↙              ↘
    [Web EC2 AZ-1a]      [Web EC2 AZ-1c]
           ↓                    ↓
    [DB Primary]         [DB Standby]
    AZ-1a                AZ-1c
    （RDS Multi-AZ 會自動切換）
```

### HA 檢查清單
- [ ] ALB 至少設定兩個 AZ 的 Public Subnet
- [ ] Web 層至少兩台 EC2 分別在不同 AZ
- [ ] 資料庫使用 RDS Multi-AZ（或自己做 replication）
- [ ] Route Table、Security Group 沒卡住流量
- [ ] 做過「把一個 AZ 的 EC2 關掉」的實際測試

---

## 8. CIDR Block 基礎

### 什麼是 CIDR
格式：`IP/前綴長度`

例如 `10.0.0.0/16` = `10.0.0.0` 到 `10.0.255.255`（共 6 萬多個 IP）

### 常見換算表
| 前綴 | IP 數量 | 用途 |
|---|---|---|
| /32 | 1 | 單一 IP |
| /24 | 256 | 單一 Subnet（常用）|
| /16 | 65,536 | 單一 VPC（常用）|
| /8 | 16,777,216 | 太大，不常用 |

規則：前綴越小，範圍越大

### VPC / Subnet 的 CIDR 約定
- VPC CIDR 通常是 `/16`
- Subnet CIDR 是 VPC 的子集，通常 `/24`
- 每個 Subnet AWS 會保留 5 個 IP（第 1、2、3 個和最後 1 個），實際可用 = 256 − 5 = 251

### 範例
```
VPC      : 10.0.0.0/16   (10.0.0.0 ~ 10.0.255.255)
Subnet 1 : 10.0.1.0/24   → AZ-1a, Public
Subnet 2 : 10.0.2.0/24   → AZ-1a, Private
Subnet 3 : 10.0.3.0/24   → AZ-1c, Public
Subnet 4 : 10.0.4.0/24   → AZ-1c, Private
```

---

## 9. 典型網站架構範例

### 小型(單 AZ，無 HA)
```
Internet → IGW → EC2 (Public Subnet) → RDS (Private Subnet)
```
優點：便宜、簡單
缺點：AZ 掛了就掛了

### 中型（多 AZ，有 HA）
```
Internet → IGW → ALB
                ↙       ↘
          Web EC2        Web EC2
         (AZ-1a)         (AZ-1c)
              ↘         ↙
            RDS Multi-AZ
         (Primary + Standby)
```

### 進階（加 Auto Scaling）
```
Internet → IGW → ALB → [Auto Scaling Group of Web EC2s]
                              ↓
                       RDS Multi-AZ
```
Auto Scaling 會根據流量自動增減 EC2 數量，這也是省錢的好方式。

---

## 10. 費用陷阱與清理清單

AWS 收費方式很複雜，這些是初學最容易踩的地雷。

### 常見的意外收費來源

| 資源 | 何時收費 | 預防方法 |
|---|---|---|
| **EC2 Instance** | 運行中收費（stopped 不收） | 不用時關機 |
| **EBS Volume** | **只要存在就一直收**（無論有無 attach）| 終止 EC2 時記得勾「刪除 EBS」|
| **EBS Snapshots** | 快照會持續收費 | 舊快照記得刪 |
| **Elastic IP** | **沒 attach 到 EC2 時才收費**（反直覺）| 不用就釋放 |
| **NAT Gateway** | 按小時 + 流量（很貴）| 不用就刪 |
| **Load Balancer** | 按小時 + LCU | 測試完就刪 |
| **RDS** | 按小時（stopped 也收 7 天）| 測試完降配或刪掉 |
| **Data Transfer** | 跨 Region 或出到 Internet 的流量 | 相同 AZ 內通訊免費 |

### 一定要做：設定 Budget Alert
1. AWS Console → Billing → Budgets
2. 設定月預算（例如 USD 10）
3. 加 Email 通知（建議設 50%、80%、100% 三個閾值）
4. **今天就設，不要等第一張帳單來**

### 結束專案的清理清單
- [ ] 終止 EC2 instance（勾選一併刪除 EBS）
- [ ] 手動刪除沒 attach 的 EBS Volume
- [ ] 釋放沒在用的 Elastic IP
- [ ] 刪除 NAT Gateway（超花錢）
- [ ] 刪除 Load Balancer
- [ ] 刪除 RDS（先處理最終快照選項）
- [ ] 清空並刪除 S3 Bucket（有物件的 bucket 刪不掉）
- [ ] 檢查 CloudWatch Logs 保留期限
- [ ] 檢查還有沒有跨 Region 的資源

---

## 11. 名詞對照表

| 縮寫 | 全名 | 中文 |
|---|---|---|
| EC2 | Elastic Compute Cloud | 雲端運算虛擬機 |
| VPC | Virtual Private Cloud | 虛擬私有雲 |
| AZ | Availability Zone | 可用區域 |
| IGW | Internet Gateway | 網際網路閘道 |
| NAT | Network Address Translation | 網路位址轉換 |
| ALB | Application Load Balancer | 應用程式負載平衡器 |
| NLB | Network Load Balancer | 網路負載平衡器 |
| NACL | Network Access Control List | 網路存取控制清單 |
| CIDR | Classless Inter-Domain Routing | 無類別跨域路由 |
| EIP | Elastic IP | 彈性 IP |
| EBS | Elastic Block Store | 彈性區塊儲存 |
| RDS | Relational Database Service | 關聯式資料庫服務 |
| HA | High Availability | 高可用性 |
| IAM | Identity and Access Management | 身分與存取管理 |

---

## 延伸閱讀

- AWS VPC 官方文件：<https://docs.aws.amazon.com/vpc/>
- AWS Well-Architected Framework：<https://aws.amazon.com/architecture/well-architected/>
- AWS Pricing Calculator（試算費用）：<https://calculator.aws/>

---

## 尚待補充（TODO）

這些觀念之後可以一起加進來：

- [ ] NAT Gateway 的具體路由設定
- [ ] VPC Peering 和 Transit Gateway
- [ ] VPC Endpoint（省 NAT 費用的技巧）
- [ ] Auto Scaling Group 的實際設定
- [ ] RDS Multi-AZ vs Read Replica 差別
- [ ] CloudWatch 監控與告警
- [ ] IAM Role 與 EC2 的關係

> 有新觀念就回來跟 Claude 說，可以幫你擴充這份筆記。
