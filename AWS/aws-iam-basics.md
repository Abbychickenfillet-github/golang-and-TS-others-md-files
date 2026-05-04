# AWS IAM 基礎 + Access Key 議題

> IAM = Identity and Access Management（身分與存取管理）。
> AWS 的權限管理系統，回答一件事：**「誰（who）能對什麼資源（what）做哪些動作（how）」**。
>
> 這份筆記涵蓋 IAM 四個核心概念 + 一個**最常踩雷的議題：「塞 Access Key」為什麼是壞習慣**。

---

## 1. 四個核心概念

```
        Policy（規則 / JSON 文件）
       /  附加在  \
      /            \
   User    Group    Role
   (人)   (一群人)  (可被假扮的身分)
```

| 概念 | 是什麼 | 例子 |
|---|---|---|
| **User** | 人類個人或服務帳號，**有長期憑證**（access key / 密碼）| `abby@company.com`、`ci-bot` |
| **Group** | 多個 User 的集合，方便集中管理權限 | `Developers`、`Admins` |
| **Role** | **可被「假扮」的身分**，無長期憑證、用臨時 token | `EC2-S3-Reader`、`Lambda-DB-Writer` |
| **Policy** | JSON 文件，定義「允許/拒絕什麼動作」 | 附在 User / Group / Role 上 |

⚠️ **Policy 自己不能單獨生效**——必須附加到 User / Group / Role 才算數。

---

## 2. Policy 長什麼樣（JSON 範例）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Deny",
      "Action": "s3:DeleteObject",
      "Resource": "*"
    }
  ]
}
```

四個欄位：

| 欄位 | 內容 |
|---|---|
| **Effect** | `Allow` 或 `Deny`（**Deny 永遠覆蓋 Allow**）|
| **Action** | 動詞，格式 `服務:動作`，如 `s3:GetObject`、`ec2:RunInstances` |
| **Resource** | ARN（Amazon Resource Name），如 `arn:aws:s3:::my-bucket/*` |
| **Condition** | 額外條件（可選），如「只有從特定 IP」、「必須開 MFA」|

---

## 3. User vs Role —— 最重要的對比

| 維度 | **User** | **Role** |
|---|---|---|
| 有長期憑證 | ✅ access key / 密碼 | ❌ 沒有 |
| 給誰用 | 人類 / CI bot | **AWS 服務 / 機器**（EC2、Lambda、ECS）|
| 怎麼取得權限 | 用憑證登入 | 透過 `sts:AssumeRole` 拿**臨時 token**（最多 12 小時）|
| 例子 | 員工帳號 | EC2 instance role 給 EC2 用來存 S3 |
| 安全風險 | 憑證洩漏 = 永久風險 | 沒長期 key 可洩漏 |

---

## 4. 🔥 Access Key 議題 — 為什麼「塞」是壞習慣

### 先框定問題：「能用」≠「該用」

「塞 access key」是 **100% 可以達成、跑得動的做法**——功能完全 work、AWS API 照樣呼叫成功。所以要區分兩件事：

| | 結果 |
|---|---|
| **能用嗎（功能上 work）** | ✅ 完全可以——程式照跑、API 照呼叫 |
| **該用嗎（安全敢不敢上 prod）** | ❌ 不建議——洩漏機率高 + 後果嚴重 |

**「不安全」不是「會壞掉」**，而是 **「洩漏機率（中高）× 洩漏後果（很嚴重）」的風險組合**。很多開發者塞了 access key 一輩子沒出事——但**一旦出事就是大事**（帳單炸幾千美金、整個帳號被接管）。

#### 歷史脈絡：以前大家都這麼做

- **IAM Role 2012 年才推出**，之前唯一選項就是塞 access key
- 老專案、Stack Overflow 答案、舊教學文章**滿地都是「塞 access key」風格**
- AWS 官方文件也只是寫 **"Not recommended"**（不建議），不是「禁止」
- 一些情境**仍然合理**：地端伺服器呼叫 AWS、第三方 SaaS 整合、CI/CD 老系統

#### 一句話定位

> **塞 Access Key 不是「錯的做法」，是「不夠好的做法」**——能跑、簡單、上手快，但風險高過收益。
>
> 有 IAM Role 可用時就不要用 access key——這是「升級到更好的選項」，不是「修一個壞掉的東西」。

---

### 4.1 什麼是 Access Key？

**Access Key 是 AWS 的長期憑證**，由兩段組成：

```
Access Key ID：     AKIAIOSFODNN7EXAMPLE
Secret Access Key： wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

像是「永久有效的帳密」。任何持有這兩段字串的人/程式，都能以這個 IAM User 的身分呼叫 AWS API。

### 4.2 「塞」是個貶義詞

**「塞」指的是「把 access key 直接放在某個方便取得的地方，當作快速通關的捷徑」**。

常見「塞」的姿勢：

| 姿勢 | 出沒地點 | 風險路徑 |
|---|---|---|
| **寫進 `.env`** | Node.js / Python 專案 | 不小心 `git add .env` 就完蛋 |
| **`aws configure`** | 開發者本機 `~/.aws/credentials` | 機器被駭就被偷 |
| **docker-compose.yml** | `environment:` 區塊 | image 帶出去 = 公開洩漏 |
| **GitHub Actions env** | workflow YAML | log 印出來就洩漏 |
| **Hardcode 程式碼** | 直接寫死在 .py / .js | 必然 commit 進 git |
| **Slack / 訊息傳給同事** | 私訊、群組 | 聊天記錄外洩、員工離職還拿著 |

### 4.3 為什麼是議題？三個結構性問題

#### 問題 1：Access Key 沒有自動過期

| 對比 | Access Key | IAM Role 的臨時 token |
|---|---|---|
| 過期機制 | ❌ 不會（要**手動** rotate）| ✅ 1~12 小時自動過期 |
| 洩漏後的影響 | 永久有效直到你發現並撤銷 | 短時間內自動失效 |
| 撤銷成本 | 要動**所有**用這把 key 的地方 | 解除 role 即可 |

換句話說——**洩漏 = 永久後門，直到你親手把它鎖掉為止**。

#### 問題 2：洩漏路徑超多、難以全部堵住

```
Access Key 可能洩漏的地方：

  原始檔案 ─┬─► .env、~/.aws/credentials、docker-compose.yml
            │
            ├─► Git push 到公開 repo（GitHub bot 幾秒掃到！）
            │
            ├─► Container image build 時夾帶（沒 .dockerignore）
            │
            ├─► CI/CD log 印出（不小心 console.log(env)）
            │
            ├─► 員工離職但 key 還在他電腦
            │
            └─► 截圖、聊天紀錄、Notion 文件
```

#### 問題 3：權限通常給太大

開發者為了「方便」，常給 `AdministratorAccess`（整個 AWS 帳號全權）。
**一旦這把 key 洩漏 = 整個 AWS 帳號被接管**。

### 4.4 真實案例（嚇阻效果）

| 場景 | 後果 |
|---|---|
| 開發者把 AWS key 不小心 push 到 GitHub public repo | GitHub bot 幾秒內掃到 → 駭客 1 小時內開幾十台 GPU EC2 挖礦 → 帳單一小時跳 USD 1000+ |
| 員工把 key 寫在公開 Notion | 駭客撞庫掃 Notion 公開連結 → 拖光 S3 資料 |
| Docker image 公開 push 帶 .env | DockerHub 被掃 → 整個 AWS 帳號被洗 |

> AWS 有 `AWSCompromisedKeyQuarantine` 的緊急 policy，會在偵測到洩漏時自動鎖 key——但通常還是賠錢、還是要重建環境、還是要報告管理層。

### 4.5 正確做法（按環境）

| 環境 | 不要這樣 ❌ | 應該這樣 ✅ |
|---|---|---|
| **EC2** | EC2 上塞 access key | **Instance Profile**（掛 IAM Role）|
| **Lambda** | 環境變數塞 key | **Lambda Execution Role** |
| **ECS / EKS** | Task definition 塞 key | **Task Role / IRSA** |
| **GitHub Actions** | Repository secrets 存 key | **OIDC + AssumeRole**（不用存 key）|
| **本機開發** | `aws configure` 存 access key | **AWS SSO** (`aws sso login`)、臨時 token |
| **其他 CI（非 GitHub）** | env 塞 key | OIDC 或最小權限 + Secrets Manager |

#### EC2 Instance Role 的運作流程

```
EC2 launch 時掛上 IAM Role: EC2-S3-Reader
    │
    ▼
EC2 OS 內部跑一個 metadata service
（IMDSv2，169.254.169.254/...）
    │
    ▼
你的程式（boto3、aws-sdk）自動去這個 endpoint 拿臨時 token
    │
    ▼
拿到 token（1 小時有效，自動 rotate）
    │
    ▼
用這個 token 呼叫 AWS API

整個過程：
- 沒長期 key
- 沒寫進任何檔案
- 沒人類介入
- 撤銷只要解除 Role
```

### 4.6 真的不得不用 Access Key？必做的緩解

如果你的場景**真的**沒辦法用 Role（例如：地端伺服器要呼叫 AWS API、第三方 SaaS 要存你 S3），最少要做這些：

| 緩解措施 | 怎麼做 |
|---|---|
| **限制 IP 範圍** | Policy 加 `Condition: aws:SourceIp = [你的固定 IP]` |
| **最小權限** | 只給必要的 Action，不要 `AdministratorAccess` |
| **啟用 CloudTrail** | 監控異常呼叫（地理位置、時間、頻率）|
| **90 天輪替** | 設置政策強制 rotate |
| **用 Secrets Manager** | 別寫 `.env`，用 AWS Secrets Manager 存放 |
| **`.gitignore` 鎖死** | 確保 `.env`、`*.pem` 永遠不會 commit |
| **GitHub Secret Scanning** | repo 開啟掃描、發現自動撤銷 |

---

## 5. IAM 在 AWS 安全模型的位置

呼應 `aws-region-vpc-subnet-basics.md` 的 NACL / SG——那是**封包層**安全。
**IAM 是 API 層的安全**：

```
攻擊者想存取你的 S3 bucket
    │
    ├─ 網路層：封包要先穿過 NACL / SG     ← 封包安全（前面筆記學過）
    │
    └─ API 層：呼叫 s3:GetObject 要 IAM 允許   ← IAM 管這裡
```

**兩層獨立、都要做**：

- 沒 IAM、只有網路防火牆 → 內網有人就能亂呼 API
- 沒網路防火牆、只有 IAM → 攻擊者能掃描到內部 endpoint

---

## 6. IAM 安全 Best Practices（背起來）

| # | 原則 | 解釋 |
|---|---|---|
| 1 | **最小權限**（Least Privilege）| 只給必要權限、不要 `*:*` |
| 2 | **服務之間用 Role 不用 Access Key** | EC2、Lambda、ECS 都應該用 Role |
| 3 | **Group 管權限、User 只放在 Group 裡** | 權限變化動 Group 就好 |
| 4 | **MFA 一定要開** | 至少根帳號和管理 user 必開 |
| 5 | **避免使用 root 帳號** | 建管理員 user、root 鎖在保險箱 |
| 6 | **定期 rotate access keys** | 90 天輪替是常見要求 |
| 7 | **監控 + 告警** | CloudTrail + GuardDuty |
| 8 | **`.env` 永遠 gitignore** | 死記，沒有例外 |

---

## 7. 一句話總結

> **IAM 不管網路通不通，管「你拿什麼權限呼叫 AWS API」——是 AWS 安全模型最頂層、和 NACL/SG 互補。**
>
> **「塞 Access Key」之所以是議題，是因為它把「永久有效的後門」放在最容易洩漏的地方**——正解永遠是用 Role 而不是 Access Key。

---

## 相關筆記

- [aws-region-vpc-subnet-basics.md](aws-region-vpc-subnet-basics.md) — 網路層安全（NACL / SG）
- [hybrid-cloud-basics.md](hybrid-cloud-basics.md) — 混合雲身分整合（IAM Identity Center / SSO）
- [ec2-instance-setup.md](ec2-instance-setup.md) — EC2 SSH 連線（金鑰是另一回事，不是 IAM access key）
