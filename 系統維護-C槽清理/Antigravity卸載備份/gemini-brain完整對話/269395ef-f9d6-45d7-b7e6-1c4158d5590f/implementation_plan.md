# Refactor Order Model (Table Splitting)

## Goal Description
To optimize the database schema and keep the `order` table lightweight (under 20 columns), we will split the potentially large `order` table into logical components: Core Order, Invoice, Check-in, and Audit Log. This improves performance and maintainability.

## User Review Required
> [!IMPORTANT]
> This is a **BREAKING CHANGE** to the database schema.
> 1.  You must migrate existing data from the `order` table to the new tables (`order_invoice`, `order_check_in`) before dropping the old columns.
> 2.  The application logic in `order_service.py` and other services must be updated to read/write from the new tables.

## Proposed Changes

### Backend Models

#### [MODIFY] [order.py](file:///c:/coding/template/backend/app/models/order.py)
- **Remove** fields related to:
    - Invoices: `invoice_number`, `invoice_status`, `invoice_issued_at`, `ecpay_...`
    - Check-in details: `frontend_check_in_at`, `frontend_check_in_by_company_employee_id`, `frontend_check_in_by_member_id`, `backend_check_in_at`, `backend_check_in_by_user_id`, `backend_check_in_by_company_employee_id` (IMMEDIATELY DELETED from DB)
    - Audit/Cancellation: `edited_by`, `cancelled_by`, `refund_reason` etc.
- **Keep** only core fields (~15 columns):
    - `id`, `order_number`, `order_type`, `event_id`, `buyer_id`, `buyer_company_id`, `seller_company_id`
    - `total_amount`, `currency`
    - `payment_status`, `status`
    - `created_at`, `updated_at`, `deleted_at`
- **Add** relationships to new models.

#### [NEW] [order_invoice.py](file:///c:/coding/template/backend/app/models/order_invoice.py)
- Model `OrderInvoice` (approx 18 cols):
    - `id`, `order_id`
    - Moves from Order: `invoice_number`, `invoice_status`, `invoice_issued_at`...
    - Logs: `ecpay_request_log`, `ecpay_response_log`
    - **New**: `invoice_type` (mapped from tax_id logic), `carrier_type`, `carrier_num`, `donation`, `love_code`, `print_mark`
    - **Snapshots**: `customer_identifier`, `customer_name`, `customer_addr`...

#### [NEW] [order_check_in.py](file:///c:/coding/template/backend/app/models/order_check_in.py)
- **SKIPPED**: Check-in features are removed. No need to create this model.

#### [NEW] [order_log.py](file:///c:/coding/template/backend/app/models/order_log.py)
- Model `OrderLog` for auditing manual actions:
    - `operator_id` (User who performed action)
    - `action` (Enum: CANCEL, REFUND_REVIEW, EDIT)
    - `reason` (Required for cancel/refund)
    - `details` (JSON dump of changes)
    - *Note: CREATE and CHECK_IN are excluded as per feedback.*

#### [MODIFY] [refund_record.py](file:///c:/coding/template/backend/app/models/refund_record.py)
- **Add**: `ecpay_request_log` (JSON) and `ecpay_response_log` (JSON) for debug.

## Implementation Steps (Execution Order)

1.  **Create Models**:
    - Create `backend/app/models/order_invoice.py`
    - Create `backend/app/models/order_log.py`
2.  **Modify Models**:
    - Update `backend/app/models/order.py` (Drop Invoice/Log/Cancel columns, add Relationships)
    - Update `backend/app/models/refund_record.py` (Add ECPay logs)
3.  **Refactor CRUD & Service**:
    - Update/Create Services `backend/app/services/payment_service.py`, `order_service.py` types.
    - Ensure logical flow uses new tables.
4.  **Update API**:
    - Verify `backend/app/api/routes/payments.py` handles the new structure.

## Verification Plan

### Automated Tests
- None planned as no test DB active.

### Manual Verification
1.  **Code Review**: Verify models are correctly split and relationships are defined.
2.  **Schema Check**: Confirm `order` table definition has < 20 columns.
