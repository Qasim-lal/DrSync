import apiClient from './client';
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

const BASE_PATH = '/super-admin/support';

// ========== Support Tickets ==========

/**
 * Create a new support ticket
 */
export async function createTicket(data: Partial<Ticket>): Promise<Ticket> {
  const { data: ticket } = await apiClient.post<Ticket>(
    `${BASE_PATH}/tickets`,
    data
  );
  return ticket;
}

/**
 * Get all tickets with optional filters
 */
export async function getTickets(filters?: TicketFilters): Promise<Ticket[]> {
  const { data } = await apiClient.get<Ticket[]>(`${BASE_PATH}/tickets`, {
    params: filters,
  });
  return data;
}

/**
 * Get ticket by ID
 */
export async function getTicketById(id: string): Promise<Ticket> {
  const { data } = await apiClient.get<Ticket>(`${BASE_PATH}/tickets/${id}`);
  return data;
}

/**
 * Update a ticket
 */
export async function updateTicket(
  id: string,
  updates: Partial<Ticket>
): Promise<Ticket> {
  const { data } = await apiClient.patch<Ticket>(
    `${BASE_PATH}/tickets/${id}`,
    updates
  );
  return data;
}

/**
 * Assign ticket to an agent
 */
export async function assignTicket(
  id: string,
  assigneeId: string
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/tickets/${id}/assign`, { assigneeId });
}

/**
 * Add response to a ticket
 */
export async function addTicketResponse(
  id: string,
  response: string,
  isInternal?: boolean
): Promise<void> {
  await apiClient.post(`${BASE_PATH}/tickets/${id}/responses`, {
    response,
    isInternal,
  });
}

/**
 * Get ticket statistics
 */
export async function getTicketStats(): Promise<TicketStatistics> {
  const { data } = await apiClient.get<TicketStatistics>(
    `${BASE_PATH}/tickets/statistics`
  );
  return data;
}

// ========== Knowledge Base ==========

/**
 * Create a new KB article
 */
export async function createArticle(data: Partial<Article>): Promise<Article> {
  const { data: article } = await apiClient.post<Article>(
    `${BASE_PATH}/knowledge-base/articles`,
    data
  );
  return article;
}

/**
 * Get all KB articles with optional filters
 */
export async function getArticles(
  filters?: ArticleFilters
): Promise<Article[]> {
  const { data } = await apiClient.get<Article[]>(
    `${BASE_PATH}/knowledge-base/articles`,
    {
      params: filters,
    }
  );
  return data;
}

/**
 * Get KB article by ID
 */
export async function getArticleById(id: string): Promise<Article> {
  const { data } = await apiClient.get<Article>(
    `${BASE_PATH}/knowledge-base/articles/${id}`
  );
  return data;
}

/**
 * Update a KB article
 */
export async function updateArticle(
  id: string,
  updates: Partial<Article>
): Promise<Article> {
  const { data } = await apiClient.patch<Article>(
    `${BASE_PATH}/knowledge-base/articles/${id}`,
    updates
  );
  return data;
}

/**
 * Delete a KB article
 */
export async function deleteArticle(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/knowledge-base/articles/${id}`);
}

/**
 * Get KB statistics
 */
export async function getKBStats(): Promise<KBStatistics> {
  const { data } = await apiClient.get<KBStatistics>(
    `${BASE_PATH}/knowledge-base/statistics`
  );
  return data;
}

// ========== Email Templates ==========

/**
 * Create a new email template
 */
export async function createTemplate(
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  const { data: template } = await apiClient.post<EmailTemplate>(
    `${BASE_PATH}/email-templates`,
    data
  );
  return template;
}

/**
 * Get all email templates
 */
export async function getTemplates(
  category?: string
): Promise<EmailTemplate[]> {
  const { data } = await apiClient.get<EmailTemplate[]>(
    `${BASE_PATH}/email-templates`,
    {
      params: { category },
    }
  );
  return data;
}

/**
 * Get email template by ID
 */
export async function getTemplateById(id: string): Promise<EmailTemplate> {
  const { data } = await apiClient.get<EmailTemplate>(
    `${BASE_PATH}/email-templates/${id}`
  );
  return data;
}

/**
 * Update an email template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  const { data } = await apiClient.patch<EmailTemplate>(
    `${BASE_PATH}/email-templates/${id}`,
    updates
  );
  return data;
}

/**
 * Delete an email template
 */
export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/email-templates/${id}`);
}

// ========== Broadcast Communications ==========

/**
 * Send a broadcast message
 */
export async function sendBroadcast(
  data: Partial<Broadcast>
): Promise<Broadcast> {
  const { data: broadcast } = await apiClient.post<Broadcast>(
    `${BASE_PATH}/communications/broadcast`,
    data
  );
  return broadcast;
}

/**
 * Send a notification
 */
export async function sendNotification(data: Notification): Promise<void> {
  await apiClient.post(`${BASE_PATH}/communications/notifications`, data);
}

/**
 * Get communication history
 */
export async function getCommunicationHistory(
  filters?: CommunicationFilters
): Promise<Communication[]> {
  const { data } = await apiClient.get<Communication[]>(
    `${BASE_PATH}/communications/history`,
    {
      params: filters,
    }
  );
  return data;
}

/**
 * Get communication statistics
 */
export async function getCommunicationStats(): Promise<CommunicationStatistics> {
  const { data } = await apiClient.get<CommunicationStatistics>(
    `${BASE_PATH}/communications/statistics`
  );
  return data;
}

// ========== Organization Assistance ==========

/**
 * Test WhatsApp configuration
 */
export async function testWhatsAppConfig(
  orgId: string,
  sendTest: boolean = false
): Promise<WhatsAppTestResult> {
  const { data } = await apiClient.post<WhatsAppTestResult>(
    `${BASE_PATH}/assistance/organizations/${orgId}/test-whatsapp`,
    { sendTest }
  );
  return data;
}

/**
 * Test Google Sheets connection
 */
export async function testSheetsConnection(
  orgId: string,
  triggerSync: boolean = false
): Promise<SheetsTestResult> {
  const { data } = await apiClient.post<SheetsTestResult>(
    `${BASE_PATH}/assistance/organizations/${orgId}/test-sheets`,
    { triggerSync }
  );
  return data;
}

/**
 * Trigger manual Google Sheets sync
 */
export async function triggerManualSync(orgId: string): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>(
    `${BASE_PATH}/assistance/organizations/${orgId}/sync`
  );
  return data;
}

/**
 * Run diagnostics for an organization
 */
export async function runDiagnostics(
  orgId: string
): Promise<DiagnosticsResult> {
  const { data } = await apiClient.post<DiagnosticsResult>(
    `${BASE_PATH}/assistance/organizations/${orgId}/diagnostics`
  );
  return data;
}

/**
 * Handle a billing dispute
 */
export async function handleBillingDispute(
  orgId: string,
  details: Partial<Dispute>
): Promise<Dispute> {
  const { data } = await apiClient.post<Dispute>(
    `${BASE_PATH}/assistance/organizations/${orgId}/disputes`,
    details
  );
  return data;
}

/**
 * Complete setup remotely for an organization
 */
export async function remoteSetupCompletion(
  orgId: string,
  options: {
    completeWhatsApp?: boolean;
    completeSheets?: boolean;
    addDefaultProvider?: boolean;
    createSampleData?: boolean;
  }
): Promise<SetupResult> {
  const { data } = await apiClient.post<SetupResult>(
    `${BASE_PATH}/assistance/organizations/${orgId}/remote-setup`,
    options
  );
  return data;
}

/**
 * Send setup reminder to an organization
 */
export async function sendSetupReminder(
  orgId: string,
  type: 'whatsapp' | 'sheets' | 'general'
): Promise<void> {
  await apiClient.post(
    `${BASE_PATH}/assistance/organizations/${orgId}/setup-reminder`,
    { type }
  );
}

// ========== Support Analytics ==========

/**
 * Get support metrics
 */
export async function getSupportMetrics(
  period: string
): Promise<SupportMetrics> {
  const { data } = await apiClient.get<SupportMetrics>(
    `${BASE_PATH}/analytics/metrics`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get ticket volume trends
 */
export async function getTicketVolumeTrends(
  days: number,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<VolumeTrends> {
  const { data } = await apiClient.get<VolumeTrends>(
    `${BASE_PATH}/analytics/volume-trends`,
    {
      params: { days, granularity },
    }
  );
  return data;
}

/**
 * Get category analysis
 */
export async function getCategoryAnalysis(
  period: string
): Promise<CategoryAnalysis> {
  const { data } = await apiClient.get<CategoryAnalysis>(
    `${BASE_PATH}/analytics/categories`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get team performance metrics
 */
export async function getTeamPerformance(
  period: string
): Promise<TeamPerformance> {
  const { data } = await apiClient.get<TeamPerformance>(
    `${BASE_PATH}/analytics/team-performance`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Get SLA compliance data
 */
export async function getSLACompliance(period: string): Promise<SLACompliance> {
  const { data } = await apiClient.get<SLACompliance>(
    `${BASE_PATH}/analytics/sla-compliance`,
    {
      params: { period },
    }
  );
  return data;
}

/**
 * Generate summary report
 */
export async function generateSummaryReport(
  type: 'daily' | 'weekly' | 'monthly',
  date?: string
): Promise<SummaryReport> {
  const { data } = await apiClient.post<SummaryReport>(
    `${BASE_PATH}/analytics/reports`,
    {
      type,
      date,
    }
  );
  return data;
}
