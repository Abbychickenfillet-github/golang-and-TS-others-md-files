> 記錄「Docker images / volumes / build cache 不清 → C 槽爆掉 → 清理 + compact 把空間還給 Windows」一系列操作清出67.8GB 完整流程。

## 📑 大綱

1. [問題背景](#問題背景)
2. [第一大部份:Docker 內部清理](#第一大部份docker-內部清理省-docker-內部空間)
3. [第二大部份:compact vdisk](#第二大部份compact-vdisk把空間還給-c-槽)
4. [觀念補充](#觀念補充)
5. [疑難排解](#疑難排解)

---
## 問題背景

現在才遇到 Docker 的 images、volumes 不刪所造成的**硬碟容量爆炸**問題!
← build 過的東西,若不是用上次的 image 快取,會造成不停地重複建立 image。

我覺得處理完這個虛擬磁碟問題(一個檔案假裝成一顆硬碟 —— `docker_data.vhdx` 它是一個檔案,但 Docker 裡的 Linux 把它當一顆磁碟在用),終於對於 Docker 操作的生命週期才算完整。

**WSL 之於 Docker，就像「作業系統之於 App」、或「地基之於房子」。**
Docker 的引擎(`dockerd`)其實是一支 **Linux 程式**,自己不能直接在 Windows 上跑。**WSL2 幫它準備了一台輕量 Linux 虛擬機(有真正的 Linux 核心)**,Docker 就住在那台 Linux 裡面運作:

- WSL2 = 那塊地 + 房子(底層 Linux 環境)
- Docker Desktop = 住在裡面的房客(引擎、你的容器)
- Windows 上看到的 Docker Desktop 視窗 = 只是「遙控房客」的**遙控器**,真正幹活的在 WSL 裡

**清理前的初始儲存狀況:**

![[vhdx瘦身_P1-01_初始儲存狀況_2026-06-06.png]]

---

## 第一大部份：Docker 內部清理(省 Docker 內部空間)

### 觀念

Docker 有四種東西各自佔空間，清理有**依賴順序**:

| 名稱 | 是什麼 | 比喻 | 刪除順序 |
| --- | --- | --- | --- |
| container | 從 image 跑起來的實例 | 正在跑的 App | ① 最先(會佔用 image/volume) |
| image | 唯讀範本 | App 安裝檔 | ② |
| volume | 掛在 container 的持久資料 | 資料庫檔案 | ② (刪了資料不可逆) |
| build cache | 建 image 每一層的中間快取 | 每次做菜留下的半成品 | ③ |

> ⚠️ **container 要最先刪**,因為它會佔用 image 和 volume。只要 container 還在,對應 image 會顯示「in use」刪不掉。「刪 volume」是**真的刪掉資料**,不只是解除掛載。

**清 build cache 的指令:**

```powershell
docker builder prune        # 刪沒在用的建置快取
docker builder prune -a     # 連有用到的快取一起刪(更徹底)
```

以上指令**只刪 build cache**,不會動 image、container、volume。

### 實際操作截圖

**build cache(Builds 分頁):**
![[vhdx瘦身_P1-02_Docker-build-cache_2026-07-10.png]]

**剩餘的 volumes:**
![[vhdx瘦身_P1-03_剩餘volumes_2026-07-10.png]]

**images 清單:**
![[vhdx瘦身_P1-04_images清單_2026-07-10.png]]

**images 大小(有的甚至 1.53GB):**
![[vhdx瘦身_P1-05_images大小有的1.53GB_2026-07-11.png]]

### `docker builder prune -a` 實際輸出

**重點結論(頭號元兇就是 build cache):**

- **build cache = 23.83 GB** ← 壓倒性最多
- **images(GUI 顯示)= 只有 2.54 GB**

> build cache 佔的比 images 多快 **10 倍**。最肥的幾層:830MB、633MB、605MB、582MB(好幾個)、470MB…累積 200+ 筆,總計 **23.83GB**。

<details>
<summary>👉 點我展開完整 build cache 清單(共 200+ 筆,Total 23.83GB)</summary>

```text
docker builder prune -a
WARNING! This will remove all build cache. Are you sure you want to continue? [y/N] Y
ID                                              RECLAIMABLE     SIZE            LAST ACCESSED
que6aryjepjtlz4g9w7x2j5lf*                      true    4.096kB         2 months ago
utd2mzn8tr9tzzqt57dha0gry                       true    39.94MB         2 months ago
0qx9zihc8kze3nzf0hyyk6szx*                      true    268.4MB         11 days ago
k62latkplm1wivcmi3v0rx9v3*                      true    8.192kB         3 months ago
bsc6vqbimujai4zdq2313ash8*                      true    4.096kB         11 days ago
xbugdmobi8kl1rml3nn38qe0u                       true    8.285kB         3 months ago
frw563pfo09t3hkhhyl8wfpv7                       true    236.1MB         5 months ago
qndsklzngxixx70zic5xdzr5n*                      true    395.3MB         3 months ago
i68rws4l3sz4mqsvy7a0sy7a0                       true    4.944MB         3 weeks ago
j9kws74qkoyo85h4z9ys1y5b1*                      true    8.192kB         11 days ago
kmiu3gnwqg9ic0xstopkux314                       true    22.07MB         3 weeks ago
tsjbeyaklxmpa81kv6eofl9jp                       true    28.7kB          3 weeks ago
4zinnzttakcj40s58nwjopnvz                       true    28.67kB         3 weeks ago
yx9kpuxsp7djku8mwpa759h5t                       true    582.2MB         3 weeks ago
pcjjt9pudk1samxw5zvugr39p*                      true    8.192kB         3 months ago
ubgfqiz6kbh49dqnu68hleak0*                      true    8.192kB         3 months ago
jgr92jk9vekxx5tje71wu0csw                       true    347.3MB         2 months ago
p6374o3hn3vnc6tmz6pul1vqo                       true    223.2MB         3 weeks ago
xpn5py1zrh47a9h7kjwj4cnmw                       true    442.4MB         3 months ago
4olqx31t7w30qf360223lw1sf                       true    347.3MB         3 months ago
kvosvzo82y136v938hox2tfgr                       true    1.798MB         Less than a second ago
yk4wz2hdeik1szdciwzpq3gtq*                      true    332.8MB         3 months ago
94ueyx6wjytkwrlwd0t80aqxm                       true    7.854MB         3 months ago
tqs68bx8w9zhn2xpo34gq643u                       true    28.67kB         Less than a second ago
7mo1jk0htpj77e1t5nx27z9ic                       true    8.284kB         48 minutes ago
n9vlhroetwsn8atsbbevrow4h                       true    87.52MB         3 months ago
p97yx60ykef2rus9l43oa86zd                       true    8.285kB         3 months ago
qc7i54dyq6au2ojmm1sdnywi6*                      true    8.192kB         3 months ago
yn6fnfjye6ke1v5surx5ly558*                      true    8.192kB         3 months ago
qx5hsjvn9toga8wjmfh2j4joh                       true    582.2MB         3 weeks ago
q9epehwaja782dgxcog2295pc                       true    7.854MB         Less than a second ago
wynpibg8jfjw74xgvhq4sklqb                       true    28.97kB         3 weeks ago
zybwi5o460qo2us2nbvjx1als                       true    347.3MB         11 days ago
n1hsin9cqhcvpew5357wl5n32                       true    347.3MB         3 weeks ago
wbmyx11b87kwf2w7bol437vcu                       true    347.2MB         3 months ago
wwdspesxhai8ukwuh23t5d1hl                       true    582.2MB         3 months ago
lh9z8rr2m8b9jjnrwu1shwcr4                       true    8.192kB         Less than a second ago
o7xvkdloyybei658yor3wysim                       true    582.2MB         3 months ago
0mg8xjjopg56z5rpurkb9q8d0                       true    8.285kB         1 second ago
lw8xhzre2zyuia15cbj669zyq*                      true    8.192kB         2 months ago
2565lc7i3zd93rk9t80mab618*                      true    4.096kB         3 months ago
b7blgfhbgj6s7elxv53ngtf9h                       true    347.3MB         3 months ago
fk67uh131i6cr7jop37udvbaa                       true    7.854MB         1 second ago
i8z7qdizdycf6pzuu54o2zd9g                       true    198.4MB         3 months ago
z3o9cz3le5f40hkycyhvd98mz                       true    3.013MB         3 weeks ago
a2nfsd4q1cxekslhjez72aohb                       true    1.705MB         3 weeks ago
t2xpk9zx9i3xr0p2ws2658533                       true    28.67kB         48 minutes ago
i36woiagyzthirv625tj8tegh                       true    87.53MB         3 months ago
cfny4ksfrgh3rt4mr75tomson                       true    28.97kB         3 weeks ago
q27imcfk7mkev6eqdv87xdq0s                       true    859.9kB         Less than a second ago
mg7gijczqxfxrh6ucbxopcsn6                       true    28.67kB         Less than a second ago
wr4bcsoxhvp98dcrm8hi94i5p                       true    10.3MB          Less than a second ago
jvu4vuw60yrs1nnltvvfr9b1l                       true    8.192kB         Less than a second ago
xt974wowk26z30mzer7bg3651                       true    370.1kB         Less than a second ago
p1v4r54bj1z2czptc20mtnjp3                       true    3.316MB         Less than a second ago
ocomqwqd73gte55w3qadmtb93                       true    47.75MB         Less than a second ago
46n5x5nvobxlbh2g73ev4xlua                       true    28.67kB         Less than a second ago
6y0d38ek03sisgj3xe0l2hwf4                       true    42.88kB         Less than a second ago
d1mzux69fe1rd5bi35o7xmely                       true    13.22MB         Less than a second ago
r6x0nkdgvk0ms0yv205f2txc7                       true    347.3MB         3 weeks ago
m2mr3g2h0q8xtotcnldghru8l                       true    28.67kB         Less than a second ago
k98m30fk3g72tkysu49f946od                       true    20.25MB         Less than a second ago
l0acj2vqbm5i6eszhvr096bji                       true    28.7kB          Less than a second ago
yq0how36iedszdp4ffh8cmfk2                       true    8.192kB         1 second ago
1ve50siyy8hwnelbq6u84xk6b                       true    28.67kB         3 weeks ago
f7em2a6se7972v5l7w241tg0p                       true    445.6MB         3 months ago
w3538qp4tqqqysna1fjxqmkn1                       true    450.3MB         2 seconds ago
p475cfjd45bv2o8wqz11djgep                       true    7.854MB         3 months ago
7jfed258usux4qp54ia4nodol                       true    582.2MB         3 months ago
80hxti31y5y80cqd4igkbtv2n*                      true    47.77MB         3 months ago
vue62lo2ghxcorg4veni58zkf                       true    8.192kB         3 weeks ago
xiches7kqr3lmcufbdiroleiz                       true    122.9kB         3 months ago
rhgnp7dxoefmsi3md8yywydq0                       true    87.56MB         3 months ago
ysunphdjj1dyfnb0n9ggyaq8t                       true    87.56MB         3 months ago
c6bn692i1s8bd7vtbpx2wxetq                       true    16.51kB         3 weeks ago
yqpghw52l721ta9na4gdjlulb*                      true    4.096kB         3 months ago
ecr2bu73ay6wlk07o3m0pvk2z                       true    8.192kB         Less than a second ago
ji1afkil3l1ojvztwoo3r2cd5                       true    442.4MB         3 months ago
luffcb9w8nhsgfxlouzos9j8l                       true    4.128kB         2 seconds ago
n1xwg4oj3dg6gkxgeekspoikj                       true    470.4MB         Less than a second ago
rdssat01msw1nhzd5dr38kq14                       true    20.93kB         Less than a second ago
aa1j14gkneg7gw6ylw4j5m2kk*                      true    87.53MB         3 months ago
r2hdnjhwyquxyh4uy612mj3yn                       true    87.49MB         3 months ago
6kqel59s9kmdrzwydku7zx3nm*                      true    87.55MB         2 months ago
k9ohxnb5nnefrdq9zanx3v4ft                       true    13.31MB         Less than a second ago
qxgxlwcjd5l3r4hyh2kt1kgvt                       true    24.58kB         3 months ago
tko249i424bkvp0w05n3wyw9s                       true    47.78MB         3 months ago
q5dbnruqmkkgqsynbtqcrinr7                       true    8.192kB         Less than a second ago
l5ph775jwofk8s6w6sszt4zh8                       true    28.67kB         Less than a second ago
ij3ocli3oqfb4bbibdto25yby                       true    450.6MB         3 months ago
jejrugjj5jrz3q9yu93i7pthb                       true    52.88kB         Less than a second ago
e6qvu02fwd1cfbtlr6kazdrv6                       true    87.51MB         3 months ago
uk4bvmgpnhy3hj1mvq4w9lb6n                       true    470.4MB         2 seconds ago
yz25t18vsf83wunpalax549a1                       true    94.21kB         2 months ago
mm30wofhtozxg2bivd4z8l2gp                       true    4.056MB         3 weeks ago
vzomhy3eudfmuqjov72jmrw5a                       true    38.84MB         3 weeks ago
pw93mi6xia42qrlmnoh0555th                       true    7.858MB         3 weeks ago
zpwj80e33kfo9ilkkwcziw827                       true    130.4MB         Less than a second ago
df74h7kuhf3nlqml8broic8be                       true    6.657MB         3 months ago
kg3w309r5p5geazb8887qesdu                       true    13.31MB         1 second ago
78konwwdbczlix8faqqtn5u0g                       true    94.21kB         Less than a second ago
m7fw611sves3o0qh5rdkbt7b8                       true    122.9kB         1 second ago
hnp2gnh50whwxovii845rsvh7                       true    94.21kB         3 months ago
yofm35l7ie614e2rpwqlign2x                       true    20.18MB         3 seconds ago
ly0ffmem2xdmfuojcndwdufar                       true    8.285kB         2 months ago
q6j8lxkynpazsnozdsutu1eih                       true    7.858MB         3 months ago
zfim0pctsgspduecropmjofms                       true    544.3kB         2 seconds ago
ukl3xaingrskjtsla9mxj2txr                       true    442.4MB         3 months ago
4yikvsewr1f5mbx2kpfb96dhd                       true    440.9MB         3 months ago
r363qcyqz9020wo8vvh2irfjp                       true    52.71kB         1 second ago
syjp7sgf6lh583xkdwss2xxou                       true    28.67kB         2 weeks ago
1n9aj9rv4fe0schvn28dz8ill                       true    8.192kB         2 seconds ago
615cp09pqtvut0f3lycb5xu2e                       true    13.31MB         2 seconds ago
57d0am5xlnjfi1iwajk0dc1cc                       true    28.97kB         3 weeks ago
aamvspv7qyx73vkr08oinl6u4                       true    22.07MB         3 seconds ago
lkowxh22490haxup7fsrdhl34                       true    72.95kB         3 seconds ago
vhsm3mdhrmqoi5nxnonv1aj9o                       true    28.67kB         3 weeks ago
wnyvwxfivr06vqctid3uv5fam                       true    633.2MB         2 seconds ago
zb9jum6dcxi8pk8spdxhyrivi                       true    582.5MB         1 second ago
n8qg7k8pxfyel9ae4crgtwy59                       true    367.3MB         Less than a second ago
90axgxon290tk39jnom5zk6w2                       true    13.31MB         Less than a second ago
w9w8hw7fcp8swt3c4tdruofqk                       true    8.285kB         Less than a second ago
j2jlzncorf8c0s00bpjrqja7v                       true    8.285kB         Less than a second ago
tezsv8aax392m2l0vzftk95j7                       true    1.398kB         Less than a second ago
wfg082dpp6di6bil059q76044                       true    13.31MB         1 second ago
0fgrfxbsv7ljuz3i9330gtbke                       true    16.51kB         2 seconds ago
iv3jbphpq0p158r6bvcaedf8f                       true    8.192kB         1 second ago
z6lg51tb80ht1mg3s3z8ouyc9                       true    223.2MB         1 second ago
taobklelc69ntko8bnlzls365                       true    13.31MB         2 seconds ago
zid93ubgzprpdu3pn33nsl73u                       true    35.46MB         1 second ago
ft7jfct4ouks9q49b25vkrbpq                       true    367.4MB         1 second ago
b3hooxczaxx85j4isczqwsxuo                       true    28.67kB         3 seconds ago
2z7etkgxjky6hiwon0liapmr3                       true    75.31MB         Less than a second ago
qkqc5dh3pd2cudx5kcn73yqc4                       true    7.854MB         1 second ago
na63j1gmqv5lvw5wscaiyv239                       true    1.208kB         Less than a second ago
s2l6z3j2phf0zb5ywjwe2ozsn                       true    55.51kB         1 second ago
1xsbhu0fbzg4dwmedp8bum7jm                       true    1.397kB         2 seconds ago
p60b8d4nxufgxyvccwzc3ocqo                       true    53.29kB         2 seconds ago
o106jpo52uagyrfcia05di73z                       true    72.03MB         1 second ago
lfgf9psh2bzj1btwb7lnsjwia                       true    35.47MB         1 second ago
8304q7s4k7xlpwsqbszi21j7f                       true    196.5kB         Less than a second ago
njdr5ka1o6oc8nkxubu8zsyff                       true    8.285kB         Less than a second ago
y81qs5lukkyi53vtfqmdop26w                       true    367.7MB         Less than a second ago
8uj2kvn83r36z04m9za65nxqk                       true    6.743MB         2 seconds ago
g5lk4p3yp216i1yo0d11bl08g                       true    8.192kB         1 second ago
jttnojb1a1e69mmb8o5lex7r0                       true    379.6MB         2 seconds ago
mgrtzx6ce3quq8rgd01gfpv8v                       true    404B            Less than a second ago
l18ipcfctwz8w4ebras0564lm                       true    28.67kB         1 second ago
d5hw4w1nxxvttid9hvm5po3dk                       true    8.192kB         Less than a second ago
3467m6oju93w8zd4vwdleqsal                       true    314.2MB         Less than a second ago
6e6vdebpvmvpmmqbkw5wcvjwg                       true    11.5MB          Less than a second ago
0l5yih4ul20pk1g9iiecy953b                       true    8.192kB         2 seconds ago
lhi4pzigez7wxopgr1736rjsx                       true    17.78kB         Less than a second ago
8g4hlzrlxupquu4ox19nl3w0m                       true    1.207kB         Less than a second ago
qj0ofubg5zila18askwlfzt4g                       true    8.192kB         1 second ago
8acygyum9qf035ghvn48gxq4j                       true    830.2MB         1 second ago
4mocfsc5tub76wzjspjl41ule                       true    16.64kB         Less than a second ago
rqzwudh39qytxeqoukris64ph                       true    12.63MB         1 second ago
ieww0ggudkcefpv10dys0fg6z                       true    1.779MB         Less than a second ago
jkvp36tfp4fd3c2n9b6ibpqd9                       true    53.29kB         2 seconds ago
kih5qjc3qmn5u36pwze61i0tt                       true    258MB           Less than a second ago
iimo47ds488913o30zb8b5vpt                       true    53.53MB         Less than a second ago
mczrltww6jshpycb8xrms5m7f                       true    20.93kB         Less than a second ago
ynrbkv85vs58o7p3pejtyjt17                       true    470.4MB         2 seconds ago
ywhg7du70za8mpd9a9kh9tci9                       true    955B            Less than a second ago
g3p9s58qgc3ae1xtusrga1jvd                       true    72.96kB         1 second ago
094g9sjfanrq0s72fyz955phm                       true    22.07MB         Less than a second ago
5ty17zx37eu5nzrx2aknz3mpy                       true    8.192kB         2 seconds ago
xg3i5er4gko6vjd58t646gil6                       true    12.92MB         1 second ago
q9yrv1ad1ibpry8g46g2boi1q                       true    22.07MB         1 second ago
qcyqvht0xqp22hjlwwvn8utd7                       true    13.31MB         Less than a second ago
3vv9i40wv9ji711ssv77i5nkp                       true    13.31MB         Less than a second ago
4gg1bet3gbog5cyz1mgujh1p6                       true    6.743MB         Less than a second ago
3i8r4b8d3w5ky7p9fdj2jmb7v                       true    35.47MB         2 seconds ago
kc5mf849t1pxw2mgvan4v40v1                       true    8.192kB         1 second ago
oc0007wkhsdie3i3rndwxfplt                       true    32B             Less than a second ago
tusdxor1xx5yyya4qtrlpjuff                       true    1.779MB         1 second ago
j0vtsjr5vvotjr8cdzin7kkxb                       true    13.31MB         1 second ago
810aayqucsh5cvy5snuakinnn                       true    4.128kB         Less than a second ago
ehijave5j8it46byfla9mr2ba                       true    402B            Less than a second ago
i6gcgimt23d3nlg1hscj3whhr                       true    8.192kB         Less than a second ago
qq4irubam2rhfzzfdxanajy7x                       true    17.78kB         Less than a second ago
kqwgukdlqn5ml5o0at65pwffv                       true    8.285kB         1 second ago
qohjrqfdybxxckwv99m0tkqxe                       true    12.13MB         1 second ago
jejnfmys1jtqtscafd0auk23o                       true    53.29kB         Less than a second ago
q8adaz8qerxzk48oyd79a00hq                       true    171.9MB         1 second ago
uts2bh7hoyclqqtt95e5e4yqt                       true    13.49kB         1 second ago
4ceh6i0wjmd4an5iyncwk72n8                       true    830.2MB         Less than a second ago
vfrl6ifbmmx4nfx13s3zq4ok5                       true    953B            Less than a second ago
1091w71l3kdqwbzoj58mmsrvj                       true    13.9MB          Less than a second ago
za08ieae7rdxypocgd90689a1                       true    20.93kB         Less than a second ago
xn2h4xjhpvcfahxixeycuvule                       true    16.51kB         Less than a second ago
bef5ms3yn10nbmbhm55rs1b50                       true    367.7MB         1 second ago
s07yxu4wan5j9uwxqoh7bhr7y                       true    218.2MB         Less than a second ago
tlt09fgrjq1aa7n91lep3dh9p                       true    76.25MB         1 second ago
uk84l1yce9gj2bg6bt36v1fnl                       true    13.31MB         Less than a second ago
oaker56zade479g6uz71u9bu7                       true    8.192kB         1 second ago
mr42o5djwk2ek1lhg1hfvuysj                       true    628B            1 second ago
eydf3y8dot5povz8ir77g4a1y                       true    258MB           Less than a second ago
o4whwgmzoomjl3whgf65k06zp                       true    125B            Less than a second ago
b31d9wjq0zl5iz4gmvlqrr9az                       true    60.15MB         Less than a second ago
q10028q16wwcocpihpyiqw3qt                       true    1.856MB         Less than a second ago
mxuntwz35jmq5to15sregt3ni                       true    605.4MB         Less than a second ago
ml5a7qrz9auiqfpsehh6kmd9y                       true    355.5MB         Less than a second ago
qzeom5bkdm50bzm3b1ww78fix                       true    13.31MB         Less than a second ago
voe03572p51jlq61f3ie1hu8d                       true    8.284kB         Less than a second ago
x9nrdv7ifizx0ehsw0d0s6t2h                       true    113.5MB         Less than a second ago
951jljum5gcvpx3ti4xjrz6yc                       true    12.69kB         Less than a second ago
21ydq9ko252xy3vbdcpysobvd                       true    76.25MB         Less than a second ago
vgd5bnpwmwipp670y0tczfkyx                       true    6.743MB         Less than a second ago
3nvll1m6t53paanr8ewgoxxub                       true    22.12MB         1 second ago
tp9bgexldfwsoe72tqd6h9p6i                       true    13.49kB         1 second ago
u02bcjsrvrfo0t726vaqjiz4e                       true    4.128kB         Less than a second ago
y6824s2a0ozv1v8d9iv7cwm37                       true    181.3MB         Less than a second ago
xo9rhvwkvykx0fapkhrg2zcoa                       true    367.7MB         1 second ago
4see44do42snlgqnzz5ifs7jz                       true    218.3MB         Less than a second ago
xe5jbtjb2k7mldy1zsl4s5aa4                       true    626B            1 second ago
qe540mrvt6oaorg4h3g0vc72q                       true    181.3MB         Less than a second ago
gg6p4ln2wlroi44y7t66il0q1                       true    296.1kB         Less than a second ago
oweb7kgut7lrhzsi7se1m79bk                       true    38.84MB         Less than a second ago
d47cgspuurd55p57f04yvesoe                       true    22.12MB         Less than a second ago
hs0m17ou0a3jlrwozpdye00gg                       true    16.51kB         Less than a second ago
gd3j97ldgma5hgsp8vbl9uti9                       true    8.285kB         Less than a second ago
w4b0cdv7mbb965rikepa3uziz                       true    8.285kB         Less than a second ago
ckuzp39zllqqofgkygt2srpik                       true    12.69kB         Less than a second ago
2e0b4xibcejt1ovz86ml4bo6q                       true    1.87MB          Less than a second ago
w2bf98v51jdjgdhuq9pvg0ses                       true    4.128kB         Less than a second ago
l1yolpqnf4obgbn0rw71u4tcl                       true    13.24kB         Less than a second ago
shf00kvfwro4gue6o4zbfpgcy                       true    1.7MB           Less than a second ago
wgug5qbijva9uzhk62rshhfjb                       true    314.3MB         Less than a second ago
ku32hv2xzeu2ueaaw5ijgsapi                       true    22.07MB         Less than a second ago
wue8omuo66xupd0tmot902gog                       true    12.78MB         Less than a second ago
mtodyfe1pfbsdsbnx9j2xpbof                       true    8.818kB         Less than a second ago
yvdkp6dqe9kk58i6ce57afkki                       true    13.24kB         Less than a second ago
664rmjm02nz6eq6818u3ts3p9                       true    249B            Less than a second ago
uvfg514dtdzgjllazcuadvghj                       true    16.51kB         Less than a second ago
kq0wby7jj0zhq7uytio44mndw                       true    4.128kB         Less than a second ago
3qcqtn1ju0uv87pk20na8914y                       true    314.6MB         Less than a second ago
iy3apw2b87qdltstf9chyxws1                       true    25.67MB         Less than a second ago
kjutlfxh6em5j0leq5fb3tlve                       true    8.817kB         Less than a second ago
kjn1a3snouy6fbpmqr5jagkzi                       true    4.128kB         Less than a second ago
fzlzfgjowi2g5s9xiyrg56yeo                       true    1.779MB         Less than a second ago
zavzkh7zt3cx8d9jyrarjn2ap                       true    7.418MB         Less than a second ago
ohs5fsrtzp4f2snpfik3968us                       true    16.51kB         Less than a second ago
3h9epq27etq2hnmy3ai5ui99k                       true    119.8MB         Less than a second ago
6tw14hfq64qirmki544d9nwlk                       true    314.6MB         Less than a second ago
sfuzujhct67z39ezhkl2hwsp4                       true    6.085MB         Less than a second ago
rq73sj54jhy341aze1tc1wjl1                       true    1.744MB         Less than a second ago
kswrbgh0nnush4jx2s8bms96p                       true    16.51kB         Less than a second ago
qd1pmsprfu0wiag2uc22qj5an                       true    12.98MB         Less than a second ago
4eu2dt39e1d7jbzf8608gx76r                       true    314.4MB         Less than a second ago
yeq0dkwpqd4d523q4b99mr6jv                       true    117.2MB         Less than a second ago
ku169mjmngjkrht2d6zaxmxon                       true    236MB           Less than a second ago
sxm96hvaurwlfozmzi4byccnb                       true    1.47MB          Less than a second ago
j0yooacsxj79kz2fowmo7shjg                       true    1.779MB         Less than a second ago
rf1jxsjwo4xpsa2qapbqut7jo                       true    12.92MB         Less than a second ago
0xagb2lbrl5tsnxoclq6iqgru                       true    67.79MB         1 second ago
a0r8krfcjblpy776mzdm14kdu                       true    25.61MB         Less than a second ago
oakv82zpn13kl5q1ztxe0q8l2                       true    3.862MB         Less than a second ago
sdlronzedk3p1li08p2tlo174                       true    49.29MB         Less than a second ago
Total:  23.83GB
```

</details>

> 💡 **超長輸出的筆記技巧**:別整包貼進正文。①正文只留「結論 + 最肥的幾筆」;②完整原始輸出塞進 `<details>` 收合區(Obsidian 閱讀模式會渲染成「點我展開」)。筆記清爽,又保留完整證據。

---

## 第二大部份:compact vdisk(把空間還給 C 槽)

### 為什麼還要 compact?

Docker Desktop 在 Windows 上把資料存在一個會「**只長不縮**」的虛擬磁碟(WSL2 的 vhdx)。

我在介面裡刪掉 volumes / images,Docker 內部確實騰出空間了,但 vhdx 檔在 Windows 主機上**不會自動縮小**——像一顆氣球裡面的水倒掉了,但氣球還是一樣大,主機的可用空間不會馬上反映出來。所以要手動 **compact** 把氣球「消氣」。

**清理前:C 槽只剩 27.8GB**
![[vhdx瘦身_P2-01_清理前C槽27.8GB_2026-07-12.png]]

### 前置:先關 Docker + wsl --shutdown

```powershell
wsl --shutdown
```

再檢查是否成功:

```powershell
wsl --list --running
```

要顯示「沒有正在執行的散發套件 / 沒有任何執行中的發佈」才對(兩種翻法**意思相同**,都代表 WSL 已關乾淨)。

> 隔天/重開後若要更新 WSL 引擎,可執行 `wsl --update`。

| 指令 | 做啥 | 目的 |
| --- | --- | --- |
| `docker builder prune` | 刪 Docker 內的建置快取 | 省**磁碟**(清 Docker 內部) |
| `wsl --shutdown` | 關 WSL 虛擬機 | 省**記憶體** + 解鎖 vhdx(才能 compact) |

### diskpart 五步驟(逐行按 Enter,不能擠一行)

**先觸發 diskpart 的 UAC 提權:**
![[vhdx瘦身_P2-03_PowerShell觸發UAC_2026-07-12.png]]

**查 vhdx 路徑(第一次才需要,之後直接用完整路徑):**

```powershell
dir /s /b "%LOCALAPPDATA%\Docker\wsl\*.vhdx"
```

![[vhdx瘦身_P2-02_CMD查詢vhdx路徑_2026-07-12.png]]

- `/s` = 遞迴搜尋所有子資料夾(**s = subdirectories**)
- `/b` = 精簡格式,只印完整路徑
- 會找到 2 個:`docker_data.vhdx`(資料,肥)與 `main\ext4.vhdx`(引擎,小)

**進 diskpart 依序執行(注意 `file=` 等號兩邊不能有空格):**

```text
1. select vdisk file="C:\Users\User\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
2. attach vdisk readonly
3. compact vdisk        ← 壓縮時間最長,等它跑完
4. detach vdisk         ← 千萬別忘!忘了會害 Docker 開不起來
5. exit
```

![[vhdx瘦身_P2-04_DiskPart-select-attach-compact_2026-07-12.png]]

> diskpart **不會展開** `%LOCALAPPDATA%` 這種環境變數,在 diskpart 裡要用**完整路徑**。

**清理後:C 槽回到 67.8GB(compact 一口氣還回約 40GB!)**
![[vhdx瘦身_P2-05_清理後C槽67.8GB_2026-07-12.png]]

---

## 觀念補充

### 掛載(mount)是什麼

掛載 = **把一個儲存空間「接上」系統、給它一個可存取的入口,系統才進得去讀寫**。

- 對 vhdx:`attach vdisk` 把虛擬磁碟檔**掛上 Windows**(會出現在磁碟管理);`detach vdisk` 把它**卸下**。
- 對 WSL:`docker_data.vhdx` 平常「掛載」在 WSL 的 Linux 裡當硬碟。
- 比喻:一塊硬碟像「一間有東西的房間」,掛載就是**幫它裝上門、給門牌**,系統有門牌才進得去。

### build cache vs image —— 關鍵在「層(layer)」

Dockerfile **每一行指令都會產生「一層」**(那一步對檔案系統的變更快照):

```dockerfile
FROM node:20          ← 第 1 層
COPY package.json .   ← 第 2 層
RUN npm install       ← 第 3 層(很肥)
COPY . .              ← 第 4 層
```

- **image** = 這幾層**疊起來的成品**,你 `docker run` 跑的就是它(在 Images 分頁)。
- **build cache** = Docker 把**每一層的中間結果**另外存起來,加速**下次** build(只改第 4 行,前 3 層直接沿用)。

| | image(映像檔) | build cache(建置快取) |
| --- | --- | --- |
| 是什麼 | 疊好的**成品** | 建置過程**每一層的半成品備份** |
| 在哪看 | Images 分頁(2.54GB) | Builds 分頁(23.83GB) |
| 為何存在 | 給你執行 | 加速下次 build |

> 比喻:image 是烤好的蛋糕;build cache 是每次做蛋糕留下的一堆半成品麵糊、預烤海綿,「以防下次要用」全塞冰箱(硬碟)。舊的不會自動丟,越積越多 → 爆掉。`docker builder prune` 就是清冰箱。

### 管理員 vs 系統管理員 vs Administrator

其實只有 2 個真概念(「管理員身分」和「系統管理員身分」中文是同一詞):

1. **帳戶是不是管理員**——帳戶類型(靜態身分)。管理員帳戶能裝軟體、改系統設定;標準帳戶不行。
2. **以系統管理員身分執行 = 單次把權限提升(UAC 提權)**——這是 Windows 的 UAC 安全機制。只有右鍵選「以系統管理員身分執行」,那個**程式**才會拿到完整管理員權限(跳出黃/藍色允許視窗)。
3. **內建 Administrator 超級帳戶**——權限比一般管理員更高,而且不受 UAC 攔阻(預設停用)。

跑 `fsutil`、compact vhdx、改系統檔,都得用「以系統管理員身分執行」開 CMD/PowerShell,不然會被說「存取被拒」。

### BOM 是啥

Byte Order Mark,檔案開頭一個**看不見的標記**(3 位元組 `EF BB BF`),標示編碼是 UTF-8。問題是 `.bat` 第一行若被塞了它,`@echo off` 會變成「亂碼@echo off」解析失敗 → 閃退。避免:記事本另存時編碼選 **ANSI 或 UTF-8(不含 BOM)**。

### vhdx 的 `x` 是什麼意思

`VHD` = **V**irtual **H**ard **D**isk(舊格式,上限 2TB)。
`VHDX` 是它的**下一代格式**(Windows Server 2012 / Hyper-V 起),`x` 沒有官方全名,理解成「**eXtended / 下一代**」即可。相對 VHD 的改進:上限拉到 **64TB**、**斷電時有中繼資料日誌保護**(較不易損毀)、效能更好。

---

## 疑難排解

### compact 時報「檔案正由另一個程序使用」

> Diskpart 發生錯誤：程序無法存取檔案，因為檔案正由另一個程序使用。
> 如需詳細資訊,請參閱系統事件記錄檔。

**原因**:`docker_data.vhdx` 就是 WSL2 那顆 Linux 虛擬機的硬碟。WSL 運作時把它當自己的檔案系統**掛載並加獨佔鎖(exclusive lock)**——同一時間只能一個程序用一顆磁碟。

**盲點**:工作管理員關掉的是 **Docker 的程序**,但 WSL 的虛擬機是**另一個叫 `Vmmem` / `vmmemWSL` 的程序**,不會跟著停。

**解法**:一定要用 `wsl --shutdown` 把 VM 優雅關掉(比在工作管理員硬殺 Vmmem 安全,不會讓 ext4 停在未寫完狀態),確認 `wsl --list --running` 沒有執行中的發行版後,再重進 diskpart 跑一次。

### 順序反了會怎樣?

不會弄壞資料,只會先導致 vhdx 被鎖住、diskpart attach 不了。`wsl --shutdown`、`compact`、`detach` 都不刪資料。重做一次即可。正確順序:**Quit Docker Desktop → `wsl --shutdown` → 進 diskpart compact → detach → exit**。

### Optimize-VHD 為何用不了?

`Optimize-VHD -Path "...ext4.vhdx" -Mode Full` 需要 **Hyper-V 模組**(通常只有 Windows 專業版才有),而且要在 **PowerShell**(不是 diskpart 內)跑。家用版改用 diskpart 的 `compact vdisk` 即可,效果相同。

### 看事件記錄

Windows 打開 `eventvwr.msc` → Windows 記錄 → 系統。

![[eventvwr.msc_事件檢視器_2026-07-11 102935.png]]

> 補充:當時看到的 WinRE 事件 4502「Windows 修復環境服務失敗」與 Kernel-EventTracing 警告,多半肇因於**磁碟/救援分割區空間不足**,與這次 C 槽爆滿相符,清出空間後即緩解。
