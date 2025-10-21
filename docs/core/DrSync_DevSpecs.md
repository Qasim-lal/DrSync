# Development Specifications Document
# DrSync - Healthcare Appointment Management System

**Version:** 1.0  
**Date:** August 2025  
**Author:** DrSync Development Team  

## Table of Contents
1. [Introduction](#1-introduction)
2. [Development Environment Setup](#2-development-environment-setup)
3. [Coding Standards](#3-coding-standards)
4. [Project Structure](#4-project-structure)
5. [Third-Party Integrations](#5-third-party-integrations)
6. [Performance Requirements](#6-performance-requirements)
7. [Testing Strategy](#7-testing-strategy)
8. [Development Workflow](#8-development-workflow)
9. [Quality Assurance](#9-quality-assurance)
10. [Implementation Guidelines](#10-implementation-guidelines)

## 1. Introduction

### 1.1 Purpose
This Development Specifications Document provides detailed technical requirements, coding standards, and implementation guidelines for DrSync development team to ensure consistent, maintainable, and high-quality code.

### 1.2 Scope
This document covers:
- Development environment configuration
- Coding standards and conventions
- Project structure and organization
- Third-party integration specifications
- Performance benchmarks and requirements
- Testing methodologies and frameworks
- Quality assurance processes

### 1.3 Target Audience
- Frontend Developers
- Backend Developers
- DevOps Engineers
- QA Engineers
- Technical Leads

## 2. Development Environment Setup

### 2.1 Required Tools and Software

#### 2.1.1 Core Development Tools
```bash
# Node.js and Package Manager
Node.js: v18.17.0 LTS or higher
npm: v9.0.0 or higher (alternative: yarn v3.0+, pnpm v8.0+)

# Database
PostgreSQL: v15.0 or higher
Redis: v7.0 or higher

# Code Editor/IDE
VS Code (recommended)
WebStorm (alternative)

# Version Control
Git: v2.40.0 or higher

# Container Platform
Docker: v24.0 or higher
Docker Compose: v2.20 or higher
```

#### 2.1.2 VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.eslint",
    "ms-vscode.vscode-json",
    "ms-vscode.docker",
    "github.copilot",
    "ms-vscode.remote-containers"
  ]
}
```

### 2.2 Local Development Setup

#### 2.2.1 Backend Setup
```bash
# Clone repository
git clone https://github.com/drsync/drsync-backend.git
cd drsync-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with local configuration

# Start development services
docker-compose up -d postgres redis

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

#### 2.2.2 Frontend Setup
```bash
# Clone repository
git clone https://github.com/drsync/drsync-dashboard.git
cd drsync-dashboard

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with local API endpoints

# Start development server
npm run dev
```

#### 2.2.3 Environment Variables

##### Backend Environment Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://drsync:password@localhost:5432/drsync_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# WhatsApp Business API
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_APP_ID=your-whatsapp-app-id
WHATSAPP_APP_SECRET=your-whatsapp-app-secret

# Google Sheets API
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
GOOGLE_PROJECT_ID=your-google-project-id

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@drsync.health

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
```

##### Frontend Environment Variables
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME=DrSync
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_ENVIRONMENT=development

# External Services
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 3. Coding Standards

### 3.1 TypeScript/JavaScript Standards

#### 3.1.1 ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier",
    "next/core-web-vitals"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": "warn",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"]
  }
}
```

#### 3.1.2 Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

#### 3.1.3 Naming Conventions
```typescript
// Variables and functions: camelCase
const patientName = 'John Doe';
const calculateAppointmentDuration = (start: Date, end: Date): number => {
  return end.getTime() - start.getTime();
};

// Constants: SCREAMING_SNAKE_CASE
const MAX_APPOINTMENTS_PER_DAY = 50;
const DEFAULT_APPOINTMENT_DURATION = 30;

// Types and Interfaces: PascalCase
interface PatientData {
  id: string;
  name: string;
  phone: string;
}

type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled';

// Classes: PascalCase
class AppointmentService {
  private readonly repository: AppointmentRepository;
  
  constructor(repository: AppointmentRepository) {
    this.repository = repository;
  }
}

// Enums: PascalCase
enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  STAFF = 'staff'
}
```

#### 3.1.4 File Naming Conventions
```
// Files: kebab-case
patient-service.ts
appointment-controller.ts
whatsapp-webhook.ts

// Components: PascalCase
PatientList.tsx
AppointmentCard.tsx
DashboardLayout.tsx

// Hooks: camelCase with "use" prefix
usePatientData.ts
useAppointments.ts
useWhatsAppMessages.ts

// Utilities: camelCase
dateUtils.ts
validationUtils.ts
apiHelpers.ts
```

### 3.2 React/Next.js Standards

#### 3.2.1 Component Structure
```tsx
// PatientCard.tsx
import React from 'react';
import { Patient } from '@/types/patient';
import { formatPhoneNumber } from '@/utils/phone';

interface PatientCardProps {
  patient: Patient;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patientId: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient,
  onEdit,
  onDelete,
}) => {
  const handleEditClick = (): void => {
    onEdit?.(patient);
  };

  return (
    <div className="patient-card">
      <h3>{patient.name}</h3>
      <p>{formatPhoneNumber(patient.phone)}</p>
      <button onClick={handleEditClick}>Edit</button>
    </div>
  );
};
```

#### 3.2.2 Custom Hooks Pattern
```tsx
// usePatients.ts
import { useState, useEffect } from 'react';
import { Patient } from '@/types/patient';
import { patientApi } from '@/services/api';

interface UsePatients {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePatients = (): UsePatients => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientApi.getAll();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  return {
    patients,
    loading,
    error,
    refetch: fetchPatients,
  };
};
```

### 3.3 Backend Standards

#### 3.3.1 Express.js Route Structure
```typescript
// routes/patients.ts
import express from 'express';
import { PatientController } from '../controllers/patient-controller';
import { validatePatientData } from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();
const patientController = new PatientController();

router.get(
  '/',
  requireAuth,
  patientController.getPatients.bind(patientController)
);

router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'staff']),
  validatePatientData,
  patientController.createPatient.bind(patientController)
);

export default router;
```

#### 3.3.2 Controller Pattern
```typescript
// controllers/patient-controller.ts
import { Request, Response } from 'express';
import { PatientService } from '../services/patient-service';
import { CreatePatientDto, UpdatePatientDto } from '../dto/patient';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';

export class PatientController {
  private readonly patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  getPatients = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10, search } = req.query;
    
    const result = await this.patientService.getPatients({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      organizationId: req.user.organizationId,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  createPatient = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const patientData: CreatePatientDto = req.body;
    patientData.organizationId = req.user.organizationId;

    const patient = await this.patientService.createPatient(patientData);

    res.status(201).json({
      status: 'success',
      data: { patient },
    });
  });
}
```

#### 3.3.3 Service Layer Pattern
```typescript
// services/patient-service.ts
import { PatientRepository } from '../repositories/patient-repository';
import { GoogleSheetsService } from './google-sheets-service';
import { CreatePatientDto, UpdatePatientDto } from '../dto/patient';
import { Patient } from '../entities/patient';
import { AppError } from '../utils/app-error';

export class PatientService {
  private readonly patientRepository: PatientRepository;
  private readonly googleSheetsService: GoogleSheetsService;

  constructor() {
    this.patientRepository = new PatientRepository();
    this.googleSheetsService = new GoogleSheetsService();
  }

  async createPatient(data: CreatePatientDto): Promise<Patient> {
    // Validate phone number uniqueness
    const existingPatient = await this.patientRepository.findByPhone(
      data.phone,
      data.organizationId
    );

    if (existingPatient) {
      throw new AppError('Patient with this phone number already exists', 409);
    }

    // Create patient in Google Sheets
    await this.googleSheetsService.addPatient(data.organizationId, data);

    // Create patient record
    const patient = await this.patientRepository.create(data);

    return patient;
  }
}
```

## 4. Project Structure

### 4.1 Backend Project Structure
```
drsync-backend/
├── src/
│   ├── controllers/           # Request handlers
│   │   ├── auth-controller.ts
│   │   ├── patient-controller.ts
│   │   └── appointment-controller.ts
│   ├── services/             # Business logic
│   │   ├── auth-service.ts
│   │   ├── patient-service.ts
│   │   ├── appointment-service.ts
│   │   ├── whatsapp-service.ts
│   │   └── google-sheets-service.ts
│   ├── repositories/         # Data access layer
│   │   ├── base-repository.ts
│   │   ├── user-repository.ts
│   │   ├── patient-repository.ts
│   │   └── appointment-repository.ts
│   ├── entities/            # Database models
│   │   ├── user.ts
│   │   ├── patient.ts
│   │   └── appointment.ts
│   ├── dto/                 # Data Transfer Objects
│   │   ├── auth/
│   │   ├── patient/
│   │   └── appointment/
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   ├── error-handler.ts
│   │   └── rate-limiter.ts
│   ├── routes/              # API routes
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── patients.ts
│   │   ├── appointments.ts
│   │   └── whatsapp.ts
│   ├── utils/               # Utility functions
│   │   ├── app-error.ts
│   │   ├── catch-async.ts
│   │   ├── logger.ts
│   │   └── validation-schemas.ts
│   ├── config/              # Configuration
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── environment.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── express.d.ts
│   │   ├── auth.ts
│   │   └── api.ts
│   └── app.ts              # Express app setup
├── tests/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/             # Database migrations
├── seeds/                  # Database seeds
├── docker/                 # Docker configurations
├── docs/                   # Documentation
├── .env.example           # Environment variables template
├── docker-compose.yml     # Development services
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 Frontend Project Structure
```
drsync-dashboard/
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/             # Basic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── forms/          # Form components
│   │   │   ├── PatientForm.tsx
│   │   │   └── AppointmentForm.tsx
│   │   ├── layout/         # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   └── features/       # Feature-specific components
│   │       ├── patients/
│   │       ├── appointments/
│   │       └── analytics/
│   ├── pages/              # Next.js pages
│   │   ├── api/           # API routes
│   │   ├── auth/          # Authentication pages
│   │   ├── patients/      # Patient management pages
│   │   ├── appointments/  # Appointment pages
│   │   └── dashboard/     # Dashboard pages
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePatients.ts
│   │   └── useAppointments.ts
│   ├── services/           # API services
│   │   ├── api.ts
│   │   ├── auth-api.ts
│   │   ├── patient-api.ts
│   │   └── appointment-api.ts
│   ├── store/              # State management
│   │   ├── auth-store.ts
│   │   ├── patient-store.ts
│   │   └── app-store.ts
│   ├── utils/              # Utility functions
│   │   ├── date.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   ├── types/              # TypeScript types
│   │   ├── api.ts
│   │   ├── patient.ts
│   │   └── appointment.ts
│   └── styles/             # CSS styles
│       ├── globals.css
│       └── components.css
├── public/                 # Static assets
├── tests/                  # Test files
├── .env.example           # Environment variables
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 5. Third-Party Integrations

### 5.1 WhatsApp Business API Integration

#### 5.1.1 Webhook Handler Implementation
```typescript
// services/whatsapp-service.ts
import crypto from 'crypto';
import axios from 'axios';
import { WhatsAppMessage, WhatsAppWebhook } from '../types/whatsapp';
import { AppError } from '../utils/app-error';

export class WhatsAppService {
  private readonly accessToken: string;
  private readonly verifyToken: string;
  private readonly appSecret: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!;
    this.appSecret = process.env.WHATSAPP_APP_SECRET!;
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  validateSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    
    try {
      await axios.post(url, {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      throw new AppError('Failed to send WhatsApp message', 500);
    }
  }

  async processWebhook(webhook: WhatsAppWebhook): Promise<void> {
    for (const entry of webhook.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          await this.processMessages(change.value);
        }
      }
    }
  }

  private async processMessages(value: any): Promise<void> {
    if (value.messages) {
      for (const message of value.messages) {
        await this.handleMessage(message, value.contacts?.[0]);
      }
    }
  }
}
```

#### 5.1.2 Message Processing Flow
```typescript
// services/message-processor.ts
export class MessageProcessor {
  async processMessage(message: WhatsAppMessage, contact: any): Promise<void> {
    const phone = message.from;
    const text = message.text?.body?.toLowerCase() || '';
    
    // Detect language
    const language = this.detectLanguage(text);
    
    // Get or create patient
    const patient = await this.getOrCreatePatient(phone, contact, language);
    
    // Process intent
    const intent = this.extractIntent(text, language);
    
    // Handle different intents
    switch (intent) {
      case 'book_appointment':
        await this.handleBookingIntent(patient, text);
        break;
      case 'cancel_appointment':
        await this.handleCancelIntent(patient, text);
        break;
      case 'reschedule_appointment':
        await this.handleRescheduleIntent(patient, text);
        break;
      default:
        await this.sendMainMenu(patient.phone, language);
    }
  }

  private detectLanguage(text: string): 'en' | 'ur' {
    // Simple language detection logic
    const urduPattern = /[\u0600-\u06FF]/;
    return urduPattern.test(text) ? 'ur' : 'en';
  }
}
```

### 5.2 Google Sheets API Integration

#### 5.2.1 Google Sheets Service Implementation
```typescript
// services/google-sheets-service.ts
import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Patient, Appointment } from '../types';

export class GoogleSheetsService {
  private readonly auth: JWT;
  private readonly sheets: sheets_v4.Sheets;

  constructor() {
    this.auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async getPatients(spreadsheetId: string): Promise<Patient[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Patients!A2:M', // Skip header row
      });

      const rows = response.data.values || [];
      return rows.map(this.mapRowToPatient);
    } catch (error) {
      throw new AppError('Failed to fetch patients from Google Sheets', 500);
    }
  }

  async addPatient(spreadsheetId: string, patient: Patient): Promise<void> {
    const values = [
      [
        patient.id,
        patient.name,
        patient.phone,
        patient.email,
        patient.dateOfBirth,
        patient.gender,
        patient.address,
        patient.emergencyContact,
        patient.medicalConditions,
        patient.allergies,
        patient.preferredLanguage,
        new Date().toISOString(),
        new Date().toISOString(),
      ],
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Patients!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch (error) {
      throw new AppError('Failed to add patient to Google Sheets', 500);
    }
  }

  async updateAppointment(
    spreadsheetId: string,
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<void> {
    // Find appointment row by ID
    const appointments = await this.getAppointments(spreadsheetId);
    const rowIndex = appointments.findIndex(apt => apt.id === appointmentId);
    
    if (rowIndex === -1) {
      throw new AppError('Appointment not found', 404);
    }

    // Update specific cells
    const range = `Appointments!A${rowIndex + 2}:O${rowIndex + 2}`;
    const updatedAppointment = { ...appointments[rowIndex], ...updates };
    
    const values = [this.mapAppointmentToRow(updatedAppointment)];

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });
    } catch (error) {
      throw new AppError('Failed to update appointment in Google Sheets', 500);
    }
  }

  private mapRowToPatient(row: any[]): Patient {
    return {
      id: row[0],
      name: row[1],
      phone: row[2],
      email: row[3],
      dateOfBirth: row[4],
      gender: row[5],
      address: row[6],
      emergencyContact: row[7],
      medicalConditions: row[8],
      allergies: row[9],
      preferredLanguage: row[10],
      createdAt: new Date(row[11]),
      updatedAt: new Date(row[12]),
    };
  }
}
```

### 5.3 Email Service Integration

#### 5.3.1 SendGrid Integration
```typescript
// services/email-service.ts
import sgMail from '@sendgrid/mail';
import { EmailTemplate, SendEmailOptions } from '../types/email';

export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const msg = {
      to: options.to,
      from: process.env.FROM_EMAIL!,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw new AppError('Failed to send email', 500);
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });
  }
}
```

## 6. Performance Requirements

### 6.1 API Response Time Benchmarks
```typescript
// Performance requirements and benchmarks
const PERFORMANCE_BENCHMARKS = {
  // API Response Times (95th percentile)
  'GET /patients': 200, // ms
  'POST /patients': 300, // ms
  'GET /appointments': 250, // ms
  'POST /appointments': 400, // ms
  'WhatsApp webhook processing': 500, // ms
  'Google Sheets sync': 1000, // ms
  
  // Database Query Times
  'Patient lookup by phone': 50, // ms
  'Appointment availability check': 100, // ms
  'Bulk data operations': 500, // ms
  
  // Frontend Performance
  'Initial page load': 2000, // ms
  'Navigation between pages': 200, // ms
  'Dashboard data refresh': 500, // ms
};
```

### 6.2 Performance Monitoring Implementation
```typescript
// middleware/performance-monitor.ts
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - startTime;
    const route = `${req.method} ${req.route?.path || req.path}`;
    
    // Log performance metrics
    console.log(`Performance: ${route} - ${duration.toFixed(2)}ms`);
    
    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to New Relic, DataDog, etc.
      sendPerformanceMetric(route, duration);
    }
    
    // Alert if threshold exceeded
    const threshold = PERFORMANCE_BENCHMARKS[route];
    if (threshold && duration > threshold) {
      console.warn(`Performance threshold exceeded: ${route} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    }
  });
  
  next();
};
```

### 6.3 Caching Strategy Implementation
```typescript
// services/cache-service.ts
import Redis from 'ioredis';

export class CacheService {
  private readonly redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Cache decorators for common patterns
  cachePatientData(organizationId: string): string {
    return `patients:${organizationId}`;
  }

  cacheAppointments(organizationId: string, date: string): string {
    return `appointments:${organizationId}:${date}`;
  }

  cacheProviderSchedule(providerId: string, date: string): string {
    return `schedule:${providerId}:${date}`;
  }
}
```

## 7. Testing Strategy

### 7.1 Testing Framework Setup

#### 7.1.1 Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/config/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
};
```

#### 7.1.2 Testing Database Setup
```typescript
// tests/setup.ts
import { Pool } from 'pg';
import Redis from 'ioredis';

let testDb: Pool;
let testRedis: Redis;

beforeAll(async () => {
  // Setup test database
  testDb = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  
  // Setup test Redis
  testRedis = new Redis(process.env.TEST_REDIS_URL);
  
  // Run migrations
  await runMigrations(testDb);
});

afterAll(async () => {
  await testDb.end();
  await testRedis.quit();
});

beforeEach(async () => {
  // Clean database between tests
  await cleanDatabase(testDb);
  await testRedis.flushall();
});
```

### 7.2 Unit Testing Examples

#### 7.2.1 Service Layer Tests
```typescript
// tests/unit/services/patient-service.test.ts
import { PatientService } from '../../../src/services/patient-service';
import { PatientRepository } from '../../../src/repositories/patient-repository';
import { GoogleSheetsService } from '../../../src/services/google-sheets-service';
import { AppError } from '../../../src/utils/app-error';

// Mock dependencies
jest.mock('../../../src/repositories/patient-repository');
jest.mock('../../../src/services/google-sheets-service');

describe('PatientService', () => {
  let patientService: PatientService;
  let mockPatientRepo: jest.Mocked<PatientRepository>;
  let mockGoogleSheets: jest.Mocked<GoogleSheetsService>;

  beforeEach(() => {
    mockPatientRepo = new PatientRepository() as jest.Mocked<PatientRepository>;
    mockGoogleSheets = new GoogleSheetsService() as jest.Mocked<GoogleSheetsService>;
    patientService = new PatientService();
    
    // Inject mocks
    (patientService as any).patientRepository = mockPatientRepo;
    (patientService as any).googleSheetsService = mockGoogleSheets;
  });

  describe('createPatient', () => {
    it('should create a new patient successfully', async () => {
      // Arrange
      const patientData = {
        name: 'John Doe',
        phone: '+1234567890',
        organizationId: 'org-123',
      };

      mockPatientRepo.findByPhone.mockResolvedValue(null);
      mockGoogleSheets.addPatient.mockResolvedValue();
      mockPatientRepo.create.mockResolvedValue({
        id: 'patient-123',
        ...patientData,
      });

      // Act
      const result = await patientService.createPatient(patientData);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(patientData.name);
      expect(mockGoogleSheets.addPatient).toHaveBeenCalledWith(
        patientData.organizationId,
        patientData
      );
    });

    it('should throw error if patient already exists', async () => {
      // Arrange
      const patientData = {
        name: 'John Doe',
        phone: '+1234567890',
        organizationId: 'org-123',
      };

      mockPatientRepo.findByPhone.mockResolvedValue({
        id: 'existing-patient',
        ...patientData,
      });

      // Act & Assert
      await expect(patientService.createPatient(patientData))
        .rejects
        .toThrow(new AppError('Patient with this phone number already exists', 409));
    });
  });
});
```

#### 7.2.2 Controller Tests
```typescript
// tests/unit/controllers/patient-controller.test.ts
import { Request, Response } from 'express';
import { PatientController } from '../../../src/controllers/patient-controller';
import { PatientService } from '../../../src/services/patient-service';

jest.mock('../../../src/services/patient-service');

describe('PatientController', () => {
  let patientController: PatientController;
  let mockPatientService: jest.Mocked<PatientService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockPatientService = new PatientService() as jest.Mocked<PatientService>;
    patientController = new PatientController();
    (patientController as any).patientService = mockPatientService;

    mockReq = {
      user: { organizationId: 'org-123' },
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getPatients', () => {
    it('should return paginated patients list', async () => {
      // Arrange
      const patientsData = {
        patients: [
          { id: '1', name: 'John Doe', phone: '+1234567890' },
          { id: '2', name: 'Jane Smith', phone: '+0987654321' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };

      mockPatientService.getPatients.mockResolvedValue(patientsData);

      // Act
      await patientController.getPatients(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: patientsData,
      });
    });
  });
});
```

### 7.3 Integration Testing

#### 7.3.1 API Endpoint Tests
```typescript
// tests/integration/patients.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestDb, cleanupTestDb, createTestUser } from '../helpers/db';

describe('Patients API', () => {
  let authToken: string;
  let organizationId: string;

  beforeAll(async () => {
    await setupTestDb();
    
    const testUser = await createTestUser({
      email: 'test@example.com',
      role: 'admin',
    });
    
    authToken = generateTestToken(testUser);
    organizationId = testUser.organizationId;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /patients', () => {
    it('should create a new patient', async () => {
      const patientData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
      };

      const response = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.patient.name).toBe(patientData.name);
      expect(response.body.data.patient.phone).toBe(patientData.phone);
    });

    it('should return 409 for duplicate phone number', async () => {
      const patientData = {
        name: 'Jane Doe',
        phone: '+1234567890', // Same as previous test
        email: 'jane@example.com',
      };

      await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData)
        .expect(409);
    });
  });

  describe('GET /patients', () => {
    it('should return patients with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/patients?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.patients).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.page).toBe(1);
    });
  });
});
```

### 7.4 E2E Testing with Cypress

#### 7.4.1 Cypress Configuration
```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshot: false,
    setupNodeEvents(on, config) {
      // Setup plugins
      on('task', {
        seedDatabase: () => {
          // Seed test data
          return null;
        },
        clearDatabase: () => {
          // Clear test data
          return null;
        },
      });
    },
  },
});
```

#### 7.4.2 E2E Test Example
```typescript
// cypress/e2e/patient-management.cy.ts
describe('Patient Management', () => {
  beforeEach(() => {
    cy.task('clearDatabase');
    cy.task('seedDatabase');
    cy.login('admin@drsync.health', 'password');
  });

  it('should create a new patient', () => {
    cy.visit('/patients');
    
    // Click "Add Patient" button
    cy.get('[data-cy=add-patient-btn]').click();
    
    // Fill out the form
    cy.get('[data-cy=patient-name]').type('John Doe');
    cy.get('[data-cy=patient-phone]').type('+1234567890');
    cy.get('[data-cy=patient-email]').type('john@example.com');
    
    // Submit the form
    cy.get('[data-cy=submit-btn]').click();
    
    // Verify success
    cy.get('[data-cy=success-message]').should('be.visible');
    cy.get('[data-cy=patient-list]').should('contain', 'John Doe');
  });

  it('should search for patients', () => {
    cy.visit('/patients');
    
    // Enter search term
    cy.get('[data-cy=search-input]').type('John');
    
    // Verify filtered results
    cy.get('[data-cy=patient-list]').should('contain', 'John Doe');
    cy.get('[data-cy=patient-list]').should('not.contain', 'Jane Smith');
  });
});
```

## 8. Development Workflow

### 8.1 Git Workflow

#### 8.1.1 Branch Naming Convention
```
Feature branches:    feature/JIRA-123-patient-registration
Bug fix branches:    bugfix/JIRA-456-appointment-validation
Hotfix branches:     hotfix/JIRA-789-whatsapp-webhook
Release branches:    release/v1.2.0
```

#### 8.1.2 Commit Message Convention
```
feat: add patient search functionality
fix: resolve WhatsApp webhook validation issue
docs: update API documentation for appointments
style: format code with prettier
refactor: extract appointment service logic
test: add unit tests for patient service
chore: update dependencies

Breaking changes:
feat!: change API response format for patients
```

#### 8.1.3 Pull Request Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] No new warnings or errors

## Screenshots (if applicable)

## Related Issues
Closes #123
```

### 8.2 Code Review Process

#### 8.2.1 Review Checklist
```markdown
## Code Review Checklist

### Functionality
- [ ] Code works as expected
- [ ] Edge cases are handled
- [ ] Error handling is appropriate

### Code Quality
- [ ] Code is readable and maintainable
- [ ] Follows project coding standards
- [ ] No code duplication
- [ ] Proper separation of concerns

### Performance
- [ ] No performance bottlenecks
- [ ] Database queries are optimized
- [ ] Appropriate caching implemented

### Security
- [ ] Input validation implemented
- [ ] Authentication/authorization correct
- [ ] No sensitive data exposed

### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] All tests pass

### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic is commented
- [ ] API documentation updated
```

### 8.3 Deployment Process

#### 8.3.1 Staging Deployment
```bash
# Automated staging deployment
git push origin develop
# This triggers:
# 1. Run all tests
# 2. Build Docker images
# 3. Deploy to staging environment
# 4. Run smoke tests
# 5. Notify team of deployment status
```

#### 8.3.2 Production Deployment
```bash
# Production deployment (requires approval)
git checkout main
git merge develop
git tag v1.2.0
git push origin main --tags
# This triggers:
# 1. Full test suite
# 2. Security scans
# 3. Build production images
# 4. Deploy with zero-downtime strategy
# 5. Run health checks
# 6. Send deployment notifications
```

## 9. Quality Assurance

### 9.1 Code Quality Gates

#### 9.1.1 Pre-commit Hooks (Husky)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

#### 9.1.2 SonarQube Configuration
```properties
# sonar-project.properties
sonar.projectKey=drsync-backend
sonar.organization=drsync
sonar.host.url=https://sonarcloud.io
sonar.login=${SONAR_TOKEN}
sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/*.test.ts,**/*.spec.ts,**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=coverage/test-results.xml
```

### 9.2 Performance Testing

#### 9.2.1 Load Testing with Artillery
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  variables:
    auth_token: "{{ $processEnvironment.TEST_AUTH_TOKEN }}"

scenarios:
  - name: "Patient CRUD operations"
    weight: 70
    flow:
      - get:
          url: "/api/v1/patients"
          headers:
            Authorization: "Bearer {{ auth_token }}"
      - post:
          url: "/api/v1/patients"
          headers:
            Authorization: "Bearer {{ auth_token }}"
          json:
            name: "Test Patient {{ $randomString() }}"
            phone: "+{{ $randomNumber(1000000000, 9999999999) }}"

  - name: "Appointment operations"
    weight: 30
    flow:
      - get:
          url: "/api/v1/appointments"
          headers:
            Authorization: "Bearer {{ auth_token }}"
```

### 9.3 Security Testing

#### 9.3.1 OWASP ZAP Integration
```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on:
  pull_request:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start application
        run: docker-compose up -d
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

## 10. Implementation Guidelines

### 10.1 Error Handling Standards

#### 10.1.1 Custom Error Classes
```typescript
// utils/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;

  constructor(
    message: string,
    statusCode = 500,
    errorCode?: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}
```

#### 10.1.2 Global Error Handler
```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError = error as AppError;

  // Convert known errors to AppError
  if (!appError.isOperational) {
    if (error.name === 'ValidationError') {
      appError = new AppError('Validation failed', 400);
    } else if (error.name === 'CastError') {
      appError = new AppError('Invalid data format', 400);
    } else {
      appError = new AppError('Internal server error', 500);
    }
  }

  // Log error
  logger.error('Error occurred:', {
    message: appError.message,
    statusCode: appError.statusCode,
    stack: appError.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send error response
  res.status(appError.statusCode).json({
    status: 'error',
    message: appError.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
    }),
  });
};
```

### 10.2 Logging Standards

#### 10.2.1 Logger Configuration
```typescript
// utils/logger.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'drsync-api' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Structured logging helpers
export const loggers = {
  request: (req: Request, res: Response, duration: number) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  },

  whatsapp: (action: string, phone: string, success: boolean) => {
    logger.info('WhatsApp Action', {
      action,
      phone,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  appointment: (action: string, appointmentId: string, userId: string) => {
    logger.info('Appointment Action', {
      action,
      appointmentId,
      userId,
      timestamp: new Date().toISOString(),
    });
  },
};
```

### 10.3 Environment Management

#### 10.3.1 Configuration Validation
```typescript
// config/environment.ts
import Joi from 'joi';

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  WHATSAPP_VERIFY_TOKEN: Joi.string().required(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().required(),
  GOOGLE_CLIENT_EMAIL: Joi.string().email().required(),
  GOOGLE_PRIVATE_KEY: Joi.string().required(),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    url: envVars.DATABASE_URL,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN || '24h',
  },
  whatsapp: {
    verifyToken: envVars.WHATSAPP_VERIFY_TOKEN,
    accessToken: envVars.WHATSAPP_ACCESS_TOKEN,
    appId: envVars.WHATSAPP_APP_ID,
    appSecret: envVars.WHATSAPP_APP_SECRET,
  },
  google: {
    clientEmail: envVars.GOOGLE_CLIENT_EMAIL,
    privateKey: envVars.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    projectId: envVars.GOOGLE_PROJECT_ID,
  },
};
```

---

**Document Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Development Lead | | | |
| Senior Developer | | | |
| QA Lead | | | |

**Change History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 2025 | Development Team | Initial version |
