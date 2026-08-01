---
title: x86通用暫存器與Register-in-Opcode編碼
type: topic-note
tags: [計算機基礎, x86, assembly, opcode, register, CISC]
aliases: [x86通用暫存器與register-in-opcode編碼, 暫存器3-bit編碼, register-in-opcode]
related:
  - "[[12-return-清理記憶體-stack-frame與閉包例外]]"
  - "[[CPU五大單元-ALU-CU-暫存器-快取與微指令]]"
  - "[[進位制-二進制-十六進制-Bytes與RGB]]"
  - "[[x86組合語言助憶符字典-How-Assembly-Functions-Work範例]]"
sources:
  - https://www.felixcloutier.com/x86/mov
  - https://www.felixcloutier.com/x86/call
  - https://www.c-jump.com/CIS77/CPU/x86/X77_0380_intel_manual_opcode_bytes_cont.htm
  - https://en.wikipedia.org/wiki/X86-64
  - https://youtu.be/u_-oQx_4jvo
updated: 2026-07-30
---

# x86通用暫存器與Register-in-Opcode編碼

> [!info]- 🔗 為什麼這篇要跟JS_Core_and_Runtime的12篇連起來
> <mark style="background: #ADCCFFA6;">這篇是[[12-return-清理記憶體-stack-frame與閉包例外]]第5節(viii)(ix)的底層延伸</mark>——12篇是從「JS的Stack Frame」切入，一路深入到組合語言層級才碰到`bf`、`edi`、`esi`這些x86細節；這篇反過來，專門把「x86通用暫存器本身」這個計算機基礎主題講完整，兩篇互為讀者從「JS」或「計算機組織」兩個方向切入同一組知識的入口，所以雙向連結、缺一邊都不完整。

> 起點問題：`mov edi, 3`裡的`bf`到底怎麼來的？暫存器名字又是什麼意思？——這篇把散落在12篇問答裡的x86暫存器知識，集中整理成一篇計算機基礎筆記。

---

## (a) 8個通用暫存器：編號、全名、用途

3 bits**不是從英文字母算出來的**，純粹是Intel從0~7分配給這8個暫存器的固定編號，跟hex的A-F沒有關係（hex的字母代表數值10~15，這裡的字母是英文縮寫，兩者只是剛好都用到字母，意義完全不同）。

![[計算機基礎_x86通用暫存器與Register-in-Opcode編碼_2026-07-30.svg]]

> [!info]- 🕒 圖中時間軸說明
> <mark style="background: #ADCCFFA6;">圖上方新增的「影片章節時間軸」是依原影片公開的6個章節標記（00:00、00:34、02:08、03:44、10:09、12:30）加上妳自己截圖裡看到的時間點（2:00、4:12-4:34、4:28）拼出來的，並不是逐秒字幕。</mark>YouTube本身只公開這6個章節，沒有提供更細的逐秒時間碼，所以圖裡每個區塊標的時間是「對應到那段章節」的區間，不是精確到秒的字幕標註。對應邏輯：`mov edi,3`／`mov esi,4`屬於02:08～03:44「逐行講解程式」章節；`push rbp`／`call add`屬於03:44起的「Stack Frames」章節（包含妳自己的2:00與4:12-4:34截圖）。
>
> 影片連結（供之後查證來源用）：[How Assembly Functions Work - The Stack Explained](https://youtu.be/u_-oQx_4jvo)（@Mxy，YouTube）。

| 編號 | 16-bit | 32-bit | 64-bit | 全名 | 用途 |
|---|---|---|---|---|---|
| 0 | AX | EAX | RAX | Accumulator（累加器） | 算術結果慣例暫存處；呼叫慣例中＝函式回傳值 |
| 1 | CX | ECX | RCX | Counter（計數器） | 迴圈／字串重複指令（REP）的計數器 |
| 2 | DX | EDX | RDX | Data（資料） | 常搭配EAX做較大範圍的乘／除法運算 |
| 3 | BX | EBX | RBX | Base（基底） | 早期定址用基底暫存器，現代多當一般用途 |
| 4 | SP | ESP | RSP | Stack Pointer（堆疊指標） | 指向目前Stack最上面（屋頂） |
| 5 | BP | EBP | RBP | Base Pointer（基底指標） | 指向目前frame起始位置（地板） |
| 6 | SI | ESI | RSI | Source Index（來源索引） | 舊：字串搬移指令的來源位址；現代呼叫慣例＝第2個參數 |
| 7 | DI | EDI | RDI | Destination Index（目的索引） | 舊：字串搬移指令的目的位址；現代呼叫慣例＝第1個參數 |

a. **EAX/ECX/EDX/EBX**這4個的名字（累加器／計數器／資料／基底）反映它們早期在硬體設計裡各自的專門角色；
b. **ESP/EBP**是[[12-return-清理記憶體-stack-frame與閉包例外]]第(ii)節講的「屋頂／地板」那兩個暫存器，這裡的編號4、5正好對應；
c. **ESI/EDI**的全名確實是Extended Source Index／Extended Destination Index，舊用途是字串搬移指令(`MOVS`)的來源／目的位址，現代x86-64呼叫慣例（[[12-return-清理記憶體-stack-frame與閉包例外]]viii節提過的System V AMD64 ABI）借用這兩個暫存器來放第1、2個函式參數——**這是後來的軟體慣例，不是CPU硬體本身規定的**，跟它們原本的字串指令用途已經無關，只是沿用舊名字。

> [!info]- 🔍 追問：base pointer不是也是暫存器嗎？為何一開始只列出來感覺沒看到它？還是說不只8個？
> <mark style="background: #FFF3A3A6;">BP其實一直都在——它是編號5那一列，只是容易在一長串列表裡被忽略。</mark>而且「不只8個」你也猜對了一部分：這8個是x86最早（16/32-bit時代）就有的**基本款**；到了x86-64（AMD64），Intel／AMD把這8個全部加上R字首（RAX~RDI），**又新增了R8~R15共8個全新的暫存器**，總共變成**16個**通用暫存器。16個需要4 bits才能編完（3 bits只能編8個），多出來的那1 bit要靠額外的REX前綴位元組補上。不過這篇、以及12篇討論的`bf`／`+rd`編碼，聚焦的都是最原始的8個、3-bit版本，跟她截圖裡的32-bit程式碼完全對應。

## (b) Register-in-Opcode（+rd）公式

**最終opcode（十六進位）＝ 基底opcode ＋ 暫存器編號（0~7，十進位相加）**

「+rd」是Intel手冊的記法，意思是「把0~7的暫存器編號，加到左邊這個hex基底byte上，組成最終唯一的opcode byte」——`rd`可以理解成「這個opcode後面還跟著一個暫存器編號」的標記，跟`+rb`（8-bit）、`+rw`（16-bit）是同一系列記法，差別只在對應的暫存器寬度。

| 暫存器 | `mov r32,imm32`（基底B8） | `push r64`（基底50） | `pop r64`（基底58） |
|---|---|---|---|
| EDI（7） | B8+7 = **BF** | 50+7 = 57 | 58+7 = 5F |
| ESI（6） | B8+6 = **BE** | 50+6 = 56 | 58+6 = 5E |
| EBP（5） | B8+5 = BD | 50+5 = **55** | 58+5 = 5D |

套回你自己截過的三個實例：`mov edi,3`→`bf`、`mov esi,4`→`be`、`push rbp`→`55`，全部對得上。

> [!info]- 🔍 追問：B8這個「基底」是怎麼推出來的？我怎麼知道那個8是打哪來的？
> <mark style="background: #FF5582A6;">推不出來——B8不是靠邏輯運算算出來的，它是Intel在設計x86指令集時，直接指定、寫進官方手冊裡的一個固定數值，性質上跟「ASCII裡A是65」一樣，是規格書規定的常數，不是可以自己反推的公式。</mark>你能「知道」B8，唯一的辦法就是查Intel官方手冊（Intel® 64 and IA-32 Architectures Software Developer's Manual, Vol.2，MOV指令條目），或是查像[felixcloutier.com/x86/mov](https://www.felixcloutier.com/x86/mov)這種整理Intel手冊內容的公開索引網站——上面明確列著`MOV r32, imm32`的opcode是`B8+ rd id`（`id`代表後面接的32-bit立即值）。同樣地，`push r64`的基底`50`、`pop r64`的基底`58`，也是[felixcloutier.com/x86/push](https://www.felixcloutier.com/x86/push)、[felixcloutier.com/x86/pop](https://www.felixcloutier.com/x86/pop)裡列出的官方常數。

## (c) imm32、operand、little-endian 三個名詞

a. **imm32**＝immediate 32-bit（32-bit立即值）的縮寫，指「直接寫死在指令裡的數字本身」，不是從暫存器或記憶體讀出來的值——`mov edi, 3`裡的`3`就是imm32。
b. **operand**中文是**運算元**，不是「運算子」：運算子（operator）是「要做什麼動作」的那個符號或指令本身（例如`mov`、`+`）；運算元（operand）是「被那個動作作用的對象／數值」（例如`edi`、`3`）——一個是動詞，一個是受詞。
c. **little-endian**是多位元組數值在記憶體裡的排列規則：**最小位元組（least significant byte）放最前面**，高位元組依序放在後面。數值3的完整32-bit表示法是`0x00000003`，little-endian排列後變成`03 00 00 00`——`03`（最小位元組）先存，`00 00 00`（高位補零）後存。x86／x86-64都是little-endian架構；相反的排法叫big-endian。

## (d) 為什麼E8（call）不套用+rd？

`call add`的opcode是`e8`——這是**單一固定**的opcode，不屬於`+rd`家族，因為`call`後面接的不是「要對哪個暫存器操作」，而是一個32-bit的**相對位移量（relative displacement）**，用來算出目標函式的位址，不需要暫存器編號這個欄位。所以`call rel32`固定是`e8`＋4-byte位移量，總長一樣是5 bytes（1 opcode + 4位移），這也是為什麼`0x000E`（14）+ 5 = `0x0013`（19）——跟`mov edi,3`（0x0004→0x0009）、`mov esi,4`（0x0009→0x000E）用的是完全一樣的「5-byte指令」邏輯，只是這裡的4個byte是位移量，不是立即值。

## (e) 一句話收尾

`bf`＝「mov reg,imm32這族指令的基底opcode B8」加「EDI的暫存器編號7」；base opcode本身是Intel手冊裡的固定常數，查得到、推不出來；EDI/ESI/EBP這些暫存器名字反映的是它們的英文全名跟歷史用途，3-bit編號只是純粹的分類序號，跟拼字或hex都無關。

## 資料來源（含查證時間）
| 主題 | 連結／說明 | 查證日期 |
|---|---|---|
| MOV r32,imm32的opcode B8+rd | [felixcloutier.com/x86/mov](https://www.felixcloutier.com/x86/mov)（整理自Intel SDM Vol.2） | 2026-07-30 |
| CALL rel32的opcode e8 | [felixcloutier.com/x86/call](https://www.felixcloutier.com/x86/call) | 2026-07-30 |
| 「+rd」記法定義（暫存器編號0~7加到基底byte上） | [c-jump.com CIS77教材](https://www.c-jump.com/CIS77/CPU/x86/X77_0380_intel_manual_opcode_bytes_cont.htm) | 2026-07-30 |
| x86-64新增R8~R15，通用暫存器總數變16個 | [Wikipedia: X86-64](https://en.wikipedia.org/wiki/X86-64) | 2026-07-30 |

---

> [!info]- ➡️ 相關筆記
> [[12-return-清理記憶體-stack-frame與閉包例外]]——從JS的Stack Frame一路深入到這篇的x86細節，兩篇建議對照著讀。
> [[進位制-二進制-十六進制-Bytes與RGB]]——hex／binary換算的基礎，這篇little-endian小節會用到。
