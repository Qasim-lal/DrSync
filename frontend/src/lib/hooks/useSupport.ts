import useSWR, { mutate } from 'swr';
import type {
  Ticket,
  TicketFilters,
  TicketStatistics,
  Article,
  ArticleFilters,
  KBStatistics,
  EmailTemplate,
  Broadcast,
  Notification,
  Communication,
  CommunicationFilters,
  CommunicationStatistics,
  WhatsAppTestResult,
  SheetsTestResult,
  SyncResult,
  DiagnosticsResult,
  Dispute,
  SetupResult,
  SupportMetrics,
  VolumeTrends,
  CategoryAnalysis,
  TeamPerformance,
  SLACompliance,
  SummaryReport,
} from '../types/support';
import * as supportApi from '../api/support';

// ========== Support Tickets ==========

/**
 * Hook to fetch all tickets with optional filters
 */
export function useTickets(filters?: TicketFilters) {
  const key = filters ? ['/support/tickets', filters] : '/support/tickets';

  const { data, error, isLoading } = useSWR<Ticket[]>(
    key,
    () => supportApi.getTickets(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    tickets: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch a single ticket by ID
 */
export function useTicket(id: string | null) {
  const { data, error, isLoading } = useSWR<Ticket>(
    id ? `/support/tickets/${id}` : null,
    () => (id ? supportApi.getTicketById(id) : null),
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Auto-refresh for live updates
    }
  );

  const refresh = () => id && mutate(`/support/tickets/${id}`);

  return {
    ticket: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch ticket statistics
 */
export function useTicketStats() {
  const { data, error, isLoading } = useSWR<TicketStatistics>(
    '/support/tickets/statistics',
    supportApi.getTicketStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  const refresh = () => mutate('/support/tickets/statistics');

  return {
    ticketStats: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Knowledge Base ==========

/**
 * Hook to fetch all KB articles with optional filters
 */
export function useArticles(filters?: ArticleFilters) {
  const key = filters
    ? ['/support/knowledge-base/articles', filters]
    : '/support/knowledge-base/articles';

  const { data, error, isLoading } = useSWR<Article[]>(
    key,
    () => supportApi.getArticles(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    articles: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch a single KB article by ID
 */
export function useArticle(id: string | null) {
  const { data, error, isLoading } = useSWR<Article>(
    id ? `/support/knowledge-base/articles/${id}` : null,
    () => (id ? supportApi.getArticleById(id) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => id && mutate(`/support/knowledge-base/articles/${id}`);

  return {
    article: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch KB statistics
 */
export function useKBStats() {
  const { data, error, isLoading } = useSWR<KBStatistics>(
    '/support/knowledge-base/statistics',
    supportApi.getKBStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 300000, // Refresh every 5 minutes
    }
  );

  const refresh = () => mutate('/support/knowledge-base/statistics');

  return {
    kbStats: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Email Templates ==========

/**
 * Hook to fetch email templates
 */
export function useTemplates(category?: string) {
  const key = category
    ? ['/support/email-templates', category]
    : '/support/email-templates';

  const { data, error, isLoading } = useSWR<EmailTemplate[]>(
    key,
    () => supportApi.getTemplates(category),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    templates: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch a single email template by ID
 */
export function useTemplate(id: string | null) {
  const { data, error, isLoading } = useSWR<EmailTemplate>(
    id ? `/support/email-templates/${id}` : null,
    () => (id ? supportApi.getTemplateById(id) : null),
    {
      revalidateOnFocus: false,
    }
  );

  const refresh = () => id && mutate(`/support/email-templates/${id}`);

  return {
    template: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Communications ==========

/**
 * Hook to fetch communication history
 */
export function useCommunicationHistory(filters?: CommunicationFilters) {
  const key = filters
    ? ['/support/communications/history', filters]
    : '/support/communications/history';

  const { data, error, isLoading } = useSWR<Communication[]>(
    key,
    () => supportApi.getCommunicationHistory(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refresh = () => mutate(key);

  return {
    communications: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch communication statistics
 */
export function useCommunicationStats() {
  const { data, error, isLoading } = useSWR<CommunicationStatistics>(
    '/support/communications/statistics',
    supportApi.getCommunicationStats,
    {
      revalidateOnFocus: false,
      refreshInterval: 60000,
    }
  );

  const refresh = () => mutate('/support/communications/statistics');

  return {
    communicationStats: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Support Analytics ==========

/**
 * Hook to fetch support metrics
 */
export function useSupportMetrics(period: string = '30d') {
  const { data, error, isLoading } = useSWR<SupportMetrics>(
    ['/support/analytics/metrics', period],
    () => supportApi.getSupportMetrics(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/support/analytics/metrics', period]);

  return {
    supportMetrics: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch ticket volume trends
 */
export function useTicketVolumeTrends(
  days: number = 30,
  granularity: 'day' | 'week' | 'month' = 'day'
) {
  const { data, error, isLoading } = useSWR<VolumeTrends>(
    ['/support/analytics/volume-trends', days, granularity],
    () => supportApi.getTicketVolumeTrends(days, granularity),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () =>
    mutate(['/support/analytics/volume-trends', days, granularity]);

  return {
    volumeTrends: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch category analysis
 */
export function useCategoryAnalysis(period: string = '30d') {
  const { data, error, isLoading } = useSWR<CategoryAnalysis>(
    ['/support/analytics/categories', period],
    () => supportApi.getCategoryAnalysis(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/support/analytics/categories', period]);

  return {
    categoryAnalysis: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch team performance metrics
 */
export function useTeamPerformance(period: string = '30d') {
  const { data, error, isLoading } = useSWR<TeamPerformance>(
    ['/support/analytics/team-performance', period],
    () => supportApi.getTeamPerformance(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () =>
    mutate(['/support/analytics/team-performance', period]);

  return {
    teamPerformance: data,
    isLoading,
    isError: error,
    refresh,
  };
}

/**
 * Hook to fetch SLA compliance data
 */
export function useSLACompliance(period: string = '30d') {
  const { data, error, isLoading } = useSWR<SLACompliance>(
    ['/support/analytics/sla-compliance', period],
    () => supportApi.getSLACompliance(period),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const refresh = () => mutate(['/support/analytics/sla-compliance', period]);

  return {
    slaCompliance: data,
    isLoading,
    isError: error,
    refresh,
  };
}

// ========== Mutations ==========

/**
 * Hook with mutations for ticket actions
 */
export function useTicketActions() {
  const createTicket = async (data: Partial<Ticket>) => {
    const ticket = await supportApi.createTicket(data);
    mutate('/support/tickets');
    mutate('/support/tickets/statistics');
    return ticket;
  };

  const updateTicket = async (id: string, updates: Partial<Ticket>) => {
    const ticket = await supportApi.updateTicket(id, updates);
    mutate(`/support/tickets/${id}`);
    mutate('/support/tickets');
    mutate('/support/tickets/statistics');
    return ticket;
  };

  const assignTicket = async (id: string, assigneeId: string) => {
    await supportApi.assignTicket(id, assigneeId);
    mutate(`/support/tickets/${id}`);
    mutate('/support/tickets');
  };

  const addTicketResponse = async (
    id: string,
    response: string,
    isInternal?: boolean
  ) => {
    await supportApi.addTicketResponse(id, response, isInternal);
    mutate(`/support/tickets/${id}`);
  };

  return {
    createTicket,
    updateTicket,
    assignTicket,
    addTicketResponse,
  };
}

/**
 * Hook with mutations for KB article actions
 */
export function useArticleActions() {
  const createArticle = async (data: Partial<Article>) => {
    const article = await supportApi.createArticle(data);
    mutate('/support/knowledge-base/articles');
    mutate('/support/knowledge-base/statistics');
    return article;
  };

  const updateArticle = async (id: string, updates: Partial<Article>) => {
    const article = await supportApi.updateArticle(id, updates);
    mutate(`/support/knowledge-base/articles/${id}`);
    mutate('/support/knowledge-base/articles');
    return article;
  };

  const deleteArticle = async (id: string) => {
    await supportApi.deleteArticle(id);
    mutate('/support/knowledge-base/articles');
    mutate('/support/knowledge-base/statistics');
  };

  return {
    createArticle,
    updateArticle,
    deleteArticle,
  };
}

/**
 * Hook with mutations for email template actions
 */
export function useTemplateActions() {
  const createTemplate = async (data: Partial<EmailTemplate>) => {
    const template = await supportApi.createTemplate(data);
    mutate('/support/email-templates');
    return template;
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<EmailTemplate>
  ) => {
    const template = await supportApi.updateTemplate(id, updates);
    mutate(`/support/email-templates/${id}`);
    mutate('/support/email-templates');
    return template;
  };

  const deleteTemplate = async (id: string) => {
    await supportApi.deleteTemplate(id);
    mutate('/support/email-templates');
  };

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

/**
 * Hook with mutations for communication actions
 */
export function useCommunicationActions() {
  const sendBroadcast = async (data: Partial<Broadcast>) => {
    const broadcast = await supportApi.sendBroadcast(data);
    mutate('/support/communications/history');
    mutate('/support/communications/statistics');
    return broadcast;
  };

  const sendNotification = async (data: Notification) => {
    await supportApi.sendNotification(data);
    mutate('/support/communications/history');
    mutate('/support/communications/statistics');
  };

  return {
    sendBroadcast,
    sendNotification,
  };
}

/**
 * Hook with mutations for organization assistance actions
 */
export function useAssistanceActions() {
  const testWhatsAppConfig = async (orgId: string, sendTest: boolean = false) => {
    const result = await supportApi.testWhatsAppConfig(orgId, sendTest);
    return result;
  };

  const testSheetsConnection = async (orgId: string, triggerSync: boolean = false) => {
    const result = await supportApi.testSheetsConnection(orgId, triggerSync);
    return result;
  };

  const triggerManualSync = async (orgId: string) => {
    const result = await supportApi.triggerManualSync(orgId);
    return result;
  };

  const runDiagnostics = async (orgId: string) => {
    const result = await supportApi.runDiagnostics(orgId);
    return result;
  };

  const handleBillingDispute = async (
    orgId: string,
    details: Partial<Dispute>
  ) => {
    const dispute = await supportApi.handleBillingDispute(orgId, details);
    return dispute;
  };

  const remoteSetupCompletion = async (
    orgId: string,
    options: {
      completeWhatsApp?: boolean;
      completeSheets?: boolean;
      addDefaultProvider?: boolean;
      createSampleData?: boolean;
    }
  ) => {
    const result = await supportApi.remoteSetupCompletion(orgId, options);
    return result;
  };

  const sendSetupReminder = async (
    orgId: string,
    type: 'whatsapp' | 'sheets' | 'general'
  ) => {
    await supportApi.sendSetupReminder(orgId, type);
  };

  return {
    testWhatsAppConfig,
    testSheetsConnection,
    triggerManualSync,
    runDiagnostics,
    handleBillingDispute,
    remoteSetupCompletion,
    sendSetupReminder,
  };
}

/**
 * Hook with mutations for support analytics actions
 */
export function useSupportAnalyticsActions() {
  const generateSummaryReport = async (
    type: 'daily' | 'weekly' | 'monthly',
    date?: string
  ) => {
    const report = await supportApi.generateSummaryReport(type, date);
    return report;
  };

  return {
    generateSummaryReport,
  };
}
