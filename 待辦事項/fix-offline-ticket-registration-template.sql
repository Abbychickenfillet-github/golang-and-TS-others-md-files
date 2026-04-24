-- ============================================================
-- 修復：線下票券券種缺少 registration_template_id 導致核銷彈窗不出現
-- 目標庫：future_sign_prod
-- 日期：2026-04-10
-- ============================================================

-- ============================================================
-- STEP 0：診斷 — 先查目前狀態
-- ============================================================

-- 0-1. 查所有線下票券券種，看哪些沒綁登記表模板
SELECT
  otct.id AS coupon_type_id,
  otct.name AS coupon_type_name,
  otct.template_id,
  otct.registration_template_id,
  ott.event_id,
  ott.name AS template_name
FROM offline_ticket_coupon_type otct
JOIN offline_ticket_template ott ON ott.id = otct.template_id
WHERE otct.deleted_at IS NULL
  AND ott.deleted_at IS NULL
ORDER BY ott.event_id, otct.name;

-- 0-2. 查已有的登記表模板
SELECT
  id AS template_id,
  event_id,
  organizer_member_id,
  name,
  fields
FROM registration_form_template
WHERE deleted_at IS NULL
ORDER BY event_id;

-- 0-3. 查活動對應的主辦方（建模板需要 organizer_member_id）
SELECT DISTINCT
  ott.event_id,
  e.organizer_member_id
FROM offline_ticket_template ott
JOIN event e ON e.id = ott.event_id
WHERE ott.deleted_at IS NULL
  AND e.deleted_at IS NULL;

-- ============================================================
-- STEP 1：為還沒有登記表模板的活動建立模板
-- ============================================================
-- ⚠️ 請先跑 STEP 0 確認 event_id 和 organizer_member_id
-- ⚠️ 下面的 UUID、event_id、organizer_member_id 請替換成實際值

-- 範例：為某活動建立登記表模板
-- INSERT INTO registration_form_template (id, event_id, organizer_member_id, name, fields)
-- VALUES (
--   UUID(),                           -- 自動產生 ID
--   '替換成_EVENT_ID',                -- 從 STEP 0-3 取得
--   '替換成_ORGANIZER_MEMBER_ID',     -- 從 STEP 0-3 取得
--   '夜市券核銷登記表',
--   JSON_ARRAY(
--     JSON_OBJECT('key', 'name',  'label', '姓名', 'type', 'text', 'required', true),
--     JSON_OBJECT('key', 'phone', 'label', '電話', 'type', 'tel',  'required', true)
--   )
-- );

-- ============================================================
-- STEP 2：把登記表模板綁到券種上
-- ============================================================
-- ⚠️ 請先跑 STEP 0-1 和 STEP 0-2 確認要綁哪個模板

-- 方案 A：整批更新 — 同一活動的所有券種都綁同一個模板
-- UPDATE offline_ticket_coupon_type otct
-- JOIN offline_ticket_template ott ON ott.id = otct.template_id
-- SET otct.registration_template_id = '替換成_REGISTRATION_TEMPLATE_ID'
-- WHERE ott.event_id = '替換成_EVENT_ID'
--   AND otct.registration_template_id IS NULL
--   AND otct.deleted_at IS NULL;

-- 方案 B：只更新特定券種
-- UPDATE offline_ticket_coupon_type
-- SET registration_template_id = '替換成_REGISTRATION_TEMPLATE_ID'
-- WHERE id = '替換成_COUPON_TYPE_ID'
--   AND registration_template_id IS NULL
--   AND deleted_at IS NULL;

-- ============================================================
-- STEP 3：驗證修復結果
-- ============================================================

-- 再查一次，確認所有券種都有 registration_template_id
SELECT
  otct.id AS coupon_type_id,
  otct.name AS coupon_type_name,
  otct.registration_template_id,
  rft.name AS reg_template_name,
  ott.event_id
FROM offline_ticket_coupon_type otct
JOIN offline_ticket_template ott ON ott.id = otct.template_id
LEFT JOIN registration_form_template rft ON rft.id = otct.registration_template_id
WHERE otct.deleted_at IS NULL
  AND ott.deleted_at IS NULL
ORDER BY ott.event_id, otct.name;
