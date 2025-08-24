# API Documentation
# DrSync - Healthcare Appointment Management System

**Version:** 1.0  
**Date:** August 2025  
**Author:** DrSync Development Team  

## Table of Contents
1. [Introduction](#1-introduction)
2. [Authentication](#2-authentication)
3. [API Overview](#3-api-overview)
4. [Patient Management APIs](#4-patient-management-apis)
5. [Appointment Management APIs](#5-appointment-management-apis)
6. [Provider Management APIs](#6-provider-management-apis)
7. [WhatsApp Integration APIs](#7-whatsapp-integration-apis)
8. [Analytics APIs](#8-analytics-apis)
9. [External Integrations](#9-external-integrations)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)

## 1. Introduction

### 1.1 Purpose
This document provides comprehensive API documentation for DrSync Healthcare Appointment Management System, including REST API endpoints, WebSocket connections, and external service integrations.

### 1.2 API Base URLs
```
Production:  https://api.drsync.health/v1
Staging:     https://api-staging.drsync.health/v1
Development: http://localhost:3000/api/v1
```

### 1.3 Content Type
All requests and responses use `application/json` content type unless otherwise specified.

## 2. Authentication

### 2.1 JWT Authentication
```http
Authorization: Bearer <jwt_token>
```

### 2.2 Login Endpoint
```http
POST /auth/login
```

**Request:**
```json
{
  "email": "admin@clinic.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user-123",
      "email": "admin@clinic.com",
      "name": "Dr. John Smith",
      "role": "admin",
      "organizationId": "org-456"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400
    }
  }
}
```

## 3. API Overview

### 3.1 Standard Response Format
**Success Response:**
```json
{
  "status": "success",
  "data": { /* Response data */ },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Error Response:**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Valid email is required"
      }
    ]
  }
}
```

## 4. Patient Management APIs

### 4.1 List Patients
```http
GET /patients?page=1&limit=20&search=John
```

### 4.2 Create Patient
```http
POST /patients
```

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "dateOfBirth": "1985-06-15",
  "gender": "male",
  "preferredLanguage": "en"
}
```

## 5. Appointment Management APIs

### 5.1 List Appointments
```http
GET /appointments?date=2025-08-25&providerId=provider-123
```

### 5.2 Create Appointment
```http
POST /appointments
```

**Request:**
```json
{
  "patientId": "patient-456",
  "providerId": "provider-789",
  "date": "2025-08-25",
  "time": "14:00",
  "duration": 30,
  "type": "consultation"
}
```

### 5.3 Check Availability
```http
GET /appointments/availability?providerId=provider-123&date=2025-08-25
```

## 6. Provider Management APIs

### 6.1 List Providers
```http
GET /providers
```

### 6.2 Get Provider Schedule
```http
GET /providers/{id}/schedule?date=2025-08-25
```

## 7. WhatsApp Integration APIs

### 7.1 Webhook Endpoint
```http
POST /whatsapp/webhook
```

### 7.2 Send Message
```http
POST /whatsapp/send
```

**Request:**
```json
{
  "to": "+1234567890",
  "message": "Your appointment is confirmed for tomorrow at 2:00 PM"
}
```

## 8. Analytics APIs

### 8.1 Dashboard Metrics
```http
GET /analytics/dashboard?period=month
```

### 8.2 Appointment Analytics
```http
GET /analytics/appointments
```

## 9. External Integrations

### 9.1 Google Sheets Sync
```http
POST /integrations/google-sheets/sync
```

### 9.2 SMS Integration
```http
POST /integrations/sms/send
```

## 10. Error Handling

### 10.1 HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

### 10.2 Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTH_ERROR`: Authentication failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict

## 11. Rate Limiting

### 11.1 Rate Limits
- Authentication endpoints: 5 requests/minute
- General API endpoints: 100 requests/minute
- WhatsApp webhook: 1000 requests/minute

---

**Change History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 2025 | Development Team | Initial API documentation |
