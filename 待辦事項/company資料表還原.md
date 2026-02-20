# Company 資料表還原待辦

## 問題
不小心執行了 `TRUNCATE company` 導致 `future_sign_stage` 資料庫的 company 資料表被清空。

## 備份檔案位置
- `future_sign_backup_20251222.sql` - 完整備份
- `company_restore.sql` - 提取出來的 company INSERT 語句

## 還原問題
備份檔有 **23 欄**，但目前資料表有 **24 欄**（新增了 `brand_logo_url`）。

### 資料表欄位（24 欄）
```
id, company_name, tax_id, registered_address, business_address,
brand_name, brand_description, official_website, official_line_id, country,
owner_name, owner_phone, role, deleted_at, created_at,
updated_at, contact_person, contact_phone, contact_email, status,
status_comment, created_by, updated_by, brand_logo_url
```

### 已嘗試的修復
1. 在每筆資料後加 NULL → 但有 4 筆資料原本就有 brand_logo_url，變成 25 欄
2. 分開處理有/沒有 brand_logo_url 的資料 → 仍報錯 row 7

### 待處理
需要手動檢查第 7 筆資料（company ID: `0b1f30e0-9df1-4e04-a215-83777e466856`，公司名: `good`）的欄位對齊問題。

## 相關檔案
- `company_restore.sql` - 原始提取
- `company_records.txt` - 分行後的記錄
- `company_records_fixed.txt` - 修復後的記錄
- `company_final.sql` - 最終 SQL（仍有問題）

## 還原指令
```bash
docker run --rm -i mysql:8 mysql -h hnd1.clusters.zeabur.com -P 32195 -uroot -p<MYSQL_PASSWORD> future_sign_stage < company_final.sql
```

## 備註
共 23 筆公司資料需要還原。

---

## 附錄：原始 SQL 資料

```sql
INSERT INTO `company` VALUES
('00000000-0000-0000-0000-000000000010','示例活動公司','12597864',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'organizer',NULL,'2025-11-23 18:28:39','2025-12-19 16:34:09',NULL,NULL,NULL,'active',NULL,NULL,NULL),
('00000000-0000-0000-0000-000000000201','台灣小吃王有限公司','12345678',NULL,NULL,'小吃王','專營台灣傳統小吃，包含滷肉飯、蚵仔煎、珍珠奶茶等經典美食',NULL,NULL,NULL,NULL,NULL,'vendor',NULL,'2025-12-04 10:19:39','2025-12-04 10:56:38','王小明','0912345678','contact@xiaochiwang.com','active',NULL,NULL,NULL),
('00000000-0000-0000-0000-000000000202','和風料理株式會社','23456789',NULL,NULL,'日式料理屋','正宗日本料理，提供拉麵、壽司、天婦羅等日式美食',NULL,NULL,NULL,NULL,NULL,'vendor',NULL,'2025-12-04 10:19:39','2025-12-04 10:56:38','田中太郎','0923456789','info@wafu-ryori.com','active',NULL,NULL,NULL),
('00000000-0000-0000-0000-000000000203','義大利冰品有限公司','34567890',NULL,NULL,'Gelato House','義大利手工冰淇淋，使用新鮮水果與天然食材製作',NULL,NULL,NULL,NULL,NULL,'vendor',NULL,'2025-12-04 10:19:39','2025-12-04 10:56:38','馬可','0934567890','hello@gelatohouse.tw','active',NULL,NULL,NULL),
('00000000-0000-0000-0000-000000000204','甜蜜時光烘焙坊','45678901',NULL,NULL,'甜蜜時光','手作法式甜點，專精馬卡龍、可麗露、千層蛋糕',NULL,NULL,NULL,NULL,NULL,'vendor',NULL,'2025-12-04 10:19:39','2025-12-04 10:56:38','林小甜','0945678901','sweet@sweettime.com','active',NULL,NULL,NULL),
('00000000-0000-0000-0000-000000000205','暹羅美食有限公司','56789012',NULL,NULL,'泰好吃','道地泰國料理，提供綠咖哩、打拋豬、泰式奶茶等',NULL,NULL,NULL,NULL,NULL,'vendor',NULL,'2025-12-04 10:19:39','2025-12-04 10:56:38','阿南','0956789012','contact@thaidelicious.tw','active',NULL,NULL,NULL),
-- 第 7 筆 (有 brand_logo_url，共 24 欄)
('0b1f30e0-9df1-4e04-a215-83777e466856','good','12345671','12345678','12345678','good','123456789','https://scentribution.com/en/register','123456789','TW','Brian','098766556','organizer',NULL,'2025-12-22 07:32:03','2025-12-22 07:33:23','Brian','2345678909','nguyenvanqui291@gmail.com','active',NULL,NULL,'https://future-sign.s3.ap-northeast-1.amazonaws.com/image/product_image/515faacf-2beb-4191-921f-cacaf1c1db2c.png'),
('1976b144-c5fa-11f0-aef2-c625bac01c5a','Skyline Stage Builders','12345678','台北市信義區市府路 1 號','台北市信義區市府路 1 號',NULL,NULL,NULL,NULL,'TW',NULL,NULL,'general_contractor',NULL,'2025-11-20 10:17:20','2025-11-20 10:17:20','陳建宏','+886-912-345-678','builder@skyline.com','active',NULL,NULL,NULL),
('1976b642-c5fa-11f0-aef2-c625bac01c5a','PowerGrid Engineering','87654321','新北市板橋區文化路 100 號','新北市板橋區文化路 100 號',NULL,NULL,NULL,NULL,'TW',NULL,NULL,'general_contractor',NULL,'2025-11-20 10:17:20','2025-11-20 10:17:20','林雅婷','+886-987-654-321','contact@powergrid.com','active',NULL,NULL,NULL),
('2491d5e9-6df2-488c-b0d2-f766beaed036','Brian','12345672','https://developers.ecpay.com.tw/?p=2856','https://developers.ecpay.com.tw/?p=2856','Brian','Brian','https://developers.ecpay.com.tw/?p=2856',NULL,'taiwan',NULL,NULL,'organizer','2025-12-09 11:07:31','2025-12-05 17:58:57','2025-12-09 11:07:30',NULL,NULL,NULL,'active',NULL,NULL,NULL),
('2493df05-47d4-4086-9bf6-c7e4765c0646','賽爾特工作室','91433940','新北市三重區過圳街42號1樓','新北市三重區過圳街42號1樓','賽爾特工作室','[長描述省略]','[Instagram URL]','karta0789086','TW',NULL,NULL,'vendor',NULL,'2025-12-06 18:31:29','2025-12-12 15:54:13',NULL,NULL,NULL,'active',NULL,NULL,'https://scontent.ftpe14-1.fna.fbcdn.net/...'),
-- ... 其餘 12 筆省略
('ba814d34-b073-450d-8d7f-728ee458cdde','昱拓科技有限公司','60583222','臺北市中正區忠孝西路1段39號7樓',NULL,'昱拓科技','我們是包山包海的接案公司',NULL,NULL,'TW','林昱學',NULL,'vendor',NULL,'2025-11-21 16:36:48','2025-12-19 16:29:35',NULL,NULL,NULL,'active',NULL,NULL,NULL),
('f366b95c-e581-4318-a70d-01e49f39fda4','新公司輝搭','98545621','領航南路四段','成家大璽35號6樓-1','灰搭','','','',NULL,'吳思筠',NULL,'vendor',NULL,'2025-12-16 10:00:17','2025-12-16 10:00:17','0956131785','0977854621','Chris@gmail.com','pending',NULL,NULL,'');
```

### 有 brand_logo_url 的 4 筆資料
1. `0b1f30e0-9df1-4e04-a215-83777e466856` (good)
2. `2493df05-47d4-4086-9bf6-c7e4765c0646` (賽爾特工作室)
3. `30824419-306d-42e3-9672-029d1625cb8d` (真的公司)
4. `3469eb62-b495-4cce-b6f1-405c917afee6` (Tecxmate.com)
5. `4e586969-971b-4492-9796-ed5929fcb80d` (Hello World)
