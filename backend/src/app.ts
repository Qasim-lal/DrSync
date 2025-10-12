import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import appointmentRoutes from './routes/appointments';
import providerRoutes from './routes/providers';
import analyticsRoutes from './routes/analytics';
import billingRoutes from './routes/billing';
import migrationRoutes from './routes/migration';
import rbacTestRoutes from './routes/rbac-test';
import organizationRoutes from './routes/organizations';
import validationRoutes from './routes/validation';
import configurationRoutes from './routes/configuration';
import invitationRoutes from './routes/invitations';
import superAdminRoutes from './routes/superAdmin';
import communicationRoutes from './routes/communicationRoutes';
import assistanceRoutes from './routes/assistanceRoutes';
import supportAnalyticsRoutes from './routes/supportAnalyticsRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(limiter);

// Body parsing and cookie middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression and logging
app.use(compression());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Root route with API information
app.get('/', (_req, res) => {
  res.json({
    name: 'DrSync API',
    version: '1.0.0',
    description: 'Healthcare Appointment Management System API',
    status: 'running',
    endpoints: {
      health: '/health',
      documentation: '/api/docs',
      api: {
        auth: '/api/auth',
        patients: '/api/patients',
        appointments: '/api/appointments',
        providers: '/api/providers',
        analytics: '/api/analytics',
        billing: '/api/billing',
        migration: '/api/migration',
        organizations: '/api/organizations',
        validation: '/api/validation',
        configuration: '/api/configuration',
        invitations: '/api/invitations',
        superAdmin: '/api/super-admin',
        communications: '/api/communications',
      }
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check route (no auth required)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/rbac-test', rbacTestRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/super-admin/support', assistanceRoutes);
app.use('/api/super-admin/support', supportAnalyticsRoutes);

// API documentation
app.get('/api/docs', (_req, res) => {
  res.json({
    message: 'DrSync API Documentation',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      patients: '/api/patients',
      appointments: '/api/appointments',
      providers: '/api/providers',
      analytics: '/api/analytics',
      billing: '/api/billing',
      migration: '/api/migration',
      organizations: '/api/organizations',
      validation: '/api/validation',
      configuration: '/api/configuration',
      invitations: '/api/invitations',
      superAdmin: '/api/super-admin',
      communications: '/api/communications',
    },
    documentation: 'See /docs/DrSync_API_Documentation.md for detailed API documentation'
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

export { app };