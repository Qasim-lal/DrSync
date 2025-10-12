// System Health Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number; // percentage
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    whatsapp: ServiceStatus;
    googleSheets: ServiceStatus;
    email: ServiceStatus;
    storage: ServiceStatus;
  };
  metrics: {
    averageResponseTime: number; // ms
    errorRate: number; // percentage
    requestsPerSecond: number;
    activeConnections: number;
  };
  alerts: SystemAlert[];
  lastUpdated: string;
}

export interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  uptime: number; // percentage
  responseTime: number; // ms
  lastChecked: string;
  incidents?: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    occurredAt: string;
  }[];
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  occurredAt: string;
  resolvedAt?: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

// Usage Analytics Types
export interface UsageAnalytics {
  period: string;
  users: {
    dau: number; // daily active users
    mau: number; // monthly active users
    dauMauRatio: number;
    newUsers: number;
    returningUsers: number;
    churnedUsers: number;
  };
  engagement: {
    averageSessionDuration: number; // minutes
    sessionsPerUser: number;
    actionsPerSession: number;
    bounceRate: number; // percentage
  };
  features: {
    feature: string;
    usage: number;
    uniqueUsers: number;
    growthRate: number; // percentage
  }[];
  apiUsage: {
    totalRequests: number;
    averageResponseTime: number; // ms
    errorRate: number; // percentage
    topEndpoints: {
      endpoint: string;
      requests: number;
      avgResponseTime: number;
    }[];
  };
  timeSeries: {
    date: string;
    dau: number;
    sessions: number;
    apiRequests: number;
  }[];
}

// Growth Analytics Types
export interface GrowthAnalytics {
  period: string;
  signups: {
    total: number;
    growth: number; // percentage
    bySources: {
      source: string;
      count: number;
      percentage: number;
    }[];
    byRegion: {
      region: string;
      count: number;
      percentage: number;
    }[];
    conversionFunnel: ConversionFunnel;
  };
  retention: {
    day1: number; // percentage
    day7: number;
    day30: number;
    cohortAnalysis: CohortData[];
  };
  activation: {
    rate: number; // percentage
    timeToActivation: number; // days
    activationSteps: {
      step: string;
      completionRate: number;
      averageTimeToComplete: number; // minutes
    }[];
  };
  viralMetrics: {
    viralCoefficient: number;
    invitesSent: number;
    invitesAccepted: number;
    inviteConversionRate: number; // percentage
  };
}

export interface ConversionFunnel {
  steps: {
    step: string;
    users: number;
    conversionRate: number; // percentage from previous step
    dropoffRate: number; // percentage
  }[];
  overallConversionRate: number; // percentage from first to last step
}

export interface CohortData {
  cohort: string; // e.g., "2024-01"
  users: number;
  retention: {
    week0: number; // percentage
    week1: number;
    week2: number;
    week3: number;
    week4: number;
    [key: string]: number; // for additional weeks
  };
}

// Performance Benchmarks Types
export interface Benchmarks {
  performance: {
    apiResponseTime: BenchmarkMetric;
    pageLoadTime: BenchmarkMetric;
    databaseQueryTime: BenchmarkMetric;
    uptime: BenchmarkMetric;
  };
  business: {
    conversionRate: BenchmarkMetric;
    churnRate: BenchmarkMetric;
    customerLifetimeValue: BenchmarkMetric;
    monthlyRecurringRevenue: BenchmarkMetric;
  };
  engagement: {
    dailyActiveUsers: BenchmarkMetric;
    sessionDuration: BenchmarkMetric;
    returnRate: BenchmarkMetric;
    featuresAdoption: BenchmarkMetric;
  };
  comparisonDate: string;
}

export interface BenchmarkMetric {
  current: number;
  previous: number;
  change: number; // percentage
  trend: 'improving' | 'declining' | 'stable';
  target?: number;
  industry?: {
    average: number;
    top10: number;
    top25: number;
  };
}

// Chart Data Types
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface MultiSeriesData {
  timestamp: string;
  [key: string]: number | string; // dynamic series names
}
