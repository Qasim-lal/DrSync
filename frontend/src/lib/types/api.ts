// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

// Common Filter Types
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Status Types
export type Status = 'active' | 'inactive' | 'suspended' | 'pending';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
