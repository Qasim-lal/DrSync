# TASK-038E: Super Admin Frontend Implementation Guide

**Date:** October 12, 2025  
**Status:** Implementation In Progress  
**Frontend Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts

---

## 📋 Complete Feature Mapping

This document maps ALL 60+ backend endpoints to their corresponding frontend pages and components.

---

## 1. TASK-038A: Organization Management (8 Endpoints)

### Pages Required:
- `/admin/organizations` - List page
- `/admin/organizations/[id]` - Detail page
- `/admin/organizations/[id]/config` - Configuration page

### API Services (`lib/api/organizations.ts`):
```typescript
// GET /api/super-admin/organizations
getOrganizations(filters?: OrganizationFilters): Promise<Organization[]>

// GET /api/super-admin/organizations/:id
getOrganizationById(id: string): Promise<Organization>

// GET /api/super-admin/organizations/:id/config
getOrganizationConfig(id: string): Promise<OrganizationConfig>

// GET /api/super-admin/organizations/:id/users
getOrganizationUsers(id: string): Promise<User[]>

// PATCH /api/super-admin/organizations/:id/status
updateOrganizationStatus(id: string, status: string): Promise<void>

// PATCH /api/super-admin/organizations/:id/limits
updateTrialLimits(id: string, limits: TrialLimits): Promise<void>

// POST /api/super-admin/organizations/:id/suspend
suspendOrganization(id: string, reason: string): Promise<void>

// GET /api/super-admin/statistics/organizations
getOrganizationStatistics(): Promise<Statistics>
```

### Components:
- `OrganizationTable` - List with filters
- `OrganizationCard` - Detail view
- `StatusBadge` - Status indicator
- `StatusUpdateModal` - Change status
- `LimitsEditor` - Edit trial limits
- `SuspendModal` - Suspend organization

---

## 2. TASK-038B: Billing & Subscriptions (18 Endpoints)

### Pages Required:
- `/admin/billing` - Dashboard
- `/admin/billing/transactions` - Transactions list
- `/admin/billing/invoices` - Invoices list
- `/admin/billing/trials` - Trial management
- `/admin/billing/revenue` - Revenue analytics

### API Services (`lib/api/billing.ts`):
```typescript
// Billing Dashboard
getBillingOverview(): Promise<BillingOverview>
getPaymentStatus(): Promise<PaymentStatusBreakdown>

// Transactions
getTransactions(filters?: TransactionFilters): Promise<Transaction[]>
retryPayment(transactionId: string): Promise<void>
processRefund(transactionId: string, amount: number): Promise<void>

// Subscriptions
getSubscriptionLifecycle(): Promise<SubscriptionLifecycle>
updateSubscription(id: string, plan: string): Promise<void>
suspendSubscription(id: string, reason: string): Promise<void>
reactivateSubscription(id: string): Promise<void>

// Trials
getTrialOverview(): Promise<TrialOverview>
getTrialAbuseDetection(): Promise<AbuseDetection[]>
getTrialUsage(orgId: string): Promise<TrialUsage>
extendTrial(orgId: string, days: number, reason: string): Promise<void>
getTrialConversions(period: number): Promise<TrialConversions>
getTrialsNeedingAction(): Promise<Trial[]>

// Invoices & Receipts
getInvoices(filters?: InvoiceFilters): Promise<Invoice[]>
previewInvoice(orgId: string): Promise<InvoicePreview>
generateInvoice(orgId: string): Promise<Invoice>
getReceipts(filters?: ReceiptFilters): Promise<Receipt[]>
generateReceipt(paymentId: string): Promise<Receipt>

// Revenue Analytics
getRevenueTrends(period: string): Promise<RevenueTrends>
getCustomerLTV(segmentation?: string): Promise<LTVAnalysis>
getChurnAnalysis(period: number): Promise<ChurnAnalysis>
getRevenueForecast(): Promise<RevenueForecast>
```

### Components:
- `BillingDashboard` - Overview cards
- `TransactionTable` - Transaction list
- `InvoiceGenerator` - Invoice creation
- `TrialAbuseDetector` - Abuse monitoring
- `RevenueCharts` - Revenue visualizations
- `LTVChart` - Customer value chart
- `ChurnChart` - Churn visualization

---

## 3. TASK-038C: Platform Analytics (4 Endpoints)

### Pages Required:
- `/admin/analytics` - Dashboard
- `/admin/analytics/system-health` - System health
- `/admin/analytics/usage` - Usage metrics
- `/admin/analytics/growth` - Growth analytics

### API Services (`lib/api/analytics.ts`):
```typescript
// GET /api/super-admin/analytics/system-health
getSystemHealth(): Promise<SystemHealth>

// GET /api/super-admin/analytics/usage
getUsageAnalytics(period: string): Promise<UsageAnalytics>

// GET /api/super-admin/analytics/growth
getGrowthAnalytics(period: string): Promise<GrowthAnalytics>

// GET /api/super-admin/analytics/benchmarks
getPerformanceBenchmarks(): Promise<Benchmarks>
```

### Components:
- `SystemHealthCard` - Health status
- `DAUMAUChart` - Active users chart
- `EngagementChart` - Engagement metrics
- `ConversionFunnel` - Funnel visualization
- `RetentionCohort` - Cohort analysis
- `BenchmarkTable` - Performance benchmarks

---

## 4. TASK-038D: Support Tools & Ticketing (30+ Endpoints)

### Pages Required:
- `/admin/support` - Dashboard
- `/admin/support/tickets` - Ticket list
- `/admin/support/tickets/[id]` - Ticket detail
- `/admin/support/knowledge-base` - KB management
- `/admin/support/communications` - Broadcast tools
- `/admin/support/assistance` - Organization assistance
- `/admin/support/analytics` - Support analytics

### API Services (`lib/api/support.ts`):

#### Support Tickets (7 endpoints)
```typescript
createTicket(data: TicketData): Promise<Ticket>
getTickets(filters?: TicketFilters): Promise<Ticket[]>
getTicketById(id: string): Promise<Ticket>
updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket>
assignTicket(id: string, assigneeId: string): Promise<void>
addTicketResponse(id: string, response: string): Promise<void>
getTicketStats(): Promise<TicketStatistics>
```

#### Knowledge Base (6 endpoints)
```typescript
createArticle(data: ArticleData): Promise<Article>
getArticles(filters?: ArticleFilters): Promise<Article[]>
getArticleById(id: string): Promise<Article>
updateArticle(id: string, updates: Partial<Article>): Promise<Article>
deleteArticle(id: string): Promise<void>
getKBStats(): Promise<KBStatistics>
```

#### Email Templates (5 endpoints)
```typescript
createTemplate(data: TemplateData): Promise<EmailTemplate>
getTemplates(category?: string): Promise<EmailTemplate[]>
getTemplateById(id: string): Promise<EmailTemplate>
updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate>
deleteTemplate(id: string): Promise<void>
```

#### Broadcast Communications (4 endpoints)
```typescript
sendBroadcast(data: BroadcastData): Promise<Broadcast>
sendNotification(data: NotificationData): Promise<void>
getCommunicationHistory(filters?: CommFilters): Promise<Communication[]>
getCommunicationStats(): Promise<CommunicationStatistics>
```

#### Organization Assistance (8 endpoints)
```typescript
getSetupProgress(orgId: string): Promise<SetupProgress>
sendSetupReminder(orgId: string, type: string): Promise<void>
testWhatsAppConfig(orgId: string, sendTest: boolean): Promise<WhatsAppTestResult>
testSheetsConnection(orgId: string, triggerSync: boolean): Promise<SheetsTestResult>
triggerManualSync(orgId: string): Promise<SyncResult>
runDiagnostics(orgId: string): Promise<DiagnosticsResult>
handleBillingDispute(orgId: string, details: DisputeDetails): Promise<Dispute>
remoteSetupCompletion(orgId: string, options: SetupOptions): Promise<SetupResult>
```

#### Support Analytics (6 endpoints)
```typescript
getSupportMetrics(period: string): Promise<SupportMetrics>
getTicketVolumeTrends(days: number, granularity: string): Promise<VolumeTrends>
getCategoryAnalysis(period: string): Promise<CategoryAnalysis>
getTeamPerformance(period: string): Promise<TeamPerformance>
getSLACompliance(period: string): Promise<SLACompliance>
generateSummaryReport(type: string, date?: string): Promise<SummaryReport>
```

### Components:
- `TicketList` - Ticket table
- `TicketDetail` - Ticket view
- `TicketAssignment` - Assign modal
- `TicketResponseForm` - Response form
- `KBEditor` - Article editor
- `KBSearch` - Article search
- `TemplateEditor` - Email template editor
- `BroadcastComposer` - Broadcast tool
- `SetupAssistanceCard` - Setup progress
- `ConfigTroubleshooter` - Config testing
- `BillingDisputeForm` - Dispute creation
- `SupportMetricsCard` - Metrics display
- `VolumeChart` - Volume trends
- `TeamPerformanceTable` - Agent metrics
- `SLAComplianceChart` - SLA tracking

---

## 📁 Frontend Directory Structure

```
frontend/src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    # Admin layout with sidebar
│   │   ├── page.tsx                      # Dashboard overview
│   │   ├── organizations/
│   │   │   ├── page.tsx                  # Organization list
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx             # Organization details
│   │   │   │   └── config/
│   │   │   │       └── page.tsx          # Configuration
│   │   ├── billing/
│   │   │   ├── page.tsx                  # Billing dashboard
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx              # Transactions
│   │   │   ├── invoices/
│   │   │   │   └── page.tsx              # Invoices
│   │   │   ├── trials/
│   │   │   │   └── page.tsx              # Trial management
│   │   │   └── revenue/
│   │   │       └── page.tsx              # Revenue analytics
│   │   ├── analytics/
│   │   │   ├── page.tsx                  # Analytics dashboard
│   │   │   ├── system-health/
│   │   │   │   └── page.tsx              # System health
│   │   │   ├── usage/
│   │   │   │   └── page.tsx              # Usage metrics
│   │   │   └── growth/
│   │   │       └── page.tsx              # Growth analytics
│   │   └── support/
│   │       ├── page.tsx                  # Support dashboard
│   │       ├── tickets/
│   │       │   ├── page.tsx              # Ticket list
│   │       │   └── [id]/
│   │       │       └── page.tsx          # Ticket detail
│   │       ├── knowledge-base/
│   │       │   └── page.tsx              # KB management
│   │       ├── communications/
│   │       │   └── page.tsx              # Broadcast tools
│   │       ├── assistance/
│   │       │   └── page.tsx              # Org assistance
│   │       └── analytics/
│   │           └── page.tsx              # Support analytics
│   ├── layout.tsx                        # Root layout
│   └── page.tsx                          # Home/login
├── components/
│   ├── admin/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx           # Main layout
│   │   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   │   ├── Header.tsx                # Top header
│   │   │   └── Navigation.tsx            # Nav menu
│   │   ├── organizations/
│   │   │   ├── OrganizationTable.tsx
│   │   │   ├── OrganizationCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── StatusUpdateModal.tsx
│   │   │   ├── LimitsEditor.tsx
│   │   │   └── SuspendModal.tsx
│   │   ├── billing/
│   │   │   ├── BillingDashboard.tsx
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── InvoiceGenerator.tsx
│   │   │   ├── TrialAbuseDetector.tsx
│   │   │   ├── RevenueCharts.tsx
│   │   │   ├── LTVChart.tsx
│   │   │   └── ChurnChart.tsx
│   │   ├── analytics/
│   │   │   ├── SystemHealthCard.tsx
│   │   │   ├── DAUMAUChart.tsx
│   │   │   ├── EngagementChart.tsx
│   │   │   ├── ConversionFunnel.tsx
│   │   │   ├── RetentionCohort.tsx
│   │   │   └── BenchmarkTable.tsx
│   │   └── support/
│   │       ├── TicketList.tsx
│   │       ├── TicketDetail.tsx
│   │       ├── TicketAssignment.tsx
│   │       ├── TicketResponseForm.tsx
│   │       ├── KBEditor.tsx
│   │       ├── KBSearch.tsx
│   │       ├── TemplateEditor.tsx
│   │       ├── BroadcastComposer.tsx
│   │       ├── SetupAssistanceCard.tsx
│   │       ├── ConfigTroubleshooter.tsx
│   │       ├── BillingDisputeForm.tsx
│   │       ├── SupportMetricsCard.tsx
│   │       ├── VolumeChart.tsx
│   │       ├── TeamPerformanceTable.tsx
│   │       └── SLAComplianceChart.tsx
│   └── shared/
│       ├── DataTable.tsx                 # Reusable table
│       ├── StatCard.tsx                  # Stat card
│       ├── Chart.tsx                     # Chart wrapper
│       ├── Modal.tsx                     # Modal component
│       ├── Button.tsx                    # Button component
│       ├── Input.tsx                     # Input component
│       ├── Select.tsx                    # Select component
│       ├── DatePicker.tsx                # Date picker
│       ├── Pagination.tsx                # Pagination
│       ├── LoadingSpinner.tsx            # Loading state
│       ├── EmptyState.tsx                # Empty state
│       └── ErrorBoundary.tsx             # Error handling
├── lib/
│   ├── api/
│   │   ├── client.ts                     # Axios client
│   │   ├── organizations.ts              # Org APIs
│   │   ├── billing.ts                    # Billing APIs
│   │   ├── analytics.ts                  # Analytics APIs
│   │   └── support.ts                    # Support APIs
│   ├── hooks/
│   │   ├── useOrganizations.ts           # Org hooks
│   │   ├── useBilling.ts                 # Billing hooks
│   │   ├── useAnalytics.ts               # Analytics hooks
│   │   ├── useSupport.ts                 # Support hooks
│   │   └── useAuth.ts                    # Auth hook
│   ├── types/
│   │   ├── organization.ts               # Org types
│   │   ├── billing.ts                    # Billing types
│   │   ├── analytics.ts                  # Analytics types
│   │   ├── support.ts                    # Support types
│   │   └── api.ts                        # API types
│   └── utils/
│       ├── formatters.ts                 # Data formatters
│       ├── validators.ts                 # Validators
│       └── helpers.ts                    # Helper functions
└── styles/
    └── globals.css                       # Global styles
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Day 1 - Morning)
- ✅ API client setup
- ✅ Type definitions
- ✅ Admin layout & navigation
- ✅ Shared components (DataTable, StatCard, Modal)

### Phase 2: Core Features (Day 1 - Afternoon)
- Organizations list & detail pages
- Billing dashboard
- Basic charts setup

### Phase 3: Advanced Features (Day 2 - Morning)
- Support ticket system
- Knowledge base management
- Analytics dashboards

### Phase 4: Specialized Tools (Day 2 - Afternoon)
- Organization assistance tools
- Support analytics
- Revenue forecasting
- Trial management

### Phase 5: Polish & Testing (Day 3)
- Responsive design
- Loading states
- Error handling
- E2E tests

---

## 📋 Implementation Checklist

### API Layer
- [ ] API client (`lib/api/client.ts`)
- [ ] Organizations API service
- [ ] Billing API service
- [ ] Analytics API service
- [ ] Support API service

### Type Definitions
- [ ] Organization types
- [ ] Billing types
- [ ] Analytics types
- [ ] Support types
- [ ] API response types

### Layout & Navigation
- [ ] Admin layout component
- [ ] Sidebar navigation
- [ ] Header with user menu
- [ ] Breadcrumbs

### Organization Management (8 endpoints)
- [ ] Organizations list page
- [ ] Organization detail page
- [ ] Configuration page
- [ ] Status management UI
- [ ] Trial limits editor
- [ ] Suspend modal

### Billing & Subscriptions (18 endpoints)
- [ ] Billing dashboard
- [ ] Transactions list
- [ ] Invoice management
- [ ] Receipt generation
- [ ] Trial management
- [ ] Abuse detection
- [ ] Revenue charts
- [ ] LTV analysis
- [ ] Churn charts
- [ ] Forecasting dashboard

### Platform Analytics (4 endpoints)
- [ ] Analytics dashboard
- [ ] System health monitor
- [ ] Usage analytics
- [ ] Growth metrics
- [ ] Performance benchmarks

### Support Tools (30+ endpoints)
- [ ] Support dashboard
- [ ] Ticket list & detail
- [ ] Ticket assignment
- [ ] Response system
- [ ] Knowledge base editor
- [ ] Article search
- [ ] Email templates
- [ ] Broadcast composer
- [ ] Setup assistance
- [ ] Config troubleshooting
- [ ] Billing disputes
- [ ] Remote setup
- [ ] Data migrations
- [ ] Support metrics
- [ ] Volume trends
- [ ] Team performance
- [ ] SLA compliance

### Shared Components
- [ ] DataTable with sorting/filtering
- [ ] StatCard component
- [ ] Chart components (Line, Bar, Pie)
- [ ] Modal component
- [ ] Form components
- [ ] Loading states
- [ ] Empty states
- [ ] Error boundaries

---

## 🎨 UI/UX Guidelines

### Colors
- Primary: Blue (#2563eb)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Info: Cyan (#06b6d4)

### Typography
- Headings: font-semibold
- Body: font-normal
- Small: text-sm
- Large: text-lg

### Spacing
- Consistent padding: p-4, p-6
- Card spacing: mb-4, mb-6
- Section spacing: space-y-6

### Components
- Cards: rounded-lg shadow-sm
- Buttons: rounded-md px-4 py-2
- Inputs: border-gray-300 rounded-md
- Tables: stripe, hover states

---

## 📊 Data Fetching Strategy

### SWR for Data Fetching
```typescript
import useSWR from 'swr';

// Example hook
function useOrganizations(filters?: OrganizationFilters) {
  const { data, error, mutate } = useSWR(
    ['/organizations', filters],
    () => getOrganizations(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    organizations: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

---

## 🔐 Authentication

### Protected Routes
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken');
  
  if (!token && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## ✅ Success Criteria

- [ ] All 60+ backend endpoints have corresponding UI
- [ ] All CRUD operations accessible from UI
- [ ] Charts and visualizations working
- [ ] Responsive design (mobile-friendly)
- [ ] Loading states on all async operations
- [ ] Error handling and user feedback
- [ ] Role-based access control
- [ ] Search and filtering on all lists
- [ ] Pagination on large datasets
- [ ] Export functionality (CSV, PDF)
- [ ] Real-time updates (optional)

---

**Status:** Ready for Implementation  
**Estimate:** 2-3 days full-time development  
**Priority:** HIGH - Backend is complete and waiting
