# AWS 基礎：Region / AZ / VPC / Subnet / EC2 整合筆記

> 這份筆記整理 AWS 最基礎的五個網路層概念——從最外層的「地理區域」一路切到最裡面的「虛擬機器」，以及它們組合起來怎麼達成高可用性（HA）。
>
> 配套筆記：[ec2-instance-setup.md](ec2-instance-setup.md)（EC2 金鑰對、SSH 連線設定）

---

## 1. AWS 基礎設施的三層結構

```
Region（區域）
  └── Availability Zone / AZ（可用區）
        └── Logical Data Center（邏輯資料中心）
```
<img width="1200" height="984" alt="image" src="https://github.com/user-attachments/assets/f3b6c7c6-9be3-4f58-b579-e81512c3eee3" />

### 各層定義

| 層級 | 定義 | 舉例 |
|---|---|---|
| **Region** | AWS 在世界各地建立基礎設施的「地理區域」 | `ap-northeast-1`（東京）、`us-east-1`（北維吉尼亞）、`ap-southeast-1`（新加坡）|
| **AZ** | 一個 Region 裡面**彼此實體隔離**的多個區塊 | `ap-northeast-1a`、`1c`、`1d` |
| **資料中心** | AZ 內部由多個邏輯資料中心組成 | 使用者看不到、AWS 內部分組 |

### 核心觀念

- **Region 和 Region 之間隔很遠**（跨國、跨洲）——**網路延遲高**、資料同步有成本
- **AZ 和 AZ 之間實體隔離**（不同大樓、不同電源、不同光纖）——**故障不會互相傳染**
- **這個「實體隔離」是後面 HA（高可用性）的關鍵基礎**

---

## 2. VPC — 虛擬的網路區域

### 定義

**VPC (Virtual Private Cloud)** = 你在 AWS 上**自己切出的一個虛擬網路空間**。

### 三個關鍵特性

| 特性 | 說明 |
|---|---|
| **範圍** | **綁在單一 Region 裡面**（不能跨 Region）|
| **作用** | 管理放在你雲端的 EC2 等資源的網路流通 |
| **功能** | 決定「要接在什麼網路裡」、「誰能連得到」、「對外網路是否開放」|

### VPC 跟 EC2 的關係（階層）

```
VPC（虛擬網路圍籬，你自己切的範圍）
  └── Subnet（子網，VPC 裡面更小的網路區塊）
        └── EC2（被放在 subnet 裡面的機器）
```

**EC2 不會直接放在 VPC**——要先切 Subnet，EC2 才放在 Subnet 裡面。

### VPC 的類比

- VPC ≈ **你租的整片辦公園區**，有圍籬、有門禁、有內部路網
- 外面的公共網路要進來必須經過你設定的入口
- 內部的機器彼此可以直接對話（看你的路由規則）

---

## 3. Subnet — VPC 裡面更小的虛擬網路區域

### 定義

**Subnet** = 在 VPC 內再切出來的**子網路**，是 EC2 真正被放進去的地方。

### ⚠️ Subnet 與 AZ 的正確關係是「多對一」

**常見誤解**：看到「每個 Subnet 對應一個 AZ」會以為是**一對一**。

**正解**：是**多對一**——
- **一個 Subnet 只能屬於一個 AZ**（不能跨 AZ）
- **一個 AZ 可以有很多 Subnet**

```
Region: ap-northeast-1
  │
  ├── AZ: ap-northeast-1a
  │     ├── Subnet-A1（例如放 web server，public subnet）
  │     └── Subnet-A2（例如放 database，private subnet）
  │
  ├── AZ: ap-northeast-1c
  │     ├── Subnet-C1
  │     └── Subnet-C2
  │
  └── AZ: ap-northeast-1d
        └── Subnet-D1
```

### 為什麼要切這麼多層？每層管什麼？

| 切分層級 | 目的 |
|---|---|
| **Region → AZ** | 地理/實體隔離（容災）|
| **AZ → Subnet** | 邏輯切分，同一個 AZ 裡再分「public subnet（對外）」、「private subnet（內部）」|
| **Subnet → EC2** | 實際機器落腳處，由 Subnet 決定它能被誰連到、能連到哪 |

### Public vs Private Subnet

| 類型 | 特徵 | 典型用途 |
|---|---|---|
| **Public Subnet** | 有 route 到 Internet Gateway | Web server、Load Balancer、Bastion host |
| **Private Subnet** | 沒有直接對外 route | Database、內部服務、敏感資料 |

這個差別不是 Subnet 本身的屬性，是**路由表（Route Table）怎麼設定**決定的。

---

## 4. EC2 — 「實體機器」的真相

### 常見的誤解

教學影片常把 EC2 講成**實體機器**——**這是方便的說法但不完全正確**。

### 正解

**EC2 是虛擬機器（VM, Virtual Machine）**——它跑在 AWS 的**實體伺服器**上，但 AWS 會把一台實體機切成多台 VM 給不同客戶使用。

| 概念 | 實際狀況 |
|---|---|
| 你看到的 EC2 instance | **VM**（虛擬機）|
| VM 跑在哪裡 | AWS 機房的實體伺服器上 |
| 為什麼會以為是實體機器 | 因為用起來跟 SSH 連進一台真伺服器**沒兩樣** |

### 所以要怎麼看 EC2？

- **概念上**：當成一台實體伺服器無妨——操作、配置、SSH 都一樣
- **本質上**：VM，AWS 根據你選的規格（CPU/RAM）從實體機分一塊給你
- **選規格就是**：「我要多強的機器？」（instance type 如 `t3.micro`、`m5.large`、`c6i.xlarge`）

### EC2 和 VPC 的分工（正交關係）

| 元件 | 決定什麼 |
|---|---|
| **EC2** | **機器規格**——CPU、RAM、磁碟 |
| **VPC** | **網路環境**——這台機器放哪個網段、誰能連到它 |

兩者正交（orthogonal）：同一台規格的 EC2 可以放進不同 VPC；同一個 VPC 可以放各種規格的 EC2。

---

## 5. HA（High Availability）— 為什麼 Subnet 要跨 AZ

### HA 定義

**HA = High Availability（高可用性）**。
目標：**服務不會因為「一個地方壞掉」而整個掛掉**。

### 為什麼「Subnet 放在不同 AZ」就能達到 HA？

關鍵在前面講的那個事實——**不同 AZ 之間是實體隔離的**（不同大樓、不同電源、不同網路）。

#### ❌ 情境 1：所有 Subnet 都在同一個 AZ

```
ap-northeast-1a 整個停電 / 光纖被挖斷 / 機房起火
   └── 你的所有 Subnet（裡面的 EC2）全部失聯
        → 整個服務掛掉
```

#### ✅ 情境 2：Subnet 分散在多個 AZ

```
ap-northeast-1a（掛了）              ap-northeast-1c（還活著）
  └── Subnet-A1（EC2 失聯）           └── Subnet-C1（EC2 正常）
                                          ↑
                            Load Balancer 把流量全部導到這邊
                                          ↓
                            使用者感覺不到問題，服務照跑
```

### 達到真正的 HA 需要的三個條件

**⚠️「Subnet 跨 AZ」只是必要條件、不是充分條件**——還要：

1. **EC2 跨 AZ 實際部署**（多開幾台，分散在不同 AZ 的 Subnet）
2. **前面有 Load Balancer**（ALB/NLB 自動把流量導到活著的節點）
3. **資料層也要跨 AZ**（RDS 開 Multi-AZ、S3 本身就跨 AZ 複製、ElastiCache 也要配）

三件齊備，HA 才真的做起來。

### 為什麼這件事重要？

真實案例——AWS 的 AZ 偶爾會出事：
- 2021 年 `us-east-1` Region 多次大當機
- 東京 Region 過去也出過 AZ 級別的故障

**大公司不會把所有雞蛋放在同一個 AZ 籃子裡**——這就是為什麼「跨 AZ 部署」是 AWS 入門必學。

---

## 6. 一句話 mental model

| 元件 | 類比 |
|---|---|
| **Region** | 在地球哪個角落（東京 vs 新加坡）|
| **AZ** | 在那個角落裡哪一棟獨立的大樓（1a vs 1c）|
| **VPC** | 你租的那整片辦公園區 |
| **Subnet** | 園區裡的每一棟小樓 |
| **EC2** | 小樓裡的某一間辦公室（虛擬的，但用起來像實體）|
| **HA** | 公司在不同大樓都開辦公室，一棟燒了還能繼續上班 |

---

## 7. 速查表

### 哪個元件綁哪個層級？

| 元件 | 跨什麼 | 不跨什麼 |
|---|---|---|
| **Region** | — | — |
| **AZ** | 屬於某個 Region | 不跨 Region |
| **VPC** | 跨多個 AZ（透過不同 subnet） | **不跨 Region** |
| **Subnet** | — | **不跨 AZ** |
| **EC2** | 屬於某個 Subnet | 一台機器只在一個 Subnet |

### 常見問答

| 問 | 答 |
|---|---|
| VPC 能跨 Region 嗎？ | ❌ 不能。要連 Region 用 VPC Peering 或 Transit Gateway |
| Subnet 能跨 AZ 嗎？ | ❌ 不能。要跨 AZ 就切多個 Subnet |
| EC2 能跨 Subnet 嗎？ | ❌ 不能（一台只屬於一個 Subnet），但可以多開幾台分散在不同 Subnet |
| AZ 之間通訊要收錢嗎？ | ✅ 會有 AZ 間流量費（數 cents / GB，但量大就痛）|
| Region 之間通訊要收錢嗎？ | ✅ 更貴，而且延遲高 |

---

## 相關資源

- [YouTube — 從東京到全球：探索 AWS Region 和 VPC 的關鍵連結](https://www.youtube.com/watch?v=6QGuf0O1j4E&list=PLVVMQF8vWNCKO5nG4tfEIrFJu1rHcEnRk&index=2)
- 配套筆記：[ec2-instance-setup.md](ec2-instance-setup.md)
