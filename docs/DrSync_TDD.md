# Technical Design Document (TDD)
# DrSync - Healthcare Appointment Management System

**Version:** 1.0  
**Date:** August 2025  
**Author:** DrSync Technical Team  

## Table of Contents
1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Design](#4-database-design)
5. [API Architecture](#5-api-architecture)
6. [Security Architecture](#6-security-architecture)
7. [Integration Specifications](#7-integration-specifications)
8. [Deployment Strategy](#8-deployment-strategy)
9. [Performance Considerations](#9-performance-considerations)
10. [Monitoring and Logging](#10-monitoring-and-logging)

## 1. Introduction

### 1.1 Purpose
This Technical Design Document (TDD) provides detailed technical specifications for implementing DrSync, including system architecture, technology choices, database design, and deployment strategies.

### 1.2 Scope
This document covers:
- High-level system architecture
- Technology stack recommendations
- Database schema design
- API specifications
- Security implementations
- Integration patterns
- Deployment and infrastructure requirements

### 1.3 Assumptions
- Cloud-first deployment approach
- Microservices architecture pattern
- RESTful API design principles
- Modern web development practices

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   DrSync Core    │    │  Google Sheets  │
│   Business API  │◄──►│   Server         │◄──►│   API           │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web/Mobile    │    │   Authentication │    │   Notification  │
│   Dashboard     │◄──►│   Service        │    │   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2.2 Microservices Architecture

#### 2.2.1 Core Services
1. **WhatsApp Gateway Service**
   - Handles WhatsApp message processing
   - Language detection and routing
   - Message queue management

2. **Appointment Management Service**
   - Core scheduling logic
   - Availability checking
   - Conflict resolution

3. **Patient Management Service**
   - Patient data operations
   - Registration workflows
   - Profile management

4. **Notification Service**
   - Automated reminders
   - Follow-up messages
   - Template management

5. **Analytics Service**
   - Report generation
   - Data aggregation
   - Performance metrics

6. **Integration Service**
   - Google Sheets synchronization
   - External API management
   - Data transformation

#### 2.2.2 Infrastructure Services
1. **API Gateway**
   - Request routing
   - Rate limiting
   - Authentication/Authorization

2. **Authentication Service**
   - User authentication
   - JWT token management
   - Multi-factor authentication

3. **Configuration Service**
   - Environment configuration
   - Feature flags
   - Client settings

### 2.3 Data Flow Architecture

```
Patient (WhatsApp) 
    ↓
WhatsApp Business API
    ↓
API Gateway
    ↓
WhatsApp Gateway Service
    ↓
Appointment Management Service
    ↓
Integration Service
    ↓
Google Sheets API
    ↓
Client's Google Sheets
```

## 3. Technology Stack

### 3.1 Backend Technologies

#### 3.1.1 Primary Stack
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js with TypeScript
- **Language**: TypeScript 5.0+
- **Process Manager**: PM2

#### 3.1.2 Alternative Stack Options
- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **Language**: Python with type hints

### 3.2 Database Technologies

#### 3.2.1 Primary Database
- **RDBMS**: PostgreSQL 15+
- **ORM**: Prisma (Node.js) / SQLAlchemy (Python)
- **Connection Pool**: PgBouncer

#### 3.2.2 Caching Layer
- **Cache**: Redis 7.0+
- **Use Cases**: Session storage, API caching, rate limiting

#### 3.2.3 Message Queue
- **Queue**: Redis with Bull Queue (Node.js) / Celery (Python)
- **Use Cases**: WhatsApp message processing, scheduled tasks

### 3.3 Frontend Technologies

#### 3.3.1 Web Dashboard
- **Framework**: React 18+ with TypeScript
- **UI Library**: Tailwind CSS + Headless UI
- **State Management**: Zustand / Redux Toolkit
- **Build Tool**: Vite
- **PWA**: Workbox for service workers

#### 3.3.2 Mobile Considerations
- **Responsive Design**: Mobile-first approach
- **Offline Support**: Service worker caching
- **Touch Optimization**: Touch-friendly interfaces

### 3.4 DevOps and Infrastructure

#### 3.4.1 Containerization
- **Container Runtime**: Docker
- **Orchestration**: Docker Compose (dev) / Kubernetes (prod)
- **Registry**: Docker Hub / AWS ECR

#### 3.4.2 Cloud Services
- **Primary Cloud**: AWS
- **Compute**: ECS Fargate / EKS
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Storage**: S3
- **CDN**: CloudFront
- **Load Balancer**: Application Load Balancer

#### 3.4.3 Monitoring and Logging
- **APM**: New Relic / DataDog
- **Logging**: Winston (Node.js) → CloudWatch
- **Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry

#### 3.4.4 CI/CD Pipeline
- **Version Control**: Git (GitHub/GitLab)
- **CI/CD**: GitHub Actions / GitLab CI
- **Testing**: Jest, Cypress (E2E)
- **Code Quality**: SonarQube, ESLint, Prettier

## 4. Database Design

### 4.1 System Metadata Database (PostgreSQL)

#### 4.1.1 Core Tables

```sql
-- Healthcare Organizations/Clients
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    whatsapp_business_id VARCHAR(255),
    google_sheet_id VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Healthcare Providers (Doctors)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    schedule JSONB, -- Working hours, days off
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- System Users (Dashboard Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, staff, doctor
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    last_login TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp Message Log
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL, -- inbound, outbound
    content TEXT,
    message_id VARCHAR(255),
    status VARCHAR(20), -- sent, delivered, read, failed
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Configuration
CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.1.2 Indexes

```sql
-- Performance indexes
CREATE INDEX idx_organizations_phone ON organizations(phone_number);
CREATE INDEX idx_providers_org ON providers(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_whatsapp_messages_org_time ON whatsapp_messages(organization_id, created_at);
CREATE INDEX idx_audit_logs_org_time ON audit_logs(organization_id, created_at);
```

### 4.2 Google Sheets Schema (Client Data)

#### 4.2.1 Patients Sheet
| Column | Type | Description |
|--------|------|-------------|
| patient_id | String | Unique patient identifier |
| name | String | Patient full name |
| phone | String | WhatsApp phone number |
| email | String | Email address (optional) |
| date_of_birth | Date | Patient DOB |
| gender | String | Patient gender |
| address | String | Patient address |
| emergency_contact | String | Emergency contact info |
| medical_conditions | String | Known conditions |
| allergies | String | Known allergies |
| preferred_language | String | English/Urdu |
| created_at | DateTime | Registration timestamp |
| updated_at | DateTime | Last update timestamp |

#### 4.2.2 Appointments Sheet
| Column | Type | Description |
|--------|------|-------------|
| appointment_id | String | Unique appointment ID |
| patient_id | String | Reference to patient |
| provider_id | String | Doctor/provider ID |
| appointment_date | Date | Appointment date |
| appointment_time | Time | Appointment time |
| duration | Number | Appointment duration (minutes) |
| type | String | Consultation type |
| status | String | booked/confirmed/completed/cancelled |
| notes | String | Appointment notes |
| symptoms | String | Reported symptoms |
| diagnosis | String | Doctor's diagnosis |
| treatment | String | Prescribed treatment |
| follow_up_date | Date | Next follow-up date |
| created_at | DateTime | Booking timestamp |
| updated_at | DateTime | Last update timestamp |

#### 4.2.3 Providers Sheet
| Column | Type | Description |
|--------|------|-------------|
| provider_id | String | Unique provider ID |
| name | String | Doctor/provider name |
| specialty | String | Medical specialty |
| qualifications | String | Medical qualifications |
| experience_years | Number | Years of experience |
| consultation_fee | Number | Consultation fee |
| available_days | String | Working days |
| available_hours | String | Working hours |
| appointment_duration | Number | Default appointment duration |
| max_patients_per_day | Number | Daily patient limit |
| status | String | active/inactive |

## 5. API Architecture

### 5.1 RESTful API Design

#### 5.1.1 Base URL Structure
```
Production: https://api.drsync.health/v1
Staging: https://api-staging.drsync.health/v1
```

#### 5.1.2 Authentication
- **Method**: JWT Bearer Tokens
- **Refresh**: Automatic token refresh
- **MFA**: TOTP-based multi-factor authentication

#### 5.1.3 Core API Endpoints

##### Patient Management APIs
```
GET    /patients                  # List patients with pagination
POST   /patients                  # Create new patient
GET    /patients/{id}            # Get patient details
PUT    /patients/{id}            # Update patient
DELETE /patients/{id}            # Soft delete patient
GET    /patients/search          # Search patients by name/phone
```

##### Appointment Management APIs
```
GET    /appointments             # List appointments with filters
POST   /appointments             # Create new appointment
GET    /appointments/{id}        # Get appointment details
PUT    /appointments/{id}        # Update appointment
DELETE /appointments/{id}        # Cancel appointment
GET    /appointments/availability # Check provider availability
POST   /appointments/{id}/confirm # Confirm appointment
POST   /appointments/{id}/complete # Mark appointment as completed
```

##### Provider Management APIs
```
GET    /providers                # List healthcare providers
POST   /providers                # Add new provider
GET    /providers/{id}           # Get provider details
PUT    /providers/{id}           # Update provider
GET    /providers/{id}/schedule  # Get provider schedule
PUT    /providers/{id}/schedule  # Update provider schedule
GET    /providers/{id}/availability # Check real-time availability
```

##### WhatsApp Integration APIs
```
POST   /whatsapp/webhook         # WhatsApp webhook endpoint
POST   /whatsapp/send            # Send WhatsApp message
GET    /whatsapp/messages        # Get message history
POST   /whatsapp/templates       # Create message templates
GET    /whatsapp/templates       # List message templates
```

##### Analytics APIs
```
GET    /analytics/dashboard      # Get dashboard metrics
GET    /analytics/appointments   # Appointment analytics
GET    /analytics/patients       # Patient analytics
GET    /analytics/revenue        # Revenue analytics
GET    /analytics/reports        # Generate custom reports
```

### 5.2 GraphQL API (Future Enhancement)
- **Schema**: Unified data access layer
- **Resolver**: Efficient data fetching
- **Subscriptions**: Real-time updates

### 5.3 WebSocket APIs
- **Real-time notifications**
- **Live appointment updates**
- **Dashboard synchronization**

## 6. Security Architecture

### 6.1 Authentication & Authorization

#### 6.1.1 Multi-Factor Authentication (MFA)
- **Primary**: TOTP (Google Authenticator, Authy)
- **Backup**: SMS/Email verification
- **Recovery**: Recovery codes

#### 6.1.2 Role-Based Access Control (RBAC)
- **Roles**: System Admin, Organization Admin, Doctor, Staff
- **Permissions**: Fine-grained permission system
- **Scope**: Organization-level data isolation

#### 6.1.3 JWT Token Management
```javascript
{
  "iss": "drsync.health",
  "sub": "user_id",
  "org": "organization_id",
  "role": "admin|doctor|staff",
  "permissions": ["read:patients", "write:appointments"],
  "exp": 1234567890,
  "iat": 1234567890
}
```

### 6.2 Data Protection

#### 6.2.1 Encryption
- **At Rest**: AES-256 encryption for sensitive data
- **In Transit**: TLS 1.3 for all communications
- **Database**: Transparent Data Encryption (TDE)

#### 6.2.2 Data Privacy
- **PII Handling**: Minimal data collection principle
- **Data Retention**: Configurable retention policies
- **Right to Deletion**: GDPR compliance features

#### 6.2.3 HIPAA Compliance
- **BAA**: Business Associate Agreements
- **Audit Logs**: Comprehensive activity logging
- **Access Controls**: Role-based permissions
- **Data Backup**: Encrypted backup procedures

### 6.3 Infrastructure Security

#### 6.3.1 Network Security
- **VPC**: Private cloud networking
- **WAF**: Web Application Firewall
- **DDoS**: Protection mechanisms
- **IP Whitelisting**: API access restrictions

#### 6.3.2 Container Security
- **Image Scanning**: Vulnerability scanning
- **Runtime Security**: Container monitoring
- **Secrets Management**: Encrypted secrets storage

## 7. Integration Specifications

### 7.1 WhatsApp Business API Integration

#### 7.1.1 Webhook Configuration
```javascript
{
  "webhook_url": "https://api.drsync.health/v1/whatsapp/webhook",
  "verify_token": "secure_verify_token",
  "events": [
    "messages",
    "message_deliveries",
    "message_reads"
  ]
}
```

#### 7.1.2 Message Processing Flow
1. **Receive Webhook** → Validate signature
2. **Parse Message** → Extract content and metadata
3. **Language Detection** → Determine user language
4. **Intent Recognition** → Understand user intent
5. **Business Logic** → Process appointment operations
6. **Response Generation** → Create appropriate response
7. **Send Message** → Deliver via WhatsApp API

### 7.2 Google Sheets API Integration

#### 7.2.1 Authentication
- **OAuth 2.0**: Service account credentials
- **Scopes**: `https://www.googleapis.com/auth/spreadsheets`
- **Rate Limiting**: 100 requests per 100 seconds per user

#### 7.2.2 Data Synchronization
```javascript
// Batch update operations
const batchUpdateRequest = {
  "spreadsheetId": "client_sheet_id",
  "requests": [
    {
      "updateCells": {
        "rows": [/* appointment data */],
        "fields": "*",
        "start": {"sheetId": 0, "rowIndex": 1, "columnIndex": 0}
      }
    }
  ]
};
```

#### 7.2.3 Real-time Sync Strategy
- **Polling**: Every 30 seconds for appointment updates
- **Webhooks**: Google Apps Script triggers (future)
- **Conflict Resolution**: Last-write-wins with user notification

### 7.3 SMS Gateway Integration

#### 7.3.1 Backup Communication
- **Provider**: Twilio / AWS SNS
- **Use Cases**: WhatsApp unavailable scenarios
- **Template**: SMS-formatted appointment reminders

### 7.4 Email Service Integration

#### 7.4.1 Transactional Emails
- **Provider**: SendGrid / AWS SES
- **Templates**: Welcome, password reset, reports
- **Tracking**: Open rates, click tracking

## 8. Deployment Strategy

### 8.1 Environment Strategy

#### 8.1.1 Environment Tiers
1. **Development**: Local development environment
2. **Staging**: Pre-production testing environment
3. **Production**: Live production environment

#### 8.1.2 Configuration Management
- **Environment Variables**: Docker/Kubernetes secrets
- **Feature Flags**: LaunchDarkly / internal system
- **Database Migrations**: Automated migration scripts

### 8.2 Containerization Strategy

#### 8.2.1 Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

#### 8.2.2 Docker Compose (Development)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/drsync
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=drsync
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 8.3 Production Deployment

#### 8.3.1 AWS ECS Fargate
```json
{
  "family": "drsync-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "drsync-app",
      "image": "drsync/app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:drsync/database"
        }
      ]
    }
  ]
}
```

#### 8.3.2 Load Balancer Configuration
- **Type**: Application Load Balancer (ALB)
- **Health Check**: `/health` endpoint
- **SSL/TLS**: ACM certificate
- **Sticky Sessions**: For dashboard sessions

### 8.4 CI/CD Pipeline

#### 8.4.1 GitHub Actions Workflow
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t drsync/app:${{ github.sha }} .
      - name: Push to ECR
        # ECR push steps
      - name: Deploy to ECS
        # ECS deployment steps
```

## 9. Performance Considerations

### 9.1 Caching Strategy

#### 9.1.1 Redis Caching
- **Session Cache**: User sessions (TTL: 24 hours)
- **API Cache**: Frequently accessed data (TTL: 5 minutes)
- **Rate Limiting**: API rate limiting counters
- **Queue**: Background job processing

#### 9.1.2 CDN Strategy
- **Static Assets**: CloudFront distribution
- **Cache Policy**: Browser caching for static resources
- **Geographic Distribution**: Global edge locations

### 9.2 Database Optimization

#### 9.2.1 Query Optimization
- **Indexes**: Strategic index placement
- **Query Analysis**: Regular EXPLAIN ANALYZE
- **Connection Pooling**: PgBouncer configuration
- **Read Replicas**: Separate read/write operations

#### 9.2.2 Monitoring
- **Slow Query Log**: Identify performance issues
- **Connection Monitoring**: Pool utilization
- **Query Performance**: APM integration

### 9.3 Auto-scaling Configuration

#### 9.3.1 ECS Auto Scaling
```json
{
  "ServiceName": "drsync-app",
  "ScalableDimension": "ecs:service:DesiredCount",
  "MinCapacity": 2,
  "MaxCapacity": 10,
  "TargetTrackingScalingPolicies": [
    {
      "TargetValue": 70.0,
      "ScaleOutCooldown": 300,
      "ScaleInCooldown": 300,
      "MetricType": "ECSServiceAverageCPUUtilization"
    }
  ]
}
```

## 10. Monitoring and Logging

### 10.1 Application Performance Monitoring

#### 10.1.1 Key Metrics
- **Response Time**: API endpoint performance
- **Throughput**: Requests per second
- **Error Rate**: 4xx/5xx error percentage
- **Availability**: Service uptime percentage

#### 10.1.2 Custom Metrics
- **WhatsApp Message Volume**: Messages processed per hour
- **Appointment Bookings**: Successful bookings per day
- **Google Sheets Sync**: Synchronization success rate
- **User Engagement**: Dashboard active users

### 10.2 Logging Strategy

#### 10.2.1 Log Levels
- **ERROR**: Application errors, exceptions
- **WARN**: Warning conditions, deprecated features
- **INFO**: General application flow
- **DEBUG**: Detailed diagnostic information

#### 10.2.2 Structured Logging
```json
{
  "timestamp": "2025-08-23T13:30:00.000Z",
  "level": "INFO",
  "service": "appointment-service",
  "traceId": "abc123",
  "userId": "user_123",
  "orgId": "org_456",
  "message": "Appointment booked successfully",
  "data": {
    "appointmentId": "appt_789",
    "patientId": "patient_101",
    "providerId": "provider_202"
  }
}
```

### 10.3 Alerting

#### 10.3.1 Critical Alerts
- **Service Down**: 5xx error rate > 1%
- **High Latency**: Response time > 5 seconds
- **Database Issues**: Connection failures
- **WhatsApp API Failures**: Message delivery failures

#### 10.3.2 Alert Channels
- **Primary**: PagerDuty for critical issues
- **Secondary**: Slack for warnings
- **Email**: Summary reports and non-critical alerts

---

**Document Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Senior Developer | | | |
| DevOps Engineer | | | |
| Security Engineer | | | |

**Change History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 2025 | Technical Team | Initial version |
