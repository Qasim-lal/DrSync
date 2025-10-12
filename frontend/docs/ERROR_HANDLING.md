# Error Handling & Loading States

This document describes the error handling and loading state patterns implemented in the DrSync admin dashboard.

## Overview

The application implements a comprehensive error handling strategy with:
- Error boundaries for React component errors
- Error states for async data fetching
- Loading indicators for all data operations
- Empty states for missing data
- Retry mechanisms for failed operations

## Components

### 1. ErrorBoundary

**Location:** `src/components/shared/ErrorBoundary.tsx`

A React Error Boundary component that catches JavaScript errors in child components.

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/shared';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches rendering errors
- Displays user-friendly error UI
- Provides "Try again" button to reset error state
- Logs errors to console for debugging

**Implementation:** Already wraps the entire admin layout in `src/app/admin/layout.tsx`

---

### 2. ErrorMessage

**Location:** `src/components/shared/ErrorMessage.tsx`

Displays inline error messages with optional retry functionality.

**Usage:**
```tsx
import ErrorMessage from '@/components/shared/ErrorMessage';

<ErrorMessage
  title="Failed to load data"
  message="Unable to fetch organizations."
  onRetry={() => refetch()}
  onDismiss={() => clearError()}
/>
```

**Props:**
- `title?` - Optional error title
- `message` - Error message to display (required)
- `onRetry?` - Optional retry callback
- `onDismiss?` - Optional dismiss callback

---

### 3. LoadingSpinner

**Location:** `src/components/shared/LoadingSpinner.tsx`

A reusable loading spinner component.

**Usage:**
```tsx
import LoadingSpinner from '@/components/shared/LoadingSpinner';

<LoadingSpinner size="lg" />
```

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `className?` - Additional CSS classes

---

### 4. EmptyState

**Location:** `src/components/shared/EmptyState.tsx`

Displays empty state UI when no data is available.

**Usage:**
```tsx
import EmptyState from '@/components/shared/EmptyState';

<EmptyState
  icon={<InboxIcon className="h-12 w-12" />}
  title="No organizations found"
  description="Get started by adding your first organization"
  action={{
    label: "Add Organization",
    onClick: () => handleAdd()
  }}
/>
```

**Props:**
- `icon?` - Optional icon element
- `title` - Empty state title (required)
- `description?` - Optional description text
- `action?` - Optional action button with label and onClick

---

### 5. DataTableWrapper

**Location:** `src/components/shared/DataTableWrapper.tsx`

Wraps data tables with loading, error, and empty states.

**Usage:**
```tsx
import DataTableWrapper from '@/components/shared/DataTableWrapper';

<DataTableWrapper
  loading={isLoading}
  error={error}
  isEmpty={data.length === 0}
  emptyTitle="No records found"
  emptyDescription="There are no records to display"
  onRetry={refetch}
>
  <DataTable data={data} columns={columns} />
</DataTableWrapper>
```

---

### 6. DataTable (Enhanced)

**Location:** `src/components/shared/DataTable.tsx`

The DataTable component now includes built-in error and loading state support.

**Usage:**
```tsx
import { DataTable } from '@/components/shared';

<DataTable
  data={organizations}
  columns={columns}
  loading={isLoading}
  error={error}
  onRetry={refetch}
  emptyStateTitle="No organizations found"
  emptyStateDescription="Get started by adding your first organization"
  onRowClick={(row) => handleRowClick(row)}
/>
```

**New Props:**
- `error?: Error | null` - Error object to display error state
- `onRetry?` - Retry callback for error recovery

---

## Hooks

### useAsync

**Location:** `src/hooks/useAsync.ts`

Custom hook for managing async operations with loading and error states.

**Usage:**
```tsx
import { useAsync } from '@/hooks/useAsync';

function MyComponent() {
  const { data, loading, error, execute } = useAsync(
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    { immediate: true }
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} onRetry={execute} />;
  
  return <div>{data}</div>;
}
```

**Returns:**
- `data: T | null` - Fetched data
- `loading: boolean` - Loading state
- `error: Error | null` - Error object if request failed
- `execute: () => Promise<T>` - Function to manually trigger the async operation

---

## Patterns & Best Practices

### 1. Data Fetching Pages

For pages that fetch data from hooks (like Organizations, Billing, etc.), follow this pattern:

```tsx
'use client';

import { ErrorMessage } from '@/components/shared';
import { useOrganizations } from '@/lib/hooks';

export default function OrganizationsPage() {
  const { organizations, isLoading, isError, refresh } = useOrganizations();

  return (
    <div>
      {/* Stats Section with Error Handling */}
      {isError ? (
        <ErrorMessage
          title="Failed to load data"
          message="Unable to load organizations."
          onRetry={refresh}
        />
      ) : (
        <StatsSection data={organizations} loading={isLoading} />
      )}

      {/* Data Table with Error Handling */}
      <DataTable
        data={organizations || []}
        columns={columns}
        loading={isLoading}
        error={isError}
        onRetry={refresh}
        emptyStateTitle="No data found"
      />
    </div>
  );
}
```

### 2. Chart Components

For chart components, wrap loading and error states:

```tsx
{isLoading ? (
  <div className="flex h-64 items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
) : isError ? (
  <ErrorMessage
    message="Unable to load chart data."
    onRetry={refetch}
  />
) : (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={chartData}>
      {/* Chart configuration */}
    </BarChart>
  </ResponsiveContainer>
)}
```

### 3. Stat Cards

StatCard component already handles loading states internally:

```tsx
<StatCard
  title="Total Organizations"
  value={statistics?.total || 0}
  icon={<BuildingOfficeIcon className="h-6 w-6" />}
  loading={isLoading}  // Shows loading skeleton
/>
```

For errors in stats, wrap the entire stats section:

```tsx
{statsError ? (
  <ErrorMessage
    title="Failed to load statistics"
    message="Unable to load statistics. Please try again."
    onRetry={refreshStats}
  />
) : (
  <div className="grid grid-cols-4 gap-6">
    {/* StatCard components */}
  </div>
)}
```

---

## Error Boundary Usage

The ErrorBoundary is already implemented at the admin layout level, catching all errors in admin pages. For specific sections that need isolated error handling:

```tsx
import { ErrorBoundary } from '@/components/shared';

<ErrorBoundary
  fallback={
    <div className="text-center p-8">
      <p>Failed to load this section</p>
    </div>
  }
>
  <CriticalSection />
</ErrorBoundary>
```

---

## Examples of Implemented Pages

### ✅ Organizations Page
- Error handling for organization list and statistics
- Loading states for data tables and stat cards
- Empty states when no organizations exist
- Retry functionality on errors

**Location:** `src/app/admin/organizations/page.tsx`

### ✅ Billing Page
- Error handling for billing overview, payment status, and trials
- Loading spinners for charts
- Error messages with retry for each data section

**Location:** `src/app/admin/billing/page.tsx`

### ✅ DataTable Component
- Built-in loading, error, and empty state handling
- Automatic retry on error when onRetry provided

**Location:** `src/components/shared/DataTable.tsx`

---

## Testing Error States

To test error handling in development:

1. **Simulate API Errors:** Modify the mock API functions to throw errors
2. **Test Error Boundary:** Throw an error in a component render
3. **Test Loading States:** Add delays to async functions
4. **Test Empty States:** Return empty arrays from data hooks

---

## Future Enhancements

Consider implementing:
1. **Toast notifications** for transient errors
2. **Automatic retry logic** with exponential backoff
3. **Offline detection** with user notification
4. **Error reporting service** integration (e.g., Sentry)
5. **Detailed error logging** for debugging

---

## Summary

This error handling implementation provides:
- ✅ Consistent error UX across all admin pages
- ✅ Clear loading states for async operations
- ✅ User-friendly error messages
- ✅ Retry mechanisms for transient failures
- ✅ Empty states for missing data
- ✅ Error boundaries to prevent app crashes
- ✅ Reusable components and hooks

All major data-fetching pages now implement proper error handling and loading states, providing a robust and professional user experience.
