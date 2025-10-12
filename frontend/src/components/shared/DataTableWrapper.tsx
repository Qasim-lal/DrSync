import { ReactNode } from 'react';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import EmptyState from './EmptyState';
import { InboxIcon } from '@heroicons/react/24/outline';

interface DataTableWrapperProps {
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export default function DataTableWrapper({
  loading,
  error,
  isEmpty,
  emptyTitle = 'No data found',
  emptyDescription = 'There is no data to display at this time.',
  onRetry,
  children,
}: DataTableWrapperProps) {
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load data"
        message={error.message || 'An unexpected error occurred while loading the data.'}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={<InboxIcon className="h-12 w-12" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
}
