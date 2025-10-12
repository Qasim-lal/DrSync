import { TicketStatus, TicketPriority, DateRangeFilter } from './api';

// Support Ticket Types
export interface Ticket {
  id: string;
  ticketNumber: string;
  organizationId: string;
  organizationName?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  assignedToId?: string;
  assignedToName?: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  responses: TicketResponse[];
  attachments?: TicketAttachment[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  firstResponseAt?: string;
  slaStatus?: 'met' | 'at_risk' | 'breached';
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: 'customer' | 'support_agent' | 'admin';
  message: string;
  isInternal: boolean;
  attachments?: TicketAttachment[];
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: string;
}

export interface TicketFilters extends DateRangeFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedToId?: string;
  organizationId?: string;
  search?: string;
}

export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    category: string;
    count: number;
  }[];
  averageResolutionTime: number; // hours
  averageFirstResponseTime: number; // hours
  slaCompliance: number; // percentage
}

// Knowledge Base Types
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  authorName: string;
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  relatedArticles?: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ArticleFilters {
  category?: string;
  status?: string;
  search?: string;
  tags?: string[];
}

export interface KBStatistics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  averageHelpfulness: number; // percentage
  byCategory: {
    category: string;
    count: number;
    views: number;
  }[];
  topArticles: {
    id: string;
    title: string;
    views: number;
    helpfulness: number;
  }[];
}

// Email Template Types
export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[]; // e.g., ["{{organizationName}}", "{{userName}}"]
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

// Broadcast Communication Types
export interface Broadcast {
  id: string;
  title: string;
  type: 'email' | 'notification' | 'sms';
  templateId?: string;
  recipientFilter: {
    status?: string[];
    subscriptionTier?: string[];
    tags?: string[];
    customQuery?: string;
  };
  recipientCount: number;
  content: {
    subject?: string;
    body: string;
    actionUrl?: string;
    actionText?: string;
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor?: string;
  sentAt?: string;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  failedCount?: number;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface Notification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  recipientFilter: {
    organizationIds?: string[];
    userRoles?: string[];
  };
}

export interface Communication {
  id: string;
  type: 'email' | 'notification' | 'sms' | 'broadcast';
  subject?: string;
  message: string;
  recipientId: string;
  recipientName?: string;
  recipientEmail?: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
}

export interface CommunicationFilters extends DateRangeFilter {
  type?: string;
  status?: string;
  recipientId?: string;
}

export interface CommunicationStatistics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number; // percentage
  openRate: number; // percentage
  clickRate: number; // percentage
  byType: {
    email: number;
    notification: number;
    sms: number;
    broadcast: number;
  };
}

// Organization Assistance Types
export interface WhatsAppTestResult {
  success: boolean;
  connected: boolean;
  phoneNumber?: string;
  businessName?: string;
  testMessageSent?: boolean;
  error?: string;
  lastTestedAt: string;
}

export interface SheetsTestResult {
  success: boolean;
  connected: boolean;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  lastSyncAt?: string;
  syncStats?: {
    patientsSynced: number;
    appointmentsSynced: number;
    billingRecordsSynced: number;
  };
  error?: string;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string;
  stats: {
    patientsSynced: number;
    appointmentsSynced: number;
    billingRecordsSynced: number;
    errors: number;
  };
  duration: number; // ms
  errors?: string[];
}

export interface DiagnosticsResult {
  organizationId: string;
  runAt: string;
  overall: 'healthy' | 'warning' | 'critical';
  checks: {
    name: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    details?: Record<string, any>;
  }[];
  recommendations: string[];
}

export interface Dispute {
  id: string;
  organizationId: string;
  organizationName: string;
  type: 'billing' | 'charge' | 'service' | 'other';
  amount?: number;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  assignedToId?: string;
  assignedToName?: string;
}

export interface SetupResult {
  success: boolean;
  organizationId: string;
  stepsCompleted: string[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}

// Support Analytics Types
export interface SupportMetrics {
  period: string;
  tickets: {
    total: number;
    new: number;
    resolved: number;
    reopened: number;
    averageResolutionTime: number; // hours
    averageFirstResponseTime: number; // hours
  };
  satisfaction: {
    averageRating: number; // 1-5
    responseRate: number; // percentage
    promoterScore: number; // NPS
  };
  workload: {
    totalAgents: number;
    activeAgents: number;
    averageTicketsPerAgent: number;
    averageHandlingTime: number; // hours
  };
}

export interface VolumeTrends {
  period: {
    start: string;
    end: string;
  };
  data: {
    date: string;
    ticketsCreated: number;
    ticketsResolved: number;
    ticketsClosed: number;
    backlog: number;
  }[];
  summary: {
    totalCreated: number;
    totalResolved: number;
    averageDaily: number;
    peakDay: string;
    peakVolume: number;
  };
}

export interface CategoryAnalysis {
  period: string;
  categories: {
    category: string;
    count: number;
    percentage: number;
    averageResolutionTime: number; // hours
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  topIssues: {
    issue: string;
    count: number;
    category: string;
  }[];
}

export interface TeamPerformance {
  period: string;
  agents: {
    id: string;
    name: string;
    ticketsHandled: number;
    ticketsResolved: number;
    averageResolutionTime: number; // hours
    averageRating: number; // 1-5
    firstResponseTime: number; // hours
    resolutionRate: number; // percentage
  }[];
  teamAverages: {
    ticketsPerAgent: number;
    resolutionTime: number;
    rating: number;
    firstResponseTime: number;
  };
}

export interface SLACompliance {
  period: string;
  overall: {
    compliance: number; // percentage
    breaches: number;
    atRisk: number;
  };
  byPriority: {
    priority: TicketPriority;
    targetTime: number; // hours
    compliance: number; // percentage
    breaches: number;
    averageTime: number; // hours
  }[];
  trends: {
    date: string;
    compliance: number;
    breaches: number;
  }[];
}

export interface SummaryReport {
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  generatedAt: string;
  metrics: SupportMetrics;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  attachments?: {
    name: string;
    url: string;
  }[];
}
