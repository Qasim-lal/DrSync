'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    // Redirect super admins to admin panel
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'SUPER_ADMIN') {
        router.replace('/admin');
        return;
      }
    } catch {
      // ignore parse errors
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
