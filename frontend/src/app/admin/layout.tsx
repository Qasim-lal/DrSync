import React from 'react';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AdminLayout>{children}</AdminLayout>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}
