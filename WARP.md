# DrSync Project Rules - WARP.md
**Version:** 2.0  
**Date:** January 2026  
**Project:** DrSync - Healthcare Appointment Management System  
**Status:** Production Ready - 95%+ Test Coverage

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Development Environment Rules](#2-development-environment-rules)
3. [Code Quality & Standards](#3-code-quality--standards)
4. [Architecture & Design Patterns](#4-architecture--design-patterns)
5. [API Development Rules](#5-api-development-rules)
6. [Frontend Development Rules](#6-frontend-development-rules)
7. [Database & Data Management](#7-database--data-management)
8. [Third-Party Integration Rules](#8-third-party-integration-rules)
9. [Security & Compliance Requirements](#9-security--compliance-requirements)
10. [Performance & Scalability](#10-performance--scalability)
11. [Testing Requirements](#11-testing-requirements)
12. [Documentation Standards](#12-documentation-standards)
13. [Deployment & CI/CD Rules](#13-deployment--cicd-rules)
14. [WhatsApp Integration Specific Rules](#14-whatsapp-integration-specific-rules)
15. [Healthcare Domain Rules](#15-healthcare-domain-rules)
16. [Real-Time Communication](#16-real-time-communication) 🆕
17. [Progressive Web Application](#17-progressive-web-application) 🆕
18. [Billing & Subscription Management](#18-billing--subscription-management) 🆕

---

## 1. Project Overview

### 1.1 Project Context
DrSync is a SaaS healthcare appointment management platform that bridges WhatsApp communication with healthcare provider dashboards, featuring Google Sheets integration for decentralized data management.

### 1.2 Technology Stack
- **Backend:** Node.js + TypeScript + Express.js
- **Frontend:** Next.js + React + TypeScript + Tailwind CSS
- **Database:** PostgreSQL (system metadata) + Google Sheets (client data)
- **Cache:** Redis
- **Integrations:** WhatsApp Business API, Google Sheets API
- **Container:** Docker + Docker Compose
- **Testing:** Jest + Cypress

### 1.3 Key Stakeholders
- **Patients:** WhatsApp users booking appointments
- **Healthcare Providers:** Doctors and medical staff
- **Administrative Staff:** Clinic management personnel
- **System Administrators:** DrSync platform managers

### 1.4 Production Environment
- **VPS Provider:** Contabo
- **VPS IP Address:** 62.146.239.128
- **Frontend URL:** http://62.146.239.128:3000
- **Backend API URL:** http://62.146.239.128:3001
- **Database:** PostgreSQL on VPS (Docker container)
- **Cache:** Redis on VPS (Docker container)
- **SSL Status:** ❌ Not configured (HTTP only)
- **Domain:** Not configured (using IP address)

**⚠️ Production Blockers:**
- WhatsApp webhooks require HTTPS (SSL certificate needed)
- Meta requires domain name for webhook registration
- Current HTTP-only setup will be rejected by WhatsApp Business API

---

## 2. Development Environment Rules

### 2.1 Required Software Versions
```typescript
// MUST use these exact versions for consistency
const REQUIRED_VERSIONS = {
  'node': '18.17.0+',
  'npm': '9.0.0+',
  'typescript': '5.0+',
  'postgresql': '15.0+',
  'redis': '7.0+',
  'docker': '24.0+',
  'docker-compose': '2.20+'
};
```

### 2.2 Environment Setup Rules
- **MUST** use VS Code with recommended extensions from `.vscode/extensions.json`
- **MUST** run `npm install` before any development work
- **MUST** use Docker containers for PostgreSQL and Redis in development
- **MUST** use Docker Compose for local development environment
- **MUST** copy `.env.example` to `.env.local` (frontend) or `.env` (backend)
- **MUST** never commit `.env` or `.env.local` files to version control
- **SHALL** run database migrations and seed data on fresh setup

### 2.2.1 Docker Development Environment ⚠️ CRITICAL
```bash
# Start all services with Docker Compose
docker-compose up -d

# Services included:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3000)
- Frontend Dashboard (port 3001)
```

**Important:** This project **MUST** use Docker for development. All databases, caching, and services run in Docker containers to ensure consistency across all development environments.

### 2.3 Package Manager Rules
- **MUST** use npm (not yarn or pnpm) for consistency
- **MUST** commit `package-lock.json` with all changes
- **SHALL** run `npm audit fix` regularly for security updates

---

## 3. Code Quality & Standards

### 3.1 TypeScript Configuration
- **MUST** use strict TypeScript configuration
- **MUST** provide explicit return types for all functions
- **MUST** avoid `any` type - use proper typing or `unknown`
- **SHOULD** use interface over type for object definitions

```typescript
// ✅ Good
interface PatientData {
  id: string;
  name: string;
  phone: string;
}

const getPatient = (id: string): Promise<PatientData | null> => {
  // implementation
};

// ❌ Bad
const getPatient = (id: any) => {
  // implementation
};
```

### 3.2 ESLint & Prettier Rules
- **MUST** follow ESLint configuration without overrides
- **MUST** format code with Prettier before commits
- **MUST** fix all ESLint errors before PR submission
- **SHOULD** address ESLint warnings when practical

### 3.3 Naming Conventions
```typescript
// Variables & Functions: camelCase
const appointmentDuration = 30;
const calculateAvailability = () => {};

// Constants: SCREAMING_SNAKE_CASE
const MAX_APPOINTMENTS_PER_DAY = 50;
const DEFAULT_LANGUAGE = 'en';

// Types & Interfaces: PascalCase
interface AppointmentData {}
type UserRole = 'admin' | 'doctor' | 'staff';

// Classes: PascalCase
class AppointmentService {}

// Files: kebab-case (except React components)
appointment-service.ts
patient-controller.ts
AppointmentCard.tsx (React components: PascalCase)
```

### 3.4 File Organization Rules
- **MUST** organize files by feature, not by file type
- **MUST** use absolute imports with `@/` prefix for src directory
- **MUST** keep files under 300 lines (except generated files)
- **SHOULD** extract large functions into separate utility files

---

## 4. Architecture & Design Patterns

### 4.1 Backend Architecture Patterns
- **MUST** use layered architecture: Controller → Service → Repository
- **MUST** implement dependency injection for services
- **MUST** use Repository pattern for data access
- **SHALL** implement proper error handling with AppError class

```typescript
// ✅ Correct layered architecture
class PatientController {
  constructor(private patientService: PatientService) {}
  
  async getPatients(req: Request, res: Response): Promise<void> {
    const patients = await this.patientService.getPatients(req.query);
    res.json({ status: 'success', data: patients });
  }
}

class PatientService {
  constructor(
    private patientRepository: PatientRepository,
    private googleSheetsService: GoogleSheetsService
  ) {}
  
  async getPatients(filters: any): Promise<Patient[]> {
    // Business logic here
    return await this.patientRepository.findMany(filters);
  }
}
```

### 4.2 Frontend Architecture Patterns
- **MUST** use functional components with hooks
- **MUST** implement custom hooks for data fetching
- **MUST** use component composition over inheritance
- **SHOULD** implement proper state management with Zustand

```typescript
// ✅ Custom hook pattern
export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchPatients = async () => {
    // Implementation
  };
  
  return { patients, loading, error, refetch: fetchPatients };
};
```

### 4.3 Error Handling Patterns
- **MUST** use centralized error handling middleware
- **MUST** throw AppError instances with proper status codes
- **MUST** log errors appropriately (debug in dev, structured in prod)
- **SHALL** provide meaningful error messages to users

### 4.3.1 Fallback Mechanisms
- **MUST** implement PostgreSQL fallback when Google Sheets unavailable
- **MUST** switch automatically to fallback within 3 seconds
- **MUST** notify admins when operating in fallback mode
- **SHALL** queue Google Sheets writes for later sync

### 4.3.2 Circuit Breaker Pattern
- **MUST** implement circuit breaker for Google Sheets API
- **MUST** open circuit after 5 consecutive failures
- **MUST** attempt half-open state after 60 seconds
- **SHALL** close circuit after 3 consecutive successes

---

## 5. API Development Rules

### 5.1 RESTful API Standards
- **MUST** follow RESTful conventions for endpoints
- **MUST** use proper HTTP status codes
- **MUST** implement consistent response format:

```typescript
// Standard success response
{
  "status": "success",
  "data": { /* actual data */ },
  "pagination"?: { /* if applicable */ }
}

// Standard error response
{
  "status": "error",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "details"?: { /* additional error details */ }
}
```

### 5.2 Authentication & Authorization
- **MUST** implement JWT-based authentication
- **MUST** use role-based access control (RBAC)
- **MUST** validate JWT tokens on all protected routes
- **SHALL** implement token refresh mechanism

### 5.3 Input Validation
- **MUST** validate all input data using validation schemas
- **MUST** sanitize user inputs to prevent injection attacks
- **MUST** validate phone numbers for WhatsApp compatibility
- **SHALL** provide specific validation error messages

### 5.4 API Versioning
- **MUST** version APIs using URL prefix (`/api/v1/`)
- **MUST** maintain backward compatibility for existing versions
- **SHOULD** deprecate old versions with proper notice

---

## 6. Frontend Development Rules

### 6.1 React Component Standards
- **MUST** use TypeScript for all components
- **MUST** define proper prop interfaces
- **MUST** use data-cy attributes for testing
- **SHOULD** keep components under 150 lines

```typescript
// ✅ Proper component structure
interface PatientCardProps {
  patient: Patient;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patientId: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  onEdit,
  onDelete
}) => {
  // Component implementation
  return (
    <div data-cy="patient-card">
      {/* JSX content */}
    </div>
  );
};
```

### 6.2 State Management Rules
- **MUST** use React hooks for local state
- **MUST** use Zustand for global state management
- **SHOULD** avoid prop drilling - use context or global state
- **SHALL** implement optimistic updates for better UX

### 6.3 Styling Standards
- **MUST** use Tailwind CSS for styling
- **MUST** use consistent spacing scale (4px, 8px, 16px, 24px, 32px)
- **SHOULD** create reusable component classes
- **SHALL** ensure mobile-first responsive design

### 6.4 Performance Optimization
- **MUST** implement React.memo for expensive components
- **MUST** use useMemo and useCallback appropriately
- **SHOULD** implement virtualization for large lists
- **SHALL** lazy load non-critical components

---

## 7. Database & Data Management

### 7.1 PostgreSQL Usage Rules
- **MUST** use PostgreSQL only for system metadata and user management
- **MUST** implement proper database migrations
- **MUST** use connection pooling
- **SHALL** implement database transactions for multi-table operations

### 7.2 Google Sheets Integration Rules
- **MUST** store all patient and appointment data in client-owned Google Sheets
- **MUST** implement proper error handling for Sheets API failures
- **MUST** respect Google Sheets API rate limits
- **SHALL** implement caching for frequently accessed sheet data

```typescript
// ✅ Proper rate limiting implementation
class GoogleSheetsService {
  private rateLimiter = new Map<string, number>();
  
  async updateSheet(sheetId: string, data: any[]): Promise<void> {
    await this.checkRateLimit(sheetId);
    // Implementation
  }
  
  private async checkRateLimit(sheetId: string): Promise<void> {
    // Rate limiting logic
  }
}
```

### 7.3 Data Validation Rules
- **MUST** validate data integrity before Google Sheets operations
- **MUST** implement conflict resolution for concurrent updates
- **SHALL** maintain audit logs for all data modifications

### 7.4 Data Migration Strategy
- **MUST** implement safe PostgreSQL → Google Sheets migration
- **MUST** validate data integrity after migration
- **MUST** support batch processing for large datasets
- **SHALL** implement incremental sync during migration

### 7.5 Emergency Rollback Procedures
- **MUST** maintain rollback capability to PostgreSQL-first mode
- **MUST** complete rollback in under 15 minutes
- **MUST** implement automated failover when Google Sheets unavailable
- **SHALL** notify users during rollback procedures

---

## 8. Third-Party Integration Rules

### 8.1 WhatsApp Business API Rules
- **MUST** validate webhook signatures for security
- **MUST** handle webhook retries gracefully
- **MUST** implement proper message queuing for high volume
- **SHALL** respect WhatsApp rate limits and policies

```typescript
// ✅ Proper webhook validation
class WhatsAppWebhookHandler {
  validateSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
}
```

### 8.2 Message Processing Rules
- **MUST** implement language detection for English/Urdu
- **MUST** provide menu-driven navigation
- **SHOULD** implement intent recognition for natural language
- **SHALL** maintain conversation state across messages

### 8.3 Integration Testing Requirements
- **MUST** mock external APIs in unit tests
- **MUST** implement integration tests with actual API calls
- **SHALL** monitor API health and performance

### 8.4 Configuration Wizard Requirements
- **MUST** implement step-by-step setup wizards for:
  - WhatsApp Business API configuration
  - Google Sheets integration
  - Staff invitation and management
  
### 8.5 Wizard UX Standards
- **MUST** validate each step before proceeding
- **MUST** allow saving progress and resuming later
- **MUST** provide clear error messages with resolution steps
- **SHALL** include help text and documentation links
- **SHALL** implement "Test Connection" functionality

---

## 9. Security & Compliance Requirements

### 9.1 HIPAA Compliance Rules
- **MUST** encrypt all data transmissions using TLS 1.3
- **MUST** implement proper access controls and audit logging
- **MUST** ensure patient data remains in client-controlled Google Sheets
- **SHALL** implement data retention and deletion policies

### 9.2 Authentication Security
- **MUST** use strong JWT secrets (minimum 256 bits)
- **MUST** implement proper session management
- **MUST** enforce strong password policies
- **SHALL** implement account lockout mechanisms

### 9.3 Input Security Rules
- **MUST** sanitize all user inputs
- **MUST** validate phone numbers and prevent injection attacks
- **MUST** implement proper CORS policies
- **SHALL** use parameterized queries for database operations

### 9.4 Trial Abuse Prevention
- **MUST** implement phone verification for all trial signups
- **MUST** enforce one trial per phone number (lifetime tracking)
- **MUST** track organization registration via IP/browser fingerprint
- **MUST** enforce trial limits: 25 patients, 50 appointments
- **SHALL** use SMS or WhatsApp for phone verification
- **SHALL** store verification history in TrialHistory table

### 9.5 Trial Limitation Enforcement
```typescript
const TRIAL_LIMITS = {
  maxPatients: 25,
  maxAppointments: 50,
  durationDays: 14
};
```

---

## 10. Performance & Scalability

### 10.1 Response Time Requirements
```typescript
const PERFORMANCE_BENCHMARKS = {
  'WhatsApp webhook processing': 500, // ms
  'API response time (95th percentile)': 200, // ms
  'Google Sheets sync': 1000, // ms
  'Dashboard page load': 2000, // ms
};
```

### 10.2 Caching Strategy Rules
- **MUST** implement Redis caching for frequently accessed data
- **MUST** cache patient data with appropriate TTL
- **SHOULD** implement cache invalidation strategies
- **SHALL** monitor cache hit rates

### 10.3 Scalability Patterns
- **MUST** implement horizontal scaling for API servers
- **SHOULD** use message queues for async processing
- **SHALL** implement proper connection pooling

### 10.4 External API Rate Limits
- **MUST** implement smart rate limiting for Google Sheets API
  - Read operations: 100 requests per 100 seconds per user
  - Write operations: 60 requests per minute per user
- **MUST** implement exponential backoff for rate limit errors
- **MUST** queue operations when approaching limits
- **SHALL** implement circuit breaker pattern for external APIs

### 10.5 WhatsApp API Rate Limits
- **MUST** respect WhatsApp message sending limits
  - Business tier: 1000 messages per day (initial)
  - Standard tier: Unlimited (with approval)
- **MUST** implement message queuing for high volume
- **SHALL** monitor rate limit status and alert before hitting limits

---

## 11. Testing Requirements

### 11.1 Unit Testing Rules
- **MUST** maintain minimum 80% code coverage
- **SHOULD** target 90%+ for critical business logic
- **MUST** write unit tests for all service layer functions
- **MUST** mock external dependencies in unit tests
- **SHALL** use descriptive test names and arrange-act-assert pattern

**Current Project Coverage:** 95%+ across all modules
- Analytics: 26/26 tests passing
- Billing: 30/30 tests passing
- WhatsApp Routing: 17/17 tests passing
- Configuration Wizards: 126/126 tests passing

### 11.2 Integration Testing Rules
- **MUST** test all API endpoints with real database
- **MUST** test WhatsApp webhook handling
- **SHALL** test Google Sheets integration flows

### 11.3 E2E Testing Rules
- **MUST** implement E2E tests for critical user journeys
- **MUST** test appointment booking flow end-to-end
- **SHALL** test multi-language WhatsApp interactions

---

## 12. Documentation Standards

### 12.1 Code Documentation Rules
- **MUST** document all public APIs using JSDoc
- **MUST** maintain README files for each major component
- **SHOULD** document complex business logic inline
- **SHALL** keep documentation synchronized with code changes

### 12.2 API Documentation Rules
- **MUST** maintain OpenAPI specifications for all endpoints
- **MUST** provide example requests and responses
- **SHALL** document error codes and their meanings

### 12.3 Project Documentation Rules
- **MUST** update task tracking document with progress
- **MUST** document architectural decisions
- **SHALL** maintain changelog for all releases

### 12.4 Documentation Minimalism Rules ⚠️ IMPORTANT
- **MUST NOT** create redundant documentation files
- **MUST** update existing documents instead of creating new ones
- **MUST** delete analysis/summary documents after applying changes
- **SHALL** keep all rules in WARP.md (single source of truth)

**Essential Documents Only:**
```
✅ WARP.md - Project rules (update, don't duplicate)
✅ docs/core/ - Core specifications (update when features change)
✅ docs/architecture/ - Architecture docs (update when architecture changes)
❌ Summary documents - Delete after review
❌ How-to guides - Add to WARP.md instead
❌ Redundant explanations - Consolidate into existing docs
```

**Process:**
1. Need to document something? Check if document exists first
2. Update existing document rather than create new
3. If creating temporary analysis, delete after applying changes
4. Keep documentation lean and focused

### 12.5 AI Request Optimization Rules 💰 COST SAVING
**Goal:** Minimize Warp AI credits consumption while maintaining productivity

#### Response Length Rules
- **MUST** keep responses under 4 lines for simple questions
- **MUST NOT** add preambles like "Here's what I found..." or "Let me help you..."
- **MUST NOT** add postambles like "Hope this helps!" or "Let me know if..."
- **MUST** answer directly without explanations unless asked
- **SHALL** use code blocks only when necessary, not for decoration

#### File Reading Rules
- **MUST** read only specific line ranges when you know what you need
- **MUST NOT** read entire files to answer simple questions
- **MUST** use grep/search instead of reading files when looking for specific text
- **SHALL** batch file reads in one request instead of multiple

#### Tool Usage Rules
- **MUST** use single tool call when possible instead of multiple sequential calls
- **MUST NOT** call tools just to verify information already in context
- **MUST** avoid redundant searches (don't search for same thing twice)
- **SHALL** use cached information from earlier in conversation

#### Question Clarification
- **MUST** ask clarifying questions BEFORE doing extensive analysis
- **MUST NOT** assume and then do large operations that might be wrong
- **SHALL** confirm scope before reading multiple files

**Examples:**

❌ **Bad (wastes credits):**
```
User: "What port does Redis use?"
AI: "Let me help you find that information! I'll check the 
documentation for you. [reads 5 files] 
Based on my analysis of your project files, Redis runs 
on port 6379. Hope this helps! Let me know if you need 
anything else!"
```

✅ **Good (minimal credits):**
```
User: "What port does Redis use?"
AI: "6379 (see WARP.md Section 2.2.1)"
```

❌ **Bad (wastes credits):**
```
User: "Fix the login bug"
AI: [reads 20 files, analyzes everything, proposes solution]
User: "No, I meant the logout bug"
```

✅ **Good (minimal credits):**
```
User: "Fix the login bug"
AI: "Which component? Frontend login form or backend auth?"
User: "Backend auth"
AI: [reads only auth files, fixes issue]
```

#### When to Use Detailed Responses
- Complex architectural decisions
- Security-critical implementations  
- When user explicitly asks for explanation
- Teaching/onboarding scenarios

#### When to Use Minimal Responses
- Simple factual questions
- Quick file edits
- Command suggestions
- Debugging assistance
- File location questions

---

## 13. Deployment & CI/CD Rules

### 13.1 Branch Management Rules
```
main (production) ← merge from develop
develop (integration) ← merge from feature branches
feature/TASK-XXX-description
bugfix/TASK-XXX-description
hotfix/TASK-XXX-description
```

### 13.2 CI/CD Pipeline Requirements
- **MUST** run all tests before deployment
- **MUST** perform security scans on dependencies
- **MUST** build and test Docker images
- **SHALL** implement blue-green deployments for production

### 13.3 Environment Management
- **MUST** maintain separate configurations for dev/staging/production
- **MUST** use environment variables for all configuration
- **SHALL** implement proper secret management

---

## 14. WhatsApp Integration Specific Rules

### 14.1 Message Handling Rules
- **MUST** respond to all messages within 3 seconds
- **MUST** implement proper message queuing for high volume
- **MUST** handle message delivery failures gracefully
- **SHALL** maintain conversation context across sessions

### 14.2 Multi-language Support Rules
- **MUST** support English and Urdu languages
- **MUST** detect user language automatically
- **MUST** provide RTL text support for Urdu
- **SHALL** maintain language preferences per user

### 14.3 Appointment Booking Rules
- **MUST** validate appointment availability in real-time
- **MUST** prevent double-booking conflicts
- **MUST** send confirmation messages immediately
- **SHALL** implement appointment reminder system

### 14.4 Notification Settings & Cost Optimization
- **MUST** implement preset modes: budget, recommended, premium, custom
- **MUST** track message costs per organization
- **MUST** support patient-specific notification overrides
- **SHALL** implement smart bundling for cost reduction
- **SHALL** provide estimated monthly cost calculations

### 14.5 Message Types Configuration
- **MUST** allow enable/disable for each notification type:
  - Booking confirmations
  - Appointment reminders
  - Pre-appointment instructions
  - Post-appointment follow-ups
  - Medication reminders
- **MUST** support configurable timing (hours before/after)

### 14.6 Multi-Client Message Routing
- **MUST** route messages by webhook URL to correct organization
- **MUST** map WhatsApp phone numbers to organizations
- **MUST** process messages in correct organization context
- **SHALL** store WhatsApp credentials per organization
- **SHALL** handle routing failures gracefully

### 14.7 Message Logging
- **MUST** log all WhatsApp messages to database
- **MUST** resolve patientId from phone number
- **MUST** track message status (sent, delivered, read, failed)
- **SHALL** maintain message history for analytics

---

## 15. Healthcare Domain Rules

### 15.1 Patient Data Handling
- **MUST** validate patient information completeness
- **MUST** maintain patient privacy and confidentiality
- **MUST** implement proper consent mechanisms
- **SHALL** support emergency contact information

### 15.2 Appointment Management Rules
- **MUST** support different appointment types and durations
- **MUST** handle appointment status tracking (booked, confirmed, completed, cancelled)
- **SHOULD** implement waitlist functionality
- **SHALL** support recurring appointment patterns

### 15.3 Provider Management Rules
- **MUST** support multiple healthcare providers per organization
- **MUST** manage provider schedules and availability
- **SHALL** implement provider-specific appointment rules

### 15.4 Organization Types
- **MUST** support organization types:
  - CLINIC
  - DOCTOR (individual practitioner)
  - HOSPITAL
  - SPECIALIST (specialty clinics)
  - PHARMACY
  - DIAGNOSTIC (labs, imaging centers)
  
### 15.5 Registration Workflow
- **MUST** validate organization name uniqueness
- **MUST** verify admin email before activation
- **MUST** implement phone verification for trial prevention
- **SHALL** send welcome email with setup instructions
- **SHALL** activate trial period immediately upon registration

---

## Rule Enforcement

### Automated Enforcement
- ESLint and Prettier configurations enforce code style rules
- Jest configuration enforces testing requirements
- GitHub Actions enforce CI/CD pipeline rules
- TypeScript compiler enforces type safety rules

### Manual Review Requirements
- Code reviews must verify adherence to architecture patterns
- Security reviews required for all authentication/authorization code
- Performance reviews required for database and API modifications
- HIPAA compliance reviews for all patient data handling code

### Exception Process
1. Document the specific rule that needs an exception
2. Provide business justification for the exception
3. Get approval from technical lead and project manager
4. Document the exception in code comments
5. Set up task to address exception in future if possible

---

## Compliance Checklist

Before marking any task as complete, verify:

- [ ] All applicable rules have been followed
- [ ] Code passes all automated checks (ESLint, tests, build)
- [ ] Documentation has been updated
- [ ] Security considerations have been addressed
- [ ] Performance impact has been evaluated
- [ ] HIPAA compliance maintained
- [ ] Integration with WhatsApp and Google Sheets tested
- [ ] Multi-language support verified (if applicable)

---

**Document Maintenance:**
This document should be reviewed and updated monthly or when significant architectural changes are made. All team members are responsible for proposing updates when they identify gaps or inconsistencies.

---

## 16. Real-Time Communication

### 16.1 Server-Sent Events (SSE)
- **MUST** implement SSE for real-time dashboard updates
- **MUST** support organization-scoped event streams
- **MUST** implement automatic reconnection with exponential backoff
- **SHALL** send heartbeat every 30 seconds to maintain connection

### 16.2 Event Types
- **MUST** emit events for: message received, processing, responded, failed
- **MUST** include organizationId in all events
- **SHALL** implement event history storage (50 recent events)

### 16.3 Super Admin Multi-Org Streaming
- **MUST** support viewing all organizations simultaneously
- **MUST** support filtered organization selection
- **SHALL** implement proper RBAC for super admin features

### 16.4 SSE Endpoints
```typescript
// Single organization stream
GET /api/events/messages/:organizationId/stream

// All organizations (super admin only)
GET /api/events/messages/all/stream

// Multiple organizations (super admin only)
GET /api/events/messages/multi/stream?orgIds=id1,id2,id3
```

---

## 17. Progressive Web Application

### 17.1 PWA Requirements
- **MUST** include manifest.json with all required fields
- **MUST** implement service worker for offline functionality
- **MUST** support installation on desktop and mobile
- **SHALL** cache essential resources for offline use

### 17.2 Offline Support
- **MUST** implement offline queue for actions
- **MUST** sync queued actions when back online
- **SHALL** show offline status indicator to users
- **SHALL** provide offline fallback page

### 17.3 Push Notifications
- **MUST** implement Web Push API for notifications
- **MUST** request permission before enabling push
- **SHALL** allow users to disable notifications

### 17.4 Installation Experience
```typescript
// Manifest requirements
{
  "name": "DrSync",
  "short_name": "DrSync",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#primary-color",
  "background_color": "#ffffff"
}
```

---

## 18. Billing & Subscription Management

### 18.1 Multi-Currency Support
- **MUST** support PKR (Pakistani Rupee) and USD (US Dollar)
- **MUST** integrate Pakistani payment methods: JazzCash, EasyPaisa
- **MUST** integrate international payments: Payoneer, Wise
- **SHALL** support USDT cryptocurrency payments

### 18.2 Subscription Plans
- **MUST** implement per-doctor pricing model
- **MUST** support monthly and yearly billing cycles
- **MUST** provide 17% discount for annual payments
- **SHALL** implement prorated billing for plan changes

### 18.3 Payment Processing
- **MUST** log all payment attempts in BillingHistory table
- **MUST** handle failed payments with retry logic
- **MUST** implement grace period for expired subscriptions
- **SHALL** send automated invoices via email

### 18.4 Pricing Structure
```typescript
const PRICING = {
  PKR: {
    monthly: 3000, // per doctor
    yearly: 30000  // 17% discount (3000 * 12 * 0.83)
  },
  USD: {
    monthly: 20,   // per doctor
    yearly: 200    // 17% discount (20 * 12 * 0.83)
  }
};
```

---

**Last Updated:** January 2026  
**Next Review:** February 2026  
**Version:** 2.0
