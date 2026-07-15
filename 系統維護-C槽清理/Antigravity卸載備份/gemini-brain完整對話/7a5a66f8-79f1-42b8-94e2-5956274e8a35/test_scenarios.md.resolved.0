# Coupon System Test Scenarios

Based on the settings (Target Role, Trigger Type, Claim Method), here are the key permutations that require different UI flows or logic.

## Summary of Screens Required
1. **Admin/Staff App**: Manual Issue Interface (for Consumers and Vendors).
2. **Consumer Web/App**: Event Page (Self-claim), My Coupons (View).
3. **Vendor Portal**: Event Dashboard (Self-claim), My Coupons (View).
4. **On-site Kiosk/Tablet**: Phone Number Input (Self-claim).

## Test Matrix by User Flow

### 1. Staff/Admin Manual Issue
*Trigger: MANUAL*

| Test Case | Target Role | Screen / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **1-A** | Consumer | **Admin Panel > Issue Coupon**<br>Input Member Phone or Scan Member QR | Coupon added to Member's wallet. |
| **1-B** | Vendor | **Admin Panel > Issue Coupon**<br>Select Vendor from list (e.g. Booth #A01) | Coupon added to Vendor's account. |

### 2. Consumer Self-Claim (Online)
*Trigger: SELF_CLAIM | Claim Method: ONLINE or BOTH*

| Test Case | Conditions | Screen / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **2-A** | None (Free) | **Event Page**<br>Click "Claim Coupon" button | Success message, button changes to "Claimed". |
| **2-B** | Require Purchase | **Event Page**<br>Click "Claim Coupon" button | **If Ticket Purchased:** Success.<br>**If No Ticket:** Error/Alert "Please buy ticket first". |
| **2-C** | Require Check-in | **Event Page**<br>Click "Claim Coupon" button | **If Checked In:** Success.<br>**If Not:** Error/Alert "Must check-in first". |

### 3. Consumer Self-Claim (On-site / Kiosk)
*Trigger: SELF_CLAIM | Claim Method: ON_SITE or BOTH*

| Test Case | Conditions | Screen / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **3-A** | None | **Kiosk / Tablet**<br>Input Phone Number | System finds Member -> Issues Coupon -> Success Screen. |
| **3-B** | Require Purchase | **Kiosk / Tablet**<br>Input Phone Number | **If Ticket Purchased:** Success.<br>**If No Ticket:** Error "No valid ticket found". |

### 4. Vendor Self-Claim
*Trigger: SELF_CLAIM | Target Role: VENDOR*

| Test Case | Conditions | Screen / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **4-A** | None | **Vendor Portal**<br>Click "Claim" on Dashboard | Coupon added to Vendor account. |

### 5. Auto-Triggers (System Backend)
*Trigger: ON_PURCHASE / ON_CHECKIN* - *No specific "Claim" UI, but needs notification.*

| Test Case | Trigger | Screen / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **5-A** | On Purchase | **Checkout Page**<br>Complete Ticket Order | Order Success Page shows "You received a coupon!". |
| **5-B** | On Check-in | **Check-in Kiosk/Staff App**<br>Scan Ticket QR | Check-in Success Screen shows "Coupon Issued". |

## Edge Cases to Test
- **Quantity Limit**: Try to claim when `MaxQuantity` is reached (Should show "Out of Stock").
- **Claim Period**: Try to claim before/after the allowed period (Should show "Not available yet" or "Expired").
- **Duplicate Claim**: Try to claim the same coupon twice (Should show "Already claimed").
