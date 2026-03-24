-- 新增 default_approve_refund 欄位
-- event 和 company 各加一個，預設為 true（自動審核通過）
-- 2026-03-23

-- === event 表 ===
ALTER TABLE `event`
ADD COLUMN `default_approve_refund` tinyint(1) NOT NULL DEFAULT 1 COMMENT '退款是否預設自動審核通過'
AFTER `require_vendor_review`;

-- === company 表 ===
ALTER TABLE `company`
ADD COLUMN `default_approve_refund` tinyint(1) NOT NULL DEFAULT 1 COMMENT '退款是否預設自動審核通過'
AFTER `status_comment`;
