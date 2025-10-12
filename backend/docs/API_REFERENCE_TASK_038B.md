# TASK-038B API Quick Reference
## Super Admin Billing & Subscription Management

**Base URL:** `/api/super-admin`  
**Authentication:** Bearer Token (JWT)  
**Required Role:** `SUPER_ADMIN`

---

## 📊 Billing Overview

### Get Billing Dashboard Overview
```http
GET /api/super-admin/billing/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mrr": 150000,
    "arr": 1800000,
    "totalRevenue": 2500000,
    "outstandingPayments": 25000,
    "failedPayments": 15000,
    "growth": {
      "mrrGrowth": 0,
      "revenueGrowth": 12.5
    },
    "revenueByPlan": {
      "FREE": 0,
      "BASIC": 45000,
      "PROFESSIONAL": 75000,
      "ENTERPRISE": 30000
    },
    "revenueByPaymentMethod": {
      "BANK_TRANSFER": 80000,
      "JAZZCASH": 40000,
      "EASYPAISA": 30000
    },
    "revenueByRegion": {
      "PAKISTAN": 140000,
      "INTERNATIONAL": 10000
    }
  }
}
```

---

## 💳 Payment Transactions

### List Transactions
```http
GET /api/super-admin/billing/transactions?status=SUCCESS,FAILED&page=1&limit=20
```

**Query Parameters:**
- `status` - Comma-separated (SUCCESS, FAILED, PENDING, CANCELLED)
- `paymentMethod` - Comma-separated (BANK_TRANSFER, JAZZCASH, etc.)
- `organizationId` - Filter by organization
- `dateFrom` - ISO 8601 date
- `dateTo` - ISO 8601 date
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pi_123456",
      "amount": 2997,
      "currency": "PKR",
      "status": "SUCCESS",
      "paymentMethod": "BANK_TRANSFER",
      "createdAt": "2024-12-01T10:00:00.000Z",
      "organization": {
        "id": "org_123",
        "name": "ABC Clinic",
        "email": "admin@abcclinic.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasMore": true
  }
}
```

### Get Payment Status Breakdown
```http
GET /api/super-admin/billing/payment-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "SUCCESS": { "count": 1250, "amount": 2500000 },
    "FAILED": { "count": 45, "amount": 85000 },
    "PENDING": { "count": 23, "amount": 50000 },
    "CANCELLED": { "count": 12, "amount": 25000 }
  }
}
```

### Retry Failed Payment
```http
POST /api/super-admin/billing/transactions/:id/retry
```

**Response:**
```json
{
  "success": true,
  "message": "Payment queued for retry",
  "data": {
    "id": "pi_123456",
    "status": "PENDING",
    "retryCount": 2,
    "nextRetryAt": "2024-12-15T15:00:00.000Z"
  }
}
```

### Process Refund
```http
POST /api/super-admin/billing/transactions/:id/refund
Content-Type: application/json

{
  "amount": 2997,
  "reason": "Customer requested refund"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "id": "pi_123456",
    "status": "CANCELLED",
    "failureReason": "REFUNDED: Customer requested refund"
  }
}
```

---

## 🔄 Subscription Management

### Get Subscription Lifecycle Overview
```http
GET /api/super-admin/subscriptions/lifecycle
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statusBreakdown": {
      "ACTIVE": 145,
      "TRIAL": 67,
      "SUSPENDED": 12,
      "CANCELLED": 34,
      "PAST_DUE": 8
    },
    "planBreakdown": {
      "FREE": 23,
      "BASIC": 56,
      "PROFESSIONAL": 45,
      "ENTERPRISE": 21
    },
    "metrics": {
      "churnRate": "4.50%",
      "retentionRate": "95.50%",
      "activeSubscriptions": 145,
      "trialSubscriptions": 67,
      "suspendedSubscriptions": 12,
      "cancelledSubscriptions": 34,
      "pastDueSubscriptions": 8
    }
  }
}
```

### Update Subscription Plan
```http
PUT /api/super-admin/subscriptions/:organizationId
Content-Type: application/json

{
  "subscriptionPlan": "PROFESSIONAL",
  "reason": "Customer requested upgrade"
}
```

**Valid Plans:** `FREE`, `BASIC`, `PROFESSIONAL`, `ENTERPRISE`

**Response:**
```json
{
  "success": true,
  "message": "Subscription updated successfully",
  "data": {
    "id": "org_123",
    "name": "ABC Clinic",
    "subscriptionPlan": "PROFESSIONAL",
    "updatedAt": "2024-12-15T10:00:00.000Z"
  }
}
```

### Suspend Subscription
```http
POST /api/super-admin/subscriptions/:organizationId/suspend
Content-Type: application/json

{
  "reason": "Non-payment for 30 days"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription suspended successfully",
  "data": {
    "id": "org_123",
    "subscriptionStatus": "SUSPENDED",
    "isActive": false
  }
}
```

### Reactivate Subscription
```http
POST /api/super-admin/subscriptions/:organizationId/reactivate
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated successfully",
  "data": {
    "id": "org_123",
    "subscriptionStatus": "ACTIVE",
    "isActive": true
  }
}
```

---

## 🧪 Trial Management

### Get Trial Overview
```http
GET /api/super-admin/trials/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeTrials": 67,
    "conversionRate": 42.5,
    "averageDaysToConvert": 14,
    "expiringToday": 3,
    "expiringSoon": 12,
    "expired": 5,
    "totalTrialsStarted": 158,
    "totalConverted": 67
  }
}
```

### Detect Trial Abuse
```http
GET /api/super-admin/trials/abuse-detection
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suspiciousOrganizations": [
      {
        "organizationId": "org_456",
        "organizationName": "Test Clinic",
        "phoneNumber": "+923001234567",
        "email": "test@clinic.com",
        "riskScore": 75,
        "reasons": [
          "3 trials with phone +923001234567",
          "Email test@clinic.com used in multiple trials",
          "Phone not verified"
        ],
        "registeredAt": "2024-12-01T10:00:00.000Z"
      }
    ],
    "totalFlagged": 12,
    "abuseStats": {
      "duplicatePhones": 8,
      "duplicateEmails": 15,
      "multipleTrials": 12
    }
  }
}
```

### Monitor Trial Usage
```http
GET /api/super-admin/trials/usage
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "organizationId": "org_789",
      "organizationName": "XYZ Clinic",
      "maxPatients": 25,
      "currentPatients": 24,
      "maxAppointments": 50,
      "currentAppointments": 48,
      "patientsUsagePercent": 96,
      "appointmentsUsagePercent": 96,
      "isNearLimit": true,
      "isOverLimit": false
    },
    {
      "organizationId": "org_790",
      "organizationName": "ABC Hospital",
      "maxPatients": 25,
      "currentPatients": 27,
      "maxAppointments": 50,
      "currentAppointments": 55,
      "patientsUsagePercent": 108,
      "appointmentsUsagePercent": 110,
      "isNearLimit": false,
      "isOverLimit": true
    }
  ],
  "count": 2
}
```

### Extend Trial Period
```http
POST /api/super-admin/trials/:organizationId/extend
Content-Type: application/json

{
  "extensionDays": 7,
  "reason": "Customer requested extension for evaluation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Trial extended by 7 days",
  "data": {
    "id": "org_789",
    "subscriptionEndsAt": "2024-12-22T23:59:59.000Z",
    "updatedAt": "2024-12-15T10:00:00.000Z"
  }
}
```

### Get Trial Conversions
```http
GET /api/super-admin/trials/conversions?days=30
```

**Query Parameters:**
- `days` - Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Last 30 days",
    "trialsStarted": 45,
    "converted": 19,
    "stillInTrial": 18,
    "cancelled": 8,
    "conversionRate": 42.22,
    "metrics": {
      "conversionRate": "42.22%",
      "cancelRate": "17.78%",
      "activeTrialRate": "40.00%"
    }
  }
}
```

### Get Trial End Actions
```http
GET /api/super-admin/trials/ending-actions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "expiringToday": {
      "count": 3,
      "organizations": [
        {
          "id": "org_101",
          "name": "Test Clinic 1",
          "email": "test1@clinic.com",
          "subscriptionEndsAt": "2024-12-15T23:59:59.000Z"
        }
      ]
    },
    "recentlyExpired": {
      "count": 5,
      "organizations": [
        {
          "id": "org_102",
          "name": "Test Clinic 2",
          "email": "test2@clinic.com",
          "subscriptionEndsAt": "2024-12-10T23:59:59.000Z",
          "subscriptionStatus": "PAST_DUE"
        }
      ]
    },
    "recommendedActions": {
      "expiringToday": "Send conversion offer emails",
      "recentlyExpired": "Send win-back campaign or downgrade to FREE plan"
    }
  }
}
```

---

## 🔒 Authorization

All endpoints require:
1. **Authentication:** Valid JWT token in `Authorization: Bearer <token>` header
2. **Role:** User must have `SUPER_ADMIN` role

### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Super admin access required"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Organization ID is required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Organization not found",
  "message": "No organization found with ID: org_123"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to get billing overview",
  "message": "Database connection error"
}
```

---

## 📝 Notes

1. **Pagination:** All list endpoints support pagination with `page` and `limit` query parameters
2. **Filtering:** Transaction and organization endpoints support multiple filter combinations
3. **Date Format:** All dates use ISO 8601 format (e.g., `2024-12-15T10:00:00.000Z`)
4. **Currency:** Automatically determined by organization region (PKR for Pakistan, USD for international)
5. **Trial Limits:** Default limits are 25 patients and 50 appointments per 14-day trial
6. **Retry Limits:** Failed payments can be retried up to maximum retry count
7. **Refunds:** Only successful payments can be refunded

---

## 🧪 Testing with curl

### Example: Get Billing Overview
```bash
curl -X GET \
  http://localhost:5000/api/super-admin/billing/overview \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

### Example: Extend Trial
```bash
curl -X POST \
  http://localhost:5000/api/super-admin/trials/org_123/extend \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "extensionDays": 7,
    "reason": "Customer evaluation"
  }'
```

### Example: Process Refund
```bash
curl -X POST \
  http://localhost:5000/api/super-admin/billing/transactions/pi_123/refund \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 2997,
    "reason": "Customer dissatisfaction"
  }'
```

---

**Last Updated:** December 2024  
**API Version:** 1.0
