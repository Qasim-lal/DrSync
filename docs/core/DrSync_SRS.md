# Software Requirements Specification (SRS)
# DrSync - Healthcare Appointment Management System

**Version:** 1.0  
**Date:** August 2025  
**Author:** DrSync Development Team  

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [User Stories](#6-user-stories)
7. [Use Cases](#7-use-cases)
8. [Acceptance Criteria](#8-acceptance-criteria)

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for DrSync, a comprehensive healthcare appointment management solution that integrates WhatsApp automation with healthcare provider dashboards.

### 1.2 Document Conventions
- **SHALL/MUST**: Mandatory requirement
- **SHOULD**: Recommended requirement
- **MAY**: Optional requirement

### 1.3 Intended Audience
- Development Team
- QA Team
- Project Managers
- Healthcare Clients
- System Administrators

### 1.4 Product Scope
DrSync is a SaaS platform designed to streamline healthcare appointment management through:
- WhatsApp-based patient communication
- Web/mobile dashboards for healthcare providers
- Automated appointment workflows
- Google Sheets integration for data persistence
- Multi-language support (English/Urdu)

## 2. Overall Description

### 2.1 Product Perspective
DrSync operates as a three-tier system:
1. **Patient Interface**: WhatsApp chatbot with multilingual support
2. **Provider Interface**: Responsive web/mobile dashboard (PWA)
3. **Backend System**: Centralized server managing multi-client operations

### 2.2 Product Functions
- Automated appointment scheduling via WhatsApp
- Real-time appointment management
- Patient database management
- Automated reminders and follow-ups
- Analytics and reporting
- Multi-client subscription management
- Progressive Web Application (PWA) deployment
- Automated client onboarding and configuration
- Trial abuse prevention system (phone verification)
- Multi-region subscription billing (PKR/USD)
- Super admin platform management

### 2.3 User Classes and Characteristics
1. **Patients**: End users booking appointments via WhatsApp
2. **Healthcare Providers**: Doctors managing appointments and patients
3. **Administrative Staff**: Clinic staff managing day-to-day operations
4. **Organization Admins**: Clinic administrators managing their organization settings
5. **System Administrators**: DrSync staff managing the platform
6. **Super Administrators**: DrSync platform managers with full system access

### 2.4 Operating Environment
- **Client Side**: Web browsers, mobile devices, WhatsApp
- **Server Side**: Cloud-based infrastructure (AWS/Azure)
- **Integrations**: WhatsApp Business API, Google Sheets API
- **Database**: Google Sheets (client-owned), PostgreSQL (system metadata)

## 3. System Features

### 3.1 SaaS Platform Management

#### 3.1.1 Description
Multi-tenant SaaS platform supporting multiple healthcare organizations on a single deployment.

#### 3.1.2 Functional Requirements
- **REQ-SAAS-001**: System SHALL support multiple organizations with complete data isolation
- **REQ-SAAS-002**: System SHALL route WhatsApp messages to correct organization based on webhook URL or phone mapping
- **REQ-SAAS-003**: System SHALL provide automated organization registration via signup page
- **REQ-SAAS-004**: System SHALL deploy as Progressive Web Application (PWA) requiring no client installations
- **REQ-SAAS-005**: System SHALL send setup instructions via email after organization registration
- **REQ-SAAS-006**: System SHALL provide configuration wizard for WhatsApp Business API setup
- **REQ-SAAS-007**: System SHALL provide configuration wizard for Google Sheets integration
- **REQ-SAAS-008**: System SHALL support staff management with role-based user accounts per organization
- **REQ-SAAS-009**: System SHALL provide super admin dashboard for platform-wide monitoring
- **REQ-SAAS-010**: System SHALL implement trial period management with phone verification abuse prevention

### 3.2 Subscription and Billing Management

#### 3.2.1 Description
Comprehensive subscription management supporting Pakistani and international markets.

#### 3.2.2 Functional Requirements
- **REQ-BILLING-001**: System SHALL support monthly and yearly subscription plans with discounts
- **REQ-BILLING-002**: System SHALL support multi-currency billing (PKR, USD)
- **REQ-BILLING-003**: System SHALL integrate Payoneer for international credit/debit card payments
- **REQ-BILLING-004**: System SHALL integrate JazzCash and EasyPaisa for local Pakistani payments
- **REQ-BILLING-005**: System SHALL support USDT cryptocurrency payments
- **REQ-BILLING-006**: System SHALL provide automated invoice generation and delivery
- **REQ-BILLING-007**: System SHALL handle subscription renewals and cancellations
- **REQ-BILLING-008**: System SHALL implement grace period for expired subscriptions
- **REQ-BILLING-009**: System SHALL provide billing analytics and reporting
- **REQ-BILLING-010**: System SHALL support proration for plan upgrades/downgrades

### 3.3 WhatsApp Chatbot Interface

#### 3.1.1 Description
Intelligent WhatsApp chatbot providing menu-driven appointment management.

#### 3.1.2 Functional Requirements
- **REQ-WA-001**: System SHALL detect user language (English/Urdu) automatically
- **REQ-WA-002**: System SHALL provide menu-driven navigation for appointment booking
- **REQ-WA-003**: System SHALL display available doctors and specialties
- **REQ-WA-004**: System SHALL show real-time appointment availability
- **REQ-WA-005**: System SHALL allow appointment booking, rescheduling, and cancellation
- **REQ-WA-006**: System SHALL send automated booking confirmations
- **REQ-WA-007**: System SHALL provide clinic information and location details
- **REQ-WA-008**: System SHALL manage multiple client WhatsApp Business numbers simultaneously
- **REQ-WA-009**: System SHALL support family member registration via shared WhatsApp number
- **REQ-WA-010**: System SHALL handle booking conflicts with intelligent slot suggestions

### 3.4 Healthcare Provider Dashboard

#### 3.4.1 Description
Responsive Progressive Web Application (PWA) for healthcare providers and staff.

#### 3.4.2 Functional Requirements
- **REQ-DASH-001**: System SHALL provide secure user authentication
- **REQ-DASH-002**: System SHALL display patient database with search and filtering
- **REQ-DASH-003**: System SHALL enable CRUD operations for appointments
- **REQ-DASH-004**: System SHALL provide calendar view for appointment management
- **REQ-DASH-005**: System SHALL generate analytics reports and dashboards
- **REQ-DASH-006**: System SHALL allow bulk operations on appointments
- **REQ-DASH-007**: System SHALL support mobile and desktop interfaces

### 3.5 Appointment Management System

#### 3.5.1 Description
Core appointment scheduling and management functionality.

#### 3.5.2 Functional Requirements
- **REQ-APPT-001**: System SHALL validate appointment availability in real-time
- **REQ-APPT-002**: System SHALL prevent double-booking conflicts
- **REQ-APPT-003**: System SHALL support recurring appointment patterns
- **REQ-APPT-004**: System SHALL track appointment status (booked, confirmed, completed, cancelled)
- **REQ-APPT-005**: System SHALL maintain appointment history
- **REQ-APPT-006**: System SHALL support emergency appointment booking
- **REQ-APPT-007**: System SHALL handle appointment waitlists
- **REQ-APPT-008**: System SHALL implement slot locking during booking process
- **REQ-APPT-009**: System SHALL suggest next available slot if requested slot is taken
- **REQ-APPT-010**: System SHALL support family-based patient management with shared contact numbers

### 3.6 Automated Communication System

#### 3.6.1 Description
Automated messaging and follow-up system for patient engagement.

#### 3.6.2 Functional Requirements
- **REQ-COMM-001**: System SHALL send appointment reminders 24 hours before scheduled time
- **REQ-COMM-002**: System SHALL send appointment confirmations upon booking
- **REQ-COMM-003**: System SHALL deliver customizable follow-up messages post-appointment
- **REQ-COMM-004**: System SHALL support medication reminders based on treatment
- **REQ-COMM-005**: System SHALL send wellness check-ins based on patient history
- **REQ-COMM-006**: System SHALL handle message scheduling and queuing
- **REQ-COMM-007**: System SHALL support message templates with personalization

### 3.7 WhatsApp Notification Settings & Cost Control

#### 3.7.1 Description
Configurable notification system allowing organizations to control which automated WhatsApp messages are sent, enabling cost optimization and workflow customization.

#### 3.7.2 Functional Requirements
- **REQ-NOTIF-001**: System SHALL provide organization-level notification settings interface
- **REQ-NOTIF-002**: System SHALL support enable/disable controls for each notification type
- **REQ-NOTIF-003**: System SHALL calculate real-time cost estimates based on notification settings
- **REQ-NOTIF-004**: System SHALL support configurable timing for notifications (e.g., 24 hours, 2 hours before)
- **REQ-NOTIF-005**: System SHALL provide preset modes (Budget, Recommended, Premium)
- **REQ-NOTIF-006**: System SHALL display cost impact for each notification type
- **REQ-NOTIF-007**: System SHALL support patient segmentation with custom notification rules
- **REQ-NOTIF-008**: System SHALL implement smart message bundling to reduce costs
- **REQ-NOTIF-009**: System SHALL track messages sent vs. messages saved for cost analytics
- **REQ-NOTIF-010**: System SHALL provide message preview functionality
- **REQ-NOTIF-011**: System SHALL respect notification settings when sending automated messages
- **REQ-NOTIF-012**: System SHALL support 12+ notification types (confirmations, reminders, follow-ups, etc.)
- **REQ-NOTIF-013**: System SHALL provide cost optimization suggestions based on usage patterns
- **REQ-NOTIF-014**: System SHALL allow customization of message content per notification type
- **REQ-NOTIF-015**: System SHALL maintain notification settings history for audit purposes

### 3.7 Data Integration System

#### 3.7.1 Description
Google Sheets integration for decentralized data management.

#### 3.7.2 Functional Requirements
- **REQ-DATA-001**: System SHALL connect to multiple client Google Sheets simultaneously
- **REQ-DATA-002**: System SHALL read and update appointment data in real-time
- **REQ-DATA-003**: System SHALL maintain data synchronization between WhatsApp and sheets
- **REQ-DATA-004**: System SHALL validate data integrity before updates
- **REQ-DATA-005**: System SHALL handle Google Sheets API rate limits
- **REQ-DATA-006**: System SHALL support custom sheet structures per client (tabs or separate sheets)
- **REQ-DATA-007**: System SHALL maintain audit logs for all data operations
- **REQ-DATA-008**: System SHALL implement atomic booking operations to prevent double-booking
- **REQ-DATA-009**: System SHALL support multiple patients per phone number for family accounts
- **REQ-DATA-010**: System SHALL resolve booking conflicts by suggesting alternative slots

## 4. External Interface Requirements

### 4.1 User Interfaces
- **UI-001**: WhatsApp interface SHALL be conversational and intuitive
- **UI-002**: Dashboard SHALL be responsive across devices
- **UI-003**: Interface SHALL support RTL languages (Urdu)
- **UI-004**: UI SHALL follow accessibility guidelines (WCAG 2.1)

### 4.2 Hardware Interfaces
- **HW-001**: System SHALL support mobile devices (iOS/Android)
- **HW-002**: System SHALL work on desktop browsers
- **HW-003**: System SHALL be optimized for various screen sizes

### 4.3 Software Interfaces
- **SW-001**: WhatsApp Business API integration
- **SW-002**: Google Sheets API v4 integration
- **SW-003**: SMS gateway for backup communication
- **SW-004**: Email service for notifications

### 4.4 Communication Interfaces
- **COMM-INT-001**: HTTPS for all web communications
- **COMM-INT-002**: WebSocket for real-time updates
- **COMM-INT-003**: Webhook endpoints for external integrations

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
- **PERF-001**: System SHALL respond to WhatsApp messages within 3 seconds
- **PERF-002**: Dashboard SHALL load within 2 seconds on 4G connection
- **PERF-003**: System SHALL support 1000 concurrent users per client
- **PERF-004**: API response time SHALL be under 500ms for 95% of requests

### 5.2 Security Requirements
- **SEC-001**: System SHALL implement HIPAA-compliant data handling
- **SEC-002**: All data transmissions SHALL be encrypted using TLS 1.3
- **SEC-003**: System SHALL implement multi-factor authentication
- **SEC-004**: Patient data SHALL remain in client-owned Google Sheets
- **SEC-005**: System SHALL implement role-based access control
- **SEC-006**: System SHALL log all security-relevant events

### 5.3 Reliability Requirements
- **REL-001**: System SHALL maintain 99.9% uptime
- **REL-002**: System SHALL implement automated failover mechanisms
- **REL-003**: Data backups SHALL be performed daily
- **REL-004**: System SHALL recover from failures within 5 minutes

### 5.4 Availability Requirements
- **AVAIL-001**: System SHALL be available 24/7
- **AVAIL-002**: Planned maintenance SHALL not exceed 2 hours monthly
- **AVAIL-003**: System SHALL provide graceful degradation during partial outages

### 5.5 Scalability Requirements
- **SCALE-001**: System SHALL support up to 10,000 healthcare clients
- **SCALE-002**: System SHALL handle 1 million appointments per month
- **SCALE-003**: System SHALL auto-scale based on demand

## 6. User Stories

### 6.1 Patient Stories
- **US-P001**: As a patient, I want to book appointments via WhatsApp so that I can schedule visits conveniently
- **US-P002**: As a patient, I want to receive appointment reminders so that I don't miss my scheduled visits
- **US-P003**: As a patient, I want to reschedule appointments easily so that I can adjust to my availability
- **US-P004**: As a patient, I want to communicate in my preferred language so that I understand the process clearly
- **US-P005**: As a patient, I want to receive follow-up care instructions so that I can properly manage my health

### 6.2 Healthcare Provider Stories
- **US-HP001**: As a healthcare provider, I want to view my daily schedule so that I can prepare for appointments
- **US-HP002**: As a healthcare provider, I want to access patient information so that I can provide personalized care
- **US-HP003**: As a healthcare provider, I want to send custom follow-up messages so that I can ensure patient recovery
- **US-HP004**: As a healthcare provider, I want to generate reports so that I can analyze my practice performance

### 6.3 Administrative Staff Stories
- **US-AS001**: As administrative staff, I want to manage patient registrations so that I can maintain accurate records
- **US-AS002**: As administrative staff, I want to handle appointment conflicts so that I can optimize scheduling
- **US-AS003**: As administrative staff, I want to export appointment data so that I can create custom reports

### 6.4 Organization Admin Stories
- **US-OA001**: As an organization admin, I want to configure WhatsApp Business API so that patients can book appointments via WhatsApp
- **US-OA002**: As an organization admin, I want to integrate my Google Sheets so that appointment data is stored in my own sheets
- **US-OA003**: As an organization admin, I want to manage staff accounts so that I can control who has access to our system
- **US-OA004**: As an organization admin, I want to view billing information so that I can track subscription costs
- **US-OA005**: As an organization admin, I want to upgrade/downgrade my plan so that I can adjust to changing needs

### 6.5 Super Admin Stories
- **US-SA001**: As a super admin, I want to monitor platform performance so that I can ensure system reliability
- **US-SA002**: As a super admin, I want to manage client subscriptions so that I can handle billing issues
- **US-SA003**: As a super admin, I want to view system-wide analytics so that I can make strategic decisions
- **US-SA004**: As a super admin, I want to provide technical support so that I can help clients resolve issues
- **US-SA005**: As a super admin, I want to manage trial abuse prevention so that I can protect platform resources

### 6.6 WhatsApp Cost Control Stories
- **US-COST001**: As an organization admin, I want to control which WhatsApp messages are sent so that I can manage messaging costs
- **US-COST002**: As an organization admin, I want to see estimated monthly costs so that I can budget appropriately
- **US-COST003**: As an organization admin, I want to preview messages before enabling them so that I can ensure quality
- **US-COST004**: As an organization admin, I want preset configurations so that I can quickly optimize for my budget
- **US-COST005**: As an organization admin, I want to see cost savings from disabled messages so that I can track ROI
- **US-COST006**: As an organization admin, I want to customize message timing so that I can match my clinic's workflow
- **US-COST007**: As an organization admin, I want to segment patients with different notification rules so that I can optimize engagement
- **US-COST008**: As an organization admin, I want smart bundling recommendations so that I can reduce costs without losing communication quality

## 7. Use Cases

### 7.1 Appointment Booking via WhatsApp
**Primary Actor**: Patient  
**Goal**: Book a new appointment  
**Preconditions**: Patient has WhatsApp and knows clinic's number  
**Main Success Scenario**:
1. Patient sends message to clinic's WhatsApp
2. System detects language and displays main menu
3. Patient selects "Book Appointment"
4. System shows available doctors
5. Patient selects preferred doctor
6. System displays available time slots
7. Patient selects preferred time
8. System locks selected slot (atomic operation)
9. System writes appointment to client's Google Sheet
10. System confirms appointment and sends confirmation
11. System releases slot lock and syncs to PostgreSQL

**Extensions**:
- 6a. No slots available: System offers alternative dates
- 8a. Slot becomes unavailable (conflict): System suggests next available slot automatically
- 8b. Google Sheets write fails: System releases lock and notifies patient
- 7a. Multiple family members: System asks which family member is booking for

### 7.2 Dashboard Appointment Management
**Primary Actor**: Healthcare Provider  
**Goal**: Manage daily appointments  
**Preconditions**: Provider is logged into dashboard  
**Main Success Scenario**:
1. Provider logs into dashboard
2. System displays today's appointments
3. Provider reviews appointment details
4. Provider updates appointment status as needed
5. System synchronizes changes to Google Sheet
6. System sends notifications to patients if required

### 7.3 Organization Registration and Setup
**Primary Actor**: Organization Admin  
**Goal**: Register new clinic and configure DrSync  
**Preconditions**: Admin has clinic details and email access  
**Main Success Scenario**:
1. Admin visits DrSync signup page
2. Admin fills registration form with clinic details
3. System creates new organization and admin user
4. System sends setup instructions via email
5. Admin logs in using provided credentials
6. System displays configuration wizard
7. Admin configures WhatsApp Business API settings
8. Admin authorizes Google Sheets integration
9. System creates or connects to Google Sheets
10. Admin invites staff members to join
11. System sends staff invitation emails
12. Organization setup is complete and trial begins

**Extensions**:
- 3a. Registration fails validation: System displays error messages
- 7a. WhatsApp API credentials invalid: System shows configuration error
- 8a. Google Sheets authorization fails: System provides troubleshooting steps
- 9a. Sheets creation fails: System offers to retry or use existing sheets

### 7.4 Subscription Management
**Primary Actor**: Organization Admin  
**Goal**: Manage organization subscription  
**Preconditions**: Admin is logged into organization dashboard  
**Main Success Scenario**:
1. Admin navigates to billing section
2. System displays current subscription details
3. Admin selects plan upgrade/downgrade
4. System calculates prorated charges
5. Admin selects payment method (Payoneer/JazzCash/EasyPaisa/USDT)
6. System processes payment
7. System updates subscription and sends confirmation
8. System adjusts organization features accordingly

**Extensions**:
- 6a. Payment fails: System provides alternative payment methods
- 6b. Insufficient funds: System offers payment retry options
- 7a. Subscription expires: System provides grace period with limited features

## 8. Acceptance Criteria

### 8.1 WhatsApp Integration
- [ ] Messages are delivered within 3 seconds
- [ ] Language detection works with 95% accuracy
- [ ] Menu navigation is intuitive and error-free
- [ ] All appointment operations complete successfully
- [ ] Confirmation messages are sent automatically

### 8.2 Dashboard Functionality
- [ ] Login process completes within 10 seconds
- [ ] All CRUD operations work correctly
- [ ] Real-time updates are reflected immediately
- [ ] Reports generate within 30 seconds
- [ ] Mobile interface is fully functional

### 8.3 Data Integration
- [ ] Google Sheets sync within 5 seconds
- [ ] Data integrity maintained across all operations
- [ ] Multiple client sheets handled simultaneously
- [ ] Error handling prevents data loss
- [ ] Audit trails capture all changes

### 8.4 Security & Compliance
- [ ] All communications encrypted
- [ ] Patient data remains in client sheets
- [ ] HIPAA compliance verified
- [ ] Multi-factor authentication working
- [ ] Access controls properly implemented

### 8.5 Performance & Reliability
- [ ] 99.9% uptime maintained
- [ ] Load testing passes for concurrent users
- [ ] Failover mechanisms tested
- [ ] Backup and recovery procedures validated
- [ ] Auto-scaling functionality verified

### 8.6 SaaS Platform Management
- [ ] Multi-tenant data isolation verified
- [ ] Organization registration completes within 60 seconds
- [ ] Setup emails delivered within 5 minutes
- [ ] Configuration wizards guide users successfully
- [ ] Staff invitation system works correctly
- [ ] WhatsApp message routing accuracy is 100%

### 8.7 Subscription and Billing
- [ ] Payment processing works for all supported methods
- [ ] Subscription upgrades/downgrades process correctly
- [ ] Prorated charges calculated accurately
- [ ] Invoice generation and delivery automated
- [ ] Grace period functionality prevents data loss
- [ ] Trial abuse prevention blocks duplicate registrations

---

**Document Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| QA Manager | | | |

**Change History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 2025 | Development Team | Initial version |
