# DrSync Project Rules - WARP.md
**Version:** 1.0  
**Date:** August 2025  
**Project:** DrSync - Healthcare Appointment Management System

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
- **MUST** copy and configure `.env.example` to `.env.local` before starting
- **SHALL** run database migrations and seed data on fresh setup

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

---

## 11. Testing Requirements

### 11.1 Unit Testing Rules
- **MUST** maintain minimum 80% code coverage
- **MUST** write unit tests for all service layer functions
- **MUST** mock external dependencies in unit tests
- **SHALL** use descriptive test names and arrange-act-assert pattern

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

**Last Updated:** August 2025
**Next Review:** September 2025
